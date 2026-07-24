-- CreateTable
CREATE TABLE "MissingPokemonInclusion" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissingPokemonInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissingPokemonInclusion_category_pokemonId_key" ON "MissingPokemonInclusion"("category", "pokemonId");
