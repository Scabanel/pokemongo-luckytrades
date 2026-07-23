# Lucky Trades — Pokémon GO

Catalogue public + admin pour organiser mes échanges chanceux dans Pokémon GO.
Les amis consultent `/` pour voir ce que je recherche / peux donner / propose
en miroir ; je gère la liste depuis `/admin`.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Prisma 7](https://www.prisma.io) + [Postgres](https://supabase.com) (Supabase)
- Déployé sur [Vercel](https://vercel.com)

## Base de données — un seul chemin

**Le projet utilise Postgres (Supabase) en local comme en production.** Neon
(via l'intégration Vercel Postgres), SQLite et Turso qu'on voit encore
mentionnés dans l'historique git ont tous été abandonnés — s'il reste des
scripts ou variables qui y font référence quelque part, ils sont morts, à
supprimer.

`lib/prisma.ts` lit `POSTGRES_PRISMA_URL` en priorité, avec repli sur
`DATABASE_URL` — c'est la connexion **pooler transaction** (port 6543) de
Supabase, utilisée par l'app à l'exécution.

`prisma.config.ts` (utilisé uniquement par `prisma migrate`) utilise
`DIRECT_URL` en priorité. Attention : le vrai hostname "direct" de Supabase
(`db.[ref].supabase.co:5432`) résout en IPv6 uniquement sur le plan gratuit et
n'est pas joignable depuis beaucoup de réseaux IPv4 — `DIRECT_URL` doit donc
pointer vers le **pooler en mode session** (même hostname que le pooler
transaction, port 5432 au lieu de 6543), qui lui est joignable en IPv4.

### Setup local

```bash
npm install
npm run dev
```

Récupérer les variables `POSTGRES_PRISMA_URL`/`DIRECT_URL`/`NEXT_PUBLIC_SUPABASE_*`/
`SUPABASE_SERVICE_ROLE_KEY` depuis le dashboard Supabase (Project Settings →
Database / API) et les mettre dans `.env.local` (ignoré par git, voir
`.env.example` pour le format).

`.env` contient les identifiants admin historiques (voir `.env.example`) —
seront remplacés par Supabase Auth (voir plus bas une fois la migration auth
faite).

### Commandes utiles

```bash
npm run dev            # serveur de dev (localhost:3000)
npm run build           # build de prod (inclut `prisma generate`)
npm run db:migrate      # applique une migration Prisma en local
npm run db:generate     # régénère le client Prisma après un changement de schema.prisma
npm run seed            # (re)seed la base depuis prisma/seed.ts
npm run gen:pokemon     # régénère data/pokemon.json (liste FR/EN des Pokémon, voir plus bas)
npm run gen:costumes    # régénère data/costumes.json + data/go-icons.json (voir plus bas)
```

Les migrations Prisma (`prisma/migrations/`) sont la seule source de vérité
pour l'évolution du schéma — éviter de modifier la structure de la table
directement dans le dashboard Neon.

## Liste des Pokémon (autocomplete admin)

`data/pokemon.json` est une liste figée des 1025 Pokémon (nom EN + nom FR)
utilisée par l'autocomplete de `/admin`. Elle est générée une fois via
`npm run gen:pokemon` (appelle PokeAPI) et commitée — l'admin ne fait plus
d'appel réseau à PokeAPI au chargement. À relancer seulement si une nouvelle
génération de Pokémon sort.

## Sprites et costumes officiels Pokémon GO

Source : [PokeMiners/pogo_assets](https://github.com/PokeMiners/pogo_assets), qui
extrait les assets du jeu (maintenu activement par la communauté). Deux fichiers
générés par `npm run gen:costumes` :

- `data/go-icons.json` (léger, ~40 Ko) — l'icône officielle Pokémon GO de
  chaque Pokémon (normal + shiny), utilisée en priorité par
  `components/PokemonSprite.tsx` sur chaque carte (avec repli sur PokeAPI pour
  les Pokémon pas encore sortis dans GO).
- `data/costumes.json` (~700 Ko, admin uniquement) — tous les costumes
  historiques par Pokémon (Halloween, GO Fest, anniversaires...) avec libellé
  lisible, utilisé par le sélecteur de sprite dans `/admin`.
- `data/missing-in-go.json` (léger, noms FR déjà attachés) — Pokémon absents
  du jeu, sans version shiny, ou sans Gigamax (liste fixe des 32 espèces
  éligibles au Gigamax dans les jeux principaux, croisée avec les costumes
  effectivement présents). Alimente l'onglet public "🚧 Pas encore sortis".
  Le Dynamax n'a pas de liste d'espèces éligibles fixe dans les jeux
  principaux — pas de section "Dynamax manquant" pour cette raison.

À relancer périodiquement pour récupérer les nouveaux costumes ajoutés au jeu.

## Fonds d'événement (Pokémon posant devant un décor promotionnel)

Deux niveaux, générés séparément (voir `docs/research-fond-backgrounds.md`
pour le détail de la recherche qui a mené à ces deux sources) :

- `npm run gen:costumes` génère aussi `data/backgrounds.json` (~230 fonds,
  génériques, depuis `Images/LocationCards` de PokeMiners) — n'importe quel
  fond sur n'importe quel Pokémon, sans garantie que la paire ait existé.
- `npm run gen:backgrounds` génère `data/pokemon-backgrounds.json` +
  `public/event-backgrounds/*.webp` — fonds **confirmés** par Pokémon,
  scrapés depuis margxt.fr (un fan-site qui documente événement par
  événement quel Pokémon a reçu quel fond ; cette info n'existe dans aucune
  donnée jeu extractible, voir le doc de recherche). Images auto-hébergées,
  ne dépend plus du site source en production.

Le sélecteur de fond dans `/admin` affiche en priorité les fonds confirmés
pour le Pokémon sélectionné, avec un bouton pour basculer sur le catalogue
générique complet si besoin.

## Sauvegarde

Deux mécanismes complémentaires :

- **Export manuel** — bouton "⬇ Export JSON" dans `/admin` (`app/api/export`),
  à tout moment.
- **Backup automatique quotidien** — `app/api/cron/backup`, déclenché par un
  Vercel Cron (`vercel.json`), commit un snapshot dans `backups/latest.json`
  sur GitHub. L'historique git de ce fichier sert de journal des sauvegardes
  successives (pas de service de stockage supplémentaire à payer/gérer).

  Setup à faire une fois dans le dashboard Vercel (Settings → Environment
  Variables) :
  1. `CRON_SECRET` — une chaîne aléatoire (ex: générée avec
     `openssl rand -hex 32`). Vercel l'envoie automatiquement en
     `Authorization: Bearer <CRON_SECRET>` sur les requêtes cron dès qu'elle
     est définie — aucune autre config nécessaire côté Vercel.
  2. `GITHUB_TOKEN` — un Personal Access Token GitHub *fine-grained*
     (github.com → Settings → Developer settings → Personal access tokens),
     limité à ce seul repo, avec la permission **Contents: Read and write**.
  3. `GITHUB_BACKUP_REPO` — `owner/repo` (ex: `Scabanel/pokemongo-luckytrades`).

  Sans ces 3 variables, la route répond 401/500 sans rien casser — le cron
  échoue silencieusement plutôt que de planter le site.

## Structure

- `app/page.tsx` — catalogue public (3 onglets : miroir / recherche / donne)
- `app/admin/` — interface de gestion (auth par cookie JWT, voir `lib/auth.ts`)
- `components/AdminPanel.tsx` — CRUD des échanges et dresseurs
- `components/PokemonCard.tsx` — carte affichée sur le catalogue public
- `lib/types.ts` — types partagés (`Trainer`, `PokemonEntry`)
- `lib/categories.ts` — source unique couleur/icône/glow par catégorie
- `prisma/schema.prisma` — modèle de données (`Trainer`, `PokemonEntry`)
