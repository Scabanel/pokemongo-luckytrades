# Plan d'améliorations, juillet 2026

Ce plan a été préparé à effort de raisonnement élevé (recherche/vérifications déjà
faites) pour être exécuté ensuite par un modèle à effort faible, sans re-recherche.
Chaque item ci-dessous contient : le fichier exact, le changement précis (avec code
quand c'est déjà déterminé), et un critère de vérification.

**Règles du projet à respecter en implémentant (voir `CLAUDE.md`) :**
- Jamais d'em dash dans le code ou les messages (remplacer par un tiret simple,
  une virgule ou un deux-points).
- Jamais d'emoji, sauf le sparkle ✨ associé au mot "Shiny".
- Type-check (`npx tsc --noEmit -p .`) après chaque item avant de continuer au suivant.
- Vérifier dans le navigateur (`preview_start` + `Claude_Browser`) au moins les items 1, 3, 4 qui sont visuellement observables.
- Commit séparé par item (petits commits, comme le reste de l'historique de ce repo).

---

## Item 1 : Catégorie par défaut à l'ouverture du formulaire d'ajout

**Problème** : le formulaire d'ajout démarre toujours sur `category: "want"`
(components/AdminPanel.tsx ligne ~925), peu importe l'onglet de catégorie
actuellement affiché (`activeCategory`, state ligne 55). Un ajout depuis l'onglet
"Miroir" crée donc une entrée qui atterrit dans "Je recherche", invisible dans la
vue courante. C'est très probablement la cause du symptôme "il faut insérer
plusieurs fois" : l'utilisateur pense que l'ajout a échoué (rien n'apparaît dans
l'onglet qu'il regarde) et resoumet, créant des doublons ailleurs.

**Fix** :
1. Dans `EntryFormProps` (ligne ~878), ajouter `defaultCategory: EntryCategory` à
   la variante `mode: "add"`.
2. Dans le call site `<EntryForm mode="add" ... />` (ligne ~632), ajouter
   `defaultCategory={activeCategory}`.
3. Dans `EntryForm`, déstructurer `defaultCategory` depuis `props` (uniquement
   disponible en mode "add"), et remplacer `category: "want" as EntryCategory`
   (ligne ~925) par `category: (mode === "add" ? props.defaultCategory : "want") as EntryCategory`,
   ou plus simple : passer `defaultCategory` en paramètre de la fonction `useState`
   initializer, qui a déjà accès à `mode`/`props`.

**Vérification** : ouvrir Mon espace, aller sur l'onglet "Je peux donner", cliquer
"+ Ajouter un échange" : le sélecteur de catégorie dans la modale doit déjà être
sur "Je peux donner" (pas "Je recherche").

---

## Item 2 : Nouveau champ "Échanger avec" (partenaire d'échange)

