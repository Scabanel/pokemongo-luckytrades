"use client";

import { useState, useEffect, useMemo } from "react";
import goIcons from "@/data/go-icons.json";

const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const GO_ICON_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets";
const SHOWDOWN_BASE = "https://play.pokemonshowdown.com/sprites";

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

// Slug Showdown pour les formes Gigamax : le slug complet (avec le suffixe de
// forme, ex. "toxtricity-amped-gmax") n'existe pas toujours ; la forme de base
// avant le premier tiret (ex. "toxtricity-gmax"), si.
function gigantamaxShowdownUrls(gigantamaxSlug: string, shiny: boolean): string[] {
  const variant = shiny ? "ani-shiny" : "ani";
  const baseSlug = gigantamaxSlug.split("-")[0];
  const urls = [`${SHOWDOWN_BASE}/${variant}/${gigantamaxSlug}-gmax.gif`];
  if (baseSlug !== gigantamaxSlug) {
    urls.push(`${SHOWDOWN_BASE}/${variant}/${baseSlug}-gmax.gif`);
  }
  return urls;
}

function buildUrls(
  pokemonId: number,
  shiny: boolean,
  gigantamaxSlug?: string | null,
  gigantamaxIconUrl?: string | null
): string[] {
  const goIcon = getOfficialGoIcon(pokemonId, shiny);
  // Le sprite animé (Gen V Black/White, sinon Showdown) est privilégié par
  // défaut : plus vivant que les icônes statiques. Gen V et Showdown n'ont
  // pas d'animation pour les Pokémon révélés après leur sortie (tout Gen 8+ y
  // échappe), d'où la cascade de repli jusqu'à official-artwork qui, lui, est
  // maintenu à jour pour chaque nouvelle espèce et garantit de ne jamais finir
  // sans image du tout.
  const chain = shiny
    ? [
        `${BASE}/versions/generation-v/black-white/animated/shiny/${pokemonId}.gif`,
        `${BASE}/other/showdown/shiny/${pokemonId}.gif`,
        ...(goIcon ? [goIcon] : []),
        `${BASE}/shiny/${pokemonId}.png`,
        `${BASE}/${pokemonId}.png`,
        `${BASE}/other/official-artwork/shiny/${pokemonId}.png`,
        `${BASE}/other/official-artwork/${pokemonId}.png`,
      ]
    : [
        `${BASE}/versions/generation-v/black-white/animated/${pokemonId}.gif`,
        `${BASE}/other/showdown/${pokemonId}.gif`,
        ...(goIcon ? [goIcon] : []),
        `${BASE}/${pokemonId}.png`,
        `${BASE}/other/official-artwork/${pokemonId}.png`,
      ];

  // Gigamax : le visuel Gigamax officiel (animé Showdown si possible, sinon
  // l'icône statique Gigamax officielle) passe avant la chaîne normale, qui
  // ne correspond pas à l'apparence réelle en jeu pour ces formes.
  if (gigantamaxSlug) {
    const gmaxUrls = gigantamaxShowdownUrls(gigantamaxSlug, shiny);
    return [...gmaxUrls, ...(gigantamaxIconUrl ? [gigantamaxIconUrl] : []), ...chain];
  }
  return chain;
}

interface PokemonSpriteProps {
  pokemonId: number;
  alt: string;
  size?: number;
  className?: string;
  shiny?: boolean;
  customSpriteUrl?: string | null;
  // Uniquement pour les entrées Gigamax (voir PokemonCard.tsx) : slug anglais
  // du Pokémon, utilisé pour tenter le sprite animé Gigamax officiel de
  // Pokémon Showdown avant tout le reste.
  gigantamaxSlug?: string | null;
  gigantamaxIconUrl?: string | null;
}

export default function PokemonSprite({
  pokemonId,
  alt,
  size = 96,
  className = "",
  shiny = false,
  customSpriteUrl,
  gigantamaxSlug,
  gigantamaxIconUrl,
}: PokemonSpriteProps) {
  const urls = useMemo(
    () => buildUrls(pokemonId, shiny, gigantamaxSlug, gigantamaxIconUrl),
    [pokemonId, shiny, gigantamaxSlug, gigantamaxIconUrl]
  );
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
      loading="lazy"
      className={`pokemon-sprite ${className}`}
      onError={handleError}
      style={{ width: size, height: size, objectFit: "contain", imageRendering: "pixelated" }}
    />
  );
}
