# Règles du projet — pokemongo-luckytrades

## Contexte accumulé

Avant de retoucher au matching (want/give/mirror), aux sprites/costumes, aux
fonds d'événement, ou à la pipeline de données de jeu (Google Sheet, cron
refresh-data), lire `docs/CONTEXT.md` — ça documente les bugs déjà
rencontrés et corrigés (et pourquoi), pour ne pas les réintroduire.

## Pas d'emoji sur le site

N'utilise jamais d'emoji ni de symboles décoratifs (✓, ✕, ←, →, ⚙️, 🎒, etc.) dans
le texte, les labels, les boutons, les toasts ou les titres de l'interface.
Texte brut uniquement.

**Seule exception** : le sparkle ✨ associé au mot "Shiny" (badges, filtres,
libellés de sprite, notes d'entrées) doit être conservé, à la demande explicite
de Steven.

Cette règle s'applique à tout le code de ce dépôt (composants React, pages,
scripts) écrit ou modifié à partir de maintenant.
