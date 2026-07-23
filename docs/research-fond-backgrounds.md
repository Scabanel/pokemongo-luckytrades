# Recherche : images de fond ("AR background") pour les Pokémon événementiels

Contexte : certaines entrées de la base (`Zamazenta fond Paris`, `Zacian fond bleu`,
`Regice fond ancien`, `Mordudor fond 9 ans`...) font référence à un **fond**
promotionnel spécifique à un événement (GO Fest ville, anniversaire...),
distinct du sprite/costume du Pokémon lui-même. Objectif : trouver une source
fiable pour récupérer ces images de fond et les afficher en arrière-plan de la
tuile sur le site.

## Ce qui a été vérifié et écarté

Recherche dans **PokeMiners/pogo_assets** (la source utilisée pour
`data/costumes.json` / `data/go-icons.json`) :

- `Images/Backgrounds/`, `Images/Background Images/` → fonds d'interface
  génériques (écrans de quête, raids...), rien de spécifique à un Pokémon/événement.
- `Images/LocationCards/`, `Images/Post Cards/`, `Images/Parties/`,
  `Images/GO Fest 2020/2021/2022/` → logos, bannières, tutoriels. Rien.
- `Images/Catch Card/` → fonds génériques **par type** (Feu, Eau, Dragon...),
  pas de fond par ville/événement.
- Recherche par mot-clé (`gf25`, `paris`, `instinct`, `mystic`, `valor`,
  `gofest2026global`) → seules quelques correspondances non pertinentes
  (vêtements de dresseur, sols de gymnase, cartes de lieu génériques).

**Conclusion** : ces fonds ne sont pas dans le dossier `Images/` classique de
PokeMiners. Ils existent potentiellement dans `3D Assets/Addressable
Assets/_raw/*.bundle` (bundles Unity compilés, ex: `pm131.cspring_2023_mystic_...bundle`)
mais l'extraction demanderait un outil de désassemblage Unity (AssetStudio/UnityPy)
— hors scope raisonnable pour cette fonctionnalité.

## Piste trouvée : pokexperience.com/trade/

