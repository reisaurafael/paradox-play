/* ═══════════════════════════════════════════════════════════════════════════
   THE CABIN v3, THE MANOPLA. The time machine is the traveler's own LEFT
   forearm wearing the gauntlet (worn steel, elbow valve, phosphor vitals,
   red alert), resting on the desk's bottom-left edge. Drawn top-down as
   hand-inked SVG; the REAL machine widgets are adopted onto its anatomy
   (ids/listeners intact). POSES: it RESTS on the main scene, PARKS to a
   low sliver on market/map (vitals stay glanceable), and SLIDES IN whenever
   your allocation is pending, the machine comes to you; the camera is yours.
   New layout (cabin only): drawers UL · case UR · log LL · badges LR
   (mirrored, files open UPWARD). 3 scenes: desk, market, map.
   Test mode: hotkey 0 toggles; OFF restores the default game exactly.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  /* The phase track at the top is the only place the player reads where the turn
     is. The Auction leads it because that is when it happens: the bidding opens the
     Hour, and Delivery comes after. */
  const PH_ALL=[["leilao","AUCTION"],["delivery","DELIVERY"],["market","MARKET"],["main","GENERATORS"],["activation","ACTIVATION"]];
  // The Auction step exists only in the Test Room; the classic Hour starts at Delivery.
  function phases(){ return document.body.dataset.roomMode==="leilao" ? PH_ALL : PH_ALL.slice(1); }
  const CRIT_ENERGY=6;   // life-critical below/at this, FIXED for any player count

  // Gallery hook: expose the pure SVG generators so gallery.html can render each
  // machine piece on its own. The generators are function declarations, so they are
  // hoisted and available here. Touches nothing in the running game.
  try { window.__art = { armSVG, chronoSVG, telegraphSVG, rightHandSVG, helaRadarSVG }; } catch (e) {}

  function telegraphSVG(){
    // the cell width comes from the phase count, not a fixed number, so a fifth
    // phase (the Auction) still fits on the plate
    const PH=phases(), W=392, X0=8, Y=6, H=34, N=PH.length, CW=(W-X0*2)/N;
    let cells="", ticks="";
    for(let i=0;i<N;i++){
      const x=X0+i*CW;
      cells+=`<rect x="${x+2}" y="${Y+2}" width="${CW-4}" height="${H-4}" rx="2" fill="#12100c"/>
        <text class="cb-phlab" data-i="${i}" x="${x+CW/2}" y="${Y+H/2+2.6}" text-anchor="middle" font-size="7" letter-spacing=".9" font-weight="bold" font-family="var(--f-mono,monospace)">${PH[i][1]}</text>
        <circle class="cb-jewel" data-i="${i}" cx="${x+CW/2}" cy="${Y+H-7}" r="2.6"/>`;
      if(i) ticks+=`<line x1="${x}" y1="${Y+3}" x2="${x}" y2="${Y+H-3}" stroke="#4a3e28" stroke-width="1.6"/>`;
    }
    return `<svg viewBox="0 0 ${W} 52" width="${W}" height="52">
      <rect x="2" y="${Y-4}" width="${W-4}" height="${H+8}" rx="4" fill="url(#cbSteel)" stroke="#4a3e28" stroke-width="2"/>
      <rect x="5" y="${Y-1}" width="${W-10}" height="${H+2}" rx="3" fill="none" stroke="#8a6f3c" stroke-width="1.4"/>
      ${cells}${ticks}
      <g class="cb-lever">
        <path d="M 0 ${Y+H+5} L -5 ${Y+H+11} L 5 ${Y+H+11} Z" fill="#c9a45c" stroke="#4a3a20" stroke-width=".8"/>
      </g>
      <circle cx="8" cy="${Y+H/2}" r="2.6" fill="url(#cbRivet)"/><circle cx="${W-8}" cy="${Y+H/2}" r="2.6" fill="url(#cbRivet)"/>
    </svg>`;
  }
  function chronoSVG(){
    let t=""; const rad=d=>d*Math.PI/180;
    for(let i=0;i<12;i++){ const a=rad(i*30);
      t+=`<line x1="${32+Math.sin(a)*21}" y1="${32-Math.cos(a)*21}" x2="${32+Math.sin(a)*(i%3===0?16:18.5)}" y2="${32-Math.cos(a)*(i%3===0?16:18.5)}" stroke="#2c2620" stroke-width="${i%3===0?1.8:.9}"/>`; }
    return `<svg viewBox="0 0 64 64" width="46" height="46">
      <circle cx="32" cy="32" r="31" fill="url(#cbSteel)" stroke="#4a3e28" stroke-width="1.6"/>
      <circle cx="32" cy="32" r="25.5" fill="#e8dfc6" stroke="#8a744a"/>${t}
      <g class="cb-hand" style="transform-origin:32px 32px">
        <line x1="32" y1="34" x2="32" y2="15" stroke="#1c1712" stroke-width="2.2" stroke-linecap="round"/>
      </g>
      <circle cx="32" cy="32" r="2.6" fill="#8a6f3c"/>
    </svg>`;
  }

  /* ── THE ARM v4: the same machine (ids, boxes and hit areas unchanged since v2),
        drawn in the desk's inked comic style: a loose linen sleeve cinched by the
        leather bracer that carries the red escape valve, its cuff buttoned over the
        wrist with the hextech core for a cufflink, a fingerless work glove with the
        three ERA SEALS on its back, and the gauntlet's worn casing. One light for
        everything, from the top left. The hand is shared with the right-hand cursor
        (handArtSVG), and both follow the traveller's PERSONA. ── */
  const INK="#1a110a";

  /* ── PERSONA: the traveller's arms. A build (masculine or feminine hands and
        sleeve) and a skin tone, chosen in the menu and kept in this browser. The
        drawings read the tone from CSS variables and show their build's own shapes
        (html[data-arm-build]), so a change repaints every hand at once, nothing is
        rebuilt. window.__pdxPersona = { get(), set({build, skin}), onChange(cb),
        skins (count), tones (a swatch colour per tone) }. ── */
  const SKINS=[   // light, mid, dark, cel shadow, highlight, crease: from very light to very dark
    ["#fbe5d5","#f3cab2","#dca98c","#c9937a","#fff4ec","#b57d66"],
    ["#f8d3b0","#ebb58d","#cc8f67","#b87650","#fde6cf","#a9694a"],
    ["#efc49c","#dba678","#bb8657","#a46d44","#f8dcbd","#8f5c38"],
    ["#dca676","#c28855","#9f693a","#8a572f","#eec69c","#744620"],
    ["#b98052","#9e653a","#7d4b27","#6a3d1f","#d6a172","#5a3218"],
    ["#8d5d3d","#72472b","#56321c","#472614","#b3815b","#3b2010"],
    ["#68452f","#533423","#3c2418","#2f1b11","#946a52","#28170d"],
  ];
  const SKV=["--sk-hi","--sk-mid","--sk-lo","--sk-sh","--sk-lt","--sk-cr"];
  const sk=(i)=>`var(${SKV[i]},${SKINS[1][i]})`;
  const persona=(function(){
    const KEY="pdx-persona", st={ build:"m", skin:1 }, subs=new Set();
    try{ const o=JSON.parse(localStorage.getItem(KEY)||"null");
      if(o&&(o.build==="m"||o.build==="f")) st.build=o.build;
      if(o&&Number.isInteger(o.skin)&&o.skin>=0&&o.skin<SKINS.length) st.skin=o.skin; }catch(e){}
    function apply(){
      const r=document.documentElement; if(!r) return;
      SKINS[st.skin].forEach((c,i)=>r.style.setProperty(SKV[i],c));
      r.dataset.armBuild=st.build;
    }
    apply();
    return {
      skins: SKINS.length, tones: SKINS.map(s=>s[1]),
      get(){ return { build:st.build, skin:st.skin }; },
      set(o){
        o=o||{};
        if(o.build==="m"||o.build==="f") st.build=o.build;
        if(Number.isInteger(o.skin)&&o.skin>=0&&o.skin<SKINS.length) st.skin=o.skin;
        apply();
        try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){}
        const now=this.get(); subs.forEach(cb=>{ try{ cb(now); }catch(e){} });
        return now;
      },
      onChange(cb){ subs.add(cb); return ()=>subs.delete(cb); },
    };
  })();
  try{ window.__pdxPersona=persona; }catch(e){}

  // gradients of the hand, prefixed per drawing so two hands can share a document
  function handDefs(p){
    return `<linearGradient id="${p}Skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${sk(0)}"/><stop offset=".5" style="stop-color:${sk(1)}"/><stop offset="1" style="stop-color:${sk(2)}"/></linearGradient>
  <linearGradient id="${p}Glove" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="#946744"/><stop offset=".48" stop-color="#6c462a"/><stop offset="1" stop-color="#40271a"/></linearGradient>
  <linearGradient id="${p}Brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d08a"/><stop offset=".45" stop-color="#b08640"/><stop offset="1" stop-color="#5e4420"/></linearGradient>
  <linearGradient id="${p}Linen" x1="0" y1="0" x2=".1" y2="1"><stop offset="0" stop-color="#f7f1e1"/><stop offset=".45" stop-color="#e7dcc1"/><stop offset="1" stop-color="#b9a883"/></linearGradient>
  <linearGradient id="${p}Stub" gradientUnits="userSpaceOnUse" x1="470" y1="0" x2="540" y2="0"><stop offset="0" stop-color="#e7dcc1" stop-opacity="0"/><stop offset="1" stop-color="#e7dcc1"/></linearGradient>
  <linearGradient id="${p}StubInk" gradientUnits="userSpaceOnUse" x1="470" y1="0" x2="540" y2="0"><stop offset="0" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}"/></linearGradient>`;
  }

  /* One finger seen from above: from its knuckle (bx,by) along angle a, tapering to a
     rounded tip. No drawn nails: the tip is read from its roundness and a glint. */
  function fingerSVG(p, bx, by, a, len, w, bend){
    const r=a*Math.PI/180, dx=Math.cos(r), dy=Math.sin(r), nx=-dy, ny=dx;
    // the finger curls a little toward the little finger as it relaxes
    const P=(t,s)=>{ const o=w*s+bend*t*t; return `${(bx+dx*len*t+nx*o).toFixed(1)} ${(by+dy*len*t+ny*o).toFixed(1)}`; };
    const d=`M ${P(-.04,-.5)} C ${P(.35,-.54)} ${P(.7,-.44)} ${P(.86,-.39)} C ${P(.97,-.35)} ${P(1.03,-.12)} ${P(1.02,.04)} `
      +`C ${P(1.01,.27)} ${P(.93,.45)} ${P(.82,.45)} C ${P(.64,.49)} ${P(.34,.56)} ${P(-.04,.5)} Z`;
    return `<path d="${d}" fill="url(#${p}Skin)" stroke="${INK}" stroke-width="2.6"/>
    <g pointer-events="none" fill="none" stroke-linecap="round">
      <path d="M ${P(.06,.3)} C ${P(.4,.36)} ${P(.7,.32)} ${P(.9,.22)}" style="stroke:${sk(3)}" stroke-width="${(w*.3).toFixed(1)}" opacity=".6"/>
      <path d="M ${P(.1,-.27)} C ${P(.4,-.33)} ${P(.66,-.29)} ${P(.84,-.22)}" style="stroke:${sk(4)}" stroke-width="2.4" opacity=".85"/>
      <path d="M ${P(.44,-.32)} Q ${P(.47,-.02)} ${P(.44,.28)} M ${P(.74,-.28)} Q ${P(.76,-.04)} ${P(.74,.2)}" style="stroke:${sk(5)}" stroke-width="1.5" opacity=".75"/>
      <path d="M ${P(.93,-.2)} Q ${P(.98,-.1)} ${P(.97,.02)}" stroke="#fff" stroke-width="1.6" opacity=".45"/>
    </g>`;
  }
  // the build's fingers, resting side by side: [knuckle x, y, angle, length, width, bend],
  // drawn little finger first so each lies over the next
  const FINGERS={
    m: [[660,334,10,56,19,5],[664,313,4,70,22,5],[665,291,0,76,23,4],[662,269,-5,68,22,3]],
    f: [[661,330,10,58,16,5],[665,311,4,73,18.5,5],[666,291,0,79,19.5,4],[663,271,-5,71,18.5,3]],
  };
  function thumbSVG(p){
    return `<path d="M 598 336 Q 592 326 600 318 Q 610 310 624 318 Q 648 330 660 348 Q 668 360 658 368 Q 646 376 630 368 Q 610 358 600 346 Z"
        fill="url(#${p}Skin)" stroke="${INK}" stroke-width="2.6"/>
    <g pointer-events="none" fill="none" stroke-linecap="round">
      <path d="M 606 348 Q 628 364 652 366" style="stroke:${sk(3)}" stroke-width="6" opacity=".55"/>
      <path d="M 606 322 Q 626 322 646 336" style="stroke:${sk(4)}" stroke-width="2.6" opacity=".85"/>
      <path d="M 628 326 q -4 8 -2 16" style="stroke:${sk(5)}" stroke-width="1.5" opacity=".75"/>
      <path d="M 656 352 Q 661 357 660 362" stroke="#fff" stroke-width="1.6" opacity=".45"/>
    </g>`;
  }
  function fistSVG(p){
    return `<path d="M 604 296 Q 600 258 620 246 Q 648 232 686 242 Q 718 250 728 276 Q 736 300 730 322 Q 722 346 694 352 Q 656 358 628 348 Q 606 338 604 296 Z"
          fill="url(#${p}Skin)" stroke="${INK}" stroke-width="2.6"/>
    <g pointer-events="none" fill="none" stroke-linecap="round">
      <path d="M 614 330 Q 660 352 724 320" style="stroke:${sk(3)}" stroke-width="9" opacity=".5"/>
      <path d="M 726 284 Q 700 294 670 293 M 728 308 Q 702 318 668 315 M 720 330 Q 696 340 666 336" stroke="${INK}" stroke-width="2" opacity=".7"/>
      <path d="M 648 244 Q 676 236 700 246 Q 720 254 726 272" style="stroke:${sk(4)}" stroke-width="2.8" opacity=".85"/>
      <path d="M 708 262 q 5 3 7 9 M 714 290 q 5 3 6 9 M 710 316 q 5 3 5 9" style="stroke:${sk(5)}" stroke-width="1.5"/>
    </g>
    <path d="M 612 316 Q 606 304 616 297 Q 628 290 642 298 Q 664 310 674 326 Q 680 338 672 346 Q 662 354 646 348 Q 624 340 614 328 Z"
          fill="url(#${p}Skin)" stroke="${INK}" stroke-width="2.6"/>
    <path d="M 620 334 Q 644 348 668 344" style="stroke:${sk(3)}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55" pointer-events="none"/>`;
  }

  /* The ERA SEALS on the back of the glove: the three periods of the timeline this
     traveller has mended (the case file's ORI / ASC / SIN receptor), in the
     receptor's colours. Empty, a seal is an engraved leather well; mended, it fills
     with enamel. Mend all three and the match ends, so they sit where the hand
     always is. updateMachine toggles .mended. */
  const ERA_SEALS=[["Origins","O","#b98a45"],["Ascension","A","#3f9c7c"],["Singularity","S","#7d68c2"]];
  function sealSVG(p, cx, cy, i){
    const [key, g, col]=ERA_SEALS[i];
    return `<g class="mano-seal" data-period="${key}">
    <circle cx="${cx}" cy="${cy}" r="12" fill="url(#${p}Brass)" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="${cx}" cy="${cy}" r="9.2" fill="#24160b" stroke="#3a2710" stroke-width="1.1"/>
    <circle class="ms-enamel" cx="${cx}" cy="${cy}" r="9.2" fill="${col}" opacity="0"/>
    <path class="ms-enamel" d="M ${cx-7} ${cy-2} A 7.6 7.6 0 0 1 ${cx+2} ${cy-7.4}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity="0"/>
    <text class="ms-glyph" x="${cx}" y="${cy+3.9}" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="11" fill="#8a6a3c">${g}</text>
    <path d="M ${cx-8} ${cy+8} A 11.5 11.5 0 0 0 ${cx+8} ${cy+8}" fill="none" stroke="#2a1a08" stroke-width="1.8" stroke-linecap="round" opacity=".55" pointer-events="none"/>
  </g>`;
  }

  /* The gloved hand, fingers pointing +x, palm down, thumb below. cls names the
     open/closed groups ("hand" -> .hand-open/.hand-grab); gadgets adds the era seals
     and the hextech cufflink that only the machine's hand wears. Fingers, thumb and
     fist come in both builds (.pb-m / .pb-f, shown by html[data-arm-build]). */
  function handArtSVG(p, cls, gadgets){
    const fingers=(b)=>FINGERS[b].map(f=>fingerSVG(p,...f)).join("");
    return `
  <!-- the sleeve runs on under the machine; only the right hand ever shows this stub -->
  <path d="M 470 246 Q 520 247 562 252 L 560 348 Q 520 354 470 358 Z" fill="url(#${p}Stub)" pointer-events="none"/>
  <path d="M 470 246 Q 520 247 562 252 M 560 348 Q 520 354 470 358" fill="none" stroke="url(#${p}StubInk)" stroke-width="3" pointer-events="none"/>

  <g class="${cls}-open">
    <g class="pb-m">${fingers("m")}${thumbSVG(p)}</g>
    <g class="pb-f" display="none">${fingers("f")}<g transform="translate(60 33) scale(.9)">${thumbSVG(p)}</g></g>
  </g>
  <g class="${cls}-grab"${gadgets ? ` style="display:none"` : ""}>
    <g class="pb-m">${fistSVG(p)}</g>
    <g class="pb-f" display="none"><g transform="translate(49 24) scale(.92)">${fistSVG(p)}</g></g>
  </g>

  <!-- GLOVE: back of the hand (fingerless), heavy ink under, stitched hem at the knuckles -->
  <path d="M 580 250 Q 604 244 622 246 Q 646 248 660 256 Q 668 262 670 278 Q 673 300 670 322 Q 668 336 658 342 Q 640 350 616 348 Q 594 346 584 340 Q 578 336 578 326 L 576 262 Q 576 252 580 250 Z"
        transform="translate(1.8 2.6)" fill="${INK}" pointer-events="none"/>
  <path d="M 580 250 Q 604 244 622 246 Q 646 248 660 256 Q 668 262 670 278 Q 673 300 670 322 Q 668 336 658 342 Q 640 350 616 348 Q 594 346 584 340 Q 578 336 578 326 L 576 262 Q 576 252 580 250 Z"
        fill="url(#${p}Glove)" stroke="${INK}" stroke-width="3"/>
  <g pointer-events="none">
    <path d="M 584 258 Q 612 248 646 254 Q 660 258 664 270 Q 642 262 614 264 Q 594 266 584 274 Z" fill="#c4915f" opacity=".5"/>
    <path d="M 590 256 Q 616 250 640 254" fill="none" stroke="#f0c690" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
    <path d="M 579 318 Q 622 334 669 316 L 668 326 Q 666 338 658 342 Q 640 350 616 348 Q 594 346 584 340 Q 579 336 579 326 Z" fill="#23140a" opacity=".5"/>
    <g fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".45">
      <path d="M 654 282 q -5 8 -3 16"/><path d="M 660 306 q -4 6 -2 12"/>
    </g>
    <path d="M 660 258 Q 668 268 670 282 Q 672 300 670 316 Q 668 332 658 342" fill="none" stroke="${INK}" stroke-width="2.4" opacity=".8"/>
    <path d="M 655 262 Q 663 272 665 284 Q 667 300 665 314 Q 663 328 655 336" fill="none" stroke="#e2bd86" stroke-width="1.4" stroke-dasharray="4 3" opacity=".85"/>
    <path d="M 648 254 q 6 -3 10 2 M 656 278 q 6 -2 9 3 M 658 304 q 6 -2 9 3" fill="none" stroke="#3a2414" stroke-width="2" opacity=".7"/>
  </g>
  ${gadgets ? `<!-- THE ERA SEALS, on the diagonal across the back of the hand -->
  <g id="mano-seals">${sealSVG(p,623,270,0)}${sealSVG(p,636,294,1)}${sealSVG(p,649,318,2)}</g>` : `<!-- the plain glove wears a stitched patch where the seals would be -->
  <g pointer-events="none">
    <path d="M 598 262 Q 628 266 648 300 Q 650 318 640 326 Q 616 312 598 282 Q 592 268 598 262 Z" fill="#5a3a22" opacity=".5"/>
    <path d="M 600 266 Q 626 270 644 300 Q 646 314 638 320" fill="none" stroke="#e2bd86" stroke-width="1.3" stroke-dasharray="3.5 3" opacity=".7"/>
  </g>`}
  <!-- the shirt's cuff, buttoned over the wrist and the glove's opening -->
  <path d="M 564 249 L 598 245 Q 609 244 610 254 L 612 338 Q 612 349 601 350 L 569 351 Q 560 351 560 341 L 558 259 Q 558 250 564 249 Z"
        transform="translate(1.6 2.4)" fill="${INK}" pointer-events="none"/>
  <path d="M 564 249 L 598 245 Q 609 244 610 254 L 612 338 Q 612 349 601 350 L 569 351 Q 560 351 560 341 L 558 259 Q 558 250 564 249 Z"
        fill="url(#${p}Linen)" stroke="${INK}" stroke-width="2.8"/>
  <g pointer-events="none" fill="none" stroke-linecap="round">
    <path d="M 564 254 L 604 250 M 566 345 L 606 344" stroke="#a8966f" stroke-width="1.2" stroke-dasharray="3 3"/>
    <path d="M 566 256 Q 570 300 568 342" stroke="#fffaf0" stroke-width="2.4" opacity=".7"/>
    <path d="M 561 320 Q 586 332 611 322 L 612 338 Q 612 349 601 350 L 569 351 Q 560 351 560 341 Z" fill="#8f7b58" stroke="none" opacity=".35"/>
    <path d="M 604 256 Q 607 300 605 340" stroke="${INK}" stroke-width="1.4" opacity=".35"/>
    <path d="M 586 250 Q 592 262 590 274 M 590 322 Q 596 334 594 346" stroke="#8f7b58" stroke-width="2" opacity=".6"/>
  </g>
  ${gadgets ? `<!-- the hextech core, worn as a cufflink -->
  <circle cx="581" cy="296" r="11" fill="url(#${p}Brass)" stroke="${INK}" stroke-width="2.2"/>
  <circle cx="581" cy="296" r="8.4" fill="#0a1418" stroke="#2c1d0c" stroke-width="1"/>
  <circle id="hexcore" cx="581" cy="296" r="7" fill="url(#mnHex)" opacity=".72"/>
  <path d="M 576 293 A 5 5 0 0 1 581 290" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6" pointer-events="none"/>`
  : `<circle cx="581" cy="296" r="6" fill="#efe6cf" stroke="${INK}" stroke-width="1.8"/>
  <g fill="${INK}" pointer-events="none"><circle cx="579.4" cy="294.6" r="1.1"/><circle cx="582.6" cy="297.4" r="1.1"/></g>`}`;
  }

  /* The sleeve on the forearm, per build: loose linen from the elbow, cinched by the
     bracer (tension folds fan out of the strap and the cloth puffs over its edge),
     sagging underneath, with folds that turn round the arm; it goes on under the
     machine to the cuff on the wrist. t and u move the top and bottom edges. */
  function sleeveOutline(t, u){
    return `M -800 ${234+t} C -700 ${226+t} -610 ${230+t} -540 ${242+t} C -470 ${228+t} -390 ${226+t} -330 ${244+t} `
      +`C -270 ${230+t} -200 ${232+t} -150 ${246+t} C -80 ${236+t} 20 ${240+t} 90 ${246+t} C 120 ${248+t} 140 ${242+t} 156 ${246+t} `
      +`Q 166 ${244+t} 172 ${252+t*.6} L 236 ${252+t*.6} L 236 ${360-u*.6} L 172 ${362-u*.6} Q 166 ${372-u} 154 ${368-u} `
      +`C 120 ${374-u} 60 ${390-u} -20 ${396-u} C -120 ${404-u} -200 ${410-u} -250 ${400-u} C -320 ${410-u} -380 ${408-u} -410 ${396-u} `
      +`C -480 ${404-u} -560 ${404-u} -600 ${392-u} C -680 ${398-u} -740 ${396-u} -800 ${394-u} Z`;
  }
  // a fold: a shadow wedge wide at (x0,y0), tapering to (x1,y1), lit on its upper lip
  function foldSVG(x0,y0,x1,y1,c1,c2,w){
    const d=`M ${x0} ${y0-w} C ${c1[0]} ${c1[1]-w*.6} ${c2[0]} ${c2[1]-w*.25} ${x1} ${y1} C ${c2[0]} ${c2[1]+w*.25} ${c1[0]} ${c1[1]+w*.6} ${x0} ${y0+w} Z`;
    const lip=`M ${x0} ${y0-w} C ${c1[0]} ${c1[1]-w*.6} ${c2[0]} ${c2[1]-w*.25} ${x1} ${y1}`;
    return `<path d="${d}" fill="#8a7552" opacity=".55"/>`
      +`<path d="${lip}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>`
      +`<path d="${lip}" transform="translate(3 -4)" fill="none" stroke="#fffaf0" stroke-width="2.4" stroke-linecap="round" opacity=".65"/>`;
  }
  const SLEEVE={
    m: { t: 0, u: 0, folds: [
      [164,266,-10,246,[110,258],[50,248],8], [164,292,-60,296,[100,286],[30,288],10], [164,322,-60,364,[100,332],[30,346],10], [164,348,-20,394,[110,360],[50,380],8],
      [-150,246,-250,400,[-170,300],[-210,350],11], [-330,244,-410,396,[-340,300],[-380,350],11], [-540,242,-600,392,[-540,300],[-570,350],9] ] },
    f: { t: 9, u: 13, folds: [
      [164,272,-10,256,[110,264],[50,258],7], [164,306,-60,312,[100,304],[30,306],8], [164,338,-20,378,[110,350],[50,366],7],
      [-150,255,-250,387,[-170,300],[-210,344],9], [-330,253,-410,383,[-340,300],[-380,344],9] ] },
  };
  function sleeveSVG(b){
    const S=SLEEVE[b], d=sleeveOutline(S.t,S.u);
    return `<g class="pb-${b}"${b==="f" ? ` display="none"` : ""}>
    <path d="${d}" transform="translate(1.6 2.8)" fill="${INK}" pointer-events="none"/>
    <path d="${d}" fill="url(#mnCloth)" stroke="${INK}" stroke-width="3.2"/>
    <g pointer-events="none">
      <path d="M -800 ${372-S.u} C -500 ${378-S.u} -200 ${392-S.u} 0 ${376-S.u} C 80 ${368-S.u} 130 ${358-S.u} 160 ${352-S.u}" fill="none" stroke="#6f5d40" stroke-width="22" stroke-linecap="round" opacity=".2"/>
      <path d="M -800 ${248+S.t} C -500 ${243+S.t} -200 ${250+S.t} 150 ${256+S.t}" fill="none" stroke="#a8966f" stroke-width="1.5" stroke-dasharray="8 5" opacity=".8"/>
      <path d="M -780 ${256+S.t} C -500 ${252+S.t} -240 ${258+S.t} 130 ${262+S.t}" fill="none" stroke="#fffaf0" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      ${S.folds.map(f=>foldSVG(...f)).join("")}
      <path d="M 156 ${250+S.t} q 9 6 7 16 M 156 ${366-S.u} q 9 -6 7 -16" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>
      <g stroke="${INK}" stroke-width="1.1" opacity=".22" stroke-linecap="round">
        <path d="M -330 ${396-S.u} l 9 -12 M -316 ${397-S.u} l 9 -12 M -302 ${397-S.u} l 9 -12 M -288 ${397-S.u} l 9 -12 M -60 ${392-S.u} l 9 -12 M -46 ${390-S.u} l 9 -12 M -32 ${388-S.u} l 9 -12"/>
      </g>
    </g>
  </g>`;
  }

  function armSVG(){
    return `<svg class="mano-svg" viewBox="-800 0 1580 900" width="1580" height="900" preserveAspectRatio="xMidYMax meet">
<defs>
  <linearGradient id="mnSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b959d"/><stop offset=".42" stop-color="#5e6870"/><stop offset="1" stop-color="#3a4249"/></linearGradient>
  <linearGradient id="mnSteelD" x1="0" y1="0" x2=".18" y2="1"><stop offset="0" stop-color="#58626a"/><stop offset=".55" stop-color="#3a434a"/><stop offset="1" stop-color="#262d33"/></linearGradient>
  <linearGradient id="mnSteelL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4bec5"/><stop offset="1" stop-color="#6d777f"/></linearGradient>
  <radialGradient id="mnScreen" cx=".5" cy=".38" r=".85"><stop offset="0" stop-color="#123a56"/><stop offset=".7" stop-color="#0a2135"/><stop offset="1" stop-color="#04101c"/></radialGradient>
  <radialGradient id="mnHex" cx=".4" cy=".35"><stop offset="0" stop-color="#bfeaff"/><stop offset=".55" stop-color="#4aa8d8"/><stop offset="1" stop-color="#1a4a66"/></radialGradient>
  <linearGradient id="mnAmber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c078"/><stop offset="1" stop-color="#8a6a2c"/></linearGradient>
  <linearGradient id="mnLeath" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#7a5234"/><stop offset=".5" stop-color="#553620"/><stop offset="1" stop-color="#2e1c0f"/></linearGradient>
  <linearGradient id="mnCloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5eedb"/><stop offset=".42" stop-color="#e6dabd"/><stop offset=".78" stop-color="#c7b692"/><stop offset="1" stop-color="#a5926e"/></linearGradient>
  <linearGradient id="mnValve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0573c"/><stop offset=".55" stop-color="#b3321f"/><stop offset="1" stop-color="#6e1a10"/></linearGradient>
  ${handDefs("mn")}
</defs>
<ellipse class="mano-shadow" cx="360" cy="440" rx="380" ry="44" fill="#000" opacity=".33"/>
<path class="mano-shadow" d="M -800 364 L 110 352 Q 140 356 150 372 Q 60 392 -800 398 Z" fill="#000" opacity=".22" pointer-events="none"/>

<!-- ===================== FOREARM: linen sleeve, bracer ===================== -->
<g id="arm-limb">
  <!-- REST: the straight extended forearm on the desk (no elbow in sight) -->
  <g class="limb-rest">${sleeveSVG("m")}${sleeveSVG("f")}
  </g>
  <!-- the leather bracer that carries the escape valve -->
  <path d="M 172 246 L 206 246 Q 214 246 214 254 L 216 354 Q 216 363 207 363 L 176 362 Q 168 362 168 354 L 166 254 Q 166 247 172 246 Z"
        transform="translate(1.6 2.4)" fill="${INK}" pointer-events="none"/>
  <path d="M 172 246 L 206 246 Q 214 246 214 254 L 216 354 Q 216 363 207 363 L 176 362 Q 168 362 168 354 L 166 254 Q 166 247 172 246 Z"
        fill="url(#mnLeath)" stroke="${INK}" stroke-width="2.8"/>
  <g pointer-events="none">
    <path d="M 172 250 L 204 250 Q 210 250 210 256 L 210 266 Q 190 262 170 266 L 170 256 Q 170 250 172 250 Z" fill="#b98a5c" opacity=".35"/>
    <path d="M 174 256 L 208 255 M 176 352 L 208 352" stroke="#e2bd86" stroke-width="1.3" stroke-dasharray="4 3" opacity=".7" fill="none"/>
    <path d="M 170 330 Q 190 340 214 334 L 215 354 Q 215 362 207 362 L 176 361 Q 169 361 169 354 Z" fill="#1c0f06" opacity=".35"/>
    <g fill="url(#mnBrass)" stroke="${INK}" stroke-width="1.2"><circle cx="175" cy="263" r="2.6"/><circle cx="175" cy="346" r="2.6"/></g>
  </g>
  <path d="M 218 310 Q 208 310 202 306" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  <path d="M 216 307 Q 209 307 204 304" fill="none" stroke="#6d777f" stroke-width="2" stroke-linecap="round" opacity=".7" pointer-events="none"/>
  <g id="mano-vent">
    <circle cx="192" cy="304" r="25" fill="url(#mnBrass)" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="192" cy="304" r="20.5" fill="#1b130c" stroke="#3a2a12" stroke-width="1.4"/>
    <path d="M 175 296 A 19 19 0 0 1 200 286" fill="none" stroke="#fff3cf" stroke-width="2" stroke-linecap="round" opacity=".55" pointer-events="none"/>
    <g class="vent-wheel">
      <g stroke="${INK}" stroke-width="5.6" stroke-linecap="round" opacity=".9"><line x1="192" y1="289" x2="192" y2="319"/><line x1="179" y1="296.5" x2="205" y2="311.5"/><line x1="205" y1="296.5" x2="179" y2="311.5"/></g>
      <g stroke="#c2361f" stroke-width="3.4" stroke-linecap="round"><line x1="192" y1="289" x2="192" y2="319"/><line x1="179" y1="296.5" x2="205" y2="311.5"/><line x1="205" y1="296.5" x2="179" y2="311.5"/></g>
      <circle cx="192" cy="304" r="16" fill="none" stroke="${INK}" stroke-width="7"/>
      <circle cx="192" cy="304" r="16" fill="none" stroke="url(#mnValve)" stroke-width="4.6"/>
      <path d="M 178 297 A 16 16 0 0 1 190 288" fill="none" stroke="#ffc2a8" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    </g>
    <circle cx="192" cy="304" r="5" fill="url(#mnBrass)" stroke="${INK}" stroke-width="1.4"/>
    <text x="192" y="348" text-anchor="middle" font-family="monospace" font-size="7" letter-spacing="1.5" fill="#f0dcae">ESCAPE</text>
  </g>
</g>

<!-- ===================== WRIST + GLOVED HAND (drawn under the chassis lip) ===================== -->
<g id="arm-hand" transform="translate(-36 0)">${handArtSVG("mn", "hand", true)}
</g>
<!-- the casing's shadow falls on the glove (the light is top left) -->
<path d="M 536 236 Q 552 238 562 246 L 568 350 Q 556 362 540 364 Z" fill="${INK}" opacity=".3" pointer-events="none"/>

<!-- ===================== THE PIP-BOY CHASSIS (every functional box kept) ===================== -->
<g>
  <path d="M 236 150 L 500 150 Q 530 150 534 182 L 548 402 Q 550 434 520 438 L 250 446 Q 220 447 216 414 L 204 182 Q 202 150 236 150 Z"
        transform="translate(14 18)" fill="#000" opacity=".26" pointer-events="none"/>
  <!-- the casing's thickness, lit from the top left: its wall shows on the right and below -->
  <path d="M 236 150 L 500 150 Q 530 150 534 182 L 548 402 Q 550 434 520 438 L 250 446 Q 220 447 216 414 L 204 182 Q 202 150 236 150 Z"
        transform="translate(8 10)" fill="#1e252a" stroke="${INK}" stroke-width="3.2"/>
  <path d="M 542 196 L 556 410 Q 557 440 530 446" fill="none" stroke="#5e6870" stroke-width="1.6" opacity=".5" pointer-events="none"/>
  <path d="M 236 150 L 500 150 Q 530 150 534 182 L 548 402 Q 550 434 520 438 L 250 446 Q 220 447 216 414 L 204 182 Q 202 150 236 150 Z" fill="url(#mnSteelD)" stroke="${INK}" stroke-width="3.4"/>
  <path d="M 220 436 Q 380 449 518 435 L 517 430 Q 380 443 221 430 Z" fill="#000" opacity=".25"/>
  <path d="M 236 150 L 500 150 Q 530 150 534 182 L 535 198 L 208 210 L 204 182 Q 202 150 236 150 Z" fill="url(#mnSteelL)" opacity=".4"/>
  <g pointer-events="none">
    <!-- bevel: lit top-left edge, dark lower-right edge -->
    <path d="M 214 408 L 207 184 Q 206 155 236 154 L 498 154 Q 524 154 529 176" fill="none" stroke="#d6dde2" stroke-width="1.8" opacity=".45"/>
    <path d="M 531 190 L 544 402 Q 546 430 519 434 L 252 442" fill="none" stroke="#0b0e11" stroke-width="3" opacity=".55"/>
    <!-- warm desk light licking the left flank -->
    <path d="M 209 214 L 214 380" stroke="#f3c98e" stroke-width="2.4" opacity=".22" stroke-linecap="round"/>
    <!-- wear: chipped paint at the corners showing bright steel, scratches -->
    <g fill="#b9c3ca" opacity=".55">
      <path d="M 226 156 l 9 -2 l 3 3 l -7 3 Z"/><path d="M 506 154 l 10 1 l 2 4 l -9 -1 Z"/><path d="M 536 262 l 3 9 l -2 3 l -2 -8 Z"/>
      <path d="M 541 360 l 2 10 l -2 2 l -1 -9 Z"/><path d="M 226 428 l 10 3 l -2 3 l -8 -2 Z"/><path d="M 470 440 l 12 -1 l -1 3 l -10 1 Z"/>
      <path d="M 208 250 l 2 8 l -2 2 Z"/>
    </g>
    <g stroke="#c7d0d6" stroke-width="1" opacity=".3" stroke-linecap="round">
      <path d="M 258 428 l 22 -3"/><path d="M 500 166 l 16 2"/><path d="M 219 300 l 3 26"/><path d="M 404 436 l 18 -2"/><path d="M 528 330 l 2 16"/>
    </g>
    <!-- the maker's mark, engraved in the top band -->
    <text x="372" y="167.6" text-anchor="middle" font-family="monospace" font-size="6.4" letter-spacing="2.2" fill="#b9c3ca" opacity=".32">C.R.O.N.O.S. TEMPORAL GAUNTLET MK II</text>
    <text x="372" y="166.6" text-anchor="middle" font-family="monospace" font-size="6.4" letter-spacing="2.2" fill="#12171b" opacity=".75">C.R.O.N.O.S. TEMPORAL GAUNTLET MK II</text>
  </g>
  <g fill="#2b3238" stroke="${INK}" stroke-width="1.2"><circle cx="224" cy="176" r="3.8"/><circle cx="236" cy="426" r="3.8"/><circle cx="522" cy="418" r="3.8"/><circle cx="510" cy="176" r="3.8"/></g>
  <g stroke="#9aa5ad" stroke-width="1.2" pointer-events="none"><path d="M 221.6 177.8 l 4.8 -3.6 M 233.6 427.8 l 4.8 -3.6 M 519.6 419.8 l 4.8 -3.6 M 507.6 177.8 l 4.8 -3.6"/></g>
  <path d="M 240 158 L 498 158 Q 522 158 525 182 L 539 400 Q 541 426 517 430 L 253 438 Q 228 439 225 412 L 212 184 Q 210 158 240 158 Z"
        fill="none" stroke="#8b959d" stroke-width="1.2" opacity=".22"/>
  <path d="M 262 188 Q 340 182 470 186 Q 400 192 264 196 Z" fill="#bfe8d0" opacity=".05"/>
  <g>
    <rect x="246" y="172" width="252" height="164" rx="13" fill="#0c1013" stroke="${INK}" stroke-width="3.4"/>
    <rect x="243.5" y="169.5" width="257" height="169" rx="15" fill="none" stroke="url(#mnBrass)" stroke-width="1.6" opacity=".8" pointer-events="none"/>
    <rect id="mano-screen" x="254" y="180" width="236" height="148" rx="9" fill="url(#mnScreen)" stroke="#08161f" stroke-width="2"/>
    <rect x="257" y="183" width="230" height="142" rx="7" fill="none" stroke="#000" stroke-width="5" opacity=".28"/>
    <rect x="258" y="184" width="228" height="140" rx="7" fill="none" stroke="#2f7a4e" stroke-width="1.4" opacity=".5"/>
    <path d="M 252 173 L 492 173" stroke="#8b959d" stroke-width="1.5" opacity=".45"/>
    <path d="M 258 186 L 380 186 L 300 322 L 258 322 Z" fill="#ffffff" opacity=".035"/>
  </g>
  <circle cx="228" cy="196" r="9" fill="url(#mnSteelL)" stroke="${INK}" stroke-width="2"/><line x1="228" y1="190" x2="228" y2="196" stroke="${INK}" stroke-width="1.6"/>
  <path d="M 222 192 A 7 7 0 0 1 228 189" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".5" pointer-events="none"/>
  <g id="mano-boomg">
    <rect x="500" y="190" width="32" height="138" rx="6" fill="#0e1216" stroke="#1a2025" stroke-width="2.6"/>
    <rect class="bseg" data-z="g" x="504" y="313.4" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="g" x="504" y="302.8" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="g" x="504" y="292.2" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="g" x="504" y="281.6" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="g" x="504" y="271.0" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="g" x="504" y="260.4" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="a" x="504" y="249.8" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="a" x="504" y="239.2" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="a" x="504" y="228.6" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="r" x="504" y="218.0" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="r" x="504" y="207.4" width="24" height="8" rx="2"/>
    <rect class="bseg" data-z="r" x="504" y="196.8" width="24" height="8" rx="2"/>
    <circle id="boom-lamp" cx="516" cy="180" r="7" fill="#33110c" stroke="#1a2025" stroke-width="2.2"/>
    <text x="516" y="340" text-anchor="middle" font-family="monospace" font-size="6" letter-spacing="1.2" fill="#8b959d">BOOM</text>
  </g>
  <path d="M 212 344 L 500 340" stroke="#1a2025" stroke-width="1.4" opacity=".6"/>
  <path d="M 212 347 L 500 343" stroke="#6d777f" stroke-width="1" opacity=".25"/>
  <g stroke="#1a2025" stroke-width="3.4" opacity=".85" stroke-linecap="round">
    <line x1="466" y1="404" x2="464" y2="424"/><line x1="482" y1="404" x2="480" y2="424"/>
    <line x1="498" y1="403" x2="496" y2="423"/><line x1="514" y1="403" x2="512" y2="423"/>
  </g>
  <g stroke="#8b959d" stroke-width="1" opacity=".35" stroke-linecap="round" pointer-events="none">
    <line x1="467.6" y1="404" x2="465.6" y2="424"/><line x1="483.6" y1="404" x2="481.6" y2="424"/>
    <line x1="499.6" y1="403" x2="497.6" y2="423"/><line x1="515.6" y1="403" x2="513.6" y2="423"/>
  </g>
  <line x1="506" y1="198" x2="505" y2="318" stroke="#ffffff" stroke-width="2" opacity=".1"/>
  <rect id="tray-slot" x="250" y="346" width="150" height="46" rx="8" fill="#0e1216" stroke="#1a2025" stroke-width="2.4"/>
  <path d="M 253 391 L 397 391" stroke="#5e6870" stroke-width="1.4" opacity=".45"/>
  <g id="mano-keys">
    <g id="mano-clear" class="mkey">
      <rect x="408" y="350" width="42" height="38" rx="6" fill="#20262b" stroke="#1a2025" stroke-width="2.6"/>
      <rect class="mkey-cap" x="412" y="353" width="34" height="29" rx="4" fill="url(#mnSteel)" stroke="#1a2025" stroke-width="2"/>
      <text class="mkey-txt" x="429" y="371" text-anchor="middle" font-family="monospace" font-size="7" letter-spacing="1" fill="#dfe6ea" pointer-events="none">CLR</text>
      <circle class="mkey-led" cx="429" cy="394" r="2.4" stroke="#1a2025" stroke-width="1"/>
    </g>
    <g id="mano-confirm" class="mkey">
      <rect x="458" y="350" width="74" height="38" rx="6" fill="#20262b" stroke="#1a2025" stroke-width="2.6"/>
      <rect class="mkey-cap" x="462" y="353" width="66" height="29" rx="4" fill="url(#mnAmber)" stroke="#5a451f" stroke-width="2"/>
      <text class="mkey-txt" x="495" y="371" text-anchor="middle" font-family="monospace" font-size="7.5" font-weight="bold" letter-spacing="1.4" fill="#1a1206" pointer-events="none">CONFIRM</text>
      <circle class="mkey-led" cx="495" cy="394" r="2.4" stroke="#1a2025" stroke-width="1"/>
    </g>
  </g>
  <rect x="254" y="350" width="142" height="12" rx="4" fill="#000" opacity=".4"/>
  <text x="325" y="406" text-anchor="middle" font-family="monospace" font-size="6.5" letter-spacing="1.5" fill="#8b959d">GENERATORS</text>
  <g id="ticket-slot">
    <rect x="252" y="412" width="146" height="18" rx="6" fill="#171d22" stroke="#1a2025" stroke-width="2.4"/>
    <rect x="258" y="417" width="134" height="7" rx="3.5" fill="#05070a"/>
    <path d="M 258 417 L 392 417" stroke="#e2c078" stroke-width="1.2" opacity=".35"/>
    <text x="325" y="440" text-anchor="middle" font-family="monospace" font-size="5.5" letter-spacing="1.4" fill="#8b959d" opacity=".8">TIME BREACH · INSERT TICKET</text>
  </g>
</g>
</svg>`;
  }


  function build(){
    const hull=document.createElement("div");
    hull.id="hull";
    hull.innerHTML=`
    <svg width="0" height="0" style="position:absolute"><defs>
      <linearGradient id="cbSteel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b2e32"/><stop offset=".5" stop-color="#1b1e21"/><stop offset="1" stop-color="#131518"/>
      </linearGradient>
      <radialGradient id="cbRivet" cx=".35" cy=".3">
        <stop offset="0" stop-color="#8a8f94"/><stop offset="1" stop-color="#26292d"/>
      </radialGradient>
    </defs></svg>
    <!-- VISOR HUD: floating helmet readout (replaces the opaque rail) -->
    <div class="hull-rail vz-rail">
      <div class="hull-chrono vz-hour"><span class="hull-glabel" id="hull-hour-label">HOUR 1</span></div>
      <div class="vz-phases" id="vz-phases">${phases().map(([,l],i)=>`<span class="vz-ph" data-i="${i}">${l}</span>`).join('<i class="vz-sep"></i>')}</div>
      <div class="hull-station" id="hull-station"></div>
    </div>
    <!-- helmet frame: corner brackets + enclosure vignette + scanline glass -->
    <div class="vz-frame" aria-hidden="true">
      <span class="vz-cnr tl"></span><span class="vz-cnr tr"></span><span class="vz-cnr bl"></span><span class="vz-cnr br"></span>
      <span class="vz-scan"></span>
    </div>
    <div class="hull-visor" aria-hidden="true"></div>
    <!-- ENERGY HOLOGRAM: projected from the arm's hexcore into the desk wedge -->
    <div class="vz-holo" id="vz-holo" aria-hidden="true">
      <div class="vz-holo-panel">
        <span class="vz-holo-lab">LIFETHREAD</span>
        <div class="vz-holo-row">
          <svg class="vz-thread" id="vz-thread" viewBox="0 0 150 22" aria-hidden="true">
            <g class="vzt-strands" fill="none" stroke-linecap="round"></g>
          </svg>
          <span class="vz-holo-num"><b id="vz-energy-n">0</b></span>
        </div>
        <span class="vz-holo-sub" id="vz-holo-sub">STABLE</span>
      </div>
      <span class="vz-holo-base"></span>
    </div>
    <div class="hull-manopla" id="hull-manopla" data-pose="rest">
      ${armSVG()}
      <div class="mano-scan" aria-hidden="true"></div>
      <div class="mano-standby" aria-hidden="true"><span class="ms-led"></span><span class="ms-txt">STANDBY</span><span class="ms-sub">TIME MACHINE</span><span class="ms-shut"></span></div>
    </div>
    <div id="hull-console"></div>
    <div class="hand-right" id="hand-right" data-grab="0">${rightHandSVG()}</div>
    <div class="hela-radar" id="hela-radar">${helaRadarSVG()}</div>`;
    return hull;
  }


  /* ═══════════════════════════════════════════════════════════════════════════
     THE RIGHT HAND: the primary cursor. It is the LEFT hand MIRRORED (x' = 1280-x),
     so it is anatomically right in EXACTLY the same drawing (same skin, same ink,
     same leather glove and shirt cuff), but with NO gadgets (no era seals, no hextech cufflink), and
     smaller, so it hides less of the board. Rotated 38 deg about its fingertip so
     the fingers point up-left, into Hela's reticle.
     FINGERTIP = svg (538,300) = 41.1% x, 33.9% y of the viewBox. That is the
     click point, and it rides the RADAR'S CIRCUMFERENCE: never its centre.
     ═══════════════════════════════════════════════════════════════════════════ */
  function rightHandSVG(){
    return `<svg class="rh-svg" viewBox="250 90 700 620" xmlns="http://www.w3.org/2000/svg">
  <defs>${handDefs("rh")}</defs>
  <g transform="rotate(38 538 300) translate(1280 0) scale(-1 1)">${handArtSVG("rh", "rh", false)}
  </g></svg>`;
  }

  /* HELA'S RADAR, the TRUE cursor. An open reticle that rides exactly the point
     you are about to click, so the hand never hides the target. It rings, spins,
     and reads the world back to you. */
  function helaRadarSVG(){
    return `<svg viewBox="0 0 120 120" fill="none">
  <g class="hr-a"><circle cx="60" cy="60" r="47" stroke="currentColor" stroke-width="1.3" opacity=".5" stroke-dasharray="5 11"/>
    <path d="M 60 8 v6" stroke="currentColor" stroke-width="2" opacity=".9"/></g>
  <g class="hr-b">
    <circle cx="60" cy="60" r="39" stroke="currentColor" stroke-width="1" opacity=".35" stroke-dasharray="2 6"/>
    <path d="M 60 17 A 43 43 0 0 1 98 39" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M 60 103 A 43 43 0 0 1 22 81" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></g>
  <g class="hr-cross" stroke="currentColor" stroke-width="1.5" opacity=".9">
    <line x1="60" y1="36" x2="60" y2="50"/><line x1="60" y1="70" x2="60" y2="84"/>
    <line x1="36" y1="60" x2="50" y2="60"/><line x1="70" y1="60" x2="84" y2="60"/></g>
  <circle class="hr-core" cx="60" cy="60" r="3.4" stroke="currentColor" stroke-width="1.6"/>
  <g stroke="currentColor" stroke-width="1.8" opacity=".75">
    <path d="M 60 2 v7 M 60 111 v7 M 2 60 h7 M 111 60 h7"/></g>
</svg>`;
  }
  // the main menu wears the same pointer as the match (js/menu-cursor.js)
  window.__cursorArt = { radar: helaRadarSVG, hand: rightHandSVG };

  function setPhase(hull,key){
    const PH=phases(), idx=PH.findIndex(p=>p[0]===key); if(idx<0) return;
    const CW=(392-16)/PH.length, lever=hull.querySelector(".cb-lever");
    if(lever) lever.style.transform=`translateX(${8+idx*CW+CW/2}px)`;
    hull.querySelectorAll(".cb-jewel").forEach(j=>j.classList.toggle("on",+j.dataset.i===idx));
    hull.querySelectorAll(".cb-phlab").forEach(l=>l.classList.toggle("on",+l.dataset.i===idx));
    hull.querySelectorAll(".vz-ph").forEach(l=>{ const i=+l.dataset.i;
      l.classList.toggle("on", i===idx); l.classList.toggle("done", i>=0 && i<idx); });
  }
  function setHour(hull,h){
    const n=parseInt(h,10); if(isNaN(n)) return;
    const lab=hull.querySelector("#hull-hour-label"); if(lab) lab.textContent="HOUR "+n;
    const hand=hull.querySelector(".cb-hand"); if(hand) hand.style.transform=`rotate(${(n%12)*30}deg)`;
  }

  let hull=null, saved=null, obsPhase=null, obsHour=null, tick=null, hoverPeek=false, lastScene=null;
  let peekSeat=null, lastMx=-1, lastMy=-1;   // MAP-HOVER FILE PEEK state
  let lastRolled=false;                       // chart rolled up (market scene)
  let malaGold=null, malaBaseline=0, malaRewardN=0, malaContracts=[], malaBusy=false;   // THE MALETA ledger
  let origPlayEvent=null, revealed={};   // seat -> matrix (the public record after each reveal)

  function injectSeals(){
    if(!document.body.classList.contains("cabin-on")) return;
    document.querySelectorAll(".pcard.cfolio").forEach(card=>{
      const seat=card.dataset.seat, m=revealed[seat];
      const alloc=card.querySelector(".bd-alloc"); if(!alloc) return;
      const fns=alloc.querySelectorAll(".ba-fn");
      if(!m){ // secret: the allocation strip stays empty
        if(alloc.classList.contains("revealed")){
          alloc.classList.remove("revealed");
          fns.forEach(fn=>fn.querySelectorAll("b").forEach(b=>b.className=""));
        }
        return;
      }
      if(alloc.classList.contains("revealed")) return;   // fill once per reveal
      alloc.classList.add("revealed");
      for(let r=0;r<3;r++){ const row=m[r]||[0,0,0]; const bs=fns[r]?fns[r].querySelectorAll("b"):[];
        for(let c=0;c<3;c++){ const v=row[c]||0;
          if(bs[c]){ bs[c].className=v?("v"+v):""; bs[c].textContent=v?String(v):""; } } }
    });
  }
  function onGameEvent(msg){
    const k=msg.event||msg.kind||msg.type, p=msg.payload||{};
    const app0=window.__game, mine0=app0?app0.seat:null;
    if(k==="dice_rolled"){ revealed={}; if(p.seat===mine0){ vialSurge(); bitsAbsorb(); } }
    if(k==="module_resolved"&&(p.kind==="escape_valve"||p.module===0)){
      ventSteam(false);
      try{ window.__audio&&window.__audio.play("whiff"); }catch(e){}
    }
    if(k==="heated"&&p.seat===mine0) heatKick();
    if(k==="exploded"&&p.seat===mine0){ ventSteam(true); heatKick(); }
    if(k==="recharged"&&p.seat===mine0) vialSurge();
    if(k==="paradox_resolved"){
      const app=window.__game; const mine=app?app.seat:null;
      if((p.hits||[]).some(h=>h.seat===mine)){
        const visor=hull&&hull.querySelector(".hull-visor");
        if(visor){ visor.classList.remove("visor-hit"); void visor.offsetWidth; visor.classList.add("visor-hit");
          setTimeout(()=>visor&&visor.classList.remove("visor-hit"), 900); }
      }
    }
    if(k==="allocations_revealed" && p.allocations){
      const app=window.__game;
      const mine=app?app.seat:null;
      const seats=Object.keys(p.allocations).filter(x=>x!==mine);
      seats.forEach(seat=>{ revealed[seat]=p.allocations[seat].matrix; });
      // THE REVEAL, serialized: one rival's pattern stamps onto their badge at a time
      seats.forEach((seat,i)=>{
        setTimeout(()=>{
          injectSeals();
          const card=document.querySelector(`.pcard.cfolio[data-seat="${seat}"]`);
          if(card){ const el2=card.querySelector(".bd-alloc");
            if(el2&&el2.animate) el2.animate(
              [{transform:"scale(1.5)",opacity:.3},{transform:"scale(1)",opacity:1}],
              {duration:340,easing:"cubic-bezier(.2,.8,.3,1.2)"});
            const bar=card.querySelector(".badge");
            bar&&bar.animate&&bar.animate([{filter:"brightness(1.5)"},{filter:"brightness(1)"}],{duration:420});
          }
          try{ window.__audio&&window.__audio.play("dice_lock"); }catch(e){}
        }, 500+i*650);
      });
    }
  }

  /* ═══ THE MALETA CARRIES THE WEALTH (MANOPLA-ENGINE.md): gold = REAL coins
     on the case felt, CP = stamped contract papers tucked under the lid-pocket
     elastic. Coins fly in from the manopla's press; contracts stamp in; each
     contract pulls out to read. Overlay svg shares briefcase.svg's 800x500 space. ═══ */
  function cronosMarkSVG(cx, cy, r, col, w){
    // the corporation's temporal gear (same glyph as the landing mark)
    const t=r*0.24;
    return `<g stroke="${col}" stroke-width="${w}" fill="none">
      <circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${r*0.46}"/>
      <path d="M ${cx} ${cy-r-t} V ${cy-r+t*0.4} M ${cx} ${cy+r+t} V ${cy+r-t*0.4}
               M ${cx-r-t} ${cy} H ${cx-r+t*0.4} M ${cx+r+t} ${cy} H ${cx+r-t*0.4}"/>
      <path d="M ${cx} ${cy} L ${cx+r*0.4} ${cy-r*0.12}"/>
    </g>`;
  }
  function coinStackSVG(cx, baseY, n){
    let h="";
    for(let i=0;i<n;i++){
      const y=baseY-i*5.4;
      h+=`<g><ellipse cx="${cx}" cy="${y+2.2}" rx="19" ry="7" fill="#5e4622"/>
        <ellipse cx="${cx}" cy="${y}" rx="19" ry="7" fill="url(#mgCoin)" stroke="#4a3620" stroke-width="1.3"/>
        ${i===n-1?`<ellipse cx="${cx}" cy="${y}" rx="13.5" ry="4.8" fill="none" stroke="#8a6a34" stroke-width="1"/>
        <g transform="translate(${cx} ${y}) scale(1 .36)">${cronosMarkSVG(0,0,8.5,"#7a5a1e",1.6)}</g>`:``}
      </g>`;
    }
    return h;
  }
  function coinsSVG(gold){
    // the GOLD RESERVE tray: x 118-324, y 300-384 in the new case
    const stacks=Math.min(3,Math.floor(gold/5));
    const rest=Math.min(gold-stacks*5,4);
    let h=`<g id="mala-coins">`;
    const XS=[163,217,271];
    for(let k=0;k<stacks;k++) h+=coinStackSVG(XS[k],356,5);
    for(let i=0;i<rest;i++){
      const cx=152+i*32, cy=372+(i%2?-1:1);
      h+=`<ellipse cx="${cx}" cy="${cy+2}" rx="15" ry="5.6" fill="#5e4622"/>
          <ellipse cx="${cx}" cy="${cy}" rx="15" ry="5.6" fill="url(#mgCoin)" stroke="#4a3620" stroke-width="1.1"/>
          <g transform="translate(${cx} ${cy}) scale(1 .36)">${cronosMarkSVG(0,0,7,"#8a6a34",1.3)}</g>`;
    }
    if(gold>0){
      h+=`<g><rect x="272" y="306" width="44" height="20" rx="4" fill="url(#mgBrass2)" stroke="#3a2a12" stroke-width="1.6"/>
        <text x="294" y="321" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="14"
          fill="#33240f">${gold}</text></g>`;
    }
    return h+`</g>`;
  }
  function sealColors(cat){
    if(cat==="Chaos")    return ["#7a2a52","#b06090","#4a1230"];
    if(cat==="Time")     return ["#2a4e7a","#5c8cb8","#122a4a"];
    if(cat==="Resource") return ["#4a5a1e","#8ca858","#28340e"];
    return ["#8c2018","#c05a4a","#5a120c"]; // neutral / pre-session CP
  }
  function contractSVG(i, hour, rot, fresh, category){
    const [sfill,sring,sdark]=sealColors(category);
    // REAL paper now: 88x108, filed upright in the lid's left recess
    const x=160+i*66, y=88;
    return `<g class="mala-ct" data-i="${i}" transform="rotate(${rot} ${x+44} ${y+8})">
      <g class="ct-in${fresh?" ct-fresh":""}">
      <path d="M ${x} ${y} L ${x+88} ${y} L ${x+88} ${y+96} L ${x+76} ${y+108} L ${x} ${y+108} Z"
        fill="url(#mgPaper)" stroke="#5a4426" stroke-width="1.6"/>
      <path d="M ${x+88} ${y+96} L ${x+76} ${y+108} L ${x+76} ${y+96} Z" fill="#b9a678"/>
      <text x="${x+44}" y="${y+16}" text-anchor="middle" font-family="Georgia,serif" font-weight="bold"
        font-size="9.5" letter-spacing="1.2" fill="#3a2a12">C.R.O.N.O.S.</text>
      <line x1="${x+10}" y1="${y+21}" x2="${x+78}" y2="${y+21}" stroke="#8a744a" stroke-width="1"/>
      <text x="${x+44}" y="${y+30}" text-anchor="middle" font-family="monospace" font-size="5"
        letter-spacing="1.1" fill="#6a5632">TEMPORAL SERVICE CONTRACT</text>
      <g stroke="#7a6844" stroke-width="1.4" opacity=".65">
        <line x1="${x+10}" y1="${y+42}" x2="${x+78}" y2="${y+42}"/><line x1="${x+10}" y1="${y+52}" x2="${x+78}" y2="${y+52}"/>
        <line x1="${x+10}" y1="${y+62}" x2="${x+56}" y2="${y+62}"/>
      </g>
      <rect x="${x+8}" y="${y+78}" width="26" height="20" rx="2" fill="none" stroke="#8a6a3c" stroke-width="1.2"/>
      <text x="${x+21}" y="${y+92.5}" text-anchor="middle" font-family="Georgia,serif" font-size="13"
        fill="#4a3a1c" font-weight="bold">${hour??""}</text>
      <circle cx="${x+64}" cy="${y+86}" r="12.5" fill="${sfill}" stroke="${sdark}" stroke-width="1.6"/>
      <circle cx="${x+64}" cy="${y+86}" r="7.6" fill="none" stroke="${sring}" stroke-width="1.2"/>
      </g>
    </g>`;
  }
  function contractsSVG(contracts, freshIdx){
    let h=`<g id="mala-contracts">`;
    const N=contracts.length, shown=Math.min(N,3);
    for(let i=0;i<shown;i++){ const c=contracts[i];
      h+=contractSVG(i, c.hour, [-2.4,1.6,-1.2][i], i===freshIdx, c.category); }
    if(N>3) h+=`<g><rect x="322" y="176" width="52" height="24" rx="4" fill="url(#mgBrass2)" stroke="#3a2a12" stroke-width="1.6"/>
      <text x="348" y="193" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="14" fill="#33240f">\u00d7${N}</text></g>`;
    return h+`</g>`;
  }
  function lockSVG(){
    // the COMBINATION LOCK on the front rail, during the activation phase it
    // is the PASS-PRIORITY control: it spins open when the phase arrives and
    // spins shut when the traveler seals his window.
    const wheels=[7,2,9,4].map((d,i)=>{
      const wx=400+(i-1.5)*27;   // centered on the 400-centered housing
      return `<g class="lk-wheel" data-i="${i}" transform="translate(${wx} 431)">
        <rect x="-11.5" y="-9" width="23" height="18" rx="2" fill="#33240f" stroke="#6a4e26" stroke-width="1"/>
        <text class="lk-digit" y="5.5" text-anchor="middle" font-family="monospace" font-size="15"
          font-weight="bold" fill="#e8c473">${d}</text>
      </g>`;
    }).join("");
    return `<g id="mala-lock">
      <rect x="334" y="414" width="132" height="34" rx="6" fill="url(#mgBrass2)" stroke="#3a2a12" stroke-width="2.4"/>
      <rect x="346" y="420" width="108" height="22" rx="3" fill="#221808" stroke="#100a04" stroke-width="1.6"/>
      ${wheels}

    </g>`;
  }
  function malaSVG(gold, contracts, freshIdx){
    return `<svg viewBox="0 0 800 500" width="100%" height="100%">
      <defs>
        <radialGradient id="mgCoin" cx=".38" cy=".3">
          <stop offset="0" stop-color="#f2d88e"/><stop offset=".6" stop-color="#c99a4a"/><stop offset="1" stop-color="#94702e"/>
        </radialGradient>
        <linearGradient id="mgPaper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ece0c2"/><stop offset="1" stop-color="#cfbd92"/>
        </linearGradient>
        <linearGradient id="mgBrass2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8c473"/><stop offset=".45" stop-color="#a67e3c"/><stop offset="1" stop-color="#5e4622"/>
        </linearGradient>
      </defs>
      ${contractsSVG(contracts,freshIdx)}
      ${coinsSVG(gold)}
      ${lockSVG()}
    </svg>`;
  }
  /* the combination lock is the PASS-PRIORITY control during item activation:
     it spins open when the window arrives and spins shut when clicked. */
  let lockLive=false, lockCb=null, lockSpinTimer=null, deliverMode=false, deliverCb=null;
  function lockSpin(then){
    const digits=document.querySelectorAll("#mala-extra .lk-digit");
    if(!digits.length){ if(then) then(); return; }
    let t=0; clearInterval(lockSpinTimer);
    lockSpinTimer=setInterval(()=>{
      t+=1;
      digits.forEach((d,i)=>{ if(t<8+i*3) d.textContent=String((Math.random()*10)|0); });
      if(t===4){ try{ window.__audio&&window.__audio.play("dice"); }catch(e){} }
      if(t>=8+digits.length*3){ clearInterval(lockSpinTimer);
        try{ window.__audio&&window.__audio.play("dice_lock"); }catch(e){}
        if(then) then(); }
    },46);
  }
  // the wheels can SPELL: a 4-glyph word replaces the combination while a decision
  // rides the lock. null face = the combination comes home (7·2·9·4).
  function lockFace(word){
    const digits = document.querySelectorAll("#mala-extra .lk-digit");
    if (!digits.length) return;
    const target = word ? String(word).slice(0, 4).split("") : ["7", "2", "9", "4"];
    if (lockFace._cur === target.join("")) return;
    lockFace._cur = target.join("");
    try { window.__audio && window.__audio.play("dice"); } catch (e) {}
    let t = 0; clearInterval(lockFace._timer);
    lockFace._timer = setInterval(() => {
      t += 1;
      digits.forEach((d, i) => {
        if (t < 8 + i * 4) d.textContent = String((Math.random() * 10) | 0);
        else d.textContent = target[i];
      });
      if (t >= 8 + digits.length * 4){ clearInterval(lockFace._timer);
        try { window.__audio && window.__audio.play("dice_lock"); } catch (e) {} }
    }, 64);
  }
  function applyLockState(){
    const lk=document.querySelector("#mala-extra #mala-lock");
    if(lk) lk.classList.toggle("lk-live", lockLive||deliverMode);
    const lbl=document.getElementById("lk-label");
    if(lbl) lbl.textContent = deliverMode ? "FILE THE RELIC \u00b7 CLICK TO SKIP" : "HOLD PRIORITY \u00b7 CLICK TO PASS";
    const zone=document.getElementById("rucksack-zone");
    if(zone) zone.classList.toggle("deliver-lock", deliverMode);
  }
  window.__malaLock={
    setFace(word, label){ lockFace(word);
      if (label){ const lbl = document.getElementById("lk-label"); if (lbl) lbl.textContent = label; } },
    arm(cb){ lockCb=cb; lockLive=true; applyLockState(); lockFace("PASS"); },
    disarm(){ lockCb=null; lockFace(null); if(!lockLive) return; lockLive=false; applyLockState(); },
    pass(){ if(!lockCb) return; const cb=lockCb; lockCb=null; lockLive=false;
      lockFace(null); lockSpin(()=>{ applyLockState(); }); cb(); },
    deliver(on, cb){ deliverMode=!!on; deliverCb=on?cb:null; applyLockState(); lockFace(on ? "PASS" : null); },   // FILE only once something is filed
    fireDeliver(){ if(!deliverCb) return; const cb=deliverCb; deliverCb=null; deliverMode=false;
      lockSpin(()=>{ applyLockState(); }); cb(); }
  };
  function malaEl(){ return document.getElementById("mala-extra"); }
  function malaPt(sx,sy){   // overlay svg point -> viewport
    const el=malaEl(); if(!el) return null;
    const r=el.getBoundingClientRect();
    return { x:r.left+sx/800*r.width, y:r.top+sy/500*r.height };
  }
  function renderMala(freshIdx){
    const el=malaEl(); if(el==null) return;
    el.innerHTML=malaSVG(malaGold||0, malaContracts, freshIdx!=null?freshIdx:-1);
    applyLockState();
    const zone=document.getElementById("rucksack-zone");
    if(zone) zone.classList.toggle("mala-holds", (malaGold||0)>0||malaContracts.length>0);
  }
  function coinFlight(n){
    // minted coins leave the manopla's PRESS and land on the case felt
    const app=window.__game;
    const scene=app&&app.camera?app.camera.scene:"main";
    const to=malaPt(217,350);
    if(!to || scene!=="main"){ renderMala(); return; }
    const from=armPt(325,392);
    const N=Math.min(n,5);
    for(let i=0;i<N;i++){
      setTimeout(()=>{
        const c=document.createElement("div");
        c.className="mala-fly-coin";
        c.style.left=from.x+"px"; c.style.top=from.y+"px";
        document.body.appendChild(c);
        const dx=to.x-from.x+(i-N/2)*14, dy=to.y-from.y+(i%2?6:-4);
        c.animate([
          { transform:"translate(0,0) scale(.6)", opacity:1 },
          { transform:`translate(${dx*.55}px,${dy*.55-46}px) scale(1) rotate(200deg)`, offset:.55 },
          { transform:`translate(${dx}px,${dy}px) scale(.9) rotate(380deg)`, opacity:1 }
        ],{duration:460,easing:"cubic-bezier(.3,.6,.4,1)"}).onfinish=()=>{
          c.remove();
          if(i===N-1){ renderMala(); malaPop("#mala-coins"); }
        };
      }, i*95);
    }
  }
  function coinSpend(){
    // spent coins leave the case toward the market above
    const from=malaPt(217,350); renderMala();
    if(!from) return;
    for(let i=0;i<3;i++){
      const c=document.createElement("div");
      c.className="mala-fly-coin";
      c.style.left=(from.x+i*16-16)+"px"; c.style.top=from.y+"px";
      document.body.appendChild(c);
      c.animate([
        { transform:"translate(0,0) scale(.9)", opacity:1 },
        { transform:`translate(${20+i*10}px,-180px) scale(.55) rotate(300deg)`, opacity:0 }
      ],{duration:420,delay:i*70,easing:"cubic-bezier(.4,.2,.7,1)"}).onfinish=()=>c.remove();
    }
  }
  function malaPop(sel){
    const el=malaEl(); if(!el) return;
    const g=el.querySelector(sel);
    if(g&&g.animate) g.animate(
      [{transform:"scale(1.12)"},{transform:"scale(1)"}],
      {duration:220,easing:"cubic-bezier(.2,.8,.3,1.4)"});
  }
  function updateMaleta(){
    const app=window.__game; if(!app||!app.view) return;
    const me=app.view.travelers&&app.view.travelers.find(t=>t.is_self);
    if(!me) return;
    const zone=document.getElementById("rucksack-zone");
    if(zone&&!malaEl()){
      const el=document.createElement("div");
      el.id="mala-extra"; zone.appendChild(el);
    }
    const g=me.gold||0;
    const log=(app._rewardLog&&app._rewardLog[me.name])||[];
    const build=()=>{ const a=[];
      for(let i=0;i<malaBaseline;i++) a.push({hour:"",category:null,roll:null});
      for(const r of log) a.push({hour:String(r.hour),category:r.category,roll:r.roll});
      return a; };
    if(malaGold===null){                      // first sight: render silently
      malaGold=g; malaBaseline=me.contract_points||0; malaRewardN=log.length;
      malaContracts=build(); renderMala(); return;
    }
    const goldUp=g>malaGold, goldDown=g<malaGold, dGold=Math.abs(g-malaGold);
    const rewardUp=log.length>malaRewardN;
    if(g!==malaGold){ malaGold=g; if(goldUp) coinFlight(dGold); else coinSpend(); }
    if(rewardUp){ malaRewardN=log.length; malaContracts=build();
      renderMala(Math.min(malaContracts.length,3)-1); malaPop("#mala-contracts"); }
    else if(!goldUp&&!goldDown) return;
    else if(!rewardUp) renderMala();
  }
  function ctRead(idx, srcEl){
    // pull THIS contract as the thematic document, the old, loved copy. The reward
    // is signed IN WORDS (not a tier number). The wax takes the reward's colour.
    const rec=malaContracts[idx]||{hour:"",category:null,roll:null};
    const app=window.__game;
    const hour=rec.hour||"";
    const cat=rec.category;
    const rewardText=(cat && app && app._rewardText) ? app._rewardText(cat, rec.roll) : "";
    const html=`<div class="ct-doc${cat?" ct-"+cat.toLowerCase():""}">
      <div class="ct-head">C.R.O.N.O.S.</div>
      <div class="ct-sub">TEMPORAL ENFORCEMENT DIVISION &middot; FIELD OFFICE XXIII</div>
      <div class="ct-rule"></div>
      <div class="ct-title">TEMPORAL SERVICE CONTRACT</div>
      <p class="ct-body">In consideration of services rendered to the continuum,
        the bearer is credited <b>ONE (1) CONTRACT POINT</b>, payable against
        standing at the Stabilization of Tuesday.</p>
      <p class="ct-body ct-fine">Void where the past has been altered. The Division
        is not liable for versions of the bearer that no longer occurred.</p>
      ${rewardText?`<div class="ct-rendered"><label>RENDERED IN KIND</label><span>${rewardText}</span></div>`:``}
      <div class="ct-row">
        <span class="ct-stampbox">REGISTERED${hour?` &middot; HOUR ${hour}`:""}</span>
      </div>
      <div class="ct-wax"></div>
    </div>`;
    const el=srcEl||document.querySelector("#mala-extra .mala-ct[data-i='"+idx+"']");
    const rect=el?el.getBoundingClientRect():{left:innerWidth*0.28,top:innerHeight*0.4,width:0,height:0};
    if(app && app._openDocInPlace){ app._openDocInPlace(rect, html, {cls:"ct-doc-wrap"}); }
    try{ window.__audio&&window.__audio.play("quill"); }catch(e){}
  }
  function malaClick(e){
    const lk=e.target&&e.target.closest&&e.target.closest("#mala-extra #mala-lock.lk-live");
    if(lk){ e.stopPropagation();
      if(deliverMode){ window.__malaLock&&window.__malaLock.fireDeliver(); }
      else { window.__malaLock&&window.__malaLock.pass(); }
      return; }
    const ct=e.target&&e.target.closest&&e.target.closest("#mala-extra .mala-ct");
    if(!ct) return;
    e.stopPropagation();
    ctRead(+ct.dataset.i||0, ct);
  }
  const ORGAN_TIP={
    "mano-screen": "THE SCREEN: your causality matrix; place this hour's dice into the modules",
    "mano-vent":   "ESCAPE VALVE: takes one spare die; while a function is shut it drains that die in energy",
    "mano-boomg":  "BOOM GAUGE: pressure 0-12; at 12 the motor detonates",
    "hexcore":     "HEXTECH CORE: the reality simulator's heart",
    "mano-seals":  "ERA SEALS: the periods of the timeline you have mended (Origins, Ascension, Singularity); mend all three and the match ends",
    "tray-slot":   "GENERATORS: the qutrit dice condensed for this hour",
    "mano-clear":  "CLEAR: sweep the dice back to the tray",
    "mano-confirm":"CONFIRM: seal this hour's allocation"
  };
  function manoTipEl(){
    let t=document.getElementById("mano-tip");
    if(!t){ t=document.createElement("div"); t.id="mano-tip"; document.body.appendChild(t); }
    return t;
  }
  let mhOrgan=null, mhRaf=0, mhX=0, mhY=0;
  function manoHover(e){
    // ALLOCATION IS A CLEAN MOMENT: no floating organ tips while dice are in hand
    // (the legend lives on TAB now, the deepest info rung, on demand only).
    if(document.body.classList.contains("allocating")){ manoHoverOff(); return; }
    const g=e.target&&e.target.closest&&e.target.closest("#mano-screen,#mano-vent,#mano-boomg,#hexcore,#mano-seals,#tray-slot,#mano-clear,#mano-confirm");
    const t=manoTipEl();
    if(!g){ if(mhOrgan){ mhOrgan=null; t.classList.remove("on"); } return; }
    // PERF: this used to write left/top on EVERY mousemove, both are LAYOUT
    // properties, so each pointer frame forced a layout and repainted the pip-boy.
    // Write a transform (the compositor does that for free) and only touch the DOM
    // when something actually changed.
    if(mhOrgan!==g.id){ mhOrgan=g.id; t.textContent=ORGAN_TIP[g.id]||""; t.classList.add("on"); }
    mhX=Math.min(e.clientX+16, window.innerWidth-330);
    mhY=Math.max(12, e.clientY-40);
    if(!mhRaf) mhRaf=requestAnimationFrame(()=>{ mhRaf=0;
      t.style.transform=`translate3d(${mhX}px, ${mhY}px, 0)`; });
  }
  function manoHoverOff(){ mhOrgan=null; const t=document.getElementById("mano-tip"); if(t) t.classList.remove("on"); }
  function wireKeys(){
    if(!hull) return;
    const fwd=(sel,guard)=>{
      const b=document.querySelector("#hull-console .dice-actions "+sel);
      if(b&&document.body.classList.contains("allocating")&&(!guard||!b.disabled)) b.click();
    };
    const c=document.getElementById("mano-clear"), k=document.getElementById("mano-confirm");
    if(c) c.addEventListener("click",()=>{ fwd(".btn:first-child",false);
      try{ window.__audio&&window.__audio.play("whiff"); }catch(e){} });
    if(k) k.addEventListener("click",()=>fwd(".btn.btn-primary",true));
  }
  /* ── EVERY EVENT HAS AN ORGAN OF ORIGIN (MANOPLA-ENGINE.md) ── */
  /* ── THE TICKET SLOT: drag a theater ticket from the case into the pip-boy;
        the machine swallows it, tears it, and schedules the time breach. ── */
  function mountTicketDrop(){
    const consoleEl=document.getElementById("hull-console");
    if(!consoleEl||document.getElementById("ticket-drop")) return;
    const td=document.createElement("div");
    td.id="ticket-drop";
    consoleEl.appendChild(td);
    td.addEventListener("dragover",(e)=>{ e.preventDefault(); td.classList.add("hot");
      try{ e.dataTransfer.dropEffect="move"; }catch(err){} });
    td.addEventListener("dragleave",()=>td.classList.remove("hot"));
    td.addEventListener("drop",(e)=>{
      e.preventDefault(); td.classList.remove("hot");
      const app=window.__game;
      let kind=null;
      try{ kind=e.dataTransfer.getData("text/voucher")||null; }catch(err){}
      if(!kind&&app) kind=app._dragVoucher||null;
      if(!kind||!app) return;
      // The same reader takes both tickets: an Auction lot ticket (`lot:H123`) goes
      // in the same mouth as a classic voucher. Only what the machine does after
      // reading it changes.
      if(kind.indexOf("lot:")===0){
        const id=kind.slice(4);
        const took=window.__lfUseTicket&&window.__lfUseTicket(id);
        if(took) ticketSuck(e.clientX, e.clientY, "item");
        return;
      }
      ticketSuck(e.clientX, e.clientY, kind);
      app.activateVoucher(kind);
    });
  }
  function ticketSuck(x, y, kind){
    if(!hull) return;
    const mouth=armPt(325,421);
    const col={solo:"#2e6b4f",market:"#7a3a8a",item:"#8a5a1e"}[kind]||"#7a5330";
    const t=document.createElement("div");
    t.className="tkt-suck";
    t.style.left=(x-46)+"px"; t.style.top=(y-14)+"px";
    t.style.setProperty("--tk", col);
    t.innerHTML=`<span></span>`;
    document.body.appendChild(t);
    const dx=mouth.x-x, dy=mouth.y-y;
    t.animate([
      { transform:"translate(0,0) rotate(-4deg) scaleY(1)", opacity:1 },
      { transform:`translate(${dx*.7}px,${dy*.7}px) rotate(3deg) scaleY(.8)`, opacity:1, offset:.55 },
      { transform:`translate(${dx}px,${dy}px) rotate(0deg) scaleY(.08) scaleX(.55)`, opacity:.9 }
    ],{duration:520,easing:"cubic-bezier(.5,.1,.8,1)"}).onfinish=()=>{
      t.remove();
      // the tear: two stub halves spit sideways off the slot mouth
      for(const sgn of [-1,1]){
        const h=document.createElement("div");
        h.className="tkt-shred"; h.style.left=(mouth.x-8+sgn*6)+"px"; h.style.top=(mouth.y-4)+"px";
        h.style.setProperty("--tk", col);
        document.body.appendChild(h);
        h.animate([
          { transform:"translate(0,0) rotate(0deg)", opacity:.95 },
          { transform:`translate(${sgn*26}px, 18px) rotate(${sgn*80}deg)`, opacity:0 }
        ],{duration:420,easing:"ease-out"}).onfinish=()=>h.remove();
      }
      // the machine PROCESSES the breach: screen strobes + phosphor notice
      const scr=document.getElementById("mano-screen");
      if(scr&&scr.animate) scr.animate(
        [{filter:"brightness(1)"},{filter:"brightness(2.3) hue-rotate(14deg)",offset:.25},
         {filter:"brightness(.5)",offset:.5},{filter:"brightness(1.6)",offset:.72},{filter:"brightness(1)"}],
        {duration:900,easing:"steps(8,end)"});
      const note=document.createElement("div");
      note.className="mano-breach";
      note.textContent="TIME BREACH SCHEDULED";
      document.body.appendChild(note);
      const sp=armPt(372,254);
      note.style.left=sp.x+"px"; note.style.top=sp.y+"px";
      note.animate([{opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.8},{opacity:0}],
        {duration:1500}).onfinish=()=>note.remove();
      try{ window.__audio&&window.__audio.play("whiff"); setTimeout(()=>{try{window.__audio.play("dice");}catch(e){}},180); }catch(e){}
    };
  }
  function ventSteam(big){
    if(!hull) return;
    const v=armPt(192,278);
    const n=big?5:3;
    for(let i=0;i<n;i++){
      const w=document.createElement("div");
      w.className="mano-steam";
      w.style.left=(v.x-6+i*7-(n*3))+"px"; w.style.top=(v.y-8)+"px";
      document.body.appendChild(w);
      w.animate([
        { transform:"translateY(0) scale(.5)", opacity:.85 },
        { transform:`translateY(-${34+i*10}px) translateX(${(i%2?8:-6)}px) scale(${big?2.2:1.5})`, opacity:0 }
      ],{duration:620+i*90, delay:i*70, easing:"ease-out"}).onfinish=()=>w.remove();
    }
  }
  function bitsAbsorb(){
    // the MATRIX condenses this hour's reality into dice: bits rain off the
    // screen and are swallowed by the tray, where the numerals crystallize
    if(!hull) return;
    if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for(let i=0;i<16;i++){
      const from=armPt(254+Math.random()*236, 185+Math.random()*140);
      const to=armPt(262+Math.random()*130, 366);
      const w=document.createElement("div");
      w.className="mano-bit"; w.textContent=Math.random()<.5?"0":"1";
      w.style.left=from.x+"px"; w.style.top=from.y+"px";
      document.body.appendChild(w);
      const dx=to.x-from.x, dy=to.y-from.y;
      w.animate([
        {transform:"translate(0,0) scale(1)", opacity:0},
        {opacity:.95, offset:.2},
        {transform:`translate(${dx*.6}px,${dy*.55}px) scale(.9)`, opacity:.9, offset:.6},
        {transform:`translate(${dx}px,${dy}px) scale(.4)`, opacity:0}
      ],{duration:520+Math.random()*260, delay:i*38, easing:"cubic-bezier(.4,.1,.7,1)"}).onfinish=()=>w.remove();
    }
    const tray=document.getElementById("tray-slot");
    if(tray&&tray.animate) tray.animate(
      [{filter:"none"},{filter:"drop-shadow(0 0 10px rgba(95,208,138,.8))"},{filter:"none"}],
      {duration:900, delay:250});
  }
  function vialSurge(){
    if(!hull) return;
    const scr=document.getElementById("mano-screen");
    if(scr&&scr.animate) scr.animate([{filter:"brightness(1)"},{filter:"brightness(1.7)"},{filter:"brightness(1)"}],{duration:480});
    const hx=document.getElementById("hexcore");
    if(hx&&hx.animate) hx.animate([{opacity:.6},{opacity:1},{opacity:.6}],{duration:480});
    try{ window.__audio&&window.__audio.play("dice"); }catch(e){}
  }
  function heatKick(){
    if(!hull) return;
    const bg=document.getElementById("mano-boomg");
    if(bg&&bg.animate) bg.animate([{filter:"brightness(1)"},{filter:"brightness(1.9)"},{filter:"brightness(1)"}],{duration:380});
    const lit=document.querySelectorAll("#mano-boomg .bseg.on");
    const last=lit[lit.length-1];
    if(last&&last.animate) last.animate([{opacity:1},{opacity:.15},{opacity:1},{opacity:.15},{opacity:1}],{duration:560});
  }
  function onSkinWarp(){
    // the era swap IS the manopla's gesture: the CRT flickers as it re-projects
    if(!hull) return;
    const scr=document.getElementById("mano-screen");
    if(scr&&scr.animate) scr.animate(
      [{filter:"brightness(1)"},{filter:"brightness(2.2) hue-rotate(20deg)",offset:.3},
       {filter:"brightness(.4)",offset:.55},{filter:"brightness(1)"}],
      {duration:520,easing:"steps(6,end)"});
    try{ window.__audio&&window.__audio.play("chart_creak"); }catch(e){}
  }

  /* ── THE ARM IS THE CURSOR on the market (W) and paperwork (A) scenes:
        the WHOLE limb travels, pip-boy and all (never a detached hand) ── */
  let hcPos=null, hcTarget={x:0,y:0}, hcVX=0, hcOn=false, hcStarted=false, hcDown=false, hcRest=null, hcRot=0;
  let hcPlunge=null;   // the hand dives THROUGH the window on a purchase
  let freeCursor=false;   // derived: true whenever the LEFT hand is the cursor
  let activeHand="right"; // SPACE swaps. The RIGHT hand is the primary cursor.
  const LH_PULLBACK=8;   // the LEFT hand rises from below, so it is pulled back downward
  let hcEngageAt=0;        // the arm only starts moving after the screen went dark
  let hcSettling=0;        // and the screen re-lights only after the arm has settled
  const PLANE_W=2133, PLANE_H=1200;  // the fit-scale reference plane (app.css .cam-world/#hull)
  function v2p(x,y){ // viewport px -> plane px. The hull & cursor plane are fixed 2133x1200
    // boxes centred across and sitting on the screen's bottom edge (app.css FRAMING),
    // scaled by --fit, so mouse coords must be unprojected before they are written into
    // them. Rect-free on purpose (the perf war: no layout reads per move).
    const f=window.__pdxFit||1;
    return { x:(x-(window.innerWidth-PLANE_W*f)/2)/f,
             y:(y-(window.innerHeight-PLANE_H*f))/f };
  }
  let hcScale=1;   // read from --mano-scale when the pointer pose engages
  let hcCons=null; // the console tied to the arm while it is the pointer
  function hcFingertip(){ // middle fingertip at rest, from fixed geometry (rect-free)
    return { x: 679, y: PLANE_H-146 }; }
  window.__handNibble=function(x,y){ if(!hcOn) return;
    hcPlunge={ x:x, y:y, until: performance.now()+280 }; };
  window.__handPlunge=function(){
    // the arm dives into the dimensional window, the plane RIPPLES, and the
    // hand comes back with the goods (the card flight follows via card_bought)
    if(!hcOn) return;
    const mano=document.getElementById("hull-manopla");
    hcPlunge={ x: window.innerWidth/2, y: window.innerHeight*0.32, until: performance.now()+520 };
    if(mano) mano.classList.add("hand-grabbing");
    const rp=document.createElement("div");
    rp.className="pt-ripple";
    rp.style.left=(window.innerWidth/2)+"px"; rp.style.top=(window.innerHeight*0.33)+"px";
    document.body.appendChild(rp);
    if(rp.animate) rp.animate(
      [{transform:"translate(-50%,-50%) scale(.25)", opacity:.9},
       {transform:"translate(-50%,-50%) scale(1.5)", opacity:0}],
      {duration:620, easing:"cubic-bezier(.2,.7,.4,1)"}).onfinish=()=>rp.remove();
    else setTimeout(()=>rp.remove(),650);
    try{ window.__audio&&window.__audio.play("whiff"); setTimeout(()=>{try{window.__audio.play("dice");}catch(e){}},220); }catch(e){}
  };
  function mountHandCursor(){
    document.body.classList.add("hand-right-on");   // the right hand is primary from the first frame
    if(hcStarted) return;
    const move=e=>{ hcTarget.x=e.clientX; hcTarget.y=e.clientY; refreshHandPose(e); };
    window.addEventListener("mousemove",move,{passive:true});
    window.addEventListener("dragover",e=>{ hcTarget.x=e.clientX; hcTarget.y=e.clientY; },{passive:true});
    window.addEventListener("mousedown",()=>setHandGrab(true),true);
    window.addEventListener("mouseup",()=>setHandGrab(false),true);
    window.addEventListener("dragstart",()=>setHandGrab(true),true);
    window.addEventListener("dragend",()=>setHandGrab(false),true);
    hcStarted=true; requestAnimationFrame(hcTick);
  }
  function setHandGrab(on){ hcDown=on;
    const mano=document.getElementById("hull-manopla");
    if(mano) mano.classList.toggle("hand-grabbing", on&&hcOn);
    const rh=cRHand||(hull&&hull.querySelector("#hand-right"));
    if(rh) rh.dataset.grab=(on&&activeHand==="right")?"1":"0";
  }
  function refreshHandPose(e){
    const mano=document.getElementById("hull-manopla");
    if(!mano||!e||!e.target||!e.target.closest) return;
    const overCat=!!e.target.closest("#cat, .cat-corner");
    mano.classList.toggle("hand-petting", overCat&&hcOn&&!hcDown);
  }
  let hcAway=null;
  /* THE CURSOR IS ON TOP OF EVERYTHING, the arm included. #hull is one stacking context
     (z 60, 5000 while the arm steers), so the Herald, HELA's windows and every dialog
     painted OVER the arm on the side scenes. While the arm is the pointer it lives in the
     cursor plane (the top layer, liftCursorPlane) and it goes home to the hull, under the
     console as before, the moment it is an instrument again. Its CSS is written for both
     parents (app.css `:is(#hull, #cursor-plane)`), and the plane mirrors the hull's classes. */
  function armQ(sel){ const a=document.getElementById("hull-manopla"); return a?a.querySelector(sel):null; }
  function armHome(asCursor){
    const mano=document.getElementById("hull-manopla"), cp=document.getElementById("cursor-plane");
    if(!mano||!hull||!cp) return;
    const home=asCursor?cp:hull;
    if(mano.parentElement===home) return;
    if(asCursor) cp.insertBefore(mano, cp.firstChild);
    else hull.insertBefore(mano, hull.querySelector("#hull-console"));
  }
  // The plane is a manual popover shown in the TOP LAYER, which paints above every
  // z-index there is, today's and tomorrow's. Entering or leaving fullscreen puts the
  // page in the top layer after it, so it is lifted again then.
  function liftCursorPlane(cp){
    if(!cp.showPopover) return;          // an older browser keeps the plane's z-index
    cp.setAttribute("popover","manual");
    const lift=()=>{ try{ if(cp.matches(":popover-open")) cp.hidePopover(); cp.showPopover(); }catch(e){} };
    lift();
    document.addEventListener("fullscreenchange", lift);
  }
  let cpMirror=null;
  let hcMano=null;
  function hcTick(){
    const app=window.__game;
    if(!hcMano||!hcMano.isConnected) hcMano=document.getElementById("hull-manopla");
    const mano=hcMano;
    const scene=app&&app.camera?app.camera.scene:"main";
    // POWER DISCIPLINE: the instant the eye leaves the desk, the pip-boy screen
    // goes dark and the projected matrix/dice vanish, BEFORE the arm moves.
    const away=(scene!=="main")||(activeHand==="left")||(performance.now()<hcSettling);
    if(away!==hcAway){ hcAway=away; document.body.classList.toggle("mano-away", away); }
    // The left hand is the cursor ONLY when you have swapped to it (SPACE).
    const on=!!mano&&document.body.classList.contains("cabin-on")&&activeHand==="left";
    if(on!==hcOn){
      hcOn=on;
      armHome(on);
      document.body.classList.toggle("hand-cursor-on", on);
      if(on&&mano){
        // promote the layer NOW (don't wait for the 400ms pose tick): the
        // cursor pose brings transition:none + will-change before any write
        updatePose();
        // the instrument's scale holds in this pose too, or the arm shrinks the
        // moment it becomes the pointer. The pivot is the FINGERTIP (1509px 319px is
        // the middle finger at rest), so scaling around it keeps the finger on target.
        hcScale=parseFloat(getComputedStyle(document.documentElement)
          .getPropertyValue("--mano-scale"))||1;
        mano.style.transformOrigin="1509px 319px";
        /* The screen moves with the device, and the cost is paid ONCE here, not
           per frame: promoted with will-change on engage, the rest is compositing.
           Doing querySelector + transform on the whole console every frame without
           a layer repainted 673x405 of matrix, dice and buttons 60 times a second. */
        hcCons=hull&&hull.querySelector("#hull-console");
        if(hcCons){
          hcCons.style.transformOrigin="709px 319px";
          hcCons.style.willChange="transform";
        }
        if(!hcEngageAt||performance.now()>=hcEngageAt) hcEngageAt=performance.now()+160;
      }
      if(!on&&mano){ mano.style.transform=""; mano.style.transformOrigin=""; mano._tr=null;
        const c0=hcCons||(hull&&hull.querySelector("#hull-console"));
        if(c0){ c0.style.transform=""; c0.style.transformOrigin="";
          c0.style.willChange=""; }
        hcCons=null;
        mano.classList.remove("hand-grabbing","hand-petting"); hcPos=null; hcRot=0; }
    }
    if(on&&mano){
      if(performance.now()<hcEngageAt){ requestAnimationFrame(hcTick); return; }
      if(!hcRest||!hcPos){ hcRest=hcFingertip(); hcPos={x:hcRest.x,y:hcRest.y}; hcRot=0; }
      let tgx=hcTarget.x, tgy=hcTarget.y;
      if(hcPlunge){
        const now=performance.now();
        if(now>hcPlunge.until){ hcPlunge=null; if(mano) mano.classList.remove("hand-grabbing"); }
        else { tgx=hcPlunge.x; tgy=hcPlunge.y; }
      }
      const tp=v2p(tgx,tgy);   // mouse/plunge targets arrive in viewport px; the limb lives ON THE PLANE
      const tx=Math.max(60,Math.min(PLANE_W-30,tp.x));
      // the limb rises from below, so "behind the reticle" means BELOW the true point
      const ty=Math.max(120,Math.min(PLANE_H-30,tp.y+LH_PULLBACK));
      const dx=tx-hcPos.x;
      hcPos.x=tx; hcPos.y=ty;          // welded to the focus, like the right hand
      hcVX=hcVX*.82+dx*.05;            // only the SWAY is eased, it is still a limb
      // the limb rises straight FROM the bottom edge, always vertical
      const sway=Math.max(-2.5,Math.min(2.5,hcVX*.5));
      hcRot+=((-90+sway)-hcRot)*.22;
      const t=`translate3d(${hcPos.x-hcRest.x}px, ${hcPos.y-hcRest.y}px, 0) rotate(${hcRot}deg) scale(${hcScale})`;
      if(mano._tr!==t||mano._trCons!==hcCons){ mano._tr=t; mano._trCons=hcCons;   // write only on a move
        mano.style.transform=t;
        if(hcCons) hcCons.style.transform=t; }

    }
    drawCursor();
    requestAnimationFrame(hcTick);
  }

  /* HELA'S RETICLE owns the click point; the hand stays BEHIND it, on the rim.
     That is the whole trick: you always see what you are about to click, and the
     hand gains a plane of its own, one more layer of 2.5D. */
  let cRadar=null, cRHand=null;
  /* THE TRAVEL ORDER belongs to the MACHINE, not to the chart. The command banner
     was printed across the middle of the map, over the stars, and could not be read.
     Mirror it onto the pip-boy's screen, the device tells you your course. */
  let cmdEl=null, cmdLast="", cmdRaw=null;
  function mirrorCommand(){
    if(!hull) return;
    const con=document.getElementById("hull-console"); if(!con) return;
    if(!cmdEl||!cmdEl.isConnected){
      cmdEl=document.createElement("div"); cmdEl.id="mano-cmd"; cmdEl.className="mano-cmd";
      con.appendChild(cmdEl); cmdRaw=null; cmdLast="";
    }
    // Read the travel-order banner only from the skin that is actually on screen.
    // renderLive() runs for the on-screen skin only, so off-screen skins never clear their
    // banner; reading a stale one would pin an old order onto the CRT over the matrix.
    const rail=document.getElementById("timeline-rail");
    const sel = !rail ? null
      : rail.classList.contains("skin-sing") ? ".cc-cmd"
      : rail.classList.contains("skin-ori")  ? ".cm-cmd"
      : ".sea-cmd";
    const c = sel && rail.querySelector(sel);
    const raw = c ? c.innerHTML : "";
    if(raw===cmdRaw) return;   // every 400 ms: parse only when the chart's order changed
    cmdRaw=raw;
    let html = raw;
    // ONE INSTRUCTION: the order itself ("plot a course, up to N") is HELA's YOUR MOVE box;
    // the screen keeps only the chart's legend (free, costs, the clause, where he holds),
    // one readable line each. The plain words between them are the order: dropped.
    if(html){
      const tmp=document.createElement("div"); tmp.innerHTML=html;
      tmp.querySelectorAll(".vz-sigil,.vz-name").forEach(n=>n.remove());
      html=[...tmp.children].filter(n=>n.textContent.trim())
        .map(n=>`<div class="mc-l ${n.getAttribute("class")||""}">${n.innerHTML}</div>`).join("");
    }
    if(!html.replace(/<[^>]*>/g,"").trim()) html="";
    const live=!!html;
    if(html!==cmdLast){ cmdLast=html; cmdEl.innerHTML=html; }
    cmdEl.classList.toggle("on", live);
    document.body.classList.toggle("cmd-on", live);
  }

  // The log heading is HELA's byline, not a floating "Operations Log" caption. She keeps
  // the record, so the title reads as spoken by her, in that same spot.
  function helaLogHead(){
    const z = document.getElementById("log-zone"); if(!z) return;
    let t = z.querySelector(".zone-title"); if(!t) return;
    // Guard on her byline, not the class: the boot rebuilds this heading after it is set,
    // and a class-only guard let the old caption return. If her byline is absent, re-write it.
    if(!t.querySelector(".hlh-line")){
      t.classList.add("hela-loghead");
      // cabin.js imports nothing, game.js publishes her sigil for exactly this reason
      const sig = (window.__helaSigil && window.__helaSigil()) || "";
      t.innerHTML = `<span class="vz-sigil">${sig}</span>`
        + `<span class="vz-name">HELA</span>`
        + `<span class="hlh-line">keeping the record &middot; <b class="hlh-h">HOUR 1</b></span>`;
    }
    const b = t.querySelector(".hlh-h");
    const h = (window.__game && window.__game.view && window.__game.view.hour) || 1;
    if(b && b.textContent !== "HOUR " + h) b.textContent = "HOUR " + h;
  }
  window.__helaLogHead = helaLogHead;
  // whoever rebuilds that heading, she takes it back
  try {
    const lz = () => document.getElementById("log-zone");
    const arm = () => { const z = lz(); if(!z) return setTimeout(arm, 300);
      helaLogHead();
      new MutationObserver(() => helaLogHead()).observe(z, { childList: true, subtree: true });
    };
    arm();
  } catch(e) {}

  function drawCursor(){
    if(!hull) return;
    const live=document.body.classList.contains("cabin-on");
    if(!cRadar||!cRadar.isConnected) cRadar=document.getElementById("hela-radar");
    if(!cRHand||!cRHand.isConnected) cRHand=document.getElementById("hand-right");
    const radar=cRadar, rhand=cRHand;
    const pt=v2p(hcTarget.x, hcTarget.y);   // the duo rides the scaled cursor plane
    const x=pt.x, y=pt.y;
    if(radar){
      const showR=live && x>0 && y>0;
      if(radar._on!==showR){ radar._on=showR; radar.classList.toggle("on", showR); }
      const tr=`translate3d(${x}px, ${y}px, 0)`;
      if(radar._tr!==tr){ radar._tr=tr; radar.style.transform=tr; }   // write only on a move
    }
    if(rhand){
      const useR=live && activeHand==="right" && x>0 && y>0;
      if(rhand._on!==useR){ rhand._on=useR; rhand.classList.toggle("on", useR); }
      if(useR){
        // 1:1 with the reticle, no easing. They are ONE pointer; any lag between
        // them reads as the hand "chasing" the focus, which felt awful on the dice.
        const tr=`translate3d(${x}px, ${y}px, 0)`;
        if(rhand._tr!==tr){ rhand._tr=tr; rhand.style.transform=tr; }
      }
    }
  }
  // the game calls this the INSTANT a decision/state lands, no 400ms nap
  window.__cabinPulse=function(){ try{ updatePose(); updateVitals(); }catch(e){} };
  function updatePose(){
    if(!hull) return;
    const app=window.__game;
    const mano=document.getElementById("hull-manopla");
    // the auction lives on the same screen: allocation places dice on the
    // matrix, and the sealed bid is wired INTO the device (the physical
    // CONFIRM key presses the seal), summon it for both, or the console
    // stays dark and untouchable
    const K=app&&app.pendingReq?app.pendingReq.kind:null;
    const summon=(K==="allocate"||K==="leilao_allocate"||K==="leilao_bid"
      ||K==="leilao_aim");
    const scene=app&&app.camera?app.camera.scene:"main";
    if(scene!==lastScene){
      hoverPeek=false; lastScene=scene;
      // the scene chooses the hand again (as it used to): the RIGHT hand owns the
      // desk, the LEFT hand owns the side scenes. SPACE still overrides, until you
      // change scene again.
      const want=(scene==="main")?"right":"left";
      if(activeHand!==want){
        activeHand=want; freeCursor=(activeHand==="left");
        document.body.classList.toggle("hand-right-on", activeHand==="right");
        if(activeHand==="left"){ document.body.classList.add("mano-away","hand-cursor-on"); hcAway=true; hcEngageAt=performance.now()+240; }
        else { hcSettling=performance.now()+420; }
      }
    }
    // the device is a FIXED bench instrument: it rests on the desk scene and
    // slides DOWN out of the way on the other scenes (never a moving input).
    const cursorScene=(activeHand==="left");
    const pose=cursorScene?"cursor"
      :((scene!=="main"&&!hoverPeek)?"corner":"rest");   // recuada no cantinho
    if(mano.dataset.pose!==pose) mano.dataset.pose=pose;
    document.body.classList.toggle("allocating", summon&&scene==="main");
    // THE SCREEN STAYS ON FOR THE WHOLE GENERATORS PHASE. It used to be wired to
    // "a decision is pending", so the instant you confirmed, the pip-boy went dark and
    // took the dice with it. You seal your hand and then WATCH it resolve on the screen,
    // so the matrix stays lit until the phase itself ends. `allocating` keeps meaning
    // "you may touch it"; `gen-live` means "it is lit".
    // ...and it goes dark again at CLEAN-UP, the tail of the phase, once the last
    // travel is done and the generators come off the machines.
    document.body.classList.toggle("gen-live",
      scene==="main" && document.body.dataset.phase==="main"
      && !document.body.classList.contains("gen-cleaned"));
    const rolled=(scene==="market");
    if(rolled!==lastRolled){
      lastRolled=rolled;
      document.body.classList.toggle("chart-rolled", rolled);
      try{ window.__audio&&window.__audio.play("chart_creak"); }catch(e){}
    }
  }
  let prevAllocOn=false;
  function updateMachine(){
    if(!hull) return;
    const app=window.__game; if(!app) return;
    const me=app.view&&app.view.travelers.find(t=>t.is_self);
    if(me){
      // BOOM pressure column: segments light bottom-up, the dome lamp panics at 10+
      const segs=document.querySelectorAll("#mano-boomg .bseg");
      if(segs.length){ const b=Math.min(12,me.booms||0);
        segs.forEach((r,i)=>r.classList.toggle("on", i<b)); }
      hull.classList.toggle("mano-hot",(me.booms||0)>=10);
      const visor=hull.querySelector(".hull-visor");
      if(visor){ const en=Math.max(0,Math.min(12,me.energy||0));
        visor.style.setProperty("--visor",(0.05+en/12*0.16).toFixed(3));
        visor.classList.toggle("visor-crit",(me.booms||0)>=10); }
      // ENERGY HOLOGRAM, the reactor tube fills to energy; big number + status
      // ENERGY has NO cap in the engine (it only accumulates), so there is no "/N".
      // The tube is a 0..12 gauge (it saturates when you are rich); the NUMBER is raw.
      // CRITICAL is a FIXED threshold, energy <= 6, for ANY player count.
      const rawE=me.energy||0, enE=Math.max(0,Math.min(12,rawE)), crit=rawE<=CRIT_ENERGY;
      // HER THREAD: three spun strands; the free end frays as the hours cut you.
      const th=hull.querySelector("#vz-thread .vzt-strands");
      if(th && th.dataset.e!==enE+"|"+(crit?1:0)){
        th.dataset.e=enE+"|"+(crit?1:0);
        const W=150, frac=enE/12, xf=8+(W-16)*frac;   // fray point
        let d="";
        for(let k=0;k<3;k++){
          const ph=k*2.1, amp=1.6+k*.5;
          // the SPUN part, three strands twisted about the axis, up to the fray point
          let p=`M 8 11`;
          for(let x=14;x<=xf;x+=6){ p+=` Q ${x-3} ${11+Math.sin(x*.55+ph)*amp} ${x} ${11+Math.sin((x+3)*.55+ph)*amp*.4}`; }
          d+=`<path class="vzt-s" d="${p}"/>`;
          // the FRAYED part, loose fibers curling off where the thread ends
          if(enE<12){
            const fl=Math.min(26,(1-frac)*34), fy=11+(k-1)*4.6, cy=fy+(k-1)*5-2;
            d+=`<path class="vzt-f" d="M ${xf} 11 Q ${xf+fl*.45} ${cy} ${xf+fl} ${fy+(k-1)*2.4}"/>`;
          }
        }
        if(enE<=0) d=`<path class="vzt-cut" d="M 8 11 L 40 11 M 48 7 L 54 15 M 54 7 L 48 15"/>`;
        th.innerHTML=d;
      }
      const enN=hull.querySelector("#vz-energy-n");
      if(enN && !window.__vzTickHold && enN.textContent!==String(rawE)) enN.textContent=rawE;
      const sub=hull.querySelector("#vz-holo-sub");
      const st=rawE<=0?"CUT":crit?"BY A THREAD":rawE<=9?"WEARING":"TAUT";
      if(sub && sub.dataset.st!==st){ sub.dataset.st=st; sub.textContent=st; }
      const holo=hull.querySelector("#vz-holo");
      if(holo) holo.classList.toggle("holo-crit", crit);
      // (body.vz-crit is now owned by the HELA HUD tick, PRIMITIVE B state switch)
    }
    // ERA SEALS on the glove: the periods of the timeline this traveller has mended
    // (the case file's ORI / ASC / SIN receptor); mending all three ends the match
    const mended=(me&&me.delivered_periods)||[];
    ERA_SEALS.forEach(([key])=>{ const sl=armQ('.mano-seal[data-period="'+key+'"]');
      if(sl) sl.classList.toggle("mended", mended.includes(key)); });
    // chassis keys + escape valve live states
    const cbtn=document.querySelector("#hull-console .dice-actions .btn.btn-primary");
    hull.classList.toggle("confirm-ready", !!(cbtn&&!cbtn.disabled));
    const slotArmed=!!document.querySelector("#hull-console .escape-slot:not(.disabled)");
    hull.classList.toggle("vent-armed", slotArmed&&document.body.classList.contains("allocating"));
    hull.classList.toggle("vent-loaded", !!(app.alloc&&app.alloc.escape));
    // idle screen readout (the CRT is always ON)
    const ms=armQ(".ms-sub");
    if(ms&&me){ const c=me.century; const era=c<=10?"ORIGINS":c<=20?"ASCENSION":"SINGULARITY";
      const hr=(app.view&&app.view.hour!=null)?app.view.hour:"?";
      const txt=era+" \u00b7 HOUR "+hr;
      if(ms.textContent!==txt) ms.textContent=txt; }
    // a function shut by an overload says so on the idle screen until it opens again
    const msh=armQ(".ms-shut"), shut=app.shutRows?app.shutRows():null;
    if(msh){ const names=shut?[...shut.rows].sort().map(r=>["RECHARGE","PARADOX","TRAVEL"][r]).filter(Boolean):[];
      const t2=names.length?`${names.join(" + ")} SHUT ${shut.next?"NEXT":"THIS"} HOUR`:"";
      if(msh.textContent!==t2) msh.textContent=t2; }
    // CONFIRM = the snap: the screen flashes when the allocation seals
    const on=!!app.alloc;
    if(prevAllocOn&&!on){
      hull.classList.add("clench");
      try{ window.__audio&&window.__audio.play("chart_stamp"); setTimeout(()=>{try{window.__audio.play("dice_lock");}catch(e){}},80); }catch(e){}
      setTimeout(()=>hull&&hull.classList.remove("clench"), 700);
    }
    prevAllocOn=on;
  }
  function armPt(sx,sy){ // device SVG point (viewBox -800..780 x 0..470) -> viewport
    const mano=document.getElementById("hull-manopla");
    if(!mano) return {x:sx,y:sy};
    const r=mano.getBoundingClientRect();
    const sc=r.width/1580;
    return { x: r.left + (sx+800)*sc, y: r.top + sy*sc };
  }
  function updateVitals(){ updateMachine(); }

  // PLACEMENT JUICE (Balatro 5-layer): the game handles the logic; we add the
  // weight -> cell pop + brightness flash + device micro-shake + clunk.
  function placeJuice(e){
    const cell0=e.target&&e.target.closest&&e.target.closest("#hull-console .cell");
    if(!cell0||!hull) return;
    if(cell0.classList.contains("filled")) return;   // clicking a placed die = PICKUP, no lock juice
    const r=cell0.dataset.r, c=cell0.dataset.c;
    setTimeout(()=>{
      // the matrix re-rendered, juice the FRESH cell, only if a die landed
      const cell=document.querySelector(`#hull-console .matrix-wrap .cell[data-r="${r}"][data-c="${c}"]`);
      if(!cell||!cell.classList.contains("filled")) return;
      if(cell.animate) cell.animate([{transform:"scale(1.4)",filter:"brightness(2.4)"},{transform:"scale(1)",filter:"brightness(1)"}],
        {duration:280,easing:"cubic-bezier(.34,1.56,.64,1)"});
      const svg=armQ(".mano-svg");
      if(svg&&svg.animate) svg.animate([{transform:"translate(0,0)"},{transform:"translate(1.5px,-1.5px)"},{transform:"translate(-1px,1px)"},{transform:"translate(0,0)"}],
        {duration:120,easing:"ease-out"});
      updateMachine();
      try{ window.__audio&&window.__audio.play("dice_lock"); }catch(_){}
    },40);
  }


  function mount(){
    if(hull) return false;
    const sg=document.getElementById("screen-game");
    const mach=document.getElementById("machine-zone"), dice=document.getElementById("dice-zone");
    const prio=document.getElementById("priority-strip"), setb=document.getElementById("btn-settings");
    if(!sg||!mach||!dice) return false;
    const spot=n=>({n, parent:n.parentElement, next:n.nextSibling});
    saved=[spot(mach), spot(dice), prio?spot(prio):null, setb?spot(setb):null].filter(Boolean);
    document.body.classList.add("cabin-on");
    hull=build();
    sg.appendChild(hull);
    // THE CURSOR PLANE, the pointer duo must overlay ABSOLUTELY EVERYTHING (tutorials,
    // rewards, game over). #hull is a transformed stacking context capped at z:60, so no
    // child can climb above the dialogs, the duo is re-homed to a body-level twin of the
    // plane (same geometry, the top layer, pointer-events:none).
    let cp=document.getElementById("cursor-plane");
    if(!cp){ cp=document.createElement("div"); cp.id="cursor-plane"; document.body.appendChild(cp); liftCursorPlane(cp); }
    const _hr=hull.querySelector("#hela-radar"), _rh=hull.querySelector("#hand-right");
    if(_hr) cp.appendChild(_hr);
    if(_rh) cp.appendChild(_rh);
    cp.className=hull.className;
    cpMirror=new MutationObserver(()=>{ if(hull) cp.className=hull.className; });
    cpMirror.observe(hull,{attributes:true,attributeFilter:["class"]});
    armHome(hcOn);
    const console_=hull.querySelector("#hull-console");
    console_.appendChild(dice); console_.appendChild(mach);
    const station=hull.querySelector("#hull-station");
    if(prio) station.appendChild(prio);
    if(setb){ station.appendChild(setb); setb.classList.add("hull-knob"); }
    setPhase(hull, document.body.dataset.phase||"delivery");
    obsPhase=new MutationObserver(()=>setPhase(hull, document.body.dataset.phase));
    obsPhase.observe(document.body,{attributes:true,attributeFilter:["data-phase"]});
    const hh=document.getElementById("hud-hour");
    if(hh){ setHour(hull, hh.textContent);
      obsHour=new MutationObserver(()=>setHour(hull, hh.textContent));
      obsHour.observe(hh,{childList:true,characterData:true,subtree:true}); }
    // the parchment roller bar (the chart rolls onto it on the market scene)
    const railEl=document.getElementById("timeline-rail");
    if(railEl&&!railEl.querySelector("#chart-roll")){
      const cr=document.createElement("div"); cr.id="chart-roll"; railEl.appendChild(cr);
    }
    // the arm peeks when you touch its parked sliver
    const mano=document.getElementById("hull-manopla");
    mano.addEventListener("mouseenter",()=>{ hoverPeek=true; updatePose(); });
    mano.addEventListener("mouseleave",()=>{ hoverPeek=false; updatePose(); manoHoverOff(); });
    mano.addEventListener("mousemove", manoHover);
    wireKeys();
    mountHandCursor();
    mountTicketDrop();
    // ── TILE PREWARM: the first visit to each scene used to pay a ~500ms raster storm
    //    (the market wallpaper is gradient-heavy). Visit every scene for a beat DURING
    //    BOOT, behind the rules card, so the compositor rasters those tiles when no
    //    one is watching. Presentation-only: the camera's own state never moves.
    setTimeout(() => {
      const world = document.querySelector(".cam-world");
      if (!world || !document.body.classList.contains("cabin-on")) return;
      if (document.body.classList.contains("tut")) return;   // the tutorial keeps the eyes on the desk, no scene tour
      const real = world.dataset.scene || "main";
      const tour = ["drawer", "market"];
      let i = 0;
      const step = () => {
        if (i < tour.length){ world.dataset.scene = tour[i++]; setTimeout(step, 800); }
        else world.dataset.scene = real;
      };
      step();
    }, 2600);
    // 2.5D VISOR TILT, the helmet HUD parallaxes toward the cursor (head-look)
    if(!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)){
      // PERF, this used to write a CSS custom property on #hull every frame. #hull
      // CONTAINS #hull-console, which contains the whole allocation UI (the dice, the
      // matrix, every cell). An inherited custom property changing on an ancestor
      // invalidates the style of the ENTIRE subtree, so every mouse frame recalculated
      // every die. That is what made the allocation, the juiciest moment in the game,
      // crawl. Write the transforms DIRECTLY on the handful of elements that tilt.
      let vraf=0, vtx=0, vty=0, tRail=null, tCnr=null, tHolo=null, tBrain=null;
      const grab=()=>{
        if(!tRail||!tRail.isConnected) tRail=hull.querySelector(".vz-rail");
        if(!tCnr||!tCnr.length||!tCnr[0].isConnected) tCnr=hull.querySelectorAll(".vz-cnr");
        if(!tHolo||!tHolo.isConnected) tHolo=hull.querySelector("#vz-holo");
        if(!tBrain||!tBrain.isConnected) tBrain=document.getElementById("hela-brain-dock");
        if(!applyTilt._full||!applyTilt._full.isConnected) applyTilt._full=document.getElementById("hela-brain-full");
      };
      const applyTilt=()=>{
        vraf=0; grab();
        if(tRail) tRail.style.transform=`translate3d(${(vtx*7).toFixed(1)}px, ${(vty*4).toFixed(1)}px, 0)`;
        if(tCnr) for(const c of tCnr) c.style.transform=`translate3d(${(vtx*13).toFixed(1)}px, ${(vty*9).toFixed(1)}px, 0)`;
        // the mini core lives INSIDE the tl bracket, same multiplier, they move as one
        if(tBrain) tBrain.style.transform=`translate3d(${(vtx*13).toFixed(1)}px, ${(vty*9).toFixed(1)}px, 0)`;
        // the FULL core is part of the HELMET too, it drifts with the head-look
        if(applyTilt._full) applyTilt._full.style.transform=`translate3d(${(vtx*11).toFixed(1)}px, ${(vty*8).toFixed(1)}px, 0)`;
        if(tHolo) tHolo.style.transform=
          `translate(-50%,-50%) translate3d(${(vtx*-5).toFixed(1)}px, ${(vty*-3).toFixed(1)}px, 0) perspective(720px) rotateX(11deg)`;
      };
      window.addEventListener("mousemove", e=>{
        vtx=(e.clientX/window.innerWidth-0.5)*2; vty=(e.clientY/window.innerHeight-0.5)*2;
        if(!vraf) vraf=requestAnimationFrame(applyTilt);
      }, {passive:true});
    }
    // drawer scene is gone (its content lives on the desk now)
    const app=window.__game;
    if(app&&app.camera&&(app.camera.scene==="timeline")) app.camera.setScene("main");
    const app2=window.__game;
    if(app2&&app2.playEvent&&!origPlayEvent){
      origPlayEvent=app2.playEvent.bind(app2);
      app2.playEvent=async m=>{ try{onGameEvent(m);}catch(e){} return origPlayEvent(m); };
    }
    tick=setInterval(()=>{ updatePose(); updateVitals(); injectSeals(); peekGuard(); updateMaleta(); mirrorCommand(); },400);
    document.addEventListener("click", malaClick, true);
    window.addEventListener("paradoxo:skinwarp", onSkinWarp);
    // BORROWED BOARD: hovering an allocation row lights its real targets
    document.addEventListener("mouseover", hoverAim, true);
    document.addEventListener("mouseover", hoverFile, true);
    document.addEventListener("click", placeJuice, true);
    updateVitals();
    return true;
  }
  function unmount(){
    if(!hull) return false;
    if(obsPhase){ obsPhase.disconnect(); obsPhase=null; }
    if(obsHour){ obsHour.disconnect(); obsHour=null; }
    if(tick){ clearInterval(tick); tick=null; }
    document.removeEventListener("mouseover", hoverAim, true);
    document.removeEventListener("mouseover", hoverFile, true);
    document.removeEventListener("click", placeJuice, true);
    document.removeEventListener("click", malaClick, true);
    window.removeEventListener("paradoxo:skinwarp", onSkinWarp);
    setPeek(null);
    const mx=malaEl(); if(mx) mx.remove();
    const cr=document.getElementById("chart-roll"); if(cr) cr.remove();
    const mt=document.getElementById("mano-tip"); if(mt) mt.remove();
    document.querySelectorAll(".mano-steam").forEach(n=>n.remove());
    document.body.classList.remove("chart-rolled"); lastRolled=false;
    document.querySelectorAll(".ct-read,.mala-fly-coin").forEach(n=>n.remove());
    malaGold=null; malaBaseline=0; malaRewardN=0; malaContracts=[];
    document.body.classList.remove("aim-paradox","aim-travel","allocating");
    for(const {n,parent,next} of saved){
      if(next && next.parentElement===parent) parent.insertBefore(n,next); else parent.appendChild(n);
      n.classList.remove("hull-knob");
    }
    armHome(false);
    if(cpMirror){ cpMirror.disconnect(); cpMirror=null; }
    const cp0=document.getElementById("cursor-plane"); if(cp0) cp0.className="";
    saved=null; hull.remove(); hull=null;
    const app3=window.__game;
    if(app3&&origPlayEvent){ app3.playEvent=origPlayEvent; origPlayEvent=null; }
    document.querySelectorAll(".bd-seals").forEach(e=>e.remove());
    document.body.classList.remove("cabin-on");
    return true;
  }
  function hoverAim(e){
    if(!document.body.classList.contains("allocating")){ setAim(null); return; }
    const cell=e.target&&e.target.closest&&e.target.closest("#hull-console .cell, #hull-console .matrix-fnlabel");
    let fn=null;
    if(cell){
      const wrap=cell.closest(".matrix-wrap");
      if(wrap){ const items=[...wrap.children]; const idx=items.indexOf(cell.closest(".matrix-wrap > *"));
        if(idx>=0) fn=Math.floor(idx/4); }
    }
    setAim(fn);
  }
  /* PERF: this used to toggle the class on <body>, which invalidates the style of
     EVERY element in the document (5251 of them) on each crossing between matrix
     rows, and on a 3×3 matrix you cross constantly. Put the class on the two
     things that actually light up instead. */
  let aimFn;
  function setAim(fn){
    if(aimFn===fn) return;
    aimFn=fn;
    const rail=document.getElementById("timeline-rail");
    if(rail) rail.classList.toggle("aim-travel-on", fn===2);
    document.querySelectorAll(".pcard.cfolio .badge")
      .forEach(b=>b.classList.toggle("aim-paradox-on", fn===1));
  }
  /* MAP-HOVER FILE PEEK: touching a rival on the chart pulls their file
     toward you on the desk (the operator reaches for the subject's record). */
  function setPeek(seat){
    if(seat===peekSeat) return;
    peekSeat=seat;
    const app=window.__game;
    document.querySelectorAll(".pcard.cfolio").forEach(c=>{
      const on=!!seat&&c.dataset.seat===seat;
      if(on&&app&&app.colorOf){ try{ c.style.setProperty("--peek", app.colorOf(seat)); }catch(e){} }
      c.classList.toggle("file-peek",on);
    });
    // note: hovering the rival on the chart OPENS THE WHOLE FILE
    try{
      if(seat&&app&&app.view){
        const t=app.view.travelers.find(x=>x.name===seat);
        const card=document.querySelector(`.pcard.cfolio[data-seat="${CSS.escape(seat)}"]`);
        if(t&&card&&app.showPanelDetail){ app.hidePanelDetail&&app.hidePanelDetail(); app.showPanelDetail(t,card); }
      } else if(app&&app.hidePanelDetail){ app.hidePanelDetail(); }
    }catch(e){}
  }
  function hoverFile(e){
    lastMx=e.clientX; lastMy=e.clientY;
    const ship=e.target&&e.target.closest&&e.target.closest(
      "#timeline-rail .sea-fixg[data-seat], #timeline-rail .cc-shipg[data-seat], #timeline-rail .cm-shipg[data-seat]");
    const seat=ship&&chartInView()?ship.getAttribute("data-seat"):null;
    setPeek(seat&&document.querySelector(`.pcard.cfolio[data-seat="${CSS.escape(seat)}"]`)?seat:null);
  }
  // a traveller's file opens from the chart only while the chart is what he is looking at:
  // never on the Market (the rolled chart and a pan must not throw a file over the shelf)
  function chartInView(){
    const app=window.__game, cam=document.getElementById("cam");
    return !!(app&&app.camera&&app.camera.scene==="main")
      &&!document.body.classList.contains("chart-rolled")&&!(cam&&cam.classList.contains("is-panning"));
  }
  function peekGuard(){
    // ships sail out from under a stationary pointer (no mouseleave fires),
    // and renderPlayers rebuilds the cards (class lost), both healed here
    if(!peekSeat) return;
    if(!chartInView()){ setPeek(null); return; }
    const el=document.elementFromPoint(lastMx,lastMy);
    const ship=el&&el.closest&&el.closest("#timeline-rail [data-seat]");
    if(!ship||ship.getAttribute("data-seat")!==peekSeat){ setPeek(null); return; }
    const card=document.querySelector(`.pcard.cfolio[data-seat="${CSS.escape(peekSeat)}"]`);
    if(card&&!card.classList.contains("file-peek")){ const s2=peekSeat; peekSeat=null; setPeek(s2); }
  }
  function toggle(on){ const want=on!=null?!!on:!hull; return want?mount():unmount(); }
  window.__cabin=toggle;
  document.addEventListener("keydown",(e)=>{
    // cabin has 3 scenes: S desk · W market · A paperwork; D (old map scene)
    // dies, the map lives ON the desk now
    if(document.body.classList.contains("cabin-on") && (e.key||"").toLowerCase()==="d"){
      const t=e.target||{};
      const app=window.__game;
      const scene=app&&app.camera?app.camera.scene:"main";
      if(scene==="main" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName||"") && !t.isContentEditable){
        e.stopImmediatePropagation(); e.preventDefault(); return;
      }
    }
    // F4 is retired: it timed five configurations and printed a table, but the numbers were
    // dominated by the re-raster storm its own style injection caused, plus mouse movement
    // that round, so the table lied. Frame counting now lives in F7, which only counts and
    // touches nothing.
    // F6: toggles the chart's ambient animation. Its 59 ambient loops (twinkles, nebulae,
    //    swimming sharks, flowing trade routes) promote 97 compositor layers and repaint the
    //    832x1000 SVG. A/B it against F7: press F7, read the FPS, press F6, read again.
    if(e.key==="F6"&&document.body.classList.contains("cabin-on")){
      e.preventDefault();
      const on=document.body.classList.toggle("map-still");
      if(window.__game&&window.__game.helaSay)
        window.__game.helaSay(on ? "Chart ambient <b>suspended</b>, measuring."
                                 : "Chart ambient <b>restored</b>.", 1600);
      return;
    }
    // F7: the frame meter. Puts real numbers on screen: frames per second, the worst frame
    //    in the last second, and how many frames blew the 16.7ms budget.
    if(e.key==="F7"&&document.body.classList.contains("cabin-on")){
      e.preventDefault();
      let hud=document.getElementById("perf-hud");
      if(hud){ hud.remove(); if(window.__perfStop) window.__perfStop(); return; }
      hud=document.createElement("div"); hud.id="perf-hud"; document.body.appendChild(hud);
      let gpu="?";
      try{ const cv=document.createElement("canvas"), gl=cv.getContext("webgl");
           const dd=gl.getExtension("WEBGL_debug_renderer_info");
           gpu=gl.getParameter(dd.UNMASKED_RENDERER_WEBGL); }catch(err){ gpu="(no webgl)"; }
      const soft=/swiftshader|llvmpipe|software|intel|hd graphics/i.test(gpu);
      let last=performance.now(), frames=[], raf=0, longs=0;
      try{ new PerformanceObserver(l=>{ longs+=l.getEntries().length; })
             .observe({entryTypes:["longtask"]}); }catch(err){}
      const tick=(now)=>{
        frames.push(now-last); last=now;
        if(frames.length>=30){
          const s=[...frames].sort((a,b)=>a-b);
          const med=s[15], worst=s[s.length-1], bad=frames.filter(f=>f>16.9).length;
          const fps=Math.round(1000/med);
          hud.className = fps>=58?"ok" : fps>=45?"meh" : "bad";
          hud.innerHTML=`<b>${fps} FPS</b>`
            +`<span>frame ${med.toFixed(1)}ms &middot; worst ${worst.toFixed(0)}ms</span>`
            +`<span>${bad}/30 frames over budget</span>`
            +`<span>${longs} long tasks</span>`
            +(()=>{ try{ const mm=window.__mmTake&&window.__mmTake();
                     if(!mm) return "";
                     const cls = mm.msPerSec>60?"bad" : mm.msPerSec>20?"meh" : "ok";
                     return `<span class="mm ${cls}">mousemove: ${mm.msPerSec.toFixed(0)} ms/s</span>`
                          + (mm.top?`<span class="mm2">worst: ${mm.top} &mdash; ${mm.topMsPerSec.toFixed(0)} ms/s</span>`:""); }
                   catch(err){ return ""; } })()
            +`<span class="gpu ${soft?"bad":"ok"}">${gpu}</span>`;
          frames=[]; longs=0;
        }
        raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
      window.__perfStop=()=>cancelAnimationFrame(raf);
      return;
    }
    // ── DIAGNOSTICS, three independent scalpels. Toggle one at a time, mid-game,
    //    and whichever one makes it SMOOTH is the thing that costs. My instruments
    //    render in software and cannot see your GPU; your machine gets the last word.
    //      F9 , the HAND only     (the reticle stays, the pip-boy stays)
    //      F10, the RETICLE only  (the hand stays)
    //      F8 , force the PIP-BOY DARK, even with the right hand out
    //    (F11 is the browser's fullscreen, never take it.)
    if((e.key==="F9"||e.key==="F10"||e.key==="F8")&&document.body.classList.contains("cabin-on")){
      e.preventDefault();
      const KEY={F9:["dbg-no-hand","HAND"],F10:["dbg-no-radar","RETICLE"],F8:["dbg-dark-pipboy","PIP-BOY"]}[e.key];
      const off=document.body.classList.toggle(KEY[0]);
      try{ window.__audio&&window.__audio.play(off?"whiff":"chart_creak"); }catch(err){}
      console.log(`[paradoxo] ${KEY[1]} ${off?"OFF":"ON"}`);
      return;
    }
    if(e.key===" "&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&document.body.classList.contains("cabin-on")){
      const t2=e.target||{};
      // only real TEXT entry may keep the space bar. A focused BUTTON must NOT eat it,
      // the drawers are <button>s, so SPACE was pulling a drawer open instead of
      // swapping the hand. SPACE swaps the hand. Period.
      if(/^(INPUT|TEXTAREA|SELECT)$/.test(t2.tagName||"")||t2.isContentEditable) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if(t2 && typeof t2.blur==="function") t2.blur();   // drop focus so nothing else fires
      activeHand=(activeHand==="right")?"left":"right";
      freeCursor=(activeHand==="left");
      document.body.classList.toggle("hand-right-on", activeHand==="right");
      if(activeHand==="left"){
        // lights out FIRST: projections + OS cursor die before the arm stirs
        document.body.classList.add("mano-away","hand-cursor-on");
        hcAway=true; hcEngageAt=performance.now()+300;
      } else {
        // the arm glides home; the desk re-lights only once it has settled
        hcSettling=performance.now()+520;
        setTimeout(()=>{ updatePose(); },530);
      }
      try{ window.__audio&&window.__audio.play(freeCursor?"chart_creak":"whiff"); }catch(err){}
      updatePose();
      return;
    }
  }, true);
  // THE PIP-BOY IS THE DEFAULT (the old "0" toggle is dead): the cabin mounts
  // itself the moment the game screen comes alive.
  function tryMount(){
    const sg=document.getElementById("screen-game");
    return !!(sg&&sg.classList.contains("is-active")&&window.__game&&!hull&&(()=>{try{return mount();}catch(e){return false;}})());
  }
  // mount on the FIRST frame the game is live, no flat-board flash before the pip-boy
  (function fastMount(){ if(hull||tryMount()) return; requestAnimationFrame(fastMount); })();
  // safety net for re-entry (new game after game over)
  setInterval(()=>{ if(!hull) tryMount(); },600);
})();


