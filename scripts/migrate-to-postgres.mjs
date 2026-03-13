/**
 * migrate-to-postgres.mjs
 * Migre les données du SQLite local vers Vercel Postgres.
 *
 * Pré-requis :
 *   1. Dans Vercel dashboard → Storage → Create Database → Postgres
 *   2. Connect au projet → Vercel injecte automatiquement les env vars
 *   3. Dans ton terminal : vercel env pull .env.local
 *      (ça écrit POSTGRES_PRISMA_URL et POSTGRES_URL_NON_POOLING dans .env.local)
 *   4. Lancer : npm run migrate:prod
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Load .env.local
function loadEnv(file) {
  const p = path.join(ROOT, file);
  if (!existsSync(p)) return {};
  const vars = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

async function main() {
  console.log("=== Migration SQLite → Vercel Postgres ===\n");

  // Load env vars from .env.local (pulled from Vercel)
  const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };
  const pgUrl = env.POSTGRES_PRISMA_URL;
  const pgDirect = env.POSTGRES_URL_NON_POOLING;

  if (!pgUrl) {
    console.error(`❌ POSTGRES_PRISMA_URL manquant.

Étapes :
  1. Vercel dashboard → ton projet → Storage → Create Database → Postgres (Neon)
  2. Connect to project
  3. Dans ton terminal : vercel env pull .env.local
  4. Relancer : npm run migrate:prod
`);
    process.exit(1);
  }

  // Connect to Postgres via Prisma
  process.env.POSTGRES_PRISMA_URL = pgUrl;
  process.env.POSTGRES_URL_NON_POOLING = pgDirect ?? pgUrl;

  const pg = new PrismaClient();

  console.log("[1/3] Connexion à Postgres...");
  await pg.$connect();
  console.log("✓ Connecté\n");

  // Connect to local SQLite
  const localPath = path.join(ROOT, "dev.db").replace(/\\/g, "/");
  const sqlite = createClient({ url: `file:${localPath}` });

  // [2/3] Trainers
  console.log("[2/3] Migration des dresseurs...");
  const trainers = (await sqlite.execute("SELECT * FROM Trainer")).rows;
  console.log(`  · ${trainers.length} dresseurs`);
  for (const r of trainers) {
    await pg.trainer.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        name: r.name,
        createdAt: new Date(r.createdAt),
      },
    });
  }
  console.log("✓ Dresseurs migrés\n");

  // [3/3] Entries
  console.log("[3/3] Migration des entrées...");
  const entries = (await sqlite.execute(
    "SELECT * FROM PokemonEntry WHERE completed = 0"
  )).rows;
  console.log(`  · ${entries.length} entrées actives`);
  for (const r of entries) {
    await pg.pokemonEntry.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        pokemonName: r.pokemonName,
        pokemonId: Number(r.pokemonId),
        category: r.category,
        trainerId: r.trainerId ?? null,
        tradeForPokemonName: r.tradeForPokemonName ?? null,
        tradeForPokemonId: r.tradeForPokemonId ? Number(r.tradeForPokemonId) : null,
        notes: r.notes ?? null,
        shiny: Boolean(r.shiny),
        customSpriteUrl: r.customSpriteUrl ?? null,
        priority: r.priority ? Number(r.priority) : null,
        tags: r.tags ?? null,
        completed: Boolean(r.completed),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt ?? r.createdAt),
      },
    });
  }
  console.log("✓ Entrées migrées\n");

  await pg.$disconnect();

  console.log(`✅ Migration terminée !
  ${trainers.length} dresseurs · ${entries.length} entrées

Le site Vercel utilisera automatiquement cette DB en production.
`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
