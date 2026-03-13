-- CreateTable
CREATE TABLE "Trainer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonEntry" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokemonEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trainer_name_key" ON "Trainer"("name");

-- AddForeignKey
ALTER TABLE "PokemonEntry" ADD CONSTRAINT "PokemonEntry_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
