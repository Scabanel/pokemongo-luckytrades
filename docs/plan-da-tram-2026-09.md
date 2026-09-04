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

---

## Lot 8 - Les précisions du matching, montrées sur la landing

Steven : « Mets bien sur la landing des exemples de pokémon à fonds, à taille, à genre
différents et dis bien que le matching de recherche fonctionne sur ça aussi !! »

### La vérification a changé la demande

Le fond et la taille entraient bien dans `entriesMatch`. **Le genre, non** : il était
affiché sur la carte par `GenderBadge` et complètement ignoré par le matching.

Écrire sur la landing que « les correspondances en tiennent compte » aurait donc été une
promesse fausse, sur la page dont le travail est précisément d'établir la confiance. Deux
sorties possibles : écrire une phrase vraie mais bancale (« ça marche pour deux des trois »),
ou rendre la promesse vraie. Steven a confirmé la seconde de lui-même, avec le bon argument :
« Il faut que le genre rentre dans le matching pour les pikachu (ils ont une queue
différente selon le genre). »

`wantedGenderMatches` a donc la sémantique **exacte** de la taille et du fond, pour qu'il n'y
ait pas trois règles à retenir : un « Je recherche » sans genre précisé reste satisfait par
n'importe quel genre; avec un genre précisé, seul ce genre convient.

**C'est un changement de comportement sur des données réelles**, pas un simple ajout : un
« Je recherche » qui portait déjà un genre voit désormais moins de correspondances. C'est le
comportement attendu, mais il faut le dire. Appliqué à toutes les espèces et pas seulement
à celles dont l'apparence diffère : la règle ne se déclenche que si quelqu'un a
délibérément renseigné un genre, donc une liste d'espèces à maintenir n'aurait apporté
qu'une source de bugs.

Les échanges miroir continuent d'ignorer fond, taille et genre, comme avant, et c'était déjà
documenté dans `entriesMatchMirror`.

### Les exemples sont illustratifs, et c'est assumé

Cette section explique une FONCTION, elle n'annonce pas un stock. Les chiffres de la landing
sont réels parce qu'ils prétendent décrire l'activité du site; ici, un Dracaufeu sur un fond
de Go Fest montre à quoi ressemble un fond. Le fond et les tailles viennent quand même des
données du site (`data/backgrounds.json`, `POKEMON_SIZES`), donc ce sont les mêmes que dans
le formulaire.

### Le plafond de hauteur de l'accueil a été retiré, et c'est un aveu

Il a échoué **deux fois de suite** : relevé de 1 700 à 2 500 pour la landing produit, puis
dépassé dès la section suivante. En le relevant j'avais écrit qu'il ne pourrait plus que
descendre.

Deux échecs de suite sur la même page ne disent pas que la page a tort, ils disent que la
règle est mal appliquée à celle-là. Un plafond absolu protège une brièveté qui est un acquis
(« Pas encore disponibles » est passée de 43 166px à 1 100px, et ce chiffre doit être
défendu). La longueur d'une landing est un choix éditorial : elle grandit chaque fois qu'on a
une chose vraie de plus à dire, et un contrôle qui vire au rouge à chaque section serait
ignoré au troisième passage.

Il est donc remplacé par une mesure qui veut dire quelque chose sur une landing : **le titre
et le bouton principal doivent être lisibles sans défiler**. Vérifié à toutes les largeurs,
et vérifié comme mordant en abaissant artificiellement la ligne de flottaison à 100px.

Même raisonnement que pour `/evenements`, passée du plafond absolu au budget par carte.

### Ce que les sondes ont attrapé sur ce lot

1. **Le badge « XXL » était à 11px**, sous mon propre plancher de 12. D'autant plus grave
   que le zoom vient d'être retiré : ce plancher n'est plus une bonne pratique, c'est tout
   ce qui reste.
2. **Débordement horizontal de 18px à 768px.** Deux cadres de 66px côte à côte ne laissaient
   que 59px de large au texte dans une colonne de 233px. J'ai d'abord ajouté `minWidth: 0`
   en devinant, sans effet, avant de mesurer et de trouver le vrai coupable. Les cadres sont
   maintenant empilés, ce qui garde la même largeur quel qu'en soit le nombre.

### Restriction aux espèces à apparence différente

Steven, après avoir vu le lot 8 : « Restreint aux espèces à apparence différentes selon le
genre. »

Sur une espèce dont le mâle et la femelle sont identiques à l'écran, le genre n'est qu'une
étiquette : filtrer dessus ferait disparaître des correspondances valables parce que
quelqu'un a rempli un champ sans y attacher d'intention. Sur un Pikachu, c'est bien un autre
Pokémon à l'oeil.

**Cette liste n'a pas été écrite de mémoire.** Une liste fausse dans un sens fait disparaître
des correspondances légitimes, dans l'autre elle en laisse passer de mauvaises, et dans les
deux cas en silence. Rien dans le dépôt ne répondait à la question : vérifié,
`data/go-icons.json` ne contient aucun fichier marqué `.g2.`, parce que les icônes de
Pokémon GO ne distinguent pas le genre sur le sprite de base, et le `(2)` de
`data/costumes.json` ne concerne que les costumes.

PokeAPI porte un booléen fait exactement pour ça, `has_gender_differences`, et son point
d'accès GraphQL le rend en une requête. D'où `scripts/generate-gender-differences.mjs` et
`data/gender-differences.json` : **102 espèces**, généré et versionné, jamais appelé à
l'exécution.

Limite assumée et écrite dans le script : ce booléen décrit les jeux principaux, pas
Pokémon GO. C'est un sur-ensemble, donc quelques espèces y figurent alors que GO ne montre
pas la différence. La conséquence est bornée : la règle ne se déclenche que si un dresseur a
délibérément renseigné un genre. Dans l'autre sens, aucune espèce que GO différencie n'est
absente, ce qui est le sens qui compte.

### `npm run check:matching`

Une promesse affichée dans une interface et tenue par du code ailleurs se désynchronise dès
la première refonte. Celle de la landing est donc vérifiée : 13 cas sur le fond, la taille et
le genre, et trois contrôles de santé sur le fichier de données (liste tronquée, Pikachu
absent, Dracaufeu présent à tort).

Vérifié comme mordant dans les deux sens : restriction retirée -> 2 échecs; genre retiré du
matching -> 2 échecs.

La sonde importe le **vrai** module, pas une copie. Ça a demandé
`scripts/resolveur-alias.mjs`, un crochet de résolution qui apprend à Node l'alias `@/`, les
imports sans extension et l'attribut `type: "json"` que Next ne demande pas. L'alternative
était de recopier la logique dans le test, et c'est la pire des options : un test qui vérifie
une copie passe au vert pendant que l'original dérive, en donnant l'illusion d'être couvert.
