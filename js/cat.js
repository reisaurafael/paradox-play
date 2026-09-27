/* ═══════════════════════════════════════════════════════════════════════════
   THE CAT: a living animal on the records desk (the game's soul and its scale
   ruler). A young orange tabby, white bib and socks, green eyes; his body next
   to the briefcase is how the player reads the size of the world.

   He has his own places on the paperwork desk: his cushion in the corner, the
   floor under the cabinet, and the warm spot beside HELA's core. He sleeps a
   lot, sits and grooms, walks between his places now and then, hunts the hand
   when it darts past him (and nibbles it), purrs under a slow hand, and plays
   with HELA's memory when she spins, batting at the Hours without touching them.
   Everything is rare and slow; nothing he does is constant.

   The drawing is static inked SVG in the desk's comic style (one light, top
   left). The engine is event driven: timers decide, CSS transitions move him,
   and the pointer is read only from real mouse moves. No frame loop.
   API: new CatEngine() · start() · stop() · pet() · startle() · setMood(m)
   · hitTest(x, y) · _enter(state, secs) · state · root · onMeow.
   ═══════════════════════════════════════════════════════════════════════════ */

const NS = "http://www.w3.org/2000/svg";
const VB_W = 900, VB_H = 700;

const INK = "#24150c";
const FUR_S = "#c26a2b", FUR_D = "#a4541f", STRIPE = "#b2531b";
const WHITE_S = "#d8c8ad", PINK = "#e58f8a";

/* ── drawing helpers ── */
// a filled shape with a heavier ink edge on its shadow side (bottom right)
const inked = (d, fill, w = 3.2) =>
  `<path d="${d}" transform="translate(1.8 2.6)" fill="${INK}"/><path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}"/>`;
const fillOnly = (d, fill, op = 1) => `<path d="${d}" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
const line = (d, col = INK, w = 2, op = 1) =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${op < 1 ? ` opacity="${op}"` : ""}/>`;
// a leg: fill, sock, and an open outline so its top melts into the body
const leg = (fillD, sockD, outD, fill = "url(#cwFur)", sock = "url(#cwWht)") =>
  `<path d="${fillD}" fill="${fill}"/><path d="${sockD}" fill="${sock}"/>` + line(outD, INK, 3);

function ear() {
  const d = "M -98 -34 L -110 -150 Q -108 -162 -96 -156 L -18 -88 Z";
  return inked(d, "url(#cwFurH)")
    + fillOnly("M -88 -52 L -98 -136 L -36 -88 Z", "#f2b0a2")
    + fillOnly("M -88 -52 L -98 -136 L -82 -118 L -72 -70 Z", "#d4857c", .6)
    + `<g stroke="#fff6e6" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"><path d="M -86 -58 q 2 -20 -6 -38"/><path d="M -76 -62 q 4 -18 -2 -32"/><path d="M -66 -66 q 6 -14 4 -26"/></g>`
    + line("M -106 -140 Q -105 -150 -99 -150", "#ffd08f", 3, .8);
}

/* The head, drawn once and shared by every pose (one character in every drawing).
   Local frame: centre (0,0), about 256 wide with the cheek tufts. */
function head(sleepy) {
  const H = "M 0 -94 C 64 -94 108 -56 112 -8 L 128 4 L 113 13 L 126 28 L 105 34 C 92 70 52 94 0 94 C -52 94 -92 70 -105 34 L -126 28 L -113 13 L -128 4 L -112 -8 C -108 -56 -64 -94 0 -94 Z";
  const EL = "M -86 -12 Q -68 -40 -36 -34 Q -16 -28 -14 -8 Q -22 16 -50 17 Q -80 15 -86 -12 Z";
  const ER = "M 86 -12 Q 68 -40 36 -34 Q 16 -28 14 -8 Q 22 16 50 17 Q 80 15 86 -12 Z";
  const eyes = sleepy
    ? `<g class="cw-sleepeyes">${line("M -84 -10 Q -52 10 -18 -10", INK, 5)}${line("M 18 -10 Q 52 10 84 -10", INK, 5)}${line("M -84 -10 l -9 -3 M 84 -10 l 9 -3", INK, 2.4)}</g>`
    : `<g class="cw-eyes">
      <g class="cw-eyeball">
        <path d="${EL}" fill="url(#cwIris)" stroke="${INK}" stroke-width="2"/>
        <g clip-path="url(#cwEL)">
          <path d="M -86 -12 Q -68 -40 -36 -34 Q -16 -28 -14 -8 Q -40 -26 -86 -12 Z" fill="#2f4a10" opacity=".45"/>
          <ellipse class="cw-pupil" cx="-50" cy="-8" rx="8.5" ry="19" fill="#120f08"/>
        </g>
        <circle cx="-60" cy="-19" r="7.5" fill="#fff"/><circle cx="-38" cy="5" r="3.2" fill="#fff" opacity=".85"/>
        ${line("M -90 -8 Q -70 -46 -32 -37 Q -14 -31 -10 -10", INK, 5.5)}${line("M -86 -4 l -9 -4 M -88 -13 l -9 -1", INK, 2.4)}
      </g>
      <g class="cw-eyeball">
        <path d="${ER}" fill="url(#cwIris)" stroke="${INK}" stroke-width="2"/>
        <g clip-path="url(#cwER)">
          <path d="M 86 -12 Q 68 -40 36 -34 Q 16 -28 14 -8 Q 40 -26 86 -12 Z" fill="#2f4a10" opacity=".45"/>
          <ellipse class="cw-pupil" cx="50" cy="-8" rx="8.5" ry="19" fill="#120f08"/>
        </g>
        <circle cx="40" cy="-19" r="7.5" fill="#fff"/><circle cx="62" cy="5" r="3.2" fill="#fff" opacity=".85"/>
        ${line("M 90 -8 Q 70 -46 32 -37 Q 14 -31 10 -10", INK, 5.5)}${line("M 86 -4 l 9 -4 M 88 -13 l 9 -1", INK, 2.4)}
      </g>
      <g class="cw-lid">${line("M -84 -6 Q -52 -34 -18 -8", INK, 5.5)}${line("M 18 -8 Q 52 -34 84 -6", INK, 5.5)}</g>
    </g>`;
  return `
    <g class="cw-earL">${ear()}</g>
    <g class="cw-earR"><g transform="scale(-1 1)">${ear()}</g></g>
    ${inked(H, "url(#cwFurH)", 3.4)}
    ${fillOnly("M 76 -72 C 100 -52 110 -30 112 -8 L 128 4 L 113 13 L 126 28 L 105 34 C 92 70 52 94 0 94 C -30 94 -58 84 -78 68 C -30 84 30 80 64 50 C 92 20 96 -30 76 -72 Z", FUR_S, .6)}
    ${line("M -92 -46 C -76 -78 -40 -92 -4 -92", "#ffd08f", 4, .85)}
    <g fill="${STRIPE}">
      <path d="M -3 -93 Q -11 -70 0 -46 Q 10 -70 3 -93 Z"/><path d="M -34 -87 Q -43 -66 -28 -50 Q -28 -68 -23 -89 Z"/><path d="M 34 -87 Q 43 -66 28 -50 Q 28 -68 23 -89 Z"/>
      <path d="M -112 -4 Q -92 -10 -76 -2 Q -94 2 -110 8 Z"/><path d="M -108 16 Q -90 12 -78 18 Q -92 22 -104 26 Z"/>
      <path d="M 112 -4 Q 92 -10 76 -2 Q 94 2 110 8 Z"/><path d="M 108 16 Q 90 12 78 18 Q 92 22 104 26 Z"/>
    </g>
    ${fillOnly("M -8 -60 Q 0 -66 8 -60 L 15 4 Q 44 4 60 28 Q 66 68 0 88 Q -66 68 -60 28 Q -44 4 -15 4 Z", "url(#cwWhtH)")}
    ${fillOnly("M 26 10 Q 52 16 60 30 Q 62 62 16 84 Q 44 58 26 10 Z", WHITE_S, .8)}
    ${eyes}
    <ellipse class="cw-blush" cx="-72" cy="24" rx="17" ry="8" fill="#f08a8a"/><ellipse class="cw-blush" cx="72" cy="24" rx="17" ry="8" fill="#f08a8a"/>
    <path d="M -12 20 Q 0 15 12 20 Q 13 25 8 30 L 2 36 Q 0 38 -2 36 L -8 30 Q -13 25 -12 20 Z" fill="${PINK}" stroke="${INK}" stroke-width="2.2"/>
    ${line("M -5 21 Q 0 19 5 21", "#fff", 1.8, .8)}
    <g class="cw-mouth-calm">${line("M 0 37 L 0 45 M 0 45 Q -10 56 -22 47 M 0 45 Q 10 56 22 47", INK, 2.6)}</g>
    ${sleepy ? "" : `<g class="cw-mouth-open">
      <path d="M -21 43 Q -10 40 0 45 Q 10 40 21 43 Q 17 74 0 78 Q -17 74 -21 43 Z" fill="#5e1f2a" stroke="${INK}" stroke-width="2.4"/>
      <path d="M -11 64 Q 0 57 11 64 Q 9 76 0 77 Q -9 76 -11 64 Z" fill="#e67f88"/>
      <path d="M -16 45 L -12 57 L -8 46 Z M 16 45 L 12 57 L 8 46 Z" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
    </g>
    <path class="cw-tongue" d="M -9 45 Q -10 70 0 72 Q 10 70 9 45 Q 0 50 -9 45 Z" fill="#e67f88" stroke="${INK}" stroke-width="2"/>`}
    <g fill="#b89a7c"><circle cx="-24" cy="38" r="2"/><circle cx="-33" cy="32" r="2"/><circle cx="-35" cy="43" r="2"/><circle cx="24" cy="38" r="2"/><circle cx="33" cy="32" r="2"/><circle cx="35" cy="43" r="2"/></g>
    <g fill="none" stroke="#fffaf0" stroke-width="2" stroke-linecap="round" opacity=".95">
      <path d="M -40 36 Q -100 26 -156 32 M -40 44 Q -98 46 -148 62 M -38 52 Q -88 64 -128 86"/>
      <path d="M 40 36 Q 100 26 156 32 M 40 44 Q 98 46 148 62 M 38 52 Q 88 64 128 86"/>
    </g>`;
}
// comic purr lines, shown only while he purrs
const purr = (x, y, flip) => `<g class="cw-purr" transform="translate(${x} ${y})${flip ? " scale(-1 1)" : ""}">${line("M 0 0 q -10 10 0 20 M -12 -6 q -14 16 0 32", INK, 2.6, .8)}</g>`;
// a claw fan for the swiping paw
const claws = (d) => `<g class="cw-claws">${line(d, INK, 4.4)}${line(d, "#fffaf0", 2.2)}</g>`;

