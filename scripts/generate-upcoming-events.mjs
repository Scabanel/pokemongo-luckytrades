// Génère data/upcoming-events.json : les événements en cours et à venir dans
// Pokémon GO (Community Day, raids spéciaux, saisons, événements locaux...).
//
// Source : https://www.margxt.fr/planning-des-evenements-dans-pokemon-go/
// (page tenue à jour en continu par la communauté, alimentée par le plugin
// WordPress "EventON" - d'où les classes evcal_/evoet_/eventon_ ci-dessous).
// Chaque bloc porte un data-time="{startUnix}-{endUnix}" en secondes, bien
// plus fiable à parser que le texte affiché (jour/date/mois en français).
//
// À relancer périodiquement (npm run gen:events) pour suivre le calendrier.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "upcoming-events.json");
const URL = "https://www.margxt.fr/planning-des-evenements-dans-pokemon-go/";

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`  ⚠ fetch natif a échoué (${err.message}), tentative via curl…`);
    const { execFileSync } = await import("node:child_process");
    return execFileSync("curl", ["-sL", "-4", "-A", "Mozilla/5.0", url], { encoding: "utf-8", maxBuffer: 20 * 1024 * 1024 });
  }
}

// Scrape pur (aucune écriture disque) : réutilisé par le CLI ci-dessous et
// par app/api/cron/refresh-data/route.ts.
export async function scrapeUpcomingEvents() {
  const html = await fetchHtml(URL);
  const $ = cheerio.load(html);

  const byId = new Map();

  $(".eventon_list_event[data-event_id]").each((_, el) => {
    const $el = $(el);
    const id = $el.attr("data-event_id");
    if (!id || byId.has(id)) return;

    const timeRaw = $el.attr("data-time") || "";
    const [startRaw, endRaw] = timeRaw.split("-");
    const start = Number(startRaw);
    const end = endRaw ? Number(endRaw) : start;
    if (!start || Number.isNaN(start)) return;

    const title = $el.find(".evcal_event_title").first().text().trim();
    const category = $el.find(".evcal_event_subtitle").first().text().trim();
    const url = $el.find("a[href]").first().attr("href") || null;
    const image = $el.find("[data-img]").first().attr("data-img") || null;
    if (!title) return;

    byId.set(id, {
      id,
      title,
      category: category || null,
      // data-time est en secondes ; en millisecondes pour coller à Date.now().
      start: start * 1000,
      end: end * 1000,
      url,
      image,
    });
  });

  return [...byId.values()].sort((a, b) => a.start - b.start);
}

async function main() {
  console.log("Téléchargement de la page margxt.fr…");
  const events = await scrapeUpcomingEvents();
  const now = Date.now();
  const ongoing = events.filter((e) => e.start <= now && e.end >= now);
  const upcoming = events.filter((e) => e.start > now);
  console.log(`✓ ${ongoing.length} en cours, ${upcoming.length} à venir`);

  await writeFile(OUT_PATH, JSON.stringify(events, null, 2) + "\n", "utf-8");
  console.log(`  → ${path.relative(process.cwd(), OUT_PATH)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
