-- CreateTable
CREATE TABLE "MissingPokemonExclusion" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissingPokemonExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissingPokemonExclusion_category_pokemonId_key" ON "MissingPokemonExclusion"("category", "pokemonId");
