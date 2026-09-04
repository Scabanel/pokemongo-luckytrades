# Refonte DA : le plan de tram

Demandé par Steven le 2026-09-04. Branche `v2-refonte-da`, **rien en production** tant qu'il
n'a pas vu le résultat sur son téléphone.

## La demande, telle qu'elle a été formulée

> « Une refonte entière de la DA et des interfaces pour que le site ait une vraie identité
> Strasbourg / Pokémon GO (sans tomber dans le cliché des couleurs alsaciennes) tout en
> bossant la landing pour qu'elle fasse réelle landing produit. Mais surtout que l'interface
> soit toujours plus facile à utiliser sur téléphone car c'est là que c'est le plus utilisé.
> Faut faciliter que l'autre puisse voir rapidement ce que tu as en dégainant le QR code par
> exemple, ou le filtre directement à copier aussi. Il faut aussi garder le côté échanges et
> luck. C'est pour la communauté Discord de Strasbourg. Faut juste pas trop tout chambouler
> niveau UX histoire que les users soient pas perdus. »

Trois directions lui ont été montrées sur planche
(https://claude.ai/code/artifact/b11399ea-c76a-4e83-86ba-900699e3cd06).
Il a choisi le **plan de tram**, en **clair uniquement** : « J'aime pas la variante sombre.
Claire c'est bien ! » Il n'y aura donc pas de thème sombre, et ce n'est pas un oubli.

## Pourquoi le plan de tram n'est pas une décoration plaquée

Le site a déjà trois catégories, et ce sont déjà trois lignes :

| Catégorie | Sens | Aujourd'hui |
|---|---|---|
| `mirror` | Échanges miroir | violet `#b464ff` |
| `want` | Je recherche | bleu `#4ea8ff` |
| `give` | Je peux donner | jaune `#ffd93d` |

Un plan de réseau, c'est exactement ça : des lignes de couleur, des stations, des
correspondances. Les dresseurs sont les stations, les catégories sont les lignes, un échange
miroir est une correspondance. Le motif encode donc quelque chose de vrai sur le contenu,
au lieu d'être un habillage.

C'est aussi ce qui répond à « Strasbourg sans cliché » : le réseau est lu par tout le monde
ici, et il n'a ni cigogne ni colombage.

## Le problème dur : le contraste

Les couleurs actuelles ont été choisies pour un fond quasi noir. Sur du papier clair, un
jaune `#ffd93d` en texte donne un rapport de contraste d'environ 1,4:1 - illisible. Chaque
rôle a donc besoin d'un équivalent saturé et sombre, et **ça se calcule, ça ne se juge pas
à l'œil**.

`npm run check:da` échoue si un texte passe sous 4,5:1, ou une bordure sous 3:1. Une règle
de DA écrite en prose finit violée ailleurs dans le système; celle-ci sort en code d'erreur.

## L'or reste réservé au shiny et à la chance

`#ffd700` compte aujourd'hui **182 usages** : c'est devenu la couleur de tout, donc la
couleur de rien. Dans la nouvelle DA, l'or ne sert qu'au shiny, aux médailles et à la
chance. `check:da` compte ses usages et échoue s'il déborde des classes autorisées.

## Surface du chantier, mesurée

781 couleurs en dur dans 23 fichiers, dont 419 dans deux : `PokemonCard.tsx` (214) et
`AdminPanel.tsx` (205). 39 hex distincts, 48 bases rgb, qui se ramènent à une quinzaine de
rôles. La conversion se fait donc par table de correspondance appliquée par script, sur des
littéraux de couleur uniquement - jamais par regex structurelle, qui avait déjà cassé du JSX
lors de la passe précédente.

`ParticleBackground.tsx` peint dans un canvas : `var()` n'y fonctionne pas, il lit donc les
tokens en JavaScript. C'est la seule exception, et `check:da` la nomme explicitement.

## Les lots

- **Lot 0** - Le système de tokens (`app/tokens.css`) et `scripts/check-da.mjs` : contraste,
  restriction de l'or, interdiction du hex en dur, interdiction des ombres et halos.
- **Lot 1** - Balayage des 781 couleurs par table de correspondance.
- **Lot 2** - Le langage tram : traits francs, pastilles de station, aplats sans ombre, plus
  de `backdrop-filter` ni de `box-shadow` diffus. Header, cartes, badges, onglets.
- **Lot 3** - La landing devient une vraie landing produit.
- **Lot 4** - Le QR code et le bouton « Copier le filtre GO ».
- **Lot 5** - Mesure : `check:mobile` sur les quatre profils, `check:da`, `tsc`, `lint`.

## Contraintes non négociables

1. **L'UX ne bouge pas.** Mêmes cinq onglets, même grille, mêmes parcours. On repeint.
2. **Pas d'emoji ni de symbole décoratif**, sauf le sparkle du shiny (règle du projet).
3. **Aucun tiret cadratin ni demi-cadratin** nulle part.
4. **Le texte visible reste en français** (c'est un site de communauté strasbourgeoise).
5. **Rien en production** sans validation de Steven sur téléphone.
6. Les planchers mobiles tenus : 44px tactile, 12px texte, aux quatre profils.

## Résultats

À remplir au fur et à mesure, avec les mesures avant et après.

---

## Résultats

Tout est sur `v2-refonte-da`. **Rien n'est en production.**

### Ce qui a été fait

| Lot | État | Mesure |
|---|---|---|
| 0 - Tokens et `check:da` | fait | 41 tokens, 31 paires de contraste vérifiées |
| 1 - Balayage des couleurs | fait | 781 couleurs en dur -> 0 |
| 2 - Langage du plan de tram | fait | halos, verre dépoli et ombres portées : 0 |
| 3 - Landing produit | fait | 5 sections, chiffres réels, 2 421px sur mobile |
| 4 - QR code et filtre GO | fait | testé de bout en bout sur un vrai dresseur |
| 5 - Mesure | fait | `check:mobile` vert aux 4 profils, `tsc` 0, lint 14 (contre 16 avant) |

### Les chiffres

- **781** couleurs en dur ramenées aux tokens, dont **229** accents dorés devenus de l'encre
- L'or passe de **190 usages** à moins de 24, plafond vérifié par `check:da`
- Le header mobile passe de **65px à 31px**
- La landing passe de 4 encarts à 5 sections avec **64 dresseurs, 1 988 Pokémon, 1 296 shiny** réels
- Lint : **16 erreurs préexistantes -> 14** (la réécriture de la landing en a supprimé deux)

### Ce que les sondes ont attrapé, et que la relecture n'aurait pas vu

1. **Deux de mes propres couleurs** échouaient au contraste dès le premier passage de
   `check:da` : le gris des mentions à 3,97:1 et l'ambre de la ligne « donne » à 4,47:1.
   Corrigées à la valeur la plus proche qui passe, trouvée par recherche.
2. **`check:da` échouait sur sa propre documentation.** `tram.css` explique en prose que
   `#ffd700` comptait 190 usages, et cette phrase était comptée comme une couleur en dur.
   Un contrôle qui reproche à un commentaire d'expliquer le contrôle finit désactivé.
3. **Mon découpage des ombres a coupé à l'intérieur d'un `color-mix`**, qui contient
   lui-même des virgules : deux déclarations CSS corrompues, build cassé.
4. **Trois halos avaient survécu** parce qu'ils passaient par un champ nommé `shadow` et
   non `boxShadow`. La règle cherche désormais la FORME d'un halo (deux décalages nuls, un
   flou, puis une couleur) et non le nom de la propriété. Sa première version signalait
   `margin: "0 0 4px"` : deux faux positifs sur trois, le début d'une sonde qu'on ignore.
5. **Trois pertes de sens dans la migration.** `#ffd93d` et `#ffd700` portaient parfois du
   sens et ont été pris pour de l'or décoratif : la catégorie « Je peux donner » a perdu sa
   ligne, le podium a perdu sa première place à côté d'un argent et d'un bronze intacts, et
   les étiquettes « fête » et « anniversaire » ont perdu leur couleur.
6. **Le panneau de partage s'ouvrait sur une liste vide.** Il ne proposait le filtre que de
   la catégorie affichée; l'onglet par défaut est « Échanges miroir », le dresseur testé en
   avait 0, et sa liste « peut donner » en comptait 213.
7. **`tram.css` était importé au mauvais endroit.** En tête de `globals.css`, donc les
   règles de `globals` passaient après et gagnaient : le bouton principal restait teal au
   lieu de l'encre pleine. Le CSS impose les `@import` en tête de feuille, il est donc
   chargé depuis le layout, après.
8. **J'avais écrit les étapes sans accents** alors que c'est du texte affiché.

### Le plafond de hauteur de l'accueil a été relevé

1 700 -> 2 500px, et c'est le geste que `check-mobile.mjs` interdit ailleurs. La raison est
écrite dans le fichier : ce plafond avait été gelé sur un placeholder, pas sur un acquis; la
page fait 2 421px, moins de trois écrans, là où une landing produit en fait couramment six;
et l'intention du contrôle, attraper le défilement sans fin, n'est pas touchée. À partir
d'ici il ne peut de nouveau que descendre.

### Ce qui n'est pas fait, et doit être dit

- **Aucun vrai téléphone.** Chrome piloté à 375px avec une encoche simulée n'est ni iOS
  Safari ni Chrome Android. C'est le test qui manque, et c'est celui de Steven.
- **La beauté n'est pas mesurable** et ne l'a pas été. Les sondes disent que les couleurs
  sont lisibles, que l'or ne parle que de chance, que rien ne déborde et que tout
  s'atteint au pouce. Elles ne disent pas si le plan de tram était la bonne idée.
- **Le fond clair reste mon réserve**, exprimée une fois avant de commencer : pour un jeu
  qu'on ouvre dehors le soir, c'est le point que je trouve risqué. Steven a tranché après
  avoir vu les trois pistes, et il n'y a pas de thème sombre.
- **Les pages d'administration n'ont pas été relues à l'oeil** après la migration des
  couleurs. `AdminPanel.tsx` portait 205 couleurs en dur, converties par script et
  vérifiées par `check:da`, mais un écran d'administration a des états (erreurs, formulaires
  ouverts, sélections) qu'aucune capture n'a montrés.
- **Vulnérabilités npm préexistantes** (babel, hono, humanfs) signalées par `npm audit`.
  Elles ne viennent pas de `qrcode` et n'ont pas été touchées : `--force` au milieu d'une
  refonte n'est pas une bonne idée.
