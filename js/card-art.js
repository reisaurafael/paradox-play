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
  "gunpowder_revolver",
  "laser_gun",
  "queen_annes_revenge_cannon",
  "gunpowder",
  "fire_lance",
  "ferguson_rifle",
  "portal_gun",
  "galileos_telescope",
  "gerardus_mercators_map",
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

// THE CLOSED FACE'S CROP: where the hero of each picture sits (object-position), so the object
// reads at shelf size when the 3:4 picture fills a card that is nearly square. The card's
// details (the desktop hover, the phone sheets) keep their own framing.
const CROP = {
  excalibur: "50% 36%",
  james_watts_steam_engine: "50% 46%",
  mona_lisa: "50% 38%",
  attilas_sword: "58% 52%",
  charlemagnes_sword: "50% 62%",
  laser_sword: "50% 48%",
  spear_of_destiny: "50% 44%",
  viking_shield: "40% 50%",
  joan_of_arcs_armor: "36% 66%",
  ching_shihs_red_flag: "50% 30%",
  gunpowder_revolver: "48% 60%",
  laser_gun: "50% 70%",
  queen_annes_revenge_cannon: "50% 64%",
  gunpowder: "50% 72%",
  fire_lance: "50% 50%",
  ferguson_rifle: "50% 70%",
  portal_gun: "50% 52%",
  galileos_telescope: "50% 50%",
  gerardus_mercators_map: "50% 74%",
};

// the <img> for a card's illustration (lazy, async, 2x for dense screens; its box is sized by CSS,
// so nothing moves when it arrives), or "" when the card has no approved art
export function cardArtImg(name, cls) {
  const id = cardArt(name);
  if (!id) return "";
  const a = `assets/cards/${id}.webp`, b = `assets/cards/${id}@2x.webp`;
  return `<img class="${cls || "card-art-img"}" src="${a}" srcset="${a} 1x, ${b} 2x" width="600" height="800" loading="lazy" decoding="async" alt="" draggable="false"${CROP[id] ? ` style="--art-pos:${CROP[id]}"` : ""}>`;
}

// THE PRICE TICKET of an illustrated card's closed face (after the owner's V2 price tags): a paper
// ticket with a scalloped stub, a milled gold coin for the gold it costs, its own shadow drawn
// under it (a shape, not a filter). The number is HTML beside it (.tk-num), so it takes the
// game's type. No ids inside: many tickets share a page.
const TICKET = "M 22 4 H 104 Q 112 4 112 12 V 46 Q 112 54 104 54 H 22 "
  + "A 6.5 6.5 0 0 1 22 41.5 A 6.5 6.5 0 0 1 22 29 A 6.5 6.5 0 0 1 22 16.5 A 6.5 6.5 0 0 1 22 4 Z";
export function cardTicket(cost) {
  // his call 29/09: not the V2 ticket, just a gold coin with the price on it
  return `<svg class="tk-svg" viewBox="0 0 40 40" aria-hidden="true">`
    + `<circle cx="21" cy="22" r="18" fill="#0b0704" opacity=".5"/>`
    + `<circle cx="20" cy="20" r="18" fill="#7a4a0c"/>`
    + `<circle cx="20" cy="20" r="17" fill="#e4a834" stroke="#5a3606" stroke-width="2" stroke-dasharray="2.1 1.7"/>`
    + `<circle cx="20" cy="20" r="12.6" fill="#f3c65a" stroke="#a8701a" stroke-width="1.4"/>`
    + `<path d="M 11 14 A 11 11 0 0 1 22 8.2" stroke="#fff4c8" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>`
    + `</svg><b class="tk-num">${cost}</b>`;
}
