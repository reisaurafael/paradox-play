/* =========================================================================
   icons.js, Paradoxo custom SVG icon set
   -------------------------------------------------------------------------
   All iconography is line-drawn SVG using currentColor, so colour comes from
   CSS. No emoji, no raster placeholders. Cohesive geometric/temporal language:
   gears, clocks, brackets, signal marks.
   ========================================================================= */

const S = (body, vb = "0 0 24 24", sw = 1.7) =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${sw}" ` +
  `stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  // CRONOS mark, a clock face fused with gear teeth + temporal hand sweep.
  seal: S(`
    <circle cx="12" cy="12" r="8.4"/>
    <path d="M12 1.6v2.2M12 20.2v2.2M1.6 12h2.2M20.2 12h2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M19.4 4.6l-1.6 1.6M6.2 17.8l-1.6 1.6"/>
    <circle cx="12" cy="12" r="2.1"/>
    <path d="M12 12l3.4-2.4M12 12l-1.4 3.6"/>`),

  // brand mark large (used in landing/topbar), orbiting temporal gear
  cronos: S(`
    <circle cx="12" cy="12" r="9.2"/>
    <circle cx="12" cy="12" r="4.4"/>
    <path d="M12 2.8V0.6M12 23.4v-2.2M2.8 12H0.6M23.4 12h-2.2M5.2 5.2 3.7 3.7M20.3 20.3l-1.5-1.5M18.8 5.2l1.5-1.5M5.2 18.8l-1.5 1.5"/>
    <path d="M12 12l4-1.2" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor"/>`, "0 0 24 24", 1.4),

  enter: S(`<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M3 12h12"/><path d="M10 8l4 4-4 4"/>`),
  play:  S(`<path d="M7 5l12 7-12 7z"/>`),
  seal2: S(`<circle cx="12" cy="12" r="8"/><path d="M9 12l2 2 4-4"/>`),

  // HELA'S SEAL, the Smugglers' Cove padlock, drawn in her language: a thin-line
  // lock whose barrel carries her motif (a slow-rotating dashed ring + a pulsing
  // core keyhole) and cardinal ticks. Projected on the curtain, not a gold badge.
  helalock: `<svg viewBox="0 0 44 52" fill="none">
    <path class="hl-shackle" d="M13 22 V16.5 a9 9 0 0 1 18 0 V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".9"/>
    <path d="M16.5 22 V16.5 a5.5 5.5 0 0 1 11 0 V22" stroke="currentColor" stroke-width=".9" stroke-linecap="round" opacity=".35"/>
    <rect x="6.5" y="22" width="31" height="24" rx="5" stroke="currentColor" stroke-width="1.7"/>
    <rect x="9.5" y="25" width="25" height="18" rx="3" stroke="currentColor" stroke-width=".8" opacity=".35"/>
    <circle class="vzs-ring" cx="22" cy="34" r="7.2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 4.5" opacity=".85"/>
    <circle class="vzs-core" cx="22" cy="33.2" r="2.7" fill="currentColor"/>
    <path d="M22 36 V39.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <g stroke="currentColor" stroke-width="1.2" opacity=".5">
      <line x1="22" y1="24" x2="22" y2="26"/><line x1="22" y1="42" x2="22" y2="44"/>
      <line x1="11.5" y1="34" x2="13.5" y2="34"/><line x1="30.5" y1="34" x2="32.5" y2="34"/></g></svg>`,

  // HELA, the helmet assistant's sigil (an AI presence: concentric rings, a
  // slow-rotating dashed ring, a pulsing core, cardinal ticks). currentColor.
  hela: `<svg viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="17.5" stroke="currentColor" stroke-width="1.1" opacity=".35"/>
    <circle class="vzs-ring" cx="20" cy="20" r="12.5" stroke="currentColor" stroke-width="1.1" stroke-dasharray="3.5 5" opacity=".8"/>
    <circle class="vzs-core" cx="20" cy="20" r="4.6" fill="currentColor"/>
    <g stroke="currentColor" stroke-width="1.5" opacity=".55">
      <line x1="20" y1="1.5" x2="20" y2="5.5"/><line x1="20" y1="34.5" x2="20" y2="38.5"/>
      <line x1="1.5" y1="20" x2="5.5" y2="20"/><line x1="34.5" y1="20" x2="38.5" y2="20"/></g></svg>`,
  log:   S(`<path d="M5 4h14M5 9h14M5 14h9M5 19h12"/>`),

  // Traveler piece, a filled armored Time Gauntlet silhouette (Infinity-Gauntlet-ish:
  // a fist + forearm cuff with knuckles and a thumb). Tinted by the player's colour.
  gauntletFill: `<svg viewBox="0 0 26 30" fill="currentColor" stroke="rgba(0,0,0,.5)" stroke-width="1">
    <path d="M5.5 29.5 L20.5 29.5 L19.5 21.5 L6.5 21.5 Z"/>
    <path d="M6.2 22.5 L19.8 22.5 L19.8 12 Q19.8 9 16.8 9 L16.8 7 Q16.8 4.6 14.3 4.6 L9.7 4.6 Q7.2 4.6 7.2 7 L7.2 9 Q6.2 9.4 6.2 11.4 Z"/>
    <circle cx="8.6" cy="9" r="1.7"/><circle cx="12" cy="8" r="1.7"/><circle cx="15.4" cy="8.6" r="1.7"/>
    <path d="M19.8 13.5 Q23 12.6 23 15.8 Q23 18.8 19.8 17.8 Z"/>
  </svg>`,

  // The Merchant's hand, a real reaching hand (forearm + palm + fingers + thumb),
  // shaded so it reads as coming toward the viewer. Long nails add the unsettling edge.
  handReach: `<svg viewBox="0 0 96 128" fill="none">
    <defs>
      <linearGradient id="mh-skin" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#ecd0b0"/><stop offset="0.55" stop-color="#b98a63"/>
        <stop offset="1" stop-color="#5e3f2b"/>
      </linearGradient>
    </defs>
    <g fill="url(#mh-skin)" stroke="#2a1710" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <rect x="32" y="-4" width="34" height="40" rx="15"/>
      <rect x="24" y="30" width="50" height="40" rx="16"/>
      <rect x="26" y="60" width="12" height="46" rx="6"/>
      <rect x="40" y="62" width="12" height="52" rx="6"/>
      <rect x="54" y="61" width="12" height="49" rx="6"/>
      <rect x="67" y="57" width="11" height="41" rx="5.5"/>
      <rect x="8" y="46" width="11" height="34" rx="5.5" transform="rotate(26 13 63)"/>
    </g>
    <g fill="#efe0d0" stroke="#2a1710" stroke-width="0.8">
      <path d="M28 104 q3 6 8 0 z"/><path d="M42 112 q3 6 8 0 z"/>
      <path d="M56 108 q3 6 8 0 z"/><path d="M68.5 96 q2.7 5 7 0 z"/>
    </g>
  </svg>`,

  // Traveler piece (upgraded), a filled Temporal Briefcase silhouette with handle.
  briefcaseFill: `<svg viewBox="0 0 26 30" fill="currentColor" stroke="rgba(0,0,0,.5)" stroke-width="1">
    <path d="M9 8 L9 6 Q9 4 11 4 L15 4 Q17 4 17 6 L17 8" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="4" y="8" width="18" height="16" rx="2"/>
  </svg>`,

  // The Merchant's wagon, an ornate bow-top vardo: a crowning pennant, a ribbed
  // (striped) canopy, a panelled body with a little door, spoked wheels + draw shaft.
  wagon: S(`
    <path d="M12 3v2"/>
    <path d="M12 3h3.1l-1 1.05 1 1.05H12"/>
    <path d="M3.4 13.4c0-5.2 3.5-8.4 8.6-8.4s8.6 3.2 8.6 8.4"/>
    <path d="M3.2 13.4h17.6"/>
    <path d="M4.9 13.4v3.5h14.2v-3.5"/>
    <path d="M7 6.7v6.7M12 5v8.4M17 6.7v6.7"/>
    <path d="M9.5 16.9v-3.1h3v3.1"/>
    <circle cx="8" cy="19" r="2.3"/><circle cx="16.6" cy="19" r="2.3"/>
    <path d="M8 16.9v4.2M5.9 19h4.2M16.6 16.9v4.2M14.5 19h4.2"/>
    <path d="M20.7 15.1l3 1.2"/>`, "0 0 26 24", 1.4),

  // Merchant, a mobile market kiosk with awning
  merchant: S(`
    <path d="M4 9h16l-1 11H5z"/>
    <path d="M4 9l1.5-4h13L20 9"/>
    <path d="M4 9c0 1.4 1.1 2.4 2.4 2.4S8.8 10.4 8.8 9M8.8 9c0 1.4 1.1 2.4 2.4 2.4S13.6 10.4 13.6 9M13.6 9c0 1.4 1.1 2.4 2.4 2.4S18.4 10.4 18.4 9"/>
    <path d="M10 20v-5h4v5"/>`),

  // Time Machine, matrix grid in a housing
  machine: S(`<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16M15 4v16M4 9h16M4 15h16"/>`),

  // Merchant's wares, decorative artifacts for the permanent wagon clutter.
  hourglass: S(`<path d="M7 3h10M7 21h10"/><path d="M8 3c0 4 8 5 8 9s-8 5-8 9"/><path d="M16 3c0 4-8 5-8 9s8 5 8 9"/>`),
  lantern: S(`<path d="M10 2h4"/><path d="M12 2v2"/><rect x="7.5" y="5" width="9" height="13" rx="2"/>
    <path d="M7.5 8h9M7.5 15h9"/><path d="M11 18h2v2.5a1 1 0 0 1-2 0z"/>`),

  // A hanging red hurricane lantern, a shaded illustration (like the gauntlet piece):
  // a painted-metal frame with a glowing amber glass globe and a wire bail handle.
  lanternFill: `<svg viewBox="0 0 28 40" fill="none">
    <defs>
      <linearGradient id="lt-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e9683f"/><stop offset=".5" stop-color="#b23a22"/><stop offset="1" stop-color="#701f10"/>
      </linearGradient>
      <radialGradient id="lt-glass" cx="0.5" cy="0.4" r="0.7">
        <stop offset="0" stop-color="#fff7d6"/><stop offset=".4" stop-color="#ffd071"/>
        <stop offset=".78" stop-color="#e8912f"/><stop offset="1" stop-color="#8f4c14"/>
      </radialGradient>
    </defs>
    <path d="M8 8 Q14 -1 20 8" stroke="#8f3320" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M10.5 4.5h7v3.2h-7z" fill="url(#lt-metal)" stroke="#521809" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M8.6 8.4h10.8l-1.7 3.4H10.3z" fill="url(#lt-metal)" stroke="#521809" stroke-width=".8" stroke-linejoin="round"/>
    <ellipse cx="14" cy="12.4" rx="7" ry="1.9" fill="url(#lt-metal)" stroke="#521809" stroke-width=".8"/>
    <path d="M8 13Q6.7 21.5 9 28h10q2.3-6.5 1-15z" fill="url(#lt-glass)" stroke="#521809" stroke-width="1" stroke-linejoin="round"/>
    <path d="M11 13.2Q10.4 21 11.6 27.8M17 13.2Q17.6 21 16.4 27.8M14 13v15" stroke="#7c2414" stroke-width=".9" opacity=".75"/>
    <path d="M14 16.5q-2.2 2.2 0 4.6q2.2-2.4 0-4.6z" fill="#fff8e2"/>
    <ellipse cx="14" cy="28.4" rx="7.6" ry="2.1" fill="url(#lt-metal)" stroke="#521809" stroke-width=".8"/>
    <path d="M8.6 28.6h10.8l-1 6.2h-8.8z" fill="url(#lt-metal)" stroke="#521809" stroke-width=".8" stroke-linejoin="round"/>
    <rect x="12.4" y="34.4" width="3.2" height="2.6" rx="1" fill="#701f10"/>
  </svg>`,
  // Tattered fortune-teller poster, a torn, faded playbill with a crystal ball,
  // a crescent moon and stars. Leans against the wagon like the reference.
  posterOraculum: `<svg viewBox="0 0 40 54" fill="none">
    <defs>
      <linearGradient id="po-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a998f"/><stop offset="1" stop-color="#296a70"/></linearGradient>
      <radialGradient id="po-ball" cx=".4" cy=".34" r=".72"><stop offset="0" stop-color="#eaf7ff"/><stop offset=".5" stop-color="#8fd2e2"/><stop offset="1" stop-color="#357c95"/></radialGradient>
    </defs>
    <path d="M2 2 L38 1 L39 50 L31 53 L20 49.5 L9 53 L1 50 Z" fill="url(#po-bg)" stroke="#173f40" stroke-width="1" stroke-linejoin="round"/>
    <path d="M3 6h34l-2.5 6h-29z" fill="#d0563a" stroke="#7a2414" stroke-width=".6" stroke-linejoin="round"/>
    <path d="M30.5 19a5 5 0 1 0 0 8a4 4 0 1 1 0-8z" fill="#f2d574"/>
    <path d="M8.5 16l1 2 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" fill="#f2d574"/>
    <circle cx="20" cy="33.5" r="9" fill="url(#po-ball)" stroke="#173f40" stroke-width=".8"/>
    <ellipse cx="16.8" cy="30.5" rx="2.4" ry="3.4" fill="#ffffff" opacity=".5"/>
    <path d="M13.5 41.5h13l2 5.5h-17z" fill="#bd852f" stroke="#6e4a1c" stroke-width=".6" stroke-linejoin="round"/>
    <path d="M6 45l6 3M34 39l-4.5 6.5" stroke="#173f40" stroke-width=".6" opacity=".35"/>
  </svg>`,

  cog: S(`<circle cx="12" cy="12" r="3.4"/>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>`),
  relic: S(`<path d="M9 21h6"/><path d="M12 21V8"/><path d="M7 8h10l-1.5-4h-7z"/><path d="M9 4l1-2h4l1 2"/>`),
  plant: S(`<path d="M9 21h6l-.6-6H9.6z"/><path d="M12 15c0-4-3-6-6-6 0 3 2 6 6 6z"/>
    <path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 15v-8"/>`),
  // The Merchant's timeless hand, long, unsettling fingers with sharp nails that
  // reach in from outside time to flip the OPEN/CLOSED sign.
  hand: S(`
    <path d="M7.4 13V5.4a1.15 1.15 0 0 1 2.3 0V11"/><path d="M7.4 4.6v.8"/>
    <path d="M9.7 11V3.8a1.15 1.15 0 0 1 2.3 0V10.6"/><path d="M9.7 3v.8"/>
    <path d="M12 10.6V4.2a1.15 1.15 0 0 1 2.3 0V10.8"/><path d="M12 3.4v.8"/>
    <path d="M14.3 10.8V5.6a1.15 1.15 0 0 1 2.3 0v7.2c0 3.4-2.1 6.2-5.7 6.2-2.2 0-3.4-1.1-4.9-2.9l-2.3-2.8a1.2 1.2 0 0 1 1.8-1.6l1.7 1.6"/>
    <path d="M14.3 4.8v.8"/>`),

  // Temporal Briefcase, a case with a temporal latch (permanent +1 slot upgrade)
  briefcase: S(`
    <rect x="3" y="7.5" width="18" height="12" rx="1.6"/>
    <path d="M8.5 7.5V5.6a1.6 1.6 0 0 1 1.6-1.6h3.8a1.6 1.6 0 0 1 1.6 1.6V7.5"/>
    <path d="M3 12.6h18"/>
    <circle cx="12" cy="12.6" r="1.5"/>`),

  // Resources
  energy: S(`<path d="M13 2L5 13h5l-1 9 8-12h-5z"/>`),
  gold:   S(`<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.2c0-1.2 1.1-1.9 2.5-1.9s2.4.6 2.4 1.7c0 2.4-4.8 1.3-4.8 3.7 0 1.1 1.1 1.8 2.5 1.8s2.5-.7 2.5-1.9"/>`),
  cp:     S(`<circle cx="12" cy="12" r="8.2"/><path d="M12 6.4l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z"/>`),
  booms:  S(`<path d="M12 3c1.6 2.6 4.4 3.4 4.4 7.2A4.4 4.4 0 0 1 12 14.6a4.4 4.4 0 0 1-4.4-4.4C7.6 6.4 10.4 5.6 12 3z"/><path d="M8 16.5c1 1.2 2.4 1.9 4 1.9s3-.7 4-1.9"/><path d="M9 20.5c.8.7 1.9 1 3 1s2.2-.3 3-1"/>`),

  // Shield, the auction's second life: a ward with an inner echo, because it is
  // a layer standing OVER the energy rather than a resource of its own.
  shield: S(`<path d="M12 2.6l7.4 2.8v6.1c0 4.6-3.1 8.2-7.4 9.9-4.3-1.7-7.4-5.3-7.4-9.9V5.4z"/><path d="M12 6.4l4.1 1.6v3.4c0 2.6-1.7 4.6-4.1 5.6-2.4-1-4.1-3-4.1-5.6V8z" opacity=".45"/>`),

  // Statuses
  wanted: S(`<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4"/><path d="M12 1.6v3M12 19.4v3M1.6 12h3M19.4 12h3"/>`),
  terminated: S(`<circle cx="12" cy="12" r="8.4"/><path d="M12 4.2v6"/><path d="M7.6 7.6a6 6 0 1 0 8.8 0"/>`),
  exploded: S(`<path d="M12 2l2.2 4.2L19 5l-1.4 4.6L22 12l-4.4 2.4L19 19l-4.8-1.2L12 22l-2.2-4.2L5 19l1.4-4.6L2 12l4.4-2.4L5 5l4.8 1.2z"/>`),
  overloaded: S(`<path d="M12 3l9 16H3z"/><path d="M12 9v5M12 16.6v.2"/>`),
  respawn: S(`<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/>`),

  // Functions / modules
  recharge: S(`<rect x="4" y="8" width="14" height="8" rx="1.5"/><path d="M18 11h2v2h-2"/><path d="M8 9l-1.5 3H9l-1.5 3"/>`),
  paradox:  S(`<path d="M12 3a9 9 0 1 1-6.4 2.6"/><path d="M12 6.5a5.5 5.5 0 1 0 3.9 1.6"/><path d="M12 10a2 2 0 1 0 1.4.6"/>`),

  // Travel, single (one chevron) vs Travel ×2 (double chevron). Distinct at a glance.
  travel:   S(`<path d="M4 12h12"/><path d="M11 7l5 5-5 5"/>`),
  travel2:  S(`<path d="M3 12h11"/><path d="M9 7l5 5-5 5"/><path d="M15 7l5 5-5 5"/>`),

  // Energy+Gold combined module (module 3), bolt fused with a coin.
  both: S(`<path d="M10 2L4 12h4l-1 8 6-9H9z"/><circle cx="16.5" cy="15.5" r="5"/><path d="M16.5 12.5v6M14.7 14.2c0-.8.8-1.2 1.8-1.2s1.7.4 1.7 1.1c0 1.4-3.4.8-3.4 2.4 0 .8.8 1.2 1.8 1.2s1.8-.5 1.8-1.2"/>`, "0 0 24 24", 1.4),

  // arrows (paradox direction / travel prompt)
  future: S(`<path d="M4 12h14M12 6l6 6-6 6"/>`),
  past:   S(`<path d="M20 12H6M12 6l-6 6 6 6"/>`),

  clock: S(`<circle cx="12" cy="12" r="8.4"/><path d="M12 7v5l3.5 2"/>`),

  // Delivery, an object dropping into the open Temporal Receptor tray.
  delivery: S(`<path d="M12 2.5v8"/><path d="M8.5 7l3.5 3.5L15.5 7"/><path d="M3.5 12.5v5a1.4 1.4 0 0 0 1.4 1.4h14.2a1.4 1.4 0 0 0 1.4-1.4v-5"/><path d="M3.5 12.5h17"/>`),

  // Merchant, a covered market wagon (travelling marketplace): a curved canvas
  // roof, a body with a stall door, two wheels and a pennant. Bold + readable.
  caravan: S(`
    <circle cx="8" cy="18.4" r="1.9"/><circle cx="16.4" cy="18.4" r="1.9"/>
    <path d="M3.5 16.3h17"/>
    <path d="M5 16.3V9.8h10.5l3 3.2v3.3"/>
    <path d="M5 9.8q5.25-4 10.5 0"/>
    <path d="M7.4 16.3v-3.9h4.2v3.9"/>
    <path d="M18 8.6V5.4h3l-1 1.2 1 1.2h-3"/>`, "0 0 24 24", 1.6),

  // Merchant kiosk as a physical board piece (with a flag pole + base).
  kiosk: S(`<path d="M5 10h14l-1 9H6z"/><path d="M5 10l1.4-4h11.2L19 10"/><path d="M9 19v-4h6v4"/><path d="M12 6V2.5M12 2.5h4l-1 1.5 1 1.5h-4"/>`, "0 0 24 24", 1.5),
  lock:  S(`<rect x="5" y="11" width="14" height="9" rx="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3"/>`),

  // Recycle, three chasing arrows (classic recycling mark)
  recycle: S(`<path d="M7 6l2-3.2 2 3.2"/><path d="M9 2.8C5.2 3.6 2.6 7 2.6 11"/><path d="M17.5 9.5l3.6.6-1.4 3.4"/><path d="M21 10.2c1.6 3.5.3 7.7-3.1 9.7"/><path d="M9 21.2l-3.4-1.4 1.3-3.5"/><path d="M6 19.6c-2.9-2.2-3.8-6.3-2-9.6"/>`, "0 0 24 24", 1.4),

  // Settings / audio
  // A toothed cog: the old rays-around-a-circle read as a sun (or someone's logo), not as Settings.
  gear: S(`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`),
  sound: S(`<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>`),
  mute: S(`<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l5 6M21 9l-5 6"/>`),
  music: S(`<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>`),
  warn: S(`<path d="M12 3l10 17H2z"/><path d="M12 9v6M12 17.6v.2"/>`, "0 0 24 24", 1.8),
  close: S(`<path d="M6 6l12 12M18 6L6 18"/>`),
};

/** Return an icon's SVG markup, or an empty string if unknown. */
export function icon(name) {
  return ICONS[name] || "";
}

/** Replace all [data-icon] placeholders in a root element with their SVG. */
export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.getAttribute("data-icon");
    if (ICONS[name]) el.innerHTML = ICONS[name];
  });
}
