/* ═══════════════════════════════════════════════════════════════════════════
   THE CAT: a living animal on the records desk (the game's soul + scale ruler)
   Orange tabby, white bib and socks, green eyes. Young (under a year), her
   body next to the briefcase is how the player understands the world's size.
   She ROAMS the paperwork scene: walks anywhere, sleeps belly-up, curls on the
   Operations Log, grooms, sharpens claws on the paper (and damages it), stalks
   and nibbles the player's hand, purrs under the fingers, and gets scared.
   SVG pose rig + rAF state machine. API kept from the old engine:
   new CatEngine(_ignored) · start() · stop() · pet() · startle() · setMood(m)
   · onMeow callback.
   ═══════════════════════════════════════════════════════════════════════════ */

const NS = "http://www.w3.org/2000/svg";
const VB_W = 900, VB_H = 700, GROUND = 690;

/* ── the drawing: every pose shares palette, ground line and face classes ── */
function catSVG() {
  return `
<svg class="catw-svg" viewBox="0 0 ${VB_W} ${VB_H}" xmlns="${NS}" preserveAspectRatio="xMidYMax meet">
<defs>
  <linearGradient id="cw-or" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e6973f"/><stop offset="1" stop-color="#e6973f"/>
  </linearGradient>
  <linearGradient id="cw-orh" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e6973f"/><stop offset="1" stop-color="#e6973f"/>
  </linearGradient>
  <linearGradient id="cw-cr" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f6efdc"/><stop offset="1" stop-color="#f6efdc"/>
  </linearGradient>
</defs>

<!-- ════ POSE: SIT ════ -->
<g class="cw-pose cw-sit" transform="translate(150,74)">
  <g stroke="#2a1a10" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="310" cy="612" rx="165" ry="11" fill="#000" opacity=".16" stroke="none"/>
    <g class="cw-body">
      <path d="M 292 230 C 218 240 178 296 166 366 C 154 436 148 500 172 552 C 190 590 232 612 300 614 C 372 616 420 594 440 552 C 464 502 458 434 446 366 C 434 296 382 240 292 230 Z" fill="url(#cw-or)"/>
      <ellipse cx="408" cy="500" rx="52" ry="74" fill="#d68232" opacity=".6" stroke-width="0"/>
      <path d="M 380 430 C 428 448 442 508 424 562" fill="none" stroke-width="2.2" opacity=".7"/>
      <path d="M 384 590 Q 380 616 406 618 Q 438 620 442 600 Q 444 586 428 580 Q 400 576 384 590 Z" fill="url(#cw-cr)" stroke="none"/>
      <path d="M 384 592 Q 380 616 406 618 Q 438 620 442 600" fill="none" stroke-width="2.2"/>
      <path d="M 408 616 v -12 M 424 614 v -12" stroke-width="2.2" opacity=".6" fill="none"/>
      <g stroke="#c97b28" stroke-width="8" opacity=".9" fill="none">
        <path d="M 184 336 q 30 -8 46 -26 M 172 408 q 34 -6 54 -26 M 170 484 q 32 -2 52 -20"/>
        <path d="M 440 342 q -26 -12 -40 -30 M 448 420 q -30 -10 -46 -30"/>
        <path d="M 418 486 q 14 18 12 40" stroke-width="10"/>
      </g>
      <g class="cw-tail">
        <path d="M 430 540 C 486 528 540 540 556 496 C 566 466 552 444 528 442 C 512 440 500 452 502 466 C 504 480 520 484 530 476 C 534 490 522 504 496 508 C 462 512 442 548 430 578 Z" fill="url(#cw-or)"/>
        <path d="M 420 528 Q 456 518 468 544 Q 466 572 436 578 Q 414 554 420 528 Z" fill="url(#cw-or)" stroke="none"/>
        <g stroke="#c97b28" stroke-width="7" opacity=".9" fill="none">
          <path d="M 508 522 q 18 -8 24 -24 M 540 468 q -4 -12 -16 -14"/>
        </g>
      </g>
      <path class="cw-armL" d="M 258 452 C 252 500 248 546 250 578 C 251 600 260 612 278 612 C 294 612 300 600 300 582 L 298 458 Z" fill="url(#cw-cr)"/>
      <path class="cw-armR" d="M 344 452 C 350 500 354 546 352 578 C 351 600 342 612 324 612 C 308 612 302 600 302 582 L 304 458 Z" fill="url(#cw-cr)"/>
      <path d="M 254 588 q -6 20 12 24 q 20 4 30 -6 M 348 588 q 6 20 -12 24 q -20 4 -30 -6" fill="none" stroke-width="2.2"/>
      <path d="M 272 610 v -13 M 330 610 v -13" stroke-width="2.2" opacity=".6" fill="none"/>
      <path d="M 230 328
               C 242 304 358 304 372 328
               C 369 392 358 448 348 502
               C 346 522 342 538 334 548
               L 322 538 L 314 552
               L 302 542 L 290 554
               L 280 540 L 268 548
               C 260 538 256 522 254 504
               C 244 450 234 392 230 328 Z" fill="url(#cw-cr)" stroke="none"/>
      <g class="cw-tufts" stroke="#c9772a" stroke-width="2" fill="none" opacity=".8">
        <path class="cw-tuft" d="M 176 380 q -10 6 -12 16"/>
        <path class="cw-tuft" d="M 170 440 q -10 4 -14 14"/>
        <path class="cw-tuft" d="M 178 500 q -10 6 -10 16"/>
        <path class="cw-tuft" d="M 444 386 q 10 6 12 16"/>
        <path class="cw-tuft" d="M 452 452 q 10 4 12 14"/>
      </g>
    </g>
    <g class="cw-head">
      <g class="cw-earL"><path d="M 206 136 L 184 40 L 272 90 Q 238 104 206 136 Z" fill="url(#cw-orh)"/>
        <path d="M 212 118 L 198 60 L 252 92 Z" fill="#e8b4a8" stroke-width="2.2"/></g>
      <g class="cw-earR"><path d="M 394 136 L 416 40 L 328 90 Q 362 104 394 136 Z" fill="url(#cw-orh)"/>
        <path d="M 388 118 L 402 60 L 348 92 Z" fill="#e8b4a8" stroke-width="2.2"/></g>
      <path d="M 300 76 C 376 76 436 124 440 188 C 442 220 428 248 404 266 L 410 280 L 392 278 C 366 294 336 302 300 302 C 264 302 234 294 208 278 L 190 280 L 196 266 C 172 248 158 220 160 188 C 164 124 224 76 300 76 Z" fill="url(#cw-orh)"/>
      <path d="M 300 192 C 342 192 376 210 374 246 C 372 282 342 300 300 300 C 258 300 228 282 226 246 C 224 210 258 192 300 192 Z" fill="url(#cw-cr)" stroke-width="0"/>
      <g stroke="#c97b28" stroke-width="7" opacity=".9" fill="none">
        <path d="M 264 94 q 6 22 0 40 M 300 86 q 2 24 -2 44 M 336 94 q -6 22 0 40"/>
        <path d="M 184 172 q 20 4 34 14 M 416 172 q -20 4 -34 14" stroke-width="9"/>
      </g>
      <path d="M 284 118 Q 300 110 316 118 L 322 196 Q 300 210 278 196 Z" fill="url(#cw-cr)" stroke="none"/>
      <g class="cw-eyes">
        <g class="cw-eyeball">
          <circle cx="248" cy="190" r="29" fill="#a7cf4e" stroke-width="2.4"/>
          <circle class="cw-pupil" cx="248" cy="191" r="15" fill="#161c10" stroke="none"/>
          <circle cx="257" cy="181" r="5.2" fill="#fff" stroke="none"/>
        </g>
        <g class="cw-eyeball">
          <circle cx="352" cy="190" r="29" fill="#a7cf4e" stroke-width="2.4"/>
          <circle class="cw-pupil" cx="352" cy="191" r="15" fill="#161c10" stroke="none"/>
          <circle cx="361" cy="181" r="5.2" fill="#fff" stroke="none"/>
        </g>
        <path class="cw-lid" d="M 222 190 Q 242 202 276 195" fill="none" stroke-width="4"/>
        <path class="cw-lid" d="M 324 195 Q 358 202 378 190" fill="none" stroke-width="4"/>
      </g>
      <path d="M 289 235 L 311 235 L 300 250 Z" fill="#d98a7e" stroke-width="2"/>
      <g class="cw-mouth-calm"><path d="M 300 250 L 300 261 M 300 261 Q 287 272 274 263 M 300 261 Q 313 272 326 263" fill="none" stroke-width="2.2"/></g>
      <g class="cw-mouth-open">
        <path d="M 278 258 Q 300 288 322 258 Q 312 250 300 252 Q 288 250 278 258 Z" fill="#7c3040" stroke-width="2"/>
        <path d="M 284 258 l 4 9 l 5 -8 M 316 258 l -4 9 l -5 -8" fill="#fff" stroke-width="1.6"/>
      </g>
      <path class="cw-tongue" d="M 292 262 Q 300 284 310 262 Q 302 256 292 262 Z" fill="#e08a8a" stroke-width="2.4"/>
      <g stroke="#f4ecd8" stroke-width="2" opacity=".9" fill="none">
        <path d="M 238 240 Q 172 232 122 242 M 240 252 Q 180 256 134 272 M 246 262 Q 196 276 158 296"/>
        <path d="M 362 240 Q 428 232 478 242 M 360 252 Q 420 256 466 272 M 354 262 Q 404 276 442 296"/>
      </g>
    </g>
  </g>
</g>

<!-- ════ POSE: STAND / WALK: unified body frames + her true face ════ -->
<g class="cw-pose cw-stand" transform="translate(20,162)">
  <g stroke="#2a1a10" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="470" cy="524" rx="205" ry="12" fill="#000" opacity=".16" stroke="none"/>
    <g class="cw-tail">
      <path d="M 648 262 C 700 240 718 192 706 138 C 700 110 712 92 734 88 C 752 86 764 98 762 114 C 760 128 746 134 736 128 C 734 148 742 160 738 190 C 730 250 700 292 656 306 Z" fill="url(#cw-or)"/>
      <g stroke="#c97b28" stroke-width="7" opacity=".85" fill="none"><path d="M 700 208 q 14 -8 18 -24 M 704 128 q 10 -12 26 -12"/></g>
    </g>

    <g class="cw-frame cw-fN">
      <path d="M 380 388 C 376 430 374 468 374 494 Q 374 514 394 514 L 408 514 Q 420 514 419 496 C 418 462 420 424 424 392 Z" fill="#d68232"/>
      <path d="M 560 388 C 566 428 570 464 570 490 Q 570 512 550 512 L 538 512 Q 526 512 528 492 C 530 460 528 424 524 390 Z" fill="#d68232"/>
      <g fill="#e9e1c9" stroke-width="2"><path d="M 375 490 Q 374 514 392 514 L 406 514 Q 420 514 419 492 Z"/><path d="M 529 488 Q 528 512 546 512 L 552 512 Q 570 512 570 488 Z"/></g>
      <path d="M 292 214
               C 340 184 430 176 505 180 C 578 184 636 200 660 236
               C 684 270 682 314 658 344
               C 664 400 668 462 666 500 Q 666 524 644 524 L 612 524 Q 600 524 602 504
               C 606 462 604 424 596 388
               C 560 402 500 408 452 408 C 404 408 362 402 340 394
               C 340 438 340 480 338 502 Q 336 524 316 524 L 286 524 Q 272 524 274 502
               C 278 456 282 402 288 358
               C 276 328 272 288 280 256 C 284 234 288 222 292 214 Z" fill="url(#cw-or)"/>
      <g fill="url(#cw-cr)" stroke="none">
        <path d="M 604 486 C 604 500 602 512 602 504 Q 600 524 612 524 L 644 524 Q 666 524 666 500 L 666 480 Z"/>
        <path d="M 276 486 C 276 500 274 510 274 502 Q 272 524 286 524 L 316 524 Q 336 524 338 502 L 338 480 Z"/>
      </g>
    </g>
    <g class="cw-frame cw-fA">
      <path d="M 388 386 C 396 428 406 462 416 486 Q 424 506 442 500 L 454 496 Q 466 492 458 474 C 446 446 436 414 430 388 Z" fill="#d68232"/>
      <path d="M 556 386 C 548 426 540 460 530 484 Q 522 504 504 498 L 494 494 Q 482 490 490 472 C 502 444 512 414 518 388 Z" fill="#d68232"/>
      <g fill="#e9e1c9" stroke-width="2"><path d="M 418 480 Q 424 506 440 500 L 454 496 Q 466 492 460 476 Z"/><path d="M 528 478 Q 522 504 506 498 L 494 494 Q 484 490 490 474 Z"/></g>
      <path d="M 292 214
               C 340 184 430 176 505 180 C 578 184 636 200 660 236
               C 684 270 682 314 658 344
               C 672 396 686 452 694 492 Q 698 514 676 518 L 648 522 Q 634 524 632 506
               C 628 464 618 424 604 390
               C 564 404 502 408 454 408 C 406 408 364 402 342 394
               C 330 436 316 478 304 500 Q 294 520 276 512 L 252 502 Q 238 496 248 478
               C 262 446 274 404 280 362
               C 272 330 272 288 280 256 C 284 234 288 222 292 214 Z" fill="url(#cw-or)"/>
      <g fill="url(#cw-cr)" stroke="none">
        <path d="M 636 490 C 636 500 633 508 632 506 Q 634 524 648 522 L 676 518 Q 698 514 694 492 L 690 474 Z"/>
        <path d="M 254 480 C 250 488 246 496 248 478 Q 238 496 252 502 L 276 512 Q 294 520 304 500 L 310 486 Z"/>
      </g>
    </g>
    <g class="cw-frame cw-fB">
      <path d="M 366 384 C 358 428 348 464 338 488 Q 330 508 350 504 L 368 500 Q 380 496 374 478 C 366 450 362 416 362 388 Z" fill="#d68232"/>
      <path d="M 546 380 C 556 426 568 464 580 488 Q 588 508 606 502 L 620 498 Q 632 494 624 476 C 612 448 600 416 592 386 Z" fill="#d68232"/>
      <path d="M 292 214
               C 340 184 430 176 505 180 C 578 184 636 200 660 236
               C 684 270 682 314 658 344
               C 648 396 630 448 616 478 Q 606 502 586 496 L 560 488 Q 548 484 556 466
               C 568 436 578 404 582 378
               C 546 396 496 404 452 404 C 410 404 372 398 348 390
               C 344 428 348 466 356 490 Q 362 512 340 516 L 314 518 Q 300 520 299 500
               C 296 458 292 412 290 370
               C 278 334 272 292 280 256 C 284 234 288 222 292 214 Z" fill="url(#cw-or)"/>
      <g fill="url(#cw-cr)" stroke="none">
        <path d="M 560 470 Q 548 486 562 492 L 584 498 Q 604 502 614 482 L 618 468 Z"/>
        <path d="M 301 484 Q 299 516 316 517 L 338 515 Q 358 512 353 488 L 352 482 Z"/>
      </g>
    </g>

    <g class="cw-over">
      <path d="M 636 244 Q 668 236 676 268 Q 674 300 644 302 Q 624 276 636 244 Z" fill="url(#cw-or)" stroke="none"/>
      <g stroke="#c97b28" stroke-width="7" opacity=".9" fill="none">
        <path d="M 366 194 q 6 24 -2 44 M 434 186 q 4 26 -4 48 M 502 188 q 4 26 -2 48 M 566 202 q 6 22 2 42"/>
      </g>
      <g class="cw-tufts" stroke="#d68232" stroke-width="2" fill="none" opacity=".8">
        <path class="cw-tuft" d="M 330 218 q -8 -8 -8 -18"/>
        <path class="cw-tuft" d="M 474 180 q 2 -10 -4 -18"/>
        <path class="cw-tuft" d="M 642 230 q 10 -4 14 -14"/>
      </g>
    </g>

    <g class="cw-head">
      <g class="cw-earL"><path d="M 168 128 L 136 36 L 228 80 Q 194 96 168 128 Z" fill="url(#cw-orh)"/>
        <path d="M 174 110 L 154 54 L 210 84 Z" fill="#e8b4a8" stroke-width="1.8"/></g>
      <g class="cw-earR"><path d="M 310 118 L 344 34 L 252 72 Q 286 88 310 118 Z" fill="url(#cw-orh)"/>
        <path d="M 304 102 L 324 52 L 264 76 Z" fill="#e8b4a8" stroke-width="1.8"/></g>
      <path d="M 238 66 C 304 66 352 110 352 164 C 352 196 338 222 314 238 L 320 252 L 302 248 C 282 258 260 262 238 262 C 216 262 194 258 174 248 L 156 252 L 162 238 C 138 222 124 196 124 164 C 124 110 172 66 238 66 Z" fill="url(#cw-orh)"/>
      <path d="M 272 202 Q 330 184 354 216 Q 348 254 300 256 Q 268 234 272 202 Z" fill="url(#cw-orh)" stroke="none"/>
      <path d="M 224 92 Q 238 85 252 92 L 258 158 Q 238 170 218 158 Z" fill="url(#cw-cr)" stroke="none"/>
      <path d="M 238 156 C 274 156 300 172 298 200 C 296 230 270 244 238 244 C 206 244 180 230 178 200 C 176 172 202 156 238 156 Z" fill="url(#cw-cr)" stroke="none"/>
      <g class="cw-eyes">
        <g class="cw-eyeball">
          <circle cx="192" cy="150" r="22" fill="#a7cf4e" stroke-width="2.2"/>
          <circle class="cw-pupil" cx="192" cy="151" r="12" fill="#161c10" stroke="none"/>
          <circle cx="198" cy="142" r="3.4" fill="#fff" stroke="none"/>
        </g>
        <g class="cw-eyeball">
          <circle cx="284" cy="150" r="22" fill="#a7cf4e" stroke-width="2.2"/>
          <circle class="cw-pupil" cx="284" cy="151" r="12" fill="#161c10" stroke="none"/>
          <circle cx="290" cy="142" r="3.4" fill="#fff" stroke="none"/>
        </g>
        <path class="cw-lid" d="M 172 148 Q 192 158 214 150" fill="none" stroke-width="3.4"/>
        <path class="cw-lid" d="M 262 150 Q 284 158 306 148" fill="none" stroke-width="3.4"/>
      </g>
      <path d="M 229 186 L 247 186 L 238 198 Z" fill="#d98a7e" stroke-width="2"/>
      <g class="cw-mouth-calm"><path d="M 238 198 L 238 208 M 238 208 Q 227 216 217 210 M 238 208 Q 249 216 259 210" fill="none" stroke-width="2"/></g>
      <g class="cw-mouth-open">
        <path d="M 220 204 Q 238 230 256 204 Q 248 197 238 199 Q 228 197 220 204 Z" fill="#7c3040" stroke-width="2"/>
        <path d="M 225 204 l 3 8 l 4 -7 M 251 204 l -3 8 l -4 -7" fill="#fff" stroke-width="1.3"/>
      </g>
      <g stroke="#f4ecd8" stroke-width="1.7" opacity=".9" fill="none">
        <path d="M 188 192 Q 136 188 98 196 M 192 202 Q 146 208 112 222"/>
        <path d="M 288 192 Q 340 188 378 196 M 284 202 Q 330 208 364 222"/>
      </g>
    </g>
  </g>
</g>

<!-- ════ POSE: SLEEP BELLY-UP ════ -->
<g class="cw-pose cw-sleep" transform="translate(0,232)">
  <g stroke="#2a1a10" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="450" cy="442" rx="265" ry="13" fill="#000" opacity=".15" stroke="none"/>
    <g class="cw-tail">
      <path d="M 640 380 C 710 404 768 400 796 372 C 814 352 806 330 786 332 C 770 334 764 348 774 358 C 758 368 722 366 684 350 Z" fill="url(#cw-or)"/>
      <path d="M 742 386 q 24 -2 40 -12" stroke="#c97b28" stroke-width="7" opacity=".85" fill="none"/>
    </g>
    <g class="cw-body">
      <path d="M 214 330
               C 196 268 232 200 316 172
               C 402 144 522 148 596 186
               C 664 222 692 292 668 352
               C 646 404 566 434 458 436
               C 350 438 236 402 214 330 Z" fill="url(#cw-or)"/>
      <path d="M 300 186 C 288 152 300 122 328 116 C 356 112 372 134 362 160 C 356 176 342 186 326 188 Z" fill="url(#cw-or)"/>
      <path d="M 316 124 Q 330 112 348 118 Q 366 126 362 146 Q 344 152 328 144 Q 316 136 316 124 Z" fill="url(#cw-cr)" stroke="none"/>
      <path d="M 384 196 C 378 160 394 132 422 132 C 448 132 458 156 448 178 C 442 192 426 200 410 200 Z" fill="url(#cw-or)"/>
      <path d="M 400 142 Q 412 130 430 136 Q 448 144 442 164 Q 424 170 410 160 Q 400 152 400 142 Z" fill="url(#cw-cr)" stroke="none"/>
      <path d="M 294 198 Q 330 180 368 194 Q 372 218 340 226 Q 304 224 294 198 Z" fill="url(#cw-or)" stroke="none"/>
      <path d="M 380 206 Q 414 190 450 202 Q 452 226 420 232 Q 390 228 380 206 Z" fill="url(#cw-or)" stroke="none"/>
      <path d="M 560 192 C 566 152 592 128 622 138 C 650 148 654 178 636 198 C 622 212 600 218 584 212 Z" fill="url(#cw-or)"/>
      <path d="M 594 146 Q 608 134 626 142 Q 642 152 634 170 Q 616 176 602 166 Q 592 158 594 146 Z" fill="url(#cw-cr)" stroke="none"/>
      <path d="M 636 238 C 656 210 690 204 712 224 C 730 242 724 270 700 280 C 682 287 660 282 648 268 Z" fill="url(#cw-or)"/>
      <path d="M 686 220 Q 704 212 718 226 Q 730 242 716 256 Q 698 260 686 248 Q 678 234 686 220 Z" fill="url(#cw-cr)" stroke="none"/>
      <g fill="#e8b4a8" stroke-width="1.4">
        <ellipse cx="724" cy="234" rx="5.4" ry="4.4"/><ellipse cx="732" cy="243" rx="4.6" ry="4"/><ellipse cx="722" cy="250" rx="4.8" ry="4"/>
      </g>
      <path d="M 556 204 Q 592 188 630 202 Q 634 226 600 232 Q 564 228 556 204 Z" fill="url(#cw-or)" stroke="none"/>
      <path d="M 630 248 Q 664 234 700 246 Q 702 270 668 276 Q 636 270 630 248 Z" fill="url(#cw-or)" stroke="none"/>
      <ellipse cx="446" cy="302" rx="160" ry="100" fill="url(#cw-cr)" stroke="none"/>
      <g stroke="#c97b28" stroke-width="7" opacity=".9" fill="none">
        <path d="M 262 248 q 14 -18 34 -26 M 246 302 q 12 -14 28 -22 M 630 260 q -12 -16 -30 -24 M 650 314 q -8 -16 -24 -24"/>
      </g>
      <g class="cw-tufts" stroke="#d68232" stroke-width="2" fill="none" opacity=".8">
        <path class="cw-tuft" d="M 340 172 q -2 -10 -10 -14"/>
        <path class="cw-tuft" d="M 540 168 q 4 -10 0 -18"/>
        <path class="cw-tuft" d="M 664 340 q 10 4 12 14"/>
      </g>
    </g>
    <g class="cw-head" transform="translate(-58,158) rotate(-14) scale(.66)">
      <g class="cw-earL"><path d="M 206 136 L 184 40 L 272 90 Q 238 104 206 136 Z" fill="url(#cw-orh)"/>
        <path d="M 212 118 L 198 60 L 252 92 Z" fill="#e8b4a8" stroke-width="3"/></g>
      <g class="cw-earR"><path d="M 394 136 L 416 40 L 328 90 Q 362 104 394 136 Z" fill="url(#cw-orh)"/>
        <path d="M 388 118 L 402 60 L 348 92 Z" fill="#e8b4a8" stroke-width="3"/></g>
      <path d="M 300 76 C 376 76 436 124 440 188 C 442 220 428 248 404 266 L 410 280 L 392 278 C 366 294 336 302 300 302 C 264 302 234 294 208 278 L 190 280 L 196 266 C 172 248 158 220 160 188 C 164 124 224 76 300 76 Z" fill="url(#cw-orh)" stroke-width="3.4"/>
      <path d="M 284 118 Q 300 110 316 118 L 322 196 Q 300 210 278 196 Z" fill="url(#cw-cr)" stroke="none"/>
      <path d="M 300 192 C 342 192 376 210 374 246 C 372 282 342 300 300 300 C 258 300 228 282 226 246 C 224 210 258 192 300 192 Z" fill="url(#cw-cr)" stroke="none"/>
      <g stroke="#c97b28" stroke-width="10" opacity=".9" fill="none">
        <path d="M 264 94 q 6 22 0 40 M 300 86 q 2 24 -2 44 M 336 94 q -6 22 0 40"/>
      </g>
      <path class="cw-sleepeyes" d="M 220 190 Q 240 204 274 196 M 326 196 Q 360 204 380 190" fill="none" stroke-width="5.4"/>
      <path d="M 289 235 L 311 235 L 300 250 Z" fill="#d98a7e" stroke-width="3"/>
      <path d="M 300 250 L 300 260 M 300 260 Q 288 270 276 262" fill="none" stroke-width="3"/>
      <g stroke="#f4ecd8" stroke-width="2.6" opacity=".9" fill="none">
        <path d="M 238 240 Q 172 232 122 242 M 240 252 Q 180 256 134 272"/>
        <path d="M 362 240 Q 428 232 478 242 M 360 252 Q 420 256 466 272"/>
      </g>
    </g>
  </g>
</g>

<!-- ════ POSE: CURL (croissant, for the log papers) ════ -->
<g class="cw-pose cw-curl" transform="translate(180,272)">
  <g stroke="#2a1a10" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="365" cy="412" rx="190" ry="11" fill="#000" opacity=".15" stroke="none"/>
    <g class="cw-body">
      <path d="M 300 370 C 220 360 180 300 196 236 C 214 168 292 128 380 132 C 470 136 530 186 534 254 C 538 318 492 366 412 372 C 372 375 336 374 300 370 Z" fill="url(#cw-or)"/>
      <g stroke="#c97b28" stroke-width="8" opacity=".9" fill="none">
        <path d="M 250 210 q 20 -20 46 -28 M 224 268 q 16 -18 38 -26 M 500 210 q -18 -18 -42 -26 M 524 270 q -12 -18 -32 -28"/>
      </g>
      <g class="cw-tail">
        <path d="M 214 318 C 258 366 340 388 420 380 C 480 374 520 352 534 322 C 546 350 528 388 476 404 C 396 428 268 416 214 358 Z" fill="url(#cw-or)"/>
        <path d="M 300 404 q 30 8 60 6 M 420 402 q 26 -6 44 -18" stroke="#c97b28" stroke-width="7" opacity=".85" fill="none"/>
      </g>
      <g class="cw-tufts" stroke="#c9772a" stroke-width="2" fill="none" opacity=".8">
        <path class="cw-tuft" d="M 220 220 q -12 0 -18 -8"/>
        <path class="cw-tuft" d="M 330 130 q 0 -12 -8 -16"/>
        <path class="cw-tuft" d="M 520 232 q 12 -2 16 -12"/>
      </g>
    </g>
    <g class="cw-head">
      <g class="cw-earL"><path d="M 306 218 L 282 148 L 356 178 Q 328 192 306 218 Z" fill="url(#cw-orh)"/>
        <path d="M 310 202 L 296 160 L 340 180 Z" fill="#e8b4a8" stroke-width="2.2"/></g>
      <g class="cw-earR"><path d="M 424 210 L 448 142 L 372 172 Q 402 186 424 210 Z" fill="url(#cw-orh)"/>
        <path d="M 420 194 L 434 154 L 390 174 Z" fill="#e8b4a8" stroke-width="2.2"/></g>
      <path d="M 366 166 C 424 166 468 202 468 250 C 468 296 424 326 366 326 C 310 326 268 296 268 250 C 268 202 310 166 366 166 Z" fill="url(#cw-orh)"/>
      <path d="M 366 258 C 396 258 418 272 416 294 C 414 316 394 326 366 326 C 338 326 318 316 316 294 C 314 272 336 258 366 258 Z" fill="url(#cw-cr)" stroke-width="0"/>
      <g stroke="#c97b28" stroke-width="7" opacity=".9" fill="none"><path d="M 340 176 q 4 16 0 28 M 366 172 q 2 16 -2 30 M 392 176 q -4 16 0 28"/></g>
      <path class="cw-sleepeyes" d="M 322 240 Q 336 250 354 244 M 378 244 Q 396 250 410 240" fill="none" stroke-width="4"/>
      <path d="M 358 288 L 374 288 L 366 300 Z" fill="#d98a7e" stroke-width="2.4"/>
      <g stroke="#f4ecd8" stroke-width="1.8" opacity=".85" fill="none">
        <path d="M 322 292 Q 280 288 248 296 M 410 292 Q 452 288 484 296"/>
      </g>
    </g>
  </g>
</g>
</svg>`;
}

