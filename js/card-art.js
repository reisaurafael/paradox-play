/* =========================================================================
   card-art.js, THE CARD ILLUSTRATIONS that are approved to show
   -------------------------------------------------------------------------
   Only the ids in CARD_ART are ever shown (and only their files ship: the
   build prunes web/assets/cards/ to this list). A card's id is its function
   name in engine/cards.py; the files are assets/cards/<id>.webp (600x800) and
   <id>@2x.webp. A card without approved art keeps its plain face: no empty
   slot, no placeholder. Add ids here as batches are approved.
   ========================================================================= */

export const CARD_ART = new Set([
  "excalibur",
  "james_watts_steam_engine",
  "mona_lisa",
  "attilas_sword",
  "charlemagnes_sword",
  "laser_sword",
  "spear_of_destiny",
  "viking_shield",
  "joan_of_arcs_armor",
  "ching_shihs_red_flag",
]);

// the cards whose function name is not the slug of their English name
const ID_OF = {
  "The First Time Machine": "first_time_machine",
  "Agnes's Cauldron": "agnes_cauldron",
  "The First Smartphone": "first_smartphone",
  "The Divine Comedy": "divine_comedy",
  "Oppenheimer's Trinity": "trinity",
};

export function cardArtId(name) {
  if (!name) return null;
  if (ID_OF[name]) return ID_OF[name];
  return String(name).normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// the approved illustration's id for this card name, or null
export function cardArt(name) {
  const id = cardArtId(name);
  return id && CARD_ART.has(id) ? id : null;
}

// the <img> for a card's illustration (lazy, async, 2x for dense screens; its box is sized by CSS,
// so nothing moves when it arrives), or "" when the card has no approved art
export function cardArtImg(name, cls) {
  const id = cardArt(name);
  if (!id) return "";
  const a = `assets/cards/${id}.webp`, b = `assets/cards/${id}@2x.webp`;
  return `<img class="${cls || "card-art-img"}" src="${a}" srcset="${a} 1x, ${b} 2x" width="600" height="800" loading="lazy" decoding="async" alt="" draggable="false">`;
}
