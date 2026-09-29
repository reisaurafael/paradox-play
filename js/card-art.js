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
  queen_annes_revenge_cannon: "30% 62%",
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
  return `<svg class="tk-svg" viewBox="0 0 116 58" aria-hidden="true">`
    + `<path d="${TICKET}" fill="#0b0704" opacity=".5" transform="translate(2.5 4)"/>`
    + `<path d="${TICKET}" fill="#efe2bf" stroke="#2a1d0e" stroke-width="2.6"/>`
    + `<path d="M 26 36 H 106 V 46 Q 106 50 102 50 H 26 Z" fill="#b89b62" opacity=".22"/>`
    + `<g fill="none" stroke="#8a7448" opacity=".24"><circle cx="74" cy="29" r="21" stroke-width="1.4"/><circle cx="74" cy="29" r="15" stroke-width="1.1"/><circle cx="74" cy="29" r="9" stroke-width=".9"/></g>`
    + `<path d="M 25 8 H 105" stroke="#fffaf0" stroke-width="2.2" opacity=".75"/>`
    + `<path d="M 25 50.5 H 105" stroke="#4a3d22" stroke-width="2.4" opacity=".35"/>`
    + `<g transform="translate(42 29)"><circle r="13" fill="#7a4a0c"/><circle r="12" fill="#e4a834" stroke="#5a3606" stroke-width="1.6" stroke-dasharray="1.6 1.4"/>`
    + `<circle r="8.6" fill="#f3c65a" stroke="#a8701a" stroke-width="1.1"/><path d="M -5 -4.5 A 7 7 0 0 1 4 -6" stroke="#fff4c8" stroke-width="1.6" fill="none" opacity=".85"/>`
    + `<circle r="3.2" fill="none" stroke="#a8701a" stroke-width="1"/></g>`
    + `</svg><b class="tk-num">${cost}</b>`;
}