/* ── plane helpers: the cat lives in CAMERA-PLANE coordinates (vw/vh) ── */
// The cat lives in the FIXED fit-scale plane (2133x1200), not the viewport, so a
// plane "unit" is 1% of the PLANE, not 1% of the window. Pre-fit they were equal;
// after commit 1ed31ad the window ratio drifts the cat by the fit factor.
const vw = () => 2133 / 100;
const vh = () => 1200 / 100;

export class CatEngine {
  constructor(_legacyCanvas) {
    this.onMeow = null;
    this.mood = "calm";            // calm | afraid
    this.state = "sit";            // sit walk sleep curl groom pet crouch pounce bite scared scratch
    this.pos = { x: -25, y: 88 };  // plane coords in vw/vh units (feet point)
    this.tgt = null;
    this.face = 1;                 // 1 = facing right
    this.stateUntil = 0;
    this._petHeat = 0;
    this._mouseV = 0; this._mouse = { x: 0, y: 0, t: 0 };
    this._playCool = 0;
    this._scratches = 0;
    this._raf = null;
    this._mounted = false;
    this._purring = false;
    window.addEventListener("mousemove", (e) => this._onMouse(e), { passive: true });
  }

  /* ── mount into the camera plane ── */
  _mount() {
    const grid = document.querySelector(".game-grid");
    if (!grid) return false;
    const old = document.getElementById("cat-corner"); if (old) old.remove();
    const root = document.createElement("button");
    root.id = "cat"; root.type = "button";
    root.className = "cat-being pose-sit";
    root.setAttribute("aria-label", "The cat");
    root.innerHTML = catSVG();
    grid.appendChild(root);
    this.root = root;
    this.svg = root.querySelector(".catw-svg");
    this._mounted = true;
    this._applyPose("sit");
    this._place();
    this._schedule(2.5);
    return true;
  }

