#!/usr/bin/env node
// Restaure un backup (voir lib/backup.ts / app/api/cron/backup) dans la base
// en cours (celle pointée par .env.local, donc la prod par défaut sur ce
// projet — voir prisma.config.ts). Par défaut : dry-run, n'écrit rien.
//
// Usage :
//   node scripts/restore-backup.mjs [chemin-du-backup.json] [--yes]
//
// Sans argument, utilise backups/latest.json. Pour restaurer une version plus
// ancienne, exporte-la d'abord depuis l'historique git :
//   git show <commit>:backups/latest.json > /tmp/backup-ancien.json
//   node scripts/restore-backup.mjs /tmp/backup-ancien.json --yes
//
// Comportement :
//   - Dresseurs : upsert par id (jamais supprimés, pour ne pas casser le lien
//     avec un compte Supabase Auth existant).
//   - Entrées   : remplacement complet — toute entrée absente du backup est
//     supprimée, celles présentes sont upsert par id. C'est la définition
//     d'un vrai rollback (revenir exactement à l'état du backup), donc à
//     utiliser seulement en cas de gros pépin (perte/corruption de données),
//     pas pour un usage courant.

import { readFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("@prisma/client");

const args = process.argv.slice(2);
const apply = args.includes("--yes");
const backupPath = args.find((a) => !a.startsWith("--")) ?? "backups/latest.json";

const raw = JSON.parse(await readFile(backupPath, "utf-8"));
if (!Array.isArray(raw.trainers) || !Array.isArray(raw.entries)) {
  console.error(`Fichier de backup invalide : ${backupPath} (attendu: { trainers: [], entries: [] })`);
  process.exit(1);
}

console.log(`Backup chargé : ${backupPath}`);
console.log(`  exportedAt : ${raw.exportedAt}`);
console.log(`  trainers   : ${raw.trainers.length}`);
console.log(`  entries    : ${raw.entries.length}`);

const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_PRISMA_URL });
const prisma = new PrismaClient({ adapter });

const currentEntryIds = new Set((await prisma.pokemonEntry.findMany({ select: { id: true } })).map((e) => e.id));
const backupEntryIds = new Set(raw.entries.map((e) => e.id));
const toDelete = [...currentEntryIds].filter((id) => !backupEntryIds.has(id));

console.log(`\nÉtat actuel de la base :`);
console.log(`  entrées actuelles      : ${currentEntryIds.size}`);
console.log(`  entrées à créer/màj    : ${raw.entries.length}`);
console.log(`  entrées à supprimer    : ${toDelete.length} (absentes du backup)`);

if (!apply) {
  console.log(`\nDry-run (aucune écriture). Relance avec --yes pour appliquer réellement ce rollback.`);
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`\n--yes fourni : application du rollback...`);

await prisma.$transaction(async (tx) => {
  for (const t of raw.trainers) {
    const { _count, entries, ...data } = t;
    await tx.trainer.upsert({ where: { id: t.id }, update: data, create: data });
  }

  if (toDelete.length > 0) {
    await tx.pokemonEntry.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (const e of raw.entries) {
    const { trainer, ...data } = e;
    await tx.pokemonEntry.upsert({ where: { id: e.id }, update: data, create: data });
  }
});

console.log(`\nRollback terminé : ${raw.trainers.length} dresseurs, ${raw.entries.length} entrées restaurées, ${toDelete.length} supprimées.`);
await prisma.$disconnect();
