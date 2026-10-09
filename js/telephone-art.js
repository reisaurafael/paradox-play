const PALETTES={dt_black:["#505247","#252a22","#a2a18a","#aca183"],dt_ivory:["#bfb596","#776f56","#e1d6b6","#a09678"],dt_oxblood:["#74423a","#381f1d","#b17761","#a68c70"]};export function telephoneArt(id="dt_black",clearLettering=!1){const[body,shade,light,metal]=PALETTES[id]||PALETTES.dt_black,ink="#151811",holes=Array.from({length:10},(_,i)=>{const a=(-160+i*28)*Math.PI/180,x=218+Math.cos(a)*64,y=210+Math.sin(a)*64,nx=218+Math.cos(a)*87,ny=210+Math.sin(a)*87,numeral=clearLettering?`<text x="${x.toFixed(1)}" y="${(y+5.4).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="16" fill="#e4d7b7">${i===9?0:i+1}</text>`:`<text x="${nx.toFixed(1)}" y="${(ny+6).toFixed(1)}" text-anchor="middle" font-family="Oswald,Arial Narrow,sans-serif" font-weight="700" font-size="20" fill="#e4d7b7">${i===9?0:i+1}</text>`;return`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="${ink}" stroke="#b5ad92" stroke-width="1.6"/><path d="M ${(x-8).toFixed(1)} ${(y+5).toFixed(1)} q 9 10 17 -1" fill="none" stroke="${light}" stroke-width="2"/>${numeral}`}).join(""),dots=Array.from({length:18},(_,i)=>`<path d="M ${322+i%3*5} ${175+Math.floor(i/3)*9} l 5 -4"/>`).join("");return`<svg viewBox="0 0 420 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <pattern id="dt-bakelite-${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(26)"><path d="M 1 1 l 1.5 0 M 5 6 l 1.2 -1" stroke="${light}" opacity=".15" stroke-width=".9"/></pattern>
    <pattern id="dt-shade-${id}" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="${ink}"/></pattern>
    <clipPath id="dt-shell-${id}"><path d="M 119 121 Q 136 112 166 113 L 287 125 Q 316 131 325 163 L 350 279 Q 352 291 337 298 Q 218 323 96 300 Q 85 296 91 281 Z"/></clipPath>
  </defs>
  <path d="M 88 305 Q 224 340 365 309 L 385 331 Q 246 374 86 333 L 65 326 Z" fill="${ink}" opacity=".45"/>
  <path d="M 334 264 C 387 284 377 341 327 346 L 108 344" fill="none" stroke="${ink}" stroke-width="5"/>
  <path d="M 113 124 Q 139 105 169 109 L 285 120 Q 325 125 335 163 L 363 283 Q 373 319 343 337 Q 207 365 89 339 Q 71 331 78 297 Z" fill="${shade}" stroke="${ink}" stroke-width="4"/>
  <path d="M 119 121 Q 136 112 166 113 L 287 125 Q 316 131 325 163 L 350 279 Q 352 291 337 298 Q 218 323 96 300 Q 85 296 91 281 Z" fill="${body}"/>
  <g clip-path="url(#dt-shell-${id})">
    <path d="M 283 113 L 330 132 L 355 312 L 301 320 L 285 224 Z" fill="${shade}"/>
    <path d="M 83 254 Q 176 312 351 270 V 330 H 75 Z" fill="url(#dt-shade-${id})" opacity=".7"/>
    <path d="M 91 110 H 360 V 327 H 91 Z" fill="url(#dt-bakelite-${id})"/>
    <path d="M 105 276 l 10 3 m 9 3 l 14 2 m 34 9 l 6 -1 m 75 -4 l 16 -2 m 47 -9 l 7 -3 M 141 124 l 10 -3" fill="none" stroke="${metal}" stroke-width="1.3"/>
    <g fill="none" stroke="${ink}" stroke-width="1.6">${dots}</g>
  </g>
  <path d="M 127 132 Q 146 119 173 122 L 282 133 Q 303 139 312 157 L 298 168 Q 215 144 120 161 Z" fill="${light}" opacity=".55"/>
  <path d="M 130 129 Q 164 116 211 128 L 281 138 L 279 143 Q 204 126 153 132 Z" fill="${light}"/>
  <path d="M 304 159 L 334 278 L 322 289 L 296 178 Z" fill="${shade}"/>
  <path d="M 310 172 L 334 278 L 328 285 L 304 179 Z" fill="url(#dt-shade-${id})" opacity=".7"/>
  <path d="M 99 284 L 125 131 Q 136 120 166 119" fill="none" stroke="${light}" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M 288 125 Q 316 132 325 163 L 350 279 Q 352 291 337 298 Q 222 327 96 300" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>
  <path d="M 325 164 L 350 279 Q 352 291 337 298 L 343 337 Q 373 319 363 283 L 335 163 Z" fill="${shade}" stroke="${ink}" stroke-width="2.8"/>
  <path d="M 336 183 L 356 279 Q 362 307 350 322" fill="none" stroke="${light}" stroke-width="1.6"/>
  <path d="M 96 300 Q 218 323 337 298 L 343 337 Q 208 365 89 339 L 83 306 Z" fill="${shade}" stroke="${ink}" stroke-width="2.8"/>
  <path d="M 90 323 Q 215 351 351 325 L 343 337 Q 208 365 89 339 Z" fill="${ink}"/>
  <path d="M 114 314 l -5 19 m 15 -17 l -5 19 m 15 -17 l -5 19 m 15 -17 l -4 18 M 286 320 l 5 18 m 7 -20 l 5 18 m 7 -20 l 5 18 m 7 -21 l 5 18" stroke="${ink}" stroke-width="1.6"/>
  <path d="M 98 305 Q 219 335 336 304" fill="none" stroke="${light}" stroke-width="2.4"/>
  <path d="M 83 306 Q 208 344 359 306" fill="none" stroke="${light}" stroke-width="1.8"/>
  <path d="M 95 338 l -2 8 31 6 4 -8 M 311 344 l 3 6 30 -7 -2 -8" fill="${ink}"/>
  <path d="M 126 122 L 129 155 L 146 157 L 148 123 M 279 132 L 278 157 L 294 161 L 299 134" fill="#1b211a" stroke="${ink}" stroke-width="3"/>
  <path d="M 132 124 L 134 145 M 283 134 V 148" stroke="${metal}" stroke-width="2"/>
  <g transform="translate(0 46) scale(1 .78)">
    <ellipse cx="218" cy="221" rx="106" ry="103" fill="${ink}"/>
    <path d="M 112 211 A 106 103 0 0 0 324 211 V 221 A 106 103 0 0 1 112 221 Z" fill="${shade}" stroke="${ink}" stroke-width="2"/>
    <circle cx="218" cy="210" r="101" fill="${metal}" stroke="${ink}" stroke-width="3"/>
    <circle cx="218" cy="210" r="95" fill="${shade}" stroke="#ded0ad" stroke-width="1.3"/>
    <circle cx="218" cy="210" r="79" fill="${body}" stroke="${ink}" stroke-width="2"/>
    <g class="dt-dial" style="transform-origin:218px 210px">${holes}</g>
    <circle cx="218" cy="210" r="37" fill="#d9cdae" stroke="${ink}" stroke-width="4"/>
    <circle cx="218" cy="210" r="31" fill="none" stroke="#75674e" stroke-width="1.3"/>
    ${clearLettering?'<text x="218" y="205" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="13" fill="#3d3d30">ROOM</text><path d="M 197 212 H 239" stroke="#7a7058" stroke-width="1.3"/><text x="218" y="231" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="17" fill="#3d3d30">01</text>':'<text x="218" y="206" text-anchor="middle" font-family="monospace" font-weight="700" font-size="9" fill="#3d3d30">C.R.O.N.O.S.</text><path d="M 195 217 H 241 M 205 228 H 231" stroke="#7a7058" stroke-width="1.3"/>'}
    <path d="M 280 256 L 295 259 L 291 285 L 271 278 Z" fill="${metal}" stroke="${ink}" stroke-width="3.5"/>
    <path d="M 140 155 Q 160 122 203 119 M 181 119 l 20 -3" fill="none" stroke="#d8ccb0" stroke-width="2.3"/>
    <path d="M 283 151 l 7 7 m -11 -8 l 3 5 m -147 109 l 7 -3" stroke="${ink}" stroke-width="1.2"/>
  </g>
  <path d="M 92 173 l -6 4 2 17 8 -5" fill="${metal}" stroke="${ink}" stroke-width="2.4"/>
  <path class="dt-cord-shadow" d="M 89 185 C 31 204 41 276 69 241 C 45 213 17 178 63 104" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>
  <path class="dt-cord" d="M 89 185 C 31 204 41 276 69 241 C 45 213 17 178 63 104" fill="none" stroke="#696554" stroke-width="3" stroke-linecap="round"/>
  <g class="dt-handset">
    <path d="M 65 99 Q 53 116 89 129 Q 123 139 137 116 Q 210 96 279 116 Q 310 139 347 120 L 355 113 L 369 131 Q 316 165 272 132 Q 200 112 136 130 Q 108 154 59 129 Z" fill="${ink}" opacity=".5"/>
    <path d="M 56 82 Q 58 48 88 39 Q 126 35 144 70 Q 205 58 272 77 Q 288 41 321 47 Q 357 51 362 87 L 359 115 Q 330 140 295 125 L 277 109 Q 210 91 147 104 L 133 121 Q 93 141 55 113 Z" fill="${body}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M 56 87 Q 94 102 128 81 L 145 76 Q 205 65 272 86 L 290 98 Q 328 116 360 89 L 359 115 Q 330 140 295 125 L 277 109 Q 210 91 147 104 L 133 121 Q 93 141 55 113 Z" fill="${shade}"/>
    <path d="M 62 76 Q 65 52 88 46 Q 113 42 133 71 L 128 80 Q 94 91 62 76 Z" fill="${light}" opacity=".43"/>
    <path d="M 291 84 Q 294 60 318 55 Q 342 56 352 82 L 346 90 Q 318 98 291 84 Z" fill="${light}" opacity=".43"/>
    <path d="M 118 69 L 132 80 L 133 117 L 119 126 L 121 98 Z M 340 76 L 360 89 L 359 115 L 346 125 L 347 100 Z" fill="${shade}"/>
    <path d="M 61 78 Q 93 95 130 80 M 291 86 Q 322 106 355 89" fill="none" stroke="${ink}" stroke-width="3.2"/>
    <path d="M 65 82 Q 94 97 126 85 M 296 90 Q 323 107 349 94" fill="none" stroke="${metal}" stroke-width="2.4"/>
    <path d="M 144 77 Q 209 65 275 87 L 277 109 Q 210 91 147 104 Z" fill="${shade}"/>
    <path d="M 151 92 Q 210 80 271 100 L 277 109 Q 210 91 147 104 Z" fill="${ink}"/>
    <path d="M 147 81 Q 207 71 267 90" fill="none" stroke="${light}" stroke-width="2.5"/>
    <path d="M 63 76 Q 64 58 88 49 Q 113 43 128 63 L 123 67 Q 105 50 86 55 Q 69 61 66 78 Z M 151 71 Q 208 60 264 80 L 262 87 Q 202 69 152 79 Z M 297 66 Q 315 53 332 65 L 342 76 L 337 79 Q 320 60 303 71 Z" fill="${light}"/>
    <path d="M 64 82 Q 60 117 106 126 Q 119 126 133 117 M 279 107 L 295 125 Q 330 140 359 115 L 362 87" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 58 99 Q 90 116 132 100 L 133 117 Q 113 136 83 130 Q 62 126 57 114 Z" fill="${shade}"/>
    <path d="M 59 109 Q 92 128 130 112 L 133 117 Q 113 136 83 130 Q 62 126 57 114 Z" fill="${ink}"/>
    <path d="M 64 104 Q 95 120 124 107" fill="none" stroke="${metal}" stroke-width="2.2"/>
    <path d="M 297 108 Q 331 124 359 102 L 359 115 Q 330 140 300 126 Z" fill="${shade}"/>
    <path d="M 298 119 Q 330 134 357 112 L 359 115 Q 330 140 300 126 Z" fill="${ink}"/>
    <path d="M 303 112 Q 329 125 351 111" fill="none" stroke="${metal}" stroke-width="2.1"/>
    <path d="M 56 95 Q 91 119 132 97 M 292 111 Q 326 129 359 103" fill="none" stroke="${metal}" stroke-width="1.7"/>
    <path d="M 74 107 l -3 10 m 11 -7 l -2 11 m 12 -8 l -1 11 m 218 -4 l 4 11 m 7 -11 l 3 9 m 6 -10 l 3 8 M 161 88 l 6 -2 m 42 -1 l 12 1 m 91 -32 l 6 2" stroke="${ink}" stroke-width="1.3"/>
    <path d="M 60 93 l -8 6 6 13 9 -7" fill="${shade}" stroke="${ink}" stroke-width="2.5"/>
    <path d="M 76 66 l 12 -6 m 7 -2 l 7 1 M 118 101 l 4 11 m 1 -14 l 5 12 M 342 103 l 4 11 m 1 -14 l 5 10 M 170 85 l 8 -1 m 15 0 l 8 1 m 17 0 l 6 1" fill="none" stroke="${ink}" stroke-width="1.5"/>
    <path d="M 77 49 l 5 -2 3 2 -6 2 Z M 160 70 l 7 -1 -2 3 -4 1 Z M 323 55 l 6 3 -4 1 Z" fill="${metal}"/>
    <path class="dt-receiver-hit" d="M 53 78 Q 55 45 91 38 Q 128 36 145 70 Q 210 58 273 77 Q 289 39 323 47 Q 359 53 364 88 L 360 117 Q 329 142 294 126 L 277 109 Q 210 92 147 104 L 132 123 Q 91 141 53 113 Z" fill="transparent"/>
  </g>
  <circle class="dt-message-light" cx="323" cy="274" r="5" fill="#766343" stroke="${ink}" stroke-width="2"/>
  <path class="dt-hit" d="M 102 137 L 324 143 L 363 301 Q 370 330 343 341 Q 216 365 84 339 L 78 303 Z" fill="transparent"/>
  </svg>`}export function wireTrayArt(){const ink="#211d16",posts=Array.from({length:9},(_,i)=>{const t=i/8,y=57+306*t,ry=27+304*t,lx=29-13*t,rx=270+18*t;return`M ${lx} ${y} L ${lx-14} ${ry} M ${rx} ${y} L ${rx+17} ${ry}`}).join(" ");return`<svg viewBox="0 0 310 410" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <pattern id="file-tray-dot" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.05" fill="${ink}"/></pattern>
      <clipPath id="file-tray-bed"><path d="M 32 57 H 268 L 287 369 H 18 Z"/></clipPath>
    </defs>
    <path d="M 23 55 H 281 L 309 387 L 299 403 H 18 L 7 390 Z" fill="${ink}" opacity=".52"/>
    <path d="M 29 53 H 271 L 293 372 V 384 L 15 384 V 372 Z" fill="#55584f" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M 29 53 H 271 L 293 372 H 15 Z" fill="#898a75" stroke="${ink}" stroke-width="2.5"/>
    <path d="M 32 57 H 268 L 287 369 H 18 Z" fill="#7c806e"/>
    <g clip-path="url(#file-tray-bed)">
      <path d="M 28 61 H 278 L 276 70 H 30 Z M 21 332 H 287 V 371 H 17 Z" fill="#60685b"/>
      <path d="M 234 53 H 277 L 291 372 H 249 Z" fill="url(#file-tray-dot)" opacity=".6"/>
      <path d="M 36 75 l 54 -3 m 14 1 l 19 -1 M 227 109 l 20 -3 M 45 314 l 44 -2 M 178 349 l 35 -2 M 46 191 l 8 -1" stroke="#b9b69c" stroke-width="1.6"/>
      <path d="M 35 80 l 33 -2 M 231 113 l 13 -2 M 39 317 l 13 -1 M 205 354 l 28 -1" stroke="#474f44" stroke-width="1.2"/>
    </g>
    <path d="M 29 56 L 17 370 H 287" fill="none" stroke="#c3bea1" stroke-width="2.5"/>
    <path d="M 272 57 L 292 372 V 384 H 15" fill="none" stroke="${ink}" stroke-width="4"/>
    <path d="M 19 377 H 290" stroke="#93957d" stroke-width="2"/>
    <path d="M 31 58 H 270 M 21 357 H 287" fill="none" stroke="${ink}" stroke-width="5.2"/>
    <path d="M 31 56 H 268 M 21 355 H 284" fill="none" stroke="#b2b29a" stroke-width="2"/>
    <path d="${posts}" fill="none" stroke="${ink}" stroke-width="4.8" stroke-linecap="round"/>
    <path d="${posts}" fill="none" stroke="#9a9c88" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M 15 28 Q 15 19 26 19 H 277 Q 286 19 288 28 L 306 337 M 15 28 L 2 337" fill="none" stroke="${ink}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M 15 26 Q 16 21 26 21 H 276 M 289 36 L 303 332 M 13 37 L 3 331" fill="none" stroke="#c3bea1" stroke-width="2.3" stroke-linecap="round"/>
    <path d="M 21 92 L 6 74 M 21 169 L 5 151 M 17 246 L 4 230 M 287 92 L 273 75 M 291 170 L 278 154 M 296 246 L 282 231" stroke="#4d5549" stroke-width="1.5"/>
    <path d="M 2 337 Q 2 350 14 353 H 101 Q 110 353 118 363 Q 130 378 154 378 Q 182 378 194 361 Q 200 353 209 353 H 292 Q 307 351 306 337" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>
    <path d="M 3 337 Q 4 348 15 349 H 101 Q 113 350 121 363 Q 132 374 155 374 Q 180 374 192 360 Q 202 348 210 349 H 291 Q 303 348 304 337" fill="none" stroke="#b1b39a" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M 9 385 H 28 V 393 H 13 Z M 271 385 H 293 L 290 393 H 270 Z" fill="${ink}"/>
  </svg>`}export function telephoneCord(x=0,y=0){const p=[[89,185],[-10,265],[x+8,y+168],[x+58,y+102]];let d="";for(let i=0;i<=120;i++){const t=i/120,u=1-t,ax=u*u*u*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t*t*t*p[3][0],ay=u*u*u*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t*t*t*p[3][1],dx=3*u*u*(p[1][0]-p[0][0])+6*u*t*(p[2][0]-p[1][0])+3*t*t*(p[3][0]-p[2][0]),dy=3*u*u*(p[1][1]-p[0][1])+6*u*t*(p[2][1]-p[1][1])+3*t*t*(p[3][1]-p[2][1]),len=Math.hypot(dx,dy)||1,coil=Math.sin(t*36*Math.PI)*4.5*Math.sin(t*Math.PI);d+=(i?"L":"M")+(ax-dy/len*coil).toFixed(1)+" "+(ay+dx/len*coil).toFixed(1)+" "}return d}
