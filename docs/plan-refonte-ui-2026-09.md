# Plan de refonte UI/UX — septembre 2026

Demande de Steven : rendre le site meilleur **sur mobile surtout**, mais aussi sur PC,
plus intéressant et optimisé à utiliser, et plus beau.

## L'état mesuré avant de toucher à quoi que ce soit

Mesure du 2026-09-04, sur un build de production, Chrome piloté, à 375px et 1440px.
Ces chiffres sont la référence : chaque lot ci-dessous doit les faire bouger, et on le
vérifie plutôt que de l'affirmer.

| page | cibles < 44px | textes < 12px | hauteur à 375px |
|---|---|---|---|
| `/` | 8 | 10 | 1 549px |
| `/dresseurs` | 9 | 107 | 6 725px |
| `/evenements` | 8 | 59 | 13 759px |
| `/fonctionnalites` | 8 | 9 | 3 926px |
| `/mon-espace` | 6 | 1 | 948px |
| `/pas-encore-sortis` | 9 | **1 008** | **43 166px** |

Aucun débordement horizontal, et **deux de mes premières affirmations étaient fausses** —
corrigées ici plutôt qu'effacées, parce qu'un plan qui cache ses erreurs de départ fait
refaire le même détour à la prochaine session.

**Faux nº 1 : « Mon espace » n'est pas coupé.** Mesure précise : son bord droit est à
373px pour une fenêtre de 375. Ça tient, à 2px près. Ce que j'ai lu comme une coupure
sur une capture, c'est le lien qui touche le bord sans respiration. Le rétrécissement
atteint donc son but — au prix de 8,32px de texte, ce qui reste le vrai problème mais
pour une autre raison que celle annoncée.

**Faux nº 2 : les particules ne passent pas devant le texte.**
`ParticleBackground` est en `fixed inset-0 pointer-events-none z-0`, donc derrière le
contenu et non cliquable. Le halo qui semblait traverser un sous-titre sur la capture
est du bokeh peint DERRIÈRE un texte semi-transparent. Un lot entier du plan a été
retiré grâce à cette vérification.

Corollaire outillé : la règle de recouvrement du banc signalait du contenu passant sous
le pied de page **fixe**, ce qui est le comportement normal d'une barre fixe pendant un
défilement. Faux positif corrigé le jour même. Et elle ne peut PAS voir un calque
décoratif : `elementFromPoint` ignore `pointer-events: none`. Cette limite est annoncée
par le banc lui-même, parce qu'un contrôle qui tait son angle mort laisse croire à une
couverture qu'il n'a pas.

## Le diagnostic, en une phrase

**La stratégie mobile est « rétrécir jusqu'à ce que ça rentre sur une ligne », au lieu
de restructurer.** Elle est explicite dans `app/globals.css` :

```css
.site-nav-link { font-size: 0.52rem; }              /* 8,32px */
.mobile-fit-row > button { font-size: 0.56rem; }    /* 8,96px */
```

D'où du texte à 8px dans des cibles de 22px, soit la moitié du plancher tactile de 44px.
La contrepartie est que ça ATTEINT son objectif : les cinq onglets tiennent sur une
ligne de 375px. Le prix payé est simplement qu'on ne les lit plus et qu'on les rate au
pouce - et personne ne l'a chiffré avant aujourd'hui.

Trois conséquences en cascade :

1. **Rien n'est atteignable au pouce** sur la navigation, sur toutes les pages.
2. **Les pages de données sont des murs** : 43 000px, c'est cinquante écrans de
   téléphone. Le tri alphabétique de `/dresseurs` enterre « 114 à échanger » sous
   « 0 à échanger », soit l'inverse de ce qu'on cherche.
3. **Le texte de contenu est minuscule, pas seulement celui de la navigation.**
   1 008 occurrences sous 12px sur « Pas encore disponibles », 107 sur « Dresseurs »,
   59 sur « Événements ». La navigation donne le pire chiffre (8,32px) mais le volume
   vient des pages de données.

## Les décisions de Steven, prises avant d'écrire

1. **Navigation mobile : barre du bas, style application.** Cinq onglets fixes,
   atteignables au pouce. Le haut de l'écran revient au contenu.
2. **Identité visuelle : gardée, exécution calmée.** Noir et or, esprit Pokémon,
   particules conservées — mais derrière le contenu, halos de texte fortement réduits,
   et une échelle typographique nette à la place des tailles au cas par cas.
   Explicitement PAS une refonte de la direction artistique.
3. **Pages longues : densifier, filtrer, trier utilement.** Pas de pagination : elle
   découpe le problème sans le traiter, et sur un catalogue elle cache ce qu'on cherche.