/* ── the poses. Every pose stands on the same ground (y 690) and faces left;
      the engine mirrors the whole drawing when he faces right. ── */
function sitBody(raised) {
  const tail = "M 606 640 C 640 660 636 700 588 700 L 356 700 C 330 700 322 688 334 682 C 346 676 372 686 410 686 L 570 686 C 596 686 606 670 600 650 Z";
  const nearLeg = raised
    ? `<g class="cw-paw">
        ${inked("M 388 544 C 356 494 326 434 306 376 Q 298 350 316 342 Q 336 336 344 356 C 362 412 394 476 428 518 Z", "url(#cwFur)", 3)}
        ${fillOnly("M 306 376 Q 298 350 316 342 Q 336 336 344 356 L 348 370 Q 326 380 306 376 Z", "url(#cwWht)")}
        ${line("M 306 376 Q 298 350 316 342 Q 336 336 344 356 L 348 370", INK, 3)}
        <g fill="#e99a94"><ellipse cx="322" cy="360" rx="7" ry="6"/><circle cx="308" cy="352" r="3.4"/><circle cx="314" cy="344" r="3.4"/><circle cx="324" cy="342" r="3.4"/></g>
        ${line("M 372 470 C 356 440 340 408 330 380", "#ffd08f", 3, .6)}
        ${claws("M 304 350 q -8 -4 -6 -12 M 310 341 q -5 -7 0 -13 M 321 338 q -2 -8 4 -12")}
      </g>`
    : leg("M 374 520 C 372 580 372 630 372 668 Q 372 692 400 692 Q 428 692 428 668 C 428 630 428 580 430 520 Z",
          "M 372 624 L 372 668 Q 372 692 400 692 Q 428 692 428 668 L 428 624 Q 400 632 372 624 Z",
          "M 373 548 C 372 600 372 640 372 668 Q 372 692 400 692 Q 428 692 428 668 C 428 640 428 600 429 548")
      + line("M 391 692 v -11 M 409 692 v -11", INK, 1.8) + line("M 382 556 L 381 614", "#ffd08f", 3, .6);
  return `
    <ellipse class="cw-shadow" cx="472" cy="692" rx="176" ry="12" fill="#000" opacity=".24"/>
    <g class="cw-body">
      ${inked("M 452 458 C 522 418 608 448 622 540 C 634 616 604 684 532 690 L 430 690 Z", "url(#cwFur)")}
      ${fillOnly("M 600 500 C 626 560 624 640 580 680 C 560 690 540 690 520 690 C 580 660 604 580 600 500 Z", FUR_S, .6)}
      ${fillOnly("M 452 640 C 520 662 580 662 616 620 C 604 670 574 690 532 690 L 440 690 Z", FUR_S, .5)}
      <g fill="${STRIPE}"><path d="M 540 448 Q 576 470 590 508 Q 566 484 532 462 Z"/><path d="M 580 472 Q 606 502 612 542 Q 596 514 572 488 Z"/><path d="M 598 556 Q 614 584 608 618 Q 600 588 588 566 Z"/></g>
      ${line("M 470 452 C 520 430 570 440 600 470", "#ffd08f", 3.4, .7)}
      <path d="M 516 690 Q 512 666 546 664 Q 592 662 606 676 Q 612 692 594 694 L 520 694 Z" fill="url(#cwWht)" stroke="${INK}" stroke-width="2.8"/>
      ${line("M 572 694 v -10 M 588 692 v -9", INK, 1.8)}
      ${inked("M 392 372 C 372 400 356 450 348 520 C 340 580 330 640 338 672 C 344 690 364 694 390 692 L 520 692 C 548 694 566 686 566 660 C 568 610 552 540 530 470 C 514 420 494 390 470 372 Z", "url(#cwFur)")}
      <path d="M 330 692 Q 322 672 346 668 Q 370 666 380 680 Q 382 694 366 696 L 336 696 Q 326 696 330 692 Z" fill="url(#cwWht)" stroke="${INK}" stroke-width="2.8"/>
      ${line("M 346 696 v -9 M 360 696 v -9", INK, 1.6)}
      ${fillOnly("M 506 410 C 536 460 560 560 562 640 C 562 676 552 690 530 692 L 494 692 C 522 620 526 500 506 410 Z", FUR_S, .55)}
      ${line("M 372 420 C 356 470 350 530 354 590", "#ffd08f", 3.4, .7)}
      ${line("M 538 490 C 556 550 562 620 556 676", "#ffcf8a", 2.6, .45)}
      ${line("M 356 470 l 8 4 M 348 520 l 9 3 M 344 580 l 9 2 M 560 600 l -9 2 M 552 520 l -8 3 M 612 520 l -9 4 M 622 590 l -10 2", INK, 1.6, .55)}
      <g opacity=".16" fill="#fff1c9"><path d="M 364 440 q 10 30 4 70 q -14 -30 -4 -70 Z"/><path d="M 560 470 q 30 14 40 50 q -30 -20 -40 -50 Z"/></g>
      <g opacity=".12" fill="#7a300c"><path d="M 500 560 q 20 40 10 100 q -24 -40 -10 -100 Z"/><path d="M 560 600 q 30 10 44 40 q -30 -6 -44 -40 Z"/></g>
      <g fill="${STRIPE}"><path d="M 362 470 Q 380 472 392 488 Q 374 488 360 484 Z"/><path d="M 350 540 Q 370 540 384 554 Q 364 556 349 552 Z"/><path d="M 532 470 Q 512 474 500 490 Q 518 488 534 484 Z"/><path d="M 554 552 Q 532 552 520 566 Q 538 568 554 564 Z"/></g>
      ${leg("M 430 520 C 430 580 432 630 432 668 Q 432 692 456 692 Q 480 692 480 668 C 480 630 480 580 482 520 Z",
            "M 432 630 L 432 668 Q 432 692 456 692 Q 480 692 480 668 L 480 630 Q 456 636 432 630 Z",
            "M 431 552 C 432 600 432 640 432 668 Q 432 692 456 692 Q 480 692 480 668 C 480 640 480 600 481 552", FUR_S, WHITE_S)}
      ${line("M 449 692 v -10 M 464 692 v -10", INK, 1.8)}
      ${fillOnly("M 428 590 C 430 630 430 660 431 690 L 433 690 C 433 660 432 620 431 590 Z", INK, .5)}
      ${nearLeg}
      ${fillOnly("M 392 378 Q 430 398 468 382 Q 494 450 480 520 Q 474 556 458 576 L 448 560 L 438 578 L 428 560 L 416 576 Q 398 552 390 514 Q 378 450 392 378 Z", "url(#cwWht)")}
      ${fillOnly("M 440 396 Q 470 392 476 400 Q 490 460 478 522 Q 470 556 458 576 L 448 560 Q 470 500 440 396 Z", WHITE_S, .8)}
      <path class="cw-glow" d="M 386 372 C 354 420 342 500 348 580 C 352 640 364 676 382 690 L 400 690 C 380 640 372 520 400 380 Z" fill="url(#cwGlow)"/>
      <g class="cw-tail">${inked(tail, "url(#cwFur)", 3)}
        <g fill="${STRIPE}"><path d="M 540 686 Q 548 694 544 700 L 530 700 Q 534 694 528 686 Z"/><path d="M 480 686 Q 488 694 484 700 L 470 700 Q 474 694 468 686 Z"/><path d="M 420 686 Q 428 694 424 700 L 410 700 Q 414 694 408 686 Z"/><path d="M 356 700 C 332 700 324 690 334 682 C 344 678 358 684 366 686 Q 360 694 362 700 Z"/></g>
      </g>
      ${purr(330, 520, false)}${purr(630, 540, true)}
    </g>`;
}