Le générateur de liste d'échange de ce site propose un filtre **"Background"**
avec des variantes exactement au bon niveau de détail (ex: "Hero Zamazenta
(Gf25 Paris background)", "Bulbasaur (Instinct/Mystic/Valor background)").

Inspection du DOM d'une tuile sélectionnée (Zamazenta, fond Paris) :

```html
<button title="Hero Zamazenta (Gf25 Paris background)" ...>
  <span class="... bg-cover bg-center"
        style="background-image: url('https://old.pokexperience.com/pokemon-variants/backgrounds/gf25_paris.webp')">
  </span>
  <img alt="Zamazenta" src="https://old.pokexperience.com/pokemon-variants/pokemons/pm889.fHERO.icon.png">
</button>
```

Constats :
- Le site sépare bien **deux calques** : le sprite Pokémon (même convention de
  nommage que PokeMiners : `pm889.fHERO.icon.png`) et un fond séparé
  (`pokemon-variants/backgrounds/{code}.webp`), superposés en CSS.
- Codes de fond observés : `gf25_paris`, probablement `gf25_jersey`,
  `gf25_osaka`, `gf25_shield`, `gofest2026global`, `sb_gofest2026_global`,
  `instinct`, `mystic`, `valor`, `25_osaka_expo_kanto`, `gfsr26_minato`
  (déduits des libellés de tuiles vues, non tous vérifiés un par un).
- Ces images sont hébergées sur `old.pokexperience.com` — un sous-domaine
  d'un site tiers, pas une source officielle Niantic ni un dépôt communautaire
  ouvert comme PokeMiners.

## Limites / points d'attention

1. **Pas de permission de hotlinking** : `old.pokexperience.com` est
   l'infrastructure d'un tiers. Hotlinker ces URLs en production n'est ni
   garanti stable (peuvent changer/disparaître sans préavis) ni forcément
   souhaitable sans autorisation — c'est différent de PokeMiners qui est un
   dépôt GitHub public conçu pour être réutilisé.
2. **Catalogue non documenté publiquement** : pas d'API ni de liste
   exhaustive des codes de fond disponibles — il faudrait inspecter le site
   variante par variante pour construire un catalogue complet (comme fait
   pour Zamazenta ci-dessus), ce qui n'est pas automatisable proprement sans
   accord du site.
3. Le nom de domaine `old.pokexperience.com` (préfixe "old") suggère une
   ancienne version d'infra qui pourrait être dépréciée à tout moment.

## Mise à jour : source trouvée dans PokeMiners (pas besoin de tiers)

En remontant la chaîne (pokexperience.com charge `pokemon-variants/backgrounds.json`
qui liste ~150+ codes de fond très précis — trop précis pour être saisis à la
main) → recherche de l'organisation GitHub PokeMiners → un 2e repo,
**`PokeMiners/game_masters`**, contient le GAME_MASTER du jeu (config brute
Niantic, 18k+ entrées). Une entrée type :

```json
{
  "templateId": "LC_SPECIALBACKGROUND_2025_9THANNIVERSARY",
  "data": {
    "locationCardSettings": {
      "locationCard": "LC_SPECIALBACKGROUND_2025_9THANNIVERSARY",
      "imageUrl": "sb_9thAnniversary",
      "cardType": "SPECIAL_BACKGROUND"
    }
  }
}
```

`imageUrl: "sb_9thAnniversary"` est une clé, pas une URL — mais elle
correspond exactement à un fichier déjà présent dans **le même dépôt
pogo_assets qu'on utilise pour les sprites** : `Images/LocationCards/sb_9thAnniversary.png`.
Je l'avais écarté trop vite plus haut en ne regardant que les premiers
fichiers (logos d'équipes sportives) sans lister tout le dossier.

Correspondances confirmées avec les entrées existantes de la base :

| Entrée base                          | Fichier PokeMiners                              |
|---------------------------------------|--------------------------------------------------|
| Mordudor fond 9 ans                   | `Images/LocationCards/sb_9thAnniversary.png`     |
| Zacian fond bleu                      | `Images/LocationCards/sb_TeamLeader_blue.png`    |
| Zamazenta fond rouge                  | `Images/LocationCards/sb_TeamLeader_red.png`     |
| Zamazenta fond Paris                  | `Images/LocationCards/lc_GoFest2025_paris.png`   |
| Lézargus Gigamax fond Paris            | `Images/LocationCards/lc_GoFest2025_paris.png`   |

**Conclusion révisée** : pas besoin de dépendre de pokexperience.com. Le
dossier `Images/LocationCards/` de PokeMiners/pogo_assets (232 fichiers,
préfixes `sb_` = "special background" et `lc_` = "location card") contient
la quasi-totalité des fonds événementiels utilisés dans la base, avec la
même fiabilité/pérennité que `data/costumes.json` déjà en place.

## Pokexperience filtre-t-il les fonds par Pokémon ? (vérifié)

Inspection de `pokemon-variants/catalog.json` (le 3e fichier chargé par le
site) : structure `{ v, legend, byDex }`.

- `byDex["889"]` (Zamazenta) = `["", ".fCROWNED_SHIELD", ".fDYNAMAX", ".fHERO"]`
  → uniquement les **formes/costumes**, aucune info de fond associée.
- `legend` = liste de ~100 dex IDs, qui correspond exactement aux
  Légendaires/Ultra-Chimères (144-151, 243-251, 377-386, 480-494, 638-649,
  716-721, 772-807, 888-898, 905, 1001-1017, 1024-1025).

Aucun 4e fichier réseau chargé. Conclusion : le site ne semble **pas**
disposer d'un mapping fond↔Pokémon validé historiquement — il applique très
probablement une règle grossière côté client (Pokémon légendaire → propose
les fonds "GO Fest ville" ; Pokémon non-légendaire → propose seulement les
fonds génériques comme les couleurs d'équipe/saison). C'est une heuristique
de catégorie, pas une vérification fine "ce Pokémon a eu ce fond à cet
événement précis". Le problème que soulève Steven (afficher un fond qui n'a
jamais existé pour ce Pokémon) n'est donc probablement pas mieux résolu par
ce site non plus — juste moins visible car la liste proposée est plus
courte.

## Recherche d'un mapping Pokémon↔fond dans game_masters (conclusion)

Recherche exhaustive de toutes les entrées `*ZAMAZENTA*` dans le GAME_MASTER
(`EXTENDED_V0889_POKEMON_ZAMAZENTA`, `FORMS_V0889_POKEMON_ZAMAZENTA`,
`SPAWN_V0889_...`, objets liés type avatar...) : aucune ne référence un
`SPECIALBACKGROUND`/`LC_...` quelconque. Les templates de fond
(`LC_SPECIALBACKGROUND_2025_9THANNIVERSARY` etc., voir plus haut) existent
en tant que définitions **indépendantes**, jamais rattachées à un Pokémon
précis dans les données que le client télécharge.

**Conclusion (raisonnablement définitive)** : cette association n'est très
probablement **pas une donnée statique minable**. Contrairement aux
sprites/costumes (assets embarqués dans l'app, décidés à la compilation),
le fond affiché à la capture d'un Pokémon spécial semble être une décision
prise **côté serveur par Niantic au moment de l'événement/de la capture**
(quelle recherche spéciale, quelle ville, quel jour) — donc absente de tout
fichier téléchargé par le client, et donc absente de PokeMiners (qui ne peut
extraire que ce que le client télécharge). C'est cohérent avec le fait que
pokexperience.com n'a lui-même qu'une heuristique grossière (légendaire ou
non) plutôt qu'un vrai mapping validé.

Sauf découverte d'une source externe qui aurait documenté ces associations
au cas par cas (ex: un wiki communautaire tenant à jour "quel Pokémon a eu
quel fond à quel GO Fest"), il n'existe pas de source de vérité automatisable
pour valider qu'une paire Pokémon+fond a réellement existé.

## Source de vérité trouvée : margxt.fr (liste communautaire tenue à jour)

https://www.margxt.fr/liste-des-fonds-speciaux-fonds-souvenirs-des-evenements-dans-pokemon-go/

Fan-site français, mis à jour très régulièrement (13/07/2026 au moment de la
recherche), qui tient un tableau chronologique **Événement → Fond → Pokémon
concernés**, remontant jusqu'à juillet 2024 (début des fonds souvenirs).
C'est la vraie source de vérité qui manquait : contrairement au GAME_MASTER
(qui ne contient que les définitions de fond, sans lien vers un Pokémon), ce
site documente au cas par cas quel Pokémon a reçu quel fond à quel événement,
apparemment tenu à jour manuellement par la communauté.

Confirmations concrètes trouvées :
- "9ème anniversaire de Pokémon GO (1er-6 juillet 2025) : Mordudor tenant une
  pièce du 9e anniversaire" → valide "Mordudor fond 9 ans".
- "Pokémon GO Fest Global (28-29 juin 2025) : Raids Zacian / Raids Zamazenta"
  → valide que Zacian et Zamazenta avaient bien un fond à cet événement
  (probablement les fonds couleur d'équipe "Team Leader Blue/Red").

**Point d'attention** : le menu du site distingue deux pages séparées —
"Fonds souvenirs" (celle-ci) et "Fonds spéciaux" — qui semblent être deux
catégories différentes. "Paris"/"Jersey"/"Osaka" (villes de GO Fest 2025)
n'apparaissent pas sur cette page ; ils sont probablement sur la page "Fonds
spéciaux" (pas encore consultée).

**Ce qui resterait à faire pour exploiter pleinement cette source** :
1. Consulter aussi la page "Fonds spéciaux" (menu du site) pour couvrir les
   fonds ville/GO Fest en plus des fonds souvenirs.
2. Extraire les images de fond associées à chaque ligne du tableau (non
   récupérées par la simple lecture de texte) et les relier aux fichiers
   PokeMiners déjà catalogués dans `data/backgrounds.json`.
3. Construire un mapping structuré {dexId/nom Pokémon → codes de fond
   valides} à partir de ce tableau — un vrai travail de parsing/curation,
   pas une extraction automatique triviale (le tableau mélange plusieurs
   formats de lignes selon les événements).

## Conclusion finale : mapping validé construit et livré

`scripts/generate-pokemon-backgrounds.mjs` scrape les deux pages margxt.fr,
extrait pour chaque ligne du tableau : l'événement, l'image (ou les images)
de fond, et les Pokémon associés (dexId extrait directement du nom de
fichier de leur icône, ex: `025-Pikachu.png` → dex 25 — pas de matching de
nom approximatif). Les images sont téléchargées et auto-hébergées dans
`public/event-backgrounds/` (ne dépend plus de margxt.fr en production).

Résultat : **189 Pokémon avec au moins un fond confirmé**, 201 images
uniques, écrit dans `data/pokemon-backgrounds.json`
(`{ [dexId]: [{label, url}] }`).

Le picker admin (`BackgroundPicker`) affiche désormais en priorité les
fonds confirmés pour le Pokémon sélectionné (badge "N confirmés"), avec une
bascule "voir tous les fonds" qui retombe sur le catalogue générique
(`data/backgrounds.json`, PokeMiners) pour les Pokémon sans fond confirmé
ou si l'utilisateur veut explorer au-delà.

Validé en conditions réelles : Zamazenta affiche exactement les 7 fonds
attendus (Voie des légendes ×2, GO Fest Global épée/bouclier, Paris,
Jersey City, Osaka), testé en ajoutant puis supprimant une entrée sur la
production.

**Limite résiduelle assumée** : quand plusieurs fonds ET plusieurs groupes
de Pokémon apparaissent dans une même ligne du tableau margxt sans
séparation claire (16 lignes sur 236, ex: "GO Fest Global 2024" avec 5
fonds et un seul bloc de texte), le script associe par prudence tous les
Pokémon de la ligne à tous les fonds de la ligne plutôt que de deviner un
appariement précis — légèrement trop permissif dans ces cas, jamais trop
restrictif.

`npm run gen:backgrounds` pour relancer (margxt.fr peut temporairement
rate-limiter après beaucoup de requêtes rapprochées — réessayer plus tard
si ça échoue).
