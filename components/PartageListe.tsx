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
  /* Plus de prop `categorieActive` : le panneau propose desormais TOUTES les listes d un
     coup, donc savoir laquelle est ouverte a l ecran n a plus d objet. Elle servait a
     preselectionner une categorie, une etape que Steven a fait supprimer. */
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

  /* ═══ UN BOUTON PAR LISTE, ET C'EST TOUT ═══

     Steven, le 2026-09-05 : « Je peux pas juste avoir des boutons pour les shiny des
     listes pour les filtres justes ? »

     Il a raison, et c'est le meme reproche que depuis le debut. Ma version demandait TROIS
     gestes pour une seule intention : choisir une liste avec une pastille, verifier l'etat
     d'une bascule shiny, puis appuyer sur Copier. Trois commandes a comprendre avant de
     pouvoir agir, la ou l'utilisateur sait deja ce qu'il veut : le filtre shiny de telle
     liste.

     Un bouton par liste, et le clic copie. Rien a selectionner, rien a verifier.

     Les listes entierement shiny n'ont qu'un bouton, puisque « tous » et « shiny » y
     donneraient la meme chose - un second bouton identique serait une question posee pour
     rien. Les listes mixtes en ont deux, parce que la distinction y est reelle.

     La chaine copiee s'affiche APRES le clic. Un bouton qui copie quelque chose
     d'invisible demande une confiance que rien ne justifie; l'afficher avant, pour trois
     listes a la fois, remplirait l'ecran de chaines que personne ne lit. */
  const [derniereCopie, setDerniereCopie] = useState<{ libelle: string; chaine: string } | null>(null);

  /* Les listes vides ne produisent pas de bouton : proposer de copier le filtre d une
     categorie sans Pokemon serait une commande qui ne fait rien. */
  const categoriesNonVides = CATEGORY_DISPLAY_ORDER.filter(
    (k) => (entriesParCategorie[k] ?? []).length > 0,
  );

  /** Pour chaque liste non vide : son filtre complet, et son filtre shiny. */
  const propositions = categoriesNonVides.map((cle) => {
    const lot = entriesParCategorie[cle] ?? [];
    return {
      cle,
      tout: construireFiltre(lot),
      shiny: construireFiltre(lot, { seulementShiny: true }),
      entierementShiny: lot.length > 0 && lot.every((e) => e.shiny === true),
    };
  });

  async function copier(texte: string, message: string, libelle?: string) {
    try {
      await navigator.clipboard.writeText(texte);
      toast.success(message);
      if (libelle) setDerniereCopie({ libelle, chaine: texte });
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
            <p className="station" style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.9rem", color: "var(--encre)" }}>
              Filtre Pokémon GO
            </p>
            <p style={{ margin: "0 0 12px", fontSize: "0.75rem", color: "var(--encre-douce)" }}>
              À coller dans la recherche du jeu. Son propre jeu affichera ce qu&apos;il
              possède de la liste.
            </p>

            {propositions.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--encre-tres-douce)" }}>
                Ce dresseur n&apos;a encore aucun Pokémon dans ses listes.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {propositions.map(({ cle, tout, shiny, entierementShiny }) => (
                  <div key={cle}>
                    <p style={{
                      margin: "0 0 5px", fontSize: "0.75rem", fontWeight: 700,
                      color: CATEGORIES[cle].color, fontFamily: "Exo 2, sans-serif",
                    }}>
                      {CATEGORIES[cle].label}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {shiny && (
                        <button
                          type="button"
                          onClick={() => copier(
                            shiny.chaine,
                            `Filtre shiny copié, ${shiny.pokemon} Pokémon`,
                            `${CATEGORIES[cle].label} · shiny`,
                          )}
                          style={{
                            minHeight: 44, padding: "0 14px", borderRadius: 999,
                            display: "inline-flex", alignItems: "center", gap: 6,
                            border: "var(--trait-moyen) solid var(--or)",
                            background: "var(--or-pale)", color: "var(--encre)",
                            fontFamily: "Exo 2, sans-serif", fontWeight: 700,
                            fontSize: "0.8125rem", cursor: "pointer",
                          }}
                        >
                          Shiny ✨ ({shiny.pokemon})
                        </button>
                      )}
                      {/* « Tous » n'apparait que si la liste contient autre chose que des
                          shiny : sinon les deux boutons copieraient la meme selection. */}
                      {tout && !entierementShiny && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => copier(
                            tout.chaine,
                            `Filtre copié, ${tout.pokemon} Pokémon`,
                            `${CATEGORIES[cle].label} · tous`,
                          )}
                        >
                          Tous ({tout.pokemon})
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ce qui vient d'etre copie, pour qu'on puisse le verifier avant de le coller
                dans le jeu, et la longueur parce que la barre de recherche a une limite. */}
            {derniereCopie && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "var(--encre-tres-douce)" }}>
                  Copié : {derniereCopie.libelle} · {derniereCopie.chaine.length} caractères
                </p>
                <p style={{
                  margin: 0, padding: "8px 10px", background: "var(--surface-creuse)",
                  borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: "0.7rem",
                  color: "var(--encre-douce)", wordBreak: "break-all",
                }}>
                  {derniereCopie.chaine}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