**Décision actée avec Steven** (déjà tranchée, ne pas re-demander) : NOUVEAU champ,
distinct du champ "Dresseur" existant (qui reste inchangé, admin-only, assigne la
PROPRIÉTÉ de l'entrée). Le nouveau champ note avec qui l'échange miroir/don est en
cours ou conclu. Visible par tout le monde (pas juste l'admin). Uniquement pour les
catégories `mirror` et `give` (pas `want`, qui est une recherche sans partenaire
encore identifié).

**Schéma** :
1. `prisma/schema.prisma` : ajouter `tradePartnerName String?` sur `PokemonEntry`.
2. `npx prisma migrate dev --name add_trade_partner_name --create-only`, vérifier
   le SQL généré (doit être un simple `ADD COLUMN ... TEXT` nullable), puis
   `npx prisma migrate deploy` (la config `.env.local` pointe déjà vers Supabase
   prod, même méthode que les migrations précédentes de ce repo).
3. `npx prisma generate`.

**Types** : `lib/types.ts`, ajouter `tradePartnerName?: string | null;` sur
`PokemonEntry`.

**API** : `app/api/entries/route.ts` (POST) et `app/api/entries/[id]/route.ts`
(PATCH), ajouter `tradePartnerName` au passthrough du body vers Prisma (même
schéma que `notes` déjà présent, aucune validation stricte nécessaire, juste un
`.trim()` optionnel et `|| null` si vide).

**UI** (`components/AdminPanel.tsx`, dans `EntryForm`) :
- Nouveau state `tradePartnerName` dans `form` (initialisé depuis
  `entry.tradePartnerName ?? ""` en edit, `""` en add).
- Nouveau champ, visible uniquement si `form.category === "mirror" || form.category === "give"` :
  texte libre + autocomplete sur `trainers` (liste déjà chargée, prop `trainers`
  déjà passée à `EntryForm`). Réutiliser le pattern déjà écrit dans
  `app/pas-encore-sortis/page.tsx` (le champ "Ajouter un Pokémon manquant" : state
  `query`, filtrage `trainers.filter(t => t.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)`,
  dropdown de suggestions cliquables) plutôt que `SuggestionDropdown` existant (qui
  est typé spécifiquement pour `PokeOption`, pas pour des noms de dresseur).
- **Accepter la casse et le texte libre** : ne PAS forcer `.toLowerCase()` sur la
  valeur stockée (contrairement à l'ancien `TagInput` qui lowercasait). Stocker
  exactement ce que l'utilisateur tape ou sélectionne, pour qu'un futur compte
  créé avec ce nom exact (voir `app/api/auth/signup/route.ts`, le matching est
  déjà case-insensitive côté SQL donc la casse stockée ici n'affecte pas un futur
  rattachement, elle sert juste à un affichage fidèle).
- Placer ce champ juste après le champ "En échange de" (ligne ~1258, zone
  `showAdvanced`), ou dans la zone toujours visible si Steven le préfère plus
  proéminent, au choix, pas bloquant.
- Affichage optionnel (nice-to-have, pas bloquant) : montrer `tradePartnerName`
  sur `PokemonCard.tsx`, par exemple une petite ligne sous le nom dans la modale
  détail, seulement si non vide.

**Vérification** : créer une entrée "give", taper un nom qui n'existe pas encore
comme dresseur : doit être accepté sans erreur. Taper un nom qui matche un
dresseur existant : doit apparaître en suggestion cliquable.

---

## Item 3 : Priorité avant numéro, mais seulement pour "Je recherche"

**Contexte** : un tri précédent (commit `f7ae7c6`) a volontairement retiré la
priorité du tri pour TOUTES les catégories, sur demande explicite de Steven à
l'époque ("Il faut que quelque soit la vue de pokémons, ça soit trié par numéro,
c'est tout c'est simple"). Steven demande maintenant de réintroduire la priorité,
mais seulement pour "Je recherche" (catégorie `want`), où le champ priorité (1-10)
a un sens (le formulaire ne montre le champ priorité que si
`form.category === "want"`, ligne ~1310 de `components/AdminPanel.tsx`).

**Fix** (deux fichiers, même changement) :

`components/AdminPanel.tsx`, fonction `sortEntries` (ligne ~272) :
```ts
const sortEntries = (list: PokemonEntry[]) =>
  [...list].sort((a, b) => {
    const pa = a.category === "want" ? (a.priority ?? 9999) : 9999;
    const pb = b.category === "want" ? (b.priority ?? 9999) : 9999;
    if (pa !== pb) return pa - pb;
    return a.pokemonId - b.pokemonId;
  });
```

`app/dresseurs/[id]/DresseurPageClient.tsx`, fonction `sortEntries` (ligne ~14) :
```ts
function sortEntries(entries: PokemonEntry[]): PokemonEntry[] {
  return [...entries].sort((a, b) => {
    const pa = a.category === "want" ? (a.priority ?? 9999) : 9999;
    const pb = b.category === "want" ? (b.priority ?? 9999) : 9999;
    if (pa !== pb) return pa - pb;
    return a.pokemonId - b.pokemonId;
  });
}
```

**Vérification** : sur l'onglet "Je recherche" d'un dresseur ayant des priorités
assignées (Vorthil en a, ex : Chelours cape TS = priorité 1), vérifier que les
entrées avec priorité passent en premier, triées par priorité croissante, puis le
reste par numéro de Pokédex. Sur "Miroir"/"Donne", le tri doit rester purement
numérique (aucune entrée n'a de priorité dans ces catégories de toute façon, donc
le changement est invisible là mais correct).

---

## Item 4 : Sprite animé par défaut partout (Gen V, Showdown pour Gigamax)

### 4a. Réordonner la chaîne de secours dans `components/PokemonSprite.tsx`

**Problème actuel** : `buildUrls()` met l'icône GO officielle (statique) EN
PREMIER quand elle existe (`data/go-icons.json`), avant même de tenter le sprite
animé Gen V. Résultat : la quasi-totalité des Pokémon affichent un sprite statique
par défaut, l'animé n'est utilisé qu'en dernier recours (uniquement pour les ~66
espèces absentes de GO).

**Fix** : dans `buildUrls`, réordonner pour que les tentatives animées passent
AVANT l'icône GO (qui reste dans la chaîne, juste plus tard, comme un choix
esthétique alternatif plutôt que le choix par défaut) :

```ts
function buildUrls(pokemonId: number, shiny: boolean): string[] {
  const goIcon = getOfficialGoIcon(pokemonId, shiny);
  return shiny
    ? [
        `${BASE}/versions/generation-v/black-white/animated/shiny/${pokemonId}.gif`,
        `${BASE}/other/showdown/shiny/${pokemonId}.gif`,
        ...(goIcon ? [goIcon] : []),
        `${BASE}/shiny/${pokemonId}.png`,
        `${BASE}/${pokemonId}.png`,
        `${BASE}/other/official-artwork/shiny/${pokemonId}.png`,
        `${BASE}/other/official-artwork/${pokemonId}.png`,
      ]
    : [
        `${BASE}/versions/generation-v/black-white/animated/${pokemonId}.gif`,
        `${BASE}/other/showdown/${pokemonId}.gif`,
        ...(goIcon ? [goIcon] : []),
        `${BASE}/${pokemonId}.png`,
        `${BASE}/other/official-artwork/${pokemonId}.png`,
      ];
}
```

`customSpriteUrl` (choix explicite de l'utilisateur via le sélecteur de sprite)
reste TOUJOURS prioritaire sur tout ça, mécanisme `useCustom` déjà en place,
inchangé.

### 4b. Sprite animé pour les formes Gigamax (Showdown), avec repli statique

**Recherche déjà faite** (ne pas re-vérifier) : PokeAPI/sprites (le mirror GitHub
utilisé partout ailleurs dans ce projet) n'a AUCUN sprite Gigamax, animé ou non.
Le vrai sprite Gigamax animé vient d'un domaine différent :
`https://play.pokemonshowdown.com/sprites/ani/{slug}-gmax.gif` (normal) et
`https://play.pokemonshowdown.com/sprites/ani-shiny/{slug}-gmax.gif` (shiny), où
`{slug}` est le nom anglais du Pokémon tel que dans `data/pokemon.json` (champ
`name`, ex : `"charizard"`, `"toxtricity-amped"`).

Couverture vérifiée par requêtes HEAD réelles (25 juillet 2026) : environ 13 des
17 espèces Gigamax de `data/gigantamax-icons.json` ont un sprite animé Showdown à
cette URL. Notables : `venusaur` et `blastoise` répondent 404 sur le slug complet
(`venusaur-gmax`, `blastoise-gmax`). **Rillaboom et cinderace n'ont aucun sprite
Showdown ANIMÉ du tout** (juste un statique sous `gen5/{slug}-gmax.png`, pas
utilisable ici). `toxtricity-amped-gmax` 404 mais `toxtricity-gmax` (sans le
suffixe de forme) fonctionne, d'où la nécessité d'essayer aussi le slug de base
(avant le premier tiret) en repli.

**Fix** : ajouter deux nouvelles props à `PokemonSprite` et les intégrer dans la
chaîne (au lieu du mécanisme actuel où `PokemonCard.tsx` court-circuite tout via
`customSpriteUrl` pour les Gigamax, ce qui empêchait justement d'essayer l'animé).

Dans `components/PokemonSprite.tsx` :
```ts
interface PokemonSpriteProps {
  pokemonId: number;
  alt: string;
  size?: number;
  className?: string;
  shiny?: boolean;
  customSpriteUrl?: string | null;
  // Nouveau : espèces à forme Gigamax réelle dans GO uniquement (voir
  // data/gigantamax-icons.json et PokemonCard.tsx). gigantamaxSlug = nom anglais
  // (data/pokemon.json) pour construire l'URL Showdown ; gigantamaxIconUrl =
  // icône Gigamax statique officielle déjà résolue (repli si Showdown n'a pas
  // d'animé pour cette espèce).
  gigantamaxSlug?: string | null;
  gigantamaxIconUrl?: string | null;
}
```

Modifier `buildUrls` pour accepter ces deux paramètres en plus, et préfixer la
chaîne construite en 4a avec les tentatives Gigamax quand `gigantamaxSlug` est
fourni :
```ts
function buildUrls(
  pokemonId: number,
  shiny: boolean,
  gigantamaxSlug?: string | null,
  gigantamaxIconUrl?: string | null
): string[] {
  const SHOWDOWN_BASE = "https://play.pokemonshowdown.com/sprites";
  const baseSlug = gigantamaxSlug?.split("-")[0] ?? null;
  const gmaxUrls = gigantamaxSlug
    ? [
        `${SHOWDOWN_BASE}/${shiny ? "ani-shiny" : "ani"}/${gigantamaxSlug}-gmax.gif`,
        ...(baseSlug && baseSlug !== gigantamaxSlug
          ? [`${SHOWDOWN_BASE}/${shiny ? "ani-shiny" : "ani"}/${baseSlug}-gmax.gif`]
          : []),
        ...(gigantamaxIconUrl ? [gigantamaxIconUrl] : []),
      ]
    : [];

  const goIcon = getOfficialGoIcon(pokemonId, shiny);
  const pokeApiChain = /* le contenu exact du bloc 4a ci-dessus */;

  return [...gmaxUrls, ...pokeApiChain];
}
```
Mettre à jour l'appel `useMemo(() => buildUrls(pokemonId, shiny), [pokemonId, shiny])`
en `useMemo(() => buildUrls(pokemonId, shiny, gigantamaxSlug, gigantamaxIconUrl), [pokemonId, shiny, gigantamaxSlug, gigantamaxIconUrl])`,
et déstructurer les deux nouvelles props dans la signature du composant.

Dans `components/PokemonCard.tsx` :
- Importer `pokemonList` depuis `@/data/pokemon.json` et construire
  `const ENGLISH_NAME_BY_ID = new Map(pokemonList.map((p) => [p.id, p.name]));`
  (au niveau module, comme `GIGANTAMAX_ICONS` déjà présent).
- Retirer la ligne `effectiveSpriteUrl` actuelle qui court-circuitait
  `customSpriteUrl` pour les Gigamax.
- Remplacer par :
  ```ts
  const gigantamaxSlug = isGigamax ? ENGLISH_NAME_BY_ID.get(entry.pokemonId) ?? null : null;
  const gigantamaxIconUrl = isGigamax ? getGigantamaxSpriteUrl(entry.pokemonId, isShiny) : null;
  ```
- Sur les deux appels `<PokemonSprite ...>` (ligne ~323 modale, ligne ~599 tuile),
  remplacer `customSpriteUrl={effectiveSpriteUrl}` par
  `customSpriteUrl={entry.customSpriteUrl} gigantamaxSlug={gigantamaxSlug} gigantamaxIconUrl={gigantamaxIconUrl}`.
  `customSpriteUrl` redevient le VRAI choix explicite de l'utilisateur
  uniquement (respecté en premier par `PokemonSprite` via `useCustom`, mécanisme
  déjà existant, inchangé), le Gigamax passe maintenant par la chaîne normale.

**Vérification** : recharger `/mon-espace`, catégorie "Je peux donner", chercher
"Dracaufeu Gigamax" (Charizard, devrait maintenant animer via Showdown) et
"Tortank Gigamax" (Blastoise, devrait rester sur l'icône statique officielle,
Showdown n'a pas d'animé pour cette espèce, normal, ne pas essayer de "corriger"
davantage).

### 4c. Migration des lignes existantes en base (déjà identifiées, ne pas re-scanner)

Sur 274 entrées de Vorthil, seulement 6 ont un `customSpriteUrl` statique. 4 sont
des costumes PokeMiners délibérés (aucun équivalent animé n'existe, **ne pas
toucher**) :
- Pikachu #25 (`pm25.fANNIVERSARY_2026.s.icon.png`)
- Hexadron costume train #870 (`pm870.fGOFEST_2025_TRAIN_CONDUCTOR.s.icon.png`)
- Chelours cape TS #760 (`pm760.fWILDAREA_2025.s.icon.png`)

Les 2-3 restantes sont concernées par 4b et peuvent être mises à jour directement
en base (script one-off, ou `prisma.pokemonEntry.update` ad hoc) une fois 4b
déployé :
- **"Angoliath Gigamax fond TS 2025"** (id `64d83ac1-5187-493d-ade2-d89a9f5b1d5b`,
  Grimmsnarl #861, shiny) : `customSpriteUrl` devient
  `https://play.pokemonshowdown.com/sprites/ani-shiny/grimmsnarl-gmax.gif`
  (déjà vérifié 200 OK).
- **"Tortank Gigamax"** (id `e7ede0dd-84d5-4c1f-8655-87fa001b81de`, Blastoise #9,
  non-shiny) : **ne pas changer**, Showdown n'a pas de sprite animé pour cette
  espèce (`blastoise-gmax` = 404 vérifié), garder l'icône statique actuelle.
- **"Miaouss de Galar"** (id `a6029cfe-e716-4c4d-8f0e-7f4bf067393f`, dex 52,
  shiny, `customSpriteUrl` actuel pointe vers l'id de forme PokeAPI `10161`, pas
  52) : tenter en HEAD `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/10161.gif`.
  Si 200, mettre à jour vers cette URL. Sinon laisser tel quel (pas
  d'équivalent animé pour cette forme régionale).

Après ce fix, tout NOUVEAU choix de sprite (customSpriteUrl null) profite déjà
automatiquement de l'ordre animé-par-défaut de 4a/4b sans migration nécessaire.
Cette étape 4c ne concerne que les 2-3 lignes déjà explicitement figées en base.

---

## Item 5 : Unifier le tutoiement sur la page d'accueil

**Fichier** : `app/page.tsx`. Deux formulations en "vous" à corriger (tout le
reste du site tutoie déjà) :

1. Ligne 18 (tableau `FEATURES`, 3e élément) :
   - `title: "Organisez vos échanges"` devient `title: "Organise tes échanges"`
   - `text: "Repérez une correspondance, contactez-vous en jeu, et marquez l'échange comme conclu une fois fait."`
     devient `text: "Repère une correspondance, contacte la personne en jeu, et marque l'échange comme conclu une fois fait."`
2. Ligne 62 (titre `<h1>`) : `"Organisez vos échanges chanceux"` devient
   `"Organise tes échanges chanceux"`.

Ne pas toucher la ligne 73-75 ("Chacun crée son propre compte..."), c'est déjà
à la 3e personne neutre, pas du vouvoiement.

**Vérification** : `grep -n "vous\|Vous\|votre\|Votre" app/page.tsx` ne doit plus
rien renvoyer.

---

## Item 6 : Champ "Code Ami"

**Schéma** :
1. `prisma/schema.prisma`, modèle `Trainer` : ajouter `friendCode String?`.
2. `npx prisma migrate dev --name add_trainer_friend_code --create-only`, vérifier
   le SQL (colonne nullable), `npx prisma migrate deploy`, `npx prisma generate`.

**Types** : `lib/types.ts`, `Trainer` interface : ajouter `friendCode?: string | null;`.

**API** :
- `app/api/auth/signup/route.ts` : accepter `friendCode` dans le body (optionnel,
  pas dans la validation `if (!email || ...)` obligatoire), `.trim() || null`,
  l'inclure dans les deux `data: {...}` (le `tx.trainer.update` du rattachement ET
  le `tx.trainer.create`).
- `app/api/trainers/me/route.ts` (PATCH) : même pattern que `team`/`level` déjà
  présent : `const { team, level, friendCode } = await request.json();` puis
  `...(friendCode !== undefined && { friendCode: friendCode?.trim() || null })`
  dans le `data`.

**UI inscription** (`components/AuthForm.tsx`) : dans le formulaire signup (après
le champ NIVEAU, ligne ~218+), ajouter un champ optionnel :
```tsx
<div>
  <label style={labelStyle}>CODE AMI (optionnel)</label>
  <input
    type="text"
    value={friendCode}
    onChange={(e) => setFriendCode(e.target.value)}
    className="glass-input"
    placeholder="1234 5678 9012"
  />
</div>
```
(nouveau state `const [friendCode, setFriendCode] = useState("");`, inclus dans
le body de `handleSignup`).

**UI paramètres du compte** (`components/AdminPanel.tsx`, `MyAccountPanel`,
ligne ~672) : même pattern que `team`/`level` déjà en place. Nouveau state
`friendCode`, initialisé depuis `trainer?.friendCode ?? ""`, synchronisé dans le
`useEffect` existant, inclus dans le body du `fetch("/api/trainers/me", { method: "PATCH", ... })`.

**Affichage public** (`app/dresseurs/[id]/DresseurPageClient.tsx`, dans le
`<header>`, juste après le bloc `{trainer?.team && (...)}` ligne ~121) :
```tsx
{trainer?.friendCode && (
  <button
    onClick={async () => {
      await navigator.clipboard.writeText(trainer.friendCode!);
      toast.success("Code ami copié !");
    }}
    className="btn-secondary"
    style={{ fontSize: "0.75rem", padding: "4px 10px", marginTop: 6 }}
    title="Copier le code ami"
  >
    Code ami : {trainer.friendCode}
  </button>
)}
```
(réutilise le pattern déjà en place pour le bouton "Partager", `toast` déjà
importé dans ce fichier).

**Vérification** : créer un compte avec un code ami, vérifier qu'il apparaît sur
`/dresseurs/[id]` avec un bouton copiable, et qu'il est modifiable depuis "Mon
compte".

---

## Annexe : constats mobile rapides (pas demandés explicitement cette fois, à faire seulement si le temps/budget le permet après les 6 items ci-dessus)

Audit rapide fait le 25 juillet 2026, pas un audit complet :

1. **`components/SiteFooter.tsx`** : le footer est en `position: fixed` avec
   `flex-wrap`, mais sa hauteur n'est pas contrainte. Sur un écran très étroit
   (~375px), "Discord Pokémon GO Strasbourg" + "Fait par Vorthil" peuvent passer
   sur 2 lignes, ce qui dépasserait l'espace réservé par `--footer-height: 48px`
   (`app/globals.css`) et chevaucherait le contenu de la page. Fix possible :
   raccourcir le libellé sur mobile (`hidden sm:inline` sur une partie du texte,
   ou juste "Discord" à la place du nom complet).
2. **`components/SiteNav.tsx`** : les 5 liens et le logo sont en `flex-wrap` sans
   menu mobile dédié, fonctionnel mais peut pousser la barre sur 2-3 lignes sur
   petit écran. Un menu hamburger en dessous de `sm:` serait plus propre mais
   c'est un chantier à part entière, pas un simple ajustement.
3. Les petits boutons ronds (sélection multiple 26px, exclusion "x" 18px) sont
   sous la taille de cible tactile recommandée (~44px). Les agrandir légèrement
   améliorerait le tap mobile, mais c'est cosmétique/mineur comparé aux 6 items
   ci-dessus, à ne traiter qu'en tout dernier si le temps le permet.

Ne pas entreprendre une refonte mobile complète sans repasser par Steven, ces 3
points sont des observations, pas des instructions à exécuter automatiquement.
