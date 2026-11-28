# matrix-rain

Mod pour l'app Claude (Claude Code, desktop et mobile) : thème sombre vert phosphore et pluie numérique animée en fond d'écran.

- Sur desktop, la pluie tourne sur le GPU : grille de glyphes fixe, têtes blanches qui descendent en écrivant, traînée qui s'éteint sur place, halo, colonnes qui s'écartent sous la souris et onde lumineuse à chaque clic.
- Sur mobile, en mouvement réduit ou si le GPU ne suit pas, une version SVG plus légère prend le relais.
- Le terminal et les extensions d'éditeur n'affichent pas de thème.

## Installation

Dans une session Claude Code en terminal :

```
/plugin install matrix-rain --marketplace MoebiuS451/matrix-rain
```

Depuis un shell :

```
claude plugin install matrix-rain --marketplace MoebiuS451/matrix-rain
```

Dans l'app desktop : bouton **+** à côté de la zone de saisie, **Plugins**, **Add marketplace** avec `MoebiuS451/matrix-rain`, puis **Add plugin**.

Auteur : Olivier BERTHIER Msc (MoebiuS451).

Licence MIT : voir le fichier `LICENSE`.

## Réglages

| Réglage | Valeurs | Par défaut |
| :-- | :-- | :-- |
| `density` | `tres-dense` (5 pt), `dense` (7 pt), `normale` (9 pt), `grande` (13 pt) — selon la résolution de l'écran | `dense` |
| `speed` | `lente`, `normale`, `rapide` | `normale` |
| `trail` | `courte`, `normale`, `longue` | `normale` |
| `glow` | `aucun`, `doux`, `normal`, `fort` | `normal` |
| `pointer` | `true` / `false` | `true` |
| `gauge` | `true` / `false` — jauge de contexte en ligne vivante | `true` |

### Jauge de contexte

La pluie finit sa chute sur une ligne de glyphes vivants, qui monte depuis le bas de l'écran à mesure que le contexte du fil se remplit ; chaque goutte qui l'atteint y laisse un éclat lumineux, et rien ne tombe sous elle. Le remplissage se mesure contre le **seuil de relance** du fil, pas contre la fenêtre complète : ~190K tokens pour Opus, ~150K pour Sonnet, 70 % de la fenêtre pour Haiku, 75 % pour un autre modèle.

- Vert sous 60 % du seuil, ambre de 60 à 100 %, rouge au-delà, avec une pulsation lente.
- Au maximum, la ligne s'arrête au haut de la boîte de prompt.
- Mise à jour à la fin de chaque tour ; rien avant la première réponse ni juste après une compaction.
- Sur desktop seulement : la version SVG de secours n'a pas de jauge.

Modifiables avec `/config` dans un terminal, ou dans `settings.json` sous `pluginConfigs`.

## Régénérer la scène SVG de secours

```
node gen-rain.mjs hooks/scene.ts 0.5
```

Le second argument est la part des colonnes dessinées ; la scène doit rester sous 131 072 caractères.
