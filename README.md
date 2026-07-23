# Lucky Trades — Pokémon GO

Catalogue public + admin pour organiser mes échanges chanceux dans Pokémon GO.
Les amis consultent `/` pour voir ce que je recherche / peux donner / propose
en miroir ; je gère la liste depuis `/admin`.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Prisma 7](https://www.prisma.io) + [Postgres](https://neon.tech) (Neon, provisionné via Vercel Postgres)
- Déployé sur [Vercel](https://vercel.com)

## Base de données — un seul chemin

**Le projet utilise Postgres (Neon) en local comme en production.** Le SQLite
et Turso qu'on voit encore mentionnés dans l'historique git ont été abandonnés
lors du passage à Vercel Postgres — s'il reste des scripts ou variables qui y
font référence quelque part, ils sont morts, à supprimer.

`lib/prisma.ts` lit `POSTGRES_PRISMA_URL` en priorité, avec repli sur
`DATABASE_URL`. Ce sont les variables que Vercel Postgres/Neon fournit
automatiquement.

### Setup local

```bash
npm install
vercel link          # une fois, pour lier ce dossier au projet Vercel
vercel env pull .env.local   # récupère les vraies variables Postgres/Neon
npm run dev
```

`.env` contient les identifiants admin (voir `.env.example`) — ils ne changent
pas entre environnements, contrairement aux variables Postgres qui vivent dans
`.env.local` (ignoré par git, généré par `vercel env pull`).

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
Les "fonds" promotionnels ponctuels (ex: variantes une seule ville/événement,
pas un vrai costume du jeu) ne sont pas dans ce dépôt — l'URL manuelle du
sélecteur de sprite reste la solution pour ces cas.

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
