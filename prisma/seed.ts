/**
 * Seed script — données importées depuis la page Notion de Vorthil
 * https://vorthil.notion.site/2af94f12a0f380ab8b23fbd3da30a585
 *
 * Catégories Notion → catégories app :
 *   "miroir"              → "mirror"  (possède le shiny, veut le même en retour)
 *   "Dyna/Giga" ✨        → "mirror"  (Dynamax/Gigamax shiny, échange miroir)
 *   "recherche"           → "want"
 *   "A donner"            → "give"    (shinies à donner)
 *   "A donner (Dyna/Giga)"→ "give"    (Dynamax/Gigamax non-shiny)
 *   "A donner (légendaires)"→ "give"  (Légendaires non-shiny)
 *
 * Run : npm run seed
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const url = dbUrl.startsWith("file:.")
  ? `file:${path.resolve(process.cwd(), dbUrl.replace(/^file:/, "")).replace(/\\/g, "/")}`
  : dbUrl;

const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

interface SeedEntry {
  pokemonName: string;
  pokemonId: number;
  category: "want" | "give" | "mirror";
  trainerName?: string;
  tradeForPokemonName?: string;
  tradeForPokemonId?: number;
  notes?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// DRESSEURS
// ────────────────────────────────────────────────────────────────────────────
const TRAINERS = [
  "67Kalash67", "Ninastein", "Klz00", "Blusky", "Marion67",
  "Lenaristo", "Ztirf", "LouisMargo", "Auryale", "glg67",
  "Woolfyyy", "Snubbulus", "Tomwine", "Vorthilos",
];

// ────────────────────────────────────────────────────────────────────────────
// ENTRÉES
// ────────────────────────────────────────────────────────────────────────────
const ENTRIES: SeedEntry[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // ÉCHANGES MIROIR — possède le shiny, veut le même en retour
  // ══════════════════════════════════════════════════════════════════════════

  // -- Shinies miroir (section "miroir" dans Notion) --
  { pokemonName: "Electhor Dynamax", pokemonId: 145, category: "mirror", notes: "✨ Shiny · Dynamax", trainerName: "67Kalash67" },
  { pokemonName: "Artikodin de Galar", pokemonId: 144, category: "mirror", notes: "✨ Shiny · Forme de Galar" },
  { pokemonName: "Tokorico", pokemonId: 785, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Krabby Dynamax", pokemonId: 98, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Dardagnan", pokemonId: 15, category: "mirror", notes: "✨ Shiny", trainerName: "Ninastein" },
  { pokemonName: "Osselait", pokemonId: 104, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Kangourex", pokemonId: 115, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Magicarpe", pokemonId: 129, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Ptéra", pokemonId: 142, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Monaflémit", pokemonId: 289, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Camérupt", pokemonId: 323, category: "mirror", notes: "✨ Shiny", trainerName: "Klz00" },
  { pokemonName: "Draby", pokemonId: 371, category: "mirror", notes: "✨ Shiny", trainerName: "Blusky" },
  { pokemonName: "Rayquaza", pokemonId: 384, category: "mirror", notes: "✨ Shiny", trainerName: "Marion67" },
  { pokemonName: "Lockpin", pokemonId: 428, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Coupenotte", pokemonId: 610, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Drakkarmin", pokemonId: 621, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Scalpion", pokemonId: 624, category: "mirror", notes: "✨ Shiny", trainerName: "Lenaristo" },
  { pokemonName: "Félinferno", pokemonId: 727, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Frigodo", pokemonId: 996, category: "mirror", notes: "✨ Shiny", trainerName: "Ztirf" },
  { pokemonName: "Carapuce chapeau de fête", pokemonId: 7, category: "mirror", notes: "✨ Shiny · Chapeau de fête" },
  { pokemonName: "Ectoplasma", pokemonId: 94, category: "mirror", notes: "✨ Shiny" },
  { pokemonName: "Fragilady de Hisui", pokemonId: 549, category: "mirror", notes: "✨ Shiny · Forme de Hisui" },
  { pokemonName: "Cresselia", pokemonId: 488, category: "mirror", notes: "✨ Shiny", trainerName: "Tomwine" },

  // -- Dyna/Giga shiny miroir (section "Dyna/Giga ✨" dans Notion) --
  { pokemonName: "Latios Dynamax", pokemonId: 381, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Angoliath Gigamax", pokemonId: 861, category: "mirror", notes: "✨ Shiny · Gigamax", trainerName: "Vorthilos" },
  { pokemonName: "Bulbizarre Dynamax", pokemonId: 1, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Salamèche Dynamax", pokemonId: 4, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Carapuce Dynamax", pokemonId: 7, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Chenipan Dynamax", pokemonId: 10, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Abra Dynamax", pokemonId: 63, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Leveinard Dynamax", pokemonId: 113, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Amonita Dynamax", pokemonId: 138, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Kabuto Dynamax", pokemonId: 140, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Caratroc Dynamax", pokemonId: 213, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Tarsal Dynamax", pokemonId: 280, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Ténéfix Dynamax", pokemonId: 302, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Wailord Dynamax", pokemonId: 321, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Terhal Dynamax", pokemonId: 374, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Rototaupe Dynamax", pokemonId: 529, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Darumarond Dynamax", pokemonId: 554, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Miamiasme Dynamax", pokemonId: 568, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Hexagel Dynamax", pokemonId: 615, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Sepiatop Dynamax", pokemonId: 686, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Croquine Dynamax", pokemonId: 761, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Quartermac Dynamax", pokemonId: 766, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Rongourmand Dynamax", pokemonId: 820, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Moumouton Dynamax", pokemonId: 831, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Bibichut Dynamax", pokemonId: 856, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Wailmer Dynamax", pokemonId: 320, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Reptincel Dynamax", pokemonId: 5, category: "mirror", notes: "✨ Shiny · Dynamax" },
  { pokemonName: "Evoli Dynamax", pokemonId: 133, category: "mirror", notes: "✨ Shiny · Dynamax" },

  // ══════════════════════════════════════════════════════════════════════════
  // JE RECHERCHE — shinies que Vorthil veut obtenir
  // ══════════════════════════════════════════════════════════════════════════
  { pokemonName: "Relicanth", pokemonId: 369, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Vortente", pokemonId: 455, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Bouldeneu", pokemonId: 465, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Maganon", pokemonId: 467, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Yanmega", pokemonId: 469, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Scorvol", pokemonId: 472, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Rhinolove", pokemonId: 528, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Pyrax", pokemonId: 637, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Tiboudet", pokemonId: 749, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Guérilande", pokemonId: 764, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Dolmen", pokemonId: 874, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Terracool", pokemonId: 980, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Poltchageist", pokemonId: 1012, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Nidorina", pokemonId: 30, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Mélofée", pokemonId: 35, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Feunard", pokemonId: 38, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Nosferapti", pokemonId: 41, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Arcanin", pokemonId: 59, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Ptitard", pokemonId: 60, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Doduo", pokemonId: 84, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Soporifik", pokemonId: 96, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Kicklee", pokemonId: 106, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Rhinoferos", pokemonId: 112, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Lipoutou", pokemonId: 124, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Magmar", pokemonId: 126, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Tauros", pokemonId: 128, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Draco", pokemonId: 148, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Pichu", pokemonId: 172, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Wattwatt", pokemonId: 179, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Capumain", pokemonId: 190, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Embrylex", pokemonId: 246, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Gobou", pokemonId: 258, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Spinda", pokemonId: 327, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Lovdisc", pokemonId: 370, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Tortipouss", pokemonId: 387, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Rozbouton", pokemonId: 406, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Riolu", pokemonId: 447, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Flamajou", pokemonId: 514, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Feuillajou", pokemonId: 511, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Flotajou", pokemonId: 515, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Cabriolaine", pokemonId: 672, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Mucuscule", pokemonId: 704, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Brindibou", pokemonId: 722, category: "want", notes: "✨ Shiny", trainerName: "glg67", tradeForPokemonName: "Brocélôme", tradeForPokemonId: 708 },
  { pokemonName: "Chelours cape TS", pokemonId: 760, category: "want", notes: "✨ Shiny · Cape Terres Sauvages" },
  { pokemonName: "Grimalin", pokemonId: 859, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Sulfura de Galar", pokemonId: 146, category: "want", notes: "✨ Shiny · Forme de Galar" },
  { pokemonName: "Electhor de Galar", pokemonId: 145, category: "want", notes: "✨ Shiny · Forme de Galar", trainerName: "Woolfyyy" },
  { pokemonName: "Kyurem", pokemonId: 646, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Morpeko", pokemonId: 877, category: "want", notes: "✨ Shiny", trainerName: "LouisMargo", tradeForPokemonName: "Pikachu Monocle", tradeForPokemonId: 25 },
  { pokemonName: "Sablaireau", pokemonId: 28, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Sablaireau d'Alola", pokemonId: 28, category: "want", notes: "✨ Shiny · Forme d'Alola" },
  { pokemonName: "Nénupiot", pokemonId: 270, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Balignon", pokemonId: 285, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Galekid", pokemonId: 304, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Dynavolt", pokemonId: 309, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Stalgamin", pokemonId: 361, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Kranidos", pokemonId: 408, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Spiritomb", pokemonId: 442, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Griknot", pokemonId: 443, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Nodulithe", pokemonId: 524, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Maracachi", pokemonId: 556, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Ectoplasma Gigamax", pokemonId: 94, category: "want", notes: "✨ Shiny · Gigamax" },
  { pokemonName: "Mini Draco", pokemonId: 147, category: "want", notes: "✨ Shiny" },
  { pokemonName: "Psychokwak Bouée", pokemonId: 54, category: "want", notes: "✨ Shiny", trainerName: "Snubbulus", tradeForPokemonName: "Chartor", tradeForPokemonId: 324 },

  // ══════════════════════════════════════════════════════════════════════════
  // À DONNER — shinies que Vorthil peut donner
  // ══════════════════════════════════════════════════════════════════════════
  { pokemonName: "Florizarre", pokemonId: 3, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Pikachu Monocle", pokemonId: 25, category: "give", notes: "✨ Shiny · Monocle rouge", trainerName: "LouisMargo" },
  { pokemonName: "Goupix d'Alola", pokemonId: 37, category: "give", notes: "✨ Shiny · Forme d'Alola", trainerName: "Auryale", tradeForPokemonName: "Baggiguane", tradeForPokemonId: 759 },
  { pokemonName: "Miaouss", pokemonId: 52, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Miaouss de Galar", pokemonId: 52, category: "give", notes: "✨ Shiny · Forme de Galar" },
  { pokemonName: "Persian", pokemonId: 53, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Férosinge", pokemonId: 56, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Machoc", pokemonId: 66, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Chétiflor", pokemonId: 69, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Ponyta de Galar", pokemonId: 77, category: "give", notes: "✨ Shiny · Forme de Galar" },
  { pokemonName: "Canarticho", pokemonId: 83, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Evoli", pokemonId: 133, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Kabutops", pokemonId: 141, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Kaiminus", pokemonId: 158, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Zarbi D", pokemonId: 201, category: "give", notes: "✨ Shiny · Forme D" },
  { pokemonName: "Zarbi O", pokemonId: 201, category: "give", notes: "✨ Shiny · Forme O" },
  { pokemonName: "Airmure", pokemonId: 227, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Zigzaton de Galar", pokemonId: 263, category: "give", notes: "✨ Shiny · Forme de Galar" },
  { pokemonName: "Tarsal", pokemonId: 280, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Chartor", pokemonId: 324, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Barpau", pokemonId: 349, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Serpang", pokemonId: 367, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Terhal", pokemonId: 374, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Latias purifié", pokemonId: 380, category: "give", notes: "✨ Shiny · Purifié" },
  { pokemonName: "Vipélierre", pokemonId: 495, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Larveyette", pokemonId: 540, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Venipatte", pokemonId: 543, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Fragilady de Hisui", pokemonId: 549, category: "give", notes: "✨ Shiny · Forme de Hisui" },
  { pokemonName: "Tutafeh", pokemonId: 562, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Arkéapti", pokemonId: 566, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Aéroptéryx", pokemonId: 567, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Sorbouboul", pokemonId: 584, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Lançargot", pokemonId: 589, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Viskuse femelle", pokemonId: 592, category: "give", notes: "✨ Shiny · Femelle" },
  { pokemonName: "Limaspeed", pokemonId: 617, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Scalpion", pokemonId: 624, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Flabébé orange", pokemonId: 669, category: "give", notes: "✨ Shiny · Orange" },
  { pokemonName: "Psytigri mâle", pokemonId: 677, category: "give", notes: "✨ Shiny · Mâle" },
  { pokemonName: "Brocélôme", pokemonId: 708, category: "give", notes: "✨ Shiny", trainerName: "glg67", tradeForPokemonName: "Brindibou", tradeForPokemonId: 722 },
  { pokemonName: "Brocélôme", pokemonId: 708, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Otaquin", pokemonId: 728, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Sovkipou", pokemonId: 767, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Bébécaille", pokemonId: 782, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Rongourmand", pokemonId: 820, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Minisange", pokemonId: 821, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Moumouton", pokemonId: 831, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Hexadron costume train", pokemonId: 870, category: "give", notes: "✨ Shiny · Costume train" },
  { pokemonName: "Poussacha", pokemonId: 906, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Chochodile", pokemonId: 909, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Coiffeton", pokemonId: 912, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Pohm", pokemonId: 921, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Olivini", pokemonId: 928, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Deusolourdo", pokemonId: 982, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Mordudor", pokemonId: 999, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Mordudor fond 9 ans", pokemonId: 999, category: "give", notes: "✨ Shiny · Fond 9 ans" },
  { pokemonName: "Ponyta", pokemonId: 77, category: "give", notes: "✨ Shiny" },
  { pokemonName: "Chartor", pokemonId: 324, category: "give", notes: "✨ Shiny", trainerName: "Snubbulus", tradeForPokemonName: "Psychokwak Bouée", tradeForPokemonId: 54 },

  // ══════════════════════════════════════════════════════════════════════════
  // À DONNER — Gigamax non-shiny
  // ══════════════════════════════════════════════════════════════════════════
  { pokemonName: "Florizarre Gigamax", pokemonId: 3, category: "give", notes: "Gigamax" },
  { pokemonName: "Dracaufeu Gigamax", pokemonId: 6, category: "give", notes: "Gigamax" },
  { pokemonName: "Tortank Gigamax", pokemonId: 9, category: "give", notes: "Gigamax" },
  { pokemonName: "Papillusion Gigamax", pokemonId: 12, category: "give", notes: "Gigamax" },
  { pokemonName: "Mackogneur Gigamax", pokemonId: 68, category: "give", notes: "Gigamax" },
  { pokemonName: "Ectoplasma Gigamax", pokemonId: 94, category: "give", notes: "Gigamax" },
  { pokemonName: "Krabboss Gigamax", pokemonId: 99, category: "give", notes: "Gigamax" },
  { pokemonName: "Lokhlass Gigamax", pokemonId: 131, category: "give", notes: "Gigamax" },
  { pokemonName: "Ronflex Gigamax", pokemonId: 143, category: "give", notes: "Gigamax" },
  { pokemonName: "Miasmax Gigamax", pokemonId: 569, category: "give", notes: "Gigamax" },
  { pokemonName: "Gorythmic Gigamax", pokemonId: 812, category: "give", notes: "Gigamax" },
  { pokemonName: "Pyrobut Gigamax", pokemonId: 815, category: "give", notes: "Gigamax" },
  { pokemonName: "Lézargus Gigamax", pokemonId: 818, category: "give", notes: "Gigamax" },
  { pokemonName: "Lézargus Gigamax fond Paris", pokemonId: 818, category: "give", notes: "Gigamax · Fond Paris" },
  { pokemonName: "Salarsen Forme Grave Gigamax", pokemonId: 849, category: "give", notes: "Gigamax · Forme Grave" },
  { pokemonName: "Salarsen Forme Grave Gigamax fond TS 2024", pokemonId: 849, category: "give", notes: "Gigamax · Forme Grave · Fond TS 2024" },
  { pokemonName: "Angoliath Gigamax", pokemonId: 861, category: "give", notes: "Gigamax" },
  { pokemonName: "Angoliath Gigamax fond TS 2025", pokemonId: 861, category: "give", notes: "Gigamax · Fond Terres Sauvages 2025" },

  // ══════════════════════════════════════════════════════════════════════════
  // À DONNER — Dynamax non-shiny
  // ══════════════════════════════════════════════════════════════════════════
  { pokemonName: "Salamèche Dynamax", pokemonId: 4, category: "give", notes: "Dynamax" },
  { pokemonName: "Carapuce Dynamax", pokemonId: 7, category: "give", notes: "Dynamax" },
  { pokemonName: "Chenipan Dynamax", pokemonId: 10, category: "give", notes: "Dynamax" },
  { pokemonName: "Fantominus Dynamax", pokemonId: 92, category: "give", notes: "Dynamax" },
  { pokemonName: "Leveinard Dynamax", pokemonId: 113, category: "give", notes: "Dynamax" },
  { pokemonName: "Amonita Dynamax", pokemonId: 138, category: "give", notes: "Dynamax" },
  { pokemonName: "Caratroc Dynamax", pokemonId: 213, category: "give", notes: "Dynamax" },
  { pokemonName: "Tarsal Dynamax", pokemonId: 280, category: "give", notes: "Dynamax" },
  { pokemonName: "Ténéfix Dynamax", pokemonId: 302, category: "give", notes: "Dynamax" },
  { pokemonName: "Wailmer Dynamax", pokemonId: 320, category: "give", notes: "Dynamax" },
  { pokemonName: "Poichigeon Dynamax", pokemonId: 519, category: "give", notes: "Dynamax" },
  { pokemonName: "Chovsourir Dynamax", pokemonId: 527, category: "give", notes: "Dynamax" },
  { pokemonName: "Rototaupe Dynamax", pokemonId: 529, category: "give", notes: "Dynamax" },
  { pokemonName: "Miamiasme Dynamax", pokemonId: 568, category: "give", notes: "Dynamax" },
  { pokemonName: "Hexagel Dynamax", pokemonId: 615, category: "give", notes: "Dynamax" },
  { pokemonName: "Sepiatroce Dynamax", pokemonId: 687, category: "give", notes: "Dynamax" },
  { pokemonName: "Croquine Dynamax", pokemonId: 761, category: "give", notes: "Dynamax" },
  { pokemonName: "Quartermac Dynamax", pokemonId: 766, category: "give", notes: "Dynamax" },
  { pokemonName: "Rongourmand Dynamax", pokemonId: 820, category: "give", notes: "Dynamax" },
  { pokemonName: "Moumouton Dynamax", pokemonId: 831, category: "give", notes: "Dynamax" },
  { pokemonName: "Salarsen Forme Grave Dynamax", pokemonId: 849, category: "give", notes: "Dynamax · Forme Grave" },
  { pokemonName: "Duralugon Dynamax", pokemonId: 884, category: "give", notes: "Dynamax" },
  { pokemonName: "Evoli Dynamax", pokemonId: 133, category: "give", notes: "Dynamax" },

  // ══════════════════════════════════════════════════════════════════════════
  // À DONNER — Légendaires non-shiny
  // ══════════════════════════════════════════════════════════════════════════
  { pokemonName: "Artikodin Dynamax", pokemonId: 144, category: "give", notes: "Dynamax" },
  { pokemonName: "Electhor Dynamax", pokemonId: 145, category: "give", notes: "Dynamax" },
  { pokemonName: "Electhor de Galar", pokemonId: 145, category: "give", notes: "Forme de Galar" },
  { pokemonName: "Sulfura Dynamax", pokemonId: 146, category: "give", notes: "Dynamax" },
  { pokemonName: "Raikou Dynamax", pokemonId: 243, category: "give", notes: "Dynamax" },
  { pokemonName: "Entei Dynamax", pokemonId: 244, category: "give", notes: "Dynamax" },
  { pokemonName: "Suicune Dynamax", pokemonId: 245, category: "give", notes: "Dynamax" },
  { pokemonName: "Ho-Oh purifié", pokemonId: 250, category: "give", notes: "Purifié" },
  { pokemonName: "Regirock", pokemonId: 377, category: "give" },
  { pokemonName: "Regice", pokemonId: 378, category: "give" },
  { pokemonName: "Regice fond ancien", pokemonId: 378, category: "give", notes: "Fond ancien" },
  { pokemonName: "Registeel", pokemonId: 379, category: "give" },
  { pokemonName: "Latias Dynamax", pokemonId: 380, category: "give", notes: "Dynamax" },
  { pokemonName: "Latios", pokemonId: 381, category: "give" },
  { pokemonName: "Kyogre", pokemonId: 382, category: "give" },
  { pokemonName: "Groudon", pokemonId: 383, category: "give" },
  { pokemonName: "Rayquaza", pokemonId: 384, category: "give" },
  { pokemonName: "Créhelf", pokemonId: 480, category: "give" },
  { pokemonName: "Créfollet", pokemonId: 481, category: "give" },
  { pokemonName: "Créfadet", pokemonId: 482, category: "give" },
  { pokemonName: "Dialga", pokemonId: 483, category: "give" },
  { pokemonName: "Dialga forme originelle", pokemonId: 483, category: "give", notes: "Forme originelle" },
  { pokemonName: "Palkia", pokemonId: 484, category: "give" },
  { pokemonName: "Palkia forme originelle", pokemonId: 484, category: "give", notes: "Forme originelle" },
  { pokemonName: "Heatran", pokemonId: 485, category: "give" },
  { pokemonName: "Regigigas purifié", pokemonId: 486, category: "give", notes: "Purifié" },
  { pokemonName: "Giratina", pokemonId: 487, category: "give", notes: "Forme alternée" },
  { pokemonName: "Giratina forme originelle", pokemonId: 487, category: "give", notes: "Forme originelle" },
  { pokemonName: "Cresselia", pokemonId: 488, category: "give" },
  { pokemonName: "Cobaltium", pokemonId: 638, category: "give" },
  { pokemonName: "Terrakium", pokemonId: 639, category: "give" },
  { pokemonName: "Viridium", pokemonId: 640, category: "give" },
  { pokemonName: "Boréas forme totémique", pokemonId: 641, category: "give", notes: "Forme totémique" },
  { pokemonName: "Fulguris forme totémique", pokemonId: 642, category: "give", notes: "Forme totémique" },
  { pokemonName: "Reshiram", pokemonId: 643, category: "give" },
  { pokemonName: "Zekrom", pokemonId: 644, category: "give" },
  { pokemonName: "Démétéros forme totémique", pokemonId: 645, category: "give", notes: "Forme totémique" },
  { pokemonName: "Kyurem", pokemonId: 646, category: "give" },
  { pokemonName: "Kyurem fond noir", pokemonId: 646, category: "give", notes: "Fond noir" },
  { pokemonName: "Xerneas", pokemonId: 716, category: "give" },
  { pokemonName: "Yveltal", pokemonId: 717, category: "give" },
  { pokemonName: "Tokorico", pokemonId: 785, category: "give" },
  { pokemonName: "Tokopiyon", pokemonId: 786, category: "give" },
  { pokemonName: "Tokopisco", pokemonId: 788, category: "give" },
  { pokemonName: "Solgaleo", pokemonId: 791, category: "give" },
  { pokemonName: "Lunala", pokemonId: 792, category: "give" },
  { pokemonName: "Necrozma", pokemonId: 800, category: "give" },
  { pokemonName: "Zacian", pokemonId: 888, category: "give" },
  { pokemonName: "Zacian fond bleu", pokemonId: 888, category: "give", notes: "Fond bleu" },
  { pokemonName: "Zamazenta", pokemonId: 889, category: "give" },
  { pokemonName: "Zamazenta fond Paris", pokemonId: 889, category: "give", notes: "Fond Paris" },
  { pokemonName: "Zamazenta fond rouge", pokemonId: 889, category: "give", notes: "Fond rouge" },
  { pokemonName: "Regieleki", pokemonId: 894, category: "give" },
  { pokemonName: "Regidrago", pokemonId: 895, category: "give" },
  { pokemonName: "Amoovénus forme avatar", pokemonId: 905, category: "give", notes: "Forme avatar" },
];

// ────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🧹 Suppression des données existantes...");
  await prisma.pokemonEntry.deleteMany();
  await prisma.trainer.deleteMany();
  console.log("  ✓ Base vidée\n");

  console.log("🌱 Création des dresseurs...");
  const trainerMap: Record<string, string> = {};
  for (const name of TRAINERS) {
    const t = await prisma.trainer.create({ data: { name } });
    trainerMap[name] = t.id;
    console.log(`  ✓ ${name}`);
  }

  console.log("\n📦 Insertion des entrées...");
  let count = 0;
  for (const entry of ENTRIES) {
    await prisma.pokemonEntry.create({
      data: {
        pokemonName: entry.pokemonName,
        pokemonId: entry.pokemonId,
        category: entry.category,
        trainerId: entry.trainerName ? trainerMap[entry.trainerName] ?? null : null,
        tradeForPokemonName: entry.tradeForPokemonName ?? null,
        tradeForPokemonId: entry.tradeForPokemonId ?? null,
        notes: entry.notes ?? null,
      },
    });
    count++;
  }

  console.log(`\n✅ ${count} entrées insérées · ${TRAINERS.length} dresseurs créés`);
  console.log(`   Miroir : ${ENTRIES.filter(e => e.category === "mirror").length}`);
  console.log(`   Recherche : ${ENTRIES.filter(e => e.category === "want").length}`);
  console.log(`   À donner : ${ENTRIES.filter(e => e.category === "give").length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
