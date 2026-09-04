"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { construireFiltre } from "@/lib/pogoFiltre";
import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";
import type { EntryCategory, PokemonEntry } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   MONTRER SA LISTE EN DIX SECONDES, SUR PLACE

   Steven, le 2026-09-04 : « faut faciliter que l'autre puisse voir rapidement ce que tu as
   en degainant le QR code par exemple pour avoir directement acces a sa liste d'echanges
   et tout, ou le filtre directement a copier aussi. »

   La situation reelle : on est a un raid, a douze, le telephone dans une main. Il faut que
   l'autre voie la liste sans qu'on lui epelle une adresse. Deux gestes couvrent ca :

     LE QR CODE      il scanne, il ouvre la liste dans son navigateur. Rien a taper.
     LE FILTRE GO    il colle une chaine dans sa recherche Pokemon GO, et SON jeu lui
                     montre ce qu'il possede de la liste. Rien a comparer de tete.

   Les deux sont dans le meme panneau parce que c'est le meme moment : on degaine une fois.

   ═══ POURQUOI UN PANNEAU ET PAS UNE FENETRE MODALE ═══

   Une modale sur telephone, c'est un piege a doigts : elle se ferme au mauvais endroit,
   elle bloque le defilement, elle demande une croix de fermeture qui vole 44px. Ici le
   panneau pousse le contenu vers le bas et se referme par le meme bouton qui l'a ouvert.

   ═══ POURQUOI LE QR EST GENERE DANS LE NAVIGATEUR ═══

   L'adresse depend de la page ou on se trouve, donc du navigateur. La generer au serveur
   demanderait de deviner l'hote, ce qui casse en preproduction et en local. `qrcode` pese
   assez peu pour etre charge par la page, et le code obtenu ne quitte jamais l'appareil.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Assez grand pour etre scanne a bout de bras sur un ecran de telephone en exterieur. */
const COTE_QR = 220;