  start() {
    if (this._raf) return;
    const frame = (t) => { this._tick(t); this._raf = requestAnimationFrame(frame); };
    this._raf = requestAnimationFrame(frame);
  }
  stop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; }

  /* ── public API (kept) ── */
  pet() { this._petHeat = Math.min(1, this._petHeat + 0.55); this._enter("pet", 2.8); }
  // The ONE truth of "on the cat": the DRAWN pose group's rect (display:none poses
  // have no rect). Her root box is mostly empty margin, never test against it.
  hitTest(x, y) {
    if (!this.root) return false;
    if (!this._poseEls) this._poseEls = [...this.root.querySelectorAll(".cw-pose")];
    let rr = null;
    for (const gp of this._poseEls) { const r = gp.getBoundingClientRect(); if (r.width > 0) { rr = r; break; } }
    if (!rr || !rr.width) return false;
    // the WHOLE cursor ring must be over her, inset by the ring's radius
    const IN = 18;
    return x >= rr.left + IN && x <= rr.right - IN && y >= rr.top + IN && y <= rr.bottom - IN;
  }
  startle() {
    if (this.state === "scared") return;
    this._enter("scared", 5.5 + Math.random() * 2);
    // dash to a corner
    this.tgt = { x: -44, y: 90 };
    if (this.onMeow && Math.random() < 0.5) this.onMeow();
  }
  setMood(m) { this.mood = m; if (this.root) this.root.classList.toggle("mood-afraid", m === "afraid"); }

  /* ── internals ── */
  _onMouse(e) {
    const now = performance.now();
    const dt = Math.max(16, now - this._mouse.t);
    const dx = e.clientX - this._mouse.x, dy = e.clientY - this._mouse.y;
    this._mouseV = this._mouseV * 0.8 + (Math.hypot(dx, dy) / dt) * 0.2; // px/ms
    this._mouse = { x: e.clientX, y: e.clientY, t: now };
  }
  _onScene() {
    const g = window.__game;
    return g && g.camera ? g.camera.scene : "main";
  }
  /* cursor position in plane coords (vw/vh), only meaningful on the drawer scene */
  _cursorPlane() {
    const r = this.root && this.root.getBoundingClientRect();
    if (!r || !r.width) return { x: this.pos.x, y: this.pos.y };
    // her feet-anchor (plane pos) renders at (rect centre-x, rect bottom); the render
    // maps her 26 plane-units of width onto rect.width viewport px, so this ratio
    // unprojects the cursor through BOTH --fit and the camera pan with no math about either.
    const uppX = 26 / r.width, uppY = (26 * VB_H / VB_W) / r.height;
    return { x: this.pos.x + (this._mouse.x - (r.left + r.width / 2)) * uppX,
             y: this.pos.y + (this._mouse.y - r.bottom) * uppY };
  }

  _enter(state, secs) {
    this.state = state;
    this.stateUntil = performance.now() + secs * 1000;
    this._applyPose(state);
  }
  _applyPose(state) {
    if (!this.root) return;
    const poseGroups = { sit: "sit", pet: "sit", groom: "sit", watch: "sit",
      walk: "stand", crouch: "stand", pounce: "stand", bite: "stand", scared: "stand", scratch: "stand",
      sleep: "sleep", curl: "curl" };
    const ng = poseGroups[state] || "sit";
    if (this._lastGroup && this._lastGroup !== ng) {
      this.root.classList.remove("shift"); void this.root.offsetWidth;
      this.root.classList.add("shift");
      clearTimeout(this._shiftT);
      this._shiftT = setTimeout(() => this.root && this.root.classList.remove("shift"), 340);
    }
    this._lastGroup = ng;
    const poseOf = { sit: "sit", pet: "sit", groom: "sit", watch: "sit",
      walk: "stand", crouch: "stand", pounce: "stand", bite: "stand", scared: "stand", scratch: "stand",
      sleep: "sleep", curl: "curl" };
    const p = poseOf[state] || "sit";
    this.root.className = "cat-being pose-" + p
      + (this.mood === "afraid" ? " mood-afraid" : "")
      + (state === "walk" ? " walking" : "")
      + (state === "pet" ? " petted purring" : "")
      + (state === "groom" ? " grooming" : "")
      + (state === "crouch" || state === "pounce" ? " crouched pupils-wide" : "")
      + (state === "bite" ? " biting pupils-wide" : "")
      + (state === "scared" ? " scared ears-back pupils-wide" : "")
      + (state === "scratch" ? " scratching" : "")
      + ((state === "sleep" || state === "curl") ? " sleeping" : "");
    this._setPurr(state === "pet" || (state === "sleep" && Math.random() < .3));
  }

  _setPurr(on) {
    if (on === this._purring) return;
    this._purring = on;
    try { const a = window.__audio; if (a && a.purrLoop) a.purrLoop(on); } catch (err) {}
    if (this.root) this.root.classList.toggle("purring", on);
  }

  _place() {
    if (!this.root) return;
    this.pos.x = this._clampX(this.pos.x);
    this.pos.y = this._clampY(this.pos.y);
    // root is 36vw wide; feet at the bottom-center of the svg box
    const wpx = 26 * vw();
    const hpx = wpx * (VB_H / VB_W);
    /* plane x: zone coords are plane px; grid origin = plane (0,0). pos.x in vw units (negative = left half)
       Written only when a value CHANGES: this runs every frame, and re-writing the same
       box every frame (left was even written twice, with two float spellings) dirtied
       style and layout for a cat that was sitting still. */
    const w = wpx.toFixed(2) + "px";
    const l = (this.pos.x * vw() - wpx / 2).toFixed(2) + "px";
    const tp = (this.pos.y * vh() - hpx).toFixed(2) + "px";
    const fl = this.face > 0 ? "scaleX(-1)" : "";
    const last = this._placed || (this._placed = {});
    if (last.w !== w) { this.root.style.width = w; last.w = w; }
    if (last.l !== l) { this.root.style.left = l; last.l = l; }
    if (last.t !== tp) { this.root.style.top = tp; last.t = tp; }
    const inner = this.svg;
    if (inner && last.f !== fl) { inner.style.transform = fl; last.f = fl; }
  }

  _schedule(delaySecs) {
    this._nextThink = performance.now() + delaySecs * 1000;
  }

  _think() {
    // choose the next activity (weights make her feel alive but unhurried)
    const roll = Math.random();
    const onDrawerScene = this._onScene() === "drawer";
    if (this.mood === "afraid") { this._enter("sit", 4); this._schedule(4); return; }
    if (this._perched && roll < 0.5) { // hop down first
      const down = { x: this._clampX(this.pos.x + (Math.random() < 0.5 ? -6 : 6)), y: 88 };
      this._jump = { sx: this.pos.x, sy: this.pos.y, tx: down.x, ty: down.y, t0: performance.now(), dur: 620 };
      this._perched = false;
      this._enter("pounce", 0.66);
      this._schedule(3);
      return;
    }
    if (roll < 0.26) { // wander somewhere new
      this.tgt = this._randWaypoint();
      this._enter("walk", 20);
    } else if (roll < 0.36 && !this._perched) { // climb the cabinet, nap on the drawers
      this.tgt = { x: this._clampX(-40 + Math.random() * 22), y: 88 };
      this._enter("walk", 20);
      this._afterWalk = "perch";
    } else if (roll < 0.46) { this._enter("groom", 3.5 + Math.random() * 3); }
    else if (roll < 0.52) { this.tgt = { x: this._clampX(-30 + Math.random() * 10), y: 88 }; this._enter("walk", 20); this._afterWalk = "sleep"; }
    else if (roll < 0.62) { this.tgt = this._logSpot(); this._enter("walk", 20); this._afterWalk = "curl"; }
    else if (roll < 0.70 && this._scratches < 6) { this.tgt = this._logSpot(); this._enter("walk", 20); this._afterWalk = "scratch"; }
    else { this._enter("sit", 5 + Math.random() * 6); if (this.onMeow && onDrawerScene && Math.random() < 0.18) this.onMeow(); }
    this._schedule(6 + Math.random() * 7);
  }

  _clampX(x) { return Math.max(-14, Math.min(-5, x)); }   // HER quarter is the strip's far right; the projection owns the far left
  _clampY(y) { return this._perched ? Math.max(24, Math.min(95, y)) : Math.max(74, Math.min(95, y)); }
  _randWaypoint() {
    // roam the RIGHT side of the paperwork strip, the core hologram owns the left
    return { x: this._clampX(-14 + Math.random() * 9), y: this._clampY(76 + Math.random() * 19) };
  }
  // her curl/scratch spot stays in HER quarter now, kept separate
  _logSpot() { return { x: this._clampX(-12 - Math.random() * 2), y: this._clampY(84 + Math.random() * 10) }; }
  _goToward(p) { if (this.state === "sleep" || this.state === "curl") { this.pos = { ...p }; } else this.tgt = p; }

  _spawnScratch(px, py) {
    const zone = document.getElementById("log-zone");
    if (!zone) return;
    const zr = zone.getBoundingClientRect();
    const fit = window.__pdxFit || 1;   // px/py are viewport px; the zone is fit-scaled -> unproject
    const d = document.createElement("div");
    d.className = "cat-scratch";
    d.style.left = Math.max(8, Math.min(zone.clientWidth - 60, (px - zr.left) / fit)) + "px";
    d.style.top = Math.max(8, Math.min(zone.clientHeight - 40, (py - zr.top) / fit)) + "px";
    d.style.transform = `rotate(${(Math.random() * 30 - 15).toFixed(1)}deg)`;
    zone.appendChild(d);
    this._scratches++;
  }

  _tick(t) {
    if (!this._mounted) { this._mount(); return; }
    const now = performance.now();
    const scene = this._onScene();
    // sleep the engine visually when her scene is far (keep state clock running)
    const visible = scene === "drawer";
    if (!this._visSet) { this.root.style.visibility = "visible"; this._visSet = true; } // she exists always; plane clips her naturally

    // decay pet heat
    this._petHeat = Math.max(0, this._petHeat - 0.0016);

    // GAZE: she looks where she is going, or at what worries her. Only on her own scene:
    // the gaze reads her rect every frame, and nobody sees her eyes from the other desks.
    if (this.root && visible) {
      let gx = 0, gy = 0;
      if (this.state === "walk" || this.state === "pounce") { gx = -9; gy = 2; }
      else if (this.state === "crouch" || this.state === "bite" || this.state === "scared" ||
               this.state === "watch" || this.state === "sit" || this.state === "pet") {
        const r = this.root.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
        let dx = this._mouse.x - cx, dy = this._mouse.y - cy;
        if (this.face > 0) dx = -dx;   // svg is mirrored when she faces right
        gx = Math.max(-9, Math.min(9, dx * 0.02));
        gy = Math.max(-4, Math.min(6, dy * 0.02));
      }
      this._gx = (this._gx || 0) + (gx - (this._gx || 0)) * 0.12;
      this._gy = (this._gy || 0) + (gy - (this._gy || 0)) * 0.12;
      const px = this._gx.toFixed(1) + "px", py = this._gy.toFixed(1) + "px";
      if (px !== this._pxS) { this.root.style.setProperty("--px", px); this._pxS = px; }
      if (py !== this._pyS) { this.root.style.setProperty("--py", py); this._pyS = py; }
    }

    // cursor interplay (only when the player can see her; never from the shelf)
    if (visible && !this._perched) this._cursorGame(now);

    // state timeline
    if (now > this.stateUntil && this.state !== "walk") {
      if (this.state === "scratch") { /* leave a mark as we finish */ }
      this.state === "pet" ? this._enter("sit", 3) : null;
      if (now > (this._nextThink || 0)) this._think();
    }
    if (now > (this._nextThink || 0) && (this.state === "sit" || this.state === "watch")) this._think();

    // two-frame walk stepper (a single drawing per step, never assembled parts)
    if (this.state === "walk") this.root.classList.toggle("wstep", Math.floor(now / 260) % 2 === 1);
    // walking motion
    if (this.state === "walk" && this.tgt) {
      const dx = this.tgt.x - this.pos.x, dy = this.tgt.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.8) {
        this.tgt = null;
        if (this._afterWalk === "perch") {
          this._afterWalk = null;
          const px = this._clampX(this.pos.x);
          this._jump = { sx: this.pos.x, sy: this.pos.y, tx: px, ty: 27, t0: performance.now(), dur: 700 };
          this._perched = true;
          this._enter("pounce", 0.75);
          this._afterJump = Math.random() < 0.5 ? "curl" : "sit";
        }
        else if (this._afterWalk === "sleep") { this._afterWalk = null; this._enter("sleep", 16 + Math.random() * 22); }
        else if (this._afterWalk === "curl") { this._afterWalk = null; this._enter("curl", 20 + Math.random() * 26); }
        else if (this._afterWalk === "scratch") {
          this._afterWalk = null;
          this._enter("scratch", 3.2);
          const r = this.root.getBoundingClientRect();
          setTimeout(() => this._spawnScratch(r.left + r.width * (this.face > 0 ? 0.72 : 0.28), r.top + r.height * 0.9), 1400);
          try { const a = window.__audio; if (a) a.play("draw"); } catch (err) {}
        } else this._enter("sit", 4 + Math.random() * 4);
      } else {
        const sp = 0.16 * (this.mood === "afraid" ? 1.9 : 1); // vw per frame, real ground speed
        this.pos.x += (dx / d) * sp;
        this.pos.y += (dy / d) * sp * 0.7;
        this.face = dx >= 0 ? 1 : -1;
      }
    }
    // scared dash
    if (this.state === "scared" && this.tgt) {
      const dx = this.tgt.x - this.pos.x, dy = this.tgt.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) { this.pos.x += (dx / d) * 0.16; this.pos.y += (dy / d) * 0.10; this.face = dx >= 0 ? 1 : -1; }
      else this.tgt = null;
    }
    this._place();
  }

  _cursorGame(now) {
    const c = this._cursorPlane();
    const dx = c.x - this.pos.x, dy = c.y - (this.pos.y - 9); // body center ~9vh above feet
    const dist = Math.hypot(dx * vw(), dy * vh()); // px distance
    const fast = this._mouseV > 0.9;

    // petting: slow hand ON her while she's awake-ish
    // "a area de carinho do gato ta muito grande haha... eu to com o cursor fora dele
    // varios pixels e faço carinho nele sem querer." 9 * vw * .5 is EIGHTY-SIX PIXELS at
    // 1920, she is about seventy wide, so you were petting the desk on either side of
    // her and she was purring for it. Her body, and nothing else.
    // "carinho so quando o cursor esta encostado na imagem do gatinho": test the mouse
    // against her RENDERED body box, not a plane-distance (which drifted with --fit).
    const onHer = this.hitTest(this._mouse.x, this._mouse.y);
    if (onHer && !fast && this.state !== "scared" && this.state !== "pounce" && this.state !== "bite") {
      this._petLast = now;
      if (this.state !== "pet" && this._mouseV > 0.03 && now - (this._petExitAt || 0) > 700) {
        this._enter("pet", 1.8);
      } else if (this.state === "pet") { this.stateUntil = now + 1500; }
      this._furPart(c);
      return;
    } else if (this.state === "pet" && !onHer) {
      // linger: hands drift, she keeps leaning a moment before letting go
      if (now - (this._petLast || 0) < 650) { this.stateUntil = Math.max(this.stateUntil, now + 400); }
      else { this._petExitAt = now; }
      this._furPart(null);
    }

    // play: fast cursor near her -> crouch -> pounce -> nibble
    if (now < this._playCool) return;
    const near = dist < 26 * vw() * 0.5;
    if (fast && near && (this.state === "sit" || this.state === "walk" || this.state === "watch")) {
      this._enter("crouch", 1.1);
      this.face = dx >= 0 ? 1 : -1;
    } else if (this.state === "crouch" && now > this.stateUntil - 200) {
      // pounce to the cursor
      this.tgt = { x: this._clampX(c.x - (this.face > 0 ? 4 : -4)), y: this._clampY(c.y + 6) };
      this._enter("pounce", 0.6);
      const jump = this.tgt;
      const sx = this.pos.x, sy = this.pos.y, t0 = now;
      this._jump = { sx, sy, tx: jump.x, ty: jump.y, t0, dur: 480 };
    } else if (this.state === "pounce" || this._jump) {
      const j = this._jump;
      if (j) {
        const k = Math.min(1, (now - j.t0) / j.dur);
        this.pos.x = j.sx + (j.tx - j.sx) * k;
        this.pos.y = j.sy + (j.ty - j.sy) * k - Math.sin(k * Math.PI) * 7;
        if (k >= 1) {
          this._jump = null;
          if (this._afterJump) {
            const st = this._afterJump; this._afterJump = null;
            this._enter(st, st === "curl" ? 24 + Math.random() * 20 : 6 + Math.random() * 5);
            this._schedule(8 + Math.random() * 8);
            return;
          }
          if (dist < 12 * vw() * 0.5) {
            this._enter("bite", 0.55);
            try { window.__handNibble && window.__handNibble(this._mouse.x, this._mouse.y); } catch (err) {}
            try { const a = window.__audio; if (a) a.play("meow"); } catch (err) {}
          } else this._enter("sit", 3);
          this._playCool = now + 6000 + Math.random() * 8000;
        }
      }
    }
  }

  _furPart(c) {
    if (!this.root) return;
    const tufts = this.root.querySelectorAll(".cw-tuft");
    if (!c) { tufts.forEach(tf => tf.classList.remove("part")); return; }
    const r = this.root.getBoundingClientRect();
    tufts.forEach(tf => {
      const tb = tf.getBoundingClientRect();
      const d = Math.hypot(tb.x + tb.width / 2 - this._mouse.x, tb.y + tb.height / 2 - this._mouse.y);
      tf.classList.toggle("part", d < r.width * 0.16);
    });
  }
}
