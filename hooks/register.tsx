import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { RAIN_SCENE } from './scene'

// Terminal vert phosphore : thème sombre uniquement.
const { theme, problems } = makeColors({
  label: 'Digital rain',
  only: 'dark',
  roles: { accent: '#3dff8f', danger: '#ff5f5f', success: '#a6e22e', warning: '#e6c34a', pro: '#5ec8ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#040a06',
        'surface-1': '#07110a',
        'surface-2': '#0a170e',
        'surface-3': '#0d1c12',
        'text-primary': '#d2f7da',
        'text-secondary': '#9ddcab',
        'text-muted': '#76b986',
      },
    },
  },
})

const BASE: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'matrix-rain', glass: { blur: 6, tint: '#020805', opacity: 0.7 } },
}

const LOOK: ThemeSetArgs = {
  ...BASE,
  style: {
    Text: { fontFamily: ['mono'] },
    UserMessage: { backgroundColor: '#0b1f12', borderColor: '#1f6b38', borderWidth: 1, radius: 4, padding: 12 },
    AssistantMessage: { backgroundColor: '#050d08', radius: 4, padding: 12 },
    ToolUse: { color: '#9ddcab', backgroundColor: '#07110a', radius: 4, paddingX: 8 },
  },
}

// 5 pt est le minimum accepté par le shader (borne colw de rain-shader.ts).
const DENSITY: Record<string, number> = { 'tres-dense': 5, dense: 7, normale: 9, grande: 13 }
const SPEED: Record<string, number> = { lente: 0.7, normale: 1, rapide: 1.4 }
const TRAIL: Record<string, number> = { courte: 0.6, normale: 1, longue: 1.6 }
const GLOW: Record<string, number> = { aucun: 0, doux: 0.6, normal: 1, fort: 1.6 }

// Seuil de relance du fil (doctrine roll-thread), pas la fenêtre complète :
// Opus ~250K, Sonnet ~200K, Haiku 70 % ; autre modèle 75 % de la fenêtre.
function relaunchAt(model: string, window: number): number {
  const m = model.toLowerCase()
  const at = m.includes('opus') ? 250_000 : m.includes('sonnet') ? 200_000 : m.includes('haiku') ? window * 0.7 : window * 0.75
  return Math.max(Math.min(at, window), 1)
}

export const register: Register = (on, options) => {
  const pickNum = (table: Record<string, number>, key: unknown, fallback: number) =>
    typeof key === 'string' ? (table[key] ?? fallback) : fallback

  const gaugeOn = options.gauge !== false

  const colw = pickNum(DENSITY, options.density, 7)

  const tuning = {
    colw,
    speed: pickNum(SPEED, options.speed, 1),
    trail: pickNum(TRAIL, options.trail, 1),
    glow: pickNum(GLOW, options.glow, 1),
    react: options.pointer === false ? 0 : 1,
    gauge: gaugeOn ? 1 : 0,
  }

  // Remplissage rapporté au seuil de relance : 0 à 1, au-delà 1 à 1,2.
  // Pas de chiffre avant la première réponse ni juste après une compaction : 0.
  let fill = 0

  const measure = async (
    model: () => Promise<string>,
    ctx: { tokens?: number; window: number },
  ): Promise<boolean> => {
    const next = ctx.tokens === undefined ? 0 : Math.min(ctx.tokens / relaunchAt(await model(), ctx.window), 1.2)
    const moved = Math.abs(next - fill) > 0.004
    fill = next
    return moved
  }

  // Cache froid : plus de requête du fil principal depuis la durée de vie du
  // cache (1 h dans les sessions observées). La pluie passe alors au cyan.
  // L'heure de la dernière requête est gardée par session dans `$.store`, pour
  // qu'un fil rouvert après une longue pause s'affiche froid d'emblée.
  const CACHE_TTL = 3_600_000
  const KEEP = 3 * 86_400_000
  let lastAt: number | undefined
  let cold = 0
  // Vrai si l'état du cache a changé (le dessin est alors à refaire).
  const flip = (next: number): boolean => {
    const moved = next !== cold
    cold = next
    return moved
  }

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      lastAt = await $.clock.now()
      if (flip(0)) {
        $.ui.invalidate('ui.render')
      }
      try {
        await $.store.set(`last:${await $.session.id()}`, lastAt)
      } catch (error) {
        $.ui.log(String(error), { to: 'debug' })
      }
    }
    return yield* next(e)
  })

  if (gaugeOn) {
    on('session.measure', async ($, e, next) => {
      if (e.changed.includes('context') && (await measure(() => $.session.model(), e.context))) {
        $.ui.invalidate('ui.render')
      }
      return next(e)
    })
  }

  on('session.start', async ($, e, next) => {
    if (gaugeOn) {
      try {
        await measure(() => $.session.model(), (await $.session.usage()).context)
      } catch (error) {
        $.ui.log(String(error))
      }
    }

    try {
      const now = await $.clock.now()
      const stored = await $.store.get(`last:${await $.session.id()}`)
      if (lastAt === undefined && typeof stored === 'number') {
        lastAt = stored
      }
      // Ménage : on oublie les sessions sans requête depuis trois jours.
      for (const key of await $.store.keys()) {
        const at = key.startsWith('last:') ? await $.store.get(key) : undefined
        if (typeof at === 'number' && now - at > KEEP) {
          await $.store.delete(key)
        }
      }
      const check = async () => {
        if (lastAt !== undefined) {
          if (flip((await $.clock.now()) - lastAt > CACHE_TTL ? 1 : 0)) {
            $.ui.invalidate('ui.render')
          }
        }
      }
      await check()
      $.clock.every(30_000, () => void check())
    } catch (error) {
      $.ui.log(String(error))
    }

    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    let set
    try {
      set = await $.theme.set(LOOK)
    } catch (error) {
      // Build sans `style`, ou valeur refusée : thème sans restyle des messages.
      $.ui.log(String(error))
      set = await $.theme.set(BASE)
    }

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Shader, Svg } = $.ui.resolve(e)

    // Le shader joue sur desktop ; le Svg prend le relais sur mobile,
    // en mouvement réduit, ou si le shader est refusé.
    return (
      <Shader module="./rain-shader.ts" values={{ ...tuning, fill, cold }}>
        <Svg source={RAIN_SCENE} alt="Colonnes de glyphes verts qui s'allument et s'éteignent" isInteractive />
      </Shader>
    )
  })
}
