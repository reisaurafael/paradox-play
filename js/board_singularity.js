/* ═══════════════════════════════════════════════════════════════════════════
   THE STAR-CHART: Singularity skin  ·  C.R.O.N.O.S. celestial survey of the
   SEA OF STARS. When the traveler stands in the Singularity period (2999, the
   frozen present, Cronos fallen) his map is no longer a chart of water but of
   the VOID: the thirty centuries are dead world-stations strung along the great
   temporal DRIFT, descending toward the Dead Sun of Cronos, Year Zero, where
   time collapses. Same living machine as the Paradox Sea (layered SVG, serialized
   fx theater, decision->click wiring, computed layout + audit), re-spoken in the
   language of the void. The Sea (board_draft.js) is byte-identical & untouched,
   this mounts a sibling `.cplot-sing`; the local traveler's PERIOD picks the skin.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  let W = 820; let H = 950;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const ROM = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV",
    "XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIV","XXV","XXVI","XXVII","XXVIII","XXIX","XXX"];
  const rom = c => c === 0 ? "0" : ROM[c - 1];
  const rnd = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // a touch phone draws the star chart in one look (board_draft.js window.__pdxPhoneChart)
  const PH = window.__pdxPhoneChart, PHONE = () => !!(PH && PH.on());
  const initials = name => { const p = String(name).trim().split(/\s+/); return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase(); };
  const audible = () => { const r = document.getElementById("timeline-rail"); return !!r && r.classList.contains("skin-sing"); };
  const snd = (n, o) => { try { if (audible() && window.__audio) window.__audio.play(n, o); } catch (e) {} };

  const ERAS_OF = c => { const e = []; if (c>=1&&c<=5)e.push("ant"); if(c>=5&&c<=10)e.push("hma"); if(c>=11&&c<=15)e.push("lma"); if(c>=15&&c<=19)e.push("mod"); if(c>=19&&c<=23)e.push("con"); if(c>=23&&c<=30)e.push("tim"); return e; };
  const ERA_NAME = { tim:"Timeless", con:"Contemporary", mod:"Modern", lma:"Low Middle Ages", hma:"High Middle Ages", ant:"Antiquity" };
  const PERIOD_ERAS = { Origins:["ant","hma"], Ascension:["lma","mod"], Singularity:["con","tim"] };
  // celestial era hues (shared family with the Sea so a rival's era reads alike)
  const HUE = { tim:"#9a8cf0", con:"#5a9bf0", mod:"#3fcaca", lma:"#5fd07a", hma:"#e59a34", ant:"#d24b7a" };
  const PHUE = { Singularity:"#9a8cf0", Ascension:"#3fcaca", Origins:"#e0b23a" };
  const BHP = { Singularity:[600,250], Ascension:[340,410], Origins:[578,772] };  // base coords (x scaled by sx)
  const FIXCOL = { self:"#6ff0c0", r0:"#6aa6ff", r1:"#b48cff", r2:"#ffa860", r3:"#ff789e", r4:"#5fe0c8" };
  const DUAL = { 23:["tim","con"], 19:["con","mod"], 15:["mod","lma"], 5:["hma","ant"] };
  const singleEra = c => ERAS_OF(c)[0];
  function periodOf(c){ const e=ERAS_OF(c); for(const p in PERIOD_ERAS) if(PERIOD_ERAS[p].some(x=>e.includes(x))) return p; return "Singularity"; }

  /* ═══ LAYOUT, worlds strung along the great DRIFT, future(XXX) top -> Dead Sun bottom ═══ */
  const POS = {}, META = {};
  let SUN = [410, 928];
  // SIX ERA-CONSTELLATIONS. Travelers read the sky to register paradoxes: the
  // centuries are STARS; each era is a figure; the drift threads them in order.
  const CONSTS = {
    tim: { name:"THE TITAN",    sci:"CRN\u00b7TIM", mean:"Cronos frozen,  the present that devours its future", stars:{30:[172,110],29:[312,66],28:[440,120],27:[568,66],26:[700,110],25:[518,202],24:[382,202]} },
    con: { name:"THE ENGINE",   sci:"CRN\u00b7CON", mean:"the fallen Corporation that made time a good",           stars:{23:[700,292],22:[772,382],21:[700,470],20:[774,558],19:[688,590]} },
    mod: { name:"THE COMPASS",  sci:"CRN\u00b7MOD", mean:"the age that dared to chart the centuries",               stars:{18:[558,410],17:[490,338],16:[490,482],15:[422,410]} },
    lma: { name:"THE TOWER",    sci:"CRN\u00b7LMA", mean:"the first faiths that ruled what was",                    stars:{14:[272,342],13:[150,300],12:[214,442],11:[126,524]} },
    hma: { name:"THE GAUNTLET", sci:"CRN\u00b7HMA", mean:"the hand that grips the deep past",                       stars:{10:[300,636],9:[430,684],8:[352,792],7:[512,748],6:[602,690]} },
    ant: { name:"THE SERPENT",  sci:"CRN\u00b7ANT", mean:"the root of time, biting its own tail",                   stars:{5:[678,790],4:[752,852],3:[648,888],2:[468,888],1:[300,872]} },
  };
  function worldR(c){ return (c===10||c===20)?40:(DUAL[c]?36:31); }
  /* ═══ THE STAR CHART ON A PHONE: one look, no pan, no zoom ═══════════════════════════════
     The same sky, re-hung for the phone's landscape page: the six constellations as six
     bands (THE TITAN on top, THE SERPENT at the foot), the drift running from XXX down
     through every star to the Dead Sun, the four border stars on the seam between their two
     figures, the debris belt drawn round the deep past (I to IX) as it is on the desk, the
     nebulae round their own stars, the three vaults in the figures they serve. Bigger
     plates for a finger, no gyro; the same night, stars and ink. */
  let PL=null; const PHB={}; let PLNAMES=[];   // the constellations' names (the pieces keep off them)
  const PNAME={tim:"THE TITAN",con:"THE ENGINE",mod:"THE COMPASS",lma:"THE TOWER",hma:"THE GAUNTLET",ant:"THE SERPENT"};
  function phoneLayout(){
    PL=PH.layout(W,H,{yzX:.855,yzDy:-8}); PLNAMES=[];
    for(const era in CONSTS){ for(const c in CONSTS[era].stars) META[+c]=era; }
    for(let c=1;c<=30;c++) POS[c]=PL.pos[c];
    SUN=PL.yz;
    const spot=(r,dy)=>{ const g=PL.gaps(r,56)[0]; const b=PL.band(r); return g?[Math.round((g[0]+g[1])/2), Math.round(b.cy+(dy||0))]:[Math.round(W/2),Math.round(b.cy)]; };
    PHB.Singularity=spot(1,4); PHB.Ascension=spot(2,4); PHB.Origins=spot(4,4);
  }
  function phoneNames(){
    let g="";
    PL.rows.forEach((R0,r)=>{ const era=R0.era, txt=PNAME[era], w=txt.length*10.4+8, b=PL.band(r);
      const gs=PL.gaps(r,40,"top"), q=gs.find(z=>z[1]-z[0]>=w)||gs[0]||[20,20+w];
      const x=Math.max(16, Math.min(W-16-w, Math.max(q[0], Math.min(q[1]-w, (q[0]+q[1])/2-w/2))));
      PLNAMES.push([x, b.top+(r?16:22)-13, x+w, b.top+(r?16:22)+4]);
      // (inside a positioned group: bare absolutely placed text in the base layer was left unpainted by Chromium after a re-raster)
      g+=`<g transform="translate(${x.toFixed(0)} ${(b.top+(r?16:22)).toFixed(0)})" data-tip="${esc(CONSTS[era].mean)}"><text font-family="Georgia,serif" font-size="15" letter-spacing="1.6" fill="${HUE[era]}" opacity=".95">${txt}</text></g>`; });
    return g;
  }
  function layout(){
    if(PHONE()) return phoneLayout();
    const sx=W/820;
    for(const era in CONSTS){ const cst=CONSTS[era]; for(const c in cst.stars){ const p=cst.stars[c]; POS[+c]=[Math.round(p[0]*sx), p[1]]; META[+c]=era; } }
    SUN=[Math.round(150*sx), 892];   // Year Zero, the collapsed star at the serpent's tail
  }
  function audit(){ const v=[]; for(let c=1;c<=30;c++){ if(!POS[c]){ v.push("world "+rom(c)+" MISSING"); continue; } const [x,y]=POS[c]; if(x<26||x>W-26) v.push("world "+rom(c)+" x-margin"); if(y<40||y>H-26) v.push("world "+rom(c)+" y-margin"); for(let d=c+1;d<=30;d++){ if(!POS[d]) continue; const [x2,y2]=POS[d]; if(Math.hypot(x-x2,y-y2)<64) v.push("worlds "+rom(c)+"/"+rom(d)+" too close"); } } return v; }
  /* ═══ STATE ═══ */
  const R = { trails:[], monsters:new Set(), wrecks:new Set(), restored:new Set(), deliveries:[], fx:[], shown:{}, preplot:null, pendingSelf:null, sailing:false, merchantShown:null, ordIdx:null, ordFlip:null, clockSec:0 };
  let app=null, rivalKeys={}, prevHour=null;
  function hookApp(){
    app = window.__game; if(!app) return false;
    if(!app.__singHooked){
      app.__singHooked=true;
      const orig=app.playEvent.bind(app); app.playEvent = async m => { try{onEvent(m);}catch(e){} return orig(m); };
      const od=app.onDecision.bind(app); app.onDecision = req => { const r=od(req); try{pollDecisions();}catch(e){} return r; };
      window.__singState=R; window.__singAudit=()=>auditCache; window.__singPresenting=()=>__live()&&(fxBusy||R.fx.length>0||R.sailing); window.__singPeriodOf=periodOf; window.__singWarp=(b)=>{ window.__pdxChartTurn(!b, ()=>{ const r=document.getElementById("timeline-rail"); if(r) { r.classList.toggle("skin-sing",!!b); renderNow(); } }); };
      wireAudio();
    }
    return true;
  }
  function selfT(){ return app&&app.view ? app.view.travelers.find(t=>t.is_self) : null; }
  // THE SEAT COLOUR COMES FROM THE GAME NOW. This chart used to keep its own palette AND
  // its own first-seen index (rivalKeys), so the boat you saw here and the badge on the
  // desk were two different colours for the same rival, and no squinting was ever going
  // to fix it. Colour is a LABEL; a label that disagrees with itself is worse than none.
  // FIXCOL survives only as a fallback for previewing a chart with no game attached.
  function seatColor(seat){
    try{ if(window.__seatColor){ const c=window.__seatColor(seat); if(c) return c; } }catch(e){}
    const s=selfT(); if(s&&seat===s.name) return FIXCOL.self; if(!(seat in rivalKeys)) rivalKeys[seat]="r"+(Object.keys(rivalKeys).length%5); return FIXCOL[rivalKeys[seat]]; }
  function seatShip(seat){ const s=selfT(); if(s&&seat===s.name) return 0; seatColor(seat); const k=rivalKeys[seat]; return k?(parseInt(k.slice(1),10)+1)%6:0; }
  function hourNow(){ return app&&app.view?app.view.hour:0; }
  function centuryOf(seat){ const t=app&&app.view&&app.view.travelers.find(x=>x.name===seat); return t?t.century:null; }
  function onEvent(msg){
    const k=msg.event||msg.kind||msg.type, p=msg.payload||{};
    if(k==="traveled" && p.to!=null){ const from=Math.max(0,p.from), to=Math.max(0,p.to); if(from!==to){ R.trails.push({seat:p.seat,from,to,hour:hourNow()}); if(R.trails.length>64) R.trails.shift(); } const st=selfT(); if(st&&p.seat===st.name&&R.preplot===`${p.from}:${p.to}`){R.preplot=null;} else R.fx.push({t:"trail",seat:p.seat,from,to}); if(st&&p.seat===st.name) R.pendingSelf=to; }
    if(k==="paradox_resolved") for(const h of (p.hits||[])){ const c=centuryOf(h.seat); if(c){R.monsters.add(c); R.fx.push({t:"paradox",c});} }
    if(k==="exploded"){ const c=centuryOf(p.seat); if(c) R.fx.push({t:"paradox",c}); }
    if(k==="terminated"){ const c=centuryOf(p.seat); if(c){R.wrecks.add(c); R.fx.push({t:"wreck",c});} }
    if(k==="respawned"){ const c=centuryOf(p.seat); if(c) R.wrecks.delete(c); }
    if(k==="milestone") R.fx.push({t:"milestone",c:p.century});
    if(k==="delivered"){ R.restored.add(p.century); R.deliveries.push({seat:p.seat,card:p.card,century:p.century,hour:hourNow()}); R.fx.push({t:"deliver",c:p.century}); }
    if(k==="merchant_moved"){ R.fx.push({t:"merchant",p}); if(__live()&&!p.teleport) window.__pdxTripPending=true; }
    scheduleLive();
  }

  /* ═══ DECISIONS (engine-correct) ═══ */
  let mode=null;
  function pollDecisions(){
    if(!app) return; const req=app.pendingReq;
    if(!req){ if(mode){mode=null; scheduleLive();} return; }
    if(mode&&mode.req===req) return;
    const self=selfT(); if(!self) return;
    if(req.kind==="travel"){ const o=req.options||{}; mode={kind:"travel",req,max:o.max,self:o.century!=null?o.century:self.century,energy:self.energy,locked:o.direction_locked!=null?o.direction_locked:null,ppc:o.energy_per_past_century!=null?o.energy_per_past_century:1}; scheduleLive(); }
    else if(req.kind==="merchant_century"||req.kind==="merchant"){ mode={kind:"merchant",req,centuries:new Set((req.options&&req.options.centuries)||[])}; scheduleLive(); }
    else if(req.kind==="target"||req.kind==="century"){ const o=req.options||{}; if(o.target_type&&o.target_type!=="century"){ if(mode){mode=null;scheduleLive();} return; } mode={kind:"century",req,centuries:new Set((o.candidates||[]).map(x=>x&&typeof x==="object"?Number(x.century):Number(x)))}; scheduleLive(); }
    else if(mode){ mode=null; scheduleLive(); }
  }
  function stepCost(from,dist){ let c=0; for(let s=1;s<=dist;s++){ const d=from-s; if(d<=0) break; c+=d<=9?2:1; } return c; }
  function armedCost(c){ if(!mode||mode.kind!=="travel") return 0; if(mode.ppc===0) return 0; if(c===0){ let z=0; for(let d=mode.self-1; d>=0; d--) z+=(d<=9?2:1); return z; } if(c>=mode.self) return 0; return stepCost(mode.self,mode.self-c); }
  function travelCandidates(){
    if(!mode||mode.kind!=="travel") return null; const set=new Set();
    for(let c=1;c<=30;c++){ const d=Math.abs(c-mode.self); if(d===0||d>mode.max) continue; if(mode.locked!=null&&Math.sign(c-mode.self)!==mode.locked) continue; if(c<mode.self&&mode.ppc!==0&&stepCost(mode.self,d)>mode.energy-1) continue; set.add(c); }
    if(mode.self<=mode.max&&mode.locked!==1) set.add(0);
    set.add(mode.self); return set;
  }
  function pickCandidates(){ if(!mode) return null; return mode.kind==="travel"?travelCandidates():mode.centuries; }

  /* ═══ ART, ships, worlds, the void ═══ */
  function shipSVG(kind,col,{ghost=false,dead=false,plate=false}={}){
    const st=ghost?col:"rgba(255,255,255,.6)", body=ghost?"none":col, dash=ghost?' stroke-dasharray="2 2"':"";
    return `<g class="cc-ship${dead?" cc-dead":""}"><path d="M0 -10 L7 7 L0 3 L-7 7 Z" fill="${body}" stroke="${st}" stroke-width="1.1"${dash}/>${ghost?"":`<circle cy="-1" r="2" fill="#fff" opacity=".85"/>`}</g>`;
  }
  function worldG(c){
    const [x,y]=POS[c], eras=ERAS_OF(c), dual=eras.length===2, col=HUE[singleEra(c)];
    const lit=R.restored.has(c), broken=R.monsters.has(c)&&!lit, wreck=R.wrecks.has(c);
    const mag=(c===10||c===20)?1.5:dual?1.28:1, rr=(7.5*mag).toFixed(1), gr=(30*mag).toFixed(1);
    const rays=`<path d="M0 ${(-rr*2.7).toFixed(1)} V${(rr*2.7).toFixed(1)} M${(-rr*2.7).toFixed(1)} 0 H${(rr*2.7).toFixed(1)}" stroke="${col}" stroke-width="1.4" opacity="${lit?.9:.6}"/><path d="M${(-rr*1.7).toFixed(1)} ${(-rr*1.7).toFixed(1)} L${(rr*1.7).toFixed(1)} ${(rr*1.7).toFixed(1)} M${(-rr*1.7).toFixed(1)} ${(rr*1.7).toFixed(1)} L${(rr*1.7).toFixed(1)} ${(-rr*1.7).toFixed(1)}" stroke="${col}" stroke-width=".8" opacity=".32"/>`;
    const fs=(dual?18:16)*(c===10||c===20?1.08:1);
    return `<g class="cc-world${broken?" cc-broken":""}${wreck?" cc-wreck":""}" data-c="${c}" transform="translate(${x} ${y})" style="color:${col}">
      <circle class="cc-hit" data-c="${c}" r="${PHONE()?40:Math.max(38,gr*1.0).toFixed(1)}" fill="transparent"/>
      <circle r="${gr}" fill="url(#ccStar${singleEra(c)})" opacity="${lit?1:.75}" class="${lit?"cc-lit":""}"/>
      ${dual?`<path d="M 0 ${(-gr).toFixed(1)} A ${gr} ${gr} 0 0 1 0 ${gr} Z" fill="url(#ccStar${eras[1]})" opacity=".85"/><line x1="0" y1="${(-gr*0.72).toFixed(1)}" x2="0" y2="${(gr*0.72).toFixed(1)}" stroke="#eef4ff" stroke-width="1.6" opacity=".8"/><text class="pdx-ref" x="${(-gr*0.5).toFixed(1)}" y="${(-rr*2.5).toFixed(1)}" text-anchor="middle" font-family="monospace" font-size="7.5" font-weight="bold" fill="${HUE[eras[0]]}" stroke="#04040c" stroke-width="1.8" paint-order="stroke">${eras[0].toUpperCase()}</text><text class="pdx-ref" x="${(gr*0.5).toFixed(1)}" y="${(-rr*2.5).toFixed(1)}" text-anchor="middle" font-family="monospace" font-size="7.5" font-weight="bold" fill="${HUE[eras[1]]}" stroke="#04040c" stroke-width="1.8" paint-order="stroke">${eras[1].toUpperCase()}</text>`:""}
      ${rays}
      <circle r="${rr}" fill="${lit?"#fff":"#eef4ff"}"/><circle r="${(rr*0.5).toFixed(1)}" fill="${col}"/>
      ${(c===10||c===20)?`<circle r="${(rr*2).toFixed(1)}" fill="none" stroke="#e8c05a" stroke-width="1.4" opacity=".85"/>`:""}
      <!-- THE CENTURY PLATE. The stellar chart used to carry its numeral as a bare text
           floating beside the star, at opacity 0, it only appeared if a traveller happened
           to be standing there, or if you knew to hold Tab (which nothing tells you). So the
           star chart, alone of the three, could not be READ. It gets what the castles have:
           a plate under the star, always lit, the numeral stamped on it. -->
      ${PHONE()?`<g class="cc-numplate">
        <rect x="${(-rom(c).length*6.3 - 6).toFixed(1)}" y="${(Math.min(gr,36)*0.42).toFixed(1)}"
              width="${(rom(c).length*12.6 + 12).toFixed(1)}" height="21" rx="3.4"
              fill="rgba(7,11,26,.92)" stroke="${col}" stroke-width="1.3"/>
        <text y="${(Math.min(gr,36)*0.42 + 16.2).toFixed(1)}" text-anchor="middle" font-family="'Courier New',monospace"
              font-weight="bold" font-size="17.5" letter-spacing=".4" fill="${lit?"#ffffff":"#e9f1ff"}">${rom(c)}</text>
      </g>`:`<g class="cc-numplate">
        <rect x="${(-rom(c).length*4.3 - 5).toFixed(1)}" y="${(gr*0.60).toFixed(1)}"
              width="${(rom(c).length*8.6 + 10).toFixed(1)}" height="14" rx="2.8"
              fill="rgba(7,11,26,.9)" stroke="${col}" stroke-width="1" opacity=".96"/>
        <text y="${(gr*0.60 + 10.6).toFixed(1)}" text-anchor="middle" font-family="'Courier New',monospace"
              font-weight="bold" font-size="10.8" letter-spacing=".6" fill="${lit?"#ffffff":"#e9f1ff"}">${rom(c)}</text>
      </g>`}
    </g>`;
  }
  function starfield(){
    let st=""; for(let i=0;i<220;i++){ const x=Math.round(rnd(i,1)*W), y=Math.round(rnd(i,2)*H), r=(rnd(i,3)*1.1+.2).toFixed(1), o=(rnd(i,4)*.5+.1).toFixed(2); const tw=rnd(i,5)>.86?` class="cc-tw" style="--d:${(rnd(i,6)*4).toFixed(1)}s"`:""; st+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#cfe0ff" opacity="${o}"${tw}/>`; }
    let grid=""; for(let gy=90; gy<H-40; gy+=104) grid+=`<path d="M 0 ${gy} Q ${(W/2).toFixed(0)} ${gy-26} ${W} ${gy}" fill="none" stroke="#3a4f7a" stroke-width=".5" opacity=".14"/>`;
    for(let k=1;k<5;k++){ const gx=(W*k/5).toFixed(0); grid+=`<line x1="${gx}" y1="46" x2="${gx}" y2="${H-30}" stroke="#3a4f7a" stroke-width=".5" opacity=".09"/>`; }
    return `<g class="cc-grid">${grid}</g><g class="cc-stars">${st}</g>`;
  }
  function nebulaBlobs(era){ const cst=CONSTS[era]; const cs=Object.keys(cst.stars).map(Number).sort((a,b)=>b-a); let b="";
    const put=(x,y,r)=>{ b+=`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ccNeb${era})"/>`; };
    cs.forEach(c=>{ const [x,y]=POS[c]; put(x,y,+(worldR(c)*2.7).toFixed(0)); });
    for(let i=0;i<cs.length-1;i++){ const A=POS[cs[i]],B=POS[cs[i+1]]; put(+((A[0]+B[0])/2).toFixed(0),+((A[1]+B[1])/2).toFixed(0),+(worldR(cs[i])*2.0).toFixed(0)); }
    return b; }
  function eraZones(){ let g=""; for(const era in CONSTS){ g+=`<g class="cc-neb" filter="url(#ccNebF${era})" opacity=".3">${nebulaBlobs(era)}</g>`; } return g; }
  // ═══ THE NAMES WERE IN THE WRONG CONSTELLATIONS ═══════════════════════════════════
  //   The serpent constellation's name sat inside the gauntlet constellation
  //   and vice versa, and the tower's name was almost leaving its constellation.
  //   Both came from the same bad habit: hand-placing a label
  //   with an offset. The name used to sit 37px under the constellation's lowest star,
  //   which is exactly where that star's new century plate lands, so I pushed it to +64,
  //   and +64 below THE GAUNTLET is the middle of THE SERPENT. I fixed a collision by
  //   creating a lie.
  //   There is no magic offset, because the sky is not evenly spaced. So this stops
  //   guessing and SOLVES: it walks rings outward from the constellation's own centroid
  //   and takes the FIRST position that clears every star's glow AND every century plate
  //   beneath it. The name therefore lands as close to its own heart as the sky allows,
  //   it can never wander into a neighbour, because it never leaves home.
  //   window.__ccNameAudit() returns any label that still overlaps anything. It returns
  //   empty, and that is the gate, not my eyes.
  function nameBoxes(){
    const LH = 21;
    const lw = (n) => n.length * 8.4 + 12;
    // every obstacle in the sky: a star's glow, and the plate hanging under it
    const OBST = [];
    for (const k in POS) {
      const c = +k, p = POS[c]; if (!p) continue;
      const gr = 30 * ((c === 10 || c === 20) ? 1.5 : 1);
      OBST.push([p[0] - gr, p[1] - gr, p[0] + gr, p[1] + gr * 0.60 + 16]);   // glow + plate
    }
    // ...and the FIGURE'S OWN LINES. The serpent's label only needed to drop
    // a few pixels to clear the stroke between centuries III and II."
    // My solver only knew about STARS, so it happily parked THE SERPENT exactly on the
    // stroke joining II to III, the one place in that constellation where a name is
    // guaranteed to look like a mistake. A constellation is not its stars; it is the
    // FIGURE they draw. The segments are obstacles too.
    const SEG = [];
    for (const era in CONSTS) {
      const cs = Object.keys(CONSTS[era].stars).map(Number).filter(c => POS[c]).sort((a,b)=>a-b);
      for (let k = 0; k + 1 < cs.length; k++) SEG.push([POS[cs[k]], POS[cs[k+1]]]);
    }
    // does the label's box cross this segment? (clip the segment to the box, Liang-Barsky)
    const crosses = (x1, y1, x2, y2, p, q) => {
      let t0 = 0, t1 = 1;
      const dx = q[0] - p[0], dy = q[1] - p[1];
      for (const [pp, qq] of [[-dx, p[0]-x1], [dx, x2-p[0]], [-dy, p[1]-y1], [dy, y2-p[1]]]) {
        if (pp === 0) { if (qq < 0) return false; continue; }
        const r = qq / pp;
        if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else        { if (r < t0) return false; if (r < t1) t1 = r; }
      }
      return true;
    };
    const clear = (x1, y1, x2, y2) =>
      !OBST.some(o => x1 < o[2] && x2 > o[0] && y1 < o[3] && y2 > o[1]) &&
      !SEG.some(sg => crosses(x1 - 6, y1 - 4, x2 + 6, y2 + 4, sg[0], sg[1]));
    const out = {};
    for (const era in CONSTS) {
      const cst = CONSTS[era];
      const cs = Object.keys(cst.stars).map(Number).filter(c => POS[c]);
      if (!cs.length) continue;
      let sx = 0, sy = 0, maxy = -1e9;
      cs.forEach(c => { sx += POS[c][0]; sy += POS[c][1]; maxy = Math.max(maxy, POS[c][1]); });
      const cx = sx / cs.length, cy = sy / cs.length;
      const w = lw(cst.name), h = LH;
      let best = null;
      for (let r = 46; r <= 210 && !best; r += 12) {
        for (let a = 0; a < 360; a += 10) {
          const th = a * Math.PI / 180;
          const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r * 0.78;
          if (x - w / 2 < 12 || x + w / 2 > W - 12 || y - h < 18 || y + 6 > H - 8) continue;
          if (!clear(x - w / 2, y - h + 5, x + w / 2, y + 6)) continue;
          best = [x, y]; break;                 // the tightest clear ring wins: it stays HOME
        }
      }
      out[era] = best || [cx, maxy + 64];
    }
    return out;
  }
  window.__ccNameAudit = () => {
    const B = nameBoxes(), bad = [];
    for (const era in B) {
      const [x, y] = B[era]; const n = CONSTS[era].name;
      const w = n.length * 8.4 + 12, x1 = x - w / 2, x2 = x + w / 2, y1 = y - 16, y2 = y + 6;
      for (const k in POS) {
        const c = +k, p = POS[c]; if (!p) continue;
        const gr = 30 * ((c === 10 || c === 20) ? 1.5 : 1);
        if (x1 < p[0] + gr && x2 > p[0] - gr && y1 < p[1] + gr * 0.6 + 16 && y2 > p[1] - gr)
          bad.push(n + " overlaps century " + c);
      }
    }
    return bad;
  };
  function eraNames(){
    let g="";
    const BOX = nameBoxes();
    for(const era in CONSTS){ const cst=CONSTS[era], col=HUE[era];
      const [lx,ly] = BOX[era] || [W/2, H/2];
      g+=`<text x="${lx.toFixed(0)}" y="${ly.toFixed(0)}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="15" letter-spacing="1.8" fill="${col}" opacity=".8">${cst.name}</text>`;
    }
    return g;
  }
  function current(){
    let g=""; let prev=POS[30];
    for(let c=29;c>=1;c--){ if(!POS[c]) continue; const col=HUE[META[c]]||"#7fa0e0"; g+=`<line x1="${prev[0]}" y1="${prev[1]}" x2="${POS[c][0]}" y2="${POS[c][1]}" stroke="${col}" stroke-width="2.4" opacity=".22" stroke-linecap="round"/>`; prev=POS[c]; }
    g+=`<line x1="${prev[0]}" y1="${prev[1]}" x2="${SUN[0]}" y2="${SUN[1]}" stroke="#9a8cf0" stroke-width="2.4" opacity=".22" stroke-linecap="round"/>`;
    let d=`M ${POS[30][0]} ${POS[30][1]} `; for(let c=29;c>=1;c--) if(POS[c]) d+=`L ${POS[c][0]} ${POS[c][1]} `; d+=`L ${SUN[0]} ${SUN[1]}`;
    g+=`<path class="cc-drift-flow" d="${d}" fill="none" stroke="#eaf0ff" stroke-width="1.2" stroke-dasharray="2 10" opacity=".5"/>`;
    return g;
  }
  // ═══ THE OVERDRIVE IS AN ASTEROID FIELD ═══════════════════════════════════════════
  //   It was a dashed red ellipse, a warning sticker laid over the sky. It read as
  //   primitive: the Sea marks its overdrive with troubled water and the
  //   Origins with the Dragon-Wastes, and the stellar chart had a traffic cone.
  //   The deep past is a BELT. Nine centuries of debris where time broke up and never
  //   re-formed, and every league through it costs you two energy because you are flying
  //   through rock. The rocks tumble (a transform, so the compositor does it for free),
  //   the dust band hangs, and the hazard beacon rides the rim.
  // ═══ THE DEBRIS BELT, a STRUCTURE, not a sprinkle ═══════════════════════════════
  //   Two notes: the red circle came out ugly, then, after it was replaced
  //   with scattered rock, the rocks did not read as a circle. Look at the dragon, it needs
  //   to read clearly and thematically as a danger zone.
  //   Both notes are the same note, and the second one is the lesson: a hazard zone is not
  //   a TEXTURE, it is an OBJECT. The Sea draws a school of sharks. The Origins draws a
  //   world-dragon coiled around the deep past. Both are unmistakable from across the room
  //   because they are DRAWN, deliberate, bold, one silhouette. Forty-six pebbles are not
  //   a silhouette; they are noise you have to squint at to interpret.
  //   So the belt is drawn: a shattered RING with a real inner and outer edge, hung with
  //   fragments big enough to read at a glance, the wreckage of a world that came apart
  //   when time did. It does not have to be naturalistic. It has to be CLEAR.
  function overdriveZone(){
    const cs=[1,2,3,4,5,6,7,8,9].filter(c=>POS[c]); if(!cs.length) return "";
    let cx=0,cy=0; cs.forEach(c=>{cx+=POS[c][0];cy+=POS[c][1];}); cx/=cs.length; cy/=cs.length;
    let rx=0,ry=0; cs.forEach(c=>{rx=Math.max(rx,Math.abs(POS[c][0]-cx)); ry=Math.max(ry,Math.abs(POS[c][1]-cy));});
    rx+=58; ry+=52;
    const R_IN = 0.80, R_OUT = 1.12;                 // the band has EDGES. That is what makes it a ring.
    const ring=(k)=>{ let d=""; const N=72;
      for(let i=0;i<=N;i++){ const a=(i/N)*Math.PI*2;
        const w = k * (1 + (rnd(i,7)-0.5)*0.05);      // a ragged rim, shattered, not machined
        d += (i?"L":"M") + (cx+Math.cos(a)*rx*w).toFixed(1) + " " + (cy+Math.sin(a)*ry*w).toFixed(1) + " "; }
      return d+"Z"; };
    // the BAND, filled between the two rims, so the zone has a body you can see
    let g = `<g class="cc-belt" data-tip="THE DEBRIS BELT: where time came apart in the deep past and never
             re-formed. Every league inside it costs 2 energy: you are flying through rock.">
      <path d="${ring(R_OUT)} ${ring(R_IN)}" fill-rule="evenodd" fill="url(#ccDust)" opacity=".85"/>
      <path d="${ring(R_OUT)}" fill="none" stroke="#8a7a62" stroke-width="1.5" opacity=".55"/>
      <path d="${ring(R_IN)}"  fill="none" stroke="#8a7a62" stroke-width="1.5" opacity=".55"/>
      <path d="${ring(R_OUT*1.005)}" fill="none" stroke="#c4583a" stroke-width="1" stroke-dasharray="9 7" opacity=".38"/>`;
    // the FRAGMENTS, few, BIG, unmistakable. A silhouette, not a texture.
    const N = 22;
    for (let i = 0; i < N; i++) {
      const a  = (i / N) * Math.PI * 2 + (rnd(i,3)-0.5) * 0.10;
      const rr = R_IN + 0.06 + rnd(i, 11) * (R_OUT - R_IN - 0.12);
      const x  = cx + Math.cos(a) * rx * rr;
      const y  = cy + Math.sin(a) * ry * rr;
      const sz = 7 + rnd(i, 19) * 11;                // BIG. You can see these from the desk.
      let pts = "";
      for (let k = 0; k < 8; k++) {
        const t = (k / 8) * Math.PI * 2;
        const q = sz * (0.58 + rnd(i * 8 + k, 31) * 0.62);
        pts += `${(Math.cos(t)*q).toFixed(1)},${(Math.sin(t)*q*0.84).toFixed(1)} `;
      }
      const dur = (18 + rnd(i, 47) * 30).toFixed(1);
      const dly = (-rnd(i, 53) * 40).toFixed(1);
      // THE TRAP, AND IT IS WRITTEN IN MY OWN MANUAL: "CSS/WAAPI transform OVERRIDES the SVG
      // transform attribute. Never animate an attr-positioned node, wrap the content in an
      // inner <g> and animate THAT." I put transform="translate(x y)" and a CSS rotate on
      // the SAME node, so the CSS wiped the translate and every rock was yanked to the SVG
      // ORIGIN and spun there. That is why asteroids appeared sitting in the middle of
      // THE TOWER and THE COMPASS: they were not misplaced, they were HOMELESS.
      // I did this correctly for the sharks four hours ago and then forgot it here.
      // Outer <g> holds the POSITION (an attribute). Inner <g> does the SPIN (CSS). Never both.
      g += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">
              <g class="cc-rock" style="--rt:${dur}s; animation-delay:${dly}s">
                <polygon points="${pts.trim()}" fill="#6d6355" stroke="#a1937d" stroke-width=".9"/>
                <polygon points="${pts.trim()}" fill="url(#ccRockLit)" opacity=".5"/>
                <circle cx="${(-sz*.24).toFixed(1)}" cy="${(-sz*.18).toFixed(1)}" r="${(sz*.22).toFixed(1)}" fill="rgba(26,22,18,.5)"/>
                <circle cx="${(sz*.26).toFixed(1)}" cy="${(sz*.20).toFixed(1)}" r="${(sz*.14).toFixed(1)}" fill="rgba(26,22,18,.4)"/>
              </g>
            </g>`;
    }
    // the grit between the boulders, still, cheap, just enough to say "and dust"
    for (let i = 0; i < 26; i++) {
      const a = rnd(i, 61) * Math.PI * 2;
      const rr = R_IN + rnd(i, 67) * (R_OUT - R_IN);
      const x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
      const q = 1 + rnd(i, 71) * 2.4;
      g += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${q.toFixed(1)}" fill="#7d7161" opacity="${(.3+rnd(i,73)*.5).toFixed(2)}"/>`;
    }
    // ...and it is NAMED, the way the Dragon-Wastes are named. Not a banner floating over
    // the sky, the region's own name, written across the region, like a chart names a sea.
    let lx = cx, ly = cy + ry * 0.02;
    // on a phone the belt's name lies along its foot, left of IV, clear of the Serpent's name
    if (PHONE() && PL) { lx = 16 + 62; ly = H - 11; }
    g += `<g transform="translate(${lx.toFixed(0)} ${ly.toFixed(0)})"><text class="cc-beltname" text-anchor="middle"
            font-family="Georgia,serif" font-style="italic" font-size="${PHONE()?12.5:15}" letter-spacing="${PHONE()?.6:2.2}"
            fill="#d68a6a" opacity="${PHONE()?.95:.72}">THE DEBRIS BELT</text>
          <text y="15" text-anchor="middle"
            font-family="'Courier New',monospace" font-size="7.5" letter-spacing="1.4"
            fill="#a86a52" opacity=".7" class="pdx-ref">2 ENERGY / CENTURY</text></g></g>`;
    return g;
  }
  function deadSun(){
    const [x,y]=SUN;
    let rays=""; for(let i=0;i<16;i++){ const a=i/16*6.28; rays+=`<line x1="${(x+Math.cos(a)*24).toFixed(1)}" y1="${(y+Math.sin(a)*24).toFixed(1)}" x2="${(x+Math.cos(a)*(34+rnd(i,9)*14)).toFixed(1)}" y2="${(y+Math.sin(a)*(34+rnd(i,9)*14)).toFixed(1)}" stroke="#9a8cf0" stroke-width="1" opacity=".4"/>`; }
    return `<g class="cc-sun" data-c="0">
      <circle class="cc-hit" data-c="0" cx="${x}" cy="${y}" r="${PHONE()?40:42}" fill="transparent"/>
      <circle cx="${x}" cy="${y}" r="60" fill="url(#ccSunGlow)"/>
      <g class="cc-sun-rays">${rays}</g>
      <circle cx="${x}" cy="${y}" r="30" fill="none" stroke="#6a5aa0" stroke-width="1" stroke-dasharray="3 4" opacity=".5" class="cc-sun-ring"/>
      <circle cx="${x}" cy="${y}" r="22" fill="#0a0714" stroke="#8f6fd6" stroke-width="1.4"/>
      <circle cx="${x}" cy="${y}" r="22" fill="url(#ccSunCore)"/>
      <text x="${x}" y="${PHONE()?y+40:y-32}" text-anchor="middle" font-family="'Courier New',monospace" font-weight="bold" font-size="${PHONE()?14:9}" letter-spacing="${PHONE()?1.4:3}" fill="#cfc2e8"${PHONE()?' stroke="#04040c" stroke-width="3" paint-order="stroke"':""}>YEAR ZERO</text>
      <text x="${x}" y="${y+3}" text-anchor="middle" font-family="'Courier New',monospace" font-size="11" fill="#cfc2e8">&#8734;</text>
    </g>`;
  }
  function gyro(){
    const x=W-46,y=64;
    return `<g class="cc-gyro pdx-ref" transform="translate(${x} ${y})" font-family="'Courier New',monospace">
      <circle r="20" fill="none" stroke="#3a4f7a" stroke-width="1"/><circle r="13" fill="none" stroke="#3a4f7a" stroke-width=".5" opacity=".6"/>
      <path d="M0 -18 l3 7 h-6 z" fill="#9a8cf0"/><text y="-22" text-anchor="middle" font-size="6" fill="#9a8cf0">FUTURE</text>
      <path d="M0 18 l3 -7 h-6 z" fill="#e0b23a"/><text y="30" text-anchor="middle" font-size="6" fill="#e0b23a">PAST · YEAR ZERO</text>
      <circle r="2" fill="#7fa0e0"/></g>`;
  }
  let auditCache=[];
  // THE SKY RUNS ON: past the chart's edge the same dark field, the same dust of stars,
  // a few far nebulae and distant galaxies. Nothing that could be read as a world.
  function skyExtArt(EX,EY){
    const X1=W+EX, Y1=H+EY;
    let defs=`<radialGradient id="ccxBg" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${W/2} ${H*.26}) scale(${W*.9} ${H*.9})"><stop offset="0" stop-color="#131333"/><stop offset=".5" stop-color="#090919"/><stop offset="1" stop-color="#04040c"/></radialGradient>`;
    const eras=["tim","con","mod","lma","hma","ant"];
    eras.forEach(e=>{ defs+=`<radialGradient id="ccxNeb${e}"><stop offset="0" stop-color="${HUE[e]}" stop-opacity=".30"/><stop offset=".45" stop-color="${HUE[e]}" stop-opacity=".10"/><stop offset="1" stop-color="${HUE[e]}" stop-opacity="0"/></radialGradient>`; });
    let g=`<rect x="0" y="0" width="${X1}" height="${Y1}" fill="url(#ccxBg)"/>`;
    const out=(x,y)=>x>W+6||y>H+6;
    // far nebulae, soft and faint, close enough to the edge to be seen on any screen
    const puffs=[[W+70,H*.18,150],[W+260,H*.55,230],[W+120,H*.86,170],[W+620,H*.32,260],[W*.22,H+90,170],[W*.62,H+150,210],[W+180,H+120,190]];
    puffs.forEach((q,i)=>{ g+=`<circle cx="${q[0].toFixed(0)}" cy="${q[1].toFixed(0)}" r="${q[2]}" fill="url(#ccxNeb${eras[i%6]})"/>`; });
    // distant galaxies, tilted discs with a bright core
    const gal=[[W+150,H*.40,.8],[W*.40,H+110,1],[W+420,H*.75,.7],[W+900,H*.20,.9]];
    gal.forEach((q,i)=>{ const rot=(rnd(i,31)*160-80).toFixed(0);
      g+=`<g transform="translate(${q[0].toFixed(0)} ${q[1].toFixed(0)}) rotate(${rot}) scale(${q[2]})" opacity=".5"><ellipse rx="26" ry="7" fill="#9fb0ff" opacity=".16"/><ellipse rx="15" ry="4" fill="#cfd8ff" opacity=".28"/><path d="M -24 2 Q -8 -9 0 0 Q 8 9 24 -2" fill="none" stroke="#b8c4ff" stroke-width="1" opacity=".35"/><circle r="2.2" fill="#eef2ff" opacity=".8"/></g>`; });
    // the same dust of stars at the chart's density
    const N=Math.round(220*(X1*Y1-W*H)/(W*H));
    let st="";
    for(let i=0;i<N;i++){ const x=Math.round(rnd(i+900,1)*X1), y=Math.round(rnd(i+900,2)*Y1); if(!out(x,y)) continue;
      st+=`<circle cx="${x}" cy="${y}" r="${(rnd(i+900,3)*1.1+.2).toFixed(1)}" fill="#cfe0ff" opacity="${(rnd(i+900,4)*.5+.1).toFixed(2)}"/>`; }
    g+=st;
    return `<defs>${defs}</defs>${g}`;
  }
  function baseMap(){
    layout(); auditCache=audit(); if(auditCache.length) console.warn("STAR-CHART AUDIT:", auditCache);
    let defs=`<radialGradient id="ccBg" cx="50%" cy="26%" r="90%"><stop offset="0" stop-color="#131333"/><stop offset=".5" stop-color="#090919"/><stop offset="1" stop-color="#04040c"/></radialGradient>
      <radialGradient id="ccSunGlow"><stop offset="0" stop-color="rgba(143,111,214,.55)"/><stop offset=".55" stop-color="rgba(90,74,160,.2)"/><stop offset="1" stop-color="rgba(90,74,160,0)"/></radialGradient>
      <radialGradient id="ccSunCore" cx="40%" cy="35%"><stop offset="0" stop-color="#2a1f4a"/><stop offset="1" stop-color="#0a0714"/></radialGradient><radialGradient id="ccBhCore" cx="42%" cy="38%"><stop offset="0" stop-color="#171026"/><stop offset=".6" stop-color="#06040e"/><stop offset="1" stop-color="#000005"/></radialGradient><filter id="ccBhBlur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter><radialGradient id="ccSecHalo"><stop offset="0" stop-color="#b89af0" stop-opacity=".5"/><stop offset=".55" stop-color="#8f6fd6" stop-opacity=".16"/><stop offset="1" stop-color="#8f6fd6" stop-opacity="0"/></radialGradient>`;
    const NEBSEED={tim:11,con:27,mod:41,lma:6,hma:53,ant:71};
    defs+=`<linearGradient id="ccRockLit" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#e6d6b4" stop-opacity=".55"/><stop offset=".5" stop-color="#e6d6b4" stop-opacity="0"/></linearGradient>`;
    defs+=`<radialGradient id="ccDust"><stop offset="0" stop-color="rgba(150,120,96,0)"/><stop offset=".62" stop-color="rgba(150,120,96,.06)"/><stop offset=".88" stop-color="rgba(168,136,104,.16)"/><stop offset="1" stop-color="rgba(120,96,72,0)"/></radialGradient>`;
    ["tim","con","mod","lma","hma","ant"].forEach(e=>{ defs+=`<radialGradient id="ccStar${e}"><stop offset="0" stop-color="${HUE[e]}" stop-opacity=".95"/><stop offset=".35" stop-color="${HUE[e]}" stop-opacity=".4"/><stop offset="1" stop-color="${HUE[e]}" stop-opacity="0"/></radialGradient><radialGradient id="ccNeb${e}"><stop offset="0" stop-color="${HUE[e]}" stop-opacity=".74"/><stop offset=".32" stop-color="${HUE[e]}" stop-opacity=".36"/><stop offset=".68" stop-color="${HUE[e]}" stop-opacity=".11"/><stop offset="1" stop-color="${HUE[e]}" stop-opacity="0"/></radialGradient><filter id="ccNebF${e}" x="-70%" y="-70%" width="240%" height="240%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="4" seed="${NEBSEED[e]}" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="42" xChannelSelector="R" yChannelSelector="G" result="disp"/><feGaussianBlur in="disp" stdDeviation="8" result="body"/><feColorMatrix in="disp" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 14 -0.55" result="solid"/><feMorphology in="solid" operator="dilate" radius="1.5" result="dil"/><feComposite in="dil" in2="solid" operator="out" result="ring"/><feFlood flood-color="${HUE[e]}" flood-opacity=".98" result="fc"/><feComposite in="fc" in2="ring" operator="in" result="rim"/><feGaussianBlur in="rim" stdDeviation=".55" result="rimS"/><feMerge><feMergeNode in="body"/><feMergeNode in="rimS"/></feMerge></filter>`; });
    let out=`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#ccBg)"/>`;
    out+=`<g class="cc-neblayer">${eraZones()}</g>`;
    out+=starfield();
    out+=current();
    out+=overdriveZone();
    for(let c=1;c<=30;c++) out+=worldG(c);
    out+=PHONE()?phoneNames():eraNames();
    out+=deadSun();
    if(!PHONE()) out+=gyro();
    return {defs,out};
  }
  /* ═══ LIVE LAYER ═══ */
  function liveLayer(){
    if(!app||!app.view) return ""; const view=app.view; let g="";
    // (period sealing is read at the black-hole vaults, not by re-flooding the nebulae)
    // ── THE PERIOD VAULTS, a small black hole between each period's two constellations;
    //    delivered relics collapse into it (the Sea's registry chest, re-spoken as a singularity) ──
    for(const period in BHP){ const H2=holePos(period); if(!H2) continue; const [x,y]=H2, col=PHUE[period], eras=PERIOD_ERAS[period];
      const items=R.deliveries.filter(dv=>ERAS_OF(dv.century).some(e2=>eras.includes(e2)));
      const covered=view.travelers.filter(t=>(t.delivered_periods||[]).includes(period)); const n=items.length;
      const recent=items.slice(-5).map(dv=>`  ${rom(dv.century)} \u00b7 ${(dv.card&&(dv.card.display_name||dv.card.name))||"a relic"}`).join("\n");
      const tip=`${period.toUpperCase()} VAULT: the singularity that swallows delivered relics\n${n?n+" relic"+(n>1?"s":"")+" absorbed \u00b7 +"+n+" CP scored here":"nothing has fallen in yet"}${covered.length?"\nsealed by "+covered.map(t=>t.name).join(", "):""}${recent?"\n"+recent:""}`;
      g+=`<g class="cc-bhole${n?" on":""}" data-period="${esc(period)}" data-tip="${esc(tip)}" transform="translate(${x} ${y})">
        <ellipse class="cc-bh-glow" rx="30" ry="12" fill="${col}" opacity="${n?.22:.1}" filter="url(#ccBhBlur)"/>
        <ellipse class="cc-bh-disk" rx="22" ry="7.5" fill="none" stroke="${col}" stroke-width="3.2" stroke-dasharray="9 6" opacity="${n?.9:.5}"/>
        <ellipse rx="22" ry="7.5" fill="none" stroke="#fff" stroke-width=".8" opacity="${n?.5:.26}"/>
        <ellipse rx="13.5" ry="4.5" fill="none" stroke="${col}" stroke-width="1.4" opacity=".5"/>
        <circle r="7" fill="url(#ccBhCore)"/><circle r="7" fill="none" stroke="${col}" stroke-width="1.1" opacity=".95"/><circle r="8.7" fill="none" stroke="#fff" stroke-width=".5" opacity=".42"/>
        ${n?`<text x="0" y="-16" text-anchor="middle" font-family="'Courier New',monospace" font-weight="bold" font-size="10.5" fill="${col}" stroke="#04040c" stroke-width="2.6" paint-order="stroke">\u00d7${n}</text>`:""}
        ${covered.length?`<g transform="translate(0 19)">${covered.map((t,k)=>`<circle cx="${(k-(covered.length-1)/2)*8}" cy="0" r="3" fill="${seatColor(t.name)}" stroke="#04040c" stroke-width=".7"/>`).join("")}</g>`:""}
      </g>`;
    }
    // drift trails (voyages), faint comet wakes
    for(const t of R.trails){ const A=(t.from===0?SUN:POS[t.from]), B=(t.to===0?SUN:POS[t.to]); if(!A||!B) continue; const age=view.hour-t.hour; const op=age<=0?.9:age===1?.6:age===2?.42:Math.max(.18,.36-(age-2)*.03); const col=age<=1?seatColor(t.seat):(HUE[META[t.to]]||"#7fa0e0"); g+=`<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${col}" stroke-width="${age<=0?2.6:age===1?1.9:1.3}" opacity="${op}" stroke-linecap="round"/>`; }
    // paradox rifts
    for(const c of R.monsters){ if(!POS[c]||R.restored.has(c)) continue; const [x,y]=POS[c]; g+=`<g class="cc-rift" transform="translate(${x+worldR(c)+8} ${y-6})" data-tip="${esc(`a rift tore open near ${rom(c)}, the Paradix bleeds through`)}"><path d="M0 -8 l3 6 l-4 3 l4 5" stroke="#b3402e" stroke-width="1.4" fill="none"/><path d="M0 -8 l-3 6 l4 3 l-4 5" stroke="#8f6fd6" stroke-width="1" fill="none" opacity=".7"/></g>`; }
    // merchant hauler (on the gold MERCHANT plate, window.__pdxMerchPlate)
    const haulerAt=c=>haulerAt2(c);
    const mc = R.merchantShown!=null?R.merchantShown:view.merchant_century;
    R.mAnchor=null;
    if(POS[mc]){ const [x,y]=POS[mc]; const dice=view.merchant_movement_dice||1; const side=x>W*0.82?-1:1;
      const cargo=(view.market_revealed||[]).slice(0,5).map(c2=>`  ${(c2.display_name||c2.name)}, ${c2.gold_cost!=null?c2.gold_cost+"g":"--"}`).join("\n");
      const tip=`THE HAULER: docked at ${rom(mc)}\n${dice}d3 drift · trade when near\n${cargo?"CARGO FOR TRADE:\n"+cargo:"the hold stands empty"}`;
      let str=""; for(let i=0;i<Math.min(3,dice);i++) str+=`<rect x="-10" y="${-7+i*3}" width="20" height="1.7" fill="#b3402e" opacity=".85"/>`;
      const [hx,hy]=haulerAt(mc); R.mAnchor=[hx,hy];
      g+=(window.__pdxPieceDefs?window.__pdxPieceDefs("cc",true):"");
      g+=`<g class="cc-hauler pc-merch-live" data-tip="${esc(tip)}" transform="translate(${hx} ${hy})">${window.__pdxMerchPlate?window.__pdxMerchPlate({w:40,base:14,dark:true}):""}<g transform="scale(${side<0?-1.2:1.2} 1.2) translate(3.5 0)"><g class="cc-bob">${window.__pdxOutline(`
        <path d="M-16 0 L-7 -6 L9 -6 L16 0 L9 6 L-7 6 Z" fill="#2c2414" stroke="#d4b02a" stroke-width="1.2"/>
        <rect x="-9" y="-7" width="5" height="14" rx="1.4" fill="#3a2c16" stroke="#d4b02a" stroke-width=".7"/><rect x="-3" y="-6.5" width="5" height="13" rx="1.4" fill="#463414" stroke="#d4b02a" stroke-width=".6"/>
        <path d="M4 -6 L11 -3 L11 3 L4 6 Z" fill="#4a3a1c" stroke="#d4b02a" stroke-width=".6"/><circle cx="8" cy="0" r="1.8" fill="#e8c05a"/>
        <path d="M-16 -3 L-23 0 L-16 3 Z" fill="#ff9a5a" class="cc-beam"/><path d="M-16 -1.4 L-20 0 L-16 1.4 Z" fill="#ffe0a0"/>
        <path d="M2 -6 L6 -10 L8 -6 Z M2 6 L6 10 L8 6 Z" fill="#c9a45c"/>
        ${Array.from({length:Math.min(3,dice)},(_,i)=>`<circle cx="${-4+i*4}" cy="11" r="1.4" fill="#e0c478"/>`).join("")}`,{gold:true})}</g></g>${window.__pdxMerchTag?window.__pdxMerchTag(-26):""}</g>`; }
    // milestone beacons X / XX
    for(const c of [10,20]){ if(!POS[c]) continue; const [x,y]=POS[c]; const claim=view.travelers.filter(t=>c===10?t.scored_century_x:t.scored_century_xx); g+=`<g class="cc-beacon" data-tip="${esc(`millennium ${rom(c)} beacon, ${claim.length?"claimed by "+claim.map(t=>t.name).join(", "):"unclaimed"} · end an Hour here for +1 CP`)}" transform="translate(${(x-worldR(c)*0.5).toFixed(0)} ${(y+worldR(c)*0.2).toFixed(0)})"><path d="M-3 6 L0 -8 L3 6 Z" fill="#c9a45c" stroke="#e8c05a" stroke-width=".7"/><circle cx="0" cy="-8" r="2.2" fill="#ffe9b0" class="cc-beam"/>${claim.map((t,i)=>`<circle cx="${-3+i*3}" cy="9" r="1.3" fill="${seatColor(t.name)}"/>`).join("")}</g>`; }
    // secret ghost-station (XI)
    if(POS[11]){ const [x,y]=POS[11], open=!!view.secret_market_open;
      g+=`<g class="cc-secret${open?" on":""}" data-tip="${esc(open?"THE GHOST MARKET is OPEN at XI, a hidden bazaar trades in the deep past":"a sealed ghost-station at XI, end an Hour here to crack it open")}" transform="translate(${(x+30).toFixed(0)} ${(y-16).toFixed(0)})">
        <circle class="cc-sec-halo" r="19" fill="url(#ccSecHalo)" opacity="${open?1:.5}"/>
        <g class="cc-sec-ring"><circle r="14" fill="none" stroke="#a884e0" stroke-width=".9" stroke-dasharray="2.5 4.5" opacity=".75"/><path d="M0 -14 L1.5 -10 L-1.5 -10 Z M14 0 L10 1.5 L10 -1.5 Z M0 14 L1.5 10 L-1.5 10 Z M-14 0 L-10 1.5 L-10 -1.5 Z" fill="#b89af0" opacity=".7"/></g>
        <path d="M0 -11 L9 0 L0 11 L-9 0 Z" fill="${open?"rgba(143,111,214,.32)":"rgba(143,111,214,.1)"}" stroke="#b89af0" stroke-width="1.4" ${open?"":'stroke-dasharray="3 2.5"'}/>
        <path d="M0 -6 L5 0 L0 6 L-5 0 Z" fill="none" stroke="#d3b6ff" stroke-width="1" opacity=".85"/>
        <circle class="cc-sec-core" r="2.6" fill="${open?"#eaddff":"#9a7fd0"}"/>
        ${open?`<text y="24" text-anchor="middle" font-family="'Courier New',monospace" font-weight="bold" font-size="6" letter-spacing="1.2" fill="#d3b6ff" stroke="#04040c" stroke-width="1.8" paint-order="stroke" opacity=".95">GHOST MARKET</text>`:""}
      </g>`; }
    // delivery beacons, my hand's destinations
    const self=view.travelers.find(t=>t.is_self);
    if(self) for(const card of (self.hand||[])){ const c=card.delivery_century; if(!POS[c]) continue; const [x,y]=POS[c]; g+=`<g class="cc-flag" data-tip="${esc(`${card.display_name||card.name}, deliver at ${rom(c)} for +1 CP`)}" transform="translate(${x} ${(y-worldR(c)*0.5).toFixed(0)})"><path d="M-7 5 V-2 Q-7 -4 -5 -4 H5 Q7 -4 7 -2 V5 Z" fill="#e8b24a" stroke="#5a3a1a" stroke-width="1"/><path d="M-7 -1 H7 M0 -4 V5" stroke="#5a3a1a" stroke-width=".8"/><rect x="-1.4" y="-2" width="2.8" height="3" fill="#8a5a1a"/></g>`; }
    // rivals' required deliveries (public)
    for(const t of view.travelers){ if(t.is_self) continue; let k2=0; for(const card of (t.equipment||[])){ const c=card.delivery_century; if(c==null||!POS[c]) continue; const [x,y]=POS[c]; g+=`<g class="cc-flag" data-tip="${esc(`${t.name} must deliver ${card.display_name||card.name} at ${rom(c)}`)}" transform="translate(${(x+worldR(c)*0.5+k2*5).toFixed(0)} ${(y-worldR(c)*0.4).toFixed(0)}) scale(.72)"><path d="M-7 5 V-2 Q-7 -4 -5 -4 H5 Q7 -4 7 -2 V5 Z M-7 -1 H7" fill="${seatColor(t.name)}" stroke="rgba(0,0,0,.5)" stroke-width=".6" opacity=".85"/></g>`; k2++; } }
    // restored (delivered) ignition rings drawn in worldG via cc-lit; here add a soft "always thus" tag on hover handled by tip
    // travelers (ships) at their worlds
    R.pcPos={};
    const byC={}; for(const t of view.travelers){ const sc=R.shown[t.name]!=null?R.shown[t.name]:t.century; (byC[sc]=byC[sc]||[]).push(t); }
    for(const [cs,ts] of Object.entries(byC)){ const c=+cs; if(!POS[c]) continue; const [x,y]=POS[c], R0=worldR(c);
      if(ts.length>1) g+=`<circle cx="${x}" cy="${y}" r="${R0+18}" fill="none" stroke="#8a6a3a" stroke-width="1" stroke-dasharray="3 4" opacity=".55" data-tip="shared orbit, agreements possible"/>`;
      // BERTHS, RE-CUT FOR THE AURA. These were laid out for a token 1.2x tall with no
      // ring: four diagonals at ~16px from the star's heart. The aura is r=17.5, so at
      // that spacing three rivals on one century became a single unreadable knot, and
      // the two bottom berths sat exactly where the new century plate goes.
      // The bottom-centre is now RESERVED for the plate; the berths ring the star above
      // and beside it, far enough apart that no two auras touch.
      // A LEASH, AND A SHORTER ONE. It got hard to tell which century a
      // traveller was on, the token sitting halfway between two
      // centuries. That came from pushing the
      // berths out to 40px to stop the new auras from overlapping, and traded one
      // legibility problem for a worse one, a token that belongs to nobody.
      // Two fixes, and belt AND braces because "which century" must never be a guess:
      //   1. they come home. The berths are re-angled so three of them still clear each
      //      other at HALF the distance (the slots carry the separation now, not the
      //      radius), so every traveller sits inside their own star's glow.
      //   2. a LEASH, a short line, in their colour, from the century to them. Even when
      //      two centuries crowd, the line says whose they are. You do not read it.
      const SLOTS=[[0,-1.34],[-1.34,0.10],[1.34,0.10],[-1.0,-1.0],[1.0,-1.0]];
      // THE OUTLINES (window.__pdxOutline / __pdxPlate, board_draft.js): each piece is
      // ringed tight by its own silhouette on a small seat-coloured foot; the berths are
      // FANNED until the pieces clear each other, inside the chart.
      const PR=t=>(t.is_self?15:12); ts.sort((a,b)=>(a.is_self?1:0)-(b.is_self?1:0));   // mine is drawn last, on top
      const berth=ts.map((t,i)=>{ const [dx,dy]=SLOTS[i%SLOTS.length]; return { x:x+dx*(R0*0.40+10), y:y+dy*(R0*0.40+10), r:PR(t)+4 }; });
      const FANS=R.mAnchor?berth.concat([{x:R.mAnchor[0],y:R.mAnchor[1],r:24,fixed:true}]):berth;
      if(window.__pdxFan) window.__pdxFan(FANS,5,[24,34,W-24,H-24]);   // the Merchant is a fixed obstacle
      { const PLR=(c2)=>{ const [px,py]=POS[c2], GR=30*((c2===10||c2===20)?1.5:DUAL[c2]?1.28:1), L=rom(c2).length; return PHONE()?[px-(L*6.3+6), py+Math.min(GR,36)*.42, px+(L*6.3+6), py+Math.min(GR,36)*.42+21]:[px-(L*4.3+5), py+GR*.6, px+(L*4.3+5), py+GR*.6+14]; }; const plates=[]; for(let c2=1;c2<=30;c2++){ if(POS[c2]&&Math.hypot(POS[c2][0]-x,POS[c2][1]-y)<=190) plates.push(PLR(c2)); } for(const q of (PLNAMES||[])) plates.push(q); { const cand=mode&&mode.kind==="travel"?travelCandidates():null; if(cand) for(const c2 of cand){ if(c2===mode.self||!POS[c2]) continue; const [qx,qy]=POS[c2], k=PHONE()?1.55:1; let ty=qy-(worldR(c2)+16); if(PHONE()&&ty<30) ty=qy+worldR(c2)+26; plates.push([qx-24*k, ty-11*k, qx+24*k, ty+8*k]); } }   /* and off a voyage's cost tags */ if(window.__pdxPlacePieces) window.__pdxPlacePieces(FANS,[x,y],plates,[24,34,W-24,H-24],34); }   // every century's numeral stays readable
      const chase=view.merchant_plan&&view.merchant_plan.target_seat;
      ts.forEach((t,i)=>{ const col=seatColor(t.name); const bx=Math.round(berth[i].x), by=Math.round(berth[i].y); const st=t.statuses||[]; const ghost=st.includes("terminated")&&t.century>=24; const dead=t.is_terminated&&t.awaiting_respawn; const hunted=chase===t.name&&view.merchant_century!==t.century;
        const pr=PR(t), pcy=-1; R.pcPos[t.name]=[bx,by+pcy];
        const memo=R.pcAt||(R.pcAt={}); const pulse=t.is_self&&memo[t.name]!=null&&memo[t.name]!==c; if(t.is_self) memo[t.name]=c;
        const em=window.__pdxEmanata?window.__pdxEmanata(t,col,R.em||(R.em={}),-34):{cls:"",g:""};
        const sc=t.is_self?1.6:1.42, keel=7*sc; const plate=window.__pdxPlate({col,self:t.is_self,base:keel,w:7*sc,dark:true,pulse});
        const tag=window.__pdxTag(t.is_self?"YOU":esc(initials(t.name)),col,keel+11,{self:t.is_self,dark:true,chased:hunted});
        g+=`<g class="cc-shipg pc-piece-g${t.is_self?" pc-self":""}${dead&&!ghost?" cc-lost":""}${em.cls}" data-hlseat="${esc(t.name)}" data-seat="${t.name}" data-tip="${esc(`${t.name}${t.is_self?" (you)":""}, ${rom(c)} · ${t.energy} energy · ${t.gold} gold · ${t.contract_points||0} CP${t.is_wanted?" · WANTED":""}${hunted?" · the Merchant is chasing you (richest traveller not in his century)":""}${ghost?" · sheltered in the Reaches (terminated)":""}${dead&&!ghost?" · lost, recompiling":""}`)}" transform="translate(${bx} ${by})"><line x1="${(x-bx).toFixed(1)}" y1="${(y-by).toFixed(1)}" x2="0" y2="${pcy}" stroke="${col}" stroke-width="2" stroke-linecap="round" opacity=".75" stroke-dasharray="2.6 2.4"/><g class="pc-piece"><g class="cc-aura">${plate}</g><g transform="scale(${sc})">${window.__pdxOutline(shipSVG(seatShip(t.name),col,{ghost,dead:dead&&!ghost}))}</g>${tag}</g>${em.g}</g>`;
      });
    }
    // the chase line and his reach beside the Merchant (board_draft.js); the rule is on TAB
    if(R.mAnchor&&view.merchant_plan&&window.__pdxMerchantHUD){ const pl=view.merchant_plan, tt=pl.target_seat&&view.travelers.find(t2=>t2.name===pl.target_seat);
      g+=window.__pdxMerchantHUD({v:view,m:[R.mAnchor[0],R.mAnchor[1]+1],tpos:tt&&tt.century!==mc&&R.pcPos[tt.name]||null,pos:c2=>POS[c2]||null,dark:true}); }
    g+=orderSlate();
    g+=highlights();
    return g;
  }
  function arcPath(from,to){ const A=from===0?SUN:POS[from], B=to===0?SUN:POS[to]; if(!A||!B) return ""; const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1; const bow=Math.min(40,L*.16)*(rnd(from*31+to,1)>.5?1:-1); const mx=A[0]+dx/2-dy/L*bow, my=A[1]+dy/2+dx/L*bow; return `M ${A[0]} ${A[1]} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${B[0]} ${B[1]}`; }

  /* ═══ SAILING ORDER (docked slate, hover-reveal) ═══ */
  let ordHovered=false;
  function orderSlate(){
    if(!app||!app.view) return ""; const view=app.view;
    const order=[...view.travelers].sort((a,b)=>b.century-a.century||b.gold-a.gold||b.energy-a.energy);
    const bh=30+order.length*24+6; let rows="";
    order.forEach((t,i)=>{ const col=seatColor(t.name), yy=30+i*24; const pers=t.delivered_periods||[]; const pips=["Origins","Ascension","Singularity"].map((p,k)=>`<circle cx="${104+k*11}" cy="${yy-3}" r="3.5" fill="${pers.includes(p)?PHUE[p]:"none"}" stroke="${PHUE[p]}" stroke-width=".8" opacity="${pers.includes(p)?1:.4}"/>`).join("");
      rows+=`<g data-hlseat="${esc(t.name)}" data-tip="${esc(`${i+1}. ${t.name}${t.is_self?" (you)":""}, ${rom(t.century)} · ${t.gold}g · ${t.energy}e · ${t.contract_points||0} CP · periods ${pers.length}/3`)}"><text x="12" y="${yy}" text-anchor="middle" font-family="'Courier New',monospace" font-weight="bold" font-size="10" fill="#bfe0ff">${i+1}</text><g transform="translate(30 ${yy-3}) scale(.85)">${shipSVG(seatShip(t.name),col,{})}</g><text x="44" y="${yy}" font-family="'Courier New',monospace" font-weight="bold" font-size="9" fill="${col}">${esc(initials(t.name))} · ${rom(t.century)}</text>${pips}</g>`;
    });
    const lead=order[0];
    return `<g class="cc-ord${ordHovered?" open":""}" transform="translate(0 92)">
      <g class="cc-ord-body"><rect width="150" height="${bh}" rx="3" fill="rgba(12,14,30,.94)" stroke="#3a4f7a" stroke-width="1.4"/><text x="75" y="18" text-anchor="middle" font-family="'Courier New',monospace" font-weight="bold" font-size="9" letter-spacing="2" fill="#cfe0ff">DRIFT ORDER</text>${rows}<text x="75" y="${bh-6}" text-anchor="middle" font-family="'Courier New',monospace" font-style="italic" font-size="6" fill="#7f9ad0">future-most drifts first · dots = periods sealed</text></g>
      <g class="cc-ord-pin"><path d="M0 0 H20 Q25 0 25 5 V120 Q25 125 20 125 H0 Z" fill="rgba(12,14,30,.94)" stroke="#3a4f7a" stroke-width="1.3"/><g transform="translate(12 22) scale(.95)">${lead?shipSVG(seatShip(lead.name),seatColor(lead.name),{}):""}</g><text transform="translate(16 50) rotate(90)" font-family="'Courier New',monospace" font-weight="bold" font-size="8" letter-spacing="2" fill="#cfe0ff">ORDER</text></g></g>`;
  }

  /* ═══ HIGHLIGHTS (decision focus) ═══ */
  const BOLT="M 0 0 l -2.7 4.9 h 2 l -1.2 4.7 4.5 -6.1 h -2.1 l 2 -3.5 z";
  function highlights(){
    if(!mode) return ""; let g=""; const cand=pickCandidates();
    const ring=(c,cls,tip)=>{ const P=c===0?SUN:POS[c]; if(!P) return; const rr=(c===0?46:worldR(c)+13); g+=`<circle class="cc-glow ${cls}" data-c="${c}" data-tip="${esc(tip)}" cx="${P[0]}" cy="${P[1]}" r="${rr}"/>`; };
    const tag=(c,txt,kind)=>{ const P=c===0?SUN:POS[c]; if(!P) return; const [x,y]=P; let ty=y-(c===0?52:worldR(c)+16); if(PHONE()&&ty<30) ty=y+worldR(c)+26; /* a phone's top row: the tag hangs under the plate */ const col=kind==="free"?"#6ff0c0":kind==="risk"?"#ff6a5a":"#e6b95a"; const w=txt.length*6.6+(kind==="free"?12:22); g+=`<g class="cc-cost"${PHONE()?` transform="translate(${x} ${ty}) scale(1.55) translate(${-x} ${-ty})"`:""}><rect x="${x-w/2}" y="${ty-10}" width="${w}" height="17" rx="3" fill="rgba(10,10,26,.92)" stroke="${col}" stroke-width="1.3"/>${kind==="free"?"":`<path d="${BOLT}" transform="translate(${x-w/2+8} ${ty-6})" fill="${col}"/>`}<text x="${x+(kind==="free"?0:5)}" y="${ty+3}" text-anchor="middle" font-family="'Courier New',monospace" font-weight="bold" font-size="10" fill="${col}">${txt}</text></g>`; };
    if(mode.kind==="travel"){
      for(let c=1;c<=30;c++){ if(!cand.has(c)||c===mode.self) continue; if(c>mode.self||mode.ppc===0){ ring(c,"cc-go-future",`with the drift to ${rom(c)}, free`); tag(c,"FREE","free"); } else { const cost=armedCost(c); const risk=cost>=mode.energy; ring(c,risk?"cc-go-risk":"cc-go-past",`beat upstream to ${rom(c)}, ${cost} energy${risk?" (this could strand you)":""}`); tag(c,String(cost),risk?"risk":"cost"); } }
      if(cand.has(0)){ ring(0,"cc-go-risk",`the final plunge into the Dead Sun, ends the game (+2 CP)`); tag(0,String(armedCost(0)),"risk"); }
    } else if(mode.kind==="merchant"){ for(const c of mode.centuries) if(POS[c]) ring(c,"cc-go-merch",`send the hauler to ${rom(c)}`); }
    else if(mode.kind==="century"){ for(const c of mode.centuries) if(POS[c]) ring(c,"cc-go-target",`target ${rom(c)}`); }
    return g;
  }
  function commandText(){
    if(!mode) return "";
    if(mode.kind==="travel"){ const hasF=[...(travelCandidates()||[])].some(c=>c>mode.self&&c!==0); const clause=mode.ppc===0?` · <b class="cg">the Compass makes this drift FREE</b>`:hasF?"":` · <b class="cn">you're at the newest century, only the PAST is open</b>`; return `<span class="vz-sigil cmd-sigil">${window.__helaSigil||""}</span><span class="vz-name">HELA</span>` + `PLOT A DRIFT: up to ${mode.max} ${mode.max===1?"century":"centuries"} · <b class="cg">green = future, free (with the drift)</b> · <b class="cc">amber = past, costs energy</b>${clause} · <span class="cc-anchor">HOLD at ${rom(mode.self)}</span>`; }
    if(mode.kind==="merchant") return `<span class="vz-sigil cmd-sigil">${window.__helaSigil||""}</span><span class="vz-name">HELA</span>` + "RELOCATE THE HAULER: choose its new century";
    return `<span class="vz-sigil cmd-sigil">${window.__helaSigil||""}</span><span class="vz-name">HELA</span>` + "CHOOSE A TARGET CENTURY";
  }

  /* ═══ FX THEATER (serialized) ═══ */
  /* ═══ THE STALL, the bug that made the game unplayable ═══════════════════════
     drainFx() lives at the END of renderLive(). When I gated renderLive() on "am I the
     skin on screen?" I put the `return` ABOVE the drain. The moment the traveller's
     period switched the visible skin, this map's fx queue started filling and never
     emptied, and game.js (line 300) holds the ENTIRE paced event queue open on that
     flag before it will prompt for ANY decision:
         for (let w = 0; w < 80 && window.__seaPresenting(); w++) await this._sleep(150);
     A permanently-true flag therefore taxed every action in the game with a multi-second
     dead stall. After buying an item it took about 6 seconds before you could
     buy the next one, which killed the game.
     Off-screen the theatre plays to an empty house, so it plays INSTANTLY: bank the
     state, drop the animation, clear the flags. Plus a watchdog, because a flag that can
     freeze the whole game must be able to unstick itself. ═══════════════════════════ */
  let fxBusy=false, renderPending=false, fxGuard=null;
  function __flushFxSilently(){
    // and DROP OUR ORDER. An off-screen chart holding a stale command banner is what the
    // pip-boy mirror used to latch onto and pin over the matrix forever.
    try{ const r=document.getElementById("timeline-rail"); const c=r&&r.querySelector(".cc-cmd");
      if(c) c.innerHTML=""; }catch(e){} R.fx.length=0; if(fxGuard){clearTimeout(fxGuard); fxGuard=null;}
    fxBusy=false; renderPending=false; R.sailing=false; }
  function fxG(){ const r=document.getElementById("timeline-rail"); return r&&r.querySelector(".cplot-sing .cc-fx"); }
  function haulerAt2(c){ const [x,y]=POS[c], sd=x>W*0.82?-1:1; return [Math.round(x+sd*(worldR(c)*0.55+16)), Math.round(y-worldR(c)*0.15-14)]; }   // clear of the century's label
  function liveG(){ const r=document.getElementById("timeline-rail"); return r&&r.querySelector(".cplot-sing .cc-live"); }
  function drainFx(){ if(REDUCED){ R.fx.length=0; return; } if(fxBusy) return; const f=R.fx.shift(); if(!f) return; fxBusy=true;
    if(fxGuard) clearTimeout(fxGuard);
    fxGuard=setTimeout(()=>{ fxGuard=null; if(fxBusy&&!window.__pdxTripBusy){ fxBusy=false; drainFx(); } },6000);   // watchdog: never hang the game
    const done=ms=>setTimeout(()=>{ if(fxGuard){clearTimeout(fxGuard); fxGuard=null;} fxBusy=false; if(renderPending){renderPending=false; renderNow();} drainFx();},ms);
    try{ playFx(f,done); }catch(e){ fxBusy=false; } }
  function comet(from,to,col,onArrive,ship){
    const svg=fxG(); if(!svg||REDUCED){ onArrive&&onArrive(); return; }
    const d=arcPath(from,to); if(!d){ onArrive&&onArrive(); return; }
    const p=document.createElementNS(NS,"path"); p.setAttribute("d",d); p.setAttribute("fill","none"); p.setAttribute("stroke",col); p.setAttribute("stroke-width","2.4"); p.setAttribute("stroke-linecap","round"); p.setAttribute("opacity",".9"); svg.appendChild(p);
    const L=p.getTotalLength(); const dur=Math.min(1700,600+L*2.2)*(window.__pdxPace ? window.__pdxPace(1) : 1); p.style.strokeDasharray=L; p.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:dur,easing:"cubic-bezier(.35,.1,.35,1)",fill:"forwards"});
    const b=document.createElementNS(NS,"g"); b.innerHTML=`<g transform="scale(1.2)">${shipSVG(ship||0,col,{})}</g><circle r="10" fill="none" stroke="${col}" stroke-width="1" opacity=".4"/>`; b.style.offsetPath=`path("${d}")`; b.style.offsetRotate="auto"; svg.appendChild(b);
    b.animate([{offsetDistance:"0%"},{offsetDistance:"100%"}],{duration:dur,easing:"cubic-bezier(.35,.1,.35,1)"}).onfinish=()=>b.remove();
    stellarSail(dur);
    setTimeout(()=>{ p.animate([{opacity:.9},{opacity:0}],{duration:600,fill:"forwards"}).onfinish=()=>p.remove(); onArrive&&onArrive(); }, dur);
  }
  function flare(c,col){ const svg=fxG(); const P=c===0?SUN:POS[c]; if(!svg||!P||REDUCED) return; for(let i=0;i<10;i++){ const a=i/10*6.28, ln=document.createElementNS(NS,"line"); ln.setAttribute("x1",P[0]+Math.cos(a)*8); ln.setAttribute("y1",P[1]+Math.sin(a)*8); ln.setAttribute("x2",P[0]+Math.cos(a)*24); ln.setAttribute("y2",P[1]+Math.sin(a)*24); ln.setAttribute("stroke",col); ln.setAttribute("stroke-width","2"); ln.setAttribute("stroke-linecap","round"); svg.appendChild(ln); ln.animate([{opacity:0},{opacity:1,offset:.3},{opacity:0}],{duration:700,delay:i*30}).onfinish=()=>ln.remove(); } }
  function floatText(c,txt,col){ const svg=fxG(); const P=c===0?SUN:POS[c]; if(!svg||!P||REDUCED) return; const t=document.createElementNS(NS,"text"); t.setAttribute("x",P[0]); t.setAttribute("y",P[1]-8); t.setAttribute("text-anchor","middle"); t.setAttribute("font-family","'Courier New',monospace"); t.setAttribute("font-weight","bold"); t.setAttribute("font-size","15"); t.setAttribute("fill",col); t.setAttribute("stroke","#05060e"); t.setAttribute("stroke-width","3"); t.setAttribute("paint-order","stroke"); t.style.transformBox="fill-box"; t.style.transformOrigin="center"; t.textContent=txt; svg.appendChild(t); t.animate([{transform:"translateY(6px)",opacity:0},{transform:"translateY(-4px)",opacity:1,offset:.3},{transform:"translateY(-26px)",opacity:0}],{duration:1100,easing:"cubic-bezier(.2,.8,.4,1)"}).onfinish=()=>t.remove(); }
  function holePos(per){ if(PHONE()) return PHB[per]||null; const b=BHP[per]; return b?[Math.round(b[0]*W/820), b[1]]:null; }
  function absorbToHole(c,per){ const svg=fxG(); const P=(c===0?SUN:POS[c]); const H2=holePos(per); if(!svg||!P||!H2||REDUCED) return; const col=PHUE[per]||"#9a8cf0";
    const dx=H2[0]-P[0], dy=H2[1]-P[1]; const mx=P[0]+dx*0.5-dy*0.22, my=P[1]+dy*0.5+dx*0.22; const d=`M ${P[0]} ${P[1]} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${H2[0]} ${H2[1]}`;
    const gg=document.createElementNS(NS,"g"); gg.innerHTML=`<path d="M0 -6 L5 0 L0 6 L-5 0 Z" fill="${col}" stroke="#fff" stroke-width=".8"/><circle r="1.8" fill="#fff"/>`; gg.style.offsetPath=`path("${d}")`; gg.style.offsetRotate="auto"; svg.appendChild(gg);
    gg.animate([{offsetDistance:"0%",opacity:0},{offsetDistance:"10%",opacity:1,offset:.12},{offsetDistance:"80%",opacity:1,offset:.72},{offsetDistance:"100%",opacity:0}],{duration:1050,easing:"cubic-bezier(.45,0,.85,.35)"}).onfinish=()=>gg.remove();
    setTimeout(()=>{ const hg=liveG()&&liveG().querySelector(`.cc-bhole[data-period="${per}"] .cc-bh-glow`); if(hg){ try{ hg.animate([{transform:"scale(1)"},{transform:"scale(1.5)"},{transform:"scale(1)"}],{duration:520,easing:"ease-out"}); }catch(_){} } const dk=liveG()&&liveG().querySelector(`.cc-bhole[data-period="${per}"] .cc-bh-disk`); if(dk){ try{ dk.animate([{opacity:1},{opacity:.4},{opacity:.9}],{duration:520}); }catch(_){} } }, 990);
  }
  function starSfx(){ if(!audible()) return null; const A=window.__audio; return (A&&A.ctx)?{C:A.ctx,sfx:A.sfxBus||A.master||A.ctx.destination,mas:A.master||A.ctx.destination}:null; }
  function stellarSail(dur){ try{ const S=starSfx(); if(!S) return; const {C,sfx}=S, t=C.currentTime, D=Math.min(1.7,Math.max(0.4,(dur||900)/1000));
    const nb=C.createBuffer(1,Math.ceil(C.sampleRate*(D+0.2)),C.sampleRate); const dd=nb.getChannelData(0); for(let i=0;i<dd.length;i++) dd[i]=(Math.random()*2-1)*0.5; const ns=C.createBufferSource(); ns.buffer=nb; const nf=C.createBiquadFilter(); nf.type="bandpass"; nf.Q.value=1.1; nf.frequency.setValueAtTime(300,t); nf.frequency.exponentialRampToValueAtTime(2200,t+D*0.6); nf.frequency.exponentialRampToValueAtTime(520,t+D); const ng=C.createGain(); ng.gain.value=0; ns.connect(nf); nf.connect(ng); ng.connect(sfx); ng.gain.setValueAtTime(0,t); ng.gain.linearRampToValueAtTime(0.07,t+D*0.25); ng.gain.setValueAtTime(0.07,t+D*0.7); ng.gain.exponentialRampToValueAtTime(0.0001,t+D); ns.start(t); ns.stop(t+D+0.05);
    const o=C.createOscillator(); o.type="triangle"; const og=C.createGain(); og.gain.value=0; o.connect(og); og.connect(sfx); o.frequency.setValueAtTime(420,t); o.frequency.exponentialRampToValueAtTime(1300,t+D*0.55); o.frequency.exponentialRampToValueAtTime(360,t+D); og.gain.setValueAtTime(0,t); og.gain.linearRampToValueAtTime(0.05,t+0.08); og.gain.exponentialRampToValueAtTime(0.0001,t+D); o.start(t); o.stop(t+D+0.05); }catch(e){} }
  function blackholeAbsorb(){ try{ const S=starSfx(); if(!S) return; const {C,mas}=S, t=C.currentTime;
    const o=C.createOscillator(); o.type="sawtooth"; const bp=C.createBiquadFilter(); bp.type="bandpass"; bp.Q.value=3; const g=C.createGain(); g.gain.value=0; o.connect(bp); bp.connect(g); g.connect(mas); o.frequency.setValueAtTime(760,t); o.frequency.exponentialRampToValueAtTime(70,t+0.85); bp.frequency.setValueAtTime(1400,t); bp.frequency.exponentialRampToValueAtTime(180,t+0.85); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.1,t+0.1); g.gain.exponentialRampToValueAtTime(0.0001,t+0.9); o.start(t); o.stop(t+0.95);
    const bo=C.createOscillator(); bo.type="sine"; bo.frequency.setValueAtTime(120,t+0.7); bo.frequency.exponentialRampToValueAtTime(32,t+1.5); const bg=C.createGain(); bg.gain.value=0; bo.connect(bg); bg.connect(mas); bg.gain.setValueAtTime(0,t+0.7); bg.gain.linearRampToValueAtTime(0.22,t+0.82); bg.gain.exponentialRampToValueAtTime(0.0001,t+1.55); bo.start(t+0.7); bo.stop(t+1.6);
    [1500,2000,2700].forEach((fr,i)=>{ const sq=C.createOscillator(); sq.type="sine"; sq.frequency.value=fr; const sg=C.createGain(); sg.gain.value=0; sq.connect(sg); sg.connect(mas); const st=t+0.82+i*0.05; sg.gain.setValueAtTime(0,st); sg.gain.linearRampToValueAtTime(0.03,st+0.02); sg.gain.exponentialRampToValueAtTime(0.0001,st+0.7); sq.start(st); sq.stop(st+0.75); }); }catch(e){} }
  function playFx(f,done){
    if(f.t==="trail"){ R.shown[f.seat]=-1; renderNow(); comet(f.from,f.to,seatColor(f.seat),()=>{ R.shown[f.seat]=f.to; (R.pend||(R.pend={}))[f.seat]={c:f.to,t:performance.now()}; renderNow(); flare(f.to,seatColor(f.seat)); snd("chart_stamp"); try{ window.__fxLanded&&window.__fxLanded(f.seat,f.to); }catch(e){} if(f.to===0) floatText(0,"YEAR ZERO","#efe6f8"); }, seatShip(f.seat)); const A=f.from===0?SUN:POS[f.from],B=f.to===0?SUN:POS[f.to]; const dur=(A&&B?Math.min(1700,600+Math.hypot(B[0]-A[0],B[1]-A[1])*2.2):900)*(window.__pdxPace ? window.__pdxPace(1) : 1); done(dur+260); return; }
    if(f.t==="deliver"){ R.restored.add(f.c); renderNow(); absorbToHole(f.c,periodOf(f.c)); blackholeAbsorb(); floatText(f.c,"+1 CP","#e8b24a"); done(1250); return; }
    if(f.t==="paradox"){ floatText(f.c,"PARADOX","#b3402e"); const el=liveG()&&liveG().querySelector(`.cc-world[data-c="${f.c}"]`); if(el) el.animate([{transform:el.getAttribute("transform")},{transform:el.getAttribute("transform")+" translate(-2px,1px)"},{transform:el.getAttribute("transform")+" translate(2px,-1px)"},{transform:el.getAttribute("transform")}],{duration:300}); snd("sea_monster"); done(900); return; }
    if(f.t==="wreck"){ flare(f.c,"#b3402e"); floatText(f.c,"TERMINATED","#ff6a5a"); snd("chart_creak"); done(900); return; }
    if(f.t==="milestone"){ flare(f.c,"#e8b24a"); floatText(f.c,"+1 CP","#e8b24a"); snd("chart_bell"); done(800); return; }
    if(f.t==="merchant"){ const p=f.p||{}, to=p.to!=null?p.to:(app&&app.view?app.view.merchant_century:null), from=p.from;
      // THE VOYAGE, TOLD (window.__pdxMerchantTrip, board_draft.js); the queue waits for it
      if(from!=null&&to!=null&&from!==to&&POS[from]&&POS[to]&&window.__pdxMerchantTrip&&fxG()&&__live()){ R.merchantShown=from; renderNow(); const L=liveG();
        snd("chart_creak");
        window.__pdxMerchantTrip({layer:fxG(),piece:L&&L.querySelector(".cc-hauler.pc-merch-live"),pos:c2=>POS[c2]||null,anchor:c2=>POS[c2]?haulerAt2(c2):null,m0:haulerAt2(from),cdy:1,stopDy:46,p,W,H,dark:true,
          tpos:(p.target&&R.pcPos&&R.pcPos[p.target])||null,onLand:()=>{ R.merchantShown=to; R.mPend={c:to,t:performance.now()}; renderNow(); snd("chart_stamp"); },onDone:()=>done(60)}); return; }
      window.__pdxTripPending=false; R.merchantShown=null; renderNow(); snd("chart_creak"); done(500); return; }
    done(60);
  }

  /* ═══ INTERACTION ═══ */
  function plotTravel(fromC,toC){ const st=selfT(); if(!st) return; R.preplot=`${fromC}:${toC}`; R.travelFrom=fromC; R.sailing=true; R.shown[st.name]=-1; renderNow(); comet(fromC,toC,seatColor(st.name),()=>{ const _r=selfT(); const _land=(_r&&_r.century!==R.travelFrom)?_r.century:toC; R.shown[st.name]=_land; R.pendingSelf=_land; R.travelFrom=null; R.sailing=false; renderNow(); flare(toC,seatColor(st.name)); snd("chart_stamp"); if(toC===0) floatText(0,"YEAR ZERO","#efe6f8"); }, seatShip(st.name)); }
  let prevPrev=null;
  function setPreview(c){ const svg=fxG(); if(prevPrev){ prevPrev.remove(); prevPrev=null; } if(c==null||!mode||mode.kind!=="travel"||c===mode.self||!svg||REDUCED) return; const cand=travelCandidates(); if(!cand||!cand.has(c)) return; const d=arcPath(mode.self,c); const p=document.createElementNS(NS,"path"); p.setAttribute("d",d); p.setAttribute("fill","none"); p.setAttribute("stroke",(armedCost(c)>=mode.energy&&armedCost(c))?"#ff6a5a":(c>mode.self||mode.ppc===0)?"#6ff0c0":"#e6b95a"); p.setAttribute("stroke-width","2"); p.setAttribute("stroke-dasharray","3 6"); p.setAttribute("opacity",".8"); p.setAttribute("stroke-linecap","round"); svg.appendChild(p); prevPrev=p; }
  function nearestStar(e){ const rail=document.getElementById("timeline-rail"); const svg=rail&&rail.querySelector(".cplot-sing .pc-star"); if(!svg) return null; const r=svg.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width*W, y=(e.clientY-r.top)/r.height*H; let best=null,bd=1e9; for(let c=1;c<=30;c++){ if(!POS[c]) continue; const d=Math.hypot(x-POS[c][0],y-POS[c][1]); if(d<bd){bd=d;best=c;} } const ds=Math.hypot(x-SUN[0],y-SUN[1]); if(ds<bd){bd=ds;best=0;} return bd<52?best:null; }
  function onWorldClick(c){
    if(!app||!mode||!app.pendingReq) return;
    if(mode.kind==="travel"){ if(c===mode.self){ snd("chart_stamp"); app.respond({direction:1,distance:0}); mode=null; scheduleLive(); return; } const cand=travelCandidates(); if(!cand||!cand.has(c)){ snd("chart_brush"); return; } if(c===0){ plotTravel(mode.self,0); app.respond({direction:-1,distance:mode.self}); mode=null; scheduleLive(); return; } const d=Math.abs(c-mode.self); plotTravel(mode.self,c); app.respond({direction:c>mode.self?1:-1,distance:d}); mode=null; scheduleLive(); }
    else if(mode.kind==="merchant"&&mode.centuries.has(c)){ snd("chart_stamp"); app.respond({century:c}); mode=null; scheduleLive(); }
    else if(mode.kind==="century"&&mode.centuries.has(c)){ snd("chart_stamp"); app.respond({choice:c}); mode=null; scheduleLive(); }
    else snd("chart_brush");
  }

  /* ═══ SKIN + RENDER ═══ */
  let skinInit=false, warping=false;
  function updateSkin(){
    const r=document.getElementById("timeline-rail"); if(!r) return;
    const s=selfT(); const want=window.__forceSkin?(window.__forceSkin==="sing"):((s?periodOf(s.century):"Singularity")==="Singularity"); const cur=r.classList.contains("skin-sing");
    const era=(w)=>{ try{ document.body.classList.toggle("era-sing", !!w); }catch(e){} };
    const flip=()=>{ r.classList.toggle("skin-sing",want); era(want); renderNow(); };
    if(!skinInit){ skinInit=true; flip(); return; }
    if(want===cur||warping) return;
    // the era turns like a comic page (board_draft.js __pdxChartTurn): out of the Singularity is back in time
    warping=true; window.__pdxChartTurn(!want, flip, ()=>{ warping=false; });
  }
    let liveTimer=null;
  let __dirty = false;
  function __live() { const r = document.getElementById("timeline-rail");
    return !!r && (r.classList.contains("skin-sing")); }
  function scheduleLive(){ if(liveTimer) return; liveTimer=setTimeout(()=>{liveTimer=null; renderLive();},120); }
  function renderNow(){ if(liveTimer){clearTimeout(liveTimer);liveTimer=null;} renderLive(true); }
  function renderLive(force) {
    // PERF: all three timeline skins live in the DOM at once, and all three ran
    // this on every state tick, including the two you cannot see. The CPU profile
    // caught them: 21.9 + 15.8 + 14.9 ms of self-time, on maps nobody is looking at.
    // Skip the work while we are not the skin on screen; remember we fell behind and
    // catch up the instant we become visible (SINGULARITY).
    // ═══ THE CHART COULD NEVER CHANGE ERA AGAIN ═══════════════════════════════════
    // updateSkin() is NOT rendering. It is the function that DECIDES which of the three
    // charts is on screen, it reads the traveller's century, works out the period, and
    // plays the comic page turn that swaps the chart. It used to sit at the BOTTOM of this
    // function, and my `if (!__live()) return` gate put it out of reach: __live() asks
    // "am I the skin on screen?", so a chart that is NOT on screen could never run the
    // one piece of code that would PUT it on screen. The only other caller is mount(),
    // which runs once at boot. So the era the game started in was the era it was stuck
    // in, forever, so travelling to the Origins left the castles behind.
    // It decides liveness, so it must run BEFORE the liveness gate. Always.
    updateSkin();
    if (!__live()) { __dirty = true; __flushFxSilently(); return; }
    if (__dirty) { __dirty = false; force = true; }
    const r=document.getElementById("timeline-rail"); const lg=r&&r.querySelector(".cplot-sing .cc-live"); if(!lg||!lg.isConnected) return;
    if(fxBusy&&!force){ renderPending=true; return; }
    if(!fxBusy&&!R.sailing&&R.fx.length===0&&app&&app.view){ app.view.travelers.forEach(t=>{ if(t.is_self&&R.pendingSelf!=null){ if(t.century===R.pendingSelf) R.pendingSelf=null; else return; } /* one journey, played once: a landed piece holds until the state catches up */ const pd=R.pend&&R.pend[t.name]; if(pd){ if(t.century===pd.c||performance.now()-pd.t>20000) delete R.pend[t.name]; else return; } R.shown[t.name]=t.century; }); if(R.mPend&&(app.view.merchant_century===R.mPend.c||performance.now()-R.mPend.t>20000)) R.mPend=null; if(!R.mPend) R.merchantShown=app.view.merchant_century; }
    // the live layer is rewritten only when it changed (the 300ms poll calls this forever;
    // rebuilding it each time re-rastered the chart three times a second at rest)
    const liveHTML=liveLayer(), liveSame=!force&&lg.__pdxHTML===liveHTML;
    if(!liveSame){ lg.innerHTML=liveHTML; lg.__pdxHTML=liveHTML; }
    const top=r.querySelector(".cplot-sing .cc-top"); if(top&&!liveSame){ top.replaceChildren(); const ord=lg.querySelector(".cc-ord"); if(ord) top.appendChild(ord); }
    const cmd=r.querySelector(".cplot-sing .cc-cmd"); if(cmd){ const t=commandText(); if(cmd.__pdxHTML!==t){ cmd.innerHTML=t; cmd.__pdxHTML=t; } cmd.classList.toggle("on",!!t); }
    const svg=r.querySelector(".cplot-sing .pc-star"); if(svg) svg.classList.toggle("mode-pick",!!mode);
    const h=app&&app.view?app.view.hour:null; const hh=r.querySelector(".cplot-sing .cc-hour"); if(hh&&h!=null&&hh.textContent!==`HOUR ${h}`) hh.textContent=`HOUR ${h}`;
    if(h!=null&&prevHour!=null&&h!==prevHour&&r.classList.contains("skin-sing")){ /* new hour pulse */ svg&&svg.querySelectorAll(".cc-world .cc-worldbody").forEach((el,i)=>{ if(REDUCED) return; el.animate([{opacity:.5},{opacity:1}],{duration:400,delay:(i%8)*30}); }); }
    prevHour=h;
    applyFocus(); refreshAudio(); drainFx();   // updateSkin now runs at the TOP, see above
  }
  function applyFocus(){ const r=document.getElementById("timeline-rail"); const svg=r&&r.querySelector(".cplot-sing .pc-star"); if(!svg) return; const cand=pickCandidates(); svg.querySelectorAll(".cc-world").forEach(el=>{ const c=+el.dataset.c; el.classList.toggle("can-go",!!cand&&cand.has(c)); const here=app&&app.view&&app.view.travelers.some(t=>(R.shown[t.name]!=null?R.shown[t.name]:t.century)===c); el.classList.toggle("has-trav",here); }); const sun=svg.querySelector(".cc-sun"); if(sun) sun.classList.toggle("can-go",!!(cand&&cand.has(0))); }

  /* ═══ AUDIO ROUTING (cosmic soundscape, no gulls in space) ═══ */
  function wireAudio(){ const A=window.__audio; if(!A||A.__singAudio) return; A.__singAudio=true; installStarscape(A); const origSea=A.setSeascape?A.setSeascape.bind(A):null;
    A.setSeascape=(on)=>{ on=!!on; A._seaReq=on; const sing=window.__forceSkin?(window.__forceSkin==="sing"):(selfT()&&periodOf(selfT().century)==="Singularity");
      if(on&&sing){ A.setStarscape&&A.setStarscape(true); if(origSea) origSea(false); return; }
      A.setStarscape&&A.setStarscape(false); return origSea?origSea(on):undefined; }; }
  // re-assert while the timeline soundscape is wanted, so a mid-scene period cross switches sea<->stars
  function refreshAudio(){ const A=window.__audio; if(A&&A._seaReq&&A.setSeascape) A.setSeascape(true); }

  /* ═══ MOUNT ═══ */
  function mount(){
    const rail=document.getElementById("timeline-rail"); if(!rail) return false;
    if(rail.querySelector(".cplot-sing")) return true;
    const rb=rail.getBoundingClientRect(); const bw=rb.width-6, bh=rb.height-74; if(!PHONE()&&(bw<60||bh<60)) return false;   /* a phone's chart page keeps the rail display:none until it is shown (mobile.css): its chart is composed from the stage's shape, not the rail's, so it is built ahead, never on the first show */   // the cplot is inset 74px top + 6px left, derive W from the REAL content box so the chart fills it
    if(PHONE()){ const d=PH.dims(); W=d.W; H=d.H; } else W=Math.max(700,Math.min(1200,Math.round(H*bw/bh)));
    const base=baseMap();
    rail.insertAdjacentHTML("beforeend",`<div class="cplot-sing"><svg class="pc-star" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><defs>${base.defs}</defs><g class="cc-base">${base.out}</g><g class="cc-live"></g><g class="cc-fx"></g><g class="cc-top"></g></svg><div class="cc-cmd"></div><div class="cc-legend pdx-ref">${legendHTML()}</div><div class="cc-tip"></div></div>`);
    if(window.__pdxSheetExt&&!PHONE()) window.__pdxSheetExt(rail.querySelector(".cplot-sing"),W,H,skyExtArt);
    const svg=rail.querySelector(".cplot-sing .pc-star");
    svg.addEventListener("click",e=>{ const t=e.target.closest(".cc-hit, .cc-glow, .cc-cost, .cc-world, .cc-sun"); let c=(t&&t.dataset&&t.dataset.c!==undefined)?+t.dataset.c:nearestStar(e); if(c!=null&&!isNaN(c)) onWorldClick(c); });
    rail.querySelector(".cplot-sing .cc-cmd").addEventListener("click",e=>{ if(e.target.closest(".cc-anchor")&&mode&&mode.kind==="travel"&&app.pendingReq){ snd("chart_stamp"); app.respond({direction:1,distance:0}); mode=null; scheduleLive(); } });
    rail.querySelector(".cplot-sing .cc-legkey")&&rail.querySelector(".cplot-sing .cc-legkey").addEventListener("click",()=>{ rail.querySelector(".cplot-sing .cc-legend").classList.toggle("open"); snd("chart_stamp"); });
    const tip=rail.querySelector(".cplot-sing .cc-tip");
    svg.addEventListener("mousemove",e=>{ if(!__live()) return;   // the two charts you cannot see were still
      // hit-testing, measuring and building tooltip HTML on every single mouse event. my
      // 165Hz panel fires 165 of those a second, and TWO of the three charts are always
      // off-screen. Two thirds of this work has never been seen by anybody.
      // ONE TOOLTIP, AND ONLY ON PURPOSE: a tip opens only after the pointer rests ~600 ms on a
      // traveller or the secret market, closes the moment it leaves, and never while dice are
      // placed, a voyage is chosen, a button is held or the chart is animating. (The Merchant's
      // own readout opens the same way, app.css .pc-mhud.) Scenery never pops anything.
      mount._tipXY=[e.clientX,e.clientY];
      { const pc=e.target.closest("[data-seat][data-tip],.cc-secret"); const key=pc?(pc.getAttribute("data-seat")||"secret"):null;
        const quiet=!pc||fxBusy||R.sailing||R.fx.length||mode||e.buttons||document.body.classList.contains("allocating")||document.body.classList.contains("pc-mtrip");
        if(quiet){ clearTimeout(mount._tipT); mount._tipKey=null; tip.classList.remove("on","wide"); }
        else if(key!==mount._tipKey){ mount._tipKey=key; tip.classList.remove("on","wide"); clearTimeout(mount._tipT);
          mount._tipT=setTimeout(()=>{ if(mount._tipKey!==key) return; const L=liveG(); const el3=L&&(key==="secret"?L.querySelector(".cc-secret"):L.querySelector(`.cc-shipg[data-seat="${CSS.escape(key)}"]`)); if(!el3||!el3.getAttribute("data-tip")) return;
            tip.innerHTML=esc(el3.getAttribute("data-tip")).replace(/\n/g,"<br>"); tip.classList.add("on"); const box=rail.querySelector(".cplot-sing").getBoundingClientRect(); const [mx2,my2]=mount._tipXY; let tx=mx2-box.left+14,ty=my2-box.top+12; tip.style.left="0px"; tip.style.top="0px"; const tw=tip.offsetWidth,th=tip.offsetHeight; if(tx+tw>box.width-8) tx=mx2-box.left-tw-12; if(ty+th>box.height-8) ty=my2-box.top-th-10; tip.style.left=tx+"px"; tip.style.top=ty+"px"; },600); } }
      let pv=null; if(mode&&mode.kind==="travel"){ const el=e.target.closest(".cc-hit, .cc-glow, .cc-cost, .cc-world, .cc-sun"); const c=(el&&el.dataset.c!==undefined)?+el.dataset.c:nearestStar(e); if(c!=null){ const cand=travelCandidates(); if(c!==mode.self&&cand&&cand.has(c)) pv=c; } } if(pv!==mount._pv){ mount._pv=pv; setPreview(pv); }
      const oh=!!e.target.closest(".cc-ord"); if(oh!==ordHovered){ ordHovered=oh; const oe=rail.querySelector(".cplot-sing .cc-ord"); if(oe) oe.classList.toggle("open",oh); }
    });
    svg.addEventListener("mouseleave",()=>{ clearTimeout(mount._tipT); mount._tipKey=null; tip.classList.remove("on","wide"); setPreview(null); mount._pv=null; ordHovered=false; const oe=rail.querySelector(".cplot-sing .cc-ord"); if(oe) oe.classList.remove("open"); });
    document.addEventListener("keydown", e=>{ if((e.key==="Tab"||e.code==="Tab") && document.getElementById("timeline-rail").classList.contains("skin-sing")){ e.preventDefault(); const sv=rail.querySelector(".cplot-sing .pc-star"); if(sv) sv.classList.add("show-labels"); } });
    document.addEventListener("keyup", e=>{ if(e.key==="Tab"||e.code==="Tab"){ const sv=rail.querySelector(".cplot-sing .pc-star"); if(sv) sv.classList.remove("show-labels"); } });
    updateSkin(); renderNow();
    return true;
  }
  function legendHTML(){
    const g=(svg,label)=>`<div class="cc-lrow"><svg viewBox="0 0 20 20">${svg}</svg><span>${label}</span></div>`;
    return `<button class="cc-legkey" type="button">CHART KEY</button><div class="cc-legbody"><div class="cc-leghead">C.R.O.N.O.S. ASTRAL SURVEY</div>
      ${g(`<circle cx="10" cy="10" r="6" fill="url(#l1)"/><radialGradient id="l1" cx="38%" cy="32%"><stop offset="0" stop-color="#5a9bf0"/><stop offset="1" stop-color="#0a0a1e"/></radialGradient>`,"a century, a world-station")}
      ${g(`<path d="M10 3 L15 15 L10 12 L5 15 Z" fill="#6ff0c0"/>`,"a traveler's ship (you = ringed)")}
      ${g(`<polygon points="4,9 7,4 13,5 16,11 11,16 5,14" fill="#7a6f60" stroke="#a99b86" stroke-width=".8"/><circle cx="8" cy="8" r="1.6" fill="rgba(28,24,20,.6)"/>`,"the debris belt, costs 2 energy")}
      ${g(`<path d="M2 10 L16 10 M11 6 L16 10 L11 14" stroke="#6ff0c0" stroke-width="1.4" fill="none"/>`,"future, free (with the drift)")}
      ${g(`<path d="M16 10 L2 10 M7 6 L2 10 L7 14" stroke="#e6b95a" stroke-width="1.4" fill="none"/>`,"past, costs energy")}
      ${g(`<path d="M3 10 h14 M12 6 l5 4 l-5 4" stroke="#b3402e" stroke-width="1.2" fill="none"/><text x="1" y="7" font-size="6" fill="#b3402e">2×</text>`,"overdrive I-IX, 2 energy/century")}
      ${g(`<path d="M4 14 v-9 l8 3 l-8 3" fill="#ff9a5a"/>`,"deliver here (+1 CP)")}
      ${g(`<circle cx="10" cy="10" r="6" fill="none" stroke="#e8b24a" stroke-width="1.6"/><circle cx="10" cy="10" r="2.5" fill="#e8b24a"/>`,"registered, it was always thus")}
      ${g(`<path d="M10 3 L3 10 L10 17 L17 10 Z" fill="none" stroke="#c9a45c" stroke-width="1.4"/>`,"millennium X · XX (+1 CP)")}
      ${g(`<path d="M10 4 L16 10 L10 16 L4 10 Z" fill="none" stroke="#8f6fd6" stroke-width="1.4" stroke-dasharray="2 2"/>`,"secret ghost-station (XI)")}
      ${g(`<path d="M10 3 l3 6 l-4 3 l4 5" stroke="#b3402e" stroke-width="1.3" fill="none"/>`,"a rift, the Paradix bleeds in")}
      ${g(`<circle cx="10" cy="12" r="6" fill="#0a0714" stroke="#8f6fd6" stroke-width="1.2"/><text x="10" y="15" text-anchor="middle" font-size="8" fill="#cfc2e8">&#8734;</text>`,"YEAR ZERO: the Dead Sun (+2 CP)")}
      <div class="cc-legobj"><b>OBJECTIVE</b>, earn Contract Points (CP): deliver a relic on its century (+1), end an Hour on X/XX (+1), seal the three periods, or plunge into Year Zero (+2). Most CP wins.</div>
      <div class="cc-legfoot">- drift order left · hover a world to read it -</div></div>`;
  }

  let rzT=null;
  const railRelayout=()=>{ clearTimeout(rzT); rzT=setTimeout(()=>{ const rail=document.getElementById("timeline-rail"); const cp=rail&&rail.querySelector(".cplot-sing"); if(!cp) return; const box=cp.getBoundingClientRect(); if(!box.width||!box.height) return; const want=PHONE()?PH.dims().W:Math.max(700,Math.min(1200,Math.round(H*box.width/box.height))); if(Math.abs(want-W)<12) return; cp.remove(); if(mount()){ renderNow(); if(PHONE()) PH.remounted(); } },350); };
  window.addEventListener("resize",railRelayout);
  if(window.ResizeObserver){ const railEl=document.getElementById("timeline-rail"); if(railEl) new ResizeObserver(railRelayout).observe(railEl); }

  const style=document.createElement("style"); style.textContent=STYLE(); document.head.appendChild(style);
  setInterval(()=>{ if(hookApp()){ mount(); scheduleLive(); } },300);
  setInterval(()=>{ R.clockSec=(R.clockSec+1)%60; const el=document.querySelector(".cplot-sing .cc-clock"); if(el) el.textContent="23:47:"+String(R.clockSec).padStart(2,"0"); },1000);

  function STYLE(){ return `
    #timeline-rail > div.cplot-sing { position:absolute; inset:74px 0 0 6px; display:block !important; opacity:0; pointer-events:none; transition:opacity .15s ease; z-index:3; }
    #timeline-rail.skin-sing > div.cplot-sing { opacity:1; pointer-events:auto; }
    #timeline-rail.skin-sing > .cplot { opacity:0 !important; pointer-events:none !important; }
    .pc-star { width:100%; height:100%; display:block; filter:drop-shadow(0 10px 30px rgba(0,0,0,.7)); border-radius:8px; }
    .cc-hit { cursor:pointer; } .cc-world text, .cc-sun text { pointer-events:none; }
    /* .cc-num is gone, the century now lives on an always-lit .cc-numplate under the star */
    .cc-numplate { pointer-events:none; }
    .cc-world.has-trav .cc-num, .cc-world.can-go .cc-num, .show-labels .cc-num, .cc-world.cc-broken .cc-num, .cc-world.cc-wreck .cc-num { opacity:1; }
    .cc-tw { animation:cctw 3s ease-in-out infinite alternate; animation-delay:var(--d,0s); } @keyframes cctw { from{opacity:.15;} to{opacity:.9;} }
    /* the belt TUMBLES, a transform, so the compositor does it and the chart never repaints */
    .cc-rock { transform-box:fill-box; transform-origin:center; animation:ccrock var(--rt,20s) linear infinite; }
    @keyframes ccrock { to { transform:rotate(360deg); } }
    .cc-ovdlamp { transform-box:fill-box; transform-origin:center; animation:ccovdlamp 1.9s ease-in-out infinite; }
    @keyframes ccovdlamp { 0%,100%{ opacity:.35; } 50%{ opacity:1; } }
    .cc-neb { animation:ccneb 16s ease-in-out infinite alternate; } @keyframes ccneb { from{opacity:.17;} to{opacity:.3;} }
    .cc-drift-flow { animation:ccflow 3s linear infinite; } @keyframes ccflow { from{stroke-dashoffset:0;} to{stroke-dashoffset:-160;} }
    .cc-drift-glow { animation:ccbreath 5s ease-in-out infinite alternate; } @keyframes ccbreath { from{opacity:.1;} to{opacity:.24;} }
    .cc-sun-rays { transform-box:fill-box; transform-origin:center; animation:ccspin 60s linear infinite; }
    .cc-sun-ring { transform-box:fill-box; transform-origin:center; animation:ccspin 40s linear infinite reverse; }
    @keyframes ccspin { to{transform:rotate(360deg);} }
    .cc-sun text { animation:ccpulse 4s ease-in-out infinite alternate; } @keyframes ccpulse { from{opacity:.6;} to{opacity:1;} }
    .cc-lit { animation:ccpulse 3s ease-in-out infinite alternate; }
    .cc-sealedline { filter:drop-shadow(0 0 3px currentColor); animation:ccpulse 2.4s ease-in-out infinite alternate; }
    .cc-beam { animation:ccpulse 1.8s ease-in-out infinite alternate; }
    .cc-worldbody { transform-box:fill-box; transform-origin:center; }
    .cc-world { transition:opacity .35s ease, transform .15s ease; transform-box:fill-box; }
    .mode-pick .cc-world:not(.can-go), .mode-pick .cc-sun:not(.can-go) { opacity:.32; }
    .mode-pick .cc-world.can-go { cursor:pointer; } .mode-pick .cc-world.can-go:hover { transform:scale(1.08); }
    .cc-glow { fill:transparent; stroke-width:2.6; cursor:pointer; animation:ccglow 1.1s infinite alternate; }
    .cc-sec-ring{ transform-box:fill-box; transform-origin:center; animation:ccspin 26s linear infinite; }
    .cc-sec-core{ transform-box:fill-box; transform-origin:center; animation:ccpulse 2s ease-in-out infinite alternate; }
    .cc-secret{ transition:opacity .3s ease; } .cc-secret.on .cc-sec-halo{ animation:ccbreath 3.5s ease-in-out infinite alternate; }
    .cc-bh-disk{ transform-box:fill-box; transform-origin:center; animation:ccbhstream 3.2s linear infinite; } @keyframes ccbhstream{ to{ stroke-dashoffset:-60; } }
    .cc-bh-glow{ transform-box:fill-box; transform-origin:center; animation:ccbhpulse 4.6s ease-in-out infinite alternate; } @keyframes ccbhpulse{ from{ transform:scale(1); } to{ transform:scale(1.12); } }
    @keyframes ccglow { from{opacity:.4;} to{opacity:1;} }
    /* THE CHART HOLDS STILL WHILE HE WORKS THE MACHINE. Twenty-two tumbling rocks, eleven
       twinkling stars and six nebulae never stop, and the nebulae carry an SVG filter, which
       the browser re-rasterises on every frame it animates. That is a fair price while he is
       reading the chart and a bad one while he is placing a generator: both want the same
       frames, and the machine is the thing under his hand. So the decoration freezes for as
       long as an allocation is open. Nothing here animates position, so it picks up exactly
       where it left off and the chart never jumps. */
    body.allocating .cc-tw, body.allocating .cc-rock, body.allocating .cc-neb,
    body.allocating .cc-drift-flow, body.allocating .cc-drift-glow,
    body.allocating .cc-sun-rays, body.allocating .cc-sun-ring, body.allocating .cc-sun text,
    body.allocating .cc-lit, body.allocating .cc-sealedline, body.allocating .cc-beam,
    body.allocating .cc-sec-ring, body.allocating .cc-sec-core,
    body.allocating .cc-bh-disk, body.allocating .cc-bh-glow,
    body.allocating .cc-ovdlamp { animation-play-state:paused !important; }
    .cc-go-future{stroke:#6ff0c0;} .cc-go-past{stroke:#e6b95a;} .cc-go-risk{stroke:#ff6a5a;} .cc-go-merch{stroke:#ffa860;} .cc-go-target{stroke:#b48cff;}
    .cc-cost{cursor:pointer;} .cc-bob{transform-box:fill-box;transform-origin:center;animation:ccbob 3.4s ease-in-out infinite alternate;} @keyframes ccbob{from{transform:translateY(0);}to{transform:translateY(2.4px);}}
    .cc-ship{transform-box:fill-box;transform-origin:center;} .cc-dead,.cc-lost{opacity:.5;filter:grayscale(.6);}
    .cc-broken .cc-worldbody{filter:brightness(.6) saturate(.6);}
    .cc-wreck{filter:grayscale(.7) brightness(.6);}
    .cc-rift{transform-box:fill-box;transform-origin:center;animation:ccrift 2.6s ease-in-out infinite alternate;} @keyframes ccrift{from{opacity:.5;transform:rotate(-4deg);}to{opacity:1;transform:rotate(4deg);}}
    .cc-cmd { position:absolute; left:50%; top:6px; transform:translateX(-50%) scale(.92); z-index:8; background:rgba(10,10,26,.94); border:1px solid #4a6ab0; border-radius:4px; color:#dfe6ff; font:600 11px/1.5 'Courier New',monospace; letter-spacing:.4px; padding:5px 14px; opacity:0; pointer-events:none; transition:all .25s ease; white-space:nowrap; box-shadow:0 4px 14px rgba(0,0,0,.6); }
    .cc-cmd.on{opacity:1;transform:translateX(-50%) scale(1);} .cc-cmd .cg{color:#6ff0c0;} .cc-cmd .cc{color:#e6b95a;} .cc-cmd .cn{color:#ff9a5a;}
    .cc-cmd .cc-anchor{pointer-events:auto;cursor:pointer;margin-left:8px;padding:1px 8px;border:1px solid #4a6ab0;border-radius:3px;color:#dfe6ff;background:rgba(74,106,176,.2);} .cc-cmd .cc-anchor:hover{background:rgba(74,106,176,.45);}
    .cc-ord-body{transform:translateX(-172px);opacity:0;transition:transform .42s cubic-bezier(.3,1.1,.4,1),opacity .3s ease;} .cc-ord.open .cc-ord-body{transform:translateX(6px);opacity:1;}
    .cc-ord-pin{cursor:help;} .cc-ord-pin:hover path{filter:brightness(1.3);}
    .cc-legend{position:absolute;left:10px;bottom:10px;z-index:12;}
    .cc-legkey{cursor:pointer;font-family:'Courier New',monospace;font-size:.5rem;letter-spacing:2px;color:#dfe6ff;background:linear-gradient(#1a2440,#0e1626);border:1.5px solid #4a6ab0;border-radius:4px;padding:3px 10px;box-shadow:0 2px 5px rgba(0,0,0,.5);}
    .cc-legkey:hover{background:linear-gradient(#22305a,#141e34);}
    .cc-legbody{position:absolute;left:0;bottom:26px;width:238px;max-height:74vh;overflow:auto;padding:8px 10px;border-radius:6px;background:linear-gradient(#101833,#0a0f1e);border:1.5px solid #4a6ab0;box-shadow:0 8px 22px rgba(0,0,0,.7);opacity:0;transform:translateY(8px) scale(.97);transform-origin:bottom left;pointer-events:none;transition:all .2s ease;}
    .cc-legend.open .cc-legbody{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}
    .cc-leghead{font-size:.54rem;letter-spacing:2px;color:#8fb0ff;text-align:center;padding-bottom:5px;margin-bottom:5px;border-bottom:1px solid rgba(74,106,176,.4);}
    .cc-lrow{display:flex;align-items:center;gap:7px;padding:2px 0;font-size:.48rem;letter-spacing:.3px;color:#c6d2ee;} .cc-lrow svg{width:20px;height:20px;flex:none;}
    .cc-legobj{margin-top:6px;padding-top:5px;border-top:1px solid rgba(74,106,176,.35);font-size:.46rem;line-height:1.55;color:#c6d2ee;} .cc-legobj b{color:#8fb0ff;letter-spacing:1.5px;}
    .cc-legfoot{margin-top:5px;padding-top:4px;border-top:1px solid rgba(74,106,176,.3);font-size:.42rem;font-style:italic;color:#7f9ad0;text-align:center;}
    .cc-tip{position:absolute;left:0;top:0;pointer-events:none;max-width:230px;background:linear-gradient(#101833,#0a0f1e);color:#dfe6ff;z-index:20;border:1px solid #4a6ab0;border-left:3px solid #8fb0ff;padding:6px 9px;font:11px/1.5 'Courier New',monospace;letter-spacing:.3px;box-shadow:3px 4px 12px rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .12s ease;}
    .cc-tip.on{opacity:1;} .cc-tip.wide{max-width:420px;}
    .cc-tiles{display:flex;gap:6px;margin-top:5px;}
    .cc-tile{flex:1 1 0;min-width:86px;max-width:110px;background:#0d1424;border:1px solid #3a5480;border-radius:4px;padding:6px 7px;font-size:.5rem;line-height:1.35;}
    .cc-tn{font-weight:bold;font-size:.56rem;color:#eaf0ff;} .cc-tk{font-style:italic;opacity:.7;margin:1px 0 3px;} .cc-td{opacity:.85;max-height:52px;overflow:hidden;} .cc-tc{margin-top:4px;color:#e6b95a;font-weight:bold;letter-spacing:.5px;}
    #timeline-rail.cc-shake { animation: ccshake .1s linear 7; }
    @keyframes ccshake { 0%,100%{transform:translate(0,0);} 25%{transform:translate(2px,-2px);} 50%{transform:translate(-3px,1px);} 75%{transform:translate(2px,3px);} }
    @media (prefers-reduced-motion:reduce){ .cc-tw,.cc-neb,.cc-rock,.cc-ovdlamp,.cc-sec-ring,.cc-sec-core,.cc-bh-disk,.cc-bh-glow,.cc-drift-flow,.cc-drift-glow,.cc-sun-rays,.cc-sun-ring,.cc-sun text,.cc-lit,.cc-beam,.cc-bob,.cc-rift,.cc-glow{animation:none;} }
  `; }

  /* ═══ COSMIC SOUNDSCAPE (installed onto window.__audio) ═══ */
  function installStarscape(A){
    if(A.setStarscape) return;
    A.setStarscape=function(on){
      try{
        if(on===this._starOn) return; this._starOn=on;
        const ctx=this.ctx||this.context||(this._ctx); const C=this.ctx||this.context;
        if(!C){ this._starWant=on; return; }
        if(on){
          if(this.setSeascape && this._seaOn) { /* ensure gulls are gone */ }
          const master=this.master||this.masterGain||C.destination;
          if(!this.starBus){ this.starBus=C.createGain(); this.starBus.gain.value=0; this.starBus.connect(master); }
          this.starBus.gain.cancelScheduledValues(C.currentTime); this.starBus.gain.setValueAtTime(this.starBus.gain.value,C.currentTime); this.starBus.gain.linearRampToValueAtTime(0.6,C.currentTime+1.2);
          // duck music + sfx like the seascape does
          if(this.musicBus) this.musicBus.gain.setTargetAtTime(0.0001,C.currentTime,0.5);
          if(this.sfxBus) this.sfxBus.gain.setTargetAtTime((this.vol&&this.vol.sfx?this.vol.sfx:0.6)*0.28,C.currentTime,0.5);
          this._starNodes=[];
          // 1) deep void drone, two detuned low sines + a sub
          [55,55.4,27.5].forEach((f,i)=>{ const o=C.createOscillator(); o.type=i===2?"sine":"triangle"; o.frequency.value=f; const g=C.createGain(); g.gain.value=i===2?0.14:0.08; o.connect(g); g.connect(this.starBus); o.start(); this._starNodes.push(o,g); });
          // 2) a slow choral pad (stacked sines, gently detuned, tremolo)
          [220,277,330].forEach((f,i)=>{ const o=C.createOscillator(); o.type="sine"; o.frequency.value=f; const g=C.createGain(); g.gain.value=0.03; const lfo=C.createOscillator(); lfo.frequency.value=0.07+i*0.02; const lg=C.createGain(); lg.gain.value=0.02; lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(this.starBus); o.start(); lfo.start(); this._starNodes.push(o,g,lfo,lg); });
          // 3) filtered noise wind (the void hiss)
          const nb=C.createBuffer(1,C.sampleRate*2,C.sampleRate); const dat=nb.getChannelData(0); for(let i=0;i<dat.length;i++) dat[i]=(Math.random()*2-1)*0.5; const ns=C.createBufferSource(); ns.buffer=nb; ns.loop=true; const nf=C.createBiquadFilter(); nf.type="bandpass"; nf.frequency.value=600; nf.Q.value=0.7; const ng=C.createGain(); ng.gain.value=0.05; ns.connect(nf); nf.connect(ng); ng.connect(this.starBus); ns.start(); this._starNodes.push(ns,nf,ng);
          // 4) scheduled sonar pings + capacitor whines (life)
          const self=this; const ping=()=>{ if(!self._starOn) return; const t=C.currentTime; const o=C.createOscillator(); o.type="sine"; o.frequency.value=[880,1320,660,990][Math.floor(Math.random()*4)]; const g=C.createGain(); g.gain.value=0; o.connect(g); g.connect(self.starBus); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.05,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+1.6); o.start(t); o.stop(t+1.7); self._starPing=setTimeout(ping,2600+Math.random()*4200); };
          this._starPing=setTimeout(ping,1500);
          // 5) occasional deep metallic groan (the machine straining)
          const groan=()=>{ if(!self._starOn) return; const t=C.currentTime; const o=C.createOscillator(); o.type="sawtooth"; o.frequency.setValueAtTime(70,t); o.frequency.exponentialRampToValueAtTime(48,t+2.4); const f=C.createBiquadFilter(); f.type="lowpass"; f.frequency.value=280; const g=C.createGain(); g.gain.value=0; o.connect(f); f.connect(g); g.connect(self.starBus); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.06,t+0.6); g.gain.exponentialRampToValueAtTime(0.0001,t+2.6); o.start(t); o.stop(t+2.7); self._starGroan=setTimeout(groan,9000+Math.random()*11000); };
          this._starGroan=setTimeout(groan,6000);
          // 6) THE COSMIC THEME, a slow chord progression (a real soundtrack, not just drone) + a sparse celeste motif
          const chords=[[130.81,196.00,246.94],[146.83,220.00,277.18],[123.47,185.00,233.08],[164.81,196.00,261.63]];
          const cv=[0,1,2].map(()=>{ const o=C.createOscillator(); o.type="sine"; const flt=C.createBiquadFilter(); flt.type="lowpass"; flt.frequency.value=1300; const g=C.createGain(); g.gain.value=0.032; o.connect(flt); flt.connect(g); g.connect(self.starBus); o.start(); self._starNodes.push(o,flt,g); return o; });
          let ci=0; const chordStep=()=>{ if(!self._starOn) return; const ch=chords[ci%chords.length], t2=C.currentTime; cv.forEach((o,vi)=>o.frequency.setTargetAtTime(ch[vi],t2,0.9)); ci++; self._starChord=setTimeout(chordStep,7200); };
          chordStep();
          const cel=[523.25,587.33,659.25,783.99,880.0,1046.5];
          const motif=()=>{ if(!self._starOn) return; const base=C.currentTime, nn=2+Math.floor(Math.random()*3); for(let i=0;i<nn;i++){ const fr=cel[Math.floor(Math.random()*cel.length)], st=base+i*0.44, o=C.createOscillator(); o.type="triangle"; o.frequency.value=fr; const g=C.createGain(); g.gain.value=0; o.connect(g); g.connect(self.starBus); g.gain.setValueAtTime(0,st); g.gain.linearRampToValueAtTime(0.03,st+0.03); g.gain.exponentialRampToValueAtTime(0.0001,st+1.5); o.start(st); o.stop(st+1.6); } self._starMotif=setTimeout(motif,11000+Math.random()*9000); };
          self._starMotif=setTimeout(motif,3500);
        } else {
          clearTimeout(this._starPing); clearTimeout(this._starGroan); clearTimeout(this._starChord); clearTimeout(this._starMotif);
          if(this.starBus && C){ this.starBus.gain.cancelScheduledValues(C.currentTime); this.starBus.gain.setValueAtTime(this.starBus.gain.value,C.currentTime); this.starBus.gain.linearRampToValueAtTime(0.0001,C.currentTime+0.8); }
          const nodes=this._starNodes||[]; setTimeout(()=>{ nodes.forEach(n=>{ try{ n.stop&&n.stop(); n.disconnect&&n.disconnect(); }catch(e){} }); },900); this._starNodes=[];
          // restore music/sfx only if the seascape isn't taking over
          if(C){ if(this.musicBus && !this._seaOn) this.musicBus.gain.setTargetAtTime((this.vol&&this.vol.music?this.vol.music:0.5),C.currentTime,0.6); if(this.sfxBus && !this._seaOn) this.sfxBus.gain.setTargetAtTime((this.vol&&this.vol.sfx?this.vol.sfx:0.6),C.currentTime,0.6); }
        }
      }catch(e){}
    };
    if(A._starWant){ const w=A._starWant; A._starWant=false; A.setStarscape(w); }
  }
})();
