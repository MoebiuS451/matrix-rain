// Pluie numérique sur GPU : grille fixe, têtes blanches qui descendent en écrivant,
// traînée qui s'éteint sur place, halo, colonnes qui s'écartent sous le pointeur,
// onde lumineuse à chaque clic. Réglages reçus du mod par `values`.
import {
  abs, clamp, composer, dot, exp, floor, int, length, max, min, mix, mod, picture, pointers,
  shader, sin, size, smoothstep, sqrt, table, time, unsigned, values, vec2, vec3, vec4,
} from 'claude-code/shader'
import type { int as Int, vec2 as V2 } from 'claude-code/shader'

const v = values({
  colw: [5, 16],    // largeur d'une colonne, en points
  speed: [0.4, 2],  // multiplicateur de vitesse de chute
  trail: [0.4, 2],  // multiplicateur de longueur de traînée
  glow: [0, 2],     // intensité du halo
  react: [0, 1],    // 1 : réaction au pointeur et aux clics
  gauge: [0, 1],    // 1 : jauge de contexte en sédiment
  fill: [0, 1.2],   // remplissage rapporté au seuil de relance (1 = seuil)
})

// Traits de glyphes dans une boîte 0..1 (y vers le haut) : x1, y1, x2, y2
const SEG = table([
  [0.0, 1.0, 1.0, 1.0],
  [0.0, 0.5, 1.0, 0.5],
  [0.0, 0.0, 1.0, 0.0],
  [0.0, 0.5, 0.0, 1.0],
  [0.0, 0.0, 0.0, 0.5],
  [1.0, 0.5, 1.0, 1.0],
  [1.0, 0.0, 1.0, 0.5],
  [0.5, 0.0, 0.5, 1.0],
  [0.0, 0.0, 1.0, 1.0],
  [1.0, 1.0, 0.4, 0.5],
  [0.5, 0.5, 0.1, 0.0],
  [0.5, 1.0, 0.5, 0.7],
])

function hash(n: Int): Int {
  let x = int(n)
  x = int(x ^ (x >>> 16))
  x = int(x * 73244475)
  x = int(x ^ (x >>> 16))
  x = int(x * 73244475)
  x = int(x ^ (x >>> 16))
  return x
}

function rnd(n: Int): number {
  return unsigned(hash(n)) / 4294967296
}

// Distance d'un point à un segment, en points
function seg(p: V2, a: V2, b: V2): number {
  const pa = vec2(p - a)
  const ba = vec2(b - a)
  const t = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0, 1)
  return length(vec2(pa - ba * t))
}

