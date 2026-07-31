"use client";

import toast from "react-hot-toast";
import type { PokemonEntry } from "@/lib/types";
import { buildPogoShinyFilter } from "@/lib/pogoShinyFilter";

export default function CopyPogoShinyFilterButton({ entries }: { entries: PokemonEntry[] }) {
  const filterString = buildPogoShinyFilter(entries);
  if (!filterString) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filterString);
      toast.success("Filtre copié ! Colle-le dans la recherche Pokémon GO.");
    } catch {
      toast.error("Impossible de copier le filtre");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn-secondary"
      style={{ fontSize: "0.75rem", padding: "6px 12px", marginBottom: 12 }}
      title={filterString}
    >
      Copier filtre shiny liste pour Pogo
    </button>
  );
}