/* ═══════════════════════════════════════════════════════════════════════════════
   HELA: one presence, not a swarm of pop-ups. A docked eye in the corner of the
   visor is HER: a status beacon (its colour is your condition) and the single access
   point to everything she keeps. It does NOT fly or chase the cursor (that was noise);
   it OPENS: blooming into her browsable news archive (my idea: the eye becomes
   the window). Norse Hel in a Bureau helmet: she files the dead, and lets you read.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function helaHud(){
  const now = () => (window.performance && performance.now()) || 0;
  const news = [];            // {hour, kind, headline, sub, say, html}
  let idx = 0, hud = null, autoCloseAt = 0, raf = 0;

  function eyeSVG(){ return `
<svg viewBox="-60 -60 120 120" fill="none" aria-hidden="true">
  <g class="hh-ring"><circle r="40" stroke="currentColor" stroke-width="2" opacity=".4" stroke-dasharray="3 9"/></g>
  <g class="hh-lid"><path d="M -34 0 Q 0 -23 34 0 Q 0 23 -34 0 Z" stroke="currentColor" stroke-width="3" fill="currentColor" fill-opacity=".08"/></g>
  <g class="hh-look"><circle class="hh-pupil" r="7" stroke="currentColor" stroke-width="2.6" fill="currentColor" fill-opacity=".45"/></g>
</svg>`; }

  function build(){
    if (document.getElementById("hela-hud") || !document.body) return;
    const sig = (window.__helaSigil) || "";
    hud = document.createElement("div"); hud.id = "hela-hud"; hud.dataset.state = "calm";
    // the HUD is a GHOST now: it keeps only the state-switch tick alive. The
    // archive (and its forbidden X / arrows) went to the core; nothing renders.
    hud.innerHTML = "";
    document.body.appendChild(hud);
  }
  function render(){
    return;   // the ghost has nothing to draw, the core renders her memory now
    // eslint-disable-next-line no-unreachable
    if (!hud) return;
    const it = news[idx];
    hud.querySelector(".hh-clip").innerHTML = it ? it.html
      : `<div class="hh-empty">No dispatches yet.<br>The sea of time is quiet... for now.</div>`;
    hud.querySelector(".hh-say").textContent = it ? (it.say || "") : "I keep every record, traveller. There is simply nothing dead to report.";
    hud.querySelector(".hh-stamp").textContent = news.length ? `HOUR ${it.hour} · ${idx + 1} / ${news.length}`: "--";
    hud.querySelector(".hh-prev").disabled = idx <= 0;
    hud.querySelector(".hh-next").disabled = idx >= news.length - 1;
    hud.classList.toggle("has-stack", news.length > 1);   // peeking cuttings behind
    const clip = hud.querySelector(".hh-clip");            // a physical page-turn on browse
    if (clip){ clip.classList.remove("flip"); void clip.offsetWidth; clip.classList.add("flip"); }
  }
  function setOpen(o){ autoCloseAt = 0; }
  function toggle(){ setOpen(!hud.classList.contains("open")); }

  // ── the public hooks the game speaks to ──
  window.__helaFileNews = function(item){
    news.push(item); idx = news.length - 1;
    try { window.__helaBrainFile && window.__helaBrainFile(item); } catch (e) {}
  };
  window.__helaNewsStore = news;   // the BRAIN reads her memory directly
  window.__helaOpenArchive = function(){ if (news.length){ idx = news.length - 1; } setOpen(true); autoCloseAt = 0; };
  // HELA SPEAKS, a single line on the visor beside her eye, then it fades. No wall, no
  // button. This is how she teaches the non-obvious (replaces the tutorial pop-up cards).
  window.__helaSay = function(text, opt){ opt = opt || {}; if (!hud || !text) return;
    let cap = hud.querySelector(".hh-say-cap");
    if (!cap){ cap = document.createElement("div"); cap.className = "hh-say-cap"; hud.appendChild(cap); }
    cap.innerHTML = text; cap.classList.remove("on"); void cap.offsetWidth; cap.classList.add("on"); ping();
    clearTimeout(cap._t); cap._t = setTimeout(() => cap.classList.remove("on"), opt.ms || 5400); };
  // legacy hook (events used to fly her eye): now just a glance-ping on the beacon
  window.__helaLookAt = function(){ ping(); };
  function ping(){}

  /* HELA STATES, the one place they are decided.
     Identity: HELA is always drawn in the colour of MY piece (util.js setHelaColour,
     the --hela* tokens that feed every --vz* token). Conditions only LAYER on top,
     in this priority:
       1 offline  terminated and awaiting respawn: grey, faint static, dim readouts
                  (body.vz-paradix). It overrides everything below. On respawn she
                  reboots into the player colour (body.hela-boot, 1.5s, once).
       2 crit     energy at or below CRIT_ENERGY (6): red alarm accent on the frame
                  and the vitals, the identity colour stays (body.vz-crit).
       3 wanted   a red-orange hazard band and a WANTED tag on the frame (body.vz-wanted).
       4 immune   a terminated traveler back in the Timeless Period (XXIV-XXX) is immune
                  to energy loss until first reaching XXIII: a shield shimmer in the
                  player colour (body.hela-immune).
     2, 3 and 4 combine freely. Returns plain flags; the tick applies them on change. */
  const HELA_CRIT = 6;     // same threshold as CRIT_ENERGY in the cabin above
  const immunity = { spent: false, life: 0 };
  function helaConditions(me){
    const sts = me.statuses || [];
    const offline = sts.includes("awaiting_respawn");
    const terminated = !!(me.is_terminated || sts.includes("terminated"));
    // the engine spends the immunity for this life the first time the traveler
    // reaches XXIII or lower; a new termination grants a fresh one
    if (offline) immunity.spent = false;
    else if (terminated && me.century <= 23) immunity.spent = true;
    return {
      offline,
      crit: (me.energy || 0) <= HELA_CRIT,
      wanted: !!(me.is_wanted || sts.includes("wanted")),
      // the server says it outright; the local guess only covers an older server
      immune: "atemporal_immune" in me ? !!me.atemporal_immune && !offline
        : terminated && !offline && me.century >= 24 && !immunity.spent,
    };
  }
  window.__helaConditions = function(){
    const app = window.__game, me = app && app.view && app.view.travelers && app.view.travelers.find(x => x.is_self);
    return me ? helaConditions(me) : null;
  };

  // (the aiming pupil + sightline ray died here, the EYE ITSELF travels now)
  function tick(){
    if (hud){
      const t = now();
      const live = document.body.classList.contains("cabin-on");
      if (hud._live !== live){ hud._live = live; hud.classList.toggle("live", live); }
      if (autoCloseAt && t > autoCloseAt){ autoCloseAt = 0; setOpen(false); }
      // HER COLOUR IS YOUR COLOUR, her CONDITION layers on top (helaConditions below)
      const app = window.__game, me = app && app.view && app.view.travelers && app.view.travelers.find(x => x.is_self);
      if (me){
        const c = helaConditions(me);
        const st = c.offline ? "paradix" : c.crit ? "crit" : c.wanted ? "wanted" : "calm";
        const key = c.offline ? "off" : (c.crit ? "c" : "") + (c.wanted ? "w" : "") + (c.immune ? "i" : "");
        if (hud._condKey !== key){
          const prevKey = hud._condKey, prev = hud.dataset.state;
          hud._condKey = key; hud.dataset.state = st;
          const b = document.body.classList;
          b.toggle("vz-paradix", c.offline);
          b.toggle("vz-crit", !c.offline && c.crit);
          b.toggle("vz-wanted", !c.offline && c.wanted);
          b.toggle("hela-immune", !c.offline && c.immune);
          // back from offline: a short reboot into the traveler's colour
          if (prevKey === "off" && !c.offline){
            b.remove("hela-boot"); void document.body.offsetWidth; b.add("hela-boot");
            clearTimeout(hud._bootT); hud._bootT = setTimeout(() => b.remove("hela-boot"), 1500);
          }
          // she has OPINIONS about your condition, one line per descent, never per frame
          if (prevKey != null && prev !== st){
            const line = st === "crit" ? "crit_life" : st === "wanted" ? "wanted_self"
                       : st === "paradix" ? "terminated_self" : "";
            if (line && window.__helaVoice && window.__helaSay)
              window.__helaSay(window.__helaVoice(line), { ms: 6200 });
          }
        }
        // the boiler: she can hear the pitch that means shrapnel
        const hotNow = (me.booms || 0) >= 10;
        if (hotNow && !hud._boilHot && window.__helaVoice && window.__helaSay)
          window.__helaSay(window.__helaVoice("boiler_high"), { ms: 5600 });
        hud._boilHot = hotNow;
      }
    }
    raf = requestAnimationFrame(tick);
  }
  function ensure(){ build(); if (hud && !hud._rendered){ hud._rendered = 1; render(); } if (!raf) raf = requestAnimationFrame(tick); if (!hud) setTimeout(ensure, 500); }
  ensure();
})();


