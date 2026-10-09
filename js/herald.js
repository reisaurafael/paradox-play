import{cardArt}from"./card-art.js?202610091957";let SERIAL=0;const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]),PERIOD=c=>c<=10?"ORIGINS":c<=19?"ASCENSION":"SINGULARITY";export const heraldPeriod=PERIOD;export function heraldRelicSrc(name){const id=cardArt(name);return id?`assets/cards/${id}@2x.webp`:""}const PRESS={delivered:[{head:"The Bureau gets one right",deck:"{A} brings {R} home. Century {C} sits up straight.",p1:"Sources on the quay confirm the relic was handed over without ceremony, which is more ceremony than the Bureau usually manages.",p2:"The century, long tilted, sat up straight at once. {W} centuries now hold. {L} still wait, and so do we."},{head:"One less hole in time",deck:"{A} returns {R} to Century {C}. The rulebook, for once, followed to the letter.",p1:"Nobody thanked the traveller; nobody ever does. The relic slid into its hour like a key into a lock, and the lock, for once, turned.",p2:"This paper counts {W} centuries whole tonight. The other {L} are waiting on someone with a steady hand."}],milestone:[{head:"{A} reaches Century {C}",deck:"Ends the hour beside the stone and claims the milestone. One point on the books.",p1:"The old road keeps two stones, at ten and at twenty, and the rulebook pays whoever ends an hour beside one.",p2:"The Merchant, who reads the papers too, has already packed his stall for another century."},{head:"A point at the {C} stone",deck:"{A} plants a pennant at Century {C}. The ledger moves, and so does the Merchant.",p1:"No crowd, no band, just a carved stone and a traveller standing by it long enough to count.",p2:"Each stone pays a traveller only once. Latecomers are advised to bring their own pennant."}],wanted:[{head:"A price on {A}",deck:"The Secret Market wants this one brought in. {G} gold, in any century, no questions.",p1:"Bills went up on every quay before the tide turned. The folk behind the door with eyes keep one law: travellers ride together.",p2:"Shoot your own and you are a bandit among bandits. This paper takes no side and no cut."},{head:"Wanted: {A}",deck:"{G} gold on one traveller's head, posted by the people behind the door with eyes.",p1:"The bill names one crime only: an agent sunk by an agent. Out here, that is the one that counts.",p2:"Collectors may claim the purse in any century. The accused has read the same bills, and sails faster."}],crime:[{head:"Agent sinks agent",deck:"{K} sends {V} to the bottom off Century {C}. So much for the rulebook.",p1:"The Bureau's own manual forbids it in chapter one. The sea did not read chapter one. Witnesses report a paradox fired at close range.",p2:"The cargo is lost; the motive is not. Readers in the Secret Market's employ are taking notes."},{head:"Murder on the timeline",deck:"{V} is sunk near Century {C}. Every clue points to {K}.",p1:"One ship fired, one ship went down, and the water closed over it before the echo. The Herald was there, as the Herald always is.",p2:"The rulebook calls it a termination. This paper calls it what it looks like."}],obituary:[{head:"{A} is dead",deck:"Died at Century {C}. Sailed alone, as the rulebook advises against.",p1:"No grave holds what no year remembers, so this paper will. No service will be held.",p2:"Those who knew the deceased are reminded that the feeling will pass, along with the knowing."},{head:"{A} is dead",deck:"Lost near Century {C}, with no one else to blame.",p1:"The engine ran too hot, or the sea ran too deep; the file does not say which, and the Herald does not guess.",p2:"The traveller will be back, they always are. This notice stands for the one who sailed today."}],cove:[{head:"The door with eyes is open",deck:"{A} found the way in. Anyone who reaches Century XI may knock.",p1:"No sign, no number, just a slot and someone behind it. Those who knock are looked over; those who pass find wares that time misplaced on purpose.",p2:"The people behind the door have one law: travellers stand together. This paper condemns the place entirely and will be there by eight."},{head:"Knock twice at Century XI",deck:"{A} found the door with eyes, and the door let them in.",p1:"Officially there is no market in Century XI. Officially, this paper never said otherwise.",p2:"What they sell has no stamp and no history. What they ask is that you never sink your own."}]},FINAL={year_zero:{head:"{A} reaches Year Zero",deck:"The first second of time, crossed: the match is won. {W} of 30 centuries stand whole."},full_receptor:{head:"The last timeline holds",deck:"{A} restored the most centuries and wins. {W} of 30 stand whole again."},last_traveler:{head:"{A} is the last one sailing",deck:"Every other traveller went under. The win comes with {W} of 30 centuries whole."},merchant_empty:{head:"Nothing left to save",deck:"The Merchant's shelf is bare. {A} saved the most and wins."},points:{head:"{A} closes the case",deck:"The win is on the books. {W} of 30 centuries stand whole."},none:{head:"No one closes the case",deck:"Every traveller went under. The timeline waits for the next crew."},p1:"When the bell struck twelve the ledgers closed, and for once they agreed. Every century restored is a relic carried home; every gap, one that never made it.",p2:"The rest of the Bureau is advised to read the manual again, slowly. The Herald will be here for the next timeline, if there is one."},EARS={delivered:["Clearing, stars steady","TIMELINE","{W} of 30 whole"],milestone:["Dry on the old road","MERCHANT","Moves on"],wanted:["Dust on the quays","BOUNTY","{G} gold, posted"],crime:["Paradox squalls","WARNING","Agents armed"],obituary:["Fair, a soft wind","FILED","by no one else"],cove:["Moonless","WHERE","Century XI"],special:["Settling","FINAL","Hour {H}"]},EDITION={delivered:"★ VICTORY EDITION ★",milestone:"★ MILESTONE EXTRA ★",wanted:"★ MANHUNT EDITION ★",crime:"★ CRIME EXTRA ★",obituary:"✦ MEMORIAL EDITION ✦",cove:"☾ NIGHT EDITION ☾",special:"★★ SPECIAL EDITION ★★"},KICK={delivered:"RELIC RETURNED",milestone:"MILESTONE · CENTURY {C}",wanted:"BOUNTY POSTED",crime:"FOUL PLAY ON THE TIMELINE",obituary:"DIED AT CENTURY {C}",cove:"THE SECRET MARKET",special:"TIME SETTLES"};function inkFilters(){if(document.getElementById("hz-inks"))return;const d=document.createElement("div");d.id="hz-inks",d.setAttribute("aria-hidden","true"),d.innerHTML=`<svg width="0" height="0" style="position:absolute"><defs>
    <filter id="sk-duo-red" color-interpolation-filters="sRGB"><feColorMatrix values=".19 0 0 0 .81  0 .84 0 0 .113  0 0 .67 0 .094  0 0 0 1 0"/></filter>
    <filter id="sk-duo-gold" color-interpolation-filters="sRGB"><feColorMatrix values=".52 0 0 0 .36  0 .46 0 0 .235  0 0 .2 0 .047  0 0 0 1 0"/></filter></defs></svg>`,(document.body||document.documentElement).appendChild(d)}export function heraldEdition(d){try{inkFilters()}catch{}const U="h"+ ++SERIAL,P0={name:"",col:"#8a7a5a"},SEAT={you:(d.you||P0).col,rival:(d.rival||P0).col,victim:(d.victim||P0).col},NAME_YOU=esc(String((d.you||P0).name).toUpperCase()),NAME_RIVAL=esc(String((d.rival||P0).name).toUpperCase()),NAME_VICTIM=esc(String((d.victim||P0).name).toUpperCase()),RELIC_IMG=d.relicSrc||"",RELIC_NAME=esc(String(d.relicName||"").toUpperCase()),DEATH_CENT=esc(d.cent||""),MILE=d.cent==="X"?"X":"XX",MILE_FAR=MILE==="XX"?"X":"XX",REWARD=d.reward??4,CENT=esc(d.cent||""),NM=(p,size)=>p?`<span class="hz-nm" style="color:${p.col}${size?`;font-size:${size}px`:""}">${esc(String(p.name).toUpperCase())}</span>`:"the traveller",DEFS=`
  
  <symbol id="mark-${U}" viewBox="0 0 30 40"><path d="M3 2h24M3 38h24" stroke="#16100a" stroke-width="3"/><path d="M5 3c0 11 8 13 8 17s-8 6-8 17h20c0-11-8-13-8-17s8-6 8-17Z" fill="#efe5cb" stroke="#16100a" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M8 11q7-6 14 0q-7 6-14 0Z" fill="#fff" stroke="#16100a" stroke-width="1.8"/><circle cx="15" cy="11" r="2.6" fill="#16100a"/><path d="M9 35q6-6 12 0Z" fill="#16100a"/></symbol>
  
  <pattern id="ht-${U}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.25" fill="#16100a"/></pattern>
  <pattern id="htL-${U}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r=".8" fill="#16100a"/></pattern>
  <pattern id="htW-${U}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1" fill="#f4ecd6"/></pattern>
  <pattern id="hatch-${U}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)"><path d="M0 3h6" stroke="#16100a" stroke-width="1.3"/></pattern>
  <linearGradient id="fadeR-${U}" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
  <mask id="mFadeR-${U}"><rect width="100%" height="100%" fill="url(#fadeR-${U})"/></mask>
  <filter id="rough-${U}" x="-30%" y="-40%" width="160%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>
  <filter id="chalk-${U}" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="3" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out" result="o"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="o" in2="n" scale="3.2" result="r"/><feFlood flood-color="#f2eee4"/><feComposite in2="r" operator="in"/></filter>
`,FIT=(s,per,max)=>String(s).length*per>max?` textLength="${max}" lengthAdjust="spacingAndGlyphs"`:"",FEDORA=(c,lit=1)=>`<g stroke-linejoin="round" stroke-linecap="round">
  <path d="M-40 4C-41-7 41-7 40 4C39 17-39 17-40 4Z" fill="${c}" stroke="#16100a" stroke-width="2.6"/>
  <path d="M-38 7C-30 15 30 15 38 7C34 16-34 16-38 7Z" fill="#16100a" opacity=".4"/>
  <path d="M-22 4C-24-10-22-24-14-30C-8-33-3-28 0-24C3-28 8-33 14-30C22-24 24-10 22 4C8 9-8 9-22 4Z" fill="${c}" stroke="#16100a" stroke-width="2.6"/>
  <g transform="scale(${lit} 1)">
   <path d="M6-27C12-31 18-28 19-20L20-4C16-2 13-1 10 0C12-10 10-20 6-27Z" fill="#fff" opacity=".26"/>
   <path d="M-14-29C-21-24-22-10-21 0L-14 2C-16-8-16-20-14-29Z" fill="url(#ht-${U})" opacity=".55"/>
   <path d="M-40 4C-40 14-12 16 4 15" fill="none" stroke="#16100a" stroke-width="4.2"/>
   <path d="M-14-30C-22-24-24-10-22 4" fill="none" stroke="#16100a" stroke-width="4"/>
   <path d="M18-1C26-2 32-3 35 1" fill="none" stroke="#fff" stroke-width="2" opacity=".45"/></g>
  <path d="M-22-3C-8 2 8 2 22-3L22 4C8 9-8 9-22 4Z" fill="#16100a"/>
  <path d="M-18 1l-8-6l1 10Z" fill="#16100a"/>
  <path d="M-8-25C-6-18-6-12-8-6M8-25C6-18 6-12 8-6" fill="none" stroke="#16100a" stroke-width="1.6"/>
  <path d="M-3-26C-1-22 1-22 3-26" fill="none" stroke="#16100a" stroke-width="1.4"/></g>`,RN=(a,b=0)=>{const v=Math.sin(a*12.9898+b*78.233)*43758.5453;return v-Math.floor(v)},ART_V=()=>`<svg class="art" viewBox="0 0 508 312">
  <rect width="508" height="312" fill="#f0c95c"/>
  <g>${Array.from({length:28},(_,i)=>{const a=i*Math.PI/14,x=254+Math.cos(a)*600,y=210+Math.sin(a)*600,x2=254+Math.cos(a+.11)*600,y2=210+Math.sin(a+.11)*600;return`<path d="M254 210L${x.toFixed(0)} ${y.toFixed(0)}L${x2.toFixed(0)} ${y2.toFixed(0)}Z" fill="#e2a733"/>`}).join("")}</g>
  <rect width="508" height="312" fill="url(#htL-${U})" opacity=".35"/>

  
  <path d="M0 290H508V312H0Z" fill="#6e4a28"/><path d="M0 290H508" stroke="#16100a" stroke-width="3.4"/><path d="M0 284H508V290H0Z" fill="#3a2a18"/>
  <g stroke="#3a2a18" stroke-width="2">${Array.from({length:12},(_,i)=>`<path d="M${i*48-10} 290L${i*48-40} 312"/>`).join("")}</g><path d="M0 296H508" stroke="#9a6c3c" stroke-width="1.4"/>
  
  <path d="M236 -4H334L404 270H160Z" fill="#fff4d6" opacity=".26"/><path d="M236 -4L160 270M334 -4L404 270" stroke="#fff4d6" stroke-width="2" opacity=".6"/>
  
  <path d="M384 290L490 290L456 306L370 306Z" fill="#2a1d10" opacity=".7"/>
  <path d="M184 284H382V312H184Z" fill="#e7e1d2" stroke="#16100a" stroke-width="3"/>
  <path d="M206 292q20 6 30 0t26 10M300 288q-6 10 8 16t10 8M232 312q10-8 24-6" fill="none" stroke="#9c9486" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M352 284H382V312H352Z" fill="url(#ht-${U})" opacity=".55"/><path d="M382 284V312" stroke="#16100a" stroke-width="5"/><path d="M190 286V310" stroke="#fffaf0" stroke-width="2.4"/>
  <path d="M164 274H404L394 284H174Z" fill="#cfc7b4" stroke="#16100a" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M152 262H414V274H152Z" fill="#efe9da" stroke="#16100a" stroke-width="3"/><path d="M154 264H412" stroke="#fffaf0" stroke-width="2"/>
  <path d="M384 262H414V274H384Z" fill="url(#ht-${U})" opacity=".5"/><path d="M414 262V274L404 284" fill="none" stroke="#16100a" stroke-width="4.6" stroke-linejoin="round"/>
  
  <g transform="translate(26 0) rotate(-2.5 254 140)">
    <rect x="152" y="10" width="204" height="262" fill="#16100a" transform="translate(8 9)"/>
    <rect x="152" y="10" width="204" height="262" fill="#d9a43a"/>
    <path d="M152 10H356L344 22H164V260L152 272Z" fill="#f0c95c"/><path d="M356 10V272H152L164 260H344V22Z" fill="#9c6b1c"/>
    <path d="M152 10L164 22M356 10L344 22M152 272L164 260M356 272L344 260" stroke="#6b4512" stroke-width="1.4"/>
    <rect x="157.5" y="15.5" width="193" height="251" fill="none" stroke="#6b4512" stroke-width="1.2"/>
    <path d="M155 14H300" stroke="#fff3c2" stroke-width="2" stroke-linecap="round"/>
    <g fill="#16100a">${[[158,16],[350,16],[158,266],[350,266]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.2" fill="#f0c95c" stroke="#16100a" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="1.4"/>`).join("")}</g>
    <path d="M356 10V272H152" fill="none" stroke="#16100a" stroke-width="5" stroke-linejoin="round"/><rect x="152" y="10" width="204" height="262" fill="none" stroke="#16100a" stroke-width="2.6"/>
    <rect x="164" y="22" width="180" height="238" fill="#f8f0da" stroke="#16100a" stroke-width="2.2"/>
    <path d="M164 22H344L338 28H170V254L164 260Z" fill="#d8ccac"/>
    <image href="${RELIC_IMG}" x="170" y="28" width="168" height="206" preserveAspectRatio="xMidYMid slice" style="filter:contrast(1.12) saturate(.9)"/>
    <rect x="170" y="28" width="168" height="206" fill="none" stroke="#16100a" stroke-width="2.5"/>
    <rect x="170" y="28" width="168" height="206" fill="url(#htL-${U})" opacity=".18"/>
    <rect x="186" y="240" width="136" height="16" fill="#e2b85a" stroke="#16100a" stroke-width="2"/><path d="M187 241H321" stroke="#fff0b8" stroke-width="1.4"/><path d="M322 241V256H187" fill="none" stroke="#8a5e1a" stroke-width="1.4"/>
    <circle cx="191" cy="248" r="1.4" fill="#16100a"/><circle cx="317" cy="248" r="1.4" fill="#16100a"/>
    <text x="254" y="251.4" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="8" letter-spacing="1.2" fill="#16100a"${FIT(RELIC_NAME,6.1,118)}>${RELIC_NAME}</text>
  </g>
  
  ${(()=>{const r=CENT,w=Math.min(r.length*58,250);return`<g transform="translate(12 298) rotate(-6)"><text font-family="pdx-pulp, Oswald" font-size="128" textLength="${w}" lengthAdjust="spacingAndGlyphs" fill="#16100a" transform="translate(7 7)">${r}</text>
   <text font-family="pdx-pulp, Oswald" font-size="128" textLength="${w}" lengthAdjust="spacingAndGlyphs" fill="#fff4d6" stroke="#16100a" stroke-width="5" paint-order="stroke fill">${r}</text></g>`})()}
  
  <g transform="translate(418 82) rotate(16)" filter="url(#rough-${U})">
    <circle r="56" fill="none" stroke="#b3262a" stroke-width="5"/><circle r="47" fill="none" stroke="#b3262a" stroke-width="1.6"/>
    <text y="-24" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="8" letter-spacing="1.5" fill="#b3262a">IN ITS HOUR</text>
    <rect x="-62" y="-14" width="124" height="28" fill="#b3262a"/><text y="9" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="25" letter-spacing="2" fill="#f6e3b6">RESTORED</text>
    <text y="34" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="9" letter-spacing="2" fill="#b3262a">· BY HERALD ·</text></g>