function poseSit() {
  return `<g class="cw-pose cw-sit">${sitBody(false)}
    <g class="cw-head" transform="translate(438 282)"><g class="cw-headin">${head(false)}</g></g></g>`;
}
// sitting up with a paw raised: batting at HELA's Hours, holding the hand to nibble it, grooming
function poseBat() {
  return `<g class="cw-pose cw-bat">${sitBody(true)}
    <g class="cw-head" transform="translate(446 284) rotate(7)"><g class="cw-headin">${head(false)}</g></g></g>`;
}

function poseStand() {
  const legs = {
    farF: ["M 370 500 C 368 560 374 620 376 668 Q 376 690 396 690 Q 416 690 414 668 C 412 620 414 560 420 500 Z", "M 376 632 L 376 668 Q 376 690 396 690 Q 416 690 414 668 L 413 632 Q 394 638 376 632 Z", "M 372 560 C 374 620 376 640 376 668 Q 376 690 396 690 Q 416 690 414 668 C 412 640 413 600 416 560"],
    farH: ["M 560 500 C 590 500 606 520 604 556 L 600 668 Q 600 690 580 690 Q 560 690 562 668 L 560 596 C 548 570 546 530 560 500 Z", "M 561 632 L 562 668 Q 560 690 580 690 Q 600 690 600 668 L 601 632 Q 580 638 561 632 Z", "M 604 560 L 600 668 Q 600 690 580 690 Q 560 690 562 668 L 560 600"],
    nearF: ["M 322 490 C 322 560 328 620 330 666 Q 330 692 354 692 Q 378 692 376 666 C 374 620 376 560 384 490 Z", "M 330 626 L 330 666 Q 330 692 354 692 Q 378 692 376 666 L 375 626 Q 352 632 330 626 Z", "M 324 548 C 326 600 330 630 330 666 Q 330 692 354 692 Q 378 692 376 666 C 374 630 376 590 380 548"],
    nearH: ["M 604 500 C 648 498 670 526 664 566 L 656 668 Q 658 692 634 692 Q 610 692 612 668 L 610 600 C 594 574 590 530 604 500 Z", "M 611 630 L 612 668 Q 610 692 634 692 Q 658 692 656 668 L 657 630 Q 634 636 611 630 Z", "M 664 562 L 656 668 Q 658 692 634 692 Q 610 692 612 668 L 610 604"],
  };
  const L = (k, far) => leg(legs[k][0], legs[k][1], legs[k][2], far ? FUR_S : "url(#cwFur)", far ? WHITE_S : "url(#cwWht)");
  // a step is the same legs swung about the shoulder and the hip
  const frame = (cls, a) => ({
    far: `<g class="cw-frame ${cls}"><g transform="rotate(${-a} 394 520)">${L("farF", 1)}</g><g transform="rotate(${a} 590 520)">${L("farH", 1)}</g></g>`,
    near: `<g class="cw-frame ${cls}"><g transform="rotate(${a} 352 510)">${L("nearF")}</g><g transform="rotate(${-a} 630 500)">${L("nearH")}</g></g>`,
  });
  const fN = frame("cw-fN", 0), fA = frame("cw-fA", 13), fB = frame("cw-fB", -13);
  const body = "M 330 440 C 340 410 380 400 430 404 C 500 410 560 402 610 406 C 660 410 690 440 684 490 C 680 530 656 552 620 556 C 560 562 480 560 420 560 C 370 560 330 540 318 500 C 312 474 318 454 330 440 Z";
  const tail = "M 664 432 C 700 420 726 380 724 320 C 722 280 736 250 760 250 C 780 250 792 266 786 282 C 780 294 764 292 760 284 C 752 300 750 330 752 360 C 754 420 720 462 676 472 Z";
  return `<g class="cw-pose cw-stand">
    <ellipse class="cw-shadow" cx="490" cy="692" rx="220" ry="12" fill="#000" opacity=".22"/>
    <g class="cw-walker">
    <g class="cw-tail">${inked(tail, "url(#cwFur)", 3)}
      <g fill="${STRIPE}"><path d="M 718 380 Q 734 388 746 386 Q 742 400 724 396 Z"/><path d="M 722 330 Q 738 336 750 332 Q 750 346 732 346 Z"/><path d="M 728 282 Q 740 290 752 286 Q 752 298 736 298 Z"/><path d="M 760 250 C 780 250 792 266 786 282 C 780 294 764 292 760 284 Q 776 272 760 262 Z"/></g>
      ${line("M 700 420 C 716 400 724 370 724 330", "#ffd08f", 3, .6)}
    </g>
    ${fN.far}${fA.far}${fB.far}
    ${inked(body, "url(#cwFur)")}
    ${fillOnly("M 318 500 C 330 540 370 560 420 560 C 480 560 560 562 620 556 C 656 552 680 530 684 490 C 670 520 640 530 600 532 C 520 538 420 536 360 526 C 340 520 326 512 318 500 Z", FUR_S, .55)}
    ${line("M 350 422 C 400 404 520 410 620 408", "#ffd08f", 3.6, .75)}
    <g opacity=".16" fill="#fff1c9"><path d="M 400 430 q 40 -12 80 4 q -30 18 -80 -4 Z"/><path d="M 540 426 q 30 -8 56 6 q -26 12 -56 -6 Z"/></g>
    <g opacity=".12" fill="#7a300c"><path d="M 470 520 q 50 -10 90 6 q -40 20 -90 -6 Z"/></g>
    ${line("M 596 476 C 640 462 680 496 672 546", INK, 2.4, .7)}
    ${line("M 684 470 C 686 500 676 530 656 548", "#ffcf8a", 2.6, .45)}
    <g fill="${STRIPE}"><path d="M 452 406 Q 460 432 452 460 Q 442 432 444 406 Z"/><path d="M 502 408 Q 512 434 504 462 Q 494 434 494 408 Z"/><path d="M 552 406 Q 562 432 556 460 Q 546 434 544 406 Z"/><path d="M 604 408 Q 616 432 612 458 Q 600 434 596 410 Z"/><path d="M 648 426 Q 664 446 664 472 Q 650 452 640 432 Z"/></g>
    ${fillOnly("M 322 446 C 312 478 316 510 330 532 L 340 522 L 348 538 L 358 520 Q 342 490 346 450 Z", "url(#cwWht)")}
    ${fN.near}${fA.near}${fB.near}
    <g class="cw-head" transform="translate(300 352) scale(.9)"><g class="cw-headin">${head(false)}</g></g>
    </g>
  </g>`;
}