/* ═══════════════════════════════════════════════════════════════════════════════
   THE LIVING EYE: she is not docked and she does not chase. She rides the
   cursor's DIAGONAL like a falconer's bird: left half of the desk, she keeps to
   your right; upper half, she keeps below, always the far corner, always the
   same fixed gap, moving AS ONE with the hand. Crossing a midline she never
   runs: she BLINKS, and is simply there. Every message the visor has for you
   manifests FROM her, the eye opens into the words and folds them away again.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function helaEyeLife(){
  if (window.__helaEye) return;
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GAP_X = 133, GAP_Y = 104;     // the falconry distance (the owner's: close to the hand; calm comes from the follow, not the gap)
  const HYST = 42;                    // midline dead-band so she never flickers
  let eye = null, mx = -1, my = -1, sx = 1, sy = 1;   // s* = which diagonal she keeps
  let blinkT = 0, nextIdleBlink = 0, nextSacc = 0, raf = 0;
  const copies = [];                  // her split selves (target aiming)
  let windows = 0;                    // open manifests
  let assumed = null;                 // the window that IS the eye right now (it follows)
  let standAt = null;                 // when set, she stands HERE (patrol / directing), not on the diagonal
  let glide = null;                   // an in-flight guided move, SEEN moving, drawing the look

  function fit(){ return window.__pdxFit || 1; }
  function eyeSVG(cls){ return `
<svg class="${cls || ""}" viewBox="-60 -60 120 120" fill="none" aria-hidden="true">
  <g class="he-spin"><circle class="he-halo" r="45" stroke="currentColor" stroke-width="1.6" opacity=".3" stroke-dasharray="4 11"/>
    <path class="he-star" d="M 0 -45 L 11.2 -15.4 L 42.8 -13.9 L 18.1 5.9 L 26.5 36.4 L 0 19 L -26.5 36.4 L -18.1 5.9 L -42.8 -13.9 L -11.2 -15.4 Z"
      fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" opacity=".55" style="display:none"/></g>
  <g class="he-blink">
    <g class="he-lid"><path d="M -35 0 Q 0 -25 35 0 Q 0 25 -35 0 Z" stroke="currentColor" stroke-width="3" fill="currentColor" fill-opacity=".07"/></g>
    <g class="he-iris"><circle r="12.5" stroke="currentColor" stroke-width="2" opacity=".55"/>
      <circle class="he-pupil" r="6" fill="currentColor" fill-opacity=".5" stroke="currentColor" stroke-width="2.2"/></g>
  </g>
</svg>`; }

  function build(){
    if (eye || !document.body) return;
    eye = document.createElement("div"); eye.id = "hela-eye";
    // her balloon beside her, and above her the boxes she keeps up (YOUR MOVE, the
    // chapter, a footnote): every HELA message rides the eye, none is fixed
    eye.innerHTML = eyeSVG("he-svg") + `<div class="he-chip" role="status"></div><div class="he-caps"></div>`;
    document.body.appendChild(eye);
    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener("mouseleave", () => { mx = -1; my = -1; });
  }

  /* ══ HER MOTION: a physical follower, never a teleport ══════════════════════════════
     The eye is a damped spring (a little lag, a little overshoot) pulled toward a TARGET
     point near the hand; her words (balloon, boxes) hang on the eye by their own soft
     spring, so they trail her and SLIDE around her when they change side. Nothing is
     ever set to a position after the first frame, and speeds are capped so her words
     never move more than about 12 px a frame at 60 fps.
       - The TARGET, not the eye, is what gets redirected: small precise movements of
         the hand (under DEAD px) do not move it; it changes diagonal only past a wide
         dead-band around the screen's middle and at most once every 1.5 s; if its
         diagonal lands on a critical zone another diagonal is taken.
       - By the TIME MACHINE she parks: when the hand enters the machine and dice region
         the target becomes a checkpoint just outside it (above it, or beside it, away
         from the dice) and stays there while the hand works; it comes back to the hand
         only when the hand leaves a wider exit boundary (hysteresis).
       - Her words change side only when a CRITICAL zone (dice, machine cells, Confirm,
         the yellow box, the tutorial's card, the hand) has covered them for 0.7 s, and
         at most once every 2.5 s; a case file or a piece partly under them is tolerated.
     placement() reports the counts, for the checks. ══ */
  // SHE STOPS TO SPEAK. Silent, the eye follows the hand snappily (a critically damped
  // spring, about 60 ms behind). With a line to say (four words or more) she stops at the
  // nearest spot where her words cover nothing important, pulses while she speaks, and her
  // balloon stands completely still until the line ends; then she follows again. Barks of
  // one to three words ride the moving eye. Her boxes (YOUR MOVE...) are laid where they
  // appear and stay; they move only with new content or when something important is under
  // them, and then by a dissolve, never a slide.
  const DEAD = 6, FLIP_GAP = 1500;
  const OMEGA = 28, ZETA = .85, VMAX_EYE = 9000;      // the eye's spring (rad/s), damping, top speed (px/s)
  let ex2 = -1, ey2 = -1, evx = 0, evy = 0, lastF = 0, ancX = -1, ancY = -1, flipAt = 0, changes = 0, switches = 0;
  let parked = null, regionR = null, parkedPlaced = false, needXT = 0, needYT = 0, deskT = 0;
  let talk = null, capsDirty = false, capsBadAt = 0, capsFading = false;
  function machineRegion(){
    const el2 = document.getElementById("hull-console");
    const r = el2 && el2.getBoundingClientRect();
    return r && r.width > 20 && r.bottom > 0 && r.top < innerHeight ? r : null;
  }
  function inRect(r, pad){ return r && mx >= r.left - pad && mx <= r.right + pad && my >= r.top - pad && my <= r.bottom + pad; }
  // the case files' column, the union of the visible files (measured with the zones)
  let colR = null;
  function fileRegion(){ return colR; }
  function colPoint(r){
    const w = chipBox ? chipBox[0] : 300, half = w / 2 + 16;
    const right = innerWidth - r.right, left = r.left;
    const x = right >= left ? Math.min(innerWidth - half, r.right + half) : Math.max(half, r.left - half);
    return { x, y: Math.max(160, Math.min(innerHeight - 118 - (capsBox ? capsBox[1] + 8 : 0), my)) };
  }
  // what her eye, her words and her boxes would cover standing at (x, y), words under her
  // (b2 = 1) or over her (-1); critical zones weigh most, and the screen's edge counts too
  function footCost(x, y, b2){
    const W = chipBox ? chipBox[0] : 300, H = chipBox ? chipBox[1] : 56, cx = midX(x, W);
    const cw = b2 === 1 ? [cx, y + 44, cx + W, y + 44 + H] : [cx, y - 44 - H, cx + W, y - 44];
    const boxes = [[x - 30, y - 30, x + 30, y + 30, 6], [...cw, 1]];
    if (capsBox){ const k = midX(x, capsBox[0]), t0 = b2 === 1 ? cw[3] + 8 : cw[1] - 8 - capsBox[1]; boxes.push([k, t0, k + capsBox[0], t0 + capsBox[1], 1]); }
    let c = 0;
    for (const b of boxes){
      if (b[1] < 6 || b[3] > innerHeight - 6) c += (b[2] - b[0]) * 40;
      for (const z of zones){ const w = Math.min(b[2], z[2]) - Math.max(b[0], z[0]), h = Math.min(b[3], z[3]) - Math.max(b[1], z[1]);
        if (w > 0 && h > 0) c += w * h * b[4] * (z[4] ? 4 : 1); }
    }
    return c;
  }
  function checkpoint(r){
    // her eye, her words under it and her boxes under those, all clear of the machine
    const up = 44 + (chipBox ? chipBox[1] : 64) + (capsBox ? capsBox[1] + 8 : 0) + 30;
    const hw = (chipBox ? chipBox[0] : 300) / 2 + 8;
    const c = [[r.left + r.width * .5, r.top - up], [r.left + r.width * .2, r.top - up], [r.left + r.width * .8, r.top - up],
      [r.left + hw, r.top - up], [r.right - hw, r.top - up],
      [r.right + 70, r.top + r.height * .25], [r.left - 70, r.top + r.height * .25]];
    let best = null, bd = 1e9;
    for (const [x, y] of c){
      if (x < 40 || x > innerWidth - 40 || y < 160 || y > innerHeight - 40) continue;
      const bx = [x - 30, y - 30, x + 30, y + 30];
      if (zones.some((z) => z[4] && overl(bx, z))) continue;
      // least covered first (her words over a case file count), then the nearest
      const d = footCost(x, y, 1) * 10 + Math.hypot(x - (ex2 < 0 ? mx : ex2), y - (ey2 < 0 ? my : ey2));
      if (d < bd){ bd = d; best = { x, y }; }
    }
    return best || { x: r.left + r.width * .5, y: Math.max(160, r.top - up) };
  }
  function post3(cx, cy, sx2, sy2){
    const f = Math.max(.6, Math.min(1.25, fit()));
    // under the hand she stays high enough for her words to fit under her
    return { x: Math.max(30, Math.min(innerWidth - 30, cx + sx2 * GAP_X * f)), y: Math.max(150, Math.min(innerHeight - (sy2 === 1 ? 118 : 34), cy + sy2 * GAP_Y * f)) };
  }
  function spring(x, v, target, dt, omega, zeta, vmax){
    const a = omega * omega * (target - x) - 2 * zeta * omega * v;
    v += a * dt;
    if (v > vmax) v = vmax; else if (v < -vmax) v = -vmax;
    return [x + v * dt, v];
  }
  function follow(t){
    // a frame after a pause (the table's nap, a busy moment) counts as one ordinary frame: no leap
    let dt = lastF ? (t - lastF) / 1000 : .016; lastF = t;
    if (dt > .05 || dt <= 0) dt = .016; else if (dt > .02) dt = .02;   // a held frame is not made up in one step
    refreshZones(t);
    if (talk){ /* she stays where she stopped; parking waits */ }
    else if (parked){
      const r = parked.col ? fileRegion() : machineRegion(); if (r) regionR = r;
      if (!inRect(regionR, 70)){ parked = null; changes++; ancX = -1; }
    } else {
      const r = machineRegion(), c = fileRegion();
      if (r && inRect(r, 12)){ regionR = r; parked = checkpoint(r); parkedPlaced = false; changes++; }
      else if (c && inRect(c, 12)){ regionR = c; parked = colPoint(c); parked.col = true; parkedPlaced = false; changes++; }
    }
    let tx, ty;
    if (parked){ tx = parked.x; ty = parked.y; }
    else {
      if (ancX < 0 || Math.hypot(mx - ancX, my - ancY) > DEAD){ ancX = mx; ancY = my; }
      // she changes side only at an edge, where she or her words would leave the screen;
      // anywhere else she keeps the side she has (her words sit under her, so they need no flip)
      const f0 = Math.max(.6, Math.min(1.25, fit())), gx = GAP_X * f0;
      const cost = (a, b2) => { const q = post3(ancX, ancY, a, b2); return footCost(q.x, q.y, b2); };
      // and only once the need has lasted a moment: a hand passing by the edge changes nothing
      let nx = sx, ny = sy;
      const needX = sx === 1 ? ancX + gx + 40 > innerWidth : ancX - gx - 40 < 0;
      const needY = sy === 1 ? my > innerHeight - 150 : my < 200;
      needXT = needX ? (needXT || t) : 0; needYT = needY ? (needYT || t) : 0;
      if (needXT && t - needXT > 700) nx = -sx;
      if (needYT && t - needYT > 700) ny = -sy;
      // on the side with free desk: another diagonal wins only when it covers far less, for a moment
      const c0 = cost(nx, ny);
      let alt = null;
      if (c0 > 900){
        let bc = c0 * .5;
        for (const [a, b2] of [[nx, -ny], [-nx, ny], [-nx, -ny]]){
          if ((a === 1 && ancX + gx + 40 > innerWidth) || (a === -1 && ancX - gx - 40 < 0)) continue;
          if ((b2 === 1 && my > innerHeight - 150) || (b2 === -1 && my < 200)) continue;
          const c = cost(a, b2); if (c < bc){ bc = c; alt = [a, b2]; }
        }
      }
      deskT = alt ? (deskT || t) : 0;
      if (alt && t - deskT > 600){ nx = alt[0]; ny = alt[1]; }
      if ((nx !== sx || ny !== sy) && t - flipAt > FLIP_GAP){ sx = nx; sy = ny; flipAt = t; changes++; }
      const q = post3(ancX, ancY, sx, sy); tx = q.x; ty = q.y;
    }
    if (talk){ tx = talk.x; ty = talk.y; }          // speaking: she stands still
    if (ex2 < 0){ ex2 = tx; ey2 = ty; }            // the first frame only
    else {
      // two half steps keep the spring steady on a slow frame
      for (let n = 0; n < 2; n++){
        [ex2, evx] = spring(ex2, evx, tx, dt / 2, OMEGA, ZETA, VMAX_EYE);
        [ey2, evy] = spring(ey2, evy, ty, dt / 2, OMEGA, ZETA, VMAX_EYE);
      }
    }
    place(ex2, ey2);
  }

  // where she would stand on a given diagonal (sx2, sy2) for the current cursor
  function post2(sx2, sy2){
    const f = Math.max(.6, Math.min(1.25, fit()));
    return { x: Math.max(30, Math.min(innerWidth - 30, mx + sx2 * GAP_X * f)), y: Math.max(150, Math.min(innerHeight - 34, my + sy2 * GAP_Y * f)) };
  }
  // where she stands for a given cursor point (rigid diagonal + viewport clamp)
  function post(cx, cy){
    const f = Math.max(.6, Math.min(1.25, fit()));
    let x = cx + sx * GAP_X * f, y = cy + sy * GAP_Y * f;
    x = Math.max(30, Math.min(innerWidth - 30, x));
    y = Math.max(150, Math.min(innerHeight - 34, y));   // below the top strip (her boxes, the phase line)
    return catFear({ x, y });
  }
  // ── SHE FEARS THE CAT. The eye will not come near the animal; pushed close, it
  //    shies away and narrows, watching. (The cat, of course, is unimpressed.) ──
  let catBox = null, catBoxT = 0;
  function catFear(p){
    const t2 = performance.now();
    if (t2 - catBoxT > 260){ catBoxT = t2; catBox = null;
      try { const c = window.__game && window.__game._cat;
        if (c && c.root){ if (!c._poseEls) c._poseEls = [...c.root.querySelectorAll(".cw-pose")];
          for (const gp of c._poseEls){ const r = gp.getBoundingClientRect();
            if (r.width > 0){ catBox = r; break; } } } } catch (e) {}
    }
    if (!catBox || !eye){ if (eye) eye.classList.remove("he-wary"); return p; }
    const ccx = catBox.left + catBox.width / 2, ccy = catBox.top + catBox.height / 2;
    const dx = p.x - ccx, dy = p.y - ccy, d = Math.hypot(dx, dy);
    const SAFE = Math.max(catBox.width, catBox.height) * .62 + 46;
    if (d >= SAFE){ eye.classList.remove("he-wary"); return p; }
    eye.classList.add("he-wary");                       // too close, it shies off
    const k = SAFE / Math.max(d, 1);
    return { x: Math.max(30, Math.min(innerWidth - 30, ccx + dx * k)),
             y: Math.max(56, Math.min(innerHeight - 34, ccy + dy * k)) };
  }
  /* ── WHERE HER WORDS GO: forbidden zones (measured at most every 450 ms, and only
     when the hand moved or 0.7 s passed). A zone is CRITICAL (the dice, the machine's
     cells, Confirm, the yellow box, the tutorial's card) or not (case files, pieces,
     the gauge, the lifethread, the preview): only a critical one makes her words move
     away, and only after it has covered them for a moment. Her words then SLIDE to the
     new side on their own spring (words(), CSS translate, compositor only). ── */
  let chipSide = "", chipEl = null, capsEl = null, avoidR = null;
  let zones = [], zonesT = 0, chipBox = null, capsBox = null, chipMode = "", capsMode = "";
  const ZONE_CRIT = "#hull-console .dice-pool, #hull-console .matrix-wrap, #confirm-alloc, #hull-console .dice-actions,"
    + " .dice-pool, .he-ring, .tut-ring, #tut-callout.on";
  const ZONE_SOFT = ".pcard.cfolio, .cx-preview, #vz-holo, #timeline-rail [data-seat], #tl-gauge, #rucksack-zone .card, #market-zone .card, #drawer-zone .card";
  let zMx = -9, zMy = -9;
  function refreshZones(t){
    if (t - zonesT < 450) return;
    if (mx === zMx && my === zMy && zonesT && t - zonesT < 700) return;
    zMx = mx; zMy = my;
    zonesT = t; zones = [];
    for (const [sel, crit] of [[ZONE_CRIT, true], [ZONE_SOFT, false]]){
      for (const el2 of document.querySelectorAll(sel)){
        if (el2.closest && el2.closest("#hela-eye")) continue;
        const r = el2.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue;
        if (r.width > innerWidth * .7 && r.height > innerHeight * .7) continue;
        zones.push([r.left - 6, r.top - 6, r.right + 6, r.bottom + 6, crit]);
        if (zones.length > 40) break;
      }
    }
    if (avoidR) zones.push([avoidR.left, avoidR.top, avoidR.right, avoidR.bottom, true]);
    colR = null;
    for (const el2 of document.querySelectorAll(".pcard.cfolio")){
      const r = el2.getBoundingClientRect(); if (r.width < 20 || r.bottom < 0 || r.top > innerHeight) continue;
      colR = colR ? { left: Math.min(colR.left, r.left), top: Math.min(colR.top, r.top), right: Math.max(colR.right, r.right), bottom: Math.max(colR.bottom, r.bottom) }
        : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }
    if (!chipEl && eye) chipEl = eye.querySelector(".he-chip");
    if (!capsEl && eye) capsEl = eye.querySelector(".he-caps");
    chipBox = chipEl ? [chipEl.offsetWidth || 300, chipEl.offsetHeight || 60] : [300, 60];
    capsBox = capsEl && capsEl.offsetHeight ? [capsEl.offsetWidth, capsEl.offsetHeight] : null;
  }
  function overl(b, z){ return b[0] < z[2] && b[2] > z[0] && b[1] < z[3] && b[3] > z[1]; }
  // free of critical zones (and, when strict, of every zone), and on screen
  function freeBox(b, extra, strict, noHand){
    if (b[0] < 6 || b[1] < 6 || b[2] > innerWidth - 6 || b[3] > innerHeight - 6) return false;
    // the pointer's own spot; while she is parked the hand works there and she keeps still
    const hand = mx >= 0 && !parked && !noHand ? [mx - 22, my - 22, mx + 34, my + 44] : null;
    if (hand && overl(b, hand)) return false;
    for (const z of zones) if ((strict || z[4]) && overl(b, z)) return false;
    for (const z of extra || []) if (overl(b, z)) return false;
    return true;
  }
  // centred on her, slid sideways to stay on screen
  function midX(x, W){ return Math.max(8, Math.min(innerWidth - 8 - W, x - W / 2)); }
  function cands(x, y, W, H, away, caps, chipB){
    const o = away === "r" ? "l" : "r", L = {}, cx = midX(x, W);
    if (!caps){
      L.rd = [x + 34, y - 33, x + 34 + W, y - 33 + H]; L.ru = [x + 34, y + 33 - H, x + 34 + W, y + 33];
      L.ld = [x - 34 - W, y - 33, x - 34, y - 33 + H]; L.lu = [x - 34 - W, y + 33 - H, x - 34, y + 33];
      L.b = [cx, y + 44, cx + W, y + 44 + H]; L.a = [cx, y - 44 - H, cx + W, y - 44];
      const v = sy === 1 || parked ? ["b", "a"] : ["a", "b"];   // parked, she stands above the work: words under her
      return [[v[0], L[v[0]]], [away + "d", L[away + "d"]], [away + "u", L[away + "u"]], [o + "d", L[o + "d"]], [o + "u", L[o + "u"]], [v[1], L[v[1]]]];
    }
    // her boxes stack on her words, on the side away from the hand (under them while
    // she stands under the hand, over them while she stands above it): never near the pointer
    const below = chipB ? (chipB[1] >= y ? true : chipB[3] <= y ? false : sy === 1 || !!parked) : sy === 1 || !!parked;
    const tB = Math.max(y + 44, chipB ? chipB[3] + 8 : 0), tA = Math.min(y - 44, chipB ? chipB[1] - 8 : 1e9) - H;
    L.cb = [cx, tB, cx + W, tB + H]; L.ca = [cx, tA, cx + W, tA + H];
    L.ra = [x + 10, y - 38 - H, x + 10 + W, y - 38]; L.la = [x - 10 - W, y - 38 - H, x - 10, y - 38];
    L.rb = [x + 10, y + 40, x + 10 + W, y + 40 + H]; L.lb = [x - 10 - W, y + 40, x - 10, y + 40 + H];
    const v = below ? ["cb", "ca"] : ["ca", "cb"];
    return [[v[0], L[v[0]]], [away + "a", L[away + "a"]], [o + "a", L[o + "a"]], [away + "b", L[away + "b"]], [o + "b", L[o + "b"]], [v[1], L[v[1]]]];
  }
  function nearestFree(x, y, W, H, extra){
    for (const rad of [110, 160, 220, 300, 390, 500]){
      for (let k2 = 0; k2 < 16; k2++){
        const a = k2 * Math.PI / 8, cx = x + Math.cos(a) * (rad + W / 2), cy = y + Math.sin(a) * (rad * .6 + H / 2);
        const b = [cx - W / 2, cy - H / 2, cx + W / 2, cy + H / 2];
        if (freeBox(b, extra, false)) return b;
      }
    }
    return null;
  }
  const blockedSince = { chip: 0, caps: 0 }, changedAt = { chip: 0, caps: 0 };
  let whyMoved = "";
  // what pushed her words off their spot (for the checks)
  function why(b, extra){
    if (b[0] < 6 || b[1] < 6 || b[2] > innerWidth - 6 || b[3] > innerHeight - 6) return "edge";
    if (mx >= 0 && !parked && overl(b, [mx - 22, my - 22, mx + 34, my + 44])) return "hand";
    for (const z of zones) if (z[4] && overl(b, z)) return "zone " + z.slice(0, 4).map(Math.round).join(",");
    return extra && extra.some((z) => overl(b, z)) ? "chip" : "?";
  }
  function pick(x, y, W, H, cur, curRel, away, caps, extra){
    const list = cands(x, y, W, H, away, caps, extra && extra[0]), who = caps ? "caps" : "chip", now = performance.now();
    let curC = null;
    if (cur && cur !== "free") curC = list.find((q) => q[0] === cur) || null;
    else if (cur === "free" && curRel) curC = ["free", [x + curRel[0], y + curRel[1], x + curRel[0] + W, y + curRel[1] + H]];
    if (curC){
      // while she travels her words ride along: the hand crossing them is no reason to move
      // them (she is on her way to a spot away from it), only a critical zone is
      if (Math.hypot(evx, evy) > 80 && freeBox(curC[1], extra, false, true)){ blockedSince[who] = 0; return curC; }
      const crit = freeBox(curC[1], extra, false), clear = crit && freeBox(curC[1], extra, true);
      if (clear){ blockedSince[who] = 0; return curC; }
      if (crit){   // only files or cards under them: they wait longer, and move only to a clear spot
        if (Math.hypot(evx, evy) > 80){ blockedSince[who] = 0; return curC; }   // and only once she has settled
        if (!blockedSince[who]) blockedSince[who] = now;
        if (now - blockedSince[who] < 1400 || now - changedAt[who] < 3000) return curC;
        const c2 = list.find((c) => c[0] !== curC[0] && freeBox(c[1], extra, true));
        if (!c2) return curC;
        blockedSince[who] = 0; changedAt[who] = now; whyMoved = "soft"; return c2;
      }
      if (!blockedSince[who]) blockedSince[who] = now;
      if (now - blockedSince[who] < 700 || now - changedAt[who] < 2500) return curC;
    }
    blockedSince[who] = 0; changedAt[who] = now;
    if (curC) whyMoved = why(curC[1], extra);
    // moving anyway: a spot clear of files and cards first, then one clear of the critical zones
    for (const c of list) if (freeBox(c[1], extra, true)) return c;
    for (const c of list) if (freeBox(c[1], extra, false)) return c;
    const f = nearestFree(x, y, W, H, extra);
    return f ? ["free", f] : (curC || list[0]);
  }
  // a block's place on screen (its box b, decided around an eye at x, y) and its look
  function setBlock(el2, mode, b, x, y, isCaps){
    if (el2._bx == null){ el2.style.left = "30px"; el2.style.top = "30px"; el2.style.right = "auto"; el2.style.bottom = "auto"; }
    el2._bx = b[0]; el2._by = b[1];
    if (el2._mode !== mode){
      el2._mode = mode;
      const vert = !isCaps && (mode === "a" || mode === "b");
      el2.classList.toggle("flip-x", !vert && b[2] <= x);                    // the tail points back toward her
      el2.classList.toggle("flip-y", !isCaps && (mode === "ru" || mode === "lu" || (mode === "free" && b[3] < y)));
      el2.classList.toggle("far", mode === "free");
      el2.classList.toggle("he-under", mode === "b"); el2.classList.toggle("he-over", mode === "a");
      if (isCaps) el2.classList.toggle("he-below", mode === "cb" || mode === "rb" || mode === "lb");   // YOUR MOVE stays nearest her
    }
  }
  // the element rides inside the eye, so its offset is its place on screen minus the eye's
  function pin(el2, x, y){
    if (el2._bx == null) return;
    const tr = `${(el2._bx - x).toFixed(1)}px ${(el2._by - y).toFixed(1)}px`;
    if (el2._tr !== tr){ el2._tr = tr; el2.style.translate = tr; }
    if (el2 === chipEl){
      const w = chipBox ? chipBox[0] : 300, tx = Math.round(Math.max(24, Math.min(w - 24, x - el2._bx)));
      if (el2._tx !== tx){ el2._tx = tx; el2.style.setProperty("--he-tx", tx + "px"); }
    }
  }
  function area(b, z){ const w = Math.min(b[2], z[2]) - Math.max(b[0], z[0]), h = Math.min(b[3], z[3]) - Math.max(b[1], z[1]); return w > 0 && h > 0 ? w * h : 0; }
  function capsRect(){ return capsEl && capsEl._bx != null && capsBox ? [capsEl._bx, capsEl._by, capsEl._bx + capsBox[0], capsEl._by + capsBox[1]] : null; }
  // where she stops for a line: the nearest spot (from where she is) whose balloon covers
  // nothing critical, as little of the files and cards as can be, not the hand, not her boxes
  function stopSpot(){
    const W = chipBox[0], H = chipBox[1];
    const bx0 = talk ? talk.x : (ex2 < 0 ? mx : ex2), by0 = talk ? talk.y : (ey2 < 0 ? my : ey2);
    const hand = mx >= 0 ? [mx - 40, my - 40, mx + 60, my + 70] : null;
    const cr = capsEl && capsEl.querySelector(".cx-cap.on") ? capsRect() : null;
    const keep = talk && chipEl && chipEl._bx != null ? [chipEl._bx, chipEl._by] : null;   // the next line stays put if it can
    const offs = [[0, 0]];
    for (const r of [40, 85, 140, 210, 290, 380]) for (let k = 0; k < 12; k++){ const a = k * Math.PI / 6; offs.push([Math.cos(a) * r, Math.sin(a) * r * .75]); }
    let best = null, bc = 1e18;
    for (const [dx, dy] of offs){
      const x = Math.max(34, Math.min(innerWidth - 34, bx0 + dx)), y = Math.max(40, Math.min(innerHeight - 34, by0 + dy));
      const eb = [x - 30, y - 30, x + 30, y + 30];
      let ce = 0; for (const z of zones) if (z[4]) ce += area(eb, z);
      if (hand) ce += area(eb, hand);
      for (const [mode, b] of cands(x, y, W, H, sx === 1 ? "r" : "l", false, null)){
        if (b[0] < 6 || b[1] < 6 || b[2] > innerWidth - 6 || b[3] > innerHeight - 6) continue;
        let c = Math.hypot(x - bx0, y - by0) * 30 + ce * 60 + (keep ? Math.hypot(b[0] - keep[0], b[1] - keep[1]) * 60 : 0);
        for (const z of zones) c += area(b, z) * (z[4] ? 60 : 1);
        if (hand) c += area(b, hand) * 30;
        if (cr) c += area(b, cr) * 30;
        if (c < bc){ bc = c; best = { x, y, mode, box: b }; }
      }
    }
    return best;
  }
  // a line begins (nextSay has put the words in): a bark rides the eye, a line stops her
  function beginLine(){
    if (!eye) return;
    if (!chipEl) chipEl = eye.querySelector(".he-chip");
    if (!capsEl) capsEl = eye.querySelector(".he-caps");
    const txt = (chipEl.textContent || "").trim(), n = txt ? txt.split(/\s+/).length : 0;
    chipBox = [chipEl.offsetWidth || 300, chipEl.offsetHeight || 56];
    zonesT = 0; refreshZones(performance.now());
    if (n <= 3 && !talk) return;
    const sp = stopSpot();
    if (!sp){ return; }
    if (talk && chipMode && chipMode !== sp.mode) switches++;
    changes++;
    talk = { x: sp.x, y: sp.y };
    chipMode = sp.mode;
    setBlock(chipEl, sp.mode, sp.box, sp.x, sp.y, false);
    pin(chipEl, ex2 < 0 ? sp.x : ex2, ey2 < 0 ? sp.y : ey2);   // now, not next frame: the new words never show at the old spot
    eye.classList.add("he-talking");
  }
  function endLine(){ talk = null; if (eye) eye.classList.remove("he-talking"); }
  function applySide(x, y){
    if (!eye) return;
    if (!chipEl) chipEl = eye.querySelector(".he-chip");
    if (!capsEl) capsEl = eye.querySelector(".he-caps");
    const saying = eye.classList.contains("he-says");
    const capsOn = !!(capsEl && capsEl.querySelector(".cx-cap.on"));
    const t = performance.now();
    if (saying || capsOn){
      if (chipSide === "") zonesT = 0;
      chipSide = "x";
      refreshZones(t);
    }
    const away = mx < 0 ? (x < innerWidth / 2 ? "r" : "l") : (sx === 1 ? "r" : "l");
    let cb = null;
    if (chipEl){
      if (saying && !talk){   // a bark rides the eye
        const [W, H] = chipBox;
        const rel = chipEl._bx != null && chipEl._riding ? [chipEl._bx - chipEl._rx, chipEl._by - chipEl._ry] : null;
        const c = pick(x, y, W, H, chipEl._riding ? chipMode : "", rel, away, false, null);
        if (c[0] !== chipMode){ if (chipMode && chipEl._riding) switches++; changes++; }
        chipMode = c[0]; cb = c[1];
        setBlock(chipEl, chipMode, cb, x, y, false);
        chipEl._riding = true; chipEl._rx = x; chipEl._ry = y;
      } else {
        chipEl._riding = false;
        if (saying && chipEl._bx != null) cb = [chipEl._bx, chipEl._by, chipEl._bx + chipBox[0], chipEl._by + chipBox[1]];
      }
      pin(chipEl, x, y);   // a line (or its fold) stands still on screen
    }
    if (capsEl){
      if (capsOn && capsBox){
        const cur = capsRect();
        const fits = cur && freeBox(cur, cb ? [cb] : null, false, !!talk);
        if (!cur || (capsDirty && !fits)){ if (!capsFading) layCaps(x, y, cb, !!cur); }
        else if (!fits){   // something important (or the hand) has sat on them a while: dissolve away
          if (!capsBadAt) capsBadAt = t;
          else if (t - capsBadAt > 1200 && !capsFading) layCaps(x, y, cb, true);
        } else capsBadAt = 0;
        capsDirty = false;
      } else if (!capsOn && capsEl._bx != null && !capsEl._goneAt) capsEl._goneAt = t;
      if (capsOn) capsEl._goneAt = 0;
      else if (capsEl._goneAt && t - capsEl._goneAt > 700){ capsEl._bx = null; capsEl._goneAt = 0; }
      pin(capsEl, x, y);
    }
    const dc = eye.querySelector(".he-dchip");
    if (dc) dc.classList.toggle("flip-x", away === "l");
  }
  // her boxes find a place around her (and her words); from an old place they dissolve
  // out and in, never slide
  function layCaps(x, y, cb, fade){
    const [W, H] = capsBox;
    const c = pick(x, y, W, H, "", null, mx < 0 ? "r" : (sx === 1 ? "r" : "l"), true, cb ? [cb] : null);
    capsBadAt = 0;
    if (capsMode && c[0] !== capsMode) switches++;
    changes++;
    if (!fade){ capsMode = c[0]; setBlock(capsEl, capsMode, c[1], x, y, true); return; }
    capsFading = true; capsEl.classList.add("he-fade");
    setTimeout(() => {
      capsMode = c[0]; setBlock(capsEl, capsMode, c[1], x, y, true);
      if (eye) pin(capsEl, ex2 < 0 ? x : ex2, ey2 < 0 ? y : ey2);
      capsEl.classList.remove("he-fade"); capsFading = false;
    }, 220);
  }
  function place(x, y){
    const tr = `translate(${x - 30}px, ${y - 30}px)`;
    if (eye && eye._tr !== tr){ eye._tr = tr; eye.style.transform = tr; }
    applySide(x, y);
    if (assumed){ // the journal is not NEAR the eye, it IS the eye, and it moves like it
      const l = Math.max(250, Math.min(innerWidth - 260, x)) + "px", tp = Math.max(200, Math.min(innerHeight - 220, y)) + "px";
      if (assumed._l !== l){ assumed._l = l; assumed.style.left = l; }
      if (assumed._t !== tp){ assumed._t = tp; assumed.style.top = tp; }
    }
  }

  // the BLINK, lids snap shut, she is elsewhere, lids open. Never a journey.
  function blink(afterShut){
    if (!eye) return;
    if (RM){ afterShut && afterShut(); return; }
    eye.classList.remove("he-blinking"); void eye.offsetWidth; eye.classList.add("he-blinking");
    blinkT = performance.now();
    if (afterShut) setTimeout(afterShut, 90);   // the shut apex, teleport happens blind
    setTimeout(() => eye && eye.classList.remove("he-blinking"), 260);
  }

  function frame(t){
    raf = requestAnimationFrame(frame);
    if (!eye) return;
    const live = document.body.classList.contains("cabin-on");
    if (eye._live !== live){ eye._live = live; eye.classList.toggle("live", live); }
    if (!live) return;
    if (glide){
      const k = Math.min(1, (t - glide.t0) / glide.dur);
      const e2 = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // easeInOut
      // a shallow arc, a straight slide reads mechanical, an arc reads ALIVE
      const mx = (glide.x0 + glide.np.x) / 2, my = (glide.y0 + glide.np.y) / 2 - 46;
      const x = (1 - e2) * (1 - e2) * glide.x0 + 2 * (1 - e2) * e2 * mx + e2 * e2 * glide.np.x;
      const y = (1 - e2) * (1 - e2) * glide.y0 + 2 * (1 - e2) * e2 * my + e2 * e2 * glide.np.y;
      place(x, y);
      if (k >= 1){ standAt = glide.np; glide = null; }
    } else if (standAt){
      if (standAt.orbit){ // she CIRCLES what she is savouring
        const q = catFear({ x: standAt.x + Math.cos(t * .0011) * standAt.orbit,
                            y: standAt.y + Math.sin(t * .0011) * standAt.orbit * .62 });
        place(q.x, q.y);
      } else { const q = catFear(standAt); place(q.x, q.y); }
    }
    else if (mx < 0){ // no cursor yet: perch by her core, top-left
      place(64, 96);
    } else follow(t);
    // the MOMENT: every so often, if they are near, the cat stares and the eye
    // blinks back, two housemates acknowledging each other and moving on
    if (!frame._catMoment) frame._catMoment = t + 16000;
    if (t > frame._catMoment){ frame._catMoment = t + 15000 + (t % 14000);
      try { const c = window.__game && window.__game._cat;
        if (c && catBox && eye){ const er = eye.getBoundingClientRect();
          const d2 = Math.hypot(er.left + 30 - (catBox.left + catBox.width / 2), er.top + 30 - (catBox.top + catBox.height / 2));
          if (d2 < 460 && (c.state === "sit" || c.state === "watch")){ c._enter("watch", 2.6); setTimeout(() => blink(), 700); } } } catch (e) {}
    }
    // idle life: a spontaneous blink now and then, a micro-saccade of the pupil
    if (!RM){
      if (!nextIdleBlink) nextIdleBlink = t + 5200;
      if (t > nextIdleBlink){ nextIdleBlink = t + 4600 + (t % 6100); if (t - blinkT > 900) blink(); }
      if (t > nextSacc){ nextSacc = t + 1700 + (t % 2300);
        const ir = eye.querySelector(".he-iris");
        if (ir) ir.style.transform = `translate(${((t % 7) - 3) * .9}px, ${((t % 5) - 2) * .8}px)`; }
    }
  }

  // ── SHE SPEAKS ONE LINE AT A TIME. The rule over everything: nothing appears and
  //    vanishes fast. Every line stays at least max(4 s, 75 ms per character); a new
  //    line never cuts one that has not had its reading time; when lines pile up, the
  //    least important WAITING line is dropped, never the one on show. A line may
  //    carry onShow, run the moment it appears (comic.js moves her eye and lands its
  //    impact then, so the picture and the words arrive together). ──
  let sayT = 0, sayQ = [], saying = null;
  const GRACE = { grace: true };   // a line just ended: she stays open a moment for the next one
  function readMs(html){
    const n = html && html.nodeType === 1 ? (html.textContent || "").length
      : String(html || "").replace(/<[^>]*>/g, "").length;
    const sp = window.__game && window.__game.speed;   // twice as long on Slow
    return Math.max(4000, 75 * n) * (sp === "slow" ? 2 : 1);
  }
  function say(html, opt){
    opt = opt || {}; if (!html) return;
    if (window.__helaMute && !opt.force) return;   // the tutorial silences her ambient barks; only its own lines pass
    // THE OWNER'S RULE: she speaks only when the player must act or something happened to
    // HIM that he cannot see; her commentary waits in her notes, read while TAB is held
    if (!opt.force && !opt.essential && window.__pdxHelp){ window.__pdxHelp.note(html, { key: opt.key }); return; }
    sayQ.push({ html, prio: opt.prio || 0, onShow: opt.onShow || null, ms: Math.max(readMs(html), opt.ms || 0),
      born: performance.now(), ttl: opt.ttl || 0 });
    while (sayQ.length > 2){   // keep two waiting at most: drop the least important older one
      let k = 0; for (let i = 1; i < sayQ.length - 1; i++) if (sayQ[i].prio < sayQ[k].prio) k = i;
      sayQ.splice(k, 1);
    }
    if (!saying || saying === GRACE){ clearTimeout(sayT); nextSay(); }
  }
  // lines on show plus waiting (comic.js paces the game's replay by it)
  function backlog(){ return sayQ.length + (saying && saying !== GRACE ? 1 : 0); }
  // a tiny synth for the parade's numbers: gains rise, losses fall, low volume
  window.__pdxTone = function(freq, dur, gain){
    try {
      const A = window.__audio; if (!A || !A.ctx || A.muted) return;
      const ctx = A.ctx, t0 = ctx.currentTime;
      const bus = A.sfxBus || A.master || ctx.destination;
      const o = ctx.createOscillator(), g2 = ctx.createGain();
      o.type = "triangle"; o.frequency.value = freq;
      g2.gain.setValueAtTime(0, t0);
      g2.gain.linearRampToValueAtTime(gain || .05, t0 + .012);
      g2.gain.exponentialRampToValueAtTime(.0001, t0 + (dur || .14));
      o.connect(g2).connect(bus); o.start(t0); o.stop(t0 + (dur || .14) + .02);
    } catch (e) {}
  };
  function whisper(){
    try {
      const A = window.__audio; if (!A || !A.ctx || A.muted) return;
      const ctx = A.ctx, t0 = ctx.currentTime;
      const bus = A.sfxBus || A.master || ctx.destination;
      [[148, 0], [111, .09]].forEach(([f, dt]) => {
        const o = ctx.createOscillator(), g2 = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g2.gain.setValueAtTime(0, t0 + dt);
        g2.gain.linearRampToValueAtTime(.085, t0 + dt + .03);
        g2.gain.exponentialRampToValueAtTime(.0001, t0 + dt + .16);
        o.connect(g2).connect(bus); o.start(t0 + dt); o.stop(t0 + dt + .2);
      });
    } catch (e) {}
  }
  function nextSay(){
    // a line that waited longer than its ttl is no longer news: the table has moved on
    let it = sayQ.shift();
    while (it && it.ttl && performance.now() - it.born > it.ttl) it = sayQ.shift();
    if (!it || !eye){ saying = null; return; }
    saying = it;
    whisper();   // she clears her throat, two low notes, until the real voice ships
    const chip = eye.querySelector(".he-chip"); if (!chip){ saying = false; return; }
    // a DOM node (comic.js lines, built with textContent) or her own trusted markup
    if (it.html && it.html.nodeType === 1){ chip.textContent = ""; chip.appendChild(it.html); }
    else chip.innerHTML = it.html;
    chipSide = "";   // new words, new size: measure and place again
    beginLine();     // a line stops her where her words cover nothing important
    // already speaking: the words swap in place (comic.js fades them in); else she opens
    if (!eye.classList.contains("he-says")){ void eye.offsetWidth; eye.classList.add("he-says"); }
    try { it.onShow && it.onShow(it.ms); } catch (e) {}
    clearTimeout(sayT);
    // the next line swaps in place; with nothing waiting she closes, slowly
    sayT = setTimeout(() => {
      if (sayQ.length) { nextSay(); return; }
      // nothing waiting: she folds only if no new line comes within a moment
      saying = GRACE;
      sayT = setTimeout(() => { if (eye) eye.classList.remove("he-says"); saying = null; endLine(); }, 700);
    }, it.ms);
  }

  // ── SHE BECOMES THE MESSAGE: a window unfolds FROM an eye at (x,y).
  //    More than one message and she simply SPLITS, copies are cheap for a goddess. ──
  function manifest(opt){
    opt = opt || {};
    const host = document.createElement("div");
    host.className = "he-window " + (opt.cls || "");
    host.innerHTML = eyeSVG("he-svg he-winkeye") + `<div class="he-pane"></div>`;
    const pane = host.querySelector(".he-pane");
    if (opt.node) pane.appendChild(opt.node); else pane.innerHTML = opt.html || "";
    document.body.appendChild(host);
    const px = Math.max(16, Math.min(innerWidth - 16, opt.x != null ? opt.x : innerWidth / 2));
    const py = Math.max(56, Math.min(innerHeight - 16, opt.y != null ? opt.y : innerHeight * .62));
    host.style.left = px + "px"; host.style.top = py + "px";
    windows++;
    // she blinks; the window's eye is HER, arriving, then the pane unfolds from it
    blink();
    if (opt.assume && eye){ eye.classList.add("he-absent"); assumed = host; }   // the window IS the eye now
    if (opt.wire){
      // BY CHRONOMETRIC WIRE: the eye receives for a beat, ticking ring, wire
      // label, and only then the page unrolls off the press.
      host.classList.add("wiring");
      const lbl = document.createElement("i"); lbl.className = "he-wirelbl";
      lbl.textContent = "RECEIVING WIRE"; host.appendChild(lbl);
      let tks = 0;
      const tick = setInterval(() => { tks++;
        try { window.__audio && window.__audio.play("dice", { power: .18 }); } catch (e) {}
        lbl.textContent = "RECEIVING WIRE" + ".".repeat(tks % 4);
      }, 300);
      setTimeout(() => { clearInterval(tick); lbl.remove();
        host.classList.remove("wiring"); host.classList.add("open");
        try { window.__audio && window.__audio.play("place"); } catch (e) {}
      }, 1500);
    } else
    requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add("open")));
    let closed = false;
    const close = () => { if (closed) return; closed = true; windows--;
      host.classList.remove("open"); host.classList.add("fold");
      if (opt.assume && eye){ if (assumed === host) assumed = null;
        setTimeout(() => { eye.classList.remove("he-absent"); blink(); }, 300); }
      setTimeout(() => host.remove(), 340); if (opt.onClose) opt.onClose(); };
    if (opt.hold) setTimeout(close, opt.hold);
    return { close, el: host, pane };
  }

  // ── THE SPLIT: one copy per valid target, her gaze multiplied, a mark on each ──
  // the things she points at get the little yellow box (the eye itself never leaves
  // the cursor): one box per valid target
  function aimSplit(rects, tone){
    clearSplit();
    (rects || []).slice(0, 12).forEach((r) => {
      const c = document.createElement("div");
      c.className = "he-ring " + (tone || "");
      c.style.left = (r.x - 4) + "px"; c.style.top = (r.y - 4) + "px";
      c.style.width = (r.w + 8) + "px"; c.style.height = (r.h + 8) + "px";
      document.body.appendChild(c); copies.push(c);
    });
  }
  function clearSplit(){ copies.splice(0).forEach(c => { c.classList.remove("on"); setTimeout(() => c.remove(), 240); }); }

  // she stands where she is SENT, arriving, as always, on a blink
  // THE OWNER'S RULE: the eye always follows the cursor and never flies to a subject
  // on its own. setPost and clearPost stay for their callers but no longer move her;
  // a subject is shown with the yellow box instead (aimSplit, highlight).
  function setPost(){}
  function clearPost(){ glide = null; standAt = null; }
  let hiEl = null, hiT = 0;
  function highlight(r, ms){
    clearTimeout(hiT);
    if (hiEl){ hiEl.remove(); hiEl = null; }
    avoidR = null; chipSide = "";
    if (!r || !(r.width > 2)) return;
    hiEl = document.createElement("div"); hiEl.className = "he-ring he-ring-hi";
    hiEl.style.left = (r.left - 5) + "px"; hiEl.style.top = (r.top - 5) + "px";
    hiEl.style.width = (r.width + 10) + "px"; hiEl.style.height = (r.height + 10) + "px";
    document.body.appendChild(hiEl);
    avoidR = { left: r.left - 12, top: r.top - 12, right: r.right + 12, bottom: r.bottom + 12 };
    hiT = setTimeout(() => highlight(null), ms || 4000);
  }

  // ── SHE DIRECTS: posts at the screen edge and OPENS as the directional message ──
  let dchipEl = null;
  function direct(opt){
    if (!eye) return;
    if (!opt){ if (dchipEl){ dchipEl.classList.remove("on"); const d = dchipEl; setTimeout(() => d.remove(), 300); dchipEl = null; eye.classList.remove("he-directs"); } return; }
    const M = 74, W2 = innerWidth, H2 = innerHeight;
    const spot = { left:  { x: M, y: H2 * .46 },  right: { x: W2 - M, y: H2 * .46 },
                   up:    { x: W2 * .5, y: 96 },  down:  { x: W2 * .5, y: H2 - 86 },
                   upleft:  { x: 120, y: 120 },   upright: { x: W2 - 130, y: 120 },
                   downleft:{ x: 120, y: H2 - 110 }, downright:{ x: W2 - 130, y: H2 - 110 } }[opt.dir] || { x: M, y: H2 * .46 };
    if (!dchipEl){ dchipEl = document.createElement("div"); dchipEl.className = "he-dchip"; eye.appendChild(dchipEl); chipSide = ""; }
    const rot = { left: 180, right: 0, up: -90, down: 90,
      upleft: -135, upright: -45, downleft: 135, downright: 45 }[opt.dir] != null
      ? { left: 180, right: 0, up: -90, down: 90, upleft: -135, upright: -45, downleft: 135, downright: 45 }[opt.dir] : 180;
    dchipEl.innerHTML = `<svg viewBox="0 0 40 40" style="transform:rotate(${rot}deg)"><path d="M8 20 H28 M21 12 L29 20 L21 28" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      + `<span class="he-dverb">${opt.verb || "You are needed"}</span>`
      + (opt.key ? `<kbd>${opt.key}</kbd>` : "");
    void spot;   // (the arrow points where the place is; she stays with the cursor)
    dchipEl.onclick = (e) => { e.stopPropagation(); if (opt.onClick) opt.onClick(); };
    requestAnimationFrame(() => requestAnimationFrame(() => { if (dchipEl) dchipEl.classList.add("on"); eye.classList.add("he-directs"); }));
  }

  window.__helaEye = { say, manifest, aimSplit, clearSplit, blink, setPost, clearPost, direct, highlight,
    caps(){ if (!capsEl && eye) capsEl = eye.querySelector(".he-caps"); return capsEl; },
    live(){ return !!(eye && eye._live); }, posted(){ return !!(standAt || glide); }, backlog,
    relayout(){ chipSide = ""; capsDirty = true; },
    stopped(){ return !!talk; },   // she is standing still, speaking
    placement(){ return { chip: chipMode, caps: capsMode, zones: zones.length, chipBox, capsBox, changes, switches, parked: !!parked, talk: !!talk, why: whyMoved }; },   // for checks
    pos(){ if (!eye) return { x: 64, y: 96 }; const r = eye.getBoundingClientRect(); return { x: r.left + 30, y: r.top + 30 }; } };
  window.__helaSay = (html, opt) => say(html, opt);   // she owns her voice now

  function ensure(){ build(); if (!raf) raf = requestAnimationFrame(frame); if (!eye) setTimeout(ensure, 500); }
  ensure();
})();


/* ═══ HER VOICE, one bank, curated. Jarvis's diction, Helheim's appetite. ═══ */
(function helaVoice(){
  const V = {
    crit_life: ["Your thread is down to one strand, sir. The Norns lean in. So do I.",
      "One more wound and you are paperwork. I say this with the deepest affection.",
      "Steady. You are one bad hour from my ledger, and I write in ink."],
    wanted_self: ["You are WANTED, dead or alive. I have taken the liberty of preferring the former.",
      "My ravens brought the bill. Your face, a price, and poor spelling.",
      "Four gold for your skull. Frankly, I would have opened at five."],
    wanted_other: ["A rival has been posted. Shall I circle the reward in red for you?",
      "Someone else's head has a price. How festive. Sharpen something.",
      "They papered a rival's face across the centuries. Hunting season, sir."],
    terminated_other: ["A thread is cut. Hush, this part is mine. I comb their hours and shelve them warm.",
      "Terminated. Exquisite. I pressed their final moment flat, like a flower.",
      "Hear that quiet? That was an entire lifetime being stamped RECEIVED."],
    terminated_self: ["You have died. Everything is in order. I have been expecting you for some time.",
      "The sea closes over you. Take my hand, your name was in gold before you fell.",
      "Welcome. Your drawer has been waiting since the day we met."],
    paradox_self: ["You broke causality. Causality is breaking you back. I do love symmetry.",
      "You crossed your own wake. The Norns hate knots. They cut what tangles.",
      "History disagrees with your version of events. It bills accordingly."],
    target_guide: ["Choose who suffers. Take your time, I enjoy this part either way.",
      "Pick a throat. The rest is bookkeeping.",
      "Select a target. Consider who would look best in my files."],
    contract_guide: ["Payment is due to you, for once. Take the useful thing, not the shining one.",
      "One reward, sir. Choose what outlives you, most things will.",
      "Pick your prize. The bureau pays in things it stole first."],
    deliver_guide: ["The drawer is waiting. One does not keep an antique waiting.",
      "Deliver the relic where it belongs. Everything belongs where it died.",
      "Set it down gently. It is older than every regret you own."],
    activation_guide: ["Your instruments may speak now. Wake what you need.",
      "Now or never, and never is my department.",
      "The hour permits activations. Brief, like most mercies."],
    market_idle: ["Shall I fetch a chair? The market closes; my patience merely thins.",
      "Take all the time you like. Cause of death: shopping. I'll write it.",
      "Browsing again? Empires have fallen in less time. I counted."],
    boiler_high: ["Pressure critical. I would step back, were I capable of dying. You are.",
      "That needle is past prayer. Oh, this will be a busy hour for me.",
      "The boiler sings, sir. That pitch means shrapnel. I adore this movement."],
    game_win: ["You outlasted them all. I am, and I say this rarely, pleased.",
      "You have won. Even my hall will hear of it, and my hall hears everything.",
      "You win. The others are archived; you are merely postponed. Bravo."],
    game_loss: ["You lost. I have filed you under 'valiant', between 'vain' and 'vanished'.",
      "You have lost, sir. Come. I file the brave ones with ribbon.",
      "The sea kept you. I kept a copy."],
    archive_empty: ["Empty. Every archive begins this way. None of them end this way.",
      "No deaths yet. I confess a certain professional impatience.",
      "Nothing filed. The shelves are hungry. So, frankly, am I."],
    brain_greeting: ["This is where I keep everything. Every death, every debt, every you.",
      "My memory, sir. Whatever happens to you happens here twice, and here it stays.",
      "Touch nothing. These are the papers of the dead, and yours, in advance."],
  };
  const last = {};
  window.__helaVoice = function(key){
    const a = V[key]; if (!a) return "";
    let i = (Math.random() * a.length) | 0;
    if (a.length > 1 && i === last[key]) i = (i + 1) % a.length;   // never the same line twice running
    last[key] = i; return a[i];
  };
})();

/* ═══════════════════════════════════════════════════════════════════════════════
   THE GUIDE: how she facilitates the NON-ORDINARY. No ray, no wall of text:
   the WORLD BLURS like a camera pulling focus, her marks ignite on what is valid,
   and the eye itself goes where your attention should. Allocate and travel, the
   ordinary, are deliberately untouched.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function helaGuide(){
  let cur = "", said = "", patrolTimer = 0, patrolIdx = 0, patrolLaps = 0, huntKey = "";
  const eye = () => window.__helaEye;

  function rectsOf(sel){
    return [...document.querySelectorAll(sel)]
      .map(el => { const r = el.getBoundingClientRect();
        return r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < innerHeight ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; })
      .filter(Boolean);
  }
  // (the camera-blur experiment died at my hand: it hid USEFUL information.
  //  Focus is now carried by PUNCH on the valid things and by where SHE stands.)
  function centroidPost(rects, opt){
    if (!rects.length) return;
    const cx = rects.reduce((a, r) => a + r.x + r.w / 2, 0) / rects.length;
    const cy = Math.min(...rects.map(r => r.y)) - 34;
    const E = eye(); if (E) E.setPost(cx, cy, opt);
  }
  function speak(key){
    if (said === cur) return; said = cur;
    const line = window.__helaVoice ? window.__helaVoice(key) : "";
    if (line && window.__helaSay) window.__helaSay(line, { ms: 5600 });
  }

  const HUNT_SEL = ".pcard.pcard-choose, .mc.targetable, .market-row .card.can-destroy, .market-row .card.can-steal, .prompt .card.is-actionable, .secret-card-wrap .card.can-select";

  function apply(kind){
    const E = eye(); if (!E) return;
    document.body.classList.remove("hg-hunt", "hg-bless");
    stopPatrol(); E.clearSplit(); E.clearPost();
    if (kind === "activation"){
      document.body.classList.add("hg-bless");
      const rects = rectsOf("#rucksack-zone .ruck-pocket .card.act-ready");
      if (rects.length){
        E.aimSplit(rects, "bless");
        setTimeout(() => { if (document.body.classList.contains("hg-bless")) E.clearSplit(); }, 1600);
        centroidPost(rects, { glide: true });   // she is SEEN crossing to the instruments
      }
      speak("activation_guide");
    } else if (kind === "destroy_target" || kind === "steal_target" || kind === "target"){
      document.body.classList.add("hg-hunt");
      huntKey = "";   // rects settle async (sheets pulse in), the poll below aims her
      speak("target_guide");
    } else if (kind === "deliver" || kind === "reward_category"){
      document.body.classList.add("hg-bless");
      const cells = rectsOf("#drawer-zone .cab2-cell.hg-cell .cab2-front");
      if (cells.length) centroidPost(cells);   // the eye goes and HOVERS the right drawer
      speak(kind === "deliver" ? "deliver_guide" : "contract_guide");
    } else if (kind === "market"){
      startPatrol();
    } else if (kind === "matrix_buff"){
      document.body.classList.add("hg-bless");
    }
    if (!kind){ said = ""; }
  }

  // the HUNT re-aims while candidates drift (panels re-render, sheets pulse).
  // She is UNBOUND from the cursor here, posted over the prey, copies on each.
  function pollHunt(){
    if (!document.body.classList.contains("hg-hunt")) return;
    const rects = rectsOf(HUNT_SEL);
    const key = rects.map(r => Math.round(r.x) + ":" + Math.round(r.y)).join("|");
    if (key !== huntKey){ huntKey = key; const E = eye();
      if (E){ if (rects.length){ E.aimSplit(rects, "hunt"); centroidPost(rects); } else E.clearSplit(); } }
  }

  // ── MARKET PATROL: her attention drifts between what you can AFFORD; dawdle
  //    long enough and she drifts to the PASS sign. Movement guides; text sleeps. ──
  function startPatrol(){ patrolIdx = 0; patrolLaps = 0; stepPatrol(); }
  function stopPatrol(){ clearTimeout(patrolTimer); patrolTimer = 0; }
  function stepPatrol(){
    stopPatrol();
    if (document.body.classList.contains("tut-story")) return;
    patrolTimer = setTimeout(stepPatrol, 1900);
    const E = eye(); if (!E) return;
    const app = window.__game;
    if (!app || !app.pendingReq || app.pendingReq.kind !== "market") return;
    if (document.querySelector("#hela-eye .he-dchip")) return;   // she is DIRECTING, patrol waits
    const buys = rectsOf("#market-zone .market-row .card.can-buy, #market-zone .market-row .card.can-renew");
    if (!buys.length){ E.clearPost(); return; }
    if (patrolIdx >= buys.length){
      patrolIdx = 0; patrolLaps++;
      if (patrolLaps >= 2){   // dawdling: she glances at the PASS sign and sighs
        const ps = rectsOf("#market-zone .side-sign");
        if (ps.length){ E.setPost(ps[0].x + ps[0].w / 2, ps[0].y - 26); speak("market_idle"); return; }
      }
    }
    const r = buys[patrolIdx++];
    E.setPost(r.x + r.w / 2, r.y - 24);
  }

  let n = 0;
  setInterval(() => {
    // during the tutorial's story the eye belongs to the story: it speaks from beside
    // her balloon, and the guide does not move her anywhere else
    if (document.body.classList.contains("tut-story")) { stopPatrol(); return; }
    const app = window.__game;
    const presenting = (typeof window.__seaPresenting === "function") && window.__seaPresenting();
    const req = (!presenting && app && app.pendingReq && (app.pendingReq.seat == null || app.pendingReq.seat === app.seat)) ? app.pendingReq : null;
    const kind = req ? req.kind : "";
    const cab = document.body.classList.contains("cabin-on");
    const k = cab ? kind : "";
    if (k !== cur){ cur = k; apply(k); }
    if (cab && ((n++) % 2 === 0)) pollHunt();
    // her mark may not be reachable at apply-time (other scene), keep reaching for it
    if (cab && (cur === "deliver" || cur === "reward_category")){
      const cells = rectsOf("#drawer-zone .cab2-cell.hg-cell .cab2-front");
      if (cells.length && window.__helaEye){
        const key2 = Math.round(cells[0].x) + ":" + Math.round(cells[0].y);
        if (key2 !== pollHunt._dk){ pollHunt._dk = key2;
          window.__helaEye.setPost(cells[0].x + cells[0].w / 2, cells[0].y - 26, { glide: true }); } }
    } else pollHunt._dk = "";
  }, 420);
})();


/* ═══════════════════════════════════════════════════════════════════════════════
   HELA'S CORE: her digital cerebrum, and the expedition's true operations log.
   Every Hour hardens into a memory-node on a slow-turning armature; dispatches
   orbit the hour they broke. Hover an hour: its page. Click a dispatch: the
   article, unfolded. Click again: folded. Nothing here has an X or an arrow.
   Two bodies, one mind: the full core on the paperwork desk, a mini core on
   the visor's brow that blooms whenever news arrives.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function helaBrain(){
  if (window.__helaBrainLog) return;
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TURN_COL = "var(--vz, #6fe8c8)";   // her own colour, which is the player's
  const KIND_COL = { relic: "#7dd87d", breach: "#e2c078", warrant: "#e8a53a", wanted: "#e8a53a",
    lost: "#ff5a44", cove: "#b48ce8", market: "#e2c078", danger: "#ff5a44", paradox: "#b48ce8",
    cp: "#e2c078", travel: "var(--vz, #6fe8c8)" };
  const turns = new Map();      // hour -> { hour, logs: [{cls, text}], sats: [dispatch-idx] }
  const disp = [];              // filed dispatches {hour, kind, headline, sub, say, html}
  let greeted = false;

  function turnOf(hour){
    if (!turns.has(hour)) turns.set(hour, { hour, logs: [], sats: [] });
    return turns.get(hour);
  }
  window.__helaBrainLog = function(hour, cls, text){ turnOf(hour || 0).logs.push({ cls, text }); };
  window.__helaBrainHours = function(){ return [...turns.keys()].filter(h => h > 0).sort((a, b) => a - b); };
  window.__helaBrainFile = function(item){
    const i = disp.push(item) - 1;
    turnOf(item.hour === "--" ? 0: +item.hour || 0).sats.push(i);
    // THE NEWS IS A MESSAGE, and the eye IS the message: it opens INTO the article
    if (document.body.classList.contains("cabin-on")) newsBloom(i, true);
  };
  // the one reader everywhere else routes to (starred log rows, editions)
  window.__helaOpenArchive = function(){ if (disp.length) newsBloom(disp.length - 1); };
  // the eye expands into the dispatch, holds, folds back into itself; the memory
  // stays filed as a satellite in the core, same object, two moments
  const openNews = new Map();   // disp index -> window (the press never prints twice)
  /* THE TEMPORAL HERALD stays on the table until the player clicks it away (never a
     timer): the first one is a shock, it must be read. It opens above the table's
     middle, clear of the machine and the dice. While the first edition of the match
     is up (it opened by itself), the replay waits politely behind it (__heraldWait,
     game.js) and picks up the moment it is closed; later editions stay until clicked
     while the table plays on. The first edition comes with HELA's line about it. */
  let heraldFirst = true, autoWin = null;
  const heraldWaiters = [];
  function heraldDone(){ autoWin = null; heraldWaiters.splice(0).forEach((r) => { try { r(); } catch (e) {} }); }
  window.__heraldSkip = function(){ if (autoWin) autoWin.close(); };   // F (skip) puts it away
  window.__heraldWait = function(){
    if (!autoWin || document.hidden || window.__helaMute) return null;
    return new Promise((r) => heraldWaiters.push(r));
  };
  // ONE edition at a time: the others that print meanwhile wait behind it, counted on
  // it ("+2 more"), and the next opens when it is put away
  const heraldQ = [];
  function heraldMore(){
    for (const w of openNews.values()){
      const pane = w && (w.pane || w.el); if (!pane) continue;
      let tag = pane.querySelector(".hb-newsmore");
      if (!heraldQ.length){ if (tag) tag.remove(); continue; }
      if (!tag){ tag = document.createElement("div"); tag.className = "hb-newsmore"; pane.appendChild(tag); }
      tag.textContent = "+" + heraldQ.length + " more";
    }
  }
  function newsBloom(i, auto){
    const it = disp[i]; if (!it || !window.__helaEye) return;
    if (openNews.has(i)) return;                     // SAME journal already on the table
    if (auto && openNews.size){ if (!heraldQ.includes(i)) heraldQ.push(i); heraldMore(); return; }
    const E = window.__helaEye;
    const node = document.createElement("div");
    node.className = "hb-newsread"; node.innerHTML = it.html || "";
    const hint = document.createElement("div"); hint.className = "hb-newshint";
    hint.textContent = "Click the paper to put it away";
    node.appendChild(hint);
    const others = openNews.size;                    // a DIFFERENT journal? sit beside it
    // it lies over the field case (top-left), clear of the files, the machine and the dice;
    // with the case out of view (another scene) it takes the table's middle
    const rz = document.getElementById("rucksack-zone"), rr = rz && rz.getBoundingClientRect();
    const onCase = !!(rr && rr.width > 120 && rr.right > 60 && rr.left < innerWidth - 60 && rr.bottom > 60 && rr.top < innerHeight - 60);
    let x = onCase ? rr.left + rr.width / 2 : innerWidth * .56, y = onCase ? rr.top + rr.height / 2 : innerHeight * .42;
    x = Math.max(236, Math.min(innerWidth - 236, x + others * 60)); y += others * 40;
    let win = null;
    win = E.manifest({ x, y, node, cls: "he-news" + (onCase ? " he-news-case" : ""), wire: true,
      onClose: () => { openNews.delete(i); if (autoWin && autoWin === win) heraldDone();
        heraldMore();
        if (heraldQ.length && !openNews.size){ const n = heraldQ.shift(); setTimeout(() => newsBloom(n, true), 380); } } });
    openNews.set(i, win);
    // the whole paper stays on screen (its laid-out height, measured once before it shows)
    if (win && win.el && win.pane){
      // clear of the TAB key and the Hour label in the top-left corner (help.js #pdx-tabkey)
      const h = win.pane.offsetHeight || 300, m = 12, top = 84;
      win.el.style.top = Math.max(h / 2 + top, Math.min(innerHeight - h / 2 - m, y)) + "px";
    }
    heraldMore();
    // the replay waits behind the FIRST edition of the match only (the shock of first
    // appearance); later ones stay until clicked while the table plays on
    if (auto && win && heraldFirst && !window.__helaMute){ if (autoWin) heraldDone(); autoWin = win; }
    if (win && win.el) win.el.addEventListener("click", () => win.close());
    if (heraldFirst && !window.__helaMute){
      heraldFirst = false;
      try { window.__helaSay && window.__helaSay("The <b>Temporal Herald</b>: the C.R.O.N.O.S. prints it for the last timeline. Rob the Merchant or terminate a traveler and it reports you, and the clipping stays on your file for everyone to read.", { ms: 12000 }); } catch (e) {}
    }
  }

  /* ══ HER BRAIN (#hela-brain-full): the core you spin and play with ════════════════
     The Hours orbit her heart as dots you can grab: drag anywhere to spin her (she
     keeps a little momentum), click an Hour to read its page, click a Herald dot to
     read the edition, click the heart for the ledger of loose rolls. The dots are big,
     labelled and lit on hover, and a hint says what to do until the first touch.
     Keys: L opens her (turns the camera to the desk and opens the latest Hour),
     Left and Right turn the Hours, Esc closes. She only moves while she is being
     handled, just opened, or given a new memory; still, she costs nothing per frame
     (the loop stops itself and anything that needs her wakes it). ══ */
  function makeCore(id, R, mount){
    const root = document.createElement("div");
    root.id = id; root.className = "hb-core";
    root.innerHTML = `
      <div class="hb-armature">
        <i class="hb-ring hb-r1"></i><i class="hb-ring hb-r2"></i><i class="hb-ring hb-r3"></i>
        <i class="hb-heart" title="The ledger of rolls outside the machine"></i>
      </div>
      <div class="hb-nodes"></div>
      <div class="hb-page"></div>
      <div class="hb-hint"><b>HELA'S MEMORY</b><span>drag to spin her &middot; click an Hour to read it &middot; <kbd>L</kbd></span></div>`;
    mount.appendChild(root);
    const inst = { root, R, ry: Math.PI * .3, rx: -.18, vy: 0, hover: null, drag: null, over: false,
      spinUntil: 0, dirty: true,
      nodes: root.querySelector(".hb-nodes"), page: root.querySelector(".hb-page"), els: new Map() };
    const touched = () => {
      if (root.classList.contains("hint-seen")) return;
      root.classList.add("hint-seen");
      try { localStorage.setItem("pdx-brain-hint", "1"); } catch (e) {}
    };
    try { if (localStorage.getItem("pdx-brain-hint")) root.classList.add("hint-seen"); } catch (e) {}
    root.addEventListener("pointerenter", () => { inst.over = true; wake(); });
    root.addEventListener("pointerleave", () => { inst.over = false; });
    // drag to rotate, BOTH axes; she is maleable, and she keeps a little momentum
    root.addEventListener("pointerdown", (e) => {
      // nodes are CLICK targets, capturing them for drag would eat their clicks
      if (e.target.closest(".hb-node") || e.target.closest(".hb-page") || e.target.closest(".hb-read") || e.target.closest(".ledger") || e.target.closest(".hb-heart")) return;
      inst.drag = { x: e.clientX, y: e.clientY, ry: inst.ry, rx: inst.rx, lx: e.clientX, lt: performance.now() };
      inst.vy = 0; root.classList.add("grabbing"); touched(); wake();
      root.setPointerCapture && root.setPointerCapture(e.pointerId);
    });
    root.addEventListener("pointermove", (e) => {
      if (!inst.drag) return;
      inst.ry = inst.drag.ry + (e.clientX - inst.drag.x) * 0.011;
      inst.rx = Math.max(-1.1, Math.min(1.1, inst.drag.rx + (e.clientY - inst.drag.y) * 0.009));
      const now = performance.now(), dt = Math.max(8, now - inst.drag.lt);
      inst.vy = Math.max(-.08, Math.min(.08, (e.clientX - inst.drag.lx) * 0.011 * (16 / dt)));
      inst.drag.lx = e.clientX; inst.drag.lt = now;
    });
    const drop = () => { if (!inst.drag) return; inst.drag = null; root.classList.remove("grabbing"); wake(); };
    root.addEventListener("pointerup", drop); root.addEventListener("pointercancel", drop);
    root.addEventListener("click", touched);
    return inst;
  }

  /* ── projection: hours on a golden spiral band, satellites in tow ── */
  function project(inst, t){
    const hours = [...turns.keys()].sort((a, b) => a - b);
    const N = Math.max(hours.length, 1);
    const seen = new Set();
    const cp = Math.cos(inst.rx || 0), sp = Math.sin(inst.rx || 0);
    hours.forEach((h, i) => {
      const th = i * 2.399963 + inst.ry;                       // golden angle spacing
      const band = N > 1 ? (i / (N - 1) - .5) : 0;             // vertical band -.5..+.5
      const x3 = Math.cos(th) * inst.R, z0 = Math.sin(th) * inst.R;
      const y0 = band * inst.R * .78;
      const y3 = y0 * cp - z0 * sp, z3 = y0 * sp + z0 * cp;    // PITCH, she turns on both axes
      const depth = (z3 / inst.R + 1) / 2;                     // 0 far .. 1 near
      const sc = .82 + .18 * depth, op = .55 + .45 * depth;   // far Hours stay readable
      const tn = turnOf(h);
      placeNode(inst, "t" + h, {
        x: x3, y: y3 - z3 * .12, sc, op, z: Math.round(depth * 40),
        col: TURN_COL, cls: "hb-turn" + (inst.pinnedHour === h ? " pinned" : ""), label: "HOUR " + h,
        title: `Hour ${h}: ${tn.logs.length} ${tn.logs.length === 1 ? "entry" : "entries"}${tn.sats.length ? `, ${tn.sats.length} Herald ${tn.sats.length === 1 ? "notice" : "notices"}` : ""}. Click to read.`,
        hour: h, sat: null });
      seen.add("t" + h);
      // satellites orbit their hour, small, bright, clickable: the Herald's notices
      tn.sats.forEach((di, k) => {
        const phi = inst.ry * 1.7 + k * (Math.PI * 2 / Math.max(tn.sats.length, 3));
        const it = disp[di];
        const hx = x3, hy = y3 - z3 * .12;                       // the hour it belongs to
        const sx2 = hx + Math.cos(phi) * 46, sy2 = hy + Math.sin(phi) * 30 - 3;
        // the TETHER, the dispatch is chained to its hour, visibly, moving as one
        placeLink(inst, "l" + di, hx, hy, sx2, sy2, KIND_COL[it.kind] || "#e2c078", op * .55, Math.round(depth * 40));
        seen.add("l" + di);
        placeNode(inst, "d" + di, {
          x: sx2, y: sy2,
          sc: sc * .9, op: Math.min(1, op + .2), z: Math.round(depth * 40) + 1,
          col: KIND_COL[it.kind] || "#e2c078", cls: "hb-sat", label: "",
          title: "The Temporal Herald: " + plain(it.headline) + ". Click to read.",
          hour: h, sat: di });
        seen.add("d" + di);
      });
    });
    for (const [key, el2] of inst.els) if (!seen.has(key)){ el2.remove(); inst.els.delete(key); }
  }
  const plain = (html) => { const t = document.createElement("template"); t.innerHTML = String(html || ""); return t.content.textContent || ""; };
  function placeLink(inst, key, x1, y1, x2, y2, col, op, z){
    let el2 = inst.els.get(key);
    if (!el2){ el2 = document.createElement("i"); el2.className = "hb-link";
      inst.nodes.appendChild(el2); inst.els.set(key, el2); }
    const dx = x2 - x1, dy = y2 - y1;
    el2.style.transform = `translate(${x1.toFixed(1)}px, ${y1.toFixed(1)}px) rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`;
    el2.style.width = Math.hypot(dx, dy).toFixed(1) + "px";
    el2.style.opacity = op.toFixed(3); el2.style.zIndex = z; el2.style.color = col;
  }
  function placeNode(inst, key, p){
    let el2 = inst.els.get(key);
    if (!el2){
      el2 = document.createElement("button");
      el2.type = "button"; el2.className = "hb-node " + p.cls;
      el2.dataset.key = key;
      inst.nodes.appendChild(el2); inst.els.set(key, el2);
      // hover only FREEZES the orbit for the hand; pages open on CLICK alone
      el2.addEventListener("pointerenter", () => { inst.hover = key; });
      el2.addEventListener("pointerleave", () => { if (inst.hover === key) inst.hover = null; });
      if (p.sat != null){
        el2.addEventListener("click", (e) => { e.stopPropagation();
          if (el2._dragged){ el2._dragged = false; return; }   // a drag is not a click
          toggleArticle(inst, p.sat); });
        // drag a memory OUT of the core: the article PINS where you drop it
        el2.addEventListener("pointerdown", (e) => {
          const sx2 = e.clientX, sy2 = e.clientY; let moved = false;
          const mv = (ev) => { if (Math.hypot(ev.clientX - sx2, ev.clientY - sy2) > 55) moved = true; };
          const up = (ev) => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up);
            if (!moved) return; el2._dragged = true;
            const it = disp[p.sat]; if (!it || !window.__helaEye) return;
            const node = document.createElement("div");
            node.className = "hb-newsread"; node.innerHTML = it.html || "";
            const win = window.__helaEye.manifest({ x: ev.clientX, y: ev.clientY, node, cls: "he-news he-pinnedclip" });
            if (win && win.el){ win.el.addEventListener("click", () => win.close());
              armAnyClose(() => win.close()); }
          };
          window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
        });
      }
      else el2.addEventListener("click", (e) => { e.stopPropagation();   // an HOUR pins its page open
        if (inst.pinnedHour === p.hour) closePage(inst);
        else openPage(inst, p.hour); });
    }
    el2.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${p.sc.toFixed(3)})`;
    el2.style.opacity = p.op.toFixed(3);
    el2.style.zIndex = p.z;
    el2.style.color = p.col;
    if (el2.className !== "hb-node " + p.cls) el2.className = "hb-node " + p.cls;
    if (p.title && el2.title !== p.title) el2.title = p.title;
    if (p.label){   // the Hour's name on a small plate beside the dot, always upright
      let lb = el2.firstElementChild;
      if (!lb){ lb = document.createElement("span"); lb.className = "hb-lbl"; el2.appendChild(lb); }
      if (lb.textContent !== p.label) lb.textContent = p.label;
    }
  }

  // ONE law for everything the core opens: the NEXT click anywhere closes it
  // (exactly how the traveler files close). Armed after the opening click settles.
  function armAnyClose(fn){
    setTimeout(() => document.addEventListener("click", (e) => {
      // clicks on her (spinning her, her page, its arrows, its notices) are not "elsewhere"
      if (e.target.closest && e.target.closest("#hela-brain-full")) { armAnyClose(fn); return; }
      try { fn(); } catch (err) {}
    }, { once: true, capture: true }), 0);
  }
  /* ── the HOUR PAGE: a comic page for one Hour, pinned open by a click ── */
  function openPage(inst, hour){
    inst.pinnedHour = hour; showPage(inst, hour);
    inst.dirty = true; wake();
    if (!inst._closeArmed){ inst._closeArmed = true;
      armAnyClose(() => { inst._closeArmed = false; closePage(inst); }); }
  }
  function closePage(inst){
    inst.pinnedHour = null; inst.page.classList.remove("on"); inst.dirty = true; wake();
  }
  function showPage(inst, hour){
    const tn = turns.get(hour); if (!tn) return;
    if (!greeted){ greeted = true;
      try { window.__helaSay && window.__helaSay(window.__helaVoice ? window.__helaVoice("brain_greeting") : "", { ms: 5200 }); } catch (e) {}
    }
    const hs = window.__helaBrainHours();
    const pg = inst.page;
    pg.textContent = "";
    const head = document.createElement("div"); head.className = "hbp-head";
    const prev = document.createElement("button"); prev.type = "button"; prev.className = "hbp-arrow"; prev.innerHTML = "&#9664;";
    prev.disabled = hs.indexOf(hour) <= 0; prev.title = "Previous Hour";
    const next = document.createElement("button"); next.type = "button"; next.className = "hbp-arrow"; next.innerHTML = "&#9654;";
    next.disabled = hs.indexOf(hour) >= hs.length - 1; next.title = "Next Hour";
    const ttl = document.createElement("b"); ttl.textContent = "HOUR " + hour;
    prev.addEventListener("click", (e) => { e.stopPropagation(); turn(-1); });
    next.addEventListener("click", (e) => { e.stopPropagation(); turn(1); });
    head.append(prev, ttl, next);
    pg.appendChild(head);
    // the Herald's notices of this Hour first, each one opens its edition
    for (const di of tn.sats){ const it = disp[di]; if (!it) continue;
      const c = document.createElement("button"); c.type = "button"; c.className = "hbp-clip";
      const k = document.createElement("span"); k.textContent = "THE TEMPORAL HERALD";
      const h2 = document.createElement("b"); h2.textContent = plain(it.headline);
      c.append(k, h2);
      c.addEventListener("click", (e) => { e.stopPropagation(); openArticle(inst, di, {}); });
      pg.appendChild(c); }
    const logs = tn.logs.slice(-12);
    if (!logs.length && !tn.sats.length){
      const q = document.createElement("div"); q.className = "hbp-line hbp-quiet"; q.textContent = "A quiet Hour, nothing worth ink."; pg.appendChild(q); }
    for (const l of logs){
      const d = document.createElement("div"); d.className = "hbp-line k-" + (l.cls || "log");
      d.innerHTML = l.text;   // escaped by game.js humanize
      pg.appendChild(d); }
    pg.classList.add("on");
  }
  function turn(d){
    const inst = full; if (!inst) return;
    const hs = window.__helaBrainHours(); if (!hs.length) return;
    let i = hs.indexOf(inst.pinnedHour); if (i < 0) i = hs.length - 1; else i = Math.max(0, Math.min(hs.length - 1, i + d));
    openPage(inst, hs[i]);
    // she turns to face the Hour being read
    inst.spinUntil = performance.now() + 900;
    try { window.__audio && window.__audio.play("click"); } catch (e) {}
  }

  /* ── the ARTICLE: clicked open, clicked shut. It grows out of the core. ── */
  function toggleArticle(inst, di){
    const ex = document.querySelector(".hb-read");
    if (ex && +ex.dataset.di === di){ foldArticle(ex); return; }
    if (ex) foldArticle(ex);
    openArticle(inst, di, {});
  }
  function openArticle(inst, di, opt){
    const it = disp[di]; if (!it) return;
    const ex = document.querySelector(".hb-read"); if (ex) foldArticle(ex);
    const rd = document.createElement("div");
    rd.className = "hb-read"; rd.dataset.di = di;
    rd.innerHTML = `<div class="hb-read-inner">${it.html || ""}</div>`;
    inst.root.appendChild(rd);
    requestAnimationFrame(() => requestAnimationFrame(() => rd.classList.add("open")));
    rd.addEventListener("click", () => foldArticle(rd));    // click it shut, no X
    armAnyClose(() => foldArticle(rd));                      // ANY click anywhere folds it
    if (opt.auto){ rd.classList.add("auto"); rd._t = setTimeout(() => foldArticle(rd), 8200); }
  }
  function foldArticle(rd){ clearTimeout(rd._t); rd.classList.remove("open"); setTimeout(() => rd.remove(), 320); }

  /* ── the body, and the loop that only runs while she is being handled ── */
  let full = null, raf = 0;
  function ensureBodies(){
    if (!document.body || full) return;
    const lz = document.getElementById("log-zone");
    if (lz) full = makeCore("hela-brain-full", 240, lz);
  }
  function onDesk(){
    const cam = window.__game && window.__game.camera;
    const camEl = document.getElementById("cam");
    return !(cam && cam.scene !== "drawer" && !(camEl && camEl.classList.contains("is-panning")));
  }
  function wake(){ if (!raf && full) raf = requestAnimationFrame(frame); }
  function frame(t){
    raf = 0;
    if (!document.body || !document.body.classList.contains("cabin-on") || !full) return;
    const inst = full;
    // THE HEART IS THE REGISTRY: the ledger mounts LATE (market render), adopt it
    // the moment it exists; the game keeps writing into it after the move
    if (!inst._ledger){
      const led = document.querySelector("#log-zone .ledger");
      if (led){ inst._ledger = led;
        const plate = document.createElement("div"); plate.className = "hb-heartplate";
        plate.appendChild(led);
        inst.root.appendChild(plate);
        const heart = inst.root.querySelector(".hb-heart");
        if (heart){
          heart.addEventListener("pointerenter", () => plate.classList.add("peek"));
          heart.addEventListener("pointerleave", () => plate.classList.remove("peek"));
          heart.addEventListener("click", (e) => { e.stopPropagation();
            const on = plate.classList.toggle("pinned");
            if (on) armAnyClose(() => plate.classList.remove("pinned", "peek")); });
          plate.addEventListener("click", (e) => { e.stopPropagation(); plate.classList.remove("pinned", "peek"); });
        } }
    }
    if (!onDesk()){ if (inst._live){ inst._live = false; inst.root.classList.remove("live"); } return; }   // off the desk: rest; the camera wakes her
    const handled = inst.drag || inst.over || inst.hover;
    const coasting = Math.abs(inst.vy) > .0004;
    const spinning = t < inst.spinUntil;
    if (!inst.drag){
      if (coasting){ inst.ry += inst.vy; inst.vy *= .94; }
      else if ((spinning || (inst.over && !inst.hover)) && !RM) inst.ry += .004;   // the slow turning of memory
    }
    if (handled || coasting || spinning || inst.dirty){
      inst.dirty = false;
      project(inst, t);
    }
    const live = !!(handled || coasting || spinning);
    if (inst._live !== live){ inst._live = live; inst.root.classList.toggle("live", live); }   // the rings breathe only now
    if (live) raf = requestAnimationFrame(frame);
  }
  // new memory: she turns a moment to show it, if anyone is looking
  const _log = window.__helaBrainLog, _file = window.__helaBrainFile;
  window.__helaBrainLog = function(hour, cls, text){ _log(hour, cls, text);
    if (full){ full.dirty = true; if (full.pinnedHour === hour) showPage(full, hour); wake(); } };
  window.__helaBrainFile = function(item){ _file(item);
    if (full){ full.dirty = true; full.spinUntil = performance.now() + 2500; wake(); } };
  // the camera arriving at the desk wakes her (one draw, then rest)
  try {
    const camEl = document.getElementById("cam");
    if (camEl) new MutationObserver(() => { if (full){ full.dirty = true; wake(); } })
      .observe(camEl, { attributes: true, attributeFilter: ["data-scene"] });
  } catch (e) {}
  // the tutorial and the keyboard pilot her through this (open = an Hour's page is open)
  function openBrain(hour){
    ensureBodies(); if (!full) return;
    const g = window.__game;
    if (g && g.camera && g.camera.scene !== "drawer"){
      try { g.camera._engage(); g.camera.setScene("drawer"); g.updateBeacon && g.updateBeacon(); } catch (err) {}
    }
    const hs = window.__helaBrainHours();
    const h = hour != null ? +hour : hs[hs.length - 1];
    full.spinUntil = performance.now() + 4000;
    full.root.classList.add("hint-seen");
    if (h) openPage(full, h); else { full.dirty = true; wake(); }
  }
  window.__helaBrain = {
    open: openBrain,
    close(){ if (full){ closePage(full); const rd = document.querySelector(".hb-read"); if (rd) foldArticle(rd); } },
    toggle(){ if (full && full.pinnedHour != null) this.close(); else openBrain(); },
    isOpen(){ return !!(full && full.pinnedHour != null); },
    turn,
  };
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (!document.body.classList.contains("cabin-on")) return;
    const t = e.target || {}; if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "") || t.isContentEditable) return;
    const k = (e.key || "").toLowerCase();
    if (k === "l"){ e.preventDefault(); window.__helaBrain.toggle(); return; }
    if (!window.__helaBrain.isOpen()) return;
    if (k === "escape"){ e.preventDefault(); window.__helaBrain.close(); }
    else if (k === "arrowleft"){ e.preventDefault(); turn(-1); }
    else if (k === "arrowright"){ e.preventDefault(); turn(1); }
  });
  function ensure(){ ensureBodies(); if (full){ full.dirty = true; wake(); } else setTimeout(ensure, 600); }
  ensure();
})();


/* ═══ THE RITE, a termination is HER ceremony. The eye crosses to the dossier,
   watches, and CLAIMS it: the paper goes infrared-noir under her stamp, a line
   is spoken over the body, and the memory files itself red into her core. ═══ */
(function helaRite(){
  window.__helaRite = function(seat){
    const E = window.__helaEye; if (!E) return;
    const card = document.querySelector(`.pcard[data-seat="${(seat || "").replace(/"/g, '\\"')}"]`)
      || [...document.querySelectorAll(".pcard")].find(c => (c.dataset.seat || "") === seat);
    if (!card){ // no dossier on stage, the line still gets said
      if (window.__helaVoice && window.__helaSay) window.__helaSay(window.__helaVoice("terminated_other"), { ms: 6400 });
      return;
    }
    const r = card.getBoundingClientRect();
    E.setPost(r.x + r.width / 2, Math.max(56, r.y - 26));       // she goes to the body
    setTimeout(() => {
      // the termination re-renders the panels, claim the LIVE node, not a ghost
      const live = document.querySelector(`.pcard[data-seat="${(seat || "").replace(/"/g, '\"')}"]`) || card;
      live.classList.add("hela-claimed");                        // the claim lands
      if (window.__helaVoice && window.__helaSay) window.__helaSay(window.__helaVoice("terminated_other"), { ms: 6400 });
      try { window.__audio && window.__audio.play("chart_stamp"); } catch (e) {}
    }, 820);
    setTimeout(() => { E.clearPost(); }, 3100);                  // and returns to your side
  };
})();


