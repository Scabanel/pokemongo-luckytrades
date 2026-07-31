# Contexte accumulé — pokemongo-luckytrades

Ce fichier capitalise sur ce qui a été appris/construit au fil des sessions,
au-delà de ce que `README.md` (setup/ops) et `CLAUDE.md` (règles strictes)
couvrent déjà. À lire avant de retoucher au matching, aux sprites, aux fonds,
ou à la pipeline de données de jeu.

## Le système de matching (want ↔ give/mirror)

Trois signaux calculés côté client dans `components/PokemonCard.tsx`, tous
dérivés à partir de `allEntries` (jamais stockés, jamais de backfill à
maintenir — s'appliquent donc automatiquement aux entrées déjà existantes) :

- `availableFrom` — sur SA PROPRE entrée want : chez quels autres dresseurs
  ce Pokémon est disponible (bouton "Dispo chez N Dresseurs").
- `viewerWantsThis` — sur une tuile give/mirror d'un AUTRE dresseur : est-ce
  que le visiteur connecté recherche justement ça ("Vous recherchez celui-ci !").
- `viewerHasThis` — symétrique, sur une tuile want d'un autre dresseur
  ("Tu as celui recherché !").

Deux entrées "matchent" si : même `pokemonId`, même `shiny`, même
`formVariantKey(pokemonId, customSpriteUrl, tags)`, et `wantedBackgroundMatches`
sur le fond (voir plus bas). Toute la subtilité est dans `customSpriteUrl` et
`backgroundUrl`, deux champs qui sont de simples chaînes d'URL **sans clé
étrangère** — aucune migration de données n'est jamais nécessaire quand on
change la logique de comparaison, seul le calcul au rendu change.

### `formVariantKey` / `canonicalCustomSpriteUrl` (lib/spriteVariants.ts)

Bug réel rencontré (et sa généralisation) : deux entrées visuellement
identiques du même Pokémon peuvent avoir des `customSpriteUrl` différents
selon comment elles ont été ajoutées :
- Ajout en masse (`BulkAddPicker`) laisse `customSpriteUrl` vide pour tout ce
  qui ne nécessite pas d'être figé (`variantNeedsPinnedSprite` = pas de
  costume/forme régionale/genre) — `PokemonCard`/`PokemonSprite` reconstruit
  le bon sprite dynamiquement à partir de `pokemonId`+`shiny`+`tags`.
- Ajout solo (`SpritePicker` dans `AdminPanel.tsx`) pouvait figer N'IMPORTE
  quelle URL cliquée, y compris un sprite générique PokeAPI (`fetchAllSprites`,
  ex. "l'animé") pour une espèce qui n'a AUCUN costume réel en jeu (Kyogre,
  Groudon, la plupart des légendaires n'ont que "Officiel Pokémon GO"/"Primal"
  dans `costumes.json`).

Comparer les chaînes brutes cassait donc le matching entre deux dresseurs
ayant chacun juste choisi un style d'affichage différent pour le même
Pokémon de base. `canonicalCustomSpriteUrl(pokemonId, customSpriteUrl)`
résout ça avec la règle générale : une URL ne compte comme vraie variante
QUE si elle correspond exactement à une entrée du catalogue qui a
réellement besoin d'être figée (`variantNeedsPinnedSprite`) — costume
événementiel, forme régionale, ou variante de genre pairée. Toute autre URL
(sprite générique, choix esthétique, URL manuelle) canonicalise vers `""`,
peu importe sa source.

`formVariantKey` ne prend donc PAS de paramètre `shiny` séparé — l'égalité
d'URL entre variantes différentes suffit déjà à respecter le shiny (les
fichiers shiny/non-shiny d'une même espèce ont des URLs différentes dans le
catalogue).

### `wantedBackgroundMatches` (components/PokemonCard.tsx)