// low on the desk, weight on the haunches: hunting, or frightened with the ears flat
function poseCrouch() {
  return `<g class="cw-pose cw-crouch">
    <ellipse class="cw-shadow" cx="480" cy="692" rx="250" ry="12" fill="#000" opacity=".24"/>
    ${inked("M 380 612 C 360 640 334 664 300 670 Q 276 676 278 690 L 336 692 Q 364 690 384 668 C 398 652 408 632 410 616 Z", FUR_S, 3)}
    <g class="cw-rump">
      <g class="cw-tail">${inked("M 692 590 C 740 600 790 612 830 606 Q 852 602 852 584 Q 850 570 838 572 Q 830 574 834 586 Q 800 594 760 588 C 730 584 710 578 694 572 Z", "url(#cwFur)", 3)}
        <g fill="${STRIPE}"><path d="M 740 590 Q 746 596 744 604 L 734 603 Q 736 596 732 588 Z"/><path d="M 790 596 Q 796 602 794 608 L 784 608 Q 786 602 782 596 Z"/></g></g>
      ${inked("M 296 600 C 300 566 346 548 410 550 C 490 552 560 524 620 516 C 672 510 704 540 700 590 C 696 632 668 652 624 656 L 400 662 C 336 664 294 640 296 600 Z", "url(#cwFur)")}
      ${fillOnly("M 330 640 C 380 660 470 664 560 654 L 600 652 C 560 640 470 638 400 632 C 370 630 346 630 330 640 Z", "url(#cwWht)")}
      ${line("M 340 560 C 420 548 540 530 640 518", "#ffd08f", 3.6, .75)}
      <g fill="${STRIPE}"><path d="M 470 546 Q 478 570 470 594 Q 462 570 462 548 Z"/><path d="M 520 536 Q 530 560 522 586 Q 512 562 512 538 Z"/><path d="M 572 526 Q 582 550 576 576 Q 566 552 564 528 Z"/></g>
      ${inked("M 560 560 C 610 530 690 548 694 610 C 698 660 670 690 630 690 L 560 690 C 540 690 536 676 552 670 L 600 666 C 580 640 560 610 560 560 Z", "url(#cwFur)")}
      ${fillOnly("M 552 670 L 600 666 L 604 690 L 560 690 C 540 690 536 676 552 670 Z", "url(#cwWht)")}
      ${line("M 560 690 C 540 690 536 676 552 670 L 600 666", INK, 2.6)}
      <g fill="${STRIPE}"><path d="M 630 548 Q 660 566 670 598 Q 650 576 622 560 Z"/><path d="M 652 616 Q 672 630 676 656 Q 660 640 646 628 Z"/></g>
    </g>
    ${inked("M 350 610 C 330 640 300 664 262 672 Q 238 678 240 690 L 300 692 Q 330 690 352 668 C 368 650 380 630 384 612 Z", "url(#cwFur)", 3)}
    ${fillOnly("M 262 672 Q 238 678 240 690 L 294 692 Q 300 680 288 668 Z", "url(#cwWht)")}
    ${line("M 262 672 Q 238 678 240 690 L 294 692", INK, 2.6)}
    <g class="cw-head" transform="translate(262 566) scale(.9)"><g class="cw-headin">${head(false)}</g></g>
  </g>`;
}

// mid-air, reaching for the hand
function poseLeap() {
  return `<g class="cw-pose cw-leap">
    <ellipse class="cw-shadow" cx="470" cy="692" rx="150" ry="10" fill="#000" opacity=".14"/>
    ${inked("M 312 410 C 286 420 258 430 230 432 Q 206 434 208 420 Q 212 408 232 408 C 258 406 282 398 300 386 Z", FUR_S, 3)}
    ${inked("M 660 480 C 700 510 736 546 764 580 Q 780 600 766 608 Q 750 612 740 596 C 714 562 684 530 648 500 Z", FUR_S, 3)}
    <g class="cw-tail">${inked("M 690 494 C 740 500 800 506 860 496 Q 882 494 884 508 Q 882 522 862 524 C 800 532 740 532 684 542 Z", "url(#cwFur)", 3)}
      <g fill="${STRIPE}"><path d="M 760 504 Q 766 516 762 528 L 752 528 Q 756 516 752 504 Z"/><path d="M 820 500 Q 826 512 822 524 L 812 524 Q 816 512 812 500 Z"/></g></g>
    ${inked("M 286 398 C 316 356 396 354 468 376 C 556 402 628 438 680 478 C 718 508 712 560 668 566 C 618 572 556 540 478 510 C 402 482 330 468 298 448 C 278 434 276 414 286 398 Z", "url(#cwFur)")}
    ${fillOnly("M 296 440 C 330 470 420 486 490 512 C 560 540 610 560 650 566 C 600 574 540 548 470 524 C 400 500 330 482 296 440 Z", "url(#cwWht)")}
    ${line("M 320 374 C 400 360 520 396 640 450", "#ffd08f", 3.6, .75)}
    <g fill="${STRIPE}"><path d="M 470 378 Q 472 404 460 428 Q 456 402 462 378 Z"/><path d="M 526 394 Q 528 420 516 444 Q 512 418 518 394 Z"/><path d="M 580 416 Q 584 442 572 466 Q 566 440 572 416 Z"/></g>
    ${inked("M 640 500 C 676 540 700 590 726 636 Q 740 662 722 668 Q 702 672 696 650 C 676 606 648 566 612 532 Z", "url(#cwFur)", 3)}
    ${fillOnly("M 712 624 Q 736 646 728 664 Q 712 672 700 654 Z", "url(#cwWht)")}
    ${inked("M 330 430 C 300 452 262 478 222 490 Q 196 496 194 480 Q 194 466 214 462 C 250 454 282 432 306 408 Z", "url(#cwFur)", 3)}
    ${fillOnly("M 222 490 Q 196 496 194 480 Q 194 466 214 462 L 226 460 Q 234 478 222 490 Z", "url(#cwWht)")}
    ${claws("M 196 472 q -9 -1 -12 -8 M 195 483 q -9 1 -14 -3 M 204 492 q -6 5 -13 3")}
    <g class="cw-head" transform="translate(256 366) rotate(-10) scale(.9)"><g class="cw-headin">${head(false)}</g></g>
  </g>`;
}

