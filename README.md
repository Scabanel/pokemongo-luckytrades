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

## Sauvegarde

`/admin` propose un export JSON manuel (bouton "⬇ Export JSON") via
`app/api/export`. C'est actuellement le seul backup — pas d'automatisation.

## Structure

- `app/page.tsx` — catalogue public (3 onglets : miroir / recherche / donne)
- `app/admin/` — interface de gestion (auth par cookie JWT, voir `lib/auth.ts`)
- `components/AdminPanel.tsx` — CRUD des échanges et dresseurs
- `components/PokemonCard.tsx` — carte affichée sur le catalogue public
- `lib/types.ts` — types partagés (`Trainer`, `PokemonEntry`)
- `lib/categories.ts` — source unique couleur/icône/glow par catégorie
- `prisma/schema.prisma` — modèle de données (`Trainer`, `PokemonEntry`)