/* ═══ SHE INSPECTS YOUR PURCHASES, a card lands in the case and she drifts over,
   looks, and passes judgement according to what you bought. ═══ */
(function helaShopper(){
  const LINES = {
    active: ["An instrument that ACTS. Good. I tire of watching you merely endure.",
      "It has a trigger. Try to point it at something that deserves it.",
      "A working tool. The dead collected these too, briefly."],
    passive: ["It works while you sleep. My favourite kind of servant.",
      "Quiet, constant, loyal. Unlike most of your decisions.",
      "A patient piece. Patience wins wars and fills my shelves."],
    other: ["Bought. Filed. If it matters, history will say so, to me, first.",
      "A curious purchase. I have seen empires spend worse.",
      "Noted in the ledger. Everything ends up in my ledger."],
  };
  let last = -1;
  window.__helaShopLook = function(meta){
    const E = window.__helaEye; if (!E) return;
    // find the NEW card itself; fall back to the case
    let r = null;
    if (meta && meta.name){ const el2 = document.querySelector(`#rucksack-zone .card[data-name="${String(meta.name).replace(/"/g, '\"')}"]`);
      if (el2) r = el2.getBoundingClientRect(); }
    if (!r || !r.width){ const rz = document.getElementById("rucksack-zone");
      if (rz) r = rz.getBoundingClientRect(); }
    if (r && r.width) E.setPost(r.x + r.width / 2, r.y + r.height / 2, { orbit: 44 });   // she CIRCLES her new toy
    const kind = /active/.test((meta && meta.ability_type) || "") ? "active"
               : /passive/.test((meta && meta.ability_type) || "") ? "passive" : "other";
    const a = LINES[kind];
    let i = (Math.random() * a.length) | 0; if (i === last) i = (i + 1) % a.length; last = i;
    if (window.__helaSay) window.__helaSay(a[i], { ms: 6200 });
    setTimeout(() => { const EE = window.__helaEye; if (EE) EE.clearPost(); }, 7200);   // she savours it properly
  };
})();