// asleep on his side, belly to the room, paws curled
function poseSleep() {
  return `<g class="cw-pose cw-sleep">
    <ellipse class="cw-shadow" cx="480" cy="694" rx="270" ry="12" fill="#000" opacity=".22"/>
    <g class="cw-tail">${inked("M 640 640 C 700 626 770 632 820 652 Q 846 664 836 680 Q 824 690 806 680 C 766 660 712 656 660 664 Z", "url(#cwFur)", 3)}
      <g fill="${STRIPE}"><path d="M 720 640 Q 728 650 724 662 L 712 660 Q 716 650 710 640 Z"/><path d="M 770 646 Q 778 656 772 668 L 762 666 Q 766 656 760 646 Z"/><path d="M 806 680 C 820 688 834 684 836 680 Q 842 668 830 660 Q 830 674 806 680 Z"/></g></g>
    ${inked("M 330 600 C 300 590 270 590 246 596 Q 228 602 234 614 Q 242 622 258 618 C 282 612 306 614 332 620 Z", FUR_S, 3)}
    ${inked("M 600 620 C 640 612 690 614 722 624 Q 740 632 732 644 Q 722 652 706 644 C 676 634 636 634 600 640 Z", FUR_S, 3)}
    <g class="cw-body">
      ${inked("M 300 620 C 296 570 350 536 440 530 C 530 524 614 540 660 574 C 702 606 694 660 640 678 C 580 696 460 696 380 690 C 330 686 302 660 300 620 Z", "url(#cwFur)")}
      ${line("M 330 574 C 380 540 480 526 580 540", "#ffd08f", 3.6, .75)}
      <g fill="${STRIPE}"><path d="M 420 534 Q 426 556 420 576 Q 412 556 412 536 Z"/><path d="M 470 530 Q 478 552 472 574 Q 464 552 462 532 Z"/><path d="M 520 532 Q 530 554 524 576 Q 516 554 512 534 Z"/><path d="M 570 540 Q 580 560 574 580 Q 566 560 562 542 Z"/><path d="M 612 556 Q 624 574 620 594 Q 610 576 604 560 Z"/></g>
      ${fillOnly("M 340 650 C 380 612 470 600 560 612 C 610 620 634 646 614 668 C 574 690 450 692 380 684 C 350 680 334 668 340 650 Z", "url(#cwWht)")}
      ${fillOnly("M 360 676 C 440 690 560 686 612 668 C 574 690 450 692 380 684 Z", WHITE_S, .8)}
      ${inked("M 556 640 C 556 604 604 596 632 612 C 656 628 650 668 620 676 C 590 684 558 672 556 640 Z", "url(#cwFur)", 3)}
      ${inked("M 580 646 C 626 650 676 664 716 668 Q 742 672 740 688 Q 734 700 712 696 C 668 690 624 684 584 676 Z", "url(#cwFur)", 3)}
      ${fillOnly("M 708 668 Q 742 672 740 688 Q 734 700 712 696 Q 702 682 708 668 Z", "url(#cwWht)")}
      ${inked("M 350 624 C 318 626 282 640 258 650 Q 240 658 246 672 Q 256 680 272 674 C 298 664 326 656 356 654 Z", "url(#cwFur)", 3)}
      ${fillOnly("M 258 650 Q 240 658 246 672 Q 256 680 272 674 L 276 660 Q 268 650 258 650 Z", "url(#cwWht)")}
      <g fill="#e99a94"><circle cx="252" cy="664" r="3"/><circle cx="258" cy="672" r="3"/></g>
      <path class="cw-glow" d="M 300 620 C 296 570 350 536 440 530 C 380 550 330 580 322 640 Z" fill="url(#cwGlow)"/>
      ${purr(700, 560, true)}
    </g>
    <g class="cw-head" transform="translate(262 606) rotate(-18) scale(.88)"><g class="cw-headin">${head(true)}</g></g>
    <g class="cw-zzz" fill="#f6ecd4" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round">
      <path class="z1" d="M 150 470 h 22 l -16 20 h 18 v 6 h -30 l 16 -20 h -10 Z"/>
      <path class="z2" d="M 118 424 h 30 l -22 28 h 24 v 8 h -40 l 22 -28 h -14 Z"/>
    </g>
  </g>`;
}

// the croissant: nose under the tail
function poseCurl() {
  return `<g class="cw-pose cw-curl">
    <ellipse class="cw-shadow" cx="460" cy="694" rx="200" ry="11" fill="#000" opacity=".22"/>
    <g class="cw-body">
      ${inked("M 310 640 C 294 574 346 516 446 508 C 550 500 620 548 624 612 C 628 664 592 692 520 694 L 380 694 C 338 692 318 672 310 640 Z", "url(#cwFur)")}
      ${fillOnly("M 320 660 C 400 680 540 680 616 640 C 606 676 574 692 520 694 L 380 694 C 346 692 326 678 320 660 Z", FUR_S, .55)}
      ${line("M 340 560 C 380 524 460 506 540 518", "#ffd08f", 3.6, .75)}
      <g fill="${STRIPE}"><path d="M 470 510 Q 480 530 472 552 Q 462 530 462 510 Z"/><path d="M 530 516 Q 546 534 540 556 Q 528 536 522 518 Z"/><path d="M 580 540 Q 598 556 596 578 Q 582 560 572 544 Z"/><path d="M 612 590 Q 626 604 622 626 Q 612 608 604 596 Z"/><path d="M 410 512 Q 416 532 408 552 Q 400 532 402 514 Z"/></g>
      <path class="cw-glow" d="M 310 640 C 294 574 346 516 446 508 C 380 530 330 580 330 650 Z" fill="url(#cwGlow)"/>
      ${purr(640, 560, true)}
    </g>
    ${fillOnly("M 334 684 Q 332 668 352 666 Q 374 666 376 682 Q 372 694 352 694 Z", "url(#cwWht)")}${line("M 334 684 Q 332 668 352 666 Q 374 666 376 682", INK, 2.6)}
    ${fillOnly("M 380 688 Q 380 672 400 672 Q 420 672 420 686 Q 416 696 398 696 Z", "url(#cwWht)")}${line("M 380 688 Q 380 672 400 672 Q 420 672 420 686", INK, 2.6)}
    <g class="cw-head" transform="translate(390 606) rotate(-12) scale(.74)"><g class="cw-headin">${head(true)}</g></g>
    <g class="cw-tail">${inked("M 618 630 C 630 690 560 704 460 702 C 390 700 330 694 316 676 C 340 684 400 688 460 688 C 548 688 598 672 606 640 Z", "url(#cwFur)", 3)}
      <g fill="${STRIPE}"><path d="M 560 686 Q 566 694 562 702 L 550 702 Q 554 694 548 686 Z"/><path d="M 500 688 Q 506 696 502 702 L 490 702 Q 494 696 488 688 Z"/><path d="M 440 688 Q 446 696 442 702 L 430 701 Q 434 696 428 688 Z"/><path d="M 316 676 C 330 690 360 696 380 698 Q 374 690 378 686 C 356 684 334 682 316 676 Z"/></g></g>
  </g>`;
}

