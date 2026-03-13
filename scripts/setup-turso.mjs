/**
 * setup-turso.mjs
 * Migration des données locales → Turso + config Vercel automatique
 *
 * Pré-requis (30 secondes sur app.turso.io) :
 *   1. Créer un compte sur https://app.turso.io
 *   2. Créer une DB nommée "luckytrades"
 *   3. Dans la DB → "Generate Token" → copier le token
 *   4. Copier l'URL de connexion (ex: libsql://luckytrades-xxx.turso.io)
 *   5. Ajouter dans .env :
 *        DATABASE_URL=libsql://luckytrades-xxx.turso.io
 *        TURSO_AUTH_TOKEN=eyJ...
 *   6. Lancer : npm run setup:prod
 */

import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ─── Load .env manually ───────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const vars = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

// ─── Push schema ──────────────────────────────────────────────────────────────
async function pushSchema(client) {
  console.log("[2/4] Application du schéma...");
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "Trainer" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "PokemonEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "pokemonName" TEXT NOT NULL,
      "pokemonId" INTEGER NOT NULL,
      "category" TEXT NOT NULL,
      "trainerId" TEXT,
      "tradeForPokemonName" TEXT,
      "tradeForPokemonId" INTEGER,
      "notes" TEXT,
      "shiny" BOOLEAN NOT NULL DEFAULT false,
      "customSpriteUrl" TEXT,
      "priority" INTEGER,
      "tags" TEXT,
      "completed" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PokemonEntry_trainerId_fkey"
        FOREIGN KEY ("trainerId") REFERENCES "Trainer" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  console.log("✓ Schéma appliqué");
}

// ─── Migrate data ─────────────────────────────────────────────────────────────
async function migrateData(remote) {
  console.log("[3/4] Migration des données locales → Turso...");

  const localPath = path.join(ROOT, "dev.db").replace(/\\/g, "/");
  const local = createClient({ url: `file:${localPath}` });

  const trainers = (await local.execute("SELECT * FROM Trainer")).rows;
  console.log(`  · ${trainers.length} dresseurs`);
  for (const r of trainers) {
    await remote.execute({
      sql: `INSERT OR IGNORE INTO Trainer (id, name, createdAt) VALUES (?,?,?)`,
      args: [r.id, r.name, r.createdAt],
    });
  }

  const entries = (await local.execute(
    "SELECT * FROM PokemonEntry WHERE completed = 0"
  )).rows;
  console.log(`  · ${entries.length} entrées actives`);
  for (const r of entries) {
    await remote.execute({
      sql: `INSERT OR IGNORE INTO PokemonEntry
        (id, pokemonName, pokemonId, category, trainerId, tradeForPokemonName,
         tradeForPokemonId, notes, shiny, customSpriteUrl, priority, tags,
         completed, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        r.id, r.pokemonName, r.pokemonId, r.category,
        r.trainerId ?? null, r.tradeForPokemonName ?? null,
        r.tradeForPokemonId ?? null, r.notes ?? null,
        r.shiny, r.customSpriteUrl ?? null,
        r.priority ?? null, r.tags ?? null,
        r.completed, r.createdAt, r.updatedAt ?? r.createdAt,
      ],
    });
  }
  console.log("✓ Migration terminée");
}

// ─── Configure Vercel ─────────────────────────────────────────────────────────
async function configureVercel(dbUrl, authToken) {
  console.log("[4/4] Configuration des variables Vercel...");

  const vercelVars = { DATABASE_URL: dbUrl, TURSO_AUTH_TOKEN: authToken };

  // Check if vercel is linked
  try {
    execSync("vercel whoami", { cwd: ROOT, stdio: "pipe" });
  } catch {
    console.log("  ⚠ Vercel non connecté — lance 'vercel login' puis 'vercel link' d'abord.");
    return;
  }

  for (const [key, value] of Object.entries(vercelVars)) {
    for (const env of ["production", "preview"]) {
      try {
        execSync(`vercel env rm ${key} ${env} --yes`, { cwd: ROOT, stdio: "pipe" });
      } catch {}
      try {
        const result = execSync(
          `echo "${value}" | vercel env add ${key} ${env}`,
          { cwd: ROOT, stdio: "pipe" }
        );
        console.log(`  ✓ ${key} → ${env}`);
      } catch (e) {
        console.warn(`  ⚠ ${key} ${env}: ${e.message?.slice(0, 60)}`);
      }
    }
  }
  console.log("✓ Variables Vercel configurées");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Migration Lucky Trades → Turso ===\n");

  const env = loadEnv();
  const dbUrl = env.DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;

  // [1/4] Validate
  if (!dbUrl || !authToken || dbUrl.startsWith("file:")) {
    console.error(`❌ Variables manquantes dans .env

Étapes à faire sur https://app.turso.io (2 min) :
  1. Crée un compte (gratuit)
  2. New Database → nom : luckytrades
  3. Dans la DB → Connect → copy "Database URL"  (libsql://...)
  4. Dans la DB → Generate Token → copy le token

Puis ajoute ces 2 lignes dans ton fichier .env :
  DATABASE_URL=libsql://luckytrades-TONNOM.turso.io
  TURSO_AUTH_TOKEN=eyJ...

Ensuite relance : npm run setup:prod
`);
    process.exit(1);
  }

  console.log(`[1/4] Connexion à Turso : ${dbUrl}`);
  const remote = createClient({ url: dbUrl, authToken });
  try {
    await remote.execute("SELECT 1");
    console.log("✓ Connecté\n");
  } catch (e) {
    console.error("❌ Impossible de se connecter à Turso :", e.message);
    process.exit(1);
  }

  await pushSchema(remote);
  await migrateData(remote);
  await configureVercel(dbUrl, authToken);

  console.log(`
✅ Tout est prêt !

Prochaines étapes :
  1. Vercel redéploiera automatiquement depuis le dernier push GitHub.
  2. Si Vercel n'était pas lié, ajoute manuellement dans le dashboard Vercel :
       DATABASE_URL  = ${dbUrl}
       TURSO_AUTH_TOKEN = (depuis ton .env)
       ADMIN_USER / ADMIN_PASSWORD / JWT_SECRET
`);
}

main();
