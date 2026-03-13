/**
 * migrate-to-postgres.mjs
 * Migre les données du SQLite local vers Vercel Postgres.
 * Utilise pg directement (pas de Prisma) pour éviter les problèmes d'adapter.
 */

import { createClient } from "@libsql/client";
import pkg from "pg";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadEnv(file) {
  const p = path.join(ROOT, file);
  if (!existsSync(p)) return {};
  const vars = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)/);
    if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

async function main() {
  console.log("=== Migration SQLite → Vercel Postgres ===\n");

  const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };
  const pgUrl = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_PRISMA_URL || env.DATABASE_URL;

  if (!pgUrl) {
    console.error("❌ Aucune variable Postgres trouvée dans .env.local\nRelance: vercel env pull .env.local");
    process.exit(1);
  }

  // Connect to Postgres
  const pg = new Client({ connectionString: pgUrl });
  console.log("[1/3] Connexion à Postgres...");
  await pg.connect();
  console.log("✓ Connecté\n");

  // Connect to local SQLite
  const localPath = path.join(ROOT, "dev.db").replace(/\\/g, "/");
  const sqlite = createClient({ url: `file:${localPath}` });

  // [2/3] Trainers
  console.log("[2/3] Migration des dresseurs...");
  const trainers = (await sqlite.execute("SELECT * FROM Trainer")).rows;
  console.log(`  · ${trainers.length} dresseurs`);
  for (const r of trainers) {
    await pg.query(
      `INSERT INTO "Trainer" (id, name, "createdAt") VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, new Date(r.createdAt)]
    );
  }
  console.log("✓ Dresseurs migrés\n");

  // [3/3] Entries
  console.log("[3/3] Migration des entrées...");
  const entries = (await sqlite.execute("SELECT * FROM PokemonEntry WHERE completed = 0")).rows;
  console.log(`  · ${entries.length} entrées actives`);
  for (const r of entries) {
    await pg.query(
      `INSERT INTO "PokemonEntry"
        (id, "pokemonName", "pokemonId", category, "trainerId", "tradeForPokemonName",
         "tradeForPokemonId", notes, shiny, "customSpriteUrl", priority, tags,
         completed, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.pokemonName, Number(r.pokemonId), r.category,
        r.trainerId ?? null, r.tradeForPokemonName ?? null,
        r.tradeForPokemonId ? Number(r.tradeForPokemonId) : null,
        r.notes ?? null, Boolean(r.shiny), r.customSpriteUrl ?? null,
        r.priority ? Number(r.priority) : null, r.tags ?? null,
        Boolean(r.completed),
        new Date(r.createdAt), new Date(r.updatedAt ?? r.createdAt),
      ]
    );
  }
  console.log("✓ Entrées migrées\n");

  await pg.end();

  console.log(`✅ Migration terminée !
  ${trainers.length} dresseurs · ${entries.length} entrées
`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
