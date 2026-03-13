/**
 * setup-turso.mjs
 * Automated Turso + Vercel setup:
 *  1. Auth Turso via device flow (opens browser)
 *  2. Creates the DB
 *  3. Migrates local SQLite → Turso
 *  4. Sets Vercel env vars
 */

import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync, exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

function openBrowser(url) {
  try { execSync(`start "" "${url}"`); } catch {}
}

// ─── Step 1 : Turso device auth ───────────────────────────────────────────────

async function tursoLogin() {
  console.log("\n[1/5] Connexion à Turso...");

  const deviceRes = await fetchJSON(
    "https://api.turso.tech/v1/auth/token/device",
    { method: "GET" }
  );

  if (!deviceRes.ok) {
    throw new Error("Impossible de démarrer l'auth Turso: " + JSON.stringify(deviceRes.data));
  }

  const { auth_url, device_code } = deviceRes.data;
  console.log(`\n→ Ouvre ce lien dans ton navigateur pour te connecter à Turso :`);
  console.log(`  ${auth_url}\n`);
  openBrowser(auth_url);

  // Poll until token ready
  console.log("En attente de la connexion dans le navigateur...");
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const poll = await fetchJSON(
      `https://api.turso.tech/v1/auth/token/device?device_code=${device_code}`,
      { method: "GET" }
    );
    if (poll.ok && poll.data?.jwt) {
      console.log("✓ Connecté à Turso");
      return poll.data.jwt;
    }
    process.stdout.write(".");
  }
  throw new Error("Timeout auth Turso (3 min)");
}

// ─── Step 2 : Create Turso DB ─────────────────────────────────────────────────

async function createTursoDB(token) {
  console.log("\n[2/5] Création de la base de données Turso...");

  // Get user/org name
  const me = await fetchJSON("https://api.turso.tech/v1/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!me.ok) throw new Error("Impossible de récupérer le profil: " + JSON.stringify(me.data));
  const org = me.data.username;
  console.log(`  Organisation: ${org}`);

  // Create DB
  const dbName = "luckytrades";
  const create = await fetchJSON(
    `https://api.turso.tech/v1/organizations/${org}/databases`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: dbName, group: "default" }),
    }
  );

  if (!create.ok && !create.data?.error?.includes("already exists")) {
    throw new Error("Création DB échouée: " + JSON.stringify(create.data));
  }

  const hostname = create.data?.database?.Hostname ??
    `${dbName}-${org}.turso.io`;

  // Create auth token
  const tkn = await fetchJSON(
    `https://api.turso.tech/v1/organizations/${org}/databases/${dbName}/auth/tokens`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!tkn.ok) throw new Error("Création token échouée: " + JSON.stringify(tkn.data));

  const dbUrl = `libsql://${hostname}`;
  const authToken = tkn.data.jwt;

  console.log(`✓ DB créée : ${dbUrl}`);
  return { dbUrl, authToken, org, dbName };
}

// ─── Step 3 : Push schema ─────────────────────────────────────────────────────

async function pushSchema(dbUrl, authToken) {
  console.log("\n[3/5] Push du schéma...");

  const client = createClient({ url: dbUrl, authToken });

  const schema = `
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
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `;

  await client.executeMultiple(schema);
  console.log("✓ Schéma appliqué");
  return client;
}

// ─── Step 4 : Migrate data ────────────────────────────────────────────────────

async function migrateData(dbUrl, authToken) {
  console.log("\n[4/5] Migration des données...");

  const localDbPath = path.join(ROOT, "dev.db")
    .replace(/\\/g, "/");

  const local = createClient({ url: `file:${localDbPath}` });
  const remote = createClient({ url: dbUrl, authToken });

  // Trainers
  const trainers = await local.execute("SELECT * FROM Trainer");
  console.log(`  → ${trainers.rows.length} dresseurs`);
  for (const row of trainers.rows) {
    await remote.execute({
      sql: `INSERT OR IGNORE INTO Trainer (id, name, createdAt) VALUES (?, ?, ?)`,
      args: [row.id, row.name, row.createdAt],
    });
  }

  // Entries
  const entries = await local.execute(
    "SELECT * FROM PokemonEntry WHERE completed = 0"
  );
  console.log(`  → ${entries.rows.length} entrées`);
  for (const row of entries.rows) {
    await remote.execute({
      sql: `INSERT OR IGNORE INTO PokemonEntry
        (id, pokemonName, pokemonId, category, trainerId, tradeForPokemonName,
         tradeForPokemonId, notes, shiny, customSpriteUrl, priority, tags,
         completed, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        row.id, row.pokemonName, row.pokemonId, row.category,
        row.trainerId ?? null, row.tradeForPokemonName ?? null,
        row.tradeForPokemonId ?? null, row.notes ?? null,
        row.shiny, row.customSpriteUrl ?? null,
        row.priority ?? null, row.tags ?? null,
        row.completed, row.createdAt,
        row.updatedAt ?? row.createdAt,
      ],
    });
  }

  console.log("✓ Données migrées");
}

// ─── Step 5 : Update .env + Vercel ───────────────────────────────────────────

async function updateEnvAndVercel(dbUrl, authToken) {
  console.log("\n[5/5] Mise à jour des variables d'environnement...");

  // Update local .env
  const envPath = path.join(ROOT, ".env");
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  const setVar = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    return regex.test(content) ? content.replace(regex, line) : content + `\n${line}`;
  };

  env = setVar(env, "DATABASE_URL", dbUrl);
  env = setVar(env, "TURSO_AUTH_TOKEN", authToken);
  writeFileSync(envPath, env.trim() + "\n");
  console.log("✓ .env mis à jour");

  // Set Vercel env vars via CLI
  const vercelVars = [
    ["DATABASE_URL", dbUrl],
    ["TURSO_AUTH_TOKEN", authToken],
  ];

  try {
    for (const [key, value] of vercelVars) {
      // Remove existing then add for all environments
      try {
        execSync(`vercel env rm ${key} production --yes 2>/dev/null || true`, { cwd: ROOT, stdio: "pipe" });
        execSync(`vercel env rm ${key} preview --yes 2>/dev/null || true`, { cwd: ROOT, stdio: "pipe" });
      } catch {}
      // Add to production + preview
      const cmd = `echo "${value}" | vercel env add ${key} production`;
      execSync(cmd, { cwd: ROOT, stdio: "pipe" });
      const cmd2 = `echo "${value}" | vercel env add ${key} preview`;
      execSync(cmd2, { cwd: ROOT, stdio: "pipe" });
      console.log(`✓ Vercel: ${key} configuré`);
    }
  } catch (e) {
    console.warn("  ⚠ Vercel env non configuré automatiquement (probablement pas lié).");
    console.warn("  → Lance 'vercel link' puis relance ce script, ou configure manuellement dans le dashboard.");
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Setup Turso + Vercel pour Lucky Trades ===");

  try {
    const jwt = await tursoLogin();
    const { dbUrl, authToken } = await createTursoDB(jwt);
    await pushSchema(dbUrl, authToken);
    await migrateData(dbUrl, authToken);
    await updateEnvAndVercel(dbUrl, authToken);

    console.log("\n✅ Tout est prêt !");
    console.log(`   DATABASE_URL=${dbUrl}`);
    console.log("   TURSO_AUTH_TOKEN=***");
    console.log("\n→ Relance 'npm run dev' pour utiliser Turso en local.");
    console.log("→ Lance 'vercel --prod' pour redéployer sur Vercel.");
  } catch (err) {
    console.error("\n❌ Erreur:", err.message);
    process.exit(1);
  }
}

main();