</svg>`,C_PLANKS=(tones,grain,seam,lit)=>{const ex=(k2,y)=>{const a=254+(k2-7)*26,b=254+(k2-7)*92;return a+(b-a)*y/312};let s="";for(let k2=-4;k2<18;k2++){const t=tones[(k2+8)%tones.length];s+=`<path d="M${ex(k2,0).toFixed(1)} 0L${ex(k2+1,0).toFixed(1)} 0L${ex(k2+1,312).toFixed(1)} 312L${ex(k2,312).toFixed(1)} 312Z" fill="${t}"/>`;for(const f of[.34,.72]){let d2="";for(let y=0;y<=312;y+=12){const w=f+.07*Math.sin(y/31+k2*1.7+f*9),x=ex(k2,y)+(ex(k2+1,y)-ex(k2,y))*w;d2+=`${d2?"L":"M"}${x.toFixed(1)} ${y}`}s+=`<path d="${d2}" fill="none" stroke="${grain}" stroke-width="${(1+f).toFixed(1)}"/>`}const ky=30+RN(k2,1)*250,kx=ex(k2,ky)+(ex(k2+1,ky)-ex(k2,ky))*(.35+RN(k2,2)*.3),kw=(ex(k2+1,ky)-ex(k2,ky))*.14;s+=`<path d="M${kx.toFixed(1)} ${(ky-9-kw).toFixed(1)}Q${(kx+kw*1.3).toFixed(1)} ${ky.toFixed(1)} ${kx.toFixed(1)} ${(ky+9+kw).toFixed(1)}Q${(kx-kw*1.3).toFixed(1)} ${ky.toFixed(1)} ${kx.toFixed(1)} ${(ky-9-kw).toFixed(1)}Z" fill="none" stroke="${grain}" stroke-width="1.8"/><ellipse cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" rx="${(kw*.32).toFixed(1)}" ry="${(3+kw*.3).toFixed(1)}" fill="${grain}"/>`;const jy=40+(k2+4)*83%230,jl=ex(k2,jy),jr=ex(k2+1,jy),nr=Math.max(1.1,(jr-jl)*.045);s+=`<path d="M${jl.toFixed(1)} ${jy}L${jr.toFixed(1)} ${jy}" stroke="${seam}" stroke-width="2.6"/>`;for(const f of[.22,.78])for(const dy of[-5,5]){const x=jl+(jr-jl)*f;s+=`<circle cx="${x.toFixed(1)}" cy="${jy+dy}" r="${nr.toFixed(1)}" fill="${seam}"/>${lit?`<circle cx="${(x-nr*.35).toFixed(1)}" cy="${(jy+dy-nr*.35).toFixed(1)}" r="${(nr*.4).toFixed(1)}" fill="${lit}"/>`:""}`}}for(let k2=-4;k2<19;k2++)s+=`<path d="M${ex(k2,0).toFixed(1)} 0L${ex(k2,312).toFixed(1)} 312" stroke="${seam}" stroke-width="3.2"/>${lit?`<path d="M${(ex(k2,0)+2).toFixed(1)} 0L${(ex(k2,312)+3.5).toFixed(1)} 312" stroke="${lit}" stroke-width="1.2" opacity=".7"/>`:""}`;return s},C_GUN=`<path d="M-30 2C-34 14-40 24-38 35L-24 37C-24 26-18 14-14 6Z"/><path d="M-34-10L-14-12L-14 6L-30 6C-34 2-36-4-34-10Z"/><path d="M-32-9L-41-18C-43-21-39-23-36-21L-27-12Z"/>
  <rect x="-16" y="-14" width="25" height="19" rx="3"/><path d="M8-12H58V-4H8Z"/><path d="M8-4H45V0H8Z"/><path d="M53-12l2-5h3l1 5Z"/>`,ART_C=()=>`<svg class="art" viewBox="0 0 508 312">
  <defs><clipPath id="cPoolMid-${U}"><ellipse cx="236" cy="168" rx="200" ry="120"/></clipPath><clipPath id="cPoolCore-${U}"><ellipse cx="236" cy="168" rx="150" ry="88"/></clipPath></defs>
  <rect width="508" height="312" fill="#14111a"/>
  
  <g>${C_PLANKS(["#1b1721","#1f1a26","#18141d"],"#0e0c13","#06050a","")}</g>
  <g clip-path="url(#cPoolMid-${U})">${C_PLANKS(["#3a3346","#3f3749","#36303f"],"#2a2433","#17131c","")}</g>
  <g clip-path="url(#cPoolCore-${U})">${C_PLANKS(["#4f475e","#554c64","#4a4257"],"#3b3448","#1f1a26","#6b6180")}</g>
  
  <ellipse cx="236" cy="168" rx="232" ry="140" fill="none" stroke="url(#ht-${U})" stroke-width="40" opacity=".55"/>
  <ellipse cx="236" cy="168" rx="176" ry="104" fill="none" stroke="url(#ht-${U})" stroke-width="16" opacity=".35"/>
  
  <path d="M282 44L322 46L396 196Q236 252 88 186Z" fill="url(#htW-${U})" opacity=".16"/>
  
  <g filter="url(#chalk-${U})" transform="rotate(-6 236 168)"><circle cx="150" cy="128" r="21"/>
   <g stroke="#000" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M172 136L250 156" stroke-width="40"/><path d="M182 124L208 86L240 66" stroke-width="14"/><path d="M190 150L184 194L204 222" stroke-width="14"/>
    <path d="M250 146L306 120L350 130" stroke-width="16"/><path d="M250 166L300 200L324 246" stroke-width="16"/></g></g>
  
  <g transform="translate(424 112) rotate(22)"><path d="M-17-22H17V22H-17Z" fill="#06050a" transform="translate(4 4)"/><path d="M-17-22H11L17-16V22H-17Z" fill="#b8afbf" stroke="#16100a" stroke-width="2.2" stroke-linejoin="round"/><path d="M11-22V-16H17Z" fill="#7d748a" stroke="#16100a" stroke-width="1.6" stroke-linejoin="round"/>
   <path d="M-12-12h18M-12-6h22M-12 0h16M-12 6h22M-12 12h12" stroke="#4c445a" stroke-width="1.6"/><path d="M4 22H17V8Z" fill="url(#ht-${U})" opacity=".45"/></g>
  <g transform="translate(58 154) rotate(-28)"><path d="M-15-19H15V19H-15Z" fill="#06050a" transform="translate(-3 4)"/><path d="M-15-19H15V19H-15Z" fill="#6c6578" stroke="#16100a" stroke-width="2.2"/>
   <path d="M-10-10h20M-10-4h16M-10 2h20M-10 8h12" stroke="#2f2a3a" stroke-width="1.6"/><path d="M-15 0H15V19H-15Z" fill="url(#ht-${U})" opacity=".6"/></g>
  
  <g transform="translate(98 214) rotate(-18)"><ellipse cx="-6" cy="12" rx="42" ry="11" fill="#06050a" opacity=".8"/>${FEDORA(SEAT.victim,1)}</g>
  
  ${[[292,96,1],[364,196,2],[140,70,3]].map(([x,y,n])=>{const sx=(x-300)*.06;return`<g transform="translate(${x} ${y})"><path d="M-14 22L14 22L${(14+sx).toFixed(1)} 30L${(-14+sx).toFixed(1)} 30Z" fill="#06050a" opacity=".75"/><path d="M-14 22L-8 0H8L14 22Z" fill="#f2c230" stroke="#16100a" stroke-width="2.5" stroke-linejoin="round"/><path d="M2 0H8L14 22H8Z" fill="#b88d16"/><path d="M8 0L14 22H-14" fill="none" stroke="#16100a" stroke-width="3.6" stroke-linejoin="round"/><path d="M-11 19L-6 2" stroke="#fff3b0" stroke-width="1.6"/><text x="0" y="17" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="13" fill="#16100a">${n}</text></g>`}).join("")}
  
  ${[[296,262,-8],[314,274,12],[284,282,4],[330,258,-20]].map(([x,y,r])=>`<g transform="translate(${x} ${y}) rotate(${r})"><ellipse cx="2" cy="3" rx="7" ry="3.8" fill="#06050a" opacity=".8"/><ellipse cy="1.6" rx="6.6" ry="3.6" fill="#8a6420" stroke="#16100a" stroke-width="1.8"/><ellipse rx="6.6" ry="3.6" fill="#d9a43a" stroke="#16100a" stroke-width="1.8"/><ellipse rx="3.6" ry="1.8" fill="none" stroke="#8a6420" stroke-width="1.2"/><path d="M-4-1.6q2-1.4 5-1.4" stroke="#fbe7a0" stroke-width="1.2" fill="none"/></g>`).join("")}
  
  <g transform="translate(372 234) rotate(-14) scale(.95)">
   <g fill="#06050a" transform="translate(6 8)">${C_GUN}</g>
   <g fill="#4a4756" stroke="#16100a" stroke-width="2.4" stroke-linejoin="round">${C_GUN}</g>
   <path d="M-30 2C-34 14-40 24-38 35L-24 37C-24 26-18 14-14 6Z" fill="#6b4226" stroke="#16100a" stroke-width="2.4" stroke-linejoin="round"/>
   <path d="M-29 8C-32 16-35 24-34 31L-27 32C-27 24-23 16-20 10Z" fill="url(#hatch-${U})" opacity=".7"/><circle cx="-27" cy="18" r="2" fill="#d9a43a" stroke="#16100a" stroke-width="1.2"/>
   <path d="M-13-9h19M-13-2h19" stroke="#16100a" stroke-width="1.6"/><path d="M10-11H56V-9H10Z" fill="#a9a6b6"/><path d="M-12-13h8v3h-8Z" fill="#a9a6b6"/>
   <path d="M8-7H58V-4H8ZM-16 0H9V5H-16Z" fill="url(#ht-${U})" opacity=".55"/>
   <path d="M-14 6C-14 17-1 17 1 5" fill="none" stroke="#16100a" stroke-width="3"/><path d="M-6 5C-6 10-8 12-11 13" fill="none" stroke="#16100a" stroke-width="2.6" stroke-linecap="round"/>
   <path d="M8 0H45M-14 6H-30M-38 35L-24 37" fill="none" stroke="#16100a" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="-2" r="1.6" fill="#16100a"/>
   <path d="M61-9C72-16 62-26 71-34C80-42 70-50 78-58" fill="none" stroke="#16100a" stroke-width="8" stroke-linecap="round"/><path d="M61-9C72-16 62-26 71-34C80-42 70-50 78-58" fill="none" stroke="#b9b2c4" stroke-width="4" stroke-linecap="round"/></g>
  
  <g transform="rotate(-8 254 30)"><rect x="-20" y="14" width="560" height="26" fill="#f2c230" stroke="#16100a" stroke-width="3"/>
   <text x="-10" y="33" font-family="Oswald" font-weight="700" font-size="14" letter-spacing="2.5" fill="#16100a">HERALD LINE — DO NOT CROSS — HERALD LINE — DO NOT CROSS — HERALD LINE — DO NOT CROSS</text></g>
  
  <g transform="translate(300 2) rotate(7) scale(1.3)">
   <path d="M-22 4q-7 9-5 20M-31 2q-7 11-5 24" fill="none" stroke="#9d96a8" stroke-width="2" stroke-linecap="round"/>
   <path d="M0-12V12" stroke="#16100a" stroke-width="3"/><rect x="-5" y="9" width="10" height="7" fill="#2b2733" stroke="#16100a" stroke-width="2"/>
   <path d="M-6 15H6Q10 17 12 24L25 42Q0 50-25 42L-12 24Q-10 17-6 15Z" fill="#33503f" stroke="#16100a" stroke-width="2.5" stroke-linejoin="round"/>
   <path d="M-9 19L-19 40L-14 41L-5 20Z" fill="#7a9e83"/>
   <path d="M6 16L23 41Q16 44 11 45L4 18Z" fill="url(#ht-${U})" opacity=".7"/>
   <path d="M6 15Q10 17 12 24L25 42Q14 47 0 47" fill="none" stroke="#16100a" stroke-width="4" stroke-linejoin="round"/>
   <path d="M-25 42Q0 50 25 42Q0 56-25 42Z" fill="#f6e7a8" stroke="#16100a" stroke-width="2"/><path d="M-7 47q7 9 14 0" fill="#fffbe4" stroke="#16100a" stroke-width="1.6"/></g>
