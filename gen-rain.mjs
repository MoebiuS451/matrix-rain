// Génère la scène SVG "pluie numérique" et l'écrit dans hooks/scene.ts.
// Modèle : grille de glyphes fixe ; une tête blanche descend en allumant chaque
// case, qui vire au vert puis s'éteint sur place (la traînée ne bouge pas).
// Usage : node gen-rain.mjs hooks/scene.ts
import { writeFileSync } from 'node:fs'

// Glyphes originaux dans une cellule 10x14 : [x, y, suite relative]
const GLYPHS = [
  [[1, 2, 'h8'], [5, 2, 'v11']],
  [[1, 3, 'h8l-3 4'], [5, 7, 'v6']],
  [[2, 1, 'v12'], [2, 6, 'h6'], [8, 2, 'v11']],
  [[1, 2, 'h8v4h-8'], [5, 6, 'l-3 7']],
  [[1, 7, 'h8'], [5, 1, 'v12'], [2, 12, 'h6']],
  [[8, 1, 'l-6 6h7'], [6, 7, 'v6']],
  [[1, 2, 'h7l-6 11']],
  [[2, 2, 'l6 4'], [2, 8, 'l6 4'], [1, 13, 'h8']],
  [[1, 1, 'h8v12'], [1, 7, 'h8']],
  [[5, 1, 'v4'], [1, 5, 'h8'], [3, 8, 'l-2 5'], [7, 8, 'l2 5']],
  [[1, 3, 'h8'], [1, 8, 'h8'], [3, 1, 'v12']],
  [[2, 1, 'v6h6v6'], [8, 1, 'v3']],
  [[1, 1, 'h8v6h-8z'], [5, 7, 'v6']],
  [[1, 4, 'l4-3l4 3'], [5, 4, 'v9']],
  [[1, 1, 'h8v12h-8z'], [1, 7, 'h4']],
  [[5, 1, 'v12'], [1, 4, 'l8 6']],
  [[1, 1, 'l8 12'], [9, 1, 'l-4 6']],
  [[2, 2, 'h6'], [2, 7, 'h6'], [5, 7, 'v6'], [1, 12, 'h8']],
]

let seed = 11
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const pick = arr => arr[Math.floor(rnd() * arr.length)]

const W = 1600, H = 1000
const SCALE = 1.1          // cellule 10x14 -> 11x15 px
const PITCH_X = 15         // écart entre colonnes, en px
const PITCH_Y = 17         // écart entre lignes, en unités de cellule (27 px)
const ROWS = Math.ceil(H / (PITCH_Y * SCALE)) + 1
const KEEP = Number(process.argv[3] ?? 0.5) // part des colonnes dessinées (budget 131 072 caractères)

let cols = ''
for (let x = 4; x < W; x += PITCH_X) {
  if (rnd() > KEEP) continue
  const step = 0.06 + rnd() * 0.07           // s par ligne : 8 à 16 lignes/s
  const period = ROWS * step * (1.3 + rnd() * 1.7) // passage + temps sombre
  const offset = -rnd() * period
  let paths = ''
  for (let k = 0; k < ROWS; k++) {
    const d = pick(GLYPHS).map(([gx, gy, rest]) => `M${gx} ${gy + k * PITCH_Y}${rest}`).join('')
    // Quelques cases restent visibles quand les animations sont réduites
    paths += rnd() < 0.18 ? `<path class="r" d="${d}"/>` : `<path d="${d}"/>`
  }
  cols +=
    `<g class="c" style="--s:${step.toFixed(3)}s;--t:${period.toFixed(2)}s;--o:${offset.toFixed(2)}s" ` +
    `transform="translate(${x} 0) scale(${SCALE})">${paths}</g>`
}

let rows = ''
for (let k = 2; k <= ROWS; k++) rows += `.c path:nth-child(${k}){--k:${k - 1}}`

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
  `<style>` +
  `path{fill:none;stroke:#2bd35c;stroke-width:1.3;stroke-linecap:square;opacity:0;--k:0;` +
  `animation:lit var(--t) linear infinite both;` +
  `animation-delay:calc(var(--s) * var(--k) + var(--o))}` +
  `path.r{opacity:.3}` +
  rows +
  `@keyframes lit{` +
  `0%{opacity:1;stroke:#f4fff6}` +
  `1.2%{opacity:1;stroke:#f4fff6}` +
  `2.6%{opacity:1;stroke:#7dff9c}` +
  `9%{opacity:.85;stroke:#35e468}` +
  `30%{opacity:0;stroke:#138a35}` +
  `100%{opacity:0;stroke:#138a35}}` +
  `</style>` +
  `<rect width="${W}" height="${H}" fill="#010402"/>` +
  cols +
  `</svg>`

writeFileSync(
  process.argv[2],
  `// Généré par gen-rain.mjs : pluie numérique originale, glyphes vectoriels.\nexport const RAIN_SCENE = ${JSON.stringify(svg)}\n`,
)
console.log('svg chars:', svg.length, 'rows:', ROWS)
