/*
  Warnings:

  - Added the required column `updatedAt` to the `PokemonEntry` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PokemonEntry" (
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
    CONSTRAINT "PokemonEntry_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PokemonEntry" ("category", "completed", "createdAt", "updatedAt", "customSpriteUrl", "id", "notes", "pokemonId", "pokemonName", "priority", "shiny", "tags", "tradeForPokemonId", "tradeForPokemonName", "trainerId") SELECT "category", "completed", "createdAt", "createdAt", "customSpriteUrl", "id", "notes", "pokemonId", "pokemonName", "priority", "shiny", "tags", "tradeForPokemonId", "tradeForPokemonName", "trainerId" FROM "PokemonEntry";
DROP TABLE "PokemonEntry";
ALTER TABLE "new_PokemonEntry" RENAME TO "PokemonEntry";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