## Les lots, dans l'ordre du risque

Chaque lot énonce son objectif MESURABLE. Un lot dont on ne sait pas dire s'il a
réussi n'est pas terminé.

### Lot 0 — le banc de mesure

Sans lui, tout ce qui suit est une affirmation. Un script du projet qui mesure, sur
toutes les pages et à trois largeurs : débordement horizontal, cibles sous 44px,
textes sous 12px, hauteur de page, et **contenu recouvert par une particule**.

*Objectif* : la commande existe, elle sort en code non nul quand un plancher est
violé, et elle reproduit à l'identique le tableau ci-dessus.

### Lot 1 — la navigation

Barre du bas sur mobile (5 onglets, cible ≥ 44px, libellé ≥ 12px), header inchangé
au-dessus du seuil. Suppression de la règle à `0.52rem`.

*Objectif* : 0 cible sous 44px et 0 texte sous 12px dans la navigation, sur toutes les
pages, et les cinq onglets atteignables sans geste de défilement.

### Lot 2 — le plancher de lisibilité

Une échelle typographique dans `globals.css`, et plus aucune taille sous 12px. C'est le
plus gros volume : 1 008 occurrences sur la seule page « Pas encore disponibles ».

*Objectif* : 0 texte sous 12px sur les six pages, à 375px comme à 1440px.

### Lot 3 — calmer les halos

RETIRÉ pour sa moitié : les particules sont déjà correctement placées derrière le
contenu, vérifié dans le code. Il ne reste donc que la partie halos.

Les ombres portées sur le jaune sont fortes (`textShadow: 0 0 12px`), et le jaune sur
noir est la paire la plus fragile de cette palette : un halo large fait baver les
contours et réduit le contraste perçu au lieu de l'augmenter.

*Objectif* : pas de chiffre à viser ici, c'est un jugement de rendu. Steven tranche sur
une comparaison avant/après.

### Lot 4 — densité et tri sur `/dresseurs`

Une carte de dresseur passe de ~200px à ~72px. Tri par défaut sur ce qui est utile —
le plus à échanger d'abord — la recherche existante conservée.

*Objectif* : hauteur à 375px divisée par au moins deux (6 725px → sous 3 400px), et le
dresseur ayant le plus à échanger visible sans défiler.

### Lot 5 — `/pas-encore-sortis` et `/evenements`

Les deux murs. Filtres qui réduisent AVANT d'afficher, densité, et regroupements
lisibles.

*Objectif* : hauteur à 375px sous 8 000px sur les deux, sans perdre l'accès à une
entrée qui était atteignable avant.

### Lot 6 — le bureau

Une fois le mobile sain : largeurs de contenu, grille, et la densité qui profite d'un
grand écran plutôt que d'étirer des cartes mobiles.

*Objectif* : à 1440px, 0 cible sous 44px, 0 texte sous 12px, et pas de ligne de texte
au-delà de 75 caractères.

## Contraintes non négociables

Reprises de `CLAUDE.md` et de l'expérience de ce dépôt.

0. **Vérifier une impression avant d'en faire un lot.** Deux des trois défauts que
   j'avais annoncés en regardant une capture n'existaient pas. La mesure a supprimé un
   lot entier. Une capture montre un symptôme, elle n'établit pas une cause.
1. **Aucun emoji ni symbole décoratif.** Seule exception, le sparkle du mot « Shiny ».
   Cette règle survit à la refonte : elle ne se négocie pas contre de l'esthétique.
2. **Aucune écriture en base pendant les mesures.** Le banc lit des pages, rien d'autre.
   La base est celle de production.
3. **Mesurer sur un build de production, jamais sur le serveur de développement.** Pour
   la géométrie l'écart est faible, mais l'habitude évite le jour où il ne l'est pas.
4. **Un lot terminé ET mesuré avant le suivant.** Trois lots enchaînés sans vérifier
   laissent trois lots à déboguer ensemble.
5. **Le plancher tactile est 44px et le plancher de texte 12px.** Ce sont des planchers,
   pas des cibles : on ne les « ajuste » pas pour faire passer un lot. Si un lot demande
   de les baisser, c'est le lot qui est faux.
6. **Ne jamais garder un contrôle qu'on n'a pas vu échouer.** Chaque règle du banc est
   éprouvée en injectant le défaut, puis en vérifiant le retour au vert. Un contrôle qui
   ne peut pas correspondre ne devient jamais rouge : il devient muet.

## Résultats mesurés, fin de passe (2026-09-04)

Même banc, même build de production, mêmes trois largeurs. `npm run check:mobile` passe.

