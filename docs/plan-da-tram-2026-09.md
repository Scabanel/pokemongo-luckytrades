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