/* ═══════════════════════════════════════════════════════════════════════════════
   THE HOUR SEAL: o Fecho da Hora. When the Hour turns, the game holds its
   breath: the world recedes, a ring of her light draws itself around the eye
   (wherever it is, it MOVES with it), the hour-glyph forms, and the finished
   hour is pressed into a memory that FLIES to her core. 3.6 seconds, every hour,
   the heartbeat of the record. (Balatro's scoring cascade, worn our way.)
   ═══════════════════════════════════════════════════════════════════════════════ */
(function helaHourSeal(){
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastHour = null, sealing = false;
  function eyePos(){
    const e = document.getElementById("hela-eye");
    if (!e) return { x: innerWidth * .5, y: innerHeight * .5 };
    const r = e.getBoundingClientRect(); return { x: r.left + 30, y: r.top + 30 };
  }
  function coreTarget(){
    const f = document.getElementById("hela-brain-full");
    if (f){ const r = f.getBoundingClientRect();
      if (r.width > 0 && r.left > -60 && r.left < innerWidth) return { x: r.left + r.width / 2, y: r.top + r.height / 2, core: true }; }
    return null;   // the core is off stage, SHE will swallow the memory instead
  }
  function seal(hour){
    if (sealing) return; sealing = true;
    window.__sealCount = (window.__sealCount || 0) + 1;   // telemetry for the harness
    try { window.__audio && window.__audio.play("chart_creak"); } catch (e) {}
    // the soft, dim table behind the rite is one screen veil (app.css .hh-veil), mounted once
    if (!document.querySelector(".hh-veil")) {
      const veil = document.createElement("div"); veil.className = "hh-veil";
      veil.setAttribute("aria-hidden", "true");
      // inside the game screen: its perspective makes it a stacking context, so the veil
      // sits over the table and under the hull (z 60), which stays sharp
      (document.getElementById("screen-game") || document.body).appendChild(veil);
      void veil.offsetWidth;   // let the veil start transparent, so the first seal fades in
    }
    // the soft, dim table is for the desk only: on the Market the shelf stays sharp, its
    // card faces must be readable (the veil blurred the whole wagon scene)
    const desk = !(window.__game && window.__game.camera && window.__game.camera.scene !== "main");
    if (desk) document.body.classList.add("hh-sealing");
    const rite = document.createElement("div");
    rite.className = "hh-rite";
    rite.innerHTML = `
      <svg viewBox="-120 -120 240 240" fill="none">
        <circle class="hr-ring1" r="96" stroke="currentColor" stroke-width="2.4"/>
        <circle class="hr-ring2" r="72" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 9"/>
        <path class="hr-ticks" stroke="currentColor" stroke-width="2"
          d="M0 -96 v10 M0 96 v-10 M-96 0 h10 M96 0 h-10 M-68 -68 l7 7 M68 68 l-7 -7 M-68 68 l7 -7 M68 -68 l-7 7"/>
      </svg>
      <div class="hr-glyph"><i>HOUR</i><b>${hour - 1}</b><em>PRESSED &amp; SHELVED</em></div>`;
    document.body.appendChild(rite);
    let raf = 0;
    // it rides the eye, but never over the Merchant's shelf: there it waits above the shelf
    const shelf = () => { const sh = document.querySelector("#market-zone .market-row");
      const r = sh && sh.getBoundingClientRect(); return r && r.width > 20 && r.bottom > 0 && r.top < innerHeight ? r : null; };
    const follow = () => { const p = eyePos(), r = shelf();
      if (r && p.x > r.left - 120 && p.x < r.right + 120 && p.y > r.top - 120 && p.y < r.bottom + 120)
        p.y = Math.max(120, r.top - 130);
      rite.style.transform = `translate(${p.x}px, ${p.y}px)`; raf = requestAnimationFrame(follow); };
    follow();
    requestAnimationFrame(() => requestAnimationFrame(() => rite.classList.add("on")));
    setTimeout(() => { try { window.__audio && window.__audio.play("chart_bell", { warm: true }); } catch (e) {} }, 1400);
    // 2.6s in: the finished hour becomes a MEMORY and flies home to the core
    setTimeout(() => {
      const p0 = eyePos(), tgt = coreTarget();
      const dot = document.createElement("i");
      dot.className = "hh-rite-dot";
      document.body.appendChild(dot);
      const t0 = performance.now(), dur = RM ? 10 : (tgt ? 760 : 620);
      const fly = (t) => {
        const k = Math.min(1, (t - t0) / dur), e2 = 1 - Math.pow(1 - k, 3);
        // no core on stage? the memory ORBITS INTO THE EYE and she swallows it
        const p1 = tgt || eyePos();
        let x, y;
        if (tgt){
          const mx = (p0.x + p1.x) / 2, my = Math.min(p0.y, p1.y) - 120;
          x = (1-e2)*(1-e2)*p0.x + 2*(1-e2)*e2*mx + e2*e2*p1.x;
          y = (1-e2)*(1-e2)*p0.y + 2*(1-e2)*e2*my + e2*e2*p1.y;
        } else {
          const ang = e2 * Math.PI * 2.2, rad = 90 * (1 - e2);
          x = p1.x + Math.cos(ang) * rad;
          y = p1.y + Math.sin(ang) * rad * .6;
        }
        dot.style.transform = `translate(${x}px, ${y}px) scale(${1 - k * .4})`;
        if (k < 1) requestAnimationFrame(fly);
        else {
          dot.remove();
          try { window.__audio && window.__audio.play("dice_lock"); } catch (e) {}
          if (!tgt){   // the SWALLOW: a blink and a satisfied pulse
            const ey = document.getElementById("hela-eye");
            if (ey){ ey.classList.add("he-gulp"); setTimeout(() => ey.classList.remove("he-gulp"), 460); }
            if (window.__helaEye) window.__helaEye.blink();
          }
        }
      };
      requestAnimationFrame(fly);
      rite.classList.add("done");
    }, RM ? 300 : 2600);
    setTimeout(() => { cancelAnimationFrame(raf); rite.remove();
      document.body.classList.remove("hh-sealing"); sealing = false;
      // no re-raster here any more: the veil never touches the table's own layers
    }, RM ? 800 : 3600);
  }
  setInterval(() => {
    const app = window.__game;
    if (!app || !app.view || !document.body.classList.contains("cabin-on")) return;
    const h = app.view.hour;
    if (lastHour == null){ lastHour = h; return; }
    if (h > lastHour){ lastHour = h; seal(h); }
    else if (h !== lastHour) lastHour = h;
  }, 700);
})();

