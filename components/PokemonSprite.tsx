"use client";

import { useState, useEffect, useMemo } from "react";
import goIcons from "@/data/go-icons.json";

const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const GO_ICON_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets";

// data/go-icons.json (léger, ~40 Ko : juste les noms de fichiers, pas les
// costumes) contient l'icône officielle Pokémon GO de chaque Pokémon connu
// de PokeMiners/pogo_assets — plus fidèle au jeu que les sprites génériques
// PokeAPI (style jeux principaux). Utilisée en priorité, avec repli sur
// PokeAPI pour les ~66 Pokémon pas encore sortis dans GO et pour toute image
// cassée. Le catalogue complet des costumes (data/costumes.json, ~700 Ko)
// n'est chargé que côté admin (SpritePicker), pas ici.
const GO_ICONS = goIcons as Record<string, string[]>;

function getOfficialGoIcon(pokemonId: number, shiny: boolean): string | null {
  const files = GO_ICONS[String(pokemonId)];
  if (!files) return null;
  const filename = shiny ? files[1] : files[0];
  return filename ? `${GO_ICON_BASE}/${encodeURIComponent(filename)}` : null;
}

function buildUrls(pokemonId: number, shiny: boolean): string[] {
  const goIcon = getOfficialGoIcon(pokemonId, shiny);
  const pokeApiChain = shiny
    ? [
        // Animé shiny Gen V, puis Showdown shiny, puis statique shiny/normal
        `${BASE}/versions/generation-v/black-white/animated/shiny/${pokemonId}.gif`,
        `${BASE}/other/showdown/shiny/${pokemonId}.gif`,
        `${BASE}/shiny/${pokemonId}.png`,
        `${BASE}/${pokemonId}.png`,
      ]
    : [
        `${BASE}/versions/generation-v/black-white/animated/${pokemonId}.gif`,
        `${BASE}/other/showdown/${pokemonId}.gif`,
        `${BASE}/${pokemonId}.png`,
      ];
  return goIcon ? [goIcon, ...pokeApiChain] : pokeApiChain;
}

interface PokemonSpriteProps {
  pokemonId: number;
  alt: string;
  size?: number;
  className?: string;
  shiny?: boolean;
  customSpriteUrl?: string | null;
}

export default function PokemonSprite({
  pokemonId,
  alt,
  size = 96,
  className = "",
  shiny = false,
  customSpriteUrl,
}: PokemonSpriteProps) {
  const urls = useMemo(() => buildUrls(pokemonId, shiny), [pokemonId, shiny]);
  const [idx, setIdx] = useState(0);
  const [useCustom, setUseCustom] = useState(!!customSpriteUrl);

  useEffect(() => {
    setIdx(0);
    setUseCustom(!!customSpriteUrl);
  }, [pokemonId, shiny, customSpriteUrl]);

  const handleError = () => {
    if (useCustom) {
      setUseCustom(false);
    } else {
      setIdx((i) => Math.min(i + 1, urls.length - 1));
    }
  };

  const src = useCustom ? customSpriteUrl! : urls[idx];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`pokemon-sprite ${className}`}
      onError={handleError}
      style={{ width: size, height: size, objectFit: "contain", imageRendering: "pixelated" }}
    />
  );
}