export default function PartageListe({
  nomDresseur,
  cheminPublic,
  entriesParCategorie,
  categorieActive,
}: {
  nomDresseur: string;
  /**
   * La page PUBLIQUE a encoder, quand ce n'est pas celle ou l'on se trouve.
   *
   * Indispensable sur « Mon espace » : cette page est privee, donc un QR code qui encode
   * `window.location.href` enverrait la personne qui scanne sur `/mon-espace`, c'est-a-dire
   * sur SON propre espace vide. Il faut viser la page publique du dresseur.
   *
   * Absent sur une page deja publique, ou l'adresse courante est la bonne.
   */
  cheminPublic?: string;
  entriesParCategorie: Record<EntryCategory, PokemonEntry[]>;
  categorieActive: EntryCategory;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [adresse, setAdresse] = useState("");
  const toile = useRef<HTMLCanvasElement>(null);

  /* L'adresse ne peut pas etre lue pendant le rendu : le serveur ne connait pas l'hote, et
     un initialiseur paresseux qui lise `window` cote client seulement produirait un HTML
     different de celui du serveur, donc un decalage a l'hydratation.
     Elle est donc lue A L'OUVERTURE du panneau, dans le gestionnaire de clic. Un effet
     aurait fait la meme chose en declenchant un rendu de plus a chaque montage des six
     pages, pour une valeur dont on n'a besoin qu'une fois le panneau ouvert. */
  function basculer() {
    setOuvert((o) => {
      if (!o) {
        setAdresse(cheminPublic
          ? new URL(cheminPublic, window.location.origin).href
          : window.location.href.split("#")[0]);
      }
      return !o;
    });
  }

  useEffect(() => {
    if (!ouvert || !adresse || !toile.current) return;
    // `qrcode` peint dans un canvas et exige des couleurs litterales : var() n'y existe
    // pas. On les LIT donc sur l'element racine plutot que de les recopier en dur, ce qui
    // garde app/tokens.css comme source unique et evite d'agrandir la liste des exceptions
    // de check:da.
    //
    // Aucune valeur de repli ecrite ici : les defauts de `qrcode` sont deja noir sur
    // blanc, donc un repli en dur aurait ete du code mort qui, en plus, se faisait
    // legitimement signaler par check:da - un script ne distingue pas un repli d'une
    // couleur oubliee. Si la feuille n'a pas charge, on n'envoie simplement pas `color`.
    const styles = getComputedStyle(document.documentElement);
    const encre = styles.getPropertyValue("--encre").trim();
    const papier = styles.getPropertyValue("--surface").trim();

    QRCode.toCanvas(toile.current, adresse, {
      width: COTE_QR,
      margin: 1,
      // Franc, sans nuance : c'est ce qui se scanne le mieux dans une main qui bouge, et
      // c'est aussi exactement la langue du plan de reseau.
      ...(encre && papier ? { color: { dark: encre, light: papier } } : {}),
      errorCorrectionLevel: "M",
    }).catch(() => toast.error("Le QR code n'a pas pu être généré"));
  }, [ouvert, adresse]);

  /* ═══ LE FILTRE NE SUIT PAS L'ONGLET AFFICHE ═══

     Premiere version : le panneau ne proposait le filtre que de la categorie ouverte.
     Teste sur un vrai dresseur, l'onglet par defaut est « Echanges miroir » et il
     contenait 0 entree, alors que la liste « peut donner » en comptait 213 : le panneau
     s'ouvrait donc en annoncant qu'il n'y avait rien a filtrer, sur la liste la plus
     fournie du site.

     Le partage est un geste a part : on montre SES listes, pas l'ecran ou on se trouve.
     Le panneau propose donc chaque categorie non vide, et s'ouvre sur celle qui est
     affichee seulement si elle contient quelque chose. */
  const categoriesNonVides = CATEGORY_DISPLAY_ORDER.filter(
    (k) => (entriesParCategorie[k] ?? []).length > 0,
  );
  const [choisie, setChoisie] = useState<EntryCategory | null>(null);
  const categorie =
    choisie
    ?? (categoriesNonVides.includes(categorieActive) ? categorieActive : categoriesNonVides[0])
    ?? null;

  const entries = categorie ? entriesParCategorie[categorie] ?? [] : [];

  /* ═══ UNE BASCULE, PAS DEUX BOUTONS ═══

     Steven, le 2026-09-05, capture a l'appui : « y'a pas les shiny qui sont affiches
     lorsqu'ils sont shiny ! »

     Il y avait bien deux boutons, « Copier le filtre » et « Filtre shiny », mais le bloc de
     texte en dessous affichait TOUJOURS la chaine non-shiny. Impossible de voir ce que le
     bouton shiny allait copier, donc impossible de croire qu'il faisait quelque chose.
     Pire : quand la liste est entierement shiny, les deux boutons affichent le meme
     compte, ce qui achevait de donner l'impression qu'ils faisaient la meme chose.

     Une bascule et une seule chaine : ce qui est affiche est exactement ce qui sera copie.
     C'est la seule facon de rendre un bouton de copie verifiable. */
  const [shinyUniquement, setShinyUniquement] = useState(false);
  const filtreShiny = construireFiltre(entries, { seulementShiny: true });
  const filtre = construireFiltre(entries, { seulementShiny: shinyUniquement });

  async function copier(texte: string, message: string) {
    try {
      await navigator.clipboard.writeText(texte);
      toast.success(message);
    } catch {
      toast.error("La copie a echoue. Le presse-papier est bloque par le navigateur.");
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={basculer}
        className="btn-primary"
        aria-expanded={ouvert}
      >
        {ouvert ? "Masquer le partage" : "Partager cette liste"}
      </button>

      {ouvert && (
        <div
          className="glass-card"
          style={{ marginTop: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* ── Le QR ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <p className="station" style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "var(--encre)" }}>
              Faire scanner la liste
            </p>
            <canvas
              ref={toile}
              width={COTE_QR}
              height={COTE_QR}
              style={{
                border: "var(--trait-moyen) solid var(--encre)",
                borderRadius: 8,
                background: "var(--surface)",
                maxWidth: "100%",
                height: "auto",
              }}
            />
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--encre-tres-douce)", textAlign: "center" }}>
              La liste de {nomDresseur} s&apos;ouvre directement dans son navigateur.
            </p>
            <button type="button" className="btn-secondary" onClick={() => copier(adresse, "Lien copie")}>
              Copier le lien
            </button>
          </div>

          {/* ── Le filtre in-game ── */}
          <div style={{ borderTop: "var(--trait-fin) solid var(--trait-leger)", paddingTop: 14 }}>
            <p
              className="station"
              style={{
                margin: "0 0 4px", fontWeight: 700, fontSize: "0.9rem",
                color: categorie ? CATEGORIES[categorie].color : "var(--encre)",
              }}
            >
              Filtre Pokémon GO
            </p>
            <p style={{ margin: "0 0 10px", fontSize: "0.75rem", color: "var(--encre-douce)" }}>
              À coller dans la recherche du jeu. Son propre jeu affichera ce qu&apos;il
              possède de la liste.
            </p>

            {/* Une pastille par ligne du reseau, la choisie remplie. C'est le seul endroit
                du panneau ou la couleur parle, et elle dit de quelle liste il s'agit. */}
            {categoriesNonVides.length > 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {categoriesNonVides.map((k) => {
                  const actif = k === categorie;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setChoisie(k)}
                      aria-pressed={actif}
                      style={{
                        minHeight: 44, padding: "0 12px", borderRadius: 999,
                        border: `var(--trait-moyen) solid ${CATEGORIES[k].color}`,
                        background: actif ? CATEGORIES[k].color : "var(--surface)",
                        color: actif ? "var(--surface)" : CATEGORIES[k].color,
                        fontWeight: 700, fontSize: "0.75rem", fontFamily: "Exo 2, sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      {CATEGORIES[k].label} ({(entriesParCategorie[k] ?? []).length})
                    </button>
                  );
                })}
              </div>
            )}

            {filtre ? (
              <>
                {/* La bascule apparait des qu'il y a AU MOINS UN shiny dans la liste.

                    Premiere version : elle ne s'affichait que si les shiny etaient MOINS
                    nombreux que le total, au motif qu'isoler une partie egale au tout ne
                    sert a rien. Faux : la liste de Steven est entierement shiny, donc la
                    bascule ne s'affichait jamais et le mot « chromatique » n'entrait jamais
                    dans le filtre. C'est precisement ce qu'il signalait.

                    Meme quand tout est shiny, le prefixe compte : c'est lui qui dit au jeu
                    de l'autre joueur de ne remonter que ses formes chromatiques. */}
                {filtreShiny && (
                  <button
                    type="button"
                    onClick={() => setShinyUniquement((v) => !v)}
                    aria-pressed={shinyUniquement}
                    style={{
                      minHeight: 44, padding: "0 14px", marginBottom: 10,
                      display: "inline-flex", alignItems: "center", gap: 6,
                      borderRadius: 999,
                      border: `var(--trait-moyen) solid var(--or)`,
                      background: shinyUniquement ? "var(--or)" : "var(--surface)",
                      color: "var(--encre)",
                      fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.8125rem",
                      cursor: "pointer",
                    }}
                  >
                    Shiny uniquement ✨
                  </button>
                )}

                {/* La chaine reellement copiee, visible, et c'est celle du bouton juste en
                    dessous. Un bouton qui copie quelque chose d'invisible demande une
                    confiance que rien ne justifie. */}
                <p
                  style={{
                    margin: "0 0 10px", padding: "8px 10px", background: "var(--surface-creuse)",
                    borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: "0.7rem",
                    color: "var(--encre-douce)", wordBreak: "break-all",
                  }}
                >
                  {filtre.chaine}
                </p>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => copier(filtre.chaine, `Filtre copié, ${filtre.pokemon} Pokémon`)}
                >
                  Copier le filtre ({filtre.pokemon})
                </button>

                {/* La longueur est affichee parce que la barre de recherche du jeu a une
                    limite, et qu'une chaine tronquee a la copie donnerait un resultat faux
                    sans prevenir. Mieux vaut la voir que la subir. */}
                <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "var(--encre-tres-douce)" }}>
                  {filtre.taille} caractères
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--encre-tres-douce)" }}>
                Ce dresseur n&apos;a encore aucun Pokémon dans ses listes.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