/* ═══ THE FINALE, she archives the whole match: hours align as a timeline,
   satellites in tow, the winner is STAMPED. The bureau panel waits its turn. ═══ */
(function helaFinale(){
  window.__helaFinale = function(winner){
    if (document.getElementById("hela-finale")) return;
    const store = window.__helaNewsStore || [];
    const fin = document.createElement("div");
    fin.id = "hela-finale";
    let hours = [];
    try { hours = (window.__helaBrainHours && window.__helaBrainHours()) || []; } catch (e) {}
    const line = hours.map((h, i) =>
      `<span class="hf-dot" style="--i:${i}"><i></i><b>H${h}</b></span>`).join('<span class="hf-seg"></span>');
    fin.innerHTML = `
      <div class="hf-title">◉ HELA · THE RECORD OF THE EXPEDITION</div>
      <div class="hf-line">${line || '<span class="hf-dot"><i></i><b>H1</b></span>'}</div>
      <div class="hf-stamp"><span>ARCHIVED</span><b>${winner ? "WINNER: " + winner: "TIME STABILISED"}</b></div>`;
    document.body.appendChild(fin);
    requestAnimationFrame(() => requestAnimationFrame(() => fin.classList.add("on")));
    setTimeout(() => { fin.classList.add("stamped");
      try { window.__audio && window.__audio.play("chart_stamp"); } catch (e) {} }, 2300);
    // the bureau panel (z 700) arrives over it; the record stays beneath as set dressing
    setTimeout(() => { fin.classList.add("dim"); }, 5200);
  };
})();