export function catSVG() {
  return `
<svg class="catw-svg" viewBox="0 0 ${VB_W} ${VB_H}" xmlns="${NS}" preserveAspectRatio="xMidYMax meet" stroke-linejoin="round">
<defs>
  <linearGradient id="cwFur" gradientUnits="userSpaceOnUse" x1="0" y1="330" x2="120" y2="700"><stop offset="0" stop-color="#f8b465"/><stop offset=".5" stop-color="#e98f3b"/><stop offset="1" stop-color="#c86d2a"/></linearGradient>
  <linearGradient id="cwFurH" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="#f9b868"/><stop offset=".55" stop-color="#ea933f"/><stop offset="1" stop-color="#d27933"/></linearGradient>
  <linearGradient id="cwWht" gradientUnits="userSpaceOnUse" x1="0" y1="330" x2="0" y2="700"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e9dbbf"/></linearGradient>
  <linearGradient id="cwWhtH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#efe3c9"/></linearGradient>
  <linearGradient id="cwGlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity=".95"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
  <radialGradient id="cwIris" cx=".5" cy=".62" r=".7"><stop offset="0" stop-color="#eef59a"/><stop offset=".45" stop-color="#a6d24a"/><stop offset="1" stop-color="#4d7f1c"/></radialGradient>
  <clipPath id="cwEL"><path d="M -86 -12 Q -68 -40 -36 -34 Q -16 -28 -14 -8 Q -22 16 -50 17 Q -80 15 -86 -12 Z"/></clipPath>
  <clipPath id="cwER"><path d="M 86 -12 Q 68 -40 36 -34 Q 16 -28 14 -8 Q 22 16 50 17 Q 80 15 86 -12 Z"/></clipPath>
</defs>
${poseSit()}${poseBat()}${poseStand()}${poseCrouch()}${poseLeap()}${poseSleep()}${poseCurl()}
</svg>`;
}

// his bed: a worn velvet cushion (the briefcase's velvet), dented where he sleeps, with his hairs on it
function bedSVG() {
  return `<svg viewBox="0 0 420 150" xmlns="${NS}" stroke-linejoin="round">
  <defs><linearGradient id="cbVel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a3342"/><stop offset=".55" stop-color="#65212e"/><stop offset="1" stop-color="#43141d"/></linearGradient></defs>
  <ellipse cx="212" cy="128" rx="200" ry="18" fill="#000" opacity=".3"/>
  <path d="M 22 92 C 14 60 90 34 210 32 C 330 30 410 56 400 92 C 392 124 320 136 210 136 C 100 136 30 124 22 92 Z" transform="translate(2 3)" fill="${INK}"/>
  <path d="M 22 92 C 14 60 90 34 210 32 C 330 30 410 56 400 92 C 392 124 320 136 210 136 C 100 136 30 124 22 92 Z" fill="url(#cbVel)" stroke="${INK}" stroke-width="3.2"/>
  <path d="M 70 82 C 90 60 160 50 214 50 C 280 50 340 62 354 84 C 330 104 270 110 212 110 C 150 110 94 102 70 82 Z" fill="#3a1018" opacity=".55"/>
  <path d="M 44 78 C 70 50 150 40 214 40 C 290 40 360 52 380 76" fill="none" stroke="#c98a8f" stroke-width="3" stroke-linecap="round" opacity=".45"/>
  <path d="M 36 96 C 70 124 150 130 212 130 C 290 130 360 122 390 98" fill="none" stroke="#caa06a" stroke-width="1.6" stroke-dasharray="6 5" opacity=".6"/>
  <g stroke="#f0a256" stroke-width="1.4" stroke-linecap="round" opacity=".8" fill="none">
    <path d="M 150 86 q 6 -2 10 1"/><path d="M 196 96 q 5 -3 9 0"/><path d="M 262 84 q 5 2 8 -1"/><path d="M 236 100 q 4 -3 8 -1"/><path d="M 120 100 q 5 -1 8 2"/>
  </g>
  <g stroke="#fff4e0" stroke-width="1.2" stroke-linecap="round" opacity=".7" fill="none"><path d="M 178 90 q 4 -2 7 0"/><path d="M 290 96 q 4 1 7 -1"/></g>
</svg>`;
}

/* ── the camera plane: he lives in the FIXED fit-scaled plane (2133x1200), so a
      unit is 1% of the plane, not of the window ── */
const UX = 2133 / 100, UY = 1200 / 100;
const W_UNITS = 26;                        // his box is 26 plane units wide
const BOX_W = W_UNITS * UX, BOX_H = BOX_W * VB_H / VB_W;

/* His places on the paperwork desk (plane units, feet point). The desk strip is
   left of the plane's origin; HELA's core owns its left half, the cabinet its top. */
const PLACES = {
  bed:   { x: -7.5, y: 95.5, lie: true },   // his cushion, the desk's bottom right corner
  shelf: { x: -13, y: 57, lie: true },      // the floor under the cabinet
  core:  { x: -19.5, y: 78, lie: false },   // beside HELA's core, where her light is warm
};
const BED = { x: -7.5, y: 96.6 };
const ROAM = { x0: -21, x1: -6 };          // how far a leap may carry him

const POSE_OF = { sit: "sit", pet: "sit", watch: "sit", groom: "bat", bat: "bat", bite: "bat",
  walk: "stand", crouch: "crouch", scared: "crouch", pounce: "leap", sleep: "sleep", curl: "curl" };
const WALK_SPEED = 5.2;                   // plane units per second, an unhurried stroll

export class CatEngine {
  constructor() {
    this.onMeow = null;
    this.mood = "calm";
    this.state = "sleep";
    this.place = "bed";
    this.pos = { x: PLACES.bed.x, y: PLACES.bed.y };
    this.face = -1;                         // -1 faces left (as drawn), 1 faces right
    this.root = null;
    this._timers = new Set();
    this._mouse = { x: -1, y: -1, t: 0, v: 0 };
    this._petMs = 0;
    this._huntCool = 0;
    this._batCool = 0;
    this._running = false;
    this._onMove = (e) => this._move(e);
  }

  /* ── lifecycle ── */
  start() {
    if (this._running) return;
    this._running = true;
    if (!this.root && !this._mount()) { this._later(() => { this._running = false; this.start(); }, 500); return; }
    window.addEventListener("mousemove", this._onMove, { passive: true });
    this._watchScene();
    this._watchCore();
    this._think(4 + Math.random() * 6);
  }
  stop() {
    this._running = false;
    window.removeEventListener("mousemove", this._onMove);
    this._timers.forEach(clearTimeout); this._timers.clear();
    if (this._sceneObs) this._sceneObs.disconnect();
    this._setPurr(false);
  }

  _mount() {
    const grid = document.querySelector(".game-grid");
    if (!grid) return false;
    const old = document.getElementById("cat"); if (old) old.remove();
    const bed = document.createElement("div");
    bed.id = "cat-bed"; bed.setAttribute("aria-hidden", "true");
    bed.innerHTML = bedSVG();
    const bw = 12.5 * UX;
    bed.style.width = bw + "px";
    bed.style.transform = `translate(${(BED.x * UX - bw / 2).toFixed(1)}px, ${(BED.y * UY - bw * 150 / 420).toFixed(1)}px)`;
    grid.appendChild(bed);
    const root = document.createElement("div");
    root.id = "cat"; root.setAttribute("aria-label", "The cat"); root.setAttribute("role", "img");
    root.innerHTML = catSVG();
    root.style.width = BOX_W.toFixed(1) + "px";
    root.style.height = BOX_H.toFixed(1) + "px";
    grid.appendChild(root);
    this.root = root;
    this.svg = root.querySelector(".catw-svg");
    this._poseEls = [...root.querySelectorAll(".cw-pose")];
    this._applyPose("sleep");
    this._place(0);
    return true;
  }

