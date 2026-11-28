# matrix-rain

Mod pour l'app Claude (Claude Code, desktop et mobile) : thème sombre vert phosphore et pluie numérique animée en fond d'écran.

- Sur desktop, la pluie tourne sur le GPU : grille de glyphes fixe, têtes blanches qui descendent en écrivant, traînée qui s'éteint sur place, halo, colonnes qui s'écartent sous la souris et onde lumineuse à chaque clic.
- Sur mobile, en mouvement réduit ou si le GPU ne suit pas, une version SVG plus légère prend le relais.
- Le terminal et les extensions d'éditeur n'affichent pas de thème.

## Installation

Prérequis : Claude Code (app desktop ou CLI). Le dépôt est public : aucun compte GitHub ni connexion requis pour installer.

Dans un terminal (PowerShell sous Windows, shell sous macOS ou Linux) :

1. Ajouter la marketplace :

```
claude plugin marketplace add MoebiuS451/matrix-rain
```

2. Installer le plugin (portée utilisateur) :

```
claude plugin install matrix-rain@matrix-rain
```

3. Vérifier :

```
claude plugin list
```

Résultat attendu : `matrix-rain@matrix-rain`, `Scope: user`, `Status: enabled`.

4. Fermer complètement l'application Claude (icône de la zone de notification comprise), puis la rouvrir. Chaque fil garde la version du plugin chargée à son démarrage : un fil ouvert avant l'installation ne change pas.

### Mise à jour

```
claude plugin marketplace update matrix-rain
claude plugin update matrix-rain@matrix-rain
```

Puis redémarrer l'application (étape 4).

### Désinstallation

```
claude plugin uninstall matrix-rain@matrix-rain
```

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

La pluie finit sa chute sur une ligne de glyphes vivants, tout en bas de l'écran ; chaque goutte qui l'atteint y laisse un éclat lumineux. La ligne se densifie à mesure que le contexte du fil se remplit : 15 % des cases à vide, toutes au seuil. Le remplissage se mesure contre le **seuil de relance** du fil, pas contre la fenêtre complète : ~250K tokens pour Opus, ~200K pour Sonnet, 70 % de la fenêtre pour Haiku, 75 % pour un autre modèle.

- Vert sous 60 % du seuil, jaune ambré de 60 à 100 %, rouge au-delà, avec une pulsation lente.
- Au seuil (rouge), une seconde ligne moyennement dense apparaît au-dessus et se remplit au-delà : c'est le moment de relancer le fil ou de compacter.
- Mise à jour à la fin de chaque tour ; rien avant la première réponse ni juste après une compaction.

### Cache froid

Quand le fil reste plus d'une heure sans requête (durée de vie du cache de prompt), la pluie passe du vert au **cyan** : la prochaine réponse relira tout le contexte au prix fort. Elle redevient verte dès la requête suivante. Un fil rouvert après une longue pause s'affiche cyan d'emblée.

- Sur desktop seulement : la version SVG de secours n'a pas de jauge.

Réglages : `claude plugin configure matrix-rain@matrix-rain` affiche les options et leur état. Les dialogues `/plugin` ne sont pas disponibles dans les sessions de l'app desktop. Toutes les options sont facultatives : sans réglage, les valeurs par défaut s'appliquent.

## Régénérer la scène SVG de secours

```
node gen-rain.mjs hooks/scene.ts 0.5
```

Le second argument est la part des colonnes dessinées ; la scène doit rester sous 131 072 caractères.
