-- CreateIndex
CREATE INDEX "PokemonEntry_trainerId_completed_idx" ON "PokemonEntry"("trainerId", "completed");

-- CreateIndex
CREATE INDEX "PokemonEntry_category_completed_idx" ON "PokemonEntry"("category", "completed");

-- CreateIndex
CREATE INDEX "PokemonEntry_linkedEntryId_idx" ON "PokemonEntry"("linkedEntryId");