  /* ── public API ── */
  pet() {
    // a click on him: he leans into it wherever he is
    if (!this.root) return;
    this._petStart(2600);
  }
  // The one truth of "on the cat": the DRAWN pose's rect (hidden poses have none),
  // inset so the whole cursor ring must be over him.
  hitTest(x, y) {
    const r = this._poseRect(); if (!r) return false;
    const IN = 16;
    return x >= r.left + IN && x <= r.right - IN && y >= r.top + IN && y <= r.bottom - IN;
  }
  startle() {
    if (!this.root || this.state === "scared") return;
    this._cancelMove();
    this._enter("scared", 0);
    this.root.classList.add("jolt");
    this._later(() => this.root && this.root.classList.remove("jolt"), 420);
    if (this.onMeow && Math.random() < 0.5) this.onMeow();
    this._later(() => this._goTo("shelf", 1.8), 700);
  }
  setMood(m) {
    if (m === this.mood) return;
    this.mood = m;
    if (this.root) this.root.classList.toggle("mood-afraid", m === "afraid");
    if (m === "afraid" && this.place !== "shelf") this._later(() => this._goTo("shelf", 1.5), 400);
  }

  /* ── states ── */
  _enter(state, secs) {
    this.state = state;
    this._applyPose(state);
    clearTimeout(this._stateT);
    if (secs > 0) this._stateT = this._later(() => { if (this.state === state) this._settle(); }, secs * 1000);
  }
  _applyPose(state) {
    if (!this.root) return;
    const pose = POSE_OF[state] || "sit";
    const extra = { walk: "walking", pet: "petted purring", groom: "grooming", crouch: "hunting pupils-wide",
      scared: "ears-back pupils-wide", pounce: "pupils-wide", bite: "biting pupils-wide", bat: "batting pupils-wide",
      watch: "pupils-wide", sleep: "sleeping", curl: "sleeping" }[state] || "";
    const keep = ["mood-afraid", "by-core", "offstage", "face-right", "petted", "purring", "jolt"].filter((c) => this.root.classList.contains(c)
      && (c !== "petted" && c !== "purring" || state === "pet" || this._petting));
    this.root.className = ["cat-being", "pose-" + pose, extra, ...keep].filter(Boolean).join(" ");
    if (this._pose && this._pose !== pose) {
      // a new drawing lands with a little squash (the class goes, or it would hold every other loop)
      void this.root.offsetWidth;
      this.root.classList.add("shift");
      clearTimeout(this._shiftT);
      this._shiftT = setTimeout(() => this.root && this.root.classList.remove("shift"), 340);
    }
    this._pose = pose;
    this._rect = null;
    if (state !== "pet" && !this._petting) this._setPurr(false);
  }
  // after anything, he goes back to being a cat in his place
  _settle() {
    if (this.mood === "afraid") { this._enter("scared", 0); return; }
    const p = PLACES[this.place];
    if (p && p.lie) this._enter(Math.random() < 0.55 ? "curl" : "sleep", 0);
    else this._enter("sit", 0);
    this._think(10 + Math.random() * 14);
  }

  _setPurr(on) {
    if (on === !!this._purring) return;
    this._purring = on;
    try { const a = window.__audio; if (a && a.purrLoop) a.purrLoop(on); } catch (err) {}
    if (this.root) this.root.classList.toggle("purring", on);
  }

  /* ── the slow brain of a cat: every so often, maybe do something ── */
  _think(secs) {
    clearTimeout(this._thinkT);
    this._thinkT = this._later(() => this._decide(), secs * 1000);
  }
  _decide() {
    if (!this._running || !this.root) return;
    const busy = ["walk", "crouch", "pounce", "bite", "bat", "pet", "scared"].includes(this.state);
    if (busy || this._petting) { this._think(6); return; }
    if (!this._seen) { this._think(20 + Math.random() * 20); return; }   // nobody is watching: he naps on
    if (this.mood === "afraid") { this._think(12); return; }
    const r = Math.random();
    const lying = this.state === "sleep" || this.state === "curl";
    if (lying) {
      // mostly he sleeps on; now and then he gets up and sits a while
      if (r < 0.7) { this._think(24 + Math.random() * 24); return; }
      this._enter("sit", 0); this._flick();
      this._think(8 + Math.random() * 8);
      return;
    }
    if (r < 0.35) {
      // a stroll to another of his places
      const others = Object.keys(PLACES).filter((k) => k !== this.place);
      this._goTo(others[Math.floor(Math.random() * others.length)]);
    } else if (r < 0.55) {
      this._enter("groom", 3.2 + Math.random() * 2.5);
    } else if (r < 0.8 && PLACES[this.place] && PLACES[this.place].lie) {
      this._settle();
    } else {
      this._flick();
      if (this.onMeow && Math.random() < 0.15) this.onMeow();
      this._think(10 + Math.random() * 10);
    }
  }
  _flick() {
    if (!this.root) return;
    this.root.classList.remove("flick"); void this.root.offsetWidth;
    this.root.classList.add("flick");
    this._later(() => this.root && this.root.classList.remove("flick"), 950);
  }

  /* ── moving: a CSS transition carries him, the timer tells him he arrived ── */
  _goTo(name, speedMul = 1) {
    const p = PLACES[name]; if (!p || !this.root) return;
    this._cancelMove();
    const dx = p.x - this.pos.x, dy = p.y - this.pos.y, dist = Math.hypot(dx, dy * UY / UX);
    this.place = name;
    this.root.classList.toggle("by-core", name === "core");
    if (dist < 0.4) { this._settle(); return; }
    if (Math.abs(dx) > 0.3) this.face = dx > 0 ? 1 : -1;
    this._enter(this.state === "scared" ? "scared" : "walk", 0);
    const secs = dist / (WALK_SPEED * speedMul);
    this.pos = { x: p.x, y: p.y };
    this._place(secs);
    this._moveT = this._later(() => {
      this._moveT = null;
      if (name === "core" && Math.random() < 0.6) { this._enter("sit", 0); this._faceCore(); this._think(8 + Math.random() * 10); }
      else this._settle();
    }, secs * 1000 + 60);
  }
  _cancelMove() {
    if (this._moveT) { clearTimeout(this._moveT); this._timers.delete(this._moveT); this._moveT = null; }
    if (this.root && this.root.style.transitionDuration !== "0s") {
      // freeze where he is now: read the live position once and pin it
      const m = new DOMMatrixReadOnly(getComputedStyle(this.root).transform);
      this.pos = { x: (m.m41 + BOX_W / 2) / UX, y: (m.m42 + BOX_H) / UY };
      this._place(0);
    }
  }
  _place(secs) {
    if (!this.root) return;
    const tx = this.pos.x * UX - BOX_W / 2, ty = this.pos.y * UY - BOX_H;
    this.root.style.transitionDuration = secs > 0 ? secs.toFixed(2) + "s" : "0s";
    this.root.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
    this.root.classList.toggle("face-right", this.face > 0);
    this._rect = null;
  }
  _faceCore() {
    const core = document.getElementById("hela-brain-full");
    const r = core && core.getBoundingClientRect(), me = this._poseRect();
    if (!r || !me || !r.width) return;
    const want = (r.left + r.width / 2) > (me.left + me.width / 2) ? 1 : -1;
    if (want !== this.face) { this.face = want; this._place(0); }
  }