const rain = picture(px => {
  const cw = max(v.colw, 5)
  const ch = cw * 1.18

  // Déformation par les pointeurs : les colonnes s'écartent, un clic lance une onde
  let push = 0
  let wave = 0
  for (const ptr of pointers) {
    const d = vec2(px.point - ptr.at)
    const r2 = dot(d, d)
    const live = (1 - clamp(ptr.gone, 0, 1)) * v.react
    const f = exp(-r2 / 12100) * live
    push = push + (d.x / (abs(d.x) + 6)) * 34 * f
    if (ptr.down > 0.5 && ptr.age < 1) {
      const ring = (sqrt(r2) - ptr.age * 340) / 9
      wave = wave + exp(-ring * ring) * (1 - ptr.age) * v.react
    }
  }
  const qx = px.point.x - push
  const qy = px.point.y

  const col = floor(max(qx, 0) / cw)
  const row = floor(max(size.y - qy, 0) / ch)
  const rows = size.y / ch + 1
  const ci = int(col)

  // Jauge : une ligne vivante où la pluie finit sa chute. Elle monte du bas avec
  // le remplissage, plafonnée au haut de la boîte de prompt (composer : gauche,
  // bas, droite, haut, de 0 à 1 depuis le bas) ; rien ne tombe sous elle.
  const boxTop = max(composer.y, composer.w)
  const cap = boxTop > 0.02 ? boxTop : 0.12
  const level = max(clamp(v.fill, 0, 1) * cap * size.y, ch * 0.5)
  const lineRow = floor(max(size.y - level, 0) / ch)
  const onLine = v.gauge * (row === lineRow ? 1 : 0)
  const below = v.gauge * (row > lineRow ? 1 : 0)
  const lineY = size.y - (lineRow + 1) * ch

  // Deux flux par colonne, chacun avec sa vitesse, sa pause et sa traînée
  let lit = 0
  let head = 0
  let splash = 0
  for (const salt of [0, 1]) {
    const k = int(ci * 4 + salt * 7919)
    const speed = (7 + 12 * rnd(int(k + 1))) * v.speed
    const loop = rows * (1.3 + 2.2 * rnd(int(k + 2)))
    const trail = (6 + 20 * rnd(int(k + 3))) * v.trail
    const start = rnd(int(k + 4)) * loop
    const h = mod(time * speed + start, loop)
    const a = mod(h - row, loop)
    lit = max(lit, exp(-a / max(trail, 1)))
    head = max(head, a < 1 ? 1 : 0)
    // Éclat quand la tête atteint la ligne, qui s'éteint en ~2 rangées de temps
    splash = max(splash, exp(-mod(h - lineRow, loop) / 2.5))
  }

  // Glyphe de la case ; une case sur dix change de temps en temps, toutes sur la ligne
  const cell = int(ci * 7919 + int(row) * 2903)
  const mutates = max(rnd(int(cell + 11)) < 0.1 ? 1 : 0, onLine)
  const tick = floor(time * (0.4 + rnd(int(cell + 12)))) * mutates
  const g = hash(int(cell + int(tick) * 104729))

  let lx = qx - col * cw
  const ly = qy - (size.y - (row + 1) * ch)
  if ((g & 65536) !== 0) {
    lx = cw - lx
  }
  const p = vec2(lx, ly)

  // Boîte du glyphe dans la case
  const gx = cw * 0.19
  const gw = cw * 0.62
  const gy = ch * 0.13
  const gh = ch * 0.74

  let d = 99
  for (const n of [0, 1, 2, 3]) {
    const pick = mod(unsigned((g >>> int(n * 4)) & 15), 12)
    const s = SEG.at(pick)
    const a = vec2(gx + s.x * gw, gy + s.y * gh)
    const b = vec2(gx + s.z * gw, gy + s.w * gh)
    const use = n < 3 || (g & 131072) !== 0 ? 1 : 0
    d = min(d, use > 0.5 ? seg(p, a, b) : 99)
  }

  const stroke = cw * 0.055
  const ink = smoothstep(stroke + 0.6, stroke, d)
  const halo = exp(-d * 6 / cw) * v.glow
  const bright = min(lit + wave * 0.9, 1.4)

  const green = vec3(0.1, 1.0, 0.36)
  const white = vec3(0.86, 1.0, 0.9)
  const tint = vec3(mix(green, white, head))

  const bg = vec3(0.004, 0.016, 0.008)
  const glyph = vec3(tint * (ink + halo * (0.35 + head * 0.5)) * bright)

  // Ligne : vert sous 60 % du seuil, ambre jusqu'au seuil, rouge au-delà, avec
  // une pulsation lente (~4 s) une fois le seuil franchi. Chaque chute s'y termine
  // par un éclat ; une lueur douce descend sous la ligne.
  const fl = v.fill
  const amber = vec3(1.0, 0.7, 0.12)
  const red = vec3(1.0, 0.26, 0.2)
  const gaugeTint = vec3(mix(vec3(mix(green, amber, smoothstep(0.55, 0.65, fl))), red, smoothstep(0.95, 1.0, fl)))
  const pulse = fl >= 1 ? 0.85 + 0.15 * sin(time * 1.6) : 1
  const lineTint = vec3(mix(gaugeTint, white, splash * 0.5))
  const lineBright = (0.35 + splash * 1.1) * pulse
  const lineGlyph = vec3(lineTint * (ink + halo * (0.4 + splash * 0.8)) * lineBright)
  const floorGlow = below * exp(-max(lineY - qy, 0) / (ch * 1.5)) * 0.08 * pulse

  return vec4(bg + vec3(mix(glyph, lineGlyph, onLine)) * (1 - below) + gaugeTint * floorGlow, 1)
})

export default shader({ fps: 30, passes: [rain] })