"fond" (`backgroundUrl`) reste hors de `formVariantKey` : ce n'est pas une
forme différente du Pokémon dans le jeu. MAIS pour un **want**, le fond
n'est pas toujours un détail cosmétique — beaucoup de dresseurs recherchent
justement le souvenir d'un événement/lieu précis (ex : le fond de GO Fest
Copenhague sur un légendaire), pas n'importe quel exemplaire de l'espèce.

Règle : un want SANS fond précisé reste satisfait par n'importe quel
give/mirror (fond ou pas) ; un want AVEC un fond précisé n'est satisfait que
par un give/mirror ayant EXACTEMENT ce même fond. La contrainte est
directionnelle (c'est le fond du WANT qui compte, jamais celui du give/mirror
seul) — voir les 3 sites d'appel dans `PokemonCard.tsx` pour la bonne
direction (`entry` vs `other` selon lequel des deux est le want à cet endroit).

### Piège à éviter en cas de nouvelle modif du matching

`getSpriteVariants(pokemonId)` (lib/spriteVariants.ts) est LA source de
vérité sur "quelles variantes existent réellement pour cette espèce" (base,
costumes, formes régionales, Dynamax, Gigamax — tout dérivé des mêmes
fichiers JSON que `BulkAddPicker` et `getOfficialCostumes` dans
`AdminPanel.tsx` utilisent déjà). Toute nouvelle règle de canonicalisation
doit passer par cette fonction plutôt que par une comparaison de préfixe de
label codée en dur à un autre endroit, sous peine de re-diverger entre les
chemins d'ajout solo/masse.

## Google Sheet comme source de vérité "disponibilité GO"

