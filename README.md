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
| `density` | `tres-dense` (7 pt), `dense` (9 pt), `normale` (13 pt) | `tres-dense` |
| `speed` | `lente`, `normale`, `rapide` | `normale` |
| `trail` | `courte`, `normale`, `longue` | `normale` |
| `glow` | `aucun`, `doux`, `normal`, `fort` | `normal` |
| `pointer` | `true` / `false` | `true` |

Modifiables avec `/config` dans un terminal, ou dans `settings.json` sous `pluginConfigs`.

## Régénérer la scène SVG de secours

```
node gen-rain.mjs hooks/scene.ts 0.5
```

Le second argument est la part des colonnes dessinées ; la scène doit rester sous 131 072 caractères.
