"use client";

import { useState, useEffect, useMemo } from "react";

const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

function buildUrls(pokemonId: number, shiny: boolean): string[] {
  if (shiny) {
    return [
      // 1. Animated shiny Gen V
      `${BASE}/versions/generation-v/black-white/animated/shiny/${pokemonId}.gif`,
      // 2. Showdown shiny animated
      `${BASE}/other/showdown/shiny/${pokemonId}.gif`,
      // 3. Static shiny PNG
      `${BASE}/shiny/${pokemonId}.png`,
      // 4. Fallback to normal PNG (when no shiny sprite exists)
      `${BASE}/${pokemonId}.png`,
    ];
  }
  return [
    `${BASE}/versions/generation-v/black-white/animated/${pokemonId}.gif`,
    `${BASE}/other/showdown/${pokemonId}.gif`,
    `${BASE}/${pokemonId}.png`,
  ];
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
