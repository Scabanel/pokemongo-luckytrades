"use client";

import { useState } from "react";

interface PokemonSpriteProps {
  pokemonId: number;
  alt: string;
  size?: number;
  className?: string;
}

export default function PokemonSprite({
  pokemonId,
  alt,
  size = 96,
  className = "",
}: PokemonSpriteProps) {
  const [useFallback, setUseFallback] = useState(false);

  const gifUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`;
  const pngUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={useFallback ? pngUrl : gifUrl}
      alt={alt}
      width={size}
      height={size}
      className={`pokemon-sprite ${className}`}
      onError={() => {
        if (!useFallback) setUseFallback(true);
      }}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
