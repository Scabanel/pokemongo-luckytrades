// Apprend a Node a resoudre les imports comme le fait Next.
//
//   node --import ./scripts/resolveur-alias.mjs --experimental-strip-types mon-script.mjs
//
// ═══ POURQUOI ═══
//
// `lib/entryMatching.ts` importe `./tags` sans extension et `@/data/...` par alias. Les deux
// sont normaux dans un projet Next et inconnus du resolveur ESM de Node, qui exige des
// chemins complets. Sans ce crochet, un script de verification ne peut pas importer le
// VRAI module.
//
// L'alternative etait de recopier la logique testee dans le test. C'est la pire des options :
// un test qui verifie une copie passe au vert pendant que l'original derive, et il donne en
// plus l'illusion d'etre couvert. Ce fichier existe pour que les sondes mesurent le code
// qui tourne reellement.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(
  // Le crochet est fourni en ligne, en data: URL : un deuxieme fichier sur le disque pour
  // vingt lignes de resolution serait plus difficile a suivre que ce bloc.
  `data:text/javascript,${encodeURIComponent(`
    import { existsSync } from "node:fs";
    import { fileURLToPath } from "node:url";

    const RACINE = ${JSON.stringify(pathToFileURL(`${process.cwd()}/`).href)};

    /** Ajoute .ts / .tsx / .js quand le chemin nu n'existe pas, et essaie /index. */
    function completer(url) {
      if (existsSync(fileURLToPath(url))) return url;
      for (const suffixe of [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"]) {
        const essai = url + suffixe;
        if (existsSync(fileURLToPath(essai))) return essai;
      }
      return url;
    }

    /** Node exige l attribut { type: "json" } sur un import de JSON, ce que Next ne
     *  demande pas. On le fournit ici pour que le code du site reste ecrit comme Next
     *  l attend, plutot que d adapter le code au resolveur du test. */
    function decrire(url) {
      if (url.endsWith(".json")) {
        return { url, format: "json", importAttributes: { type: "json" }, shortCircuit: true };
      }
      return { url, shortCircuit: true };
    }

    export function resolve(specifier, contexte, suivant) {
      // L'alias de tsconfig : "@/x" designe la racine du projet.
      if (specifier.startsWith("@/")) {
        return decrire(completer(new URL(specifier.slice(2), RACINE).href));
      }
      // Un chemin relatif sans extension, ce que TypeScript autorise et Node non.
      if (specifier.startsWith(".")) {
        const brut = new URL(specifier, contexte.parentURL).href;
        const complet = completer(brut);
        if (complet !== brut) return decrire(complet);
      }
      return suivant(specifier, contexte);
    }
  `)}`,
  import.meta.url,
);