</svg>`,FLOWER=(x,y,c,r=7)=>{const k2=r/7;return`<g transform="translate(${x} ${y})">
  <path d="M0 0q${(-2*k2).toFixed(1)} ${(9*k2).toFixed(1)} ${(1*k2).toFixed(1)} ${(20*k2).toFixed(1)}" fill="none" stroke="#16100a" stroke-width="${(4.2*k2).toFixed(1)}" stroke-linecap="round"/><path d="M0 0q${(-2*k2).toFixed(1)} ${(9*k2).toFixed(1)} ${(1*k2).toFixed(1)} ${(20*k2).toFixed(1)}" fill="none" stroke="#3f7a2c" stroke-width="${(2*k2).toFixed(1)}" stroke-linecap="round"/>
  <path d="M0 ${(12*k2).toFixed(1)}q${(-9*k2).toFixed(1)} ${(-6*k2).toFixed(1)} ${(-12*k2).toFixed(1)} ${(-1*k2).toFixed(1)}q${(6*k2).toFixed(1)} ${(5*k2).toFixed(1)} ${(12*k2).toFixed(1)} ${(1*k2).toFixed(1)}Z" fill="#4f8f36" stroke="#16100a" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M${(1*k2).toFixed(1)} ${(16*k2).toFixed(1)}q${(8*k2).toFixed(1)} ${(-7*k2).toFixed(1)} ${(12*k2).toFixed(1)} ${(-3*k2).toFixed(1)}q${(-5*k2).toFixed(1)} ${(6*k2).toFixed(1)} ${(-12*k2).toFixed(1)} ${(3*k2).toFixed(1)}Z" fill="#3a6f28" stroke="#16100a" stroke-width="1.4" stroke-linejoin="round"/>
  ${Array.from({length:5},(_,i)=>{const a=i*72-90;return`<ellipse cx="0" cy="${(-r*.62).toFixed(1)}" rx="${(r*.42).toFixed(1)}" ry="${(r*.62).toFixed(1)}" transform="rotate(${a+90})" fill="${c}" stroke="#16100a" stroke-width="1.6"/>`}).join("")}
  <path d="M${(r*.2).toFixed(1)} ${(r*.3).toFixed(1)}a${(r*.9).toFixed(1)} ${(r*.9).toFixed(1)} 0 0 0 ${(r*.9).toFixed(1)} ${(-r*.6).toFixed(1)}l${(-r*.5).toFixed(1)} ${(r*.1).toFixed(1)}Z" fill="url(#ht-${U})" opacity=".5"/>
  <circle r="${(r*.36).toFixed(1)}" fill="#f2c230" stroke="#16100a" stroke-width="1.4"/><circle cx="${(-r*.1).toFixed(1)}" cy="${(-r*.1).toFixed(1)}" r="${(r*.12).toFixed(1)}" fill="#fff6c8"/></g>`},M_TUFT=(x,y,s,seed,dk="#2f5a24",hl="#8cc463")=>{let d2="",h="";const n=3+Math.floor(RN(seed,3)*3);for(let i=0;i<n;i++){const dx=(i-(n-1)/2)*3*s,lean=(RN(seed,i)-.5)*10*s,ht=(8+RN(seed,i+9)*8)*s,p=`M${(x+dx-1.6*s).toFixed(1)} ${y}Q${(x+dx+lean*.3).toFixed(1)} ${(y-ht*.6).toFixed(1)} ${(x+dx+lean).toFixed(1)} ${(y-ht).toFixed(1)}Q${(x+dx+lean*.3+1.2*s).toFixed(1)} ${(y-ht*.5).toFixed(1)} ${(x+dx+1.6*s).toFixed(1)} ${y}Z`;i===0?h+=p:d2+=p}return`<path d="${d2}" fill="${dk}"/><path d="${h}" fill="${hl}"/>`},ART_M=()=>`<svg class="art" viewBox="0 0 476 300">
  
  <rect width="476" height="300" fill="#bfd9d6"/><rect width="476" height="160" fill="url(#htL-${U})" opacity=".12"/>
  <circle cx="170" cy="34" r="20" fill="#f7f0d2" stroke="#16100a" stroke-width="2.4"/><path d="M158 24a17 17 0 0 1 18-5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M196 34h8M192 16l6-5M192 52l6 5" stroke="#16100a" stroke-width="2" stroke-linecap="round"/>
  <g stroke="#16100a" stroke-linejoin="round"><path d="M40 58q2-18 22-16q6-18 28-12q10-14 30-4q20-2 18 22q4 10-4 10h-90q-8-2-4-10Z" fill="#f4efe0" stroke-width="2.4"/><path d="M42 66q30 4 56-2q20 6 42 0q2 4-2 4h-94Z" fill="#d6d2c2" stroke="none"/><path d="M48 68h88" stroke-width="3.6"/>
   <path d="M330 40q4-16 22-12q8-16 28-6q16-4 20 14q12 4 4 14h-70q-10-2-4-10Z" fill="#f4efe0" stroke-width="2.4"/><path d="M330 52q34 4 72-2q2 4-2 4h-66Z" fill="#d6d2c2" stroke="none"/><path d="M334 54h66" stroke-width="3.4"/></g>
  <path d="M408 84q4-4 8 0q4-4 8 0M430 74q3-3 6 0q3-3 6 0" fill="none" stroke="#16100a" stroke-width="1.8" stroke-linecap="round"/>
  
  <path d="M0 150q90-40 180-14t160-20q80-14 136 18V300H0Z" fill="#8fbf68" stroke="#16100a" stroke-width="3"/>
  <g fill="#6fa04e" stroke="#16100a" stroke-width="2">${[[300,120,9],[316,118,11],[334,117,8],[420,120,10],[438,124,8],[180,134,7],[196,133,9]].map(([x,y,r])=>`<path d="M${x-r} ${y+2}a${r} ${r} 0 1 1 ${2*r} 0Z"/>`).join("")}</g>
  <path d="M0 150q90-40 180-14t160-20q80-14 136 18V180q-60-20-136 4q-90 26-180 0q-80-20-160 10Z" fill="url(#htL-${U})" opacity=".25"/>
  <path d="M60 166q50-10 100 2M300 150q50-10 120-2" fill="none" stroke="#6f9f50" stroke-width="2"/>
  <path d="M0 214q120-46 250-30t226 6V300H0Z" fill="#5f9a3e" stroke="#16100a" stroke-width="3"/>
  <path d="M0 262q120-14 240-6t236-4V300H0Z" fill="#518a34"/>
  <path d="M0 262q120-14 240-6t236-4" fill="none" stroke="url(#ht-${U})" stroke-width="10" opacity=".3"/>
  
  <g>${Array.from({length:23},(_,i)=>112+i*12).filter(x=>x<172||x>302).map(x=>`<path d="M${x} 202V168" stroke="#16100a" stroke-width="4.4"/><path d="M${x-.8} 201V169" stroke="#56535c" stroke-width="1.6"/><path d="M${x-4} 170L${x} 160L${x+4} 170Z" fill="#2b2a2e" stroke="#16100a" stroke-width="1.6" stroke-linejoin="round"/>`).join("")}
   <path d="M106 176H176M298 176H384M106 194H176M298 194H384" stroke="#16100a" stroke-width="4"/><path d="M106 175H176M298 175H384" stroke="#6a6770" stroke-width="1.2"/>
   <path d="M104 202V156M386 202V156" stroke="#16100a" stroke-width="7"/><circle cx="104" cy="154" r="5" fill="#2b2a2e" stroke="#16100a" stroke-width="2"/><circle cx="386" cy="154" r="5" fill="#2b2a2e" stroke="#16100a" stroke-width="2"/></g>
  
  ${Array.from({length:70},(_,i)=>{const row=i%5,x=RN(i,7)*476,y=200+row*22+RN(i,8)*10,s=.55+row*.22;return M_TUFT(x,Math.round(y),s,i)}).join("")}
  
  <path d="M84 204q60 2 96-4q-20 12-96 10Z" fill="#3f7229"/>
  <g stroke-linejoin="round" stroke-linecap="round">
   <path d="M66 206q8-30 6-62q-2-30 8-52l14 4q-8 22-6 50q2 32 10 60Z" fill="#4a3420" stroke="#16100a" stroke-width="3"/>
   <path d="M88 98q-6 24-4 50q1 30 10 58l-6 1q-8-28-9-58q-1-26 5-52Z" fill="#2c1e12"/>
   <path d="M76 120q2 20 0 40M80 170q0 14 2 24" fill="none" stroke="#7a5a38" stroke-width="1.6"/>
   <path d="M64 206q10-4 18 0q10-6 20 2" fill="none" stroke="#16100a" stroke-width="3"/>
   ${[0,1].map(layer=>Array.from({length:15},(_,i)=>{const j=i+layer*15,x0=28+i*8.4+layer*4,y0=86+Math.abs(x0-88)*.28,len=74+RN(j,4)*40-Math.abs(x0-88)*.25,sw=(RN(j,5)-.5)*10+3,c=layer?x0<70?"#86c05e":x0<112?"#5fa040":"#437f2e":"#2f5f22";let lv="";for(let t=.25;t<1;t+=.13){const x=x0+sw*t*t,y=y0+len*t,side=Math.round(t*20)%2?1:-1;lv+=`<ellipse cx="${(x+side*2.6).toFixed(1)}" cy="${y.toFixed(1)}" rx="1.9" ry="4.6" transform="rotate(${side*22} ${(x+side*2.6).toFixed(1)} ${y.toFixed(1)})"/>`}const d2=`M${x0.toFixed(1)} ${y0.toFixed(1)}Q${x0.toFixed(1)} ${(y0+len*.5).toFixed(1)} ${(x0+sw).toFixed(1)} ${(y0+len).toFixed(1)}`;return`<path d="${d2}" fill="none" stroke="#16100a" stroke-width="5"/><g fill="${c}" stroke="#16100a" stroke-width="1.3">${lv}</g><path d="${d2}" fill="none" stroke="${c}" stroke-width="2.6"/>`}).join("")).join("")}
   <path d="M22 108q-8-18 4-30q-2-18 16-24q8-14 26-10q12-10 30-2q16-4 26 10q18 4 20 22q12 12 6 32q-12 6-24 2q-10 8-24 2q-12 8-26 2q-12 8-26 0q-14 6-28-4Z" fill="#579a3c" stroke="#16100a" stroke-width="3" stroke-linejoin="round"/>
   <path d="M36 92q4-22 24-30q16-6 30-2q-26 4-38 22q-6 10-16 10Z" fill="#8cc463"/>
   <path d="M44 78q6 10 4 22M60 70q8 12 6 28M80 64q8 14 6 32M100 64q8 14 8 32M120 72q6 12 6 26M134 86q4 8 4 18" fill="none" stroke="#2f5f22" stroke-width="2" stroke-linecap="round"/>
   <path d="M52 74q3 6 2 12M70 66q4 8 3 16M90 62q5 10 4 18M110 66q4 8 4 16" fill="none" stroke="#9fd078" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
   <path d="M116 64q28 14 32 42q-10 6-22 2q2-24-10-44Z" fill="url(#ht-${U})" opacity=".45"/>
   <path d="M124 52q18 4 20 22q12 12 6 32q-12 6-24 2" fill="none" stroke="#16100a" stroke-width="4.6" stroke-linejoin="round"/>
   <path d="M150 112q-6 30 0 66" fill="none" stroke="#16100a" stroke-width="1.6" opacity=".5"/></g>
  
  <g transform="translate(238 0)">
   <path d="M70 252L156 246Q170 232 130 222L70 222Z" fill="#3f7229"/>
   <path d="M-86 238H92V256H-86Z" fill="#16100a" transform="translate(5 4)"/>
   <path d="M-86 238H92V256H-86Z" fill="#a19d93" stroke="#16100a" stroke-width="3"/><path d="M-86 238H92V243H-86Z" fill="#cfccc2"/><path d="M60 243H92V256H60Z" fill="url(#ht-${U})" opacity=".45"/>
   <path d="M-70 240V118q0-62 70-62t70 62V240Z" fill="#16100a" transform="translate(7 5)"/>
   <path d="M-70 240V118q0-62 70-62t70 62V240Z" fill="#b9b6ad" stroke="#16100a" stroke-width="3.2"/>
   <g fill="#8f8b82">${Array.from({length:46},(_,i)=>{const x=-62+RN(i,11)*124,y=70+RN(i,12)*166;return y<112&&Math.abs(x)>52-(112-y)*.2?"":`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.6+RN(i,13)).toFixed(1)}"/>`}).join("")}</g>
   <path d="M30 70q40 20 40 48V240H44V120q0-30-14-50Z" fill="url(#ht-${U})" opacity=".4"/>
   <path d="M0 56q70 0 70 62V240" fill="none" stroke="#16100a" stroke-width="5.4"/>
   <path d="M-58 120q2-48 50-52" stroke="#e9e6dc" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-62 140V226" stroke="#d7d4ca" stroke-width="3" stroke-linecap="round"/>
   
   <path d="M42 66l-6 14l5 8l-4 12" fill="none" stroke="#16100a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="M-70 240v-14q8-8 14-2q6-8 14 0q4 4 8 16Z" fill="#6f8f3a" stroke="#16100a" stroke-width="2" stroke-linejoin="round"/><path d="M40 240q6-12 14-6q8-8 16 2v4Z" fill="#5f7f32" stroke="#16100a" stroke-width="2" stroke-linejoin="round"/>
   <path d="M44 72q12-6 20 6q-8 2-14 0Z" fill="#6f8f3a" stroke="#16100a" stroke-width="1.6" stroke-linejoin="round"/>
   <g transform="translate(0 106) scale(.9)"><path d="M-12 -22h24M-12 22h24" stroke="#16100a" stroke-width="3"/><path d="M-10 -20c0 12 8 14 8 20s-8 8-8 20h20c0-12-8-14-8-20s8-8 8-20Z" fill="none" stroke="#16100a" stroke-width="2.6"/><path d="M-6 16q6-5 12 0v4h-12Z" fill="#16100a"/></g>
   <text y="152" text-anchor="middle" font-family="pdx-didone, Georgia" font-size="13" letter-spacing="3" fill="#2a2620">HERE LIES</text>
   <text y="182" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="27" letter-spacing="1" fill="${SEAT.victim}" stroke="#16100a" stroke-width="1.6" paint-order="stroke fill"${FIT(NAME_VICTIM,14,124)}>${NAME_VICTIM}</text>
   <path d="M-40 192h80" stroke="#6f6b62" stroke-width="2"/>
   <text y="210" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="9" letter-spacing="2" fill="#2a2620"${FIT("LOST AT SEA · "+DEATH_CENT,7.4,120)}>LOST AT SEA · ${DEATH_CENT}</text>
   
   <g transform="translate(36 62) rotate(14) scale(.68)">${FEDORA(SEAT.victim,-1)}</g>
   
   <g transform="translate(-50 238)">
    <ellipse cx="4" cy="22" rx="26" ry="5" fill="#2f5a24"/>
    <circle r="19" fill="none" stroke="#16100a" stroke-width="13"/><circle r="19" fill="none" stroke="#2f5a24" stroke-width="9"/>
    ${Array.from({length:18},(_,i)=>{const a=i*20,c=i%3===0?"#78b552":i%3===1?"#4f8f36":"#3a6f28";return`<ellipse cx="0" cy="-19" rx="4" ry="8" transform="rotate(${a}) rotate(35 0 -19)" fill="${c}" stroke="#16100a" stroke-width="1.4"/>`}).join("")}
    ${[[-14,-12],[15,-10],[-18,6],[12,14],[0,-21]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6" fill="#c8322c" stroke="#16100a" stroke-width="1.2"/>`).join("")}
    <path d="M-4 16l-8 20l6-2l2 6l6-22ZM4 16l8 20l-6-2l-2 6l-6-22Z" fill="${SEAT.victim}" stroke="#16100a" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M0 18l-12-8q-4 10 2 12ZM0 18l12-8q4 10-2 12Z" fill="${SEAT.victim}" stroke="#16100a" stroke-width="1.8" stroke-linejoin="round"/><circle cy="18" r="3.4" fill="${SEAT.victim}" stroke="#16100a" stroke-width="1.8"/>
    <path d="M2 16l6 20l-2 1Z" fill="url(#ht-${U})" opacity=".6"/></g>
  </g>
  
  ${[[134,238,"#e2574a"],[152,252,"#f4efe0"],[118,256,"#e8b93a"],[296,240,"#e2574a"],[314,252,"#9a74cc"],[334,236,"#f4efe0"],[352,248,"#e8b93a"],[222,262,"#9a74cc"],[372,258,"#e2574a"]].map(([x,y,c])=>FLOWER(x,y,c)).join("")}
  ${[[60,262,"#e8b93a",5],[420,240,"#f4efe0",5],[440,270,"#e2574a",5],[24,240,"#9a74cc",5]].map(([x,y,c,r])=>FLOWER(x,y,c,r)).join("")}
  ${Array.from({length:18},(_,i)=>{const x=RN(i,21)*476,y=278+RN(i,22)*22;return M_TUFT(x,Math.round(y),1.5,i+100)}).join("")}
</svg>`,ART_E=()=>`<svg class="art" viewBox="0 0 508 312">
  
  <rect width="508" height="312" fill="#e8c98a"/><rect width="508" height="150" fill="url(#htL-${U})" opacity=".18"/>
  <circle cx="390" cy="118" r="104" fill="#edd39a"/><circle cx="390" cy="118" r="72" fill="#f2dca8"/>
  <circle cx="390" cy="118" r="88" fill="none" stroke="url(#htL-${U})" stroke-width="16" opacity=".25"/>
  <circle cx="390" cy="118" r="44" fill="#f8ebc2" stroke="#16100a" stroke-width="3"/><path d="M362 102a32 32 0 0 1 22-18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <g stroke="#16100a" stroke-linejoin="round" stroke-width="2.2"><path d="M60 64q20-10 60-6q40-8 74 2q-4 6-14 6h-114q-10 0-6-2Z" fill="#f2dfb2"/><path d="M66 66h120" stroke="#d98c4a" stroke-width="2.4"/>
   <path d="M262 46q30-8 70-2q24-4 40 4q-6 6-14 6h-92q-8-2-4-8Z" fill="#f2dfb2"/><path d="M268 52h96" stroke="#d98c4a" stroke-width="2.4"/>
   <path d="M420 76q20-6 40-2q12 0 18 4h-56Z" fill="#f2dfb2"/></g>
  <path d="M140 96q4-4 8 0q4-4 8 0M166 86q3-3 6 0q3-3 6 0" fill="none" stroke="#16100a" stroke-width="1.8" stroke-linecap="round"/>
  
  <path d="M0 150q80-34 160-10t170-16t178 12V312H0Z" fill="#a9a06e" stroke="#16100a" stroke-width="3"/>
  <g fill="#8a8352" stroke="#16100a" stroke-width="1.8">${[[54,134,7],[66,132,9],[80,133,6],[190,138,8],[204,137,6],[300,126,7],[314,124,9],[470,128,7]].map(([x,y,r])=>`<path d="M${x-r} ${y+3}a${r} ${r} 0 1 1 ${2*r} 0Z"/>`).join("")}</g>
  <path d="M0 150q80-34 160-10t170-16t178 12V170q-90-14-178 6t-170 0t-160 6Z" fill="url(#htL-${U})" opacity=".35"/>
  <path d="M20 168q70-12 130 0M300 154q60-10 120-2" fill="none" stroke="#8a8352" stroke-width="2"/>
  
  <path d="M296 182Q360 170 508 166V210H296Z" fill="#7d9ea0" stroke="#16100a" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M352 176h40M366 182h28M374 188h14M420 178h22" stroke="#f8ebc2" stroke-width="2.4" stroke-linecap="round"/>
  
  <g transform="translate(440 184)"><path d="M-22 0h44l-8 8h-28Z" fill="#3a2a18" stroke="#16100a" stroke-width="2" stroke-linejoin="round"/><path d="M0 0V-40l20 34Z" fill="#f4ecd6" stroke="#16100a" stroke-width="2" stroke-linejoin="round"/><path d="M-2 -4V-34l-16 30Z" fill="#e6d8b4" stroke="#16100a" stroke-width="2" stroke-linejoin="round"/><path d="M-2-28l-10 22h8Z" fill="url(#ht-${U})" opacity=".4"/><path d="M-26 11h8M18 11h10" stroke="#16100a" stroke-width="1.6" stroke-linecap="round"/></g>
  
  <path d="M0 196q120-30 260-12t248 0V312H0Z" fill="#7f8f4e" stroke="#16100a" stroke-width="3"/>
  <path d="M0 262q100-10 200-2t308-6V312H0Z" fill="#6f7f42"/>
  ${Array.from({length:46},(_,i)=>{const row=i%4,x=30+RN(i,31)*450,y=196+row*30+RN(i,32)*12,s=.5+row*.3;return x>130+(y-150)*-.82+100&&x<262+(y-150)*.85?"":M_TUFT(x,Math.round(y),s,i+40,"#4b5a2a","#c7c46a")}).join("")}
  
  <path d="M236 150L262 150L400 312H96Z" fill="#c9a970" stroke="#16100a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M241 151L247 151L190 312H150Z" fill="#a88a56"/><path d="M252 151L258 151L352 312H310Z" fill="#a88a56"/>
  <path d="M241 151L150 312M258 151L352 312" stroke="#16100a" stroke-width="1.8" fill="none" opacity=".7"/>
  <path d="M248 152L252 152L300 312H200Z" fill="#9a9a5c"/>
  ${Array.from({length:16},(_,i)=>{const t=.15+i/17,cx=250+(RN(i,41)-.5)*100*t*.5,y=150+162*t;return M_TUFT(cx,Math.round(y),.3+t*.7,i+90,"#5e6a30","#c7c46a")}).join("")}
  
  ${[[120,300,8],[338,296,6],[372,304,7],[226,236,4],[282,222,3.5],[174,270,5],[316,262,4],[258,196,2.6],[212,300,5]].map(([x,y,r])=>`<g transform="translate(${x} ${y})"><ellipse cx="${-r*.5}" cy="${r*.35}" rx="${r*1.5}" ry="${r*.5}" fill="#6e5a34" opacity=".6"/><path d="M${-r} 0q0-${r*.9} ${r} -${r*.8}q${r} 0 ${r} ${r*.7}q-${r} ${r*.5}-${r*2} 0Z" fill="#b7a785" stroke="#16100a" stroke-width="1.6" stroke-linejoin="round"/><path d="M${r*.2} -${r*.7}q${r*.6} 0 ${r*.7} ${r*.5}" fill="none" stroke="#f2e6c4" stroke-width="1.4"/></g>`).join("")}
  
  <path d="M222 292L216 292L96 306L104 310Z" fill="#5d5230" opacity=".55"/>
  
  
  <g transform="translate(214 168)"><path d="M-8 18H-26L-20 14H-8Z" fill="#5d5230" opacity=".6"/>
   <path d="M-7 10V-9Q0-6 7-9V10Z" fill="#cfc8b4" stroke="#16100a" stroke-width="2"/><path d="M-7 10V-9L-4-8V10Z" fill="url(#ht-${U})" opacity=".6"/><path d="M-7-9Q0-13 7-9Q0-5-7-9Z" fill="#e8e2cf" stroke="#16100a" stroke-width="1.6"/><path d="M4-8V8" stroke="#f6f1e2" stroke-width="1.4"/>
   <path d="M-10 10H10V18H-10Z" fill="#b9b19a" stroke="#16100a" stroke-width="2"/><path d="M-10 18q4-4 8 0" fill="#6f7f42" stroke="#16100a" stroke-width="1.2"/>
   <text y="3" text-anchor="middle" font-family="pdx-didone, Georgia" font-weight="700" font-size="8" fill="#16100a"${FIT(MILE_FAR,6,11)}>${MILE_FAR}</text></g>
  
  <g transform="translate(150 290)">
   <ellipse cx="-6" cy="2" rx="62" ry="9" fill="#3e4a22"/>
   <path d="M-46 0H-104L-92 -10H-46Z" fill="#3e4a22" opacity=".7"/>
   <path d="M-46 -22H46V0H-46Z" fill="#b9b19a" stroke="#16100a" stroke-width="3"/>
   <path d="M-46 -22L-38 -30H54L46 -22Z" fill="#e2dbc6" stroke="#16100a" stroke-width="2.4" stroke-linejoin="round"/>
   <path d="M46 -22L54 -30V-8L46 0Z" fill="#d7d0bb" stroke="#16100a" stroke-width="2.4" stroke-linejoin="round"/>
   <path d="M-46 -22H-30V0H-46Z" fill="url(#ht-${U})" opacity=".5"/><path d="M-46 -22V0" stroke="#16100a" stroke-width="5"/>
   <path d="M-12 -11H10M4 -16L10 -11L4 -6" fill="none" stroke="#16100a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M-12 -9.6H10" stroke="#e2dbc6" stroke-width="1"/>
   <path d="M24 -22l3 7l-4 5" fill="none" stroke="#16100a" stroke-width="1.4" stroke-linecap="round"/>
   <path d="M-34 -26V-122Q4-136 42-122V-26Z" fill="#16100a" transform="translate(-6 4)"/>
   <path d="M-34 -26V-122Q4-110 42-122V-26Q4-18-34-26Z" fill="#d7d0bb" stroke="#16100a" stroke-width="3" stroke-linejoin="round"/>
   <g fill="#a39b84">${Array.from({length:30},(_,i)=>{const x=-28+RN(i,51)*64,y=-128+RN(i,52)*98;return`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.6+RN(i,53)*.9).toFixed(1)}"/>`}).join("")}</g>
   <path d="M-34 -26V-122Q-28-119-22-118V-24Z" fill="url(#ht-${U})" opacity=".55"/>
   <path d="M-34 -24V-122" fill="none" stroke="#16100a" stroke-width="5.2"/><path d="M-34 -122Q4-138 42-122Q4-108-34-122Z" fill="#e8e2cf" stroke="#16100a" stroke-width="2.6" stroke-linejoin="round"/><path d="M-20 -126Q4-133 30-127" fill="none" stroke="#fbf6e6" stroke-width="2.2" stroke-linecap="round"/>
   <path d="M33 -120V-32" stroke="#fbf6e6" stroke-width="3.4" stroke-linecap="round"/>
   <path d="M-34 -112Q4-104 42-112M-34 -100Q4-92 42-100" fill="none" stroke="#16100a" stroke-width="1.8"/><path d="M-34 -110.6Q4-102.6 42-110.6" fill="none" stroke="#fbf6e6" stroke-width="1"/>
   <text x="4" y="-102.6" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="6" letter-spacing="1.2" fill="#16100a">VIA · VETVS</text>
   <text x="5.2" y="-56.8" text-anchor="middle" font-family="pdx-didone, Georgia" font-weight="700" font-size="40" fill="#fbf6e6"${FIT(MILE,27,58)}>${MILE}</text>
   <text x="4" y="-58" text-anchor="middle" font-family="pdx-didone, Georgia" font-weight="700" font-size="40" fill="#16100a"${FIT(MILE,27,58)}>${MILE}</text>
   <path d="M-18 -46Q4-43 26-46" fill="none" stroke="#16100a" stroke-width="2"/>
   <text x="4" y="-34" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="7.5" letter-spacing="1.4" fill="#16100a">CENTURY</text>
   <path d="M-34 -122q2 -8 10 -9q2 5 8 4q-6 7-18 5Z" fill="#7b8a3a" stroke="#16100a" stroke-width="1.6" stroke-linejoin="round"/>
   <path d="M36 -118l-3 6l3 4l-2 6" fill="none" stroke="#16100a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="M-34 -26v-7q6-4 10 1q2 3 2 7Z" fill="#6f7f3a" stroke="#16100a" stroke-width="1.8" stroke-linejoin="round"/>
   <path d="M-46 0v-8q8-6 14 0q8-4 12 4v4Z" fill="#6f7f3a" stroke="#16100a" stroke-width="2" stroke-linejoin="round"/><path d="M30 0q6-8 12-4q4 0 4 4Z" fill="#7b8a3a" stroke="#16100a" stroke-width="2" stroke-linejoin="round"/>
   <g transform="translate(60 2)"><path d="M-6 0q0-7 6-7q7 0 7 6Z" fill="#b7a785" stroke="#16100a" stroke-width="1.6"/></g><g transform="translate(-58 3)"><path d="M-5 0q0-5 5-5q5 0 5 5Z" fill="#a39678" stroke="#16100a" stroke-width="1.6"/></g>
   ${M_TUFT(-40,4,1.2,201,"#3e4a22","#c7c46a")}${M_TUFT(-10,6,1.1,202,"#3e4a22","#c7c46a")}${M_TUFT(36,5,1.2,203,"#3e4a22","#c7c46a")}</g>
  
  <g transform="translate(222 292)"><path d="M-8 2q8-8 16 0Z" fill="#8a6c3c" stroke="#16100a" stroke-width="2" stroke-linejoin="round"/>
   <path d="M0 0V-150" stroke="#16100a" stroke-width="6.4"/><path d="M.6 -2V-148" stroke="#b08a52" stroke-width="2.6"/><path d="M1.6 -40V-60M1.6 -100V-116" stroke="#e0c08a" stroke-width="1"/>
   <path d="M3 -150Q22 -152 36 -142Q52 -133 72 -134Q54 -126 38 -122Q22 -116 3 -112Z" fill="${SEAT.rival}" stroke="#16100a" stroke-width="3" stroke-linejoin="round"/>
   <path d="M6 -146Q22 -148 32 -140Q20 -138 6 -136Z" fill="#fff" opacity=".28"/>
   <path d="M3 -124Q22 -122 38 -122Q22 -116 3 -112Z" fill="url(#ht-${U})" opacity=".5"/><path d="M36 -142Q32 -132 38 -122" fill="none" stroke="#16100a" stroke-width="1.8"/>
   <circle cy="-152" r="4.5" fill="#d9a43a" stroke="#16100a" stroke-width="2"/><circle cx="1.4" cy="-153.4" r="1.4" fill="#fff3c2"/></g>
</svg>`,ART_W=()=>`<svg class="art" viewBox="0 0 316 452" preserveAspectRatio="xMidYMid meet">
  
  <rect width="316" height="452" fill="#24170c"/>
  ${Array.from({length:7},(_,i)=>{const x=i*46-4+0,w=43,c=["#6b4a2b","#634427","#714e2d","#5f4126"][i%4];let g="";for(const f of[.24,.5,.76]){let d2="";for(let y=0;y<=452;y+=14){const xx=x+w*f+2.4*Math.sin(y/23+i*2+f*7);d2+=`${d2?"L":"M"}${xx.toFixed(1)} ${y}`}g+=`<path d="${d2}" fill="none" stroke="#4a3119" stroke-width="1.3"/>`}const ky=60+RN(i,61)*330,kx=x+w*(.3+RN(i,62)*.4);return`<path d="M${x+1} 0H${x+w}V452H${x+1}Z" fill="${c}"/>${g}<path d="M${kx.toFixed(1)} ${(ky-14).toFixed(1)}q7 14 0 28q-7-14 0-28Z" fill="#4a3119" stroke="#2c1c0e" stroke-width="1.4"/><circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="2.6" fill="#2c1c0e"/><path d="M${x+2.5} 0V452" stroke="#8a6640" stroke-width="2"/><path d="M${x+w-1} 0V452" stroke="#16100a" stroke-width="2.6"/><path d="M${x+w-9} 0H${x+w-1}V452H${x+w-9}Z" fill="url(#ht-${U})" opacity=".35"/>${[24,226,430].map(y=>`<circle cx="${x+9}" cy="${y}" r="2.6" fill="#3a2a18" stroke="#16100a" stroke-width="1.2"/><circle cx="${x+w-9}" cy="${y+3}" r="2.6" fill="#3a2a18" stroke="#16100a" stroke-width="1.2"/>`).join("")}<path d="M${x+14} ${(300+RN(i,63)*100).toFixed(0)}l3 22" stroke="#16100a" stroke-width="1.6" stroke-linecap="round"/>`}).join("")}
  <path d="M0 0H316V40Q160 30 0 50Z" fill="url(#ht-${U})" opacity=".18"/>
  
  <g transform="rotate(-1.5 158 226)">
   <path d="M30 22L284 18L290 60L286 300L292 432L36 436L28 380L32 200L24 120Z" fill="#0d0905" transform="translate(7 8)"/>
   <path d="M30 22L284 18L290 60L286 300L292 432L36 436L28 380L32 200L24 120Z" fill="#e2cc96" stroke="#16100a" stroke-width="3"/>
   <path d="M30 22L284 18L290 60L286 300L292 432L36 436L28 380L32 200L24 120Z" fill="url(#htL-${U})" opacity=".16"/>
   <g stroke="#9c8250" stroke-width="1" stroke-linecap="round" opacity=".55">${Array.from({length:40},(_,i)=>{const x=40+RN(i,71)*240,y=30+RN(i,72)*396,a=RN(i,73)*6.28;return`<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a)*5).toFixed(1)} ${(Math.sin(a)*5).toFixed(1)}"/>`}).join("")}</g><ellipse cx="240" cy="380" rx="40" ry="28" fill="#b08e52" opacity=".35"/><ellipse cx="70" cy="80" rx="30" ry="20" fill="#b08e52" opacity=".3"/>
   <path d="M284 18L290 60L262 40Z" fill="#6b4a2b" stroke="#16100a" stroke-width="2"/>
   
   <rect x="44" y="36" width="230" height="384" fill="none" stroke="#16100a" stroke-width="4"/><rect x="51" y="43" width="216" height="370" fill="none" stroke="#16100a" stroke-width="1.5"/>
   ${[[44,36],[274,36],[44,420],[274,420]].map(([x,y])=>`<path d="M${x} ${y-8}l3 5h6l-5 4l2 6l-6 -4l-6 4l2 -6l-5 -4h6Z" fill="#16100a"/>`).join("")}
   <text x="159" y="100" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="64" textLength="200" lengthAdjust="spacingAndGlyphs" fill="#16100a">WANTED</text>
   <path d="M64 108H254" stroke="#16100a" stroke-width="2"/>
   <text x="159" y="126" text-anchor="middle" font-family="pdx-didone, Georgia" font-weight="700" font-size="15" letter-spacing="4" fill="#16100a">DEAD OR ALIVE</text>
   
   <defs><clipPath id="wPort-${U}"><rect x="92" y="138" width="134" height="136"/></clipPath></defs>
   <rect x="92" y="138" width="134" height="136" fill="#d9c38c"/>
   <g clip-path="url(#wPort-${U})"><g transform="translate(92 138)">
    <g stroke="#16100a" stroke-width="1.1" opacity=".45">${Array.from({length:34},(_,i)=>`<path d="M0 ${2+i*4}H134"/>`).join("")}</g>
    <path d="M2 136Q4 112 22 104Q38 98 50 92L84 92Q96 98 112 104Q130 112 132 136Z" fill="${SEAT.rival}" stroke="#16100a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M50 92L66 124L38 104ZM84 92L68 124L96 104Z" fill="#16100a"/>
    <path d="M56 92L67 112L78 92Z" fill="#efe2bc" stroke="#16100a" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M58 96L67 104L76 96L74 102L67 108L60 102Z" fill="#8e1f1c" stroke="#16100a" stroke-width="1.4" stroke-linejoin="round"/>
    <g stroke="#efe2bc" stroke-width="1.4" stroke-linecap="round">${Array.from({length:6},(_,i)=>`<path d="M${100+i*5} ${108+i*2}q4 12 2 26"/>`).join("")}<path d="M14 116q2 8 1 18M20 112q2 10 1 22"/></g>
    <path d="M54 80H80V94Q67 100 54 94Z" fill="${SEAT.rival}" stroke="#16100a" stroke-width="2.2"/><path d="M70 82H80V94Q74 97 70 96Z" fill="#16100a"/>
    <path d="M44 50Q42 76 52 84Q60 92 67 92Q74 92 82 84Q92 76 90 50Z" fill="${SEAT.rival}" stroke="#16100a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M40 58q-6 2-4 10q2 6 8 6ZM94 58q6 2 4 10q-2 6-8 6Z" fill="${SEAT.rival}" stroke="#16100a" stroke-width="2"/>
    <path d="M76 56Q90 56 90 52Q92 74 82 84Q76 90 70 91Q80 80 78 66Z" fill="#16100a" opacity=".85"/>
    <path d="M44 46Q67 42 90 46L90 63Q67 59 44 63Z" fill="#16100a"/>
    <path d="M52 58q4-2 8 0M74 58q4-2 8 0" stroke="#f3e6c0" stroke-width="1.8" stroke-linecap="round"/><circle cx="57" cy="58.4" r="1" fill="#f3e6c0"/><circle cx="79" cy="58.4" r="1" fill="#f3e6c0"/>
    <path d="M67 60L64 72Q66 75 70 73" fill="none" stroke="#16100a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M68 62L70 72Q74 70 72 66Z" fill="#16100a" opacity=".5"/>
    <path d="M54 80Q60 74 67 77Q74 74 80 80Q74 82 67 80Q60 82 54 80Z" fill="#16100a"/>
    <path d="M60 86q7 3 14 0" fill="none" stroke="#16100a" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M48 64q2 10 6 16" fill="none" stroke="#efe2bc" stroke-width="1.6" stroke-linecap="round"/>
    <g transform="translate(0 -7)">
    <path d="M4 50Q30 42 67 42Q104 42 130 50Q124 60 104 62Q67 66 30 62Q10 60 4 50Z" fill="${SEAT.rival}" stroke="#16100a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M30 62Q67 66 104 62Q124 60 130 50Q120 56 104 57Q67 60 30 57Z" fill="#16100a"/>
    <path d="M36 46Q32 22 42 12Q50 6 58 10Q63 14 67 10Q71 14 76 10Q84 6 92 12Q102 22 98 46Q67 52 36 46Z" fill="${SEAT.rival}" stroke="#16100a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M36 38Q67 44 98 38L98 46Q67 52 36 46Z" fill="#16100a"/>
    <path d="M82 12Q100 22 96 38L88 39Q90 24 82 12Z" fill="#16100a" opacity=".85"/>
    <path d="M44 16q-4 8-3 18M50 12q-3 10-2 22" stroke="#efe2bc" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M60 14q4 10 2 22M74 14q-4 10-2 22" stroke="#16100a" stroke-width="1.4" fill="none"/>
    <path d="M10 50Q40 44 67 44" stroke="#efe2bc" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M92 12Q102 22 98 46M130 50Q124 60 104 62" fill="none" stroke="#16100a" stroke-width="4" stroke-linecap="round"/>
    </g>
   </g></g>
   <rect x="92" y="138" width="134" height="136" fill="none" stroke="#16100a" stroke-width="3"/><path d="M226 138V274H92" fill="none" stroke="#16100a" stroke-width="5"/>
   <text x="159" y="298" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="25" letter-spacing="1.5" fill="${SEAT.rival}" stroke="#16100a" stroke-width="1.6" paint-order="stroke fill"${FIT(NAME_RIVAL,14.5,196)}>${NAME_RIVAL}</text>
   <text x="159" y="318" text-anchor="middle" font-family="pdx-didone, Georgia" font-style="italic" font-size="12" fill="#16100a">for preying on his own kind</text>
   <path d="M64 330H254" stroke="#16100a" stroke-width="2"/>
   <text x="159" y="350" text-anchor="middle" font-family="pdx-didone, Georgia" font-weight="700" font-size="12" letter-spacing="5" fill="#16100a">REWARD</text>
   <text x="146" y="398" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="46" letter-spacing="2" fill="#8e1f1c"${FIT(REWARD+" GOLD",24,156)}>${REWARD} GOLD</text>
   
   <g transform="translate(246 372) rotate(-12)"><circle r="20" fill="none" stroke="#7a3fa8" stroke-width="2.5"/><path d="M0 -15l4 9l10 1l-8 6l3 10l-9 -6l-9 6l3 -10l-8 -6l10 -1Z" fill="#7a3fa8"/></g>
   <text x="159" y="414" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="7" letter-spacing="1.5" fill="#16100a">PAYABLE AT THE DOOR WITH EYES</text>
  </g>
  
  <g fill="#9a9488" stroke="#16100a" stroke-width="2"><circle cx="40" cy="30" r="5"/><circle cx="276" cy="26" r="5"/></g>
  ${[[214,196],[96,360],[262,250]].map(([x,y])=>`<g transform="translate(${x} ${y})"><circle r="6" fill="#16100a"/><path d="M-9 -2l-5 -3M8 4l6 2M2 -9l1 -6M-3 9l-2 5" stroke="#16100a" stroke-width="1.6"/></g>`).join("")}
</svg>`,W=()=>`<div class="paper w">${MAST("★ MANHUNT EDITION ★","<b>WEATHER</b>Dust on the quays","<b>BOUNTY</b>4 gold, posted","#8e1f1c")}
  <div class="wgrid"><div class="panel" style="height:452px;background:#6b4a2b">${ART_W}</div>
  <div class="fcol"><div class="kick">BOUNTY POSTED</div><div class="head ink" style="font-size:40px">A price on <span style="color:${SEAT.rival};-webkit-text-stroke:1.3px #16100a;paint-order:stroke fill">Player 2</span></div>
   <div class="deck">The Secret Market wants him brought in. Four gold, in any century, no questions.</div>
   <p class="txt"><span class="drop">B</span>ills went up on every quay before the tide turned. The folk behind the door with eyes keep one law: travellers ride together. Shoot your own, rob your own, and you're a bandit among bandits.</p>
   <div class="box"><b>THE TERMS</b><div class="lrow"><span>Reward</span><span>4 gold</span></div><div class="lrow"><span>Posted by</span><span>Secret Market</span></div><div class="lrow"><span>Wanted for</span><span>Agent on agent</span></div></div></div></div>
</div>`,ART_X=()=>`<svg class="art" viewBox="0 0 508 330">
  <defs><filter id="xInk-${U}" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.95" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="e"/><feDisplacementMap in="e" in2="n" scale="1.4"/></filter>
   <clipPath id="xFile-${U}"><path d="M-150 -104h300v214h-300Z"/></clipPath></defs>
  <rect width="508" height="330" fill="#efd9a0"/>
  <g>${Array.from({length:36},(_,i)=>{const a=i*Math.PI/18,a2=a+.09;return`<path d="M254 165L${(254+Math.cos(a)*700).toFixed(0)} ${(165+Math.sin(a)*700).toFixed(0)}L${(254+Math.cos(a2)*700).toFixed(0)} ${(165+Math.sin(a2)*700).toFixed(0)}Z" fill="#e3bd62"/>`}).join("")}</g>
  <rect width="508" height="330" fill="url(#htL-${U})" opacity=".2"/>
  
  ${[[40,40,SEAT.you,20],[92,120,SEAT.rival,-30],[60,250,SEAT.victim,50],[130,36,"#b3262a",70],[400,46,SEAT.rival,-15],[460,130,SEAT.you,35],[430,260,"#f8f0da",-40],[370,300,SEAT.victim,15],[150,290,"#f8f0da",60],[480,210,"#b3262a",-60],[30,170,"#f8f0da",10],[340,22,SEAT.victim,40],[190,18,SEAT.you,-20],[110,196,"#f2c230",25],[420,180,"#f2c230",-25]].map(([x,y,c,r])=>`<rect x="${x}" y="${y}" width="16" height="9" fill="${c}" stroke="#16100a" stroke-width="2" transform="rotate(${r} ${x} ${y})"/>`).join("")}
  ${[[70,70,SEAT.rival],[440,90,SEAT.you],[80,300,"#b3262a"],[460,300,SEAT.rival]].map(([x,y,c])=>`<path d="M${x} ${y}q14 -10 8 -24q-6 -14 8 -24" fill="none" stroke="#16100a" stroke-width="6" stroke-linecap="round"/><path d="M${x} ${y}q14 -10 8 -24q-6 -14 8 -24" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`).join("")}
  
  <g transform="translate(254 178) rotate(-4)">
   <path d="M-150 -104h300v214h-300Z" fill="#16100a" transform="translate(9 10)"/>
   <path d="M-150 -104h110l12 -20h80l12 20h-214" fill="${SEAT.you}" stroke="#16100a" stroke-width="3.5" stroke-linejoin="round"/>
   <path d="M-150 -104h300v214h-300Z" fill="#d8bf86" stroke="#16100a" stroke-width="4"/>
   <g clip-path="url(#xFile-${U})">
    <g stroke="#a88e58" stroke-width="1" stroke-linecap="round" opacity=".6">${Array.from({length:70},(_,i)=>{const x=-146+RN(i,81)*292,y=-76+RN(i,82)*184,a=RN(i,83)*6.28,l=3+RN(i,84)*5;return`<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${(Math.cos(a)*l*.5).toFixed(1)} ${(Math.sin(a)*l*.5+1).toFixed(1)} ${(Math.cos(a)*l).toFixed(1)} ${(Math.sin(a)*l).toFixed(1)}"/>`}).join("")}</g>
    <g fill="#b9a06a" opacity=".5">${Array.from({length:40},(_,i)=>`<circle cx="${(-146+RN(i,85)*292).toFixed(1)}" cy="${(-76+RN(i,86)*184).toFixed(1)}" r="${(.5+RN(i,87)*.8).toFixed(1)}"/>`).join("")}</g>
    <circle cx="-86" cy="76" r="24" fill="none" stroke="#a4804a" stroke-width="3" opacity=".45"/><path d="M-108 70a24 24 0 0 1 10-18" fill="none" stroke="#8a6a38" stroke-width="2" opacity=".5"/>
    <path d="M-20 -78L-26 110" stroke="#c4a870" stroke-width="2"/><path d="M-18 -78L-24 110" stroke="#ecdcac" stroke-width="1.2"/>
    <path d="M150 110H-150V96Q0 104 150 92Z" fill="#c2a66c" opacity=".5"/>
   </g>
   <path d="M60 -104h90v214h-50Z" fill="url(#ht-${U})" opacity=".25"/>
   <path d="M150 -104V110H-150" fill="none" stroke="#16100a" stroke-width="6.4" stroke-linejoin="round"/>
   <path d="M-146 -76h4l2 3l3-3M30 108l3-4l3 4M120 108l2-3l3 3" fill="none" stroke="#16100a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="M-150 -104h300v26h-300Z" fill="${SEAT.you}" stroke="#16100a" stroke-width="3.5"/>
   <text x="-136" y="-86" font-family="JetBrains Mono" font-weight="700" font-size="10" letter-spacing="2" fill="#16100a">CASE FILE · THE LAST TIMELINE</text>
   <text x="-132" y="-34" font-family="Oswald" font-weight="700" font-size="44" letter-spacing="1.5" fill="${SEAT.you}" stroke="#16100a" stroke-width="2" paint-order="stroke fill"${FIT(NAME_YOU,22,262)}>${NAME_YOU}</text>
   <path d="M-132 -16h170M-132 2h140M-132 20h160M-132 38h120" stroke="#16100a" stroke-width="2.4" opacity=".35"/>
   <path d="M-136 -104l-14 0v214" fill="none" stroke="#b49c64" stroke-width="3"/>
   <g transform="translate(66 50) rotate(-14)" filter="url(#xInk-${U})"><rect x="-92" y="-30" width="184" height="60" fill="none" stroke="#b3262a" stroke-width="6"/><rect x="-85" y="-23" width="170" height="46" fill="none" stroke="#b3262a" stroke-width="1.8"/>
    <text y="11" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="30" letter-spacing="1.5" textLength="160" lengthAdjust="spacingAndGlyphs" fill="#b3262a">CASE CLOSED</text><path d="M-92 -30L-80 -30M70 30H92" stroke="#b3262a" stroke-width="9" opacity=".6"/></g></g>
</svg>`,ART_ST=()=>`<svg class="art" viewBox="0 0 240 470">
  <rect width="240" height="470" fill="#1c1622"/>
  <g>${Array.from({length:19},(_,r)=>Array.from({length:5},(_2,c)=>`<rect x="${c*62-(r%2?31:0)}" y="${r*26}" width="58" height="22" fill="#3b2626" stroke="#140d10" stroke-width="2"/>`).join("")).join("")}</g>
  <rect width="240" height="470" fill="url(#ht-${U})" opacity=".45"/>
  <path d="M120 -10L-20 470H260Z" fill="#f2c230" opacity=".1"/>
  <path d="M0 418H240V470H0Z" fill="#221b26" stroke="#0b080d" stroke-width="3"/>
  <g fill="#2f2634" stroke="#0b080d" stroke-width="2">${Array.from({length:7},(_,i)=>`<ellipse cx="${16+i*36}" cy="${436+i%2*16}" rx="15" ry="6"/>`).join("")}</g>
  <path d="M178 418L196 418L240 470H180Z" fill="#f2c230" opacity=".5"/>
  <g transform="translate(14 50) scale(.652)">
   <image href="assets/shop/s1-door.svg" width="324" height="564"/><image href="assets/shop/s1-eyes.svg" x="112" y="66" width="114" height="52"/><image href="assets/shop/s1-leaf.svg" x="42" y="48" width="254" height="252"/></g>
  <path d="M217 80V414" stroke="#f6d55a" stroke-width="5"/><path d="M217 80V414" stroke="#fff2b8" stroke-width="2"/>
  <g transform="translate(150 430) rotate(-24) scale(.7)"><image href="assets/shop/s1-lock.svg" width="44" height="58"/></g>

</svg>`,T=t=>{try{return window.__pdxLang==="pt"&&window.__pdxTranslate&&window.__pdxTranslate(t)||t}catch{return t}},fill=t0=>String(T(t0)||"").replace(/\{A\}/g,NM(d.you||d.rival||d.victim)).replace(/\{K\}/g,NM(d.rival)).replace(/\{V\}/g,NM(d.victim)).replace(/\{C\}/g,esc(d.cent||"")).replace(/\{P\}/g,esc(d.period||"")).replace(/\{R\}/g,esc(T(d.relicTitle||"the relic"))).replace(/\{G\}/g,String(REWARD)).replace(/\{W\}/g,String(d.whole??0)).replace(/\{L\}/g,String(Math.max(0,30-(d.whole??0)))).replace(/\{H\}/g,String(d.hour??"")),plainFill=t=>fill(t).replace(/<[^>]*>/g,""),ed=(PRESS[d.kind]||PRESS.delivered)[(d.variant||0)%2],ear=EARS[d.kind]||EARS.delivered,MAST=(col="")=>`
  <div class="hz-top"><span>No. ${4100+(+d.hour||0)} · Late city</span><span>Printed outside time · delivered to every hour</span><span>Hour ${esc(d.hour??"")}</span></div>
  <div class="hz-mast"><div class="hz-ear"><b>WEATHER</b>${fill(ear[0])}</div><div class="hz-title hz-ink">${window.__pdxLang==="pt"?"O Arauto":"The Temporal"} <svg><use href="#mark-${U}"/></svg> ${window.__pdxLang==="pt"?"Temporal":"Herald"}</div><div class="hz-ear"><b>${ear[1]}</b>${fill(ear[2])}</div></div>
  <div class="hz-rule"></div>
  <div class="hz-date"><span>Vol. ∞</span><span>Unbought since before the first hour</span><span>Price: none you can pay</span></div>
  <div class="hz-edition" style="color:${col||"var(--ink)"}"><span>${EDITION[d.kind]}</span></div>`,fitHead=(text,max,width)=>document.documentElement.classList.contains("pdx-m-on")?24:Math.min(max,Math.floor(width/Math.max(1,plainFill(text).length*.5))),oneLine=(text,max,min,width)=>{if(document.documentElement.classList.contains("pdx-m-on"))return"font-size:24px";const f=Math.floor(width/Math.max(1,plainFill(text).length*.52));return f>=min?`font-size:${Math.min(max,f)}px;white-space:nowrap`:`font-size:${max}px`},ledger=rows=>rows.slice(0,6).map(r=>`<div class="hz-lrow"><span class="hz-nm" style="color:${r.col};font-size:13px">${esc(r.name)}</span><span>${r.cp} CP</span></div>`).join(""),slice=(svg,vb)=>svg.replace(`viewBox="${vb}"`,`viewBox="${vb}" preserveAspectRatio="xMidYMid slice"`);let page="";if(d.kind==="delivered")page=`<div class="hz-paper hz-v">${MAST()}
  <div class="hz-panel" style="height:300px">${slice(ART_V(),"0 0 508 312")}</div>
  <div class="hz-kick"><span>${fill(KICK.delivered)}</span>&nbsp;·&nbsp;<span class="hz-period">${esc(d.period||"")}</span></div>
  <div class="hz-head hz-ink" style="${oneLine(ed.head,46,34,508)}">${fill(ed.head)}</div>
  <div class="hz-deck">${fill(ed.deck)}</div>
  <div class="hz-cols"><p><b class="hz-k">PAGE TWO · THE RETURN</b><span class="hz-drop">${plainFill(ed.p1).charAt(0)}</span>${fill(ed.p1).slice(1)}</p><p>${fill(ed.p2)}</p>
  <div class="hz-side"><b>THE LEDGER</b>${ledger(d.ledger||[])}</div></div></div>`;else if(d.kind==="crime")page=`<div class="hz-paper hz-c">${MAST("var(--red)")}
  <div class="hz-head hz-ink hz-tab" style="white-space:nowrap;font-size:${fitHead(ed.head,60,500)}px !important">${fill(ed.head).replace(/agent$/i,"<em>agent</em>")}</div>
  <div class="hz-deck" style="margin-bottom:8px">${fill(ed.deck)}</div>
  <div class="hz-panel hz-bleed" style="height:300px">${slice(ART_C(),"0 0 508 312")}</div>
  <div class="hz-tabfoot"><p class="hz-txt"><b class="hz-k">PAGE TWO · THE WRECK</b><span class="hz-drop">${plainFill(ed.p1).charAt(0)}</span>${fill(ed.p1).slice(1)} ${fill(ed.p2)}</p>
   <div class="hz-suspect"><b>SUSPECT</b><svg viewBox="0 0 100 70"><g fill="${SEAT.rival}" stroke="#16100a" stroke-width="2.5"><path d="M34 26q2-14 8-17q4-2 8 1q4-3 8-1q6 3 8 17Z"/><path d="M22 30q28-10 56 0q-6 5-28 5t-28-5Z"/><path d="M38 34q0 12 12 15q12-3 12-15Z"/><path d="M24 70q2-16 26-20q24 4 26 20Z"/></g></svg>${NM(d.rival,15)}<small>ARMED · AT LARGE</small></div></div></div>`;else if(d.kind==="obituary")page=`<div class="hz-paper hz-m">${MAST()}
  <div class="hz-panel" style="height:300px">${ART_M()}</div>
  <div class="hz-center"><div class="hz-kick hz-c2">${fill(KICK.obituary)}</div>
  <div class="hz-head hz-ink" style="${oneLine(ed.head,56,34,480)}">${fill(ed.head).replace(/<span class="hz-nm"/,'<span class="hz-nm hz-nm-h"')}</div>
  <div class="hz-deck">${fill(ed.deck)}</div>
  <p class="hz-txt hz-narrow">${fill(ed.p1)} ${fill(ed.p2)}</p></div></div>`;else if(d.kind==="wanted")page=`<div class="hz-paper hz-w">${MAST("#8e1f1c")}
  <div class="hz-wgrid"><div class="hz-panel" style="height:452px;background:#6b4a2b">${ART_W()}</div>
  <div class="hz-fcol"><div class="hz-kick">${KICK.wanted}</div><div class="hz-head hz-ink" style="${oneLine(ed.head,40,30,190)}">${fill(ed.head).replace(/<span class="hz-nm"/,'<span class="hz-nm hz-nm-h"')}</div>
   <div class="hz-deck">${fill(ed.deck)}</div>
   <p class="hz-txt"><span class="hz-drop">${plainFill(ed.p1).charAt(0)}</span>${fill(ed.p1).slice(1)} ${fill(ed.p2)}</p>
   <div class="hz-box"><b>THE TERMS</b><div class="hz-lrow"><span>Reward</span><span>${REWARD} gold</span></div><div class="hz-lrow"><span>Posted by</span><span>Secret Market</span></div><div class="hz-lrow"><span>Wanted for</span><span>Agent on agent</span></div></div></div></div></div>`;else if(d.kind==="milestone")page=`<div class="hz-paper hz-e">${MAST()}
  <div class="hz-panel hz-bleed" style="height:372px">${slice(ART_E(),"0 0 508 312")}</div>
  <div class="hz-kick">${fill(KICK.milestone)}</div>
  <div class="hz-head hz-ink" style="font-size:${fitHead(ed.head,37,760)}px;white-space:nowrap">${fill(ed.head)}</div>
  <div class="hz-deck">${fill(ed.deck)}</div>
  <div class="hz-cols3"><p class="hz-txt"><b class="hz-k">THE ROAD</b>${fill(ed.p1)}</p><p class="hz-txt"><b class="hz-k">THE MERCHANT</b>${fill(ed.p2)}</p>
   <div class="hz-box"><b>THE STONES</b><div class="hz-lrow"><span>Century X</span><span>+1 CP</span></div><div class="hz-lrow"><span>Century XX</span><span>+1 CP</span></div><small style="font:italic 9px pdx-didone">each traveller, once</small></div></div></div>`;else if(d.kind==="cove")page=`<div class="hz-paper hz-s hz-night">${MAST("#c9a8f0")}
  <div class="hz-head hz-ink" style="${oneLine(ed.head,46,34,508)};text-align:center;margin-top:10px">${fill(ed.head)}</div>
  <div class="hz-trip"><div class="hz-tcol"><div class="hz-deck">${fill(ed.deck)}</div><p class="hz-txt">${fill(ed.p1)}</p></div>
   <div class="hz-panel" style="height:470px">${ART_ST()}</div>
   <div class="hz-tcol"><div class="hz-box"><b>OPEN TO</b>Anyone who reaches Century XI</div><p class="hz-txt">${fill(ed.p2)}</p><div class="hz-ad">KNOCK TWICE<small>no stamps, no names</small></div></div></div></div>`;else if(d.kind==="special"){const fin=FINAL[d.reason]||FINAL[d.you?"points":"none"],bars=(d.restored||[]).slice(0,6).map(r=>`<div class="hz-bar"><span class="hz-nm" style="color:${r.col};font-size:14px">${esc(r.name)}</span><i style="width:${Math.max(2,r.n*4)}px;background:${r.col}"></i><b>${r.n}</b></div>`).join("");page=`<div class="hz-paper hz-x">${MAST()}
  <div class="hz-kick" style="justify-content:center">${KICK.special}</div>
  <div class="hz-head hz-ink hz-banner" style="font-size:${fitHead(fin.head,47,1e3)}px !important">${fill(fin.head)}</div>
  <div class="hz-deck" style="text-align:center">${fill(fin.deck)}</div>
  <div class="hz-panel" style="height:286px;margin-top:8px">${slice(ART_X(),"0 0 508 330")}</div>
  <div class="hz-foot"><b>CENTURIES RESTORED</b>${bars}</div>
  <div class="hz-cols3" style="grid-template-columns:1fr 1fr"><p class="hz-txt"><b class="hz-k">PAGE TWO · THE VERDICT</b><span class="hz-drop">${plainFill(FINAL.p1).charAt(0)}</span>${fill(FINAL.p1).slice(1)}</p><p class="hz-txt">${fill(FINAL.p2)}</p></div></div>`}return{html:`<div class="hz hz-fit" style="--hz-k:${Math.max(.5,Math.min(1,d.fit||1))}"><svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs></svg>${page}</div>`,head:plainFill(d.kind==="special"?(FINAL[d.reason]||FINAL[d.you?"points":"none"]).head:ed.head),deck:plainFill(d.kind==="special"?(FINAL[d.reason]||FINAL[d.you?"points":"none"]).deck:ed.deck)}}