| page | cibles < 44px | textes < 12px | hauteur à 375px |
|---|---|---|---|
| `/` | 8 → **0** | 10 → **0** | 1 549 → 1 651px |
| `/dresseurs` | 9 → **0** | 107 → **0** | 6 725 → **3 864px** (−43 %) |
| `/evenements` | 8 → **0** | 59 → **0** | 13 759 → **8 040px** (−42 %) |
| `/fonctionnalites` | 8 → **0** | 9 → **0** | 3 926 → 4 090px |
| `/mon-espace` | 6 → **0** | 1 → **0** | 948 → 960px |
| `/pas-encore-sortis` | 9 → **0** | **1 008 → 0** | **43 166 → 1 115px** (−97 %) |

Le pire texte passait de **8,32px à aucun sous 12px**, et la pire cible de **16×16px à
aucune sous 44px**, aux trois largeurs. Sur « Pas encore disponibles », on passe de
cinquante écrans de téléphone à un peu plus d'un.

### Ce qui a été fait, et pourquoi

- **Barre d'onglets en bas** sur mobile, 56px de haut, libellés à 12px. Le pied de page
  cesse d'être fixe et redescend dans le flux : empiler pied et onglets aurait pris un
  sixième d'un écran de 667px en mobilier fixe.
- **67 déclarations de taille relevées au plancher de 12px** par transformation
  déterministe, une taille ne pouvant qu'augmenter. Plus trois cas nommés à la main : un
  `clamp()` dont le minimum valait 11,2px, et trois liens-texte de 15 à 18px de haut.
- **Planchers tactiles à TOUTES les largeurs** et non seulement sous 640px : un doigt a la
  même taille sur une tablette, et beaucoup de portables sont tactiles.
- **`/dresseurs`** passe en deux colonnes et **trie par nombre à échanger décroissant**.
  L'ordre alphabétique mettait « 0 à échanger » avant « 213 à échanger », soit l'inverse
  de ce qu'on vient chercher. L'alphabétique reste le second critère, pour que la liste
  garde un ordre stable à égalité.
- **Le cercle d'avatar est masqué sur téléphone** : il n'affichait que la première lettre
  du nom écrit juste à côté, pour un tiers de la carte en deux colonnes.
- **`/pas-encore-sortis` : sections repliées par défaut**, avec leur compte visible. Une
  recherche en cours les ouvre toutes, sinon on chercherait dans du contenu replié.
- **Halos resserrés** : sept ombres portées passent de 20px de rayon à 8. Sur du jaune sur
  noir, un halo large remplit les contre-formes des lettres et réduit le contraste perçu.

### Deux régressions que le banc a attrapées, et c'est son intérêt

1. **23px de débordement** sur `/dresseurs` après le passage en deux colonnes : les noms
   longs poussaient la carte hors de l'écran. Corrigé par troncature, nom complet conservé
   dans `title`.
2. Une cible reprochée « 343x44px », donc un reproche absurde, sur une hauteur réelle de
   43,98px. Tolérance d'un demi-pixel et valeurs non arrondies : un contrôle qui dit une
   chose absurde perd sa crédibilité sur toute sa liste.

### Une leçon d'outillage à retenir pour ce dépôt

**`npm run build` ne fait PAS de vérification de types.** Une référence à une variable
inexistante a produit un build vert et une page qui ne chargeait plus. `npx tsc --noEmit`
l'a dit en une ligne. À lancer systématiquement, le build ne suffit pas.

### Les plafonds de hauteur sont gelés à la valeur ATTEINTE

Deux de mes estimations de départ sont restées hors d'atteinte de peu (3 864 contre 3 400,
8 040 contre 8 000). Les relever à un chiffre rond aurait été le geste que ce projet
s'interdit ailleurs : désactiver un contrôle en lui laissant l'air d'un contrôle. Ils sont
donc gelés à ce qui est mesuré, avec 2 % de marge, et ils ne peuvent que descendre.

### Ce qui reste ouvert

- **Le lot 6 (bureau) n'est pas fait** au-delà des planchers tactiles, désormais tenus aux
  trois largeurs. La densité qui profiterait vraiment d'un grand écran, et la largeur de
  ligne de texte, restent à travailler.
- **La beauté n'est pas mesurable** et ne l'a pas été. Le banc dit que les pages sont
  lisibles, atteignables et contenues. Le jugement sur le rendu appartient à Steven.
- **Aucun vrai téléphone n'a été testé.** Chrome piloté à 375px n'est ni iOS Safari ni
  Chrome Android : polices, défilement inertiel et unités de viewport avec la barre du
  navigateur ne sont pas éprouvés.