  /* ── the scene: he acts only while the paperwork desk is in view ── */
  _watchScene() {
    const cam = document.getElementById("cam");
    const upd = () => {
      const g = window.__game;
      const scene = (g && g.camera && g.camera.scene) || (cam && cam.dataset.scene) || "main";
      const seen = scene === "drawer";
      if (seen === this._seen) return;
      this._seen = seen;
      this._rect = null;
      if (this.root) this.root.classList.toggle("offstage", !seen);
      if (!seen) { this._petEnd(); }
    };
    upd();
    if (cam && window.MutationObserver) {
      this._sceneObs = new MutationObserver(upd);
      this._sceneObs.observe(cam, { attributes: true, attributeFilter: ["data-scene"] });
    }
  }
  _poseRect() {
    if (!this.root || !this._seen) return null;
    if (this._rect && performance.now() - this._rectT < 400) return this._rect;
    let rr = null;
    for (const gp of this._poseEls) { const r = gp.getBoundingClientRect(); if (r.width > 0) { rr = r; break; } }
    this._rect = rr; this._rectT = performance.now();
    return rr;
  }

  /* ── the pointer: gaze, petting, the hunt. Read only on real mouse moves. ── */
  _move(e) {
    const now = performance.now();
    const m = this._mouse, dt = Math.max(16, now - m.t);
    const v = m.t ? Math.hypot(e.clientX - m.x, e.clientY - m.y) / dt : 0;   // px per ms
    m.v = m.v * 0.7 + v * 0.3; m.x = e.clientX; m.y = e.clientY; m.t = now;
    if (!this._seen || !this.root || !this._running) return;
    const r = this._poseRect(); if (!r) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
    const dx = m.x - cx, dy = m.y - cy, dist = Math.hypot(dx, dy);
    this._gaze(dx, dy, dist);

    // petting: a slow hand on him
    const on = this.hitTest(m.x, m.y);
    if (on && m.v < 0.9 && !["pounce", "bite", "crouch", "scared", "walk"].includes(this.state)) {
      this._petMs += Math.min(dt, 80);
      if (this._petMs > 380) this._petStart(1500);
      else if (this._petting) this._petStart(1500);
      return;
    }
    if (!on) this._petMs = Math.max(0, this._petMs - dt);

    // the hunt: the hand darts past him while he is up, and he has not played lately
    const awake = ["sit", "watch", "groom"].includes(this.state);
    if (awake && m.v > 1.4 && dist < r.width * 1.6 && dist > r.width * 0.4 && now > this._huntCool && this.mood !== "afraid") {
      this._huntCool = now + 70000 + Math.random() * 60000;
      if (Math.random() < 0.6) this._hunt();
    }
  }
  _gaze(dx, dy) {
    if (!["sit", "watch", "pet", "bat", "crouch", "scared", "groom"].includes(this.state)) return;
    if (this.face > 0) dx = -dx;               // the drawing is mirrored when he faces right
    const px = Math.round(Math.max(-12, Math.min(12, dx * 0.03))), py = Math.round(Math.max(-5, Math.min(7, dy * 0.03)));
    if (px !== this._px) { this._px = px; this.root.style.setProperty("--px", px + "px"); }
    if (py !== this._py) { this._py = py; this.root.style.setProperty("--py", py + "px"); }
  }
  _petStart(ms) {
    if (!this.root) return;
    this._petting = true;
    const lying = this.state === "sleep" || this.state === "curl";
    if (!lying && this.state !== "pet") { this._cancelMove(); this._enter("pet", 0); }
    this.root.classList.add("petted");
    document.body.classList.add("cat-petting");     // the hand strokes him (app.css armPet)
    this._setPurr(true);
    clearTimeout(this._petT);
    this._petT = this._later(() => this._petEnd(), ms);
  }
  _petEnd() {
    if (!this._petting) return;
    this._petting = false; this._petMs = 0;
    clearTimeout(this._petT);
    if (this.root) this.root.classList.remove("petted");
    document.body.classList.remove("cat-petting");
    this._setPurr(false);
    if (this.state === "pet") this._enter("sit", 2.5 + Math.random() * 2);
  }
  _hunt() {
    this._cancelMove();
    this._enter("crouch", 0);
    const m = this._mouse;
    const r = this._poseRect(); if (!r) return;
    const want = m.x > r.left + r.width / 2 ? 1 : -1;
    if (want !== this.face) { this.face = want; this._place(0); }
    // the butt wiggle, then the leap at wherever the hand is by then
    this._later(() => {
      if (this.state !== "crouch" || !this._seen) return;
      const r2 = this._poseRect(); if (!r2) return;
      const scale = BOX_W / (this.root.getBoundingClientRect().width || BOX_W);   // viewport px -> plane px
      const hop = Math.max(-7, Math.min(7, (this._mouse.x - (r2.left + r2.width / 2)) * scale / UX * 0.6));
      const from = { ...this.pos }, to = { x: Math.max(ROAM.x0, Math.min(ROAM.x1, from.x + hop)), y: from.y };
      this._enter("pounce", 0);
      const a = (p, lift) => `translate(${(p.x * UX - BOX_W / 2).toFixed(1)}px, ${(p.y * UY - BOX_H - lift).toFixed(1)}px)`;
      const anim = this.root.animate([{ transform: a(from, 0) }, { transform: a({ x: (from.x + to.x) / 2, y: from.y }, 70) }, { transform: a(to, 0) }],
        { duration: 460, easing: "cubic-bezier(.3,.6,.4,1)" });
      this.pos = to; this._place(0);
      anim.onfinish = () => {
        if (this.state !== "pounce") return;
        const hand = this.hitTest(this._mouse.x, this._mouse.y) || Math.abs(this._mouse.x - (r2.left + r2.width / 2)) < r2.width;
        if (hand) {
          this._enter("bite", 0);
          try { window.__handNibble && window.__handNibble(this._mouse.x, this._mouse.y); } catch (err) {}
          if (this.onMeow) this.onMeow();
        }
        // then he sits a moment, pleased with himself, and strolls back to his place
        this._later(() => {
          if (this.state !== "bite" && this.state !== "pounce") return;
          this._enter("sit", 0); this._flick();
          this._later(() => { if (this.state === "sit") this._goTo(this.place); }, 1800);
        }, hand ? 1100 : 300);
      };
    }, 1300);
  }

  /* ── HELA's core: he watches her spin and bats at the Hours; she is never touched ── */
  _watchCore() {
    const bind = () => {
      const core = document.getElementById("hela-brain-full");
      if (!core) { this._later(bind, 3000); return; }
      core.addEventListener("pointerdown", () => this._coreSpins(), { passive: true });
    };
    bind();
  }
  _coreSpins() {
    if (!this._seen || this._petting || this.mood === "afraid") return;
    const now = performance.now();
    if (["walk", "crouch", "pounce", "bite", "scared"].includes(this.state)) return;
    const lying = this.state === "sleep" || this.state === "curl";
    if (lying) {
      // one ear turns to her; he does not get up for it every time
      this.root.classList.add("ear-flick");
      this._later(() => this.root && this.root.classList.remove("ear-flick"), 900);
      if (Math.random() < 0.7 || now < this._batCool) return;
    }
    if (now < this._batCool) { this._enter("watch", 3); this._faceCore(); return; }
    this._batCool = now + 45000 + Math.random() * 30000;
    this._enter("watch", 0); this._faceCore();
    this._later(() => {
      if (this.state !== "watch") return;
      if (this.place !== "core") { this._goTo("core", 1.4); this._later(() => this._batAtCore(), 600 + 1000 * Math.hypot(this.pos.x - PLACES.core.x, this.pos.y - PLACES.core.y) / (WALK_SPEED * 1.4)); }
      else this._batAtCore();
    }, 900);
  }
  _batAtCore() {
    if (!this.root || this._petting || this.state === "walk") return;
    this._faceCore();
    this._enter("bat", 2.4);
  }

  _later(fn, ms) {
    const t = setTimeout(() => { this._timers.delete(t); fn(); }, ms);
    this._timers.add(t);
    return t;
  }
}