Steven tient à jour un Google Sheet (voir `scripts/generate-pogo-availability.mjs`
pour l'URL/ID) qui liste, par pseudo-région, chaque espèce avec des colonnes
`Available/Shinies/Shadow/Shadow Shiny/Dynamax/Shiny D-Max`, plus un onglet
"Regional Formes" qui regroupe formes régionales/Gigamax/Méga par nom
(`"Gigantamax Charizard"`, `"Mega Clefable"`...) avec les mêmes colonnes
`Available`/`Shinies`.

- L'export CSV public (`/export?format=csv`) échoue sans un User-Agent de
  navigateur (page d'erreur Google Drive). L'export XLSX complet
  (`/export?format=xlsx`) fonctionne et donne tous les onglets d'un coup —
  utilise le package `xlsx` (SheetJS, installé depuis leur CDN officiel,
  `cdn.sheetjs.com`, PAS la version npm qui est restée bloquée à 0.18.5 avec
  des CVE non patchées).
- **Piège d'indexation** : `XLSX.utils.sheet_to_json(sheet, {header:1, range:1})`
  ignore la colonne A vide du classeur — les index de colonnes démarrent
  directement à "No." (colonne B visuellement), PAS à l'index qu'on
  attendrait en comptant les colonnes visuellement dans le classeur. Vérifié
  et documenté dans `COL` en tête de `generate-pogo-availability.mjs`.
- Résultat : `data/pogo-availability.json` (sets de dex ID disponibles par
  variante) + régénère `data/missing-in-go.json` (remplace l'ancienne
  heuristique par présence d'icône PokeMiners/scrape margxt.fr — les
  datamines peuvent précéder la sortie réelle en jeu, ex. Ogerpon/Terapagos
  avant leur sortie).
- Câblé dans `app/api/cron/refresh-data/route.ts` (cron hebdomadaire, voir
  `vercel.json`). **Piège vécu** : régénérer le code du cron ne régénère PAS
  automatiquement les fichiers de données existants tant que le cron n'a
  pas tourné au moins une fois en prod — après un changement de logique de
  génération, régénérer manuellement en local (`npm run gen:pogo`, ou un
  petit script one-off import + write) et committer, plutôt que d'attendre
  le prochain passage nocturne.
- `BulkAddPicker.tsx` et le formulaire d'ajout solo (`AdminPanel.tsx`)
  restreignent maintenant équipes/variantes proposées à ce que confirme ce
  classeur (`AVAILABLE_SPECIES`, `DYNAMAX_AVAILABLE_SPECIES`,
  `GIGANTAMAX_AVAILABLE_SPECIES`, tous exportés depuis `lib/spriteVariants.ts`
  pour éviter la duplication entre les deux chemins d'ajout).

## Persistance de fichiers statiques (Vercel = lecture seule à l'exécution)

Le système de fichiers Vercel est en lecture seule en prod : toute écriture
(cron de rafraîchissement, gestionnaire de fonds admin) passe par l'API
Contents de GitHub (`lib/github-repo.ts` : `putIfChangedText`,
`createBinaryFile`, `listRepoDirectory`, `getExistingMissingInGo`), qui
commite sur le dépôt et déclenche un redéploiement Vercel. Pas de fonction de
suppression de fichier à ce jour (pas encore eu besoin — voir
`components/BackgroundManager.tsx`, qui supprime une entrée de catalogue
sans jamais supprimer l'image sous-jacente, un orphelin dans le repo n'étant
pas grave).

`app/admin/page.tsx` est le hub admin dédié (dresseurs/échanges, pas-encore-
sortis, export, gestion des fonds) — pas juste une redirection comme avant.

## Mobile — barres de boutons/filtres (`.mobile-fit-row`, app/globals.css)

Itéré plusieurs fois avant de trouver la bonne recette :
1. Défilement horizontal (`overflow-x:auto` + `flex-shrink:0`) : jugé trop
   invasif au toucher.
2. `white-space:normal` + `overflow-wrap:anywhere` + `flex:1 1 0` à largeur
   égale forcée : **catastrophique en vrai** — donne des tours de lettres
   verticales illisibles dès qu'il y a plus de 3-4 boutons ou un libellé
   dynamique un peu long (ex : le pseudo du dresseur inséré dans
   "X recherche"/"X peut donner"). Ne JAMAIS refaire ça.
3. Solution retenue : texte qui reste horizontal et lisible (`white-space:
   nowrap`, police réduite ~0.56rem, padding réduit), et **retour à la ligne
   de boutons entiers** (`flex-wrap: wrap`, pas `nowrap`) plutôt que du
   scroll horizontal ou un rétrécissement forcé. Décision explicite de
   Steven après test en vrai : à cette taille, 2 lignes de boutons entiers
   est largement préférable à n'importe laquelle des deux approches
   précédentes.

## Environnement de dev — pièges rencontrés

- **`.next` contaminé** : `npm run build` (prod) et `next dev` partagent le
  même dossier `.next` par défaut. Enchaîner un `npm run build` puis
  `next dev` (ou l'inverse) dans la même session peut servir des chunks CSS/
  JS périmés malgré un redémarrage du serveur dev — confirmé en observant
  un hash de chunk CSS identique après restart alors que le fichier source
  avait changé. Réflexe : `rm -rf .next` avant de relancer `next dev` pour
  vérifier visuellement un changement, si un `npm run build` a tourné entre
  temps.
- **Alias `@/*` non résolu hors Next.js** : lancer un script via `tsx` ou
  `node` en dehors du serveur Next (ex: pour tester une fonction de
  `lib/*.ts` qui importe `@/data/*.json`) échoue silencieusement ou résout
  vers un mauvais module — ce n'est PAS un bug du code testé. Pour tester
  une fonction qui dépend de l'alias `@/`, créer une route API Next
  temporaire (`app/api/<nom-temporaire>/route.ts`, PAS préfixée `_` — les
  dossiers `_xxx` sous `app/` sont des "private folders" exclus du routing),
  la interroger via `curl` pendant que `next dev` tourne, puis la supprimer
  et `rm -rf .next` pour nettoyer les types générés qui la référencent.