/* ═══ LOOSE PAPERWORK (official since 2026-07-21): each case file is ONE
   stapled object (badge + sheet) you can slide anywhere on the wood; positions
   survive re-renders (observer) and sessions (localStorage). A click is still
   a click, dragging only engages past a 7px threshold, and buttons on the
   file never start a drag. ═══ */
(function deskLab(){
  // positions belong to ONE match (its room code): a new match deals the files
  // fresh, a reload of the same match puts them back where they were left
  const KEY="pdx-desklab-v1";
  let saved={}; try{ saved=JSON.parse(localStorage.getItem(KEY)||"{}")||{}; }catch(err){ saved={}; }
  let code=saved.code||null, pos=(saved.code&&saved.pos)||{};
  let zTop=18; Object.keys(pos).forEach((k)=>{ if(pos[k].z>zTop) zTop=pos[k].z; });
  const matchCode=()=>{ const g=window.__game; return (g&&g.conn&&g.conn.code)||null; };
  const card=(seat)=>document.querySelector(`.cb-grid .pcard.cfolio[data-seat="${CSS.escape(seat)}"]`);
  // the whole table is theirs, the chart included: a file may go as far right as the
  // table's right edge, in the file's own (unscaled) coordinates
  function rightEdge(el){
    const host=el.offsetParent, stage=host&&host.closest(".game-grid");
    if(!stage) return 792;
    const f=window.__pdxFit||1;
    return Math.max(792,(stage.getBoundingClientRect().right-host.getBoundingClientRect().left)/f-el.offsetWidth+30);
  }
  function apply(){
    const mc=matchCode();
    if(mc&&mc!==code){ code=mc; pos={}; zTop=18; }
    for(const seat in pos){ const p=pos[seat];
      const el=card(seat);
      if(!el) continue;
      // only a file that is truly off the wood comes back (the drag limits below)
      p.x=Math.max(-30,Math.min(rightEdge(el),+p.x||0)); p.y=Math.max(6,Math.min(880,+p.y||0));
      el.style.left=p.x+"px"; el.style.top=p.y+"px";
      el.style.setProperty("--dk-rot",(p.r||0)+"deg"); el.style.zIndex=p.z||18;
    }
  }
  window.__deskLabApply=apply;
  let raf=0;
  const zone=document.getElementById("players-zone")||document.body;
  new MutationObserver(()=>{
    if(raf) return;
    raf=requestAnimationFrame(()=>{ raf=0; apply(); });
  }).observe(zone,{childList:true,subtree:true});

  let held=null,pid=0,sx=0,sy=0,ox=0,oy=0,cx=0,cy=0,rot=0,zz=0,maxX=792,moved=false;
  document.addEventListener("pointerdown",(e)=>{
    if(e.button!==0||held) return;
    if(!document.body.classList.contains("cabin-on")) return;
    const el=e.target&&e.target.closest&&e.target.closest(".cb-grid .pcard.cfolio");
    if(!el) return;
    if(e.target.closest("button, input, a, select")) return;   // controls stay controls
    held=el; pid=e.pointerId; sx=e.clientX; sy=e.clientY;
    ox=el.offsetLeft; oy=el.offsetTop; maxX=rightEdge(el); moved=false;
    rot=parseFloat(getComputedStyle(el).getPropertyValue("--dk-rot"))||0;
  },true);
  document.addEventListener("pointermove",(e)=>{
    if(!held||e.pointerId!==pid) return;
    const f=window.__pdxFit||1;
    const dx=(e.clientX-sx)/f, dy=(e.clientY-sy)/f;
    if(!moved){
      if(Math.abs(dx)<7&&Math.abs(dy)<7) return;               // a click is still a click
      moved=true; held.classList.add("dk-held");
      document.body.classList.add("dk-carrying");
      try{ held.setPointerCapture(pid); }catch(err){}
      zz=Math.min(38,++zTop);                                   // last dropped rides highest, under hover's 40
      try{ window.__audio&&window.__audio.play("place",{power:.22}); }catch(err){}
    }
    // a state update can rebuild the file mid-drag: keep carrying the live one
    if(!held.isConnected){ const live=held.dataset.seat&&card(held.dataset.seat);
      if(live){ live.classList.add("dk-held"); live.style.zIndex=held.style.zIndex; held=live; } }
    cx=Math.max(-30,Math.min(maxX,ox+dx)); cy=Math.max(6,Math.min(880,oy+dy));
    held.style.left=cx+"px";     // anywhere on the table, over the chart too
    held.style.top =cy+"px";     // but above the arm's harbour
  },true);
  const drop=(e)=>{
    if(!held||e.pointerId!==pid) return;
    let el=held; held=null;
    if(!moved) return;
    // the file stays exactly where it was let go. A file rebuilt mid-drag is found again
    // by its seat (a detached node reads offsetLeft 0, which used to throw it under the case)
    const seat=el.dataset.seat;
    if(!el.isConnected&&seat){ const live=card(seat); if(live) el=live; }
    el.classList.remove("dk-held"); el.style.zIndex=zz;
    el.style.left=cx+"px"; el.style.top=cy+"px";
    document.body.classList.remove("dk-carrying");
    if(seat){ if(!code) code=matchCode(); pos[seat]={x:cx,y:cy,r:rot,z:zz};
      try{ localStorage.setItem(KEY,JSON.stringify({code,pos})); }catch(err){} }
    try{ window.__audio&&window.__audio.play("place",{power:.42}); }catch(err){}
    const stop=(c2)=>{ c2.stopPropagation(); c2.preventDefault(); };
    el.addEventListener("click",stop,true);
    setTimeout(()=>el.removeEventListener("click",stop,true),150);
  };
  document.addEventListener("pointerup",drop,true);
  document.addEventListener("pointercancel",drop,true);
})();

