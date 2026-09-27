/* ═══════════════════════════════════════════════════════════════════════════
   THE AUCTION PHASE: the Test Room's opening phase, played in the real game.
   Inert outside auction games (gates on view.mode === "leilao"). Hooks the
   classic client from outside (the board_draft pattern): polls pendingReq and
   gives the four auction decisions a surface, answering through app.respond.

   Surfaces:
     leilao_bid      the window arch goes dark, the lots hang inside it, and
                     the SEALED BID slip waits on the counter: pin a lot, set
                     the amount on the wheels, press the seal.
     leilao_consumo  the case docket by the briefcase: activate or hold.
     leilao_allocate the machine docket: your rows by NAME, your dice by
                     class, click a die then a lit cell; the valve takes the
                     spare; Engage.
     leilao_aim      three directions, targets counted.
   Everything is unmounted the moment its decision resolves: nothing stays
   layered over the live game.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";

  const RARITY_COLOR = { rigged:"#a3552e", comum:"#b9a26a", incomum:"#2fa3a3",
    rara:"#8f6fd6", paradoxal:"#c34a4a" };
  const RARITY_LABEL = { rigged:"RIGGED", comum:"COMMON", incomum:"UNCOMMON",
    rara:"RARE", paradoxal:"PARADOXAL" };
  const snd = n => { try{ window.__audio && window.__audio.play(n); }catch(e){} };

  let catalog = null;
  let deviceFace = null;       // while a decision owns the device, it paints
  let bidSceneUntil = 0;       // (mantido para o resto do arquivo)
  let camReleased = false;     // o jogador virou a camera ele mesmo
  let ceremonyUntil = 0;       // the hall stays up while the room resolves
  let mounted = null;          // the live decision surface, one at a time
  let mountedReq = null;      // a CHAVE do pedido montado, nao o objeto
  /* O GUARDA COMPARAVA IDENTIDADE DE OBJETO e o cliente reconstroi o pedido a
     cada render pausado: `mountedReq === req` era falso sempre, entao a
     superficie inteira do leilao era destruida e remontada a cada tique.
     Medido: sete ciclos de remocao e criacao em tres segundos. A animacao de
     entrada nunca saia de 0% (a sala aparecia lavada e borrada), o hover
     morria antes de acontecer e o processador queimava a toa.
     A chave e o request_id, que e estavel por decisao. */
  const reqKey = (r) => r ? (r.request_id != null
    ? "id:" + r.request_id
      : r.kind + ":" + JSON.stringify(r.options || {}).length): null;
  let mounting = false;        // the async catalog fetch must never double-mount

  const css = document.createElement("style");
  css.textContent = `
  .lf-layer{ position:fixed; inset:0; pointer-events:none; z-index:70;
    font-family:'JetBrains Mono',monospace; }
  .lf-layer *{ box-sizing:border-box; }

  /* the arch interior during the auction: dark, the lots hanging */
  /* the offers waiting in the case: same paper, no question asked */
  .lf-casedock.is-idle{ pointer-events:none; z-index:4; }
  /* the hover readout used to live here. Two nights were spent moving it so it
     would stop covering the slip it described, and the real answer was that it
     should not exist: the offer draws its pieces now, so the box had nothing
     left to say and was only ever in the way. */
  .lf-casedock.is-idle .lf-offer{ cursor:default; opacity:.92;
    box-shadow:0 1px 0 #c9bb95, 0 2px 5px #0006; }
  .lf-casecount{ align-self:flex-end; margin-top:1px; padding:1px 6px;
    border-radius:2px; font:700 7.5px/1.4 Oswald,sans-serif;
    letter-spacing:.14em; color:#2c2418;
    background:linear-gradient(180deg,#d9b970,#a8853f);
    border:1px solid #3a2a12; box-shadow:0 2px 4px #0008; }

  /* the rivals' rigs on their badges: rows are public record */
  .lf-rig{ display:flex; flex-direction:column; gap:3px; padding:4px 8px 6px; }
  /* the rival's row is my row, one size down. --lf-s is set HERE and the whole
     grammar follows it: same houses, same marks, same empty sockets. */
  .lf-rigrow{ --lf-s:17px; display:flex; align-items:center; gap:2px;
    min-height:17px; }
  .lf-rigrow .lf-mcell{ border-radius:3px; }
  /* THE RIVAL'S BENCH. The dice sit under the rows, on their own line, because
     they answer a different question: the rows say what that machine can do,
     the dice say how hard it can hit. The die keeps its own art and its own
     tier scale, shrunk as a whole so a Tita still reads bigger than a Comum. */
  /* on a rival's file the same bar is ink on paper, not phosphor on glass */
  .lf-shield.is-rig{ position:static; display:flex; align-items:center; gap:4px;
    margin-top:3px; }
  /* the sigil came out washed on paper at 11px: ink it properly and give
     it the same weight the notches have, or the row loses its label. */
  .lf-shield.is-rig .lf-shsig{ color:#2c5344; opacity:1; }
  .lf-shield.is-rig .lf-shsig svg{ width:12px; height:12px;
    stroke-width:2.2; }
  .lf-shield.is-rig .lf-shpips i{ height:3px; background:#3f6d5726;
    box-shadow:inset 0 0 0 1px #3f6d5738; }
  .lf-shield.is-rig .lf-shpips i.is-on{ background:#3f6d57; box-shadow:none; }
  .lf-rigdice{ display:flex; align-items:center; gap:2px; margin-top:2px;
    padding-top:3px; border-top:1px solid #00000018; min-height:14px; }
  .lf-rigdie{ display:inline-flex; width:15px; height:15px;
    align-items:center; justify-content:center; }
  /* a rival's die is a BODY with no face: the count is public record,
     the faces are not. Drawn as an object so the bench reads as a bench. */
  .lf-rigdie.is-hidden{ border-radius:3px; background:#00000014;
    box-shadow:inset 0 0 0 1px #0000002e; width:11px; height:11px; }
  .lf-rigdie .die{ transform-origin:center;
    zoom:.36;                       /* scales the die AND its tier transform */
  }
  .lf-rigrow.is-sealed{ opacity:.55; }
  .lf-rigrow.is-sealed .lf-mcell{ background:repeating-linear-gradient(45deg,
    #e8cbb4 0 3px, #d8a488 3px 6px); border-color:#a8552e; }

  /* THE CAMERA IS THE GAME'S, NOT MINE. I pushed the world in on the market
     scene to make a lot card bigger (--cam-s:1.3), and it ate the table: the
     chart, the Merchant and the secret harbour all went off screen. Framing is
     a call that stays with the player; the auction does not get to take it. */


  /* THE WINDOW RETUNES: the auction house lives INSIDE the game's own
     portal (#market-zone). The wagon steps out, the floor steps in. */
  /* the wagon's STAGE hosts the auction: stock steps out, lots step in;
     the booth (canopy, lanterns) stays exactly where it always stood */
  .market-zone.leilao-tuned .market-main{ display:none !important; }
  .market-zone.leilao-tuned .market-side-signs{ display:none !important; }
  .market-zone.leilao-tuned .market-sign{ display:none !important; }
  .market-zone.leilao-tuned .market-title-text{ visibility:hidden; }
  /* A JANELA E FIXA, O CONTEUDO DELA TROCA.
     A sala nao pode ser medida em porcentagem da zona: a zona muda de tamanho
     com a camera e o arco NAO, porque o arco e uma caixa fixa de 1100x700
     ancorada em left:50% margin-left:-550px bottom:-74px (app.css:5038).
     Entao a sala usa A MESMA ancora do arco e recorta exatamente o vao, que o
     proprio jogo ja declara em .portal-fx .pt-rim (app.css:5048):
       left 11.6%  -> -550 + 127.6 = -422px
       largura 76.8% de 1100       =  845px
       bottom 14.3% -> -74 + 100.1 =   26px
       altura 74.6% de 700         =  522px
     e a mesma curva do rim, para a sala terminar onde a pedra comeca. */
  /* MAIS 7px PARA CADA LADO, DE PROPOSITO. Encaixada exatamente no vao, a
     sala deixava passar uma tira fina do interior que o portal.svg traz
     desenhado junto com a moldura, e essa tira e o mercado: era ele que o
     eu continuava vendo por tras do leilao. Como o arco fica NUMA CAMADA
     ABAIXO da sala, avancar alguns pixels come um farrapo de pedra que
     ninguem enxerga e mata a fresta de vez. */
  /* A SANGRIA MORREU, E COM ELA O DEFEITO DAS BEIRADAS.
     Eu tinha alargado a sala 7px para cada lado como remendo, para tapar a
     tira do mercado que o portal.svg trazia desenhada. O remendo criou outro
     problema: a elipse da sala deixou de ser a MESMA elipse do arco, e nas
     duas pontas, onde as duas curvas se separam, sobrava um fio de vao sem
     sala atras. Era isso que aparecia como um canto mais apagado e mais
     transparente que o resto.
     Agora o remendo nao e mais necessario, porque o mercado saiu de cena de
     verdade (o .portal-bg fica display:none e a pedra vem do portalframe.svg
     por cima). Entao a sala volta a medir EXATAMENTE o vao declarado no
     .pt-rim, e as duas curvas voltam a ser a mesma curva. */
  /* A FRESTA VOLTOU, E POR UM MOTIVO NOVO. Medida pixel a pixel a sala bate
     exatamente no retangulo do .pt-rim, mas o .pt-rim e uma ELIPSE de CSS
     matematica e a pedra do arco e PINTADA A MAO: as duas curvas nunca sao
     EXATAMENTE a mesma curva, e nos ombros do arco (nem no topo, nem embaixo)
     a pedra de verdade fica um pouco para fora da elipse perfeita. Antes essa
     sangria era perigosa porque o portal.svg trazia a banca desenhada junto
     e vazar mostrava ela. Agora a moldura (.lf-frame, portalframe.svg) e SO
     pedra e e desenhada POR CIMA da sala: sangrar um pouco deixa de ter
     custo, porque o excesso fica escondido atras da pedra solida. */
  .lf-house{ position:absolute; left:50%; margin-left:-436px; width:873px;
    bottom:20px; height:534px;
    pointer-events:auto; display:flex; flex-direction:column;
    align-items:center; gap:6px; padding:12px 10px 0;
    /* UM FUNDO OPACO POR BAIXO DE TUDO. As listras de madeira aqui eram
       heranca da carreta e nao pintavam nada de util, porque a sala cobre o
       elemento inteiro. O que importa e a garantia: qualquer pixel do recorte
       que o desenho da sala nao alcance ainda assim e escuro e OPACO, e nunca
       um buraco por onde se ve o que esta atras da janela. */
    background:#150f0a;
    border:0; border-radius:50% 50% 0 0 / 100% 100% 0 0;
    box-shadow:inset 0 -30px 40px -20px #000d, inset 0 0 44px #000b;
    overflow:hidden; z-index:3; }
  .lf-house .lf-marquee{ margin-top:13%; }
  .lf-house .lf-floor{ flex:1; align-items:flex-end; padding-bottom:60px; }
  /* two hanging lanterns pour the warm light the lots stand in */
  .lf-lamp{ position:absolute; top:20%; width:16px; height:96px;
    pointer-events:none; }
  .lf-lamp.l{ left:9%; } .lf-lamp.r{ right:9%; }
  .lf-lamp::before{ content:""; position:absolute; left:7px; top:0;
    width:2px; height:64px; background:#3a3226; }
  .lf-lamp::after{ content:""; position:absolute; left:1px; top:62px;
    width:14px; height:19px; border-radius:3px 3px 6px 6px;
    background:linear-gradient(180deg,#57452a 30%,#8a6f3c 60%,#2c2216);
    box-shadow:inset 0 -5px 7px rgba(242,208,107,.95),
      0 0 34px 14px rgba(214,178,110,.30),
      0 10px 44px 22px rgba(214,178,110,.12); }
  /* the rostrum: a wooden counter the lots rest on */
  .lf-rostrum{ position:absolute; left:0; right:0; bottom:0; height:34px;
    pointer-events:none;
    background:linear-gradient(180deg,#8a6f3c 0 3px, #57452a 3px 42%,
      #3a2c1c 42% 100%);
    box-shadow:0 -6px 16px #000b; }
  /* the pool of warm light the lots stand in */
  .lf-house::after{ content:""; position:absolute; left:10%; right:10%;
    top:38%; bottom:8%; pointer-events:none;
    background:radial-gradient(70% 60% at 50% 62%,
      rgba(214,178,110,.13), transparent 70%); }
  .lf-rostrum::after{ content:""; position:absolute; inset:6px 0 0;
    background:repeating-linear-gradient(90deg, transparent 0 64px,
      #00000030 64px 66px); }
  .lf-marquee{ display:flex; align-items:baseline; gap:10px; padding:4px 16px;
    font:700 10px/1 Oswald,sans-serif; letter-spacing:.28em; color:#d8c9a3;
    background:#14100bd8; border:1px solid #57452a; white-space:nowrap; }
  .lf-marquee b{ color:#c9a45c; letter-spacing:.18em; }
  /* the auctioneer's chalkboard: last round's revealed hands, in chalk */
  /* ══ O QUADRO NEGRO DA RODADA ═════════════════════════════════════════
     E o painel de ambiente onde a mesa acompanha o pregao: quem deu quanto em
     que lote na rodada que passou. Ele existia como um cartaozinho de 158px
     encostado no canto, com uma unica linha de titulo e o texto em cursiva
     apertada, e nao dava para ler de relance.
     Agora ele e MOBILIA: quadro de giz de verdade na parede, com moldura de
     madeira, apagador na bandeja e o po do giz que nunca sai. E o unico lugar
     da sala que fala do que os OUTROS fizeram, entao ele merece o tamanho de
     uma coisa que se le em pe do outro lado do salao. */
  .lf-board{ position:absolute; left:3.4%; top:16%; width:196px;
    padding:0 0 12px; transform:rotate(-1.4deg); z-index:5;
    background:linear-gradient(176deg,#20262a 0%,#171d20 42%,#10161a 100%);
    border:5px solid #6b5433; border-radius:3px;
    box-shadow:inset 0 0 22px #000c, inset 0 2px 0 #ffffff10,
      0 8px 18px -4px #000b; }
  /* o po de giz que fica no fundo, porque quadro usado nunca fica limpo */
  .lf-board::after{ content:""; position:absolute; inset:5px;
    pointer-events:none; opacity:.28; border-radius:2px;
    background:
      radial-gradient(60% 40% at 22% 30%, #cfe0d8 0%, transparent 62%),
      radial-gradient(50% 35% at 74% 62%, #b9cfc6 0%, transparent 66%); }
  .lf-board::before{ content:"RODADA ANTERIOR"; display:block;
    padding:5px 9px 4px; margin-bottom:2px;
    font:700 7px/1 Oswald,sans-serif; letter-spacing:.26em;
    color:#0e1512; background:linear-gradient(180deg,#8a6f42,#6b5433);
    box-shadow:0 1px 0 #ffffff22 inset, 0 2px 4px #0007; }
  .lf-board span{ display:block; margin:0 10px; padding:2px 0;
    font:400 13px/1.35 'Caveat','Segoe Script',cursive;
    color:#eef0e2; text-shadow:0 0 4px #ffffff28;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    border-bottom:1px dashed rgba(220,235,225,.14); }
  .lf-board span:last-child{ border-bottom:0; }
  /* a bandeja e o apagador: e ela que faz o objeto virar quadro e nao cartaz */
  .lf-board .lf-bcalha{ position:absolute; left:-2%; right:-2%; bottom:-9px;
    height:9px; border-radius:0 0 3px 3px;
    background:linear-gradient(180deg,#8a6f42,#5a4526 62%,#3d2f1a);
    box-shadow:0 3px 6px #0009; }
  .lf-board .lf-bcalha i{ position:absolute; right:14%; top:-5px;
    width:26px; height:8px; border-radius:2px;
    background:linear-gradient(180deg,#d8cdb4,#9d917a);
    box-shadow:0 1px 2px #0008; }
  .lf-board:empty{ display:none; }
  .lf-floor{ display:flex; align-items:stretch; justify-content:center;
    gap:14px; width:94%; }
  /* the room is not empty: a brass plate per traveler still in the hall
     (presence only, nobody sees a number) */
  .lf-plates{ display:flex; gap:6px; flex-wrap:wrap; justify-content:center;
    margin-top:2px; }
  .lf-plate2{ display:inline-flex; align-items:center; gap:5px;
    padding:3px 9px; border-radius:2px;
    font:700 7.5px/1 Oswald,sans-serif; letter-spacing:.16em;
    text-transform:uppercase; color:#e8dfc8;
    background:linear-gradient(180deg,#2c2216,#1b140c);
    border:1px solid #57452a;
    box-shadow:inset 0 1px 0 #ffffff10, 0 3px 7px #0008; }
  /* O DISCO DE CERA DO ASSENTO. Apagado o tempo todo; acende no instante em
     que aquele viajante lacra. E o unico canal publico do pregao as cegas:
     diz QUEM fechou e nunca POR QUANTO. */
  .lf-waxdot{ width:9px; height:9px; border-radius:50%; text-decoration:none;
    margin-left:2px; flex:0 0 auto;
    background:radial-gradient(circle at 36% 32%, #3a2a2c, #241a1c);
    box-shadow:inset 0 0 0 1px #00000066; transition:all .28s ease; }
  .lf-plate2.is-sealed .lf-waxdot{
    background:radial-gradient(circle at 36% 30%, #d4515c, #8f2530 60%, #5e141c);
    box-shadow:0 0 8px rgba(190,55,66,.85), inset 0 -1px 2px rgba(0,0,0,.5);
    animation:lfWaxDrop .4s cubic-bezier(.2,1.9,.4,1); }
  .lf-plate2.is-sealed{ border-color:#8f2530; }
  .lf-plate2 i{ width:7px; height:7px; border-radius:50%;
    background:var(--s,#b9a26a); box-shadow:0 0 7px var(--s,#b9a26a); }
  /* THE SCALE PASS. Everything in this phase was drawn at a size you cannot
     follow: the lot was 170px with a 12.5px name, the socket glyph was 12px,
     the caption 5px. A house is the thing you read all game, so it gets a body
     you can see across the desk, and the card grows to hold it. */
  /* ══ A ZONA DO LEILAO ═════════════════════════════════════════════════
     Ocupa o mesmo lugar do plano que o mercado (a janela e uma so), mas e
     outro elemento: enquanto ela esta de pe a carreta some inteira, e nao ha
     nada empilhado por cima de nada. */
  /* a zona irma continua existindo so como gaveta vazia de limpeza */
  .leilao-zone{ display:none !important; }
  /* o conteudo da carreta some; o ARCO e a parede ficam */
  /* O PAPEL DE PAREDE APAGADO ERA ISTO, E ERA MEU.
     Eu pintava o #market-zone de preto e ainda jogava uma sombra interna de
     44px nele durante o leilao. Acontece que essa zona mede 1600x450: ela nao
     e a janela, ela e uma faixa enorme do quarto, e eu estava passando tinta
     preta por cima do papel de parede inteiro nessa faixa. Medido: o
     .game-grid::after continuava pintando normalmente, por isso a medicao
     dizia que estava tudo bem enquanto a tela dizia o contrario. A medida
     estava certa e a pergunta e que estava errada.
     A zona nao precisa de fundo nenhum: quem tapa o que tem que ser tapado e
     a propria sala, dentro do vao, e a pedra vem por cima. */
  body.lf-scene #market-zone{ background:transparent !important;
    box-shadow:none !important; border-color:transparent !important; }
  /* SOME TUDO QUE E CARRETA, FICA TUDO QUE E JANELA. Esconder so o
     .market-body deixava o toldo, a prateleira, a lanterna e o aviso na tela,
     porque sao outros filhos. A regra e por exclusao: some todo filho do
     #market-zone que nao seja o arco, o brilho do arco, a janela secreta ou a
     minha sala. */
  /* SOME TUDO QUE E CARRETA, EM QUALQUER PROFUNDIDADE. O seletor por filho
     direto nao alcancava o toldo, a prateleira e a lanterna, que estao
     aninhados. Some por CLASSE, onde quer que estejam. */
  body.lf-scene #market-zone .market-body,
  body.lf-scene #market-zone .zone-title,
  body.lf-scene #market-zone .market-meta,
  body.lf-scene #market-zone .vardo-roof,
  body.lf-scene #market-zone .market-decor,
  body.lf-scene #market-zone .market-side-signs,
  body.lf-scene #market-zone .wagon-life,
  body.lf-scene #market-zone .md-lantern,
  body.lf-scene #market-zone .market-sign{ display:none !important; }
  /* A PILHA: a sala por cima do que sobrou da carreta, e o ARCO por cima de
     tudo, porque ele e a moldura da janela e nao conteudo dela. */
  /* ══ PAREDE, MOLDURA E CONTEUDO: TRES COISAS SEPARADAS ═════════════════
     Esta e a separacao que faltava e que eu vinha remendando com sangria de
     pixel. O portal.svg desenha a banca do mercador E a pedra no mesmo
     arquivo, entao enquanto ele fosse a janela inteira havia sempre uma
     banca pintada por baixo do leilao, aparecendo em qualquer fresta.

     Agora, durante o leilao:
       - a PAREDE continua sendo do quarto e ninguem toca nela;
       - o .portal-bg (que traz a banca junto) SOME, porque a banca nao e o
         conteudo desta hora;
       - a SALA ocupa o vao;
       - e o .lf-frame desenha por cima so a PEDRA (portalframe.svg, o mesmo
         arquivo sem o miolo, com a abertura transparente).
     Assim a moldura fica sendo moldura de verdade e o conteudo do vao pode
     ser qualquer um sem nunca lutar com o desenho de outro. */
  body.lf-scene #market-zone > .portal-bg{ display:none !important; }
  body.lf-scene .lf-house{ z-index:6 !important; }
  .lf-frame{ position:absolute; left:50%; margin-left:-550px; bottom:-74px;
    width:1100px; height:700px; z-index:8; pointer-events:none;
    background:url(../assets/portalframe.svg?v1) 0 0 / 100% 100% no-repeat; }
  body.lf-scene #market-zone > .portal-fx{ z-index:9 !important;
    opacity:1 !important; }

  /* ══════════════════════════════════════════════════════════════════════
     A SALA DE EVIDENCIAS. Tudo desenhado em CSS e SVG, como o pip-boy e o
     mercado. Duas familias que nao se misturam: o DEPOSITO e permanente,
     frio, de ferro e concreto; o PREGAO foi montado hoje, de papelao, giz,
     latao e barbante.
     ══════════════════════════════════════════════════════════════════════ */

  /*, o fundo da sala, o SVG autorado, */
  /* O FUNDO E FUNDO, E AGORA E DE OUTRA MATERIA. O desenho ja nasce frio,
     escuro e com a penumbra por cima, entao o CSS parou de escurecer de novo:
     duas escuridoes empilhadas viravam lama e comiam as arestas de aco que
     custaram caro para desenhar. Aqui o filtro so afunda um pouco o contraste
     para o papelao quente do lote nunca disputar leitura com o armario. */
  /* O JOGO INTEIRO PASSA POR UM VEU QUENTE (world-haze, grain, vignette) que
     eu nao controlo daqui, e ele come diferenca de COR. Entao a separacao
     entre cenario e lote nao pode depender de matiz: ela e feita em VALOR.
     O deposito desce para perto da silhueta e o lote fica sendo a unica coisa
     clara da janela. */
  /* A SALA TRANSBORDA A JANELA DE PROPOSITO. A 104% ela terminava quase
     exatamente na borda e os ultimos pixels da esquerda e da direita ficavam
     mostrando o vazio por tras, o que dava a impressao de a opacidade acabar
     antes da hora. Com 116% sempre sobra desenho para alem do vao, e a
     .lf-house ainda leva por baixo a cor da parede do deposito, para que
     nenhum pixel do recorte possa ser transparente. */
  .lf-room{ position:absolute; left:-8%; right:-8%; top:0; bottom:0;
    width:116%; height:100%; object-fit:cover; object-position:50% 100%;
    pointer-events:none; z-index:0;
    filter:brightness(.58) saturate(.72) contrast(1.08); }
  /* o veu virou so o ar da sala: escuro no alto, quente onde os lotes estao */
  .lf-house::before{ content:""; position:absolute; inset:0; z-index:1;
    pointer-events:none;
    background:
      radial-gradient(44% 40% at 46% 74%, rgba(255,214,150,.10), transparent 74%),
      linear-gradient(180deg, rgba(6,9,10,.42) 0%, rgba(6,9,10,0) 38%); }

  /*, o pregao improvisado por cima do deposito, */
  /* A REGUA DO PREGAO, na gramatica da regua de meta do mercado: a chave em
     cima, pequena e apagada, e o valor embaixo, grande. Encostada no pe da
     janela, onde o olho ja passa ao sair da mesa. */
  /* A PLACA DE RODADA/MOEDA/BOLSO/LOTES MORREU AQUI, e a licao e minha: eu
     peguei a regua de meta do mercado e pendurei uma barra de dados por cima
     da cena. O mercado pode, porque a regua dele e a placa de uma banca. Aqui
     nao existe placa nenhuma pendurada num deposito, entao aquilo era HUD
     colado em cima de um lugar, e HUD colado quebra a imersao que o resto do
     jogo custou caro para construir.
     Os quatro fatos continuam devendo aparecer, e cada um vai achar um corpo
     que ja pertence a sala: a rodada e a propria placa de papelao pendurada,
     a moeda e o glifo no bolso do jogador, o bolso e a trilha do lance
     (que ja mostra o total em tracos), e quantos lotes restam e o numero de
     caixas em cima da mesa, que esta la para ser contado.
     Nao inventar mostrador: deixar a sala dizer. */
  /* 13% e nao 7%: a janela e um arco e o topo dela e estreito, entao a placa
     pendurada la em cima batia na curva da pedra e ficava cortada. */
  .lf-placard{ position:absolute; left:50%; top:13%; z-index:6;
    transform:translateX(-50%) rotate(-.8deg);
    padding:5px 16px 6px; text-align:center; pointer-events:none;
    font:700 9px/1.15 Oswald,sans-serif; letter-spacing:.24em; color:#4a3a22;
    background:linear-gradient(178deg,#c9b58c,#ab9772);
    border:1px solid #7a6a44; border-radius:2px;
    box-shadow:0 5px 11px #0009, inset 0 1px 0 #ffffff44; }
  .lf-placard b{ display:block; margin-top:2px; font-size:12px;
    letter-spacing:.18em; color:#2f2416; }
  .lf-placard::before, .lf-placard::after{ content:""; position:absolute;
    top:-14px; width:1px; height:14px; background:#8a7a54; }
  .lf-placard::before{ left:22%; transform:rotate(9deg); }
  .lf-placard::after{ right:22%; transform:rotate(-9deg); }

  /* ══ A MESA QUE RODA ═══════════════════════════════════════════════════
     O anel e uma superficie de arrasto; cada caixa e posicionada por JS a
     partir da PROFUNDIDADE, igual aos nos do cerebro da HELA. O CSS aqui so
     da a mesa, o cursor e a transicao. */
  /* O PE DA MESA. O tampo era um disco pousado no ar: sem apoio, ele nunca ia
     parecer movel, so mancha. Aqui vem a coluna central descendo do meio do
     tampo ate o chao e o prato de base onde ela se firma, os dois desenhados
     com a mesma logica das outras pecas de metal da sala: uma faixa de luz de
     um lado, a sombra do outro, e o contato com o chao marcado. */
  .lf-turntable{ position:absolute; left:0; right:0; bottom:6%; height:56%;
    z-index:4; perspective:900px; }
  /* ══ O PE DA MESA, EM 2.5D ═════════════════════════════════════════════
     O tampo estava pousado no ar. Aqui desce do meio dele uma coluna de aco
     ate o chao, e ela e construida com a mesma regra do resto: nada de
     cilindro achatado, e sim uma faixa de luz estreita fora do centro (a luz
     vem das pendentes, que estao a esquerda e a direita e nao de frente), o
     escuro fechando nas duas bordas para o metal virar, e o contato com o
     chao marcado por um prato e por uma sombra que se espalha. Tres alturas
     empilhadas: colar sob o tampo, corpo da coluna, prato de base. */
  /* Z-INDEX 5 E SO O TRECHO ABAIXO DO TAMPO. A coluna estava atras do plano
     do chao que o anel desenha (o filho negativo dele viaja junto com o
     empilhamento do .lf-turntable, que e 4), entao ela existia e ninguem via.
     Ela sobe para 5 e, para nao cobrir o tampo por cima, ocupa apenas a faixa
     que fica ENTRE a borda de baixo da mesa e o chao. */
  /* DISCRETO. Eu tinha feito um poste grosso no meio da cena, que roubava a
     atencao dos lotes e ainda parecia mobilia de outro comodo. A funcao dele
     e uma so: tirar a impressao de que o tampo flutua. Entao ele e estreito,
     fica atras do tampo, e so o pedacinho que espia por baixo da aresta da
     frente e o prato no chao e que aparecem. */
  /* MEDIDO, e por isso consertado: a aresta de baixo do tampo cai em y≈416 e
     o chao da sala em y≈460, e o poste ia de 414 a 438, morria no meio do
     ar, entao a mesa continuava boiando por cima de um toco. Agora ele nasce
     na aresta do tampo e vai ATE o chao (bottom 1.5%, altura 10%), que era o
     pedido: simples, central, so a parte de baixo aparecendo.
     O z-index 3 e o que o mantem ATRAS do tampo (.lf-turntable e 4): so o
     trecho abaixo da mesa e visto, como acontece com um pe de mesa de
     verdade visto de cima. */
  /* CLARO O BASTANTE PARA EXISTIR. Medido, o poste estava no lugar certo
     (414->454, da aresta do tampo ate o chao) e mesmo assim invisivel: eu
     tinha pintado metal escuro sobre um chao escuro. Tudo nesta sala pega a
     luz das duas pendentes; o pe da mesa nao era excecao, so estava mal
     pintado. A faixa clara fora do centro e o que faz o cilindro virar. */
  /* O PE CENTRAL DA MESA MORREU AQUI, e fica registrado para eu nao tentar
     uma quarta vez. Passei por tres versoes (discreto, claro, z-index 5) e o
     derrubei todas pelo mesmo motivo de fundo: um poste desenhado DE
     FRENTE embaixo de um tampo desenhado DE CIMA briga com a perspectiva da
     propria cena, e em vez de assentar a mesa ele mata o 2.5D dela.
     O que sustenta o tampo e a SOMBRA DE CONTATO no chao, que ja existe e
     funciona sem contradizer o angulo de nada. */
  .lf-ring{ position:absolute; left:0; right:0; top:0; bottom:0;
    cursor:grab; touch-action:none; }
  .lf-ring.is-grabbing{ cursor:grabbing; }
  /* O TAMPO. Era um disco marrom chapado, sem volume nenhum, e por isso
     parecia uma mancha e nao uma mesa. Agora e aco escovado do deposito com
     tres coisas que um disco chapado nao tem: o clarao da pendente batendo
     so na metade de tras, a borda de luz onde o metal vira, e o vinco de
     sombra onde ele encosta no chao. */
  /* MAIS LARGA QUE OS LOTES. Com a bancada espalhando as caixas, o tampo
     antigo era mais estreito que a fileira e as caixas das pontas ficavam
     penduradas no ar. Um balcao tem que sobrar dos dois lados do que esta
     em cima dele. */
  .lf-turntable::before{ content:""; position:absolute; left:3%; right:3%;
    bottom:9%; height:30%; border-radius:50%; pointer-events:none;
    background:
      radial-gradient(46% 58% at 46% 20%, rgba(255,232,188,.46), transparent 64%),
      linear-gradient(#98a2a9 0%, #717c84 34%, #454f55 100%);
    /* A MESA NAO PODE SER UM DISCO CHAPADO NO AR. Ela era uma elipse sem
       espessura e sem chao, entao parecia mancha e nao movel. As sombras
       solidas empilhadas dao a ESPESSURA do tampo (um degrau por camada, do
       claro ao escuro), a ultima sombra e o contato dele com o chao, e o
       verniz interno faz a luz das pendentes escorregar na borda. */
    box-shadow:
      0 7px 0 #4a545a, 0 13px 0 #39434a, 0 18px 0 #2a333a,
      0 24px 34px -8px #000e,
      inset 0 3px 0 rgba(232,244,255,.34),
      inset 0 -18px 28px -14px #000b; }
  /* o aro: uma volta de latao gasto, so onde a luz pega */
  .lf-turntable::after{ content:""; position:absolute; left:3%; right:3%;
    bottom:9%; height:30%; border-radius:50%; pointer-events:none;
    border:2px solid rgba(198,164,102,.34);
    border-bottom-color:rgba(232,204,150,.5);
    box-shadow:0 0 14px rgba(214,176,106,.14); }
  /* O CHAO, embaixo do balcao. Ele nao existia: a mesa flutuava sobre o nada
     e por isso nunca parecia movel de um comodo. Aqui entra o cimento em
     fuga, com a poca de luz das pendentes e o reflexo do proprio balcao
     escorrendo para a frente. */
  .lf-turntable{ overflow:visible; }
  .lf-ring::before{ content:""; position:absolute; left:-8%; right:-8%;
    bottom:-24%; height:44%; z-index:-1; pointer-events:none;
    background:
      radial-gradient(58% 70% at 50% 6%, rgba(246,214,160,.16), transparent 70%),
      linear-gradient(180deg, #1b1f22 0%, #14181a 46%, #0b0e10 100%);
    box-shadow:inset 0 12px 22px -12px #000c; }
  .lf-ring::after{ content:""; position:absolute; left:12%; right:12%;
    bottom:-4%; height:11%; z-index:-1; pointer-events:none;
    border-radius:50%; filter:blur(5px);
    background:radial-gradient(ellipse, rgba(0,0,0,.7), transparent 72%); }
  /* CADA CAIXA E UMA CAMADA PROPRIA, para mover no giro custar composicao e
     nao repintura do SVG inteiro.
     NUNCA usar contain:paint AQUI, e isto me custou a abertura da caixa.
     Ele promete ao navegador que nada dentro da caixa desenha FORA dela, e
     entao ele para de desenhar o que sai. Mas quase tudo que importa quando a
     caixa abre sai dela de proposito: a ficha do processo mora em left:58%,
     a tampa sobe acima do topo, o halo transborda. O resultado nao foi um
     erro, foi pior: tudo continuou existindo no DOM, com as classes certas,
     e simplesmente nao aparecia. O will-change sozinho ja da a camada e nao
     recorta nada. */
  .lf-ring > .lf-box{ position:absolute; left:50%; top:58%;
    will-change:transform;
    transition:opacity .12s linear, filter .12s linear; }
  /* durante o giro nem transicao: ela so atrasa o que ja esta sendo animado */
  .lf-ring.is-grabbing > .lf-box{ transition:none; }
  .lf-ring > .lf-box.is-front{ cursor:pointer; }

  /* ══ A TRILHA DO LANCE ════════════════════════════════════════════════
     Tracos na aresta da mesa, um por unidade de bolso, com um tique mais alto
     a cada cinco, como regua de escrivao. Preenchidos em vermelho de lacre.
     Bolso zero mostra a trilha VAZIA, o que escancara o problema da moeda da
     Hora 3 em vez de esconder. */
  .lf-counter.is-hidden{ display:none !important; }
  /* A TRILHA MUDOU DE ENDERECO. Ela morava presa no rodape da sala, a 5.5%
     do fundo, e era exatamente a "tira de papel no canto inferior" que o
     tres vezes a mesma queixa: voce olhava a caixa la em cima e dava o
     numero la embaixo, em outro lugar da tela. Agora ela e mudada por
     javascript para dentro do .lf-fbid da ficha do lote aberto, entao ela
     nasce NO objeto. Aqui ela vira um elemento de fluxo normal, sem posicao
     propria, porque quem manda no lugar dela agora e a pasta. */
  .lf-track{ position:static; margin-top:2px; z-index:8;
    display:flex; align-items:center; gap:8px;
    transition:opacity .2s ease; pointer-events:auto; }
  /* REVERTIDO. Eu tirei a regua de dentro da caixa e pendurei ela na parede
     da direita, e isso foi invencao minha em cima de um pedido que era outro:
     o pedido era o QUADRO NEGRO da rodada, o painel de ambiente onde a mesa
     acompanha os lances. A regua sempre esteve certa onde estava, no pe da
     ficha do lote aberto, porque o lance mora no objeto que se compra.
     Enquanto ela nao foi adotada por uma ficha, ela nao existe. */
  .lf-house > .lf-track{ display:none; }
  .lf-fbid{ margin:0 9px 9px; padding-top:7px;
    border-top:1px dashed rgba(0,0,0,.22); }
  .lf-fbid:empty{ display:none; }
  /* A REGUA DO ESCRIVAO, EM TAMANHO DE REGUA. A 22px de altura e 8px de
     traco ela era um risquinho ilegivel no pe da ficha: nao dava para contar
     quantos tracos estavam acesos, que e a unica coisa que ela existe para
     dizer. Agora o corpo tem 40px, o traco cheio tem 20 e o de cinco em
     cinco tem 30, entao a proporcao se le de relance, sem algarismo nenhum. */
  /* O GLIFO DA MOEDA, colado no comeco da regua. Pequeno de proposito: ele
     nao e um numero, e uma legenda de unidade, do tamanho de um selo. */
  .lf-tcoin{ flex:0 0 auto; display:flex; align-items:center;
    justify-content:center; width:15px; height:15px; margin-bottom:1px;
    color:#7fd3a0; opacity:.92; filter:drop-shadow(0 1px 0 #0007); }
  .lf-tcoin.is-gold{ color:#e2c078; }
  .lf-tcoin svg{ width:100%; height:100%; display:block; }
  .lf-tmarks{ flex:1; display:flex; align-items:flex-end; gap:2px;
    height:40px; padding:5px 7px; border-radius:2px; cursor:ew-resize;
    background:linear-gradient(#1b140c,#120c07);
    box-shadow:inset 0 0 0 1px rgba(214,176,106,.4),
      inset 0 3px 8px rgba(0,0,0,.72); }
  .lf-tmarks i{ flex:1; min-width:2px; height:20px; border-radius:1px;
    background:rgba(214,198,158,.18);
    box-shadow:inset 0 0 0 1px rgba(214,198,158,.12); }
  .lf-tmarks i.five{ height:30px; background:rgba(214,198,158,.26); }
  .lf-tmarks i.on{ background:linear-gradient(#e0626d,#8f2530);
    box-shadow:0 0 7px rgba(200,60,72,.8), inset 0 1px 0 #ff9aa2aa; }
  .lf-tmarks i.five.on{ background:linear-gradient(#f07b86,#a02a36); }
  .lf-tmarks:empty::after{ content:"sem bolso"; font:600 8px/1 Oswald,sans-serif;
    letter-spacing:.2em; color:#8a6a4a; align-self:center; }

  /* o cordao de isolamento, na frente de tudo */
  .lf-cordon{ position:absolute; left:-1%; right:-1%; bottom:2%; height:16px;
    z-index:7; pointer-events:none; }
  .lf-cordon::before{ content:""; position:absolute; left:0; right:0; top:5px;
    height:4px; border-radius:3px;
    background:linear-gradient(180deg,#8f2530,#5e141c);
    box-shadow:0 2px 6px #000a, inset 0 1px 0 #d4646d66; }

  /* ══ A CAIXA DE APREENSAO ══════════════════════════════════════════════
     O DESENHO E UM SVG AUTORADO (assets/evidencebox.svg), no mesmo metodo da
     maleta e do portal: materiais como gradientes nomeados no defs, um grupo
     por parte fisica, e tres faces com luminosidades diferentes, que e o que
     faz volume de objeto em vez de retangulo.
     O CSS daqui NAO desenha a caixa: ele so a VESTE (o numero do processo, o
     carimbo da categoria, a fita da raridade, o estado) e a anima. */
  /* O LOTE E O ASSUNTO DA JANELA, entao ele tem tamanho de assunto. A 196px
     a etiqueta media 8px de alto e nao dava para ler nada dentro do vao de
     634px que a janela tem de verdade. */
  /* +15% e depois -5%: 238 -> 274 -> 260. Cresceu porque o lote e o assunto
     da janela e nao dava para ler a impressao dele; recuou um pouco
     porque com cinco e seis lotes o tamanho cheio comia o tampo todo. */
  .lf-box{ position:relative; width:260px; flex:0 0 260px; cursor:pointer;
    display:flex; flex-direction:column; align-items:center;
    transition:transform .2s cubic-bezier(.3,1.4,.4,1), filter .24s ease; }
  .lf-box.is-back{ width:164px; flex:0 0 164px; }
  .lf-box:hover{ transform:translateY(-7px) scale(1.04); z-index:30; }

  .lf-crate{ position:relative; width:100%; aspect-ratio:260/210; }
  /* a caixa do leilao PEGA A LUZ: ela esta sob a pendente e o fundo nao.
     A RARIDADE E O HALO, e o halo e do objeto: cada classe empurra a sua cor
     para fora da caixa, entao a mesa inteira se le de relance sem que nada
     esteja escrito. */
  .lf-art{ position:absolute; inset:0; width:100%; height:100%; display:block;
    pointer-events:none; overflow:visible;
    filter:drop-shadow(0 10px 16px rgba(0,0,0,.75)) brightness(1.1); }
  .lf-box:hover .lf-art{ filter:drop-shadow(0 14px 18px rgba(0,0,0,.7))
    brightness(1.04); }
  .r-incomum   .lf-art{ filter:drop-shadow(0 10px 16px rgba(0,0,0,.75))
    drop-shadow(0 0 9px rgba(111,191,142,.42)) brightness(1.1); }
  .r-rara      .lf-art{ filter:drop-shadow(0 10px 16px rgba(0,0,0,.75))
    drop-shadow(0 0 12px rgba(169,127,224,.5)) brightness(1.12); }
  .r-paradoxal .lf-art{ filter:drop-shadow(0 10px 16px rgba(0,0,0,.8))
    drop-shadow(0 0 16px rgba(201,176,255,.55)) brightness(1.06); }
  .r-rigged    .lf-art{ filter:drop-shadow(0 10px 16px rgba(0,0,0,.75))
    drop-shadow(0 0 11px rgba(255,106,74,.45)) brightness(1.12); }
  .r-selado    .lf-art{ filter:drop-shadow(0 10px 18px rgba(0,0,0,.85))
    drop-shadow(0 0 12px rgba(95,208,138,.4)); }
  /* A LUZ ENTORTA EM VOLTA DA PARADOXAL. Ela nao ganha mais brilho que as
     outras: ela DOBRA o que esta atras dela, que e a unica coisa no jogo que
     faz isso, e por isso se reconhece antes de qualquer cor. */
  /* O CUSTO ERA INSUSTENTAVEL. Isto usava backdrop-filter (hue-rotate mais
     blur) ANIMADO: filtro de fundo ja obriga o navegador a re-renderizar o
     que esta atras, e animado ele faz isso TODO QUADRO, para sempre, mesmo
     com a mesa parada e a aba sem ninguem olhando. Medido: 5,4 quadros por
     segundo com a sala montada e nada se mexendo.
     A distorcao continua, feita de outro jeito: uma lente de gradiente com
     mistura de cor, que a placa de video resolve na composicao, e o que
     anima e transform mais opacidade, que nao repintam nada. */
  .r-paradoxal .lf-crate::before{ content:""; position:absolute;
    left:-14%; right:-14%; top:-10%; bottom:-6%; z-index:0; pointer-events:none;
    border-radius:50%; will-change:transform, opacity;
    mix-blend-mode:color-dodge; opacity:.42;
    background:radial-gradient(ellipse at 42% 38%,
      rgba(150,110,220,.55) 0%, rgba(90,140,210,.28) 38%,
      rgba(40,60,120,.10) 62%, transparent 78%);
    animation:lfWarp 5.5s ease-in-out infinite; }
  @keyframes lfWarp{
    0%,100%{ transform:scale(1) rotate(0deg); opacity:.34; }
    50%{ transform:scale(1.07) rotate(1.5deg); opacity:.5; } }
  /* as brasas da apreensao pulsam, porque ela esta quente */
  /* A BRASA TAMBEM SAIU DO FILTRO. Animar filter:brightness num SVG grande
     repinta a caixa inteira a cada quadro, e sao ate seis caixas na mesa. O
     calor agora e uma camada por cima que so pisca de opacidade: mesmo
     efeito no olho, custo de composicao. */
  .r-rigged .lf-crate{ position:relative; }
  .r-rigged .lf-crate::after{ content:""; position:absolute; inset:0;
    z-index:2; pointer-events:none; border-radius:6px;
    will-change:opacity; mix-blend-mode:screen;
    background:radial-gradient(ellipse at 50% 62%,
      rgba(255,148,86,.30), rgba(190,60,30,.12) 55%, transparent 76%);
    animation:lfEmber 2.9s ease-in-out infinite; }
  @keyframes lfEmber{ 0%,100%{ opacity:.25; } 50%{ opacity:.62; } }

  /* O numero do processo agora e desenhado DENTRO do SVG, na etiqueta, entao
     nao existe mais rotulo flutuante para descolar do papel quando a caixa
     muda de altura. Sobra so o numero do lote na etiqueta pendurada. */
  /* O NUMERO DO LOTE E DA BANCADA, NAO DO AR. Ele flutuava solto acima da
     caixa, sem pertencer a nada, e era o unico elemento da cena que nao era
     um objeto. Agora e uma plaqueta de latao apoiada no balcao na frente do
     lote, como numero de leilao de verdade: e por ele que o lance identifica
     a caixa, entao ele fica onde a caixa esta pousada. */
  .lf-lotno{ position:absolute; left:50%; bottom:-11px; z-index:5;
    transform:translateX(-50%) perspective(60px) rotateX(28deg);
    padding:3px 9px 2px; border-radius:1px; pointer-events:none;
    font:700 10px/1 'JetBrains Mono',monospace; letter-spacing:.14em;
    color:#33291a;
    background:linear-gradient(180deg,#e3c383 0%,#b8934c 52%,#7d6231 100%);
    box-shadow:0 2px 4px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,240,200,.6),
      inset 0 -1px 0 rgba(0,0,0,.35); }
  .lf-box.is-back .lf-lotno{ transform:translateX(-50%) scale(.82)
    perspective(60px) rotateX(28deg); opacity:.7; }

  /* O CARIMBO DA CATEGORIA, batido na tampa: tinta gasta, torto, a mao.
     A tampa muda de altura com o numero de pecas, entao o carimbo e ancorado
     a ela por uma variavel, e nao por uma porcentagem fixa que so servia
     para a caixa de uma peca. */
  .lf-stencil{ position:absolute; left:58%; top:var(--lid,22%); z-index:3;
    transform:translate(-50%,-50%) rotate(-5deg) skewX(-12deg); line-height:0;
    color:#3f2415; opacity:.6; pointer-events:none;
    filter:drop-shadow(0 1px 0 rgba(255,240,210,.22)); }
  .lf-stencil svg{ width:26px; height:26px; display:block; }
  .lf-st-die{ display:block; width:22px; height:22px; border:3px solid currentColor;
    border-radius:5px; }
  .lf-st-row{ display:flex; gap:2.5px; }
  .lf-st-row b{ width:11px; height:16px; border:2.4px solid currentColor;
    border-radius:2px; }
  .lf-st-mod{ display:block; width:20px; height:20px;
    border:2.6px dashed currentColor; border-radius:4px; }

  /*, RARIDADE, canal 1: o que COLARAM na caixa, */
  .lf-tape{ position:absolute; height:9px; text-decoration:none; z-index:4;
    pointer-events:none; opacity:.94;
    background:repeating-linear-gradient(90deg,
      var(--tp,#a83232) 0 6px, rgba(0,0,0,.16) 6px 7px);
    box-shadow:0 1px 3px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.18); }
  .lf-tape.one{ left:4%; right:4%; top:34%; transform:rotate(-2deg); }
  .lf-tape.x1{ left:0; right:0; top:40%; transform:rotate(13deg); }
  .lf-tape.x2{ left:0; right:0; top:40%; transform:rotate(-13deg); }
  .r-rara .lf-tape{ --tp:#6f45a8; }
  .r-paradoxal .lf-tape{ --tp:#43357a; }
  .r-rigged .lf-tape{ --tp:#a83232; }
  .lf-seal-blob{ position:absolute; left:50%; top:36%; width:15px; height:15px;
    transform:translate(-50%,-50%); border-radius:50%; z-index:4;
    text-decoration:none; pointer-events:none;
    background:radial-gradient(circle at 36% 32%, #74c493, #2f7d52 62%, #1c5034);
    box-shadow:0 2px 4px rgba(0,0,0,.55), inset 0 -2px 3px rgba(0,0,0,.35); }
  .lf-chain{ position:absolute; left:2%; right:2%; top:52%; height:7px;
    z-index:4; text-decoration:none; pointer-events:none; transform:rotate(1.4deg);
    background:repeating-linear-gradient(90deg,
      #949aa4 0 4px, #3d434c 4px 8px, #6f757f 8px 10px);
    box-shadow:0 2px 5px rgba(0,0,0,.55); }

  /*, RARIDADE, canal 2: o que VAZA dela, */
  /* MEDIDO: 1px NA TELA. As particulas existiam, animavam e tinham a cor
     certa por classe, e mesmo assim nao se viam, porque 3px de desenho
     passam pela escala da mesa e chegam em um pixel. Uma prova que so
     confirma que o elemento EXISTE nao serve: o teste tinha que ser o
     tamanho aparente. Agora sao 6px com halo de 5, e a rara e a paradoxal
     ganham brilho maior porque a cor delas e mais escura que a brasa. */
  .lf-leaks{ position:absolute; inset:0; pointer-events:none; z-index:6; }
  .lf-leak{ position:absolute; width:6px; height:6px; border-radius:50%;
    opacity:0; background:var(--lk,#d8c9a3);
    box-shadow:0 0 10px 5px var(--lk,#d8c9a3),
      0 0 3px 1px #fff8; }
  .r-incomum .lf-leak{ --lk:#6fbf8e; }
  .r-rara .lf-leak{ --lk:#a97fe0; }
  .r-paradoxal .lf-leak{ --lk:#c9b0ff; }
  .r-rigged .lf-leak{ --lk:#ff6a4a; }
  .lf-leak.p1{ left:20%; bottom:26%; animation:lfLeak 3.1s ease-out infinite; }
  .lf-leak.p2{ left:45%; bottom:22%; animation:lfLeak 3.6s ease-out .8s infinite; }
  .lf-leak.p3{ right:24%; bottom:28%; animation:lfLeak 3.3s ease-out 1.6s infinite; }
  .lf-leak.p4{ right:40%; bottom:20%; animation:lfLeak 4s ease-out 2.3s infinite; }
  @keyframes lfLeak{
    0%{ opacity:0; transform:translateY(0) scale(.5); }
    18%{ opacity:1; transform:translateY(-7px) scale(1); }
    72%{ opacity:.6; transform:translateY(-22px) scale(.75); }
    100%{ opacity:0; transform:translateY(-34px) scale(.3); } }
  .r-paradoxal .lf-art{ filter:drop-shadow(0 8px 12px rgba(0,0,0,.6))
    drop-shadow(0 0 12px rgba(150,120,240,.45)); }

  /* ══ A CAIXA ABERTA ════════════════════════════════════════════════════
     Nao existe "versao resumida" e "versao completa" inventadas: fechado e
     fechado, aberto e a tampa levantada. As pecas estao deitadas em bercos
     recortados, e o conteudo ja estava la o tempo todo. */
  /* A TAMPA LEVANTA E TOMBA PARA TRAS. E o unico movimento da caixa: ela nao
     cresce nem gira, ela ABRE, e o que sai dela e a papelada ao lado. */
  /* A TAMPA E UMA PECA MONTADA, NAO UM RECORTE DO MESMO PAPELAO.
     Ela usava os MESMOS gradientes do corpo, entao mesmo levantada ela lia
     como a mesma superficie continuando. Um filtro proprio (mais luz, mais
     saturacao) e o suficiente para o olho separar "isto e outra peca" sem
     precisar desenhar gradientes novos so para ela. No repouso ja e visivel
     de leve; erguida, o contraste sobe junto com a luz que agora bate nela
     direto, sem o resto da caixa fazendo sombra. */
  .lf-lid{ transform-origin:50% 100%; transform-box:fill-box;
    filter:brightness(1.05) saturate(1.06);
    transition:transform .34s cubic-bezier(.3,1.5,.45,1), filter .34s ease; }
  .lf-box.is-open .lf-lid{
    filter:brightness(1.16) saturate(1.12)
      drop-shadow(0 10px 14px rgba(0,0,0,.5));
    /* MAIS CURSO E MAIS GIRO: -26px/-5deg lia como a tampa deslizando de
       lado, nao levantando. -38px erguido mais o giro maior da o gesto de
       DOBRADICA: ela sai de baixo e tomba para tras, que e como uma tampa
       de verdade se solta quando esta presa so na aresta de tras. */
    transform:translateY(-38px) rotate(-9deg) scaleY(.82); }
  /* O ENCAIXE: a sombra de contato onde a tampa fechada ASSENTA no corpo.
     Parada ela e uma linha fina (o rebaixo onde a aba encaixa); erguida ela
     estica e escurece, porque agora e a tampa flutuando que projeta sombra
     na caixa aberta embaixo dela, e nao mais o proprio peso dela descansando. */
  .lf-lidwell{ transition:opacity .34s ease; }
  .lf-box.is-open .lf-lidwell{ opacity:1 !important; }

  /* ══ A FICHA DO PROCESSO, AO LADO DA CAIXA ═════════════════════════════
     Pasta de arquivo, na pele de TINTA SOBRE PAPEL, que e a pele do salao.
     Ela nasce atras da caixa e desliza para fora, como papelada sendo
     puxada: o movimento conta de onde a informacao veio. */
  /* o desenho recua; o alvo do mouse fica onde estava */
  .lf-crate{ transition:transform .24s cubic-bezier(.3,1.3,.4,1); }
  .lf-box.is-open .lf-crate{ transform:translateX(-74px) scale(.88); }
  /* ══ O LOTE LACRADO ════════════════════════════════════════════════════
     Ele gira de costas: dali em diante a mesa sabe QUE voce fechou e nunca
     por quanto. A ficha nao abre mais, e a cera cai por cima do objeto. */
  .lf-box.is-sealed{ pointer-events:none; }
  .lf-box.is-sealed .lf-crate{ transform:rotateY(180deg) scale(.96);
    filter:brightness(.72) saturate(.6);
    transition:transform .5s cubic-bezier(.35,1.1,.4,1), filter .5s ease; }
  .lf-box.is-sealed .lf-file{ display:none; }
  .lf-box.is-sealed::after{ content:""; position:absolute; left:50%; top:44%;
    width:38px; height:38px; margin:-19px 0 0 -19px; border-radius:50%;
    z-index:12; pointer-events:none;
    background:radial-gradient(circle at 36% 30%, #d4515c, #8f2530 58%,
      #5e141c);
    box-shadow:0 4px 9px rgba(0,0,0,.6), inset 0 -3px 5px rgba(0,0,0,.45);
    animation:lfWaxDrop .42s cubic-bezier(.2,1.9,.4,1) backwards;
    animation-delay:.28s; }
  @keyframes lfWaxDrop{
    from{ transform:scale(.2) translateY(-22px); opacity:0; }
    to{ transform:scale(1) translateY(0); opacity:1; } }
  .lf-file{ position:absolute; left:58%; top:50%; width:238px; z-index:40;
    transform:translate(-14px,-52%) rotate(-1deg) scale(1.06);
    transform-origin:0 50%; opacity:0; pointer-events:none;
    transition:opacity .16s ease, transform .22s cubic-bezier(.25,1.3,.4,1);
    background:linear-gradient(178deg,#efe6cc 0%,#e2d6b4 62%,#d2c49f 100%);
    border-radius:2px 4px 4px 2px;
    box-shadow:0 14px 30px -8px #000d, 0 2px 0 #ffffff4d inset,
      -3px 0 0 #b9a87e inset; }
  /* is-open, e nao :hover: quem decide que o processo esta aberto e a mesa,
     porque ela precisa afastar a caixa para a pasta caber dentro da janela */
  .lf-box.is-open .lf-file{ opacity:1; pointer-events:auto;
    transform:translate(14px,-52%) rotate(-1deg) scale(1.22); }
  /* a aba da pasta, o pedacinho que sobra para fora da caixa */
  .lf-file::before{ content:""; position:absolute; left:-9px; top:22%;
    width:11px; height:34%; border-radius:3px 0 0 3px;
    background:linear-gradient(90deg,#c6b88a,#ddd0ac); }
  .lf-fhead{ display:flex; align-items:center; justify-content:space-between;
    gap:8px; padding:7px 10px 6px; border-bottom:1px solid #00000022; }
  .lf-fno{ font:700 11px/1 'JetBrains Mono',monospace; letter-spacing:.12em;
    color:#5c2020; }
  /* A CLASSE E UMA TARJA DE MATERIA, NUNCA UMA PALAVRA. E a mesma cor que a
     ferragem da caixa usa, entao ficha e objeto dizem a mesma coisa. */
  .lf-fband{ width:64px; height:9px; border-radius:1px; background:#b09a72;
    box-shadow:inset 0 1px 0 #ffffff55, 0 1px 2px #00000033; }
  .r-incomum   .lf-fband{ background:linear-gradient(90deg,#4a5334,#6d7a4c); }
  .r-rara      .lf-fband{ background:linear-gradient(90deg,#6f45a8,#a97fe0); }
  .r-paradoxal .lf-fband{ background:linear-gradient(90deg,#2b313c,#8b93a2); }
  .r-rigged    .lf-fband{ background:repeating-linear-gradient(45deg,
    #a83232 0 6px,#6d1f22 6px 12px); }
  .r-selado    .lf-fband{ background:#0b0b0b; }

  .lf-fbody{ padding:8px 9px 10px; display:flex; flex-direction:column;
    gap:7px; }
  /* cada peca deitada no seu berco recortado no papelao da pasta */
  .lf-fpiece{ position:relative; display:flex; align-items:center; gap:9px;
    padding:7px 9px; border-radius:4px;
    background:linear-gradient(#cfc1998f,#bcae8a8f);
    box-shadow:inset 0 2px 5px #00000038, inset 0 -1px 0 #ffffff44; }
  .lf-fpiece .lf-pbody{ --lf-s:26px; flex:0 0 auto; }
  .lf-fname{ font:600 9.5px/1.25 Oswald,sans-serif; letter-spacing:.09em;
    text-transform:uppercase; color:#3a2c1a; flex:1; }
  /* as tres linhas da sua maquina, resumidas: quais aceitam esta peca */
  .lf-frows{ display:flex; flex-direction:column; gap:2px; flex:0 0 auto; }
  .lf-frows i{ width:16px; height:5px; border-radius:1px; background:#00000026;
    box-shadow:inset 0 0 0 1px #00000033; }
  .lf-frows i.ok{ background:#2f7d52; box-shadow:0 0 5px #4fae7a88; }

  /* ══ O HOVER DENTRO DO HOVER ══════════════════════════════════════════
     A peca sozinha, no tamanho em que da para ler, com as SUAS tres linhas
     ao lado e as legais acesas. Este painel e da MAQUINA, entao ele troca de
     pele: fosforo sobre vidro, e nao tinta sobre papel. */
  /* ELE ABRE PARA CIMA, EMPILHADO SOBRE A PASTA. Abrindo para a direita ele
     saia pela pedra do arco; abrindo para a esquerda ele enterrava a caixa,
     que e justamente o objeto de que ele esta falando. Medido: com o painel
     a esquerda, o lote inteiro ficava coberto. Para cima ele cai sobre os
     armarios, que sao cenario e nao tem nada para dizer. */
  /* ELE ABRE DENTRO DA PROPRIA LINHA, e nao como um terceiro painel
     flutuante. Ja tentei tres ancoragens: a direita ele saia pela pedra do
     arco, a esquerda ele enterrava o lote de que estava falando, e para cima
     ele batia na curva do arco e o nome da peca ficava cortado. A janela tem
     644x402 e nao cabe um terceiro plano solto: entao a peca ABRE, empurra as
     irmas para baixo e a pasta cresce. Ficar dentro da pasta tambem e mais
     honesto, porque o detalhe pertence aquela linha e nao ao ar. */
  .lf-fdeep{ display:flex; flex-direction:column; gap:7px;
    margin:0 -3px; padding:0 8px; max-height:0; opacity:0; overflow:hidden;
    transition:max-height .22s cubic-bezier(.3,1,.4,1), opacity .16s ease,
      padding .22s ease;
    background:linear-gradient(#0f1a14,#08110d);
    border-radius:3px; box-shadow:inset 0 0 0 1px #2f6b4c66; }
  /* TRAVADO NO CLIQUE, NAO NO HOVER. A classe is-reading e posta por
     javascript e so sai com outro clique: o painel para de fugir do proprio
     leitor.
     NUNCA CRASE NESTE BLOCO: toda esta folha e uma template literal, entao
     uma crase de comentario FECHA a string e o resto do CSS vira expressao
     JavaScript. O node --check passa (o arquivo continua sintaticamente
     valido) e o erro so aparece no navegador como "x is not defined". Ja me
     custou isto duas vezes; a segunda foi aqui. */
  .lf-fpiece.is-reading .lf-fdeep{ max-height:280px; opacity:1;
    padding:9px 8px 10px; }
  /* AS IRMAS ENCOLHEM ENQUANTO UMA ESTA ABERTA. Sem isto a pasta crescia a
     altura inteira do painel aberto, passava do pe da janela e levava junto
     a regua do lance, que e o que o jogador precisa alcancar. Com a
     acordeao a altura total quase nao muda: uma abre, as outras recuam. */
  .lf-fbody:has(.lf-fpiece.is-reading) .lf-fpiece:not(.is-reading){
    padding:3px 9px; opacity:.72; }
  .lf-fbody:has(.lf-fpiece.is-reading) .lf-fpiece:not(.is-reading) .lf-pbody{
    --lf-s:17px; }
  .lf-fbody:has(.lf-fpiece.is-reading) .lf-fpiece:not(.is-reading) .lf-fname{
    font-size:8px; }
  /* a linha inteira vira coluna quando abre, senao o painel briga com o
     nome e com as tres marcas de linha que ficam a direita */
  .lf-fpiece{ flex-wrap:wrap; }
  .lf-fdeep{ flex-basis:100%; }
  .lf-fpiece.is-reading{ background:linear-gradient(#d8caa2c0,#c5b78ec0); }
  /* uma peca SEM painel (dado) nao finge ser clicavel */
  .lf-fpiece.is-flat{ cursor:default; }
  .lf-fpiece:not(.is-flat){ cursor:pointer; }
  .lf-fdname{ font:700 10px/1 Oswald,sans-serif; letter-spacing:.16em;
    text-transform:uppercase; color:#8fe0b4; }
  /* OS SOQUETES, UM A UM. E aqui que a pergunta "o que ela faz" e
     respondida: cada casa no tamanho em que se le, com o numero do soquete
     embaixo, e o vazio desenhado como vazio. */
  /* EM COLUNA, NAO EM FILA. Com a frase escrita em cada soquete, tres celulas
     lado a lado espremiam o texto em duas letras por linha. Empilhados, cada
     soquete tem a largura inteira do painel para dizer o que faz. */
  .lf-fworks{ display:flex; flex-direction:column; gap:5px; padding:4px 0 2px; }
  .lf-fsock{ position:relative; display:flex; align-items:center; gap:8px;
    padding:6px 8px; border-radius:3px;
    background:#0a1512; box-shadow:inset 0 0 0 1px #1f4a38; }
  .lf-fsock em{ flex:1; font:400 9.5px/1.35 Inter,system-ui,sans-serif;
    font-style:normal; color:#bfe6d2; letter-spacing:.01em; }
  .lf-fsock.is-void em{ color:#4e7f68; font-style:italic; }
  .lf-fworks.is-solo .lf-fsock em{ font-size:10px; }
  .lf-fsock.is-void{ background:repeating-linear-gradient(45deg,
    #0a1512 0 5px, #0d1a16 5px 10px); box-shadow:inset 0 0 0 1px #16332880; }
  .lf-fsock b{ font:700 7px/1 'JetBrains Mono',monospace; color:#4e7f68; }
  .lf-fsock .lf-pbody{ --lf-s:40px; }
  .lf-fworks.is-solo .lf-fsock{ flex:0 0 auto; padding:8px 12px; }
  .lf-fworks.is-solo .lf-pbody{ --lf-s:48px; }
  /* a familia: glifo mais o nome proprio dela, que e identidade e nao
     descricao de efeito */
  .lf-fdfam{ display:flex; align-items:center; gap:6px;
    font:600 8px/1 Oswald,sans-serif; letter-spacing:.18em;
    text-transform:uppercase; color:#79b39a; }
  .lf-fdfam i{ width:16px; height:3px; border-radius:2px;
    background:currentColor; opacity:.85; }
  /* a sua matriz, as tres linhas de verdade, so para olhar */
  .lf-fmatrix{ display:flex; flex-direction:column; gap:4px; margin-top:2px;
    pointer-events:none; }
  .lf-frow{ display:flex; align-items:center; gap:6px; padding:3px 5px;
    border-radius:3px; background:#0b1512; border:1px solid #1e3a2e; }
  .lf-frow.is-legal{ border-color:#4fae7a; background:#0e2a1e;
    box-shadow:0 0 8px #2f7d5240; }
  .lf-frow.is-shut{ opacity:.34; }
  .lf-frown{ font:700 8px/1 'JetBrains Mono',monospace; color:#5f8f76;
    width:9px; flex:0 0 auto; }
  .lf-frow.is-legal .lf-frown{ color:#8fe0b4; }
  .lf-frow .lf-prow2{ --lf-s:15px; }

  /* o processo tarjado: existe, e voce nao pode ler */
  .lf-file.is-sealed .lf-fbody{ gap:6px; position:relative; }
  .lf-fredact{ height:13px; border-radius:1px; background:#0b0b0b; }
  .lf-fredact.short{ width:62%; }
  .lf-flock{ position:absolute; right:12px; bottom:8px; line-height:0;
    color:#2f7d52; opacity:.8; }
  .lf-flock svg{ width:22px; height:22px; }

  @media (prefers-reduced-motion: reduce){
    .lf-lid, .lf-file, .lf-fdeep{ transition:none; }
    .lf-leak{ animation:none; opacity:0; } }

  /* ONDE ELA CABE NA SUA MAQUINA: a decisao do leilao, e hoje invisivel.
     Tres soquetes miniatura acendem os que aceitam esta peca. */
  .lf-fits{ position:absolute; left:50%; bottom:-30px; z-index:8;
    transform:translateX(-50%); display:none; gap:3px;
    padding:4px 6px; border-radius:3px; background:#0e0b06e8;
    box-shadow:0 4px 10px #000a; }
  .lf-box:hover .lf-fits{ display:flex; }
  .lf-fits i{ width:15px; height:9px; border-radius:1px;
    border:1px solid #6b5c3c; background:#00000055; }
  .lf-fits i.ok{ border-color:#7fd3a0; background:#2f7d5233;
    box-shadow:0 0 5px #7fd3a055; }
  .lf-fits i.no{ opacity:.3; }

  /* A CARTA DE PAPEL VELHA MORREU AQUI. O rename global grudou o fundo creme
     e a borda dela na caixa nova, e ficava uma placa palida atras do objeto.
     A marca agora e luz, nao moldura: o lote marcado ACENDE. */
  .lf-box.is-pinned .lf-art{
    filter:drop-shadow(0 10px 16px rgba(0,0,0,.75)) brightness(1.34)
      saturate(1.15) drop-shadow(0 0 14px rgba(255,206,130,.55)); }
  .lf-box.is-pinned::before{ content:""; position:absolute; left:14%;
    right:14%; bottom:-6px; height:12px; border-radius:50%; z-index:-1;
    pointer-events:none;
    background:radial-gradient(ellipse, rgba(255,196,110,.5), transparent 72%);
    filter:blur(3px); }
  /* your mark hangs under the pinned lot: the table can see your interest,
     never your number */
  /* the ceremony: won, tied, burnt */
  .lf-house.is-waiting .lf-counter{ opacity:.45; pointer-events:none;
    transition:opacity .3s ease; }
  .lf-box.is-won{ transform:translateY(-10px) scale(1.06);
    outline:3px solid var(--who,#c9a45c); outline-offset:2px;
    box-shadow:0 0 0 1px #fff3, 0 16px 30px #000c,
      0 0 26px 4px color-mix(in srgb, var(--who,#c9a45c) 55%, transparent);
    transition:transform .4s cubic-bezier(.2,1.7,.4,1); }
  .lf-wontag{ position:absolute; left:50%; bottom:-13px;
    transform:translateX(-50%) rotate(-2deg); white-space:nowrap;
    padding:2px 8px; border-radius:2px;
    font:700 7.5px/1 Oswald,sans-serif; letter-spacing:.18em;
    color:#14100b; background:var(--who,#c9a45c);
    border:1px solid #14100b66; box-shadow:0 3px 8px #000a;
    animation:lfTag .32s cubic-bezier(.2,2.2,.4,1) both; }
  @keyframes lfTag{ from{ opacity:0; transform:translateX(-50%) scale(1.6)
      rotate(-2deg); } to{ opacity:1; transform:translateX(-50%) scale(1)
      rotate(-2deg); } }
  .lf-shake{ animation:lfShake .42s ease-out; }
  @keyframes lfShake{ 15%{ transform:translateX(-5px) rotate(-1deg); }
    35%{ transform:translateX(5px) rotate(1deg); }
    55%{ transform:translateX(-3px); } 75%{ transform:translateX(3px); }
    100%{ transform:none; } }
  .lf-box.is-burnt{ filter:grayscale(.85) brightness(.5) contrast(1.2);
    transform:translateY(6px) rotate(2deg); opacity:.5;
    transition:all .5s ease; }
  .lf-box.is-burnt::before{ content:""; position:absolute; inset:0;
    background:radial-gradient(60% 60% at 50% 60%, rgba(154,85,201,.55),
      transparent 70%); border-radius:3px; pointer-events:none; }

  .lf-box.is-pinned::after{ content:"YOUR MARK"; position:absolute;
    left:50%; bottom:-30px; transform:translateX(-50%) rotate(-3deg);
    padding:2px 8px; font:700 7.5px/1 Oswald,sans-serif;
    letter-spacing:.22em; color:#14100b;
    background:linear-gradient(180deg,#d9b970,#c9a45c);
    border:1px solid #8a6f3c; border-radius:2px;
    box-shadow:0 3px 8px #000a; }
  .lf-box h4{ margin:0 0 7px; font:700 16px/1.12 Oswald,sans-serif;
    letter-spacing:.04em; color:#2c2418; }
  .lf-strip{ display:inline-flex; gap:3px; }
  /* ONE PIECE OF A LOT: its body, and its own name under it. The name is a
     proper noun and nothing else; what the piece DOES is the body's job. */
  .lf-piece{ display:flex; flex-direction:column; align-items:center; gap:4px;
    margin:0 0 9px; }
  .lf-piece:last-of-type{ margin-bottom:4px; }
  .lf-piece em{ font:600 11px/1 Oswald,sans-serif; font-style:normal;
    letter-spacing:.05em; color:#5b4d33; }
  .lf-pbody{ display:inline-flex; align-items:center; gap:4px;
    flex-wrap:nowrap; }
  /* A FUNCTION IS A ROW. Three sockets in a frame, its houses filled and the
     rest left dark. Two thirds of the catalogue fills only two of the three,
     and that empty socket is exactly the trade the auction is about, so it is
     drawn and not implied. */
  .lf-prow2{ padding:5px; border-radius:6px; gap:4px;
    background:rgba(60,48,26,.10);
    box-shadow:inset 0 0 0 1px rgba(122,106,68,.45); }
  .lf-mcell.is-void{ background:rgba(40,32,18,.10); border-style:dashed;
    border-color:rgba(122,106,68,.5); }
  /* a module is one house that CLIPS onto a row's end, or one that EATS a
     house already there. Same body, opposite gesture. */
  .lf-pmod{ position:relative; padding-left:7px; }
  .lf-pmod::before{ content:""; position:absolute; left:0; top:50%;
    width:6px; height:2px; margin-top:-1px; background:#7a6a44; }
  .lf-pmod.is-parasita::before{ width:7px; height:7px; margin-top:-3.5px;
    border-radius:50%; background:none;
    border:2px solid #5a3a86; border-left-color:transparent; }
  /* a fitting: valve or supply, small and clearly not a row */
  .lf-pfit{ padding:4px 7px; border-radius:11px;
    box-shadow:inset 0 0 0 1px rgba(122,106,68,.5); }
  .lf-pfit svg{ width:20px; height:20px; color:#5b4d33; }
  .lf-piece.is-sealed .lf-pbody svg{ width:34px; height:34px; color:#5a3a86; }
  /* ── THE CASE ASKS: what you won, and WHERE it goes ────────────────────
     The slip used to be a line of names in 8px. You cannot choose a home for
     a thing you cannot see, so the offer wears the same bodies the auction
     floor showed, and under it your three rows as real sockets. */
  .lf-obody{ display:flex; align-items:center; gap:9px; flex-wrap:nowrap; }
  .lf-opiece{ --lf-s:26px; display:flex; flex-direction:column;
    align-items:center; gap:2px; }
  .lf-opiece em{ font:600 8px/1 Oswald,sans-serif; font-style:normal;
    letter-spacing:.03em; color:#6b5c3c; }
  .lf-opiece .lf-prow2{ padding:3px; gap:2px; }
  .lf-slots{ display:flex; gap:5px; margin-top:5px; }
  /* o RECIBO da linha escolhida: um soquete so, do tamanho de assinatura,
     que diz onde a peca ficou sem virar botao de decisao outra vez */
  .lf-rowecho{ display:flex; margin-top:4px; opacity:.92; }
  /* A VALVULA CHAMANDO. So acende quando ela e a UNICA saida, senao vira
     enfeite piscando e o jogador aprende a ignorar. */
  body.lf-sem-soquete #hull-console .escape-slot{
    outline:2px solid rgba(226,169,59,.9);
    box-shadow:0 0 18px 4px rgba(226,169,59,.45);
    animation:lfVentCall 1.2s ease-in-out infinite; }
  body.lf-sem-soquete #hull-console .matrix-wrap .cell{
    filter:grayscale(.75) brightness(.6); }
  @keyframes lfVentCall{
    0%,100%{ outline-color:rgba(226,169,59,.65); }
    50%{ outline-color:rgba(255,214,140,1); } }
  /* o docket CALADO: sem ficha, sem papel, so o lugar onde a placa de fechar
     mora. Ele continua existindo porque a placa precisa de dono. */
  .lf-casedock.is-quiet{ background:none !important; box-shadow:none !important;
    border:0 !important; padding:0; min-height:0; pointer-events:none; }
  .lf-rowecho .lf-slot{ transform:scale(.82); transform-origin:left center;
    cursor:pointer; }

  /* ══ A MAQUINA E QUE PERGUNTA A LINHA ═════════════════════════════════
     O papel na maleta desenhava tres botoezinhos e chamava aquilo de
     escolher a linha. Errado por dois motivos: a decisao e sobre a SUA
     maquina, e a sua maquina esta desenhada ali do lado, acesa, com as
     tres linhas e os soquetes vazios a mostra. Perguntar no papel obriga o
     jogador a traduzir "linha 2" para um lugar que ele esta vendo.
     Agora a pergunta acontece em cima do vidro: a linha que aceita a peca
     acende e chama, a que nao aceita apaga e some do caminho. */
  /* ══ A MALETA DA UM PASSO ATRAS ═══════════════════════════════════════
     A foto entregou o que a medida nao via: durante a pergunta a maleta
     aberta fica EM CIMA da maquina, no mesmo canto de baixo a esquerda. O
     meu guarda olhava tamanho, limites de tela e opacidade, e nao olhava
     estar coberto, entao ele dizia "a matriz esta na tela" com ela atras de
     um estojo de couro.
     A cena resolve melhor do que qualquer verificacao: quem faz a pergunta
     toma o palco. A maleta recua e apaga, a maquina sobe e acende, e quando
     a linha e escolhida tudo volta. E o mesmo gesto de largar um papel na
     mesa para mexer no aparelho. */
  body.lf-rowpick #rucksack-zone{ opacity:.16; filter:saturate(.35);
    pointer-events:none;
    transition:opacity .2s ease, filter .2s ease; }
  body.lf-rowpick #hull-console{ z-index:80 !important; }
  body.lf-rowpick :is(#hull, #cursor-plane) .hull-manopla{ z-index:79 !important; }

  body.lf-rowpick #hull-console .matrix-wrap .cell,
  body.lf-rowpick #hull-console .matrix-wrap .matrix-fnlabel{
    transition:filter .18s ease, opacity .18s ease, box-shadow .18s ease; }
  body.lf-rowpick #hull-console .matrix-wrap .lf-shut{
    filter:grayscale(1) brightness(.42); opacity:.5; }
  body.lf-rowpick #hull-console .matrix-wrap .cell.lf-shut,
  body.lf-rowpick #hull-console .matrix-wrap .matrix-fnlabel.lf-shut{
    pointer-events:none !important; cursor:default !important; }
  /* ══ A CASA QUE ACEITA O DADO TEM QUE ACENDER NA ALOCACAO TAMBEM ═══════
     O codigo da alocacao ja marcava as casas legais com a classe legal,
     mas o estilo dela so existia sob a classe da pergunta de linha, do
     consumo. Na alocacao a marca era posta e NAO PINTAVA NADA: o jogador
     escolhia o dado, nenhuma casa acendia, clicava em volta, nada acontecia,
     e o Confirm ficava apagado esperando uma jogada que ele nao tinha como
     enxergar. O jogo parecia morto no meio da Hora, e foi exatamente assim
     que ele morreu em mesa.
     Marca sem desenho e pior que marca nenhuma: promete e nao entrega. */
  body.allocating #hull-console .matrix-wrap .cell.lf-legal{
    cursor:pointer; filter:brightness(1.32);
    box-shadow:0 0 0 1px rgba(127,211,160,.9),
      0 0 12px 2px rgba(127,211,160,.45);
    animation:lfRowCall 1.15s ease-in-out infinite; }
  body.allocating #hull-console .matrix-wrap .cell.lf-legal:hover{
    filter:brightness(1.65);
    box-shadow:0 0 0 2px rgba(180,240,200,1), 0 0 18px 4px rgba(127,211,160,.65); }
  /* e a valvula tambem, que e a saida quando nenhuma casa aceita */
  body.allocating #hull-console .escape-slot{
    outline:1px solid rgba(226,169,59,.5); }
  body.lf-rowpick #hull-console .matrix-wrap .lf-legal{
    cursor:pointer; filter:brightness(1.3);
    box-shadow:0 0 0 1px rgba(127,211,160,.85),
      0 0 12px 2px rgba(127,211,160,.4);
    animation:lfRowCall 1.15s ease-in-out infinite; }
  /* A LINHA QUE VAI COMER A DE BAIXO. Ela continua legal, porque a regra e
     que qualquer uma das tres sempre aceita: por uma funcao em cima de
     outra destroi a antiga. O que muda e o AVISO, que tem que chegar antes
     do clique e nao depois. Ambar em vez de verde, e uma tarja diagonal
     leve, que e como o proprio jogo ja marca casa condenada. */
  body.lf-rowpick #hull-console .matrix-wrap .lf-eat{
    box-shadow:0 0 0 1px rgba(226,169,59,.9),
      0 0 12px 2px rgba(226,169,59,.42) !important;
    animation:none !important;
    background-image:repeating-linear-gradient(135deg,
      rgba(226,169,59,.16) 0 5px, transparent 5px 11px); }
  body.lf-rowpick #hull-console .matrix-wrap .lf-eat:hover{
    box-shadow:0 0 0 2px rgba(255,206,120,1),
      0 0 18px 4px rgba(226,169,59,.66) !important; }
  body.lf-rowpick #hull-console .matrix-wrap .lf-legal:hover{
    filter:brightness(1.6);
    box-shadow:0 0 0 2px rgba(180,240,200,1), 0 0 18px 4px rgba(127,211,160,.6); }
  @keyframes lfRowCall{
    0%,100%{ box-shadow:0 0 0 1px rgba(127,211,160,.85),
      0 0 10px 1px rgba(127,211,160,.3); }
    50%{ box-shadow:0 0 0 1px rgba(160,235,190,1),
      0 0 16px 3px rgba(127,211,160,.55); } }
  /* a peca que esta esperando lugar, presa no canto do vidro enquanto a
     pergunta esta no ar: e ela que da nome ao convite */
  /* ══ O ALVO DO DESCARTE ═══════════════════════════════════════════════
     Com um bilhete na mao, a sala do leilao vira alvo: soltar ali devolve o
     lote ao Bureau. O convite tem que APARECER, senao e um gesto secreto que
     so quem leu o codigo conhece. Mesma linguagem do mercado, que ja acende
     quando voce arrasta uma carta por cima dele. */
  body.carrying-voucher .lf-house{
    outline:2px dashed rgba(226,169,59,.5); outline-offset:-6px;
    transition:outline-color .18s ease; }
  body.carrying-voucher .lf-house:hover{
    outline-color:rgba(255,206,120,.95); }
  body.carrying-voucher .lf-house::after{
    content:"SOLTAR AQUI DEVOLVE O LOTE"; position:absolute;
    left:50%; bottom:6%; transform:translateX(-50%); z-index:40;
    padding:4px 10px; border-radius:2px; pointer-events:none;
    background:rgba(20,14,10,.86); color:#e2c078;
    border:1px solid rgba(226,169,59,.45);
    font:700 8px/1 Oswald,sans-serif; letter-spacing:.16em; }
  /* ══ A FORJA DE EMERGENCIA: a pergunta do martelo com bancada propria ══ */
  .lf-rowtag.is-mudo{ display:none !important; }
  .lf-rowtag{ position:fixed; z-index:10002; pointer-events:none;
    display:flex; align-items:center; gap:7px; padding:5px 9px;
    background:linear-gradient(168deg,#12232b,#0b171d); color:#9ad8ec;
    border:1px solid #2f6a80; border-left:3px solid #7fd3a0;
    border-radius:2px; font:11px/1.4 var(--f-mono,monospace);
    box-shadow:3px 4px 12px rgba(0,8,12,.5); opacity:0;
    transition:opacity .14s ease; }
  .lf-rowtag.on{ opacity:1; }

  /* ══ O MARTELO ════════════════════════════════════════════════════════
     A bancada esta cheia e o dado novo so entra se um morrer. A escolha e
     do dono, sempre: o motor ja aceita a troca, e ate hoje quem escolhia
     era um botaozinho no papel.
     Agora e um gesto: o ponteiro vira martelo, os SEUS dados ficam
     vermelhos e batem de leve pedindo, e o que voce acertar e o que quebra.
     Nada de lista, nada de confirmar. */
  body.lf-hammer, body.lf-hammer *{ cursor:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'><path d='M4 26 L14 16' stroke='%23c9a45c' stroke-width='3.4' stroke-linecap='round'/><path d='M12 6 L24 6 L26 12 L20 14 L14 12 Z' fill='%23b8453a' stroke='%23611f1a' stroke-width='1.6' stroke-linejoin='round'/><path d='M15 12 L19 16' stroke='%23611f1a' stroke-width='2.6' stroke-linecap='round'/></svg>") 4 26, pointer !important; }
  body.lf-hammer #hull-console .dice-pool .die[data-gid]{
    animation:lfDoomed 1.05s ease-in-out infinite;
    outline:2px solid rgba(200,64,52,.9);
    box-shadow:0 0 14px 3px rgba(200,64,52,.45); }
  body.lf-hammer #hull-console .dice-pool .die[data-gid]:hover{
    outline-color:#ff7a68; transform:scale(1.12) rotate(-3deg);
    box-shadow:0 0 22px 6px rgba(220,80,64,.7); }
  @keyframes lfDoomed{
    0%,100%{ filter:saturate(1.35) brightness(1.02); }
    50%{ filter:saturate(1.9) brightness(1.22) drop-shadow(0 0 6px rgba(220,80,64,.8)); } }
  @media (prefers-reduced-motion: reduce){
    body.lf-hammer #hull-console .dice-pool .die[data-gid]{ animation:none; } }
  .lf-rowtag svg{ width:26px; height:26px; }
  .lf-slot{ --lf-s:16px; position:relative; display:flex; align-items:center;
    gap:3px; padding:3px 4px 3px 12px; cursor:pointer;
    background:#e7dcc0; border:1px solid #8a7a54; border-radius:3px; }
  .lf-slot .lf-prow2{ padding:0; gap:2px; background:none; box-shadow:none; }
  .lf-slotn{ position:absolute; left:3px; top:50%; transform:translateY(-50%);
    font:700 8px/1 'JetBrains Mono',monospace; color:#8a7a54; }
  .lf-slot.is-chosen{ background:#cfe0c2; border-color:#4f7a3f;
    box-shadow:0 0 0 1px #4f7a3f; }
  .lf-slot.is-chosen .lf-slotn{ color:#2f5d33; }
  /* a row that cannot take this piece is SHUT, not merely faded: the law is
     the same one the driver enforces, so nothing lights that would be refused */
  .lf-slot.is-shut{ cursor:not-allowed; opacity:.4;
    background:repeating-linear-gradient(45deg,#ddd2b6 0 3px,#cfc3a4 3px 6px); }
  /* TWO KNOBS, and the whole grammar obeys them:
       --lf-s      the body of a house. Every glyph and mark scales off it, so
                   a context sets ONE number instead of twelve.
       --lf-ground the material behind the house. Paper in the hall, phosphor
                   in the machine. The marks halo against it, which is why it
                   has to be a variable and not a colour typed twelve times. */
  /* THE CAMERA IS AT 75%. #cam.cam-world carries transform:scale(.7501), so
     every size here lands on screen three quarters as big: a 28px house was
     21 real pixels. The numbers below are chosen already knowing that.
     The fallback lives in the var() call and NOT as a declaration on the cell,
     because a custom property declared ON the element beats the one it would
     inherit, and that is why --lf-s set by the lot card never arrived. */
  .lf-mcell{ --lf-ground:#efe9d6;
    position:relative; min-width:var(--lf-s, 38px); height:var(--lf-s, 38px);
    padding:0 4px; display:inline-flex; align-items:center;
    justify-content:center; gap:2px; border:1px solid #7a6a44;
    border-radius:4px; background:var(--lf-ground); font-style:normal; }
  .lf-mcell.is-pair{ padding:0 5px; gap:6px; }
  /* A FORK reads as one house that pays ONE of two ways, so the split has to
     be visible enough that nobody reads the two sides as both happening. */
  .lf-mcell.is-fork{ gap:3px; }
  .lf-fork{ width:1px; align-self:stretch; margin:calc(var(--lf-s, 38px) * .12) 0;
    text-decoration:none; background:currentColor; opacity:.5;
    transform:skewX(-16deg); }
  .lf-mcell svg{ width:calc(var(--lf-s, 38px) * .64);
    height:calc(var(--lf-s, 38px) * .64); }
  .lf-mcell.lf-mod{ border-style:dashed; }
  /* THE PHOSPHOR SKIN. In the socket the house is not a paper chip glued to a
     CRT: there is no card, no border, no cream. The glyph is drawn BY the
     screen, so it takes the tube's own colour and glows in it. */
  .lf-mcell.lf-insocket{ --lf-s:34px; --lf-ground:#0e1a13;
    background:none; border:none; border-radius:0; padding:0;
    filter:drop-shadow(0 0 3px currentColor); }
  .lf-mcell.lf-insocket .lf-res{ color:inherit; }
  .lf-mcell.lf-insocket .lf-res.is-debit{ color:#e0a06a; }
  .lf-mcell.lf-insocket .lf-res.is-named{ color:#c8a8ff; }
  /* the family already tints the socket's glass; the GLYPH was staying gold
     because the console forces .mod-ico with !important. Out of that box, the
     mark wears its family too and the row reads as one screen. */
  /* keyed on the family alone, never on .cell: borrowing the classic cell just
     to reach a colour dragged its column layout in with it, and the proof
     sheet stacked two houses on top of each other. lf-fam-* is only ever
     written by this file, so it is scope enough. */
  .lf-fam-recarga .lf-insocket,
  .lf-fam-defesa  .lf-insocket{ color:#7fe0a8; }
  .lf-fam-paradoxo .lf-insocket,
  .lf-fam-boom     .lf-insocket{ color:#c9b0ff; }
  .lf-fam-viagem   .lf-insocket,
  .lf-fam-especial .lf-insocket{ color:#92d8ee; }
  .cell.locked .lf-insocket{ color:#c2705a; filter:none; opacity:.75; }
  /* a piece's own NAME under the socket. The classic .mod-cap is 5px in the
     gauntlet, which is the size that made these unreadable. */
  .lf-tag{ position:absolute; bottom:2px; left:0; right:0; text-align:center;
    font:600 7.5px/1 Oswald,sans-serif; letter-spacing:.04em;
    color:#cfe8da; opacity:.72; pointer-events:none;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  /* ONE RESOURCE inside a house: the glyph is the loud part, the amount is a
     mark hung off it. Three shapes, never a number to read: dots are +N, the
     half-disc is half, the ring is double, and a bar under the dots means the
     amount is FLAT (it does not scale with your roll). A die gets nothing. */
  .lf-res{ --m:calc(var(--lf-s, 38px) * .19);   /* a mark, sized off the house */
    position:relative; display:inline-flex; align-items:center;
    color:#2c2418; }
  .lf-res.is-debit{ color:#8a3b22; }   /* what it costs you never reads as gain */
  .lf-res.is-named{ color:#5a3a86; }   /* a bent rule: the rare faces */
  .lf-amt{ position:absolute; right:calc(var(--m) * -.55);
    bottom:calc(var(--m) * -.35); display:flex; align-items:flex-end;
    gap:1px; line-height:0; }
  .lf-amt b{ width:var(--m); height:var(--m); border-radius:50%;
    background:currentColor; box-shadow:0 0 0 1.5px var(--lf-ground); }
  .lf-amt.lf-flat{ padding-bottom:2px;
    border-bottom:calc(var(--m) * .4) solid currentColor; }
  /* a NEGATIVE amount takes away, and taking booms away is relief: the marks
     hang under a bar that crosses them out instead of underlining them */
  .lf-amt.lf-minus{ border-bottom:none; position:relative; }
  .lf-amt.lf-minus::after{ content:""; position:absolute; left:-1px; right:-1px;
    top:50%; height:calc(var(--m) * .35); background:currentColor;
    border-radius:1px; }
  .lf-half{ width:calc(var(--m) * 1.7); height:calc(var(--m) * 1.7);
    border-radius:50%; box-shadow:0 0 0 1.5px var(--lf-ground);
    background:linear-gradient(90deg,currentColor 0 50%,transparent 50%); }
  .lf-dbl{ width:calc(var(--m) * 1.7); height:calc(var(--m) * 1.7);
    border-radius:50%; background:var(--lf-ground);
    border:calc(var(--m) * .45) solid currentColor; }
  /* where the paradox points. Not a resource: it rides on the cell. */
  /* WHERE IT FIRES IS HALF THE MEANING. Perfuradora and Retrocesso are the
     same spiral and differ only by this arrow, so it cannot be a sticker in
     the corner: it sits on the cell's shoulder, on its own ground, at a size
     you read at a glance. */
  .lf-dir{ position:absolute; top:calc(var(--lf-s, 38px) * -.13);
    right:calc(var(--lf-s, 38px) * -.16); line-height:0; color:#6b5c3c;
    padding:1px; border-radius:50%; background:var(--lf-ground);
    box-shadow:0 0 0 1px #7a6a4455; }
  .lf-dir svg{ width:calc(var(--lf-s, 38px) * .48);
    height:calc(var(--lf-s, 38px) * .48); display:block; }
  .lf-insocket .lf-dir{ color:currentColor; opacity:.95;
    box-shadow:0 0 0 1px currentColor; }
  /* AN EFFECT WITH NO FACE YET. Loud on purpose: the old cog fallback dressed
     undrawn effects as drawn ones and hid exactly this list. */
  .lf-gap{ font:700 8.5px/1 'JetBrains Mono',monospace; color:#8a1f1f;
    text-decoration:none; padding:1px 2px; border:1px dashed #8a1f1f;
    border-radius:2px; }
  .lf-mcell.is-gap{ background:#f8e5e2; }
  /* the proof sheet (window.__lfHouses), mounted inside the auction zone so
     the cells render under the very CSS laws they will live under */
  /* the sheet spills into columns instead of one lost strip: 42 functions are
     only comparable when they are on screen together */
  #lf-proof{ position:fixed; inset:2%; z-index:9000; overflow:auto;
    padding:14px 16px; border-radius:4px; color:#2c2418; background:#efe9d6;
    border:2px solid #7a6a44; box-shadow:0 18px 40px #000a;
    font-family:Oswald,sans-serif; }
  /* the column has to be wider than the widest ROW or the tiles spill over the
     next column's names. Measured against the fattest function (four houses on
     both skins), not guessed. */
  #lf-proof .lf-pcols{ column-width:520px; column-gap:30px;
    column-rule:1px solid #cdbf9c; }
  #lf-proof .lf-pfam{ break-inside:avoid; page-break-inside:avoid; }
  #lf-proof h3{ margin:0 0 8px; font-size:12px; letter-spacing:.12em; }
  .lf-pkey{ display:flex; flex-wrap:wrap; gap:10px; padding:7px 8px;
    margin-bottom:10px; background:#e2d9bd; border-radius:3px;
    font-size:8px; letter-spacing:.06em; color:#6b5c3c; }
  .lf-pkey span{ display:inline-flex; align-items:center; gap:4px; }
  .lf-pfam{ margin-bottom:11px; }
  .lf-pfam > b{ font-size:9px; letter-spacing:.14em; color:#8a7749; }
  .lf-phead{ display:flex; align-items:center; gap:14px; padding:0 0 4px;
    font-size:7.5px; letter-spacing:.14em; color:#8a7749; }
  .lf-phead em{ min-width:104px; }
  .lf-phead span:nth-of-type(1){ min-width:150px; }
  .lf-prow{ display:flex; align-items:center; gap:14px; padding:3px 0;
    width:100%; }
  .lf-prow em{ flex:0 0 108px; font-size:11px; font-style:normal;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .lf-prow > .lf-strip{ flex:0 0 200px; }
  .lf-prow > .lf-pcrt{ flex:0 1 auto; min-width:0; }
  /* the tube tile: the phosphor skin has to be judged on glass, never on the
     same cream the paper skin sits on */
  .lf-pcrt{ display:inline-flex; align-items:center; gap:6px; padding:5px 8px;
    border-radius:5px; background:rgba(8,16,12,.92);
    border:1px solid rgba(120,160,140,.3); }
  /* A tube with no family class inherits the PAPER's dark ink and the glyph
     goes black on black: the Duto and the Trava were invisible here while the
     machine drew them fine, because in the machine the cell always sits inside
     a family-coloured row. A module belongs to no family, so it gets a neutral
     phosphor of its own instead of borrowing one and lying about its family. */
  .lf-pcrt.lf-pneutral{ color:#8fd6b4; }
  .lf-pgap{ margin:8px 0 0; padding:6px 8px; border-radius:3px;
    font-size:8.5px; line-height:1.5; color:#8a1f1f; background:#f8e5e2; }
  .lf-pgap.ok{ color:#2f5d33; background:#e3f0e2; }
  /* the generators' sheet, on the tray's own dark ground: a die judged on
     cream reads nothing like a die judged on the machine */
  #lf-dproof{ position:fixed; inset:5% 12%; z-index:9000; overflow:auto;
    padding:16px 20px; border-radius:5px; color:#e8e2cf;
    background:#20242e; border:2px solid #5a6070;
    box-shadow:0 18px 40px #000c; font-family:Oswald,sans-serif; }
  #lf-dproof h3{ margin:0 0 12px; font-size:12px; letter-spacing:.12em; }
  .lf-drow{ display:flex; align-items:center; gap:22px; padding:7px 0;
    border-top:1px solid #ffffff14; }
  .lf-drow em{ flex:0 0 150px; font-style:normal; font-size:12px;
    display:flex; flex-direction:column; gap:2px; }
  .lf-drow em b{ font:500 8.5px/1 'JetBrains Mono',monospace;
    letter-spacing:.1em; color:#8d94a6; }
  .lf-drow > span{ flex:0 0 82px; display:flex; justify-content:center; }
  .lf-dhead{ border-top:none; font-size:7.5px; letter-spacing:.14em;
    color:#8d94a6; }
  .lf-dhead > span{ display:block; text-align:center; }
  .lf-mcell.lf-dieface{ font:700 calc(var(--lf-s, 38px) * .52)/1
      'JetBrains Mono',monospace;
    color:#14110c; border:none; border-radius:5px;
    background:linear-gradient(160deg,var(--gen,#d8c9a3),
      color-mix(in srgb, var(--gen,#d8c9a3) 55%, #000)); }
  .lf-more{ margin-top:6px; font-size:9.5px; letter-spacing:.06em;
    color:#6b5c3c; }
  .lf-rar{ display:inline-block; margin-top:7px; padding:3px 10px;
    color:#f2ead4; background:var(--c); font-size:9.5px;
    letter-spacing:.16em; font-weight:700; border-radius:2px;
    box-shadow:inset 0 -2px 0 rgba(0,0,0,.25); }
  .lf-read{ display:none; margin-top:7px; border-top:1px solid #8a7a5466;
    padding-top:6px; font-size:9px; line-height:1.6; letter-spacing:.03em;
    color:#4a3f2c; text-align:left; }
  .lf-box:hover .lf-read{ display:block; }
  .lf-enter .lf-box{ animation:lfDrop .55s cubic-bezier(.2,1.6,.4,1) backwards; }
  .lf-enter .lf-box:first-child{ animation-delay:.25s; }
  .lf-enter .lf-box:nth-child(2){ animation-delay:.38s; }
  .lf-enter .lf-box:nth-child(3){ animation-delay:.5s; }
  .lf-enter .lf-box:nth-child(4){ animation-delay:.62s; }
  @keyframes lfDrop{
    from{ opacity:0; transform:translateY(-40px); }
    to{ opacity:1; transform:translateY(0); } }
  .lf-house.lf-enter{ animation:lfTune .8s ease-out; }
  /* A ENTRADA NUNCA PODE DEIXAR A SALA INVISIVEL. Isto abria em opacity:0 e
     a sala inteira ficou transparente: a janela mostrava a carreta do
     mercador por tras dela, e eu passei meia hora procurando quem estava por
     cima quando ninguem estava. O clarao de sintonia e feito so de filtro,
     que nao tem esse risco. */
  @keyframes lfTune{
    0%{ filter:brightness(2.4) saturate(.2) blur(5px); }
    45%{ filter:brightness(1.5) saturate(.6) blur(1.5px); }
    70%{ filter:brightness(.85) saturate(1.15) blur(0); }
    100%{ filter:none; } }
  /* ══ A JANELA RE-SINTONIZA NOS DOIS SENTIDOS ══════════════════════════
     A ida ja existia: a sala do leilao chega com um clarao de sintonia. A
     VOLTA nao tinha nada, a sala simplesmente sumia e o mercado aparecia
     pronto, como se a janela tivesse cortado em vez de re-sintonizar. Como
     e UMA janela dimensional que troca de destino, o corte e mentira.
     Feito de filtro, igual a ida, pelo mesmo motivo: mexer em opacidade
     aqui ja deixou a sala inteira transparente uma vez, com a carreta do
     mercador aparecendo por tras dela. */
  #market-zone.lf-untune{ animation:lfUntune .72s ease-out; }
  @keyframes lfUntune{
    0%{ filter:brightness(.8) saturate(1.1) blur(0); }
    30%{ filter:brightness(2.1) saturate(.25) blur(4px); }
    62%{ filter:brightness(1.35) saturate(.7) blur(1.2px); }
    100%{ filter:none; } }
  @media (prefers-reduced-motion: reduce){
    .lf-house.lf-enter, .lf-enter .lf-box,
    #market-zone.lf-untune{ animation:none; } }

  /* the pip-boy's CRT is the bid instrument: big amount, phosphor blue */
  .lf-crt{ display:flex; flex-direction:column; align-items:center;
    justify-content:center; gap:4px; height:100%; min-height:120px;
    color:#d6f0ff; text-align:center; }
  /* on the device the readout lives ON the CRT glass (same box the matrix
     uses: the pip-boy screen) */
  body.cabin-on #hull-console .lf-crt{ position:absolute; left:262px;
    top:188px; width:220px; height:132px; min-height:0; margin:0;
    pointer-events:none; }
  .lf-crt-lot{ font:700 11px/1.2 Oswald,sans-serif; letter-spacing:.14em;
    text-transform:uppercase; color:#8fd0f0; }
  .lf-crt-amt{ font:700 44px/1 'JetBrains Mono',monospace;
    text-shadow:0 0 14px rgba(74,168,224,.75); }
  .lf-crt-sub{ font-size:8px; letter-spacing:.16em; color:#4aa8e0;
    text-transform:uppercase; }
  .lf-crt-idle{ font:700 13px/1 Oswald,sans-serif; letter-spacing:.22em;
    color:#8fd0f0; }
  .lf-crt-stamp{ font:700 26px/1 Oswald,sans-serif; letter-spacing:.3em;
    color:#eafff8; border:3px solid #5fd08a; padding:8px 18px;
    border-radius:4px; transform:rotate(-6deg);
    text-shadow:0 0 12px rgba(95,208,138,.8);
    box-shadow:0 0 18px rgba(95,208,138,.35),
      inset 0 0 12px rgba(95,208,138,.25);
    animation:lfStamp .3s cubic-bezier(.2,2.4,.4,1); }
  @keyframes lfStamp{ from{ transform:rotate(-6deg) scale(2.1);
    opacity:0; } to{ transform:rotate(-6deg) scale(1); opacity:1; } }

  /* THE COUNTER: brass hardware bolted to the rostrum, in the same frame as
     the lots. Nobody has to look away from the floor to bid. */
  /* THE INSTRUMENT MATCHES THE ROOM. After the camera stepped forward the lots
     became 210px tall and this stayed a 34px strip under them: the place you
     READ grew and the place you ACT did not. Brass hardware on the rostrum,
     sized to be worked at the same distance the cards are read at. */
  .lf-counter{ position:absolute; left:7%; right:7%; bottom:5px; height:50px;
    display:flex; align-items:center; gap:14px; padding:0 14px; z-index:6;
    pointer-events:auto; }
  .lf-ink2{ flex:1; font-family:'Caveat','Segoe Script',cursive;
    font-size:21px; color:#1d3a5f; padding:2px 11px 0;
    border-bottom:1.5px dotted #8a7a54; white-space:nowrap; overflow:hidden;
    text-overflow:ellipsis; background:linear-gradient(180deg,#efe7d0,#ded0ae);
    border-radius:2px 2px 0 0; line-height:30px; }
  .lf-ink2.is-empty{ font-family:'JetBrains Mono',monospace; font-size:11px;
    letter-spacing:.14em; color:#8a7a5499; text-transform:uppercase; }
  .lf-dial{ display:inline-flex; align-items:baseline; gap:5px;
    padding:5px 18px; min-width:78px; justify-content:center;
    border-radius:3px; cursor:ns-resize; user-select:none;
    background:linear-gradient(180deg,#d9b970 0 42%, #a8853f 42%, #7a5f2c);
    border:1px solid #3a2a12;
    box-shadow:inset 0 1px 0 #ffffff66, 0 2px 5px #0009; }
  .lf-dial b{ font:700 28px/1 'JetBrains Mono',monospace; color:#2c2418; }
  .lf-dial i{ font:700 6.5px/1 Oswald,sans-serif; letter-spacing:.14em;
    color:#5a451f; font-style:normal; }
  .lf-dial:hover{ filter:brightness(1.08); }
  .lf-wax{ width:48px; height:48px; border-radius:50%; border:none;
    cursor:pointer; position:relative; padding:0;
    background:radial-gradient(circle at 36% 30%, #d4564a, #8f2a20 58%, #5e1a14);
    box-shadow:inset 0 -3px 6px #0007, 0 3px 7px #0009; }
  .lf-wax span{ font:700 9px/1 Oswald,sans-serif; letter-spacing:.1em;
    color:#f7d9d2; text-shadow:0 1px 1px #0008; }
  .lf-wax[disabled]{ filter:grayscale(.65) brightness(.6); cursor:not-allowed; }
  .lf-wax:not([disabled]):hover{ filter:brightness(1.12); }
  .lf-wax:not([disabled]):active{ transform:translateY(2px); }
  .lf-counter.is-sealed .lf-wax{ animation:lfWax .45s cubic-bezier(.2,2,.4,1); }
  @keyframes lfWax{ 0%{ transform:scale(1); }
    40%{ transform:scale(1.5) rotate(-8deg); }
    100%{ transform:scale(1.15) rotate(-4deg); } }
  .lf-counter.is-sealed .lf-ink2{ text-decoration:line-through;
    opacity:.75; }

  /* the DEVICE takes the amount: the bid meter in the cockpit slot */
  .lf-meter{ display:flex; align-items:baseline; gap:8px; padding:6px 8px;
    border:1px solid #2b6f9c55; border-radius:4px; background:#0a121adf;
    min-height:30px; }
  .lf-meter .lf-mlot{ font:700 9.5px/1.2 Oswald,sans-serif;
    letter-spacing:.08em; color:#d6f0ff; max-width:120px; overflow:hidden;
    white-space:nowrap; text-overflow:ellipsis; }
  .lf-meter .lf-mlot.is-empty{ color:#4aa8e088; font-weight:400;
    font-size:8px; letter-spacing:.14em; text-transform:uppercase; }
  .lf-meter .lf-mamt{ font:700 22px/1 'JetBrains Mono',monospace;
    color:#d6f0ff; text-shadow:0 0 8px rgba(74,168,224,.6); }
  .lf-meter .lf-mcur{ font-size:7px; letter-spacing:.16em; color:#4aa8e0; }
  /* on the device the meter sits on the tray line; pressing it raises the
     bid, the CLR key lowers, the CONFIRM key seals */
  body.cabin-on #hull-console .lf-meter{ position:absolute; left:230px;
    top:342px; width:196px; height:46px; margin:0; cursor:pointer;
    pointer-events:auto; justify-content:center; align-items:center; }
  body.cabin-on #hull-console .lf-meter:hover{ filter:brightness(1.2); }

  /* the storage docket, filed IN the case's EQUIPMENT recess (the case art
     is 800x500; the recess sits base-right, its printed label at y370) */
  /* measured, not guessed: briefcase.svg is 800x500 drawn at background-size
     100% anchored top, so the art covers 93.1% of the zone height. The
     EQUIPMENT recess lives at art x420..710, y250..365. */
  /* READ FROM THE ART, not from the rotated screen: briefcase.svg is 800x500
     drawn at background-size 100% anchored top. The EQUIPMENT compartment is
     the trapezoid M344,300 L662,300 L678,384 L354,384, label printed at y379.
     The slips lie inside it; the brass plate is hardware on the lip below. */
  /* asking: the case is OPEN, so the docket uses the whole base (both
     compartments, art x 130..678, y 300..384), two columns of slips */
  /* WHEN THE CASE ASKS, IT OPENS. The narrow EQUIPMENT recess is the RESTING
     shape, right for showing what you own. Asking is a different act: the
     offer now carries the pieces' bodies and the three row sockets, so even
     ONE of them needs the whole base. The old rule opened the case only past
     three offers, a threshold from when a slip was a line of names.
     Measured while asking with one offer: 268x67, which is a caption, not a
     question. */
  .lf-casedock{ position:absolute; left:16.3%; right:15.3%; top:52%;
    bottom:26%; pointer-events:auto; z-index:6; display:flex;
    flex-direction:column; justify-content:center; align-items:center;
    gap:6px; padding:0; }
  .lf-casedock.is-wide{ display:grid;
    grid-template-columns:1fr 1fr; grid-auto-rows:min-content;
    align-content:center; align-items:start; gap:6px 14px; }
  /* resting: only what you own, filed in the EQUIPMENT recess as a stack */
  /* ══ O BILHETE DE LOTE NO RACK DO ESTOJO ══════════════════════════════
     Ele NAO tem gaveta propria: mora no mesmo rack dos vouchers classicos
     (.ruck-vouchers, o compartimento VOUCHERS que ja existe na tampa do
     estojo), herda o mesmo tamanho, o mesmo talao recortado e a mesma
     inclinacao de leque que os outros tres. O que muda e so o miolo do
     .tkt-body (o cartaz em miniatura, em vez do texto empilhado) e o
     .tkt-stub (o numero do processo, mais estreito que "1" ou "x3", entao
     a fonte encolhe para caber sem sair do talao). */
  /* ══ O TALAO TINHA COR E MAIS NADA ═══════════════════════════════════
     Ele era um retangulo chapado na cor da familia, com o numero no meio: um
     quadrado roxo no canto do bilhete, sem desenho nenhum. Num ingresso de
     verdade o canhoto e a parte mais impressa da peca, porque e ela que fica
     com a casa: papel mais escuro, tinta batida, o numero em estencil e a
     assinatura correndo na vertical.
     A cor da familia continua sendo a base, entao raridade e familia seguem
     legiveis, mas agora ela e o FUNDO de uma impressao e nao a impressao. */
  .ruck-voucher.tkt.lf-lotticket .tkt-stub{
    position:relative; overflow:hidden;
    background:
      repeating-linear-gradient(135deg, rgba(0,0,0,.13) 0 2px,
        transparent 2px 5px),
      radial-gradient(120% 90% at 30% 12%, rgba(255,255,255,.22), transparent 62%),
      linear-gradient(168deg, var(--tk,#7a5330), rgba(0,0,0,.55));
    box-shadow:inset -1px 0 0 rgba(0,0,0,.45),
      inset 1px 0 0 rgba(255,255,255,.12); }
  /* a casa assina o canhoto, correndo na vertical como em bilhete de sala */
  .ruck-voucher.tkt.lf-lotticket .tkt-stub::after{
    content:"C.R.O.N.O.S."; position:absolute; left:1px; top:50%;
    transform:translateY(-50%) rotate(180deg); writing-mode:vertical-rl;
    font:400 .3rem/1 var(--f-mono,monospace); letter-spacing:.14em;
    color:rgba(255,242,214,.5); pointer-events:none; }
  /* o furo do picote, no vinco, do lado de dentro do canhoto */
  .ruck-voucher.tkt.lf-lotticket .tkt-stub::before{
    content:""; position:absolute; right:-3px; top:50%; width:6px; height:6px;
    margin-top:-3px; border-radius:50%; background:rgba(0,0,0,.5);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.18); }
  .ruck-voucher.tkt.lf-lotticket .tkt-stub b{ font-size:.5rem;
    letter-spacing:.02em; }
  .ruck-voucher.tkt.lf-lotticket .tkt-body{ padding:0;
    overflow:hidden; background:transparent; border:0; }
  .lf-tface{ display:block; width:100%; height:100%; }
  /* o piscar de quando a boca da maquina engole o bilhete */
  .lf-offer.lf-fed{ animation:lfFed .5s ease-out; }
  @keyframes lfFed{
    0%{ box-shadow:0 0 0 0 rgba(127,211,160,.9); }
    100%{ box-shadow:0 0 0 14px rgba(127,211,160,0); } }
  #rucksack-zone .lf-casedock{ pointer-events:auto; }
  body.cabin-on #rucksack-zone:has(.lf-casedock){ pointer-events:auto; }
  /* DUAS PELES PARA O MESMO NOME. O docket ATIVO (decisao aberta) continua
     sendo o papel de trabalho, com pecas, linhas e a troca de dado dentro;
     o compartimento OCIOSO guarda envelopes arquivados. Uma regra unica para
     os dois foi o que espremeu o docket inteiro em 34px por acidente. */
  .lf-casedock .lf-offer{ position:relative; display:flex; align-items:center;
    flex-wrap:wrap; min-height:19px; max-width:96%; gap:5px;
    padding:3px 7px 3px 16px; cursor:pointer; color:#2c2418;
    margin-left:calc(var(--stagger,0) * 8px);
    background:
      repeating-linear-gradient(0deg, transparent 0 9px, #b9a97e22 9px 10px),
      linear-gradient(176deg,#efe7d0,#ddd0b0);
    border:1px solid #8a7a54; border-radius:2px;
    box-shadow:0 1px 0 #c9bb95, 0 3px 8px #0007;
    transform:rotate(calc(var(--tilt,0) * 1deg));
    transition:transform .16s cubic-bezier(.3,1.3,.5,1), filter .14s ease; }
  /* O OBJETO ARQUIVADO TEM TAMANHO PROPRIO. A tira antiga crescia com o
     comprimento do nome escrito nela e o compartimento dancava a cada lote
     ganho. O envelope mede o que mede, sempre. */
  .lf-casedock.is-idle .lf-offer{ min-height:0; padding:0; background:none;
    border:0; box-shadow:none; margin-left:0; }
  .lf-casedock .lf-offer:nth-child(2){ --tilt:.9; --stagger:1; }
  .lf-casedock .lf-offer:nth-child(3){ --tilt:-.7; --stagger:2; }
  .lf-casedock .lf-offer:hover{ transform:translateY(-2px) rotate(0deg);
    filter:brightness(1.06); }
  /* PUXAR O ENVELOPE E O GESTO. Ele sobe da gaveta como pasta puxada pela
     aba, e e esse movimento que vai disparar a abertura do pacote. */
  .lf-casedock.is-idle .lf-offer:hover{ transform:translateY(-7px) rotate(0deg);
    filter:brightness(1.1); z-index:3; }
  .lf-casedock .lf-offer b{ font:700 10px/1.15 Oswald,sans-serif;
    letter-spacing:.04em; white-space:nowrap; overflow:hidden;
    text-overflow:ellipsis; }
  .lf-casedock .lf-offer.is-armed{ border-color:#3f7a3a;
    box-shadow:0 1px 0 #c9bb95, 0 0 10px rgba(63,122,58,.35); }
  .lf-casedock .lf-punch{ position:absolute; left:6px; top:50%; width:7px;
    height:7px; margin-top:-3.5px; border-radius:50%; background:#c9bb95;
    box-shadow:inset 0 1px 2px #0007; }
  /* ══ A TROCA DE DADO, no papel do lote armado ══════════════════════════
     Os seus dados aparecem em fila; o tocado ganha a marca de condenado
     (vermelho, atravessado) e e ele que morre quando o novo entra. */
  .lf-swap{ display:flex; align-items:center; gap:4px; flex-wrap:wrap;
    margin-top:4px; padding-top:4px; border-top:1px dashed #00000033; }
  .lf-swap b{ flex-basis:100%; font:600 7px/1.2 Oswald,sans-serif;
    letter-spacing:.12em; text-transform:uppercase; color:#5a4a2c; }
  .lf-swopt{ position:relative; padding:2px; border:1.5px solid #8a7a54;
    border-radius:3px; background:#00000012; cursor:pointer; line-height:0; }
  .lf-swopt .lf-pbody{ --lf-s:18px; }
  .lf-swopt.is-doomed{ border-color:#8f2530; background:#8f253022; }
  .lf-swopt.is-doomed::after{ content:""; position:absolute; left:2px;
    right:2px; top:50%; height:2px; background:#8f2530;
    transform:rotate(-18deg); box-shadow:0 0 4px #8f253088; }

  .lf-casedock .lf-ink-stamp{ margin-left:auto; font:700 7.5px/1
    Oswald,sans-serif; letter-spacing:.16em; color:#3f7a3a;
    border:1.5px solid #3f7a3a; border-radius:2px; padding:2px 4px;
    transform:rotate(-5deg); font-style:normal; }
  .lf-casedock .lf-ink-stamp:empty{ display:none; }
  .lf-caseplate{ position:absolute; left:57%; width:13%; top:79%;
    height:6.4%; z-index:7; pointer-events:auto;
    font:700 7.5px/1 Oswald,sans-serif; letter-spacing:.2em; color:#2c2418;
    border-radius:2px; border:1px solid #3a2a12; cursor:pointer;
    background:linear-gradient(180deg,#d9b970 0 40%, #a8853f 40%, #7a5f2c);
    box-shadow:inset 0 1px 0 #ffffff66, 0 2px 5px #0009; }
  /* THE ARM WAS EATING THE PAPERS. The gauntlet art is drawn over the desk
     with pointer-events, so a slip lying under your own hand could not be
     picked up. While the case is open the limb is transparent to the mouse:
     the device is not in use during the consumption anyway. */
  body.lf-case-open #hull-manopla,
  body.lf-case-open #hull-manopla *{ pointer-events:none !important; }
  .lf-caseplate:hover{ filter:brightness(1.1); }
  .lf-caseplate:active{ transform:translateY(1px); }

  .lf-manila{ position:absolute; pointer-events:auto; width:330px;
    padding:10px 12px 12px; transform:rotate(-1.6deg); color:#2c2418;
    background:
      repeating-linear-gradient(0deg, transparent 0 15px, #b9a97e26 15px 16px),
      linear-gradient(176deg,#efe7d0 0%, #e6d9b8 70%, #d9c9a2 100%);
    border:1px solid #8a7a54; border-radius:2px;
    box-shadow:0 2px 0 #c9bb95, 0 12px 24px #0009; }
  .lf-mn-head{ border-bottom:1.5px solid #8a2a14; padding-bottom:4px;
    margin-bottom:7px; }
  .lf-mn-head b{ display:block; font:700 10px/1 Oswald,sans-serif;
    letter-spacing:.2em; color:#8a2a14; }
  .lf-mn-head span{ font-size:6px; letter-spacing:.12em; color:#6b5c3c; }
  .lf-manila .lf-offer{ position:relative; display:flex; align-items:center;
    gap:8px; padding:6px 8px 6px 22px; margin-bottom:5px; cursor:pointer;
    border:1px dashed #8a7a54; border-radius:2px; background:#fff2; }
  .lf-manila .lf-offer:hover{ background:#fff6; }
  .lf-manila .lf-offer.is-armed{ border-style:solid; border-color:#3f7a3a;
    background:#e8f0dc; }
  .lf-punch{ position:absolute; left:7px; top:50%; width:8px; height:8px;
    margin-top:-4px; border-radius:50%; background:#d9c9a2;
    box-shadow:inset 0 1px 2px #0006; }
  .lf-manila .lf-offer .mono{ font-size:8.5px; color:#8a7a54; }
  .lf-manila .lf-offer b{ font-size:10.5px; color:#2c2418; }
  .lf-ink-stamp{ margin-left:auto; font:700 9px/1 Oswald,sans-serif;
    letter-spacing:.2em; color:#3f7a3a; border:1.5px solid #3f7a3a;
    border-radius:2px; padding:2px 5px; transform:rotate(-4deg);
    font-style:normal; }
  .lf-ink-stamp:empty{ display:none; }
  .lf-plate{ display:block; margin:9px auto 0; font:700 9.5px/1
    Oswald,sans-serif; letter-spacing:.18em; color:#f2e2c2;
    padding:7px 16px; border-radius:3px; border:1px solid #57452a;
    background:linear-gradient(180deg,#8a6f3c,#57452a); cursor:pointer;
    box-shadow:0 3px 7px #0008; }
  .lf-plate:active{ transform:translateY(1px); }

  /* dockets: consumo by the case, allocation by the machine */
  .lf-docket{ position:absolute; pointer-events:auto; padding:12px 14px;
    background:linear-gradient(178deg,#20242e,#171a22);
    border:1px solid #3a4152; border-radius:6px;
    box-shadow:0 14px 40px #000c; color:#d8dbe2; min-width:340px; }
  .lf-docket h3{ margin:0 0 8px; font:700 12px/1.2 Oswald,sans-serif;
    letter-spacing:.16em; color:#e8dfc8; }
  .lf-offer{ border:1px solid #3a4152; background:#12151c; padding:6px 8px;
    margin-bottom:6px; cursor:pointer; display:flex; align-items:center;
    gap:10px; }
  .lf-offer.is-armed{ border-color:#c9a45c;
    box-shadow:0 0 8px rgba(201,164,92,.3); }
  .lf-offer .mono{ font-size:10px; color:#8a92a5; }
  .lf-offer b{ font-size:11px; color:#e8dfc8; }
  .lf-btn{ font:700 11px/1 Oswald,sans-serif; letter-spacing:.14em;
    padding:8px 16px; border-radius:4px; border:1px solid #6b5433;
    background:linear-gradient(180deg,#8a6f3c,#57452a); color:#f2e2c2;
    cursor:pointer; }
  .lf-btn[disabled]{ filter:grayscale(.6) brightness(.7);
    cursor:not-allowed; }
  .lf-ghost{ background:#20242e; border-color:#3a4152; color:#8a92a5; }

  .lf-valve{ display:inline-flex; align-items:center; gap:6px; padding:5px 10px;
    border:1px solid #2fa3a3; border-radius:4px; color:#7fd3c9;
    font-size:9px; letter-spacing:.14em; cursor:pointer; }
  .lf-valve.is-full{ opacity:.45; }
  /* O MANOMETRO DA VALVULA. Os soquetes sao marcas cheias ou vazias; a carga
     e uma coluna que sobe dentro de um tubo, com o tique do limiar no topo.
     Nenhum algarismo: a altura da coluna E a informacao. */
  .lf-vgauge{ display:inline-flex; align-items:flex-end; gap:8px;
    padding:4px 2px; }
  .lf-vpips{ display:flex; flex-direction:column; gap:3px; }
  .lf-vpips i{ width:13px; height:5px; border-radius:1px;
    background:#00000055; box-shadow:inset 0 0 0 1px #6b5c3c; }
  .lf-vpips i.on{ background:linear-gradient(#f2d06b,#a5813f);
    box-shadow:0 0 6px #f2d06b77, inset 0 1px 0 #fff6; }
  .lf-vtube{ position:relative; width:11px; height:34px; border-radius:2px;
    background:linear-gradient(#100c07,#1b140c);
    box-shadow:inset 0 0 0 1px #6b5c3c, inset 0 2px 5px #000a; }
  .lf-vtube b{ position:absolute; left:1px; right:1px; bottom:1px;
    border-radius:1px; background:linear-gradient(#7fd3a0,#2f7d52);
    box-shadow:0 0 7px #4fae7a88;
    transition:height .35s cubic-bezier(.3,1,.4,1); }
  /* o tique do limiar: onde a recompensa dispara */
  .lf-vtube s{ position:absolute; left:-3px; right:-3px; top:2px; height:1.5px;
    background:#d6b06a; opacity:.8; }
  /* the LIVE machine: empty sockets shown, real widths, class-tinted dice */
  .matrix-wrap .lf-void{ opacity:.22; border-style:dashed !important;
    pointer-events:none; }
  .matrix-wrap .lf-empty-lab{ color:#55503f !important; }
  .matrix-wrap .cell.lf-legal{ outline:2px solid #c9a45c; outline-offset:-2px;
    cursor:pointer; box-shadow:inset 0 0 10px rgba(201,164,92,.22); }
  #machine-body .matrix-wrap, #machine-body .cell{ pointer-events:auto; }
  /* the pip-boy's command banner floats over the CRT exactly where the
     matrix lives; it is read-only text and must never eat a click */
  .mano-cmd, #mano-cmd{ pointer-events:none !important; }
  /* ── THE DICE: class reads by EFFECT, value stays the loudest thing ── */
  .lf-die2{ position:relative; overflow:visible; }
  .lf-die2 .pips-face{ position:relative; z-index:3; }
  .lf-die-art{ position:absolute; inset:0; width:100%; height:100%;
    pointer-events:none; z-index:2; }
  /* blessed: a warm halo that breathes, and two slow sparks */
  .die.lf-g-abencoado{ animation:lfHalo 2.4s ease-in-out infinite; }
  @keyframes lfHalo{
    0%,100%{ box-shadow:inset 0 -4px 0 rgba(0,0,0,.28), 0 0 8px 1px
      rgba(242,208,107,.5), 0 3px 7px #0009; }
    50%{ box-shadow:inset 0 -4px 0 rgba(0,0,0,.28), 0 0 20px 5px
      rgba(242,208,107,.85), 0 3px 7px #0009; } }
  .lf-spark{ position:absolute; width:3px; height:3px; border-radius:50%;
    background:#fff6d0; box-shadow:0 0 6px 2px rgba(242,208,107,.9);
    pointer-events:none; z-index:4; }
  .lf-spark.s1{ left:-2px; top:6px; animation:lfSpark 2.6s ease-in-out infinite; }
  .lf-spark.s2{ right:-2px; bottom:5px;
    animation:lfSpark 2.6s ease-in-out 1.3s infinite; }
  @keyframes lfSpark{
    0%,70%,100%{ opacity:0; transform:translateY(0) scale(.6); }
    18%{ opacity:1; transform:translateY(-7px) scale(1); }
    45%{ opacity:0; transform:translateY(-13px) scale(.5); } }
  /* ══ O QUANTICO CALCULA ═══════════════════════════════════════════════
     Preto de terminal com fosforo verde. Duas colunas de numerais correm em
     velocidades diferentes atras da face, uma varredura passa por cima, e a
     face fica vazia: ele nao TEM valor ainda. Quando a celula o resolve, a
     chuva para de um golpe e o numeral copiado acende. */
  .die.lf-g-quantico, .die.lf-g-quantum{ overflow:hidden;
    background:linear-gradient(#0e1a12,#060b08) !important;
    box-shadow:inset 0 0 10px 2px #000, 0 0 0 1px #1f7a48,
      0 0 10px 1px rgba(45,220,120,.22), 0 3px 7px #000c; }
  .die.lf-g-quantico .pips-face, .die.lf-g-quantum .pips-face{
    color:#3ef58e !important; text-shadow:0 0 8px #2dd97a, 0 0 2px #000;
    opacity:0; }
  .die.lf-g-quantico.is-solved .pips-face,
  .die.lf-g-quantum.is-solved .pips-face{ opacity:1; }
  .lf-qrain{ position:absolute; inset:0; z-index:2; pointer-events:none;
    display:flex; flex-direction:column; align-items:center;
    font:700 8px/1.35 'JetBrains Mono',monospace; color:#2dd97a;
    text-shadow:0 0 5px #1f9e55; opacity:.72;
    animation:lfQRain 1.15s linear infinite; }
  .lf-qrain.r2{ left:auto; right:2px; width:9px; opacity:.4;
    animation-duration:1.75s; animation-direction:reverse; }
  .lf-qrain i{ font-style:normal; }
  @keyframes lfQRain{ from{ transform:translateY(-48%); }
    to{ transform:translateY(0); } }
  /* a varredura: uma linha de leitura descendo, como um scanner pensando */
  .lf-qscan{ position:absolute; left:0; right:0; height:7px; z-index:3;
    pointer-events:none;
    background:linear-gradient(rgba(62,245,142,0), rgba(62,245,142,.55),
      rgba(62,245,142,0));
    animation:lfQScan 1.6s ease-in-out infinite; }
  @keyframes lfQScan{ 0%{ top:-8px; } 100%{ top:100%; } }
  /* resolvido: a conta para, o verde esfria e o numero copiado fica */
  .die.lf-g-quantico.is-solved .lf-qrain,
  .die.lf-g-quantum.is-solved .lf-qrain{ opacity:.14; animation:none; }
  .die.lf-g-quantico.is-solved .lf-qscan,
  .die.lf-g-quantum.is-solved .lf-qscan{ display:none; }
  @media (prefers-reduced-motion: reduce){
    .lf-qrain, .lf-qscan{ animation:none; } }

  /* nestes dois o SIGILO e o personagem: o numeral recua para tras dele */
  .die.lf-g-abencoado .pips-face, .die.lf-g-amaldicoado .pips-face{
    opacity:.42; font-size:13px; }
  /* ══ OS DOIS SIGILOS ══════════════════════════════════════════════════
     A cruz e o pentagrama sao o mesmo objeto ao contrario: mesmo circulo,
     mesma espessura, um sinal para cima e um para baixo. Cada um traz a sua
     poeira: o abencoado sobe em ouro, o amaldicoado cai em brasa. */
  /* branco quente, nao dourado: no corpo de ouro um sigilo dourado some.
     A luz atravessa a face; a marca e o que queima. */
  /* O SINAL E ASSINATURA, O NUMERO E A DECISAO.
     Os dois sigilos ocupavam a face inteira (inset:0), no centro e com brilho
     por cima: fotografados na tabela dos oito geradores, o amaldicoado nao
     mostrava valor nenhum em estado nenhum, nem rolado. Um dado ilegivel nao
     serve para decidir lance, e saber quantos amaldicoados eu tenho E a
     decisao do leilao.
     Entao o sigilo desce para o canto, com pouco mais de um terco da face, e
     o meio do dado volta a ser do algarismo. A identidade continua inteira:
     a cruz e o pentagrama ainda sao um espelho do outro, so que nenhum dos
     dois manda mais no centro. */
  /* 52% e nao 44%: a 44 o pentagrama virava um asterisco e deixava de ser
     reconhecivel como pentagrama, que e metade do trabalho dele. */
  .lf-sigil-holy, .lf-sigil-hell{ inset:auto -2px -2px auto;
    width:52%; height:52%; z-index:2; opacity:.95; }
  .lf-sigil-holy{ stroke:#fffdf2;
    filter:drop-shadow(0 0 4px #fff1b8) drop-shadow(0 0 7px #f2d06b); }
  .lf-sigil-hell{ stroke:#ff4450;
    filter:drop-shadow(0 0 4px #c0202add) drop-shadow(0 0 1px #000); }
  /* e o algarismo fica sendo a coisa mais alta e mais forte da peca */
  .die.lf-g-abencoado .pips-face, .die.lf-g-amaldicoado .pips-face{
    position:relative; z-index:5; }

  /* AS MOTAS DO ABENCOADO sobem, douradas, quatro em tempos diferentes para
     nao pulsarem juntas como um pisca-pisca. */
  .lf-mote{ position:absolute; width:2.5px; height:2.5px; border-radius:50%;
    background:#fff8dc; box-shadow:0 0 6px 2px rgba(242,208,107,.95);
    pointer-events:none; z-index:4; opacity:0; }
  .lf-mote.m1{ left:4px;  bottom:3px; animation:lfRise 2.8s ease-out infinite; }
  .lf-mote.m2{ left:14px; bottom:1px; animation:lfRise 3.4s ease-out .7s infinite; }
  .lf-mote.m3{ right:5px; bottom:4px; animation:lfRise 3.1s ease-out 1.5s infinite; }
  .lf-mote.m4{ right:13px; bottom:2px; animation:lfRise 3.7s ease-out 2.2s infinite; }
  @keyframes lfRise{
    0%{ opacity:0; transform:translateY(0) scale(.5); }
    15%{ opacity:1; transform:translateY(-4px) scale(1); }
    70%{ opacity:.7; transform:translateY(-15px) scale(.8); }
    100%{ opacity:0; transform:translateY(-24px) scale(.3); } }

  /* AS BRASAS DO AMALDICOADO caem, vermelhas, e apagam em fuligem preta antes
     de sumir: e a mesma poeira do outro, so que ao contrario. */
  .lf-ember{ position:absolute; width:2.5px; height:2.5px; border-radius:50%;
    background:#ff5a4a; box-shadow:0 0 6px 2px rgba(192,32,42,.95);
    pointer-events:none; z-index:4; opacity:0; }
  .lf-ember.e1{ left:5px;  top:2px; animation:lfFall 3.0s ease-in infinite; }
  .lf-ember.e2{ left:15px; top:0;   animation:lfFall 3.5s ease-in .9s infinite; }
  .lf-ember.e3{ right:4px; top:3px; animation:lfFall 3.2s ease-in 1.7s infinite; }
  .lf-ember.e4{ right:14px; top:1px; animation:lfFall 3.8s ease-in 2.4s infinite; }
  @keyframes lfFall{
    0%{ opacity:0; transform:translateY(0) scale(.5); background:#ff8a5a; }
    15%{ opacity:1; transform:translateY(4px) scale(1); background:#ff5a4a; }
    65%{ opacity:.85; transform:translateY(15px) scale(.75); background:#8e1218; }
    100%{ opacity:0; transform:translateY(24px) scale(.3); background:#140406; } }

  @media (prefers-reduced-motion: reduce){
    .lf-mote, .lf-ember{ animation:none; opacity:0; } }

  /* cursed: light bends INWARD, a negative halo of paradox violet */
  .die.lf-g-amaldicoado{ box-shadow:inset 0 0 14px 5px rgba(0,0,0,.92),
    0 0 0 1px rgba(192,32,42,.95), 0 0 9px 1px rgba(192,32,42,.35),
    0 3px 7px #000c; }
  /* O VALOR TEM QUE SER LEGIVEL. O amaldicoado ficou bonito e mudo: o vazio
     dele era um disco PREENCHIDO que comecava no centro (preto a 92% ate 30%
     do raio) e ficava POR CIMA da face, entao ele apagava justamente o
     numero. Um dado que voce nao consegue ler nao serve para decidir lance
     nenhum, e saber que tenho dois amaldicoados e a decisao do leilao.
     O vazio vira um ANEL: o centro fica limpo, a luz entorta so na borda, e
     a face sobe para cima dele. A assinatura visual continua inteira, e o
     algarismo volta. */
  .die.lf-g-amaldicoado .pips-face{ color:#fff0ee !important;
    position:relative; z-index:3;
    text-shadow:0 0 9px #e8323c, 0 1px 2px #000, 0 0 3px #000; }
  .lf-void2{ position:absolute; inset:-6px; border-radius:9px; z-index:0;
    pointer-events:none;
    background:radial-gradient(circle at 50% 50%, transparent 40%,
      rgba(8,0,2,.9) 56%, rgba(192,32,42,.36) 68%, transparent 80%);
    animation:lfVoid 3.1s ease-in-out infinite; }
  @keyframes lfVoid{ 0%,100%{ transform:scale(.94); opacity:.75; }
    50%{ transform:scale(1.1); opacity:1; } }
  /* quantum: the face will not settle */
  .die.lf-g-quantum{ animation:lfJitter 1.9s steps(1) infinite; }
  @keyframes lfJitter{ 0%{ transform:translate(0,0); }
    22%{ transform:translate(.7px,-.6px); }
    44%{ transform:translate(-.6px,.5px); }
    66%{ transform:translate(.4px,.7px); }
    88%{ transform:translate(-.5px,-.4px); } }
  .lf-qghost{ position:absolute; inset:0; display:flex; align-items:center;
    justify-content:center; z-index:2; pointer-events:none;
    font:700 14px/1 'JetBrains Mono',monospace; color:#7fd3f0;
    animation:lfGhost 1.4s ease-in-out infinite; }
  @keyframes lfGhost{ 0%,100%{ opacity:0; transform:scale(1.35); }
    50%{ opacity:.55; transform:scale(1); } }
  /* cracked: the fracture is drawn, the corner is chipped */
  .die.lf-g-rachado{ clip-path:polygon(0 0, 88% 0, 100% 14%, 100% 100%,
    0 100%); }
  /* stable: nothing moves, and it says so with a steel collar */
  .die.lf-g-estavel{ animation:none !important; }
  /* ══ A SILHUETA CONTA AS FACES ════════════════════════════════════════
     Tamanho foi a linguagem antiga e ela estava errada por dois motivos: o
     Bruto e o Tita estouravam os espacos que ocupavam, e "maior" sugeria
     "melhor" quando a medicao diz o contrario (dado com mais faces casa MENOS,
     6,7% contra 11,1%, entao ele e mais LARGO e nao mais forte).

     Agora os tres tem o mesmo tamanho e a forma faz o trabalho. Quadrado e o
     dado padrao. Losango, quatro pontas, e o de IV: o mesmo quadrado girado,
     mesma familia, corte diferente. Pentagono, cinco lados, e o de V.

     As pontas do losango encostam nas bordas da caixa de proposito: inscrito
     "certinho" ele teria metade da area do quadrado e leria como MENOR, que e
     exatamente a inversao que a gente quer evitar. */
  .die.lf-g-big{ transform:none !important; }

  .die.lf-g-bruto{
    clip-path:polygon(50% -2%, 102% 50%, 50% 102%, -2% 50%);
    background:linear-gradient(150deg,#4a5560,#2a3138) !important;
    box-shadow:none; }
  .die.lf-g-bruto .pips-face{ color:#ffcf9a !important;
    text-shadow:0 0 6px #c9722e, 0 1px 0 #000; font-size:14px; }
  .die.lf-g-bruto .lf-die-art{ display:none; }

  .die.lf-g-tita{
    clip-path:polygon(50% -2%, 102% 38%, 82% 103%, 18% 103%, -2% 38%);
    background:linear-gradient(160deg,#6b4bb0,#2e1b52) !important;
    box-shadow:none; }
  .die.lf-g-tita .pips-face{ color:#f0e6ff !important;
    text-shadow:0 0 8px #a880ff, 0 1px 0 #000; font-size:14px;
    transform:translateY(-1px); }

  /* o aro: o corpo perdeu a sombra ao ser recortado, entao a borda vira o
     peso. Desenhada por dentro, senao o clip a corta fora. */
  .lf-edge{ position:absolute; inset:0; z-index:2; pointer-events:none; }
  .lf-edge polygon{ fill:none; vector-effect:non-scaling-stroke; }
  .die.lf-g-bruto .lf-edge polygon{ stroke:#e08b4a; stroke-width:2.4; }
  .die.lf-g-tita .lf-edge polygon{ stroke:#c9a6ff; stroke-width:2.2; }

  /* os REBITES do Bruto: quatro pontas, quatro rebites, quatro faces */
  .lf-rivet{ position:absolute; width:3px; height:3px; border-radius:50%;
    background:#f0b070; box-shadow:0 0 4px 1px rgba(224,139,74,.8);
    z-index:3; pointer-events:none; }
  .lf-rivet.v1{ left:calc(50% - 1.5px); top:5px; }
  .lf-rivet.v2{ right:5px; top:calc(50% - 1.5px); }
  .lf-rivet.v3{ left:calc(50% - 1.5px); bottom:5px; }
  .lf-rivet.v4{ left:5px; top:calc(50% - 1.5px); }

  /* as CINCO FACETAS do Tita, saindo do centro para cada vertice, e uma luz
     fria varrendo uma de cada vez para ele nunca ficar parado */
  .lf-facet{ position:absolute; inset:0; z-index:1; pointer-events:none;
    opacity:.5; }
  .lf-facet line{ stroke:#d8c4ff; stroke-width:.9;
    vector-effect:non-scaling-stroke; }
  .die.lf-g-tita::after{ content:""; position:absolute; inset:0; z-index:2;
    pointer-events:none; border-radius:0;
    background:conic-gradient(from 0deg, transparent 0deg,
      rgba(232,222,255,.42) 18deg, transparent 40deg, transparent 360deg);
    animation:lfFacet 4.6s linear infinite; }
  @keyframes lfFacet{ to{ transform:rotate(360deg); } }
  @media (prefers-reduced-motion: reduce){
    .die.lf-g-tita::after{ animation:none; opacity:.25; } }

  /* ── THE MATRIX MUST BE READABLE AT A GLANCE ──
     The console forces every cell to one green with !important, so a machine
     of three different functions read as one green wall. Colour is the label:
     each row wears its family, empty sockets stay dark, sealed rows go cold. */
  /* THE MACHINE STAYS LIT ALL HOUR IN THE AUCTION.
     app.css hides it outside the allocation:
       body.cabin-on:not(.allocating):not(.buffing):not(.gen-live)
         #hull-console .matrix-wrap { opacity: 0 }
     which is the classic game's law and correct there. Here your rows ARE the
     thing you are bidding to build, so you must be able to read them while you
     choose a lot and while you choose a socket. Same law, one more condition,
     so it wins on specificity instead of shouting !important at it. */
  body.lf-on.cabin-on:not(.allocating):not(.buffing):not(.gen-live)
    #hull-console .matrix-wrap{ opacity:1; }
  body.cabin-on #hull-console .matrix-wrap .cell.lf-fam-recarga,
  body.cabin-on #hull-console .matrix-wrap .cell.lf-fam-defesa{
    background:rgba(20,60,40,.42) !important;
    border-color:rgba(95,208,138,.55) !important; }
  body.cabin-on #hull-console .matrix-wrap .cell.lf-fam-paradoxo,
  body.cabin-on #hull-console .matrix-wrap .cell.lf-fam-boom{
    background:rgba(46,26,66,.5) !important;
    border-color:rgba(180,154,232,.55) !important; }
  body.cabin-on #hull-console .matrix-wrap .cell.lf-fam-viagem,
  body.cabin-on #hull-console .matrix-wrap .cell.lf-fam-especial{
    background:rgba(18,48,64,.5) !important;
    border-color:rgba(126,200,224,.55) !important; }
  body.cabin-on #hull-console .matrix-wrap .cell.lf-void{
    background:rgba(8,12,10,.55) !important;
    border-style:dashed !important;
    border-color:rgba(120,140,130,.22) !important; opacity:1 !important; }
  body.cabin-on #hull-console .matrix-wrap .cell.locked{
    background:rgba(60,20,14,.45) !important;
    border-color:rgba(224,86,31,.5) !important; }
  /* the row label: a family glyph and the width, no clipped words */
  .lf-rowlab{ display:flex !important; align-items:center; gap:3px;
    font-size:0 !important; }
  .lf-fglyph{ width:15px; height:15px; display:block; }
  .lf-fglyph svg{ width:15px; height:15px; display:block; }
  .fn-recharge .lf-fglyph{ color:#6fe0a0; }
  .fn-paradox .lf-fglyph{ color:#b49ae8; }
  .fn-travel .lf-fglyph{ color:#7ec8e0; }
  .lf-fempty{ color:#4a5a52; opacity:.5; }
  .fn-sealed .lf-fglyph{ color:#e0561f; opacity:.7; }
  .lf-wpips{ display:flex; flex-direction:column; gap:1.5px; }
  .lf-wpips i{ width:5px; height:3px; border-radius:1px;
    background:rgba(255,255,255,.14); }
  .lf-wpips i.on{ background:currentColor; }
  .fn-recharge .lf-wpips{ color:#6fe0a0; }
  .fn-paradox .lf-wpips{ color:#b49ae8; }
  .fn-travel .lf-wpips{ color:#7ec8e0; }
  /* the console kills pointer events on the whole matrix (specificity 1,2,1),
     so the row must claim them back or nothing can be read by hovering */
  body.cabin-on #hull-console .matrix-wrap .lf-rowlab,
  body.cabin-on #hull-console .matrix-wrap .cell{ pointer-events:auto; }
  /* HOVER: the full reading of the row, raised clear of the glass */
  /* the reading lands on the DESK beside the device, never over the glass
     it is explaining */
  /* it used to hold three lines of text; it now holds three rows of drawn
     houses, and 236px made a four-house row pile on itself */
  .lf-readout{ position:absolute; left:calc(100% + 26px); top:-26px;
    transform:translateX(-8px); width:330px; padding:10px 12px;
    opacity:0; pointer-events:none; z-index:40;
    background:linear-gradient(178deg,#101820f2,#0a1016f2);
    border:1px solid #2b6f9c66; border-radius:5px;
    box-shadow:0 12px 30px #000c;
    transition:opacity .16s ease, transform .16s cubic-bezier(.3,1.2,.5,1); }
  .lf-readout.on{ opacity:1; transform:translateX(0); }
  .lf-readout::before{ content:""; position:absolute; left:-9px; top:34px;
    width:0; height:0; border:5px solid transparent;
    border-right-color:#2b6f9c66; }
  .lf-readout b{ display:block; font:700 9.5px/1.3 Oswald,sans-serif;
    letter-spacing:.14em; color:#d6f0ff; margin-bottom:4px; }
  /* one line per house: its number, the house DRAWN at a calm size, and the
     piece's own name when a coupler or a parasite is sitting on it */
  .lf-readout span{ --lf-s:28px; display:flex; align-items:center; gap:7px;
    flex-wrap:nowrap; padding:4px 0; font-size:9px; line-height:1.4;
    color:#9fb6c4; }
  .lf-readout span .lf-mcell{ flex:0 0 auto; }
  .lf-readout i{ flex:0 0 13px; width:13px; height:13px;
    border-radius:2px; text-align:center; font-style:normal;
    font:700 8px/13px 'JetBrains Mono',monospace; color:#06121a;
    background:#4aa8e0; }
  .lf-readout .lf-idle{ font-style:normal; opacity:.55; }
  .lf-readout .lf-rtag{ font-style:normal; font-size:8px; color:#c8a8ff; }
  .lf-readout .lf-mcell{ --lf-ground:#101820; background:none; border:none;
    filter:drop-shadow(0 0 3px currentColor); color:#8fd8ff; }

  /* THE CONSOLE PAINTED EVERY DIE GREEN. app.css forces the pip-boy tray dice
     to one phosphor green with !important, so class identity died exactly
     where the player looks most. The auction dice take their body back. */
  body.cabin-on #hull-console .dice-pool .die.lf-die2,
  body.cabin-on #hull-console .cell .die.lf-die2{
    background:linear-gradient(160deg, var(--gen,#d8c9a3),
      color-mix(in srgb, var(--gen,#d8c9a3) 55%, #000)) !important;
    color:#14110c !important;
    border:1px solid color-mix(in srgb, var(--gen,#d8c9a3) 70%, #000) !important;
    box-shadow:inset 0 -4px 0 rgba(0,0,0,.28), 0 3px 7px #0009 !important; }
  body.cabin-on #hull-console .die.lf-die2 .pips-face{ color:#14110c !important;
    text-shadow:0 1px 0 rgba(255,255,255,.28) !important; }
  body.cabin-on #hull-console .die.lf-g-amaldicoado{
    box-shadow:inset 0 0 12px 3px rgba(0,0,0,.85),
      0 0 0 1px rgba(154,85,201,.9), 0 3px 7px #000c !important; }
  body.cabin-on #hull-console .die.lf-g-amaldicoado .pips-face{
    color:#f2e8ff !important; text-shadow:0 0 7px #b06ee0, 0 0 2px #000 !important; }
  body.cabin-on #hull-console .die.lf-g-quantum .pips-face{
    color:#062733 !important; }
  body.cabin-on #hull-console .die.lf-g-estavel{
    border-color:#6fae6a !important; }

  /* every generator class wears its own body over the classic die */
  .die[class*="lf-g-"]{ background:linear-gradient(160deg,
      var(--gen,#d8c9a3), color-mix(in srgb, var(--gen,#d8c9a3) 55%, #000));
    box-shadow:inset 0 -4px 0 rgba(0,0,0,.28), 0 3px 7px #0009; }
  .die[class*="lf-g-"] .pips-face{ color:#14110c;
    text-shadow:0 1px 0 rgba(255,255,255,.25); }
  .die.lf-g-cursed .pips-face{ color:#f2e8ff; text-shadow:0 0 6px #d9b0ff; }
  .die.lf-g-quantum .pips-face{ color:#062733; }
  .die.lf-g-rachado{ position:relative; }
  .die.lf-g-rachado::after{ content:""; position:absolute; inset:0;
    background:linear-gradient(115deg, transparent 46%, #14110c88 47%,
      transparent 49%, transparent 58%, #14110c66 59%, transparent 61%);
    border-radius:inherit; pointer-events:none; }
  /* o antigo scale(1.18) saiu com o resto: forma no lugar de tamanho */
  .die[data-v="?"] .pips-face{ font-size:15px; }
  .die.selected{ outline:2px solid #c9a45c; outline-offset:2px;
    transform:translateY(-2px); }

  /* the aim keys sit on the device tray, phosphor over brass */
  .lf-aimrow{ display:flex; gap:6px; }
  body.cabin-on #hull-console .lf-aimrow{ position:absolute; left:230px;
    top:342px; width:196px; height:46px; margin:0; }
  .lf-aimrow, .lf-aimkey{ pointer-events:auto; }
  .lf-aimkey{ flex:1; display:flex; flex-direction:column; gap:2px;
    align-items:center; justify-content:center; cursor:pointer;
    border:1px solid #2b6f9c88; border-radius:4px; background:#0a121adf;
    color:#d6f0ff; padding:4px 2px; }
  .lf-aimkey:hover{ filter:brightness(1.35); }
  .lf-aimkey b{ font:700 8px/1 Oswald,sans-serif; letter-spacing:.12em; }
  .lf-aimkey span{ font-size:6px; letter-spacing:.08em; color:#4aa8e0; }
  .lf-crt-aim{ font-size:30px; }

  .lf-aim{ display:flex; gap:10px; }
  .lf-aim button{ flex:1; display:flex; flex-direction:column; gap:3px;
    align-items:center; padding:10px 14px; }
  .lf-aim .mono{ font-size:9px; color:#8a92a5; }`;
  document.head.appendChild(css);

  // o amaldicoado era violeta de paradoxo e virou PRETO E SANGUE, a pedido:
  // o corpo escurece e so a marca queima
  const GEN_HUE = { natural:"#d8c9a3", blessed:"#f2d06b", quantum:"#0e1a12",
    cursed:"#c0202a", big:"#e08b4a" };

  function app(){ return window.__game; }
  function isLeilao(){
    const a = app();
    return !!(a && a.view && a.view.mode === "leilao");
  }
  async function loadCatalog(){
    if (catalog) return catalog;
    try {
      const r = await fetch("/api/leilao/catalogo");
      catalog = await r.json();
    } catch(e){ catalog = { funcoes:{}, geradores:{}, modulos:{},
      valvulas:{}, suprimentos:{} }; }
    // the Operations Log names auction pieces too (game.js _lfName)
    window.__leilaoCatalog = catalog;
    return catalog;
  }
  function pieceName(id){
    const c = catalog || {};
    for (const book of ["funcoes","geradores","modulos","valvulas","suprimentos"])
      if (c[book] && c[book][id]) return c[book][id].name;
    return id;
  }
  /* pieceRead and effText used to live here. They turned an effect dict into a
     line of text ("energy: die · gold: half") and that line was the whole
     reading of every piece in the auction: on the lot card, in the case, and
     on your own machine's hover. Each of those places now DRAWS the house
     instead, so the last caller went away and with it the pair of functions.
     Nothing in this phase describes a module in prose any more. */

  function unmount(){
    /* AS MARCAS DE PERGUNTA MORREM COM A FASE. Se a Hora acaba enquanto uma
       pergunta esta no ar (o jogador nao respondeu, o servidor seguiu), a
       classe fica presa no corpo: o ponteiro continua martelo para sempre, os
       dados continuam vermelhos, e a matriz continua acesa fora de hora.
       Visto numa partida de verdade: `lf-hammer` no corpo cinco Horas depois
       da pergunta que o criou.
       Elas sao estado de UMA pergunta, entao nao podem sobreviver a sala. */
    document.body.classList.remove("lf-rowpick", "lf-hammer", "lf-sem-soquete");
    document.querySelectorAll(".lf-rowtag").forEach(n => n.remove());
    clearInterval(window.__lfLeiTimer);
    window.__lfFecharAtual = null;
    document.querySelectorAll(".lf-legal, .lf-shut, .lf-eat").forEach(n =>
      n.classList.remove("lf-legal", "lf-shut", "lf-eat"));
    /* O LEITOR NAO MORRE AQUI. `unmount()` e chamado pelo despachante a CADA
       tique, antes de decidir se remonta, e ele so remonta quando o pedido
       muda. Apagar o gancho aqui matava o leitor de uma fase que continuava
       de pe: a trilha mostrou `feed=undefined` em toda tentativa, com os
       bilhetes empilhando e nada instalando, e eu culpei o cadeado por isso.
       Quem apaga o gancho e o proprio fechamento da fase. */
    try { window.__malaLock && window.__malaLock.disarm(); } catch(e){}
    document.querySelectorAll(".lf-layer").forEach(n => n.remove());
    // the window tunes back: the auction house leaves the portal whole
    ceremonyUntil = 0;
    document.body.classList.remove("lf-case-open");
    // o ouvinte de "clicar fora fecha" mora no DOCUMENTO, entao ele nao morre
    // junto com a sala: tem que ser desligado a mao antes de ela sair
    document.querySelectorAll(".lf-house").forEach(n => {
      try { n.__lfCleanup && n.__lfCleanup(); } catch(e){}
      n.remove();
    });
    // the case goes back to being just a case
    document.querySelectorAll(".lf-casedock, .lf-caseplate")
      .forEach(n => n.remove());
    // the lifethread goes back to being only the classic's
    document.querySelectorAll(".lf-shield").forEach(n => n.remove());
    document.body.classList.remove("lf-scene");
    const lz = document.getElementById("leilao-zone");
    if (lz) lz.innerHTML = "";
    const mz = document.getElementById("market-zone");
    if (mz){
      mz.classList.remove("leilao-tuned");
      // a sala sai na hora, mas o MERCADO entra sintonizando: e a mesma
      // janela achando o outro destino, e nao um corte de camera
      mz.classList.remove("lf-untune");
      void mz.offsetWidth;                  // reinicia a animacao
      mz.classList.add("lf-untune");
      setTimeout(() => mz.classList.remove("lf-untune"), 780);
    }
    mounted = null; mountedReq = null; deviceFace = null;
    const a = app();
    if (a && isLeilao() && window.__leilaoMachine && a.dom && a.dom.machine){
      try{
        window.__leilaoMachine.idle(a);
        window.__leilaoMachine.dice(a);
      }catch(e){}
    }
  }
  function layer(){
    const l = document.createElement("div");
    l.className = "lf-layer";
    document.body.appendChild(l);
    return l;
  }

  /* ── the bid: the WINDOW retunes to the auction house (lots as cards on
     easels, the same portal the Merchant uses) and the DEVICE takes the
     amount, your arm is the sealed envelope ── */
  /* ══ THE HOUSE ══════════════════════════════════════════════════════════
     One house of a function, drawn so it never needs a sentence under it.
     A house is a set of (resource, amount) pairs and the cell draws ALL of
     them. The old strip took Object.keys(eff)[0] and threw the rest away,
     which is why Recarga, Bateria and Faisca all rendered as the same bolt
     twice: three different functions, one picture.

       resource -> glyph        amount -> marks on the glyph

     `die` is the SILENCE. Three quarters of the catalogue scales with the
     roll, so decorating the common case would be noise; what earns a mark is
     the half, the +N, the double and the flat number. Direction is not a
     resource, it is where the paradox points, so it rides on the cell.

     An effect with no glyph renders LOUD. The old `|| "cog"` dressed an
     undrawn effect as a drawn one and hid how much work was left.
     ══════════════════════════════════════════════════════════════════════ */
  const RES_ICON = { energy:"energy", gold:"gold", damage:"paradox",
    century:"travel", boom:"booms", shield:"shield", charge:"lantern" };
  // a modifier qualifies a house someone else pays for. `parity` was filed here
  // by its shape and it never belonged: no house pairs it with anything, it IS
  // the house, so filtering it left the Contrapeso with nothing to draw.
  const MODIFIER = new Set(["direction"]);
  const DIR_ICON = { future:"future", past:"past", present:"paradox",
    both_fp:"both" };
  // what it COSTS you, drawn as a debit so a price never reads as a gain
  const DEBIT = new Set(["boom", "cost_gold", "cost_boom"]);
  // the named exceptions: rare pieces that bend a rule, each earning a face of
  // its own the way a Balatro joker does. These are the ones already drawn.
  const NAMED_ICON = {
    burn_for_energy:"recycle", burn_for_gold_half:"recycle",
    burn_all_present:"recycle", convert:"recycle",
    release_piece:"relic", release_valve_double:"relic", piece_charge:"relic",
    energy_hour_half:"hourglass", gold_hour_half:"hourglass",
    drain_gold_richer:"hand", lifesteal:"hand", kill_gold:"wanted",
    seed_gold:"plant", ripen:"plant", incubate:"plant",
    momentum:"travel", echo_left:"recharge", seal_break:"lock",
    membrane:"shield", reflect:"shield",
    cost_gold:"gold", cost_boom:"booms",
    // the supplies. `booms` (plural) is the Extintor CLEARING heat, which is
    // not the same key as the `boom` a travel house adds, and it arrives as a
    // negative amount. `free_past` is a voyage upstream that costs nothing;
    // `reroll` is the die thrown again.
    booms:"booms", free_past:"past", reroll:"respawn",
    // the Rele fires when the row SEALS, so the seal is half of what it is
    when_sealed:"seal" };

  /* ══ THE TWO HOUSES THE TABLE COULD NOT SAY ═══════════════════════════
     One key, one glyph is the whole grammar, and exactly two couplers break
     it. Both were drawing a red gap on a piece that works perfectly, which
     is the worst possible lie: the machine looked broken where it was fine.

       Contrapeso  a FORK. One key, two outcomes: an odd die pays energy in
                   full, an even die pays gold at half. Nothing about that
                   fits "a glyph with marks hung off it", so it draws as the
                   two outcomes with a split between them.
       Rele        no effect dict AT ALL. What it does lives in the driver:
                   when the row seals, the last die fires the house to its
                   left a second time. A face keyed on the piece, since the
                   data has nothing to key on.
     ══════════════════════════════════════════════════════════════════════ */
  const FORK = { parity: [{ energy:"die" }, { gold:"half" }] };
  const PIECE_FACE = { rele: { echo_left:1, when_sealed:"die" } };

  function pips(n){
    let s = ""; for (let i = 0; i < Math.min(n, 4); i++) s += "<b></b>";
    return s;
  }
  function amountHTML(v){
    if (v === "die") return "";                        // the silence
    if (v === "half")   return '<i class="lf-amt lf-half"></i>';
    if (v === "double") return '<i class="lf-amt lf-dbl"></i>';
    if (typeof v === "string" && v.indexOf("die+") === 0)
      return '<i class="lf-amt">' + pips(+v.slice(4)) + "</i>";
    if (typeof v === "number")
      return '<i class="lf-amt lf-flat' + (v < 0 ? " lf-minus": "") + '">'
        + pips(Math.abs(v)) + "</i>";
    return "";
  }
  function resHTML(k, v){
    const glyph = RES_ICON[k] || NAMED_ICON[k];
    if (!glyph)
      return '<u class="lf-gap" title="' + k + '">' + k.slice(0, 3) + "</u>";
    return '<span class="lf-res' + (RES_ICON[k] ? "": " is-named")
      + (DEBIT.has(k) ? " is-debit": "") + '" data-r="' + k + '">'
      + ic(glyph) + amountHTML(v) + "</span>";
  }
  /* ══════════════════════════════════════════════════════════════════════
     A LEITURA ESCRITA DO EFEITO

     A regra desta fase sempre foi "nunca descrever um modulo por extenso", e
     ela existe por um motivo bom: o mesmo fato desenhado E escrito polui a
     tela e ensina o jogador a ler a legenda em vez do objeto. Mas a regra
     valia para a CENA. Dentro do terceiro nivel do hover, onde o jogador
     PEDIU o detalhe, ela vira teimosia: nem todo mundo tem a iconografia
     decorada, e o mercado ja resolve isso do mesmo jeito, com a carta aberta
     dizendo o que faz.

     Entao o texto existe em UM lugar so, o mais fundo de todos, e em lugar
     nenhum antes dele: a caixa fechada continua muda, a ficha continua
     desenhada, e so quem parar em cima de uma peca especifica le a frase.
     ══════════════════════════════════════════════════════════════════════ */
  const RES_WORD = {
    energy:"Energy", gold:"Gold", damage:"Damage", century:"Century",
    boom:"Heat", shield:"Shield", charge:"Valve charge",
    cost_gold:"Costs Gold", cost_boom:"Costs Heat",
    burn_for_energy:"Burn a piece for Energy",
    burn_for_gold_half:"Burn a piece for half its Gold",
    burn_all_present:"Burn every piece in the present",
    convert:"Convert one resource into another",
    release_piece:"Release a held piece",
    release_valve_double:"Release the valve for double",
    piece_charge:"Charge from a piece",
    energy_hour_half:"Half your Energy, once an Hour",
    gold_hour_half:"Half your Gold, once an Hour",
    drain_gold_richer:"Drain Gold from whoever is richer",
    lifesteal:"Take what you deal",
    kill_gold:"Gold for a kill",
    seed_gold:"Plant Gold", ripen:"Ripen what is planted",
    incubate:"Incubate the socket beside it",
    momentum:"Momentum on the map",
    echo_left:"Echo the socket on its left",
    seal_break:"Break the next seal",
    membrane:"Membrane drinks damage",
    reflect:"Reflect damage back",
    booms:"Clears Heat", free_past:"A free voyage upstream",
    reroll:"Throw a die again", when_sealed:"Fires when the row seals",
  };
  function amountWord(v){
    if (v === true || v == null || v === "") return "";
    if (typeof v === "number")
      return (v > 0 ? "+": "") + v;
    if (v === "die") return "as your die rolls";
    if (v === "half") return "half";
    if (v === "all") return "all of it";
    return String(v);
  }
  function effWords(eff){
    eff = eff || {};
    const parts = [];
    Object.keys(eff).forEach(k => {
      if (MODIFIER.has(k)) return;
      if (FORK[k]){
        parts.push(FORK[k].map(side => {
          const sk = Object.keys(side)[0];
          return ((RES_WORD[sk] || sk) + " " + amountWord(side[sk])).trim();
        }).join(" or "));
        return;
      }
      parts.push(((RES_WORD[k] || k) + " " + amountWord(eff[k])).trim());
    });
    if (eff.direction)
      parts.push(eff.direction === "both_fp" ? "either direction"
        : eff.direction === "past" ? "upstream only"
          : eff.direction === "future" ? "downstream only": "in the present");
    return parts.length ? parts.join(" · "): "nothing on its own";
  }

  function houseHTML(eff, extraCls, pid){
    // a piece whose behaviour lives in the driver has nothing to read here
    if (pid && PIECE_FACE[pid] && !Object.keys(eff || {}).length)
      eff = PIECE_FACE[pid];
    eff = eff || {};
    const keys = Object.keys(eff).filter(k => !MODIFIER.has(k));
    let inner = "", gap = false, fork = false;
    keys.forEach(k => {
      if (FORK[k]){
        fork = true;
        inner += FORK[k].map(side => {
          const sk = Object.keys(side)[0];
          return resHTML(sk, side[sk]);
        }).join('<s class="lf-fork"></s>');
        return;
      }
      const one = resHTML(k, eff[k]);
      if (one.indexOf("lf-gap") >= 0) gap = true;
      inner += one;
    });
    if (!keys.length){ inner = '<u class="lf-gap">?</u>'; gap = true; }
    return '<i class="lf-mcell' + (extraCls ? " " + extraCls: "")
      + (keys.length > 1 || fork ? " is-pair": "") + (fork ? " is-fork": "")
      + (gap ? " is-gap": "") + '">'
      + inner + (eff.direction
        ? '<s class="lf-dir">' + ic(DIR_ICON[eff.direction] || "paradox") + "</s>"
          : "") + "</i>";
  }

  /* ══ A LOT IS ITS PIECES ══════════════════════════════════════════════
     The card used to print the FIRST piece's name as if it were the lot, then
     drop the rest into a line of small text ("+ Gerador Amaldicoado"). A kit
     is not a piece, and a thing already drawn does not also need to be spelt.

     So every piece is drawn as the object it BECOMES in your machine:

       a function  -> a machine ROW, three sockets, its houses filled and the
                      rest left dark. That dark socket is the whole point: two
                      thirds of the catalogue fills two of three, and what the
                      gap is worth depends on the machine looking at it.
       a generator -> the very die you will roll, in its own class art
       a module    -> one house, grafted (coupler) or eating (parasite)
       valve/supply-> a fitting, its own small body
     ══════════════════════════════════════════════════════════════════════ */
  const ROW_SOCKETS = 3;

  function pieceBodyHTML(pid){
    const c = catalog || {};
    const fn = c.funcoes && c.funcoes[pid];
    if (fn){
      const houses = fn.modules.map(eff => houseHTML(eff)).join("");
      let empty = "";
      for (let i = fn.modules.length; i < ROW_SOCKETS; i++)
        empty += '<i class="lf-mcell is-void"></i>';
      return '<span class="lf-pbody lf-prow2 lf-fam-'
        + (fn.family || "recarga") + '">' + houses + empty + "</span>";
    }
    const gn = c.geradores && c.geradores[pid];
    // the die is a real element, so it is stamped in after the paint: see the
    // dressPieces pass. Order of assembly is a contract.
    if (gn) return '<span class="lf-pbody lf-pdie" data-gid="' + pid
      + '"></span>';
    const md = c.modulos && c.modulos[pid];
    if (md) return '<span class="lf-pbody lf-pmod is-' + md.kind + '">'
      + houseHTML(md.effect, "lf-mod", pid) + "</span>";
    const vl = c.valvulas && c.valvulas[pid];
    if (vl) return '<span class="lf-pbody lf-pfit is-valve">'
      + ic("lantern") + "</span>";
    const sp = c.suprimentos && c.suprimentos[pid];
    if (sp) return '<span class="lf-pbody lf-pfit is-supply">'
      + houseHTML(sp.effect) + "</span>";
    return '<span class="lf-pbody"><u class="lf-gap">' + pid + "</u></span>";
  }

  /* ══ O QUE A CAIXA DIZ SEM ESCREVER ═══════════════════════════════════
     Tres canais, e nenhum deles e a borda: no mercado borda colorida quer
     dizer ERA, e um canal ocupado nao se reaproveita para outro significado.

       o ESTENCIL na tampa  -> o que tem dentro (categoria)
       a FITA e o LACRE     -> o que fizeram com ela (raridade)
       o que VAZA           -> quanto ela e rara, em poeira e luz
     ══════════════════════════════════════════════════════════════════════ */
  // o numero do lote em algarismo romano, que e a lingua do jogo inteiro
  const roman = n => ["","I","II","III","IV","V","VI"][n] || String(n);

  function categoryStencil(l){
    const c = catalog || {};
    const first = (l.pieces || [])[0];
    if (first && c.funcoes && c.funcoes[first])
      return '<i class="lf-st-row"><b></b><b></b><b></b></i>';
    if (first && c.geradores && c.geradores[first])
      return '<i class="lf-st-die"></i>';
    if (first && c.modulos && c.modulos[first])
      return '<i class="lf-st-mod"></i>';
    if (first && c.valvulas && c.valvulas[first]) return ic("lantern");
    if (first && c.suprimentos && c.suprimentos[first]) return ic("briefcase");
    return '<i class="lf-st-die"></i>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     O LOTE E UM OBJETO DESENHADO POR LOTE, NAO UMA FIGURA REPETIDA

     Antes existia UM evidencebox.svg servindo a todos, e o CSS colava por
     cima uma fita colorida. Duas coisas nunca funcionaram assim: nenhuma
     caixa era diferente da outra, e a raridade era um adesivo em vez de ser
     a MATERIA da caixa. Uma imagem so nao aceita nem uma coisa nem outra,
     porque de fora nao da para trocar o que esta dentro do arquivo.

     Entao o desenho passa a nascer aqui, um por lote, no metodo da maleta:
     material como gradiente nomeado, um grupo por parte fisica, e volume por
     tres luminosidades da mesma cor. Duas coisas mudam por lote:

     A RARIDADE muda a MATERIA. Papelao cru, papelao com cinta e cera,
     arquivo cinza com cantoneira de latao, cofre de metal acorrentado,
     apreensao com fita de pericia cruzada, e o lacrado sem etiqueta. Voce
     reconhece de longe pelo que a caixa E, sem ler uma palavra.

     A SEMENTE muda o EXEMPLAR. O numero do processo semeia amassados,
     manchas, o angulo da etiqueta, o desgaste dos cantos e a mao que
     escreveu. Duas caixas comuns na mesma mesa nunca saem iguais.
     ══════════════════════════════════════════════════════════════════════ */
  const RARITY = {
    comum: { top:"#d9bb8c", mid:"#bd9a68", low:"#a8875a", side:"#8a6f48",
      dark:"#6b5636", edge:"#6f5937", hw:"none", glow:"", corner:"",
      stamp:"#5c3320" },
    incomum: { top:"#d3b98d", mid:"#b79a6b", low:"#9d8058", side:"#836b46",
      dark:"#64513a", edge:"#5f5238", hw:"wax", glow:"#6fbf8e", corner:"", stamp:"#4a3a22"},
    rara: { top:"#9aa6ad", mid:"#7d8a93", low:"#66727b", side:"#4e5a63",
      dark:"#39434b", edge:"#2f383f", hw:"rib", glow:"#a97fe0",
      corner:"#8e7a44", stamp:"#e8dfc8"},
    paradoxal: { top:"#5d6470", mid:"#464d59", low:"#363c47", side:"#2a303a",
      dark:"#1c2029", edge:"#141821", hw:"chain", glow:"#c9b0ff",
      corner:"#6d6f86", stamp:"#c9d2e6"},
    rigged: { top:"#c9a97c", mid:"#ad8b5d", low:"#93744b", side:"#775c39",
      dark:"#5a452b", edge:"#4d3a22", hw:"tamper", glow:"#ff6a4a", corner:"", stamp:"#3f2a16"},
    selado: { top:"#2f2c2b", mid:"#232120", low:"#1a1817", side:"#141312",
      dark:"#0d0c0c", edge:"#000000", hw:"lock", glow:"#5fd08a", corner:"", stamp:"#6f6f6f"},
  };

  /* uma semente estavel por lote: o mesmo lote desenha sempre o mesmo
     exemplar, entao a caixa nao "pisca" de aparencia a cada repintura */
  function lotSeed(s){
    let h = 2166136261;
    const t = String(s || "H0");
    for (let i = 0; i < t.length; i++){
      h ^= t.charCodeAt(i); h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function lotRng(seed){
    let x = seed || 1;
    return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5;
      x >>>= 0; return (x % 100000) / 100000; };
  }

  /* A CAIXA PRECISA PODER SER FOTOGRAFADA FORA DA PARTIDA. As seis classes
     nunca caem juntas na mesma mesa (a raridade e sorteada), entao provar que
     elas se distinguem exigia esperar a sorte. Expor o desenhista deixa a
     sonda montar a folha das seis lado a lado e comparar de verdade. Nao muda
     nada do jogo: e a mesma funcao que a fase ja usa. */
  window.__lfCrate = (lot, i) => crateSVG(lot, i || 0);
  window.__lfPoster = (pieces, key, w, h) =>
    '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="'
    + h + '">' + posterInner(pieces, key, w, h) + '</svg>';

  /* ══════════════════════════════════════════════════════════════════════
     O CARTAZ DA CORPORACAO

     A ideia resolve dois problemas de uma vez. Primeiro, a
     caixa fechada precisava dizer o que tem dentro sem escrever "funcao de
     recarga"; segundo, o que sai do leilao precisava virar um objeto que o
     jogador guarda e usa. Um CARTAZ resolve os dois, porque cartaz e uma
     coisa que anuncia: ele fala do conteudo pela imagem, e a mesma arte serve
     colada na caixa e impressa no ticket.

     O estilo e o do cartaz institucional de meados do seculo: papel creme,
     duas ou tres tintas chapadas, uma banda de titulo em condensada, um raio
     de sol atras do assunto, um slogan imperativo embaixo e o selo da
     reparticao no rodape. Nada disso e ilustracao solta: o MOTIVO no meio e
     sempre a propria peca desenhada grande, na gramatica das casas que o
     jogo ja usa, para o cartaz nunca mentir sobre o que esta anunciando.

     A voz e a do Bureau do Paradoxo, que vende o futuro a quilo e chama isso
     de oportunidade. Nenhuma referencia a outra franquia: o mundo daqui tem
     Hora, energia, ouro, selo e paradoxo, e e disso que os slogans falam.

     Poucos desenhos: um por familia de funcao e um por tipo de dado. Lote com
     varias pecas junta os motivos no mesmo cartaz.
     ══════════════════════════════════════════════════════════════════════ */
  const POSTER = {
    recarga:  { ink:"#2f6b4c", ink2:"#7fb894", paper:"#f2ead2",
                head:"KEEP THE COLUMN FED",
                slogan:"AN IDLE MACHINE IS AN UNPAID DEBT" },
    viagem:   { ink:"#2b5878", ink2:"#7fa9c6", paper:"#eef0e0",
                head:"THE CENTURY IS A COMMUTE",
                slogan:"ARRIVE BEFORE YOUR ARREARS DO" },
    defesa:   { ink:"#4a5568", ink2:"#9fb0c2", paper:"#eeeade",
                head:"STAND BEHIND THE PLATE",
                slogan:"DAMAGE ABSORBED IS DAMAGE UNBILLED" },
    boom:     { ink:"#a0432a", ink2:"#e0a06a", paper:"#f5e8d2",
                head:"HEAT IS A RESOURCE",
                slogan:"CARRY IT. DO NOT SPILL IT." },
    paradoxo: { ink:"#5b3a86", ink2:"#b299d6", paper:"#efe6ea",
                head:"IRREGULAR BY DESIGN",
                slogan:"THE BUREAU MAKES EXCEPTIONS. FOR A PRICE." },
    especial: { ink:"#8a5a1f", ink2:"#d9b06a", paper:"#f4ecd6",
                head:"FILED UNDER EXCEPTIONAL",
                slogan:"ONE OF THESE PER TIMELINE. ALLEGEDLY." },
    // os geradores, por tipo
    die:      { ink:"#7a5a22", ink2:"#d8b25e", paper:"#f4ead0",
                head:"ROLL WITHIN REGULATION",
                slogan:"THE HOUR DOES NOT WAIT FOR A GOOD FACE" },
    cursed:   { ink:"#7a1d24", ink2:"#d4646d", paper:"#f0e2d8",
                head:"DECLARED UNLUCKY",
                slogan:"IT ROLLS LAST. IT ROLLS LOWEST." },
    blessed:  { ink:"#8a6a1f", ink2:"#f2d06b", paper:"#f7efd6",
                head:"CERTIFIED FAVOURABLE",
                slogan:"IT WAITS. THEN IT TAKES THE BEST." },
    quantum:  { ink:"#1f5e46", ink2:"#5fd0a0", paper:"#e6efe6",
                head:"STILL CALCULATING",
                slogan:"A VALUE IS ASSIGNED ON ARRIVAL" },
    big:      { ink:"#7a4a1f", ink2:"#e0a05a", paper:"#f4e8d0",
                head:"MORE FACES, FEWER FRIENDS",
                slogan:"A WIDE DIE CLOSES NARROW DOORS" },
  };

  /* qual cartaz uma peca puxa: funcao pela familia, dado pelo tipo */
  function posterKeyOf(pid){
    const c = catalog || {};
    const fn = c.funcoes && c.funcoes[pid];
    if (fn) return POSTER[fn.family] ? fn.family: "especial";
    const gn = c.geradores && c.geradores[pid];
    if (gn){
      const k = gn.kind || "";
      if (POSTER[k]) return k;
      return "die";
    }
    return "especial";
  }

  /* ── O MOTIVO: a propria peca, grande ──
     Um cartaz que anuncia uma peca tem que mostrar A PECA. Funcao vira a
     fileira de casas dela em tamanho de poster; dado vira o corpo do dado
     com a marca do tipo. Assim o desenho nunca descola do que existe. */
  function posterMotif(pid, P, cx, cy, s){
    const c = catalog || {};
    const fn = c.funcoes && c.funcoes[pid];
    const g = (x, y, w, h, fill) => '<rect x="' + (x).toFixed(1) + '" y="'
      + (y).toFixed(1) + '" width="' + w.toFixed(1) + '" height="'
      + h.toFixed(1) + '" rx="' + (3 * s).toFixed(1) + '" fill="' + fill
      + '"/>';
    if (fn){
      const n = Math.max(1, (fn.modules || []).length);
      const w = 26 * s, gap = 7 * s;
      const total = n * w + (n - 1) * gap;
      let out = "";
      for (let i = 0; i < n; i++){
        const x = cx - total / 2 + i * (w + gap);
        out += g(x, cy - 17 * s, w, 34 * s, P.ink);
        out += g(x + 5 * s, cy - 12 * s, w - 10 * s, 10 * s, P.paper);
        out += g(x + 5 * s, cy + 2 * s, w - 10 * s, 6 * s, P.ink2);
      }
      // os soquetes vazios, desenhados como vazios
      for (let i = n; i < ROW_SOCKETS; i++){
        const x = cx - total / 2 + i * (w + gap);
        out += '<rect x="' + x.toFixed(1) + '" y="' + (cy - 17 * s).toFixed(1)
          + '" width="' + w.toFixed(1) + '" height="' + (34 * s).toFixed(1)
          + '" rx="' + (3 * s).toFixed(1) + '" fill="none" stroke="' + P.ink
          + '" stroke-width="' + (2 * s).toFixed(1)
          + '" stroke-dasharray="' + (4 * s).toFixed(1) + " "
          + (3 * s).toFixed(1) + '"/>';
      }
      return out;
    }
    // um dado: corpo quadrado com a marca do tipo
    const r = 24 * s;
    let out = '<rect x="' + (cx - r).toFixed(1) + '" y="' + (cy - r).toFixed(1)
      + '" width="' + (2 * r).toFixed(1) + '" height="' + (2 * r).toFixed(1)
      + '" rx="' + (7 * s).toFixed(1) + '" fill="' + P.ink + '"/>'
      + '<rect x="' + (cx - r + 4 * s).toFixed(1) + '" y="'
      + (cy - r + 4 * s).toFixed(1) + '" width="' + (2 * r - 8 * s).toFixed(1)
      + '" height="' + (2 * r - 8 * s).toFixed(1) + '" rx="'
      + (5 * s).toFixed(1) + '" fill="none" stroke="' + P.ink2
      + '" stroke-width="' + (2 * s).toFixed(1) + '"/>';
    const gn = c.geradores && c.geradores[pid];
    const kind = gn && gn.kind;
    if (kind === "cursed")
      out += '<path d="M' + cx + " " + (cy + 13 * s) + " L"
        + (cx + 12 * s) + " " + (cy - 10 * s) + " L" + (cx - 19 * s) + " "
        + (cy + 4 * s) + " L" + (cx + 19 * s) + " " + (cy + 4 * s) + " L"
        + (cx - 12 * s) + " " + (cy - 10 * s) + ' Z" fill="none" stroke="'
        + P.paper + '" stroke-width="' + (2.6 * s).toFixed(1)
        + '" stroke-linejoin="round"/>';
    else if (kind === "blessed")
      out += '<path d="M' + cx + " " + (cy - 15 * s) + " V" + (cy + 15 * s)
        + " M" + (cx - 10 * s) + " " + (cy - 6 * s) + " H" + (cx + 10 * s)
        + '" stroke="' + P.paper + '" stroke-width="' + (4 * s).toFixed(1)
        + '" stroke-linecap="round"/>';
    else if (kind === "quantum")
      out += '<text x="' + cx + '" y="' + (cy + 8 * s)
        + '" text-anchor="middle" font-family="monospace" font-size="'
        + (22 * s).toFixed(1) + '" fill="' + P.paper + '">?</text>';
    else
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (6 * s).toFixed(1)
        + '" fill="' + P.paper + '"/>';
    return out;
  }

  /* o mesmo anuncio, reimpresso deitado para caber na frente da caixa */
  function posterWide(list, seedKey, w, h, P0, noPaper){
    // impressa em caixa escura, a peca inverte: o que era tinta vira o claro
    const P = P0.dark
      ? Object.assign({}, P0, { ink: P0.paper, paper: P0.ink })
        : P0;
    const rnd = lotRng(lotSeed(seedKey || "H0") + 23);
    const S = h / 90;                       // o sistema deitado tem 90 de alto
    const W = w / S;                        // e a largura que sobrar
    const X = (v) => (v * S).toFixed(1);
    const Y = (v) => (v * S).toFixed(1);
    const name = (pieceName(list[0]) || "").toUpperCase();
    const mx = 30, my = 56;                 // onde o motivo mora
    let rays = "";
    for (let i = 0; i < 12; i++){
      const a = (i / 12) * Math.PI * 2;
      rays += '<path d="M' + X(mx + Math.cos(a) * 13) + " "
        + Y(my + Math.sin(a) * 13) + " L" + X(mx + Math.cos(a) * 30) + " "
        + Y(my + Math.sin(a) * 30) + '" stroke="' + P.ink2
        + '" stroke-width="' + (3 * S).toFixed(1) + '" opacity=".45"/>';
    }
    let dots = "";
    for (let i = 0; i < 26; i++)
      dots += '<circle cx="' + X(rnd() * W) + '" cy="' + Y(rnd() * 90)
        + '" r="' + (0.9 * S).toFixed(1) + '" fill="' + P.ink
        + '" opacity="' + (0.05 + rnd() * 0.08).toFixed(2) + '"/>';
    const ms = list.length === 1 ? 0.62: 0.34;
    let motifs = "";
    list.forEach((pid, i) => {
      const dy = list.length === 1 ? 0: (i - (list.length - 1) / 2) * 14;
      motifs += posterMotif(pid, P, mx * S, (my + dy) * S, S * ms);
    });
    return '<g class="lf-poster">'
      // no modo impresso-na-caixa o papel e a propria face do papelao, ja
      // pintada na cor do cartaz e iluminada pelo gradiente dela
      + (noPaper ? "": '<rect width="' + X(W) + '" height="' + Y(90)
          + '" fill="' + P.paper + '"/>')
      // NUMA CAIXA ESCURA A IMPRESSAO INVERTE. Tinta escura sobre metal
      // escuro nao e leitura, e borrao: no cofre e no lacrado o anuncio e
      // impresso ao contrario, com a tinta clara fazendo o desenho.

      + '<rect width="' + X(W) + '" height="' + Y(22) + '" fill="' + P.ink
      + '"/>'
      + '<text x="' + X(W / 2) + '" y="' + Y(16) + '" text-anchor="middle"'
      + ' font-family="Oswald,Impact,sans-serif" font-size="'
      + (13 * S).toFixed(1) + '" fill="' + P.paper + '" textLength="'
      + ((W - 12) * S).toFixed(1) + '" lengthAdjust="spacingAndGlyphs">'
      + P.head + "</text>"
      + rays + motifs
      // o nome na tarja clara, a direita do motivo
      + '<rect x="' + X(58) + '" y="' + Y(34) + '" width="' + ((W - 66) * S).toFixed(1)
      + '" height="' + Y(18) + '" fill="' + P.ink2 + '"/>'
      + '<text x="' + X(58 + (W - 66) / 2) + '" y="' + Y(47)
      + '" text-anchor="middle" font-family="Oswald,Impact,sans-serif"'
      + ' font-size="' + (11 * S).toFixed(1) + '" fill="' + P.ink
      + '" textLength="' + Math.min((W - 74) * S, name.length * 7.4 * S).toFixed(1)
      + '" lengthAdjust="spacingAndGlyphs">' + name + "</text>"
      + '<text x="' + X(58 + (W - 66) / 2) + '" y="' + Y(64)
      + '" text-anchor="middle" font-family="Oswald,Impact,sans-serif"'
      + ' font-size="' + (6 * S).toFixed(1) + '" fill="' + P.ink
      + '" textLength="' + ((W - 72) * S).toFixed(1)
      + '" lengthAdjust="spacingAndGlyphs">' + P.slogan + "</text>"
      + '<rect y="' + Y(78) + '" width="' + X(W) + '" height="' + Y(12)
      + '" fill="' + P.ink + '"/>'
      + '<text x="' + X(W / 2) + '" y="' + Y(86.5) + '" text-anchor="middle"'
      + ' font-family="monospace" font-size="' + (5 * S).toFixed(1)
      + '" fill="' + P.paper + '" textLength="' + ((W - 30) * S).toFixed(1)
      + '" lengthAdjust="spacingAndGlyphs">'
      + "C.R.O.N.O.S. · TEMPORAL OPERATIONS</text>"
      + dots + "</g>";
  }

  /* ── O CARTAZ ──
     Devolve o MIOLO de um svg (sem a tag svg), desenhado num sistema de
     200x260, para poder ser embutido tanto na caixa quanto no ticket. */
  function posterInner(pieces, seedKey, w, h){
    const list = (pieces || []).slice(0, 3);
    const key = posterKeyOf(list[0]);
    const P = POSTER[key] || POSTER.especial;
    // ── A VERSAO DEITADA ──
    // A frente de uma caixa e larga e rasa; o cartaz de parede e alto. Forcar
    // o cartaz retrato num retangulo deitado so daria uma tarja espremida.
    // Uma grafica de verdade reimprime o mesmo anuncio no formato do suporte,
    // entao aqui existe a mesma peca em duas diagramacoes: a de parede, e
    // esta, com a banda de titulo em cima, o motivo a esquerda e o nome e o
    // slogan a direita. Mesma tinta, mesmo papel, mesma voz.
    if (w / Math.max(1, h) > 1.25)
      return posterWide(list, seedKey, w, h, P);
    const rnd = lotRng(lotSeed(seedKey || "H0") + 11);
    const u = "p" + String(seedKey).replace(/\W/g, "") + "_";
    const S = Math.min(w / 200, h / 260);
    const X = (v) => (v * S + (w - 200 * S) / 2).toFixed(1);
    const Y = (v) => (v * S + (h - 260 * S) / 2).toFixed(1);
    const name = (pieceName(list[0]) || "").toUpperCase();

    // o raio de sol atras do assunto, a marca deste estilo de cartaz
    let rays = "";
    for (let i = 0; i < 16; i++){
      const a = (i / 16) * Math.PI * 2;
      const x1 = 100 + Math.cos(a) * 26, y1 = 132 + Math.sin(a) * 26;
      const x2 = 100 + Math.cos(a) * 78, y2 = 132 + Math.sin(a) * 78;
      rays += '<path d="M' + X(x1) + " " + Y(y1) + " L" + X(x2) + " " + Y(y2)
        + '" stroke="' + P.ink2 + '" stroke-width="' + (5 * S).toFixed(1)
        + '" opacity=".5"/>';
    }
    // o granulado da impressao barata
    let dots = "";
    for (let i = 0; i < 40; i++)
      dots += '<circle cx="' + X(10 + rnd() * 180) + '" cy="'
        + Y(10 + rnd() * 240) + '" r="' + (1.2 * S).toFixed(1) + '" fill="'
        + P.ink + '" opacity="' + (0.05 + rnd() * 0.09).toFixed(2) + '"/>';

    // o motivo, um por peca, encolhendo quando ha mais de uma
    const ms = list.length === 1 ? 1: list.length === 2 ? 0.78: 0.62;
    let motifs = "";
    list.forEach((pid, i) => {
      const dx = list.length === 1 ? 0: (i - (list.length - 1) / 2) * 52;
      motifs += '<g transform="translate(' + (dx * S * ms).toFixed(1)
        + ',0)">' + posterMotif(pid, P, +X(100), +Y(132), S * ms) + "</g>";
    });

    return '<g class="lf-poster">'
      // o papel
      + '<rect x="' + X(0) + '" y="' + Y(0) + '" width="' + (200 * S).toFixed(1)
      + '" height="' + (260 * S).toFixed(1) + '" fill="' + P.paper + '"/>'
      // a banda de titulo
      + '<rect x="' + X(0) + '" y="' + Y(0) + '" width="' + (200 * S).toFixed(1)
      + '" height="' + (44 * S).toFixed(1) + '" fill="' + P.ink + '"/>'
      // O TITULO TEM QUE CABER, SEMPRE. Fotografado, ele saia cortado dos dois
      // lados: a fonte condensada muda de largura por maquina e por slogan, e
      // qualquer tamanho fixo que sirva para uma frase estoura na proxima.
      // `textLength` obriga o desenho a caber na largura que eu reservei, e o
      // `spacingAndGlyphs` aperta letra e espaco juntos, que e exatamente o
      // que uma grafica fazia para fechar uma linha de cartaz.
      + '<text x="' + X(100) + '" y="' + Y(30)
      + '" text-anchor="middle" font-family="Oswald,Impact,sans-serif"'
      + ' font-size="' + (21 * S).toFixed(1) + '" fill="' + P.paper + '"'
      + ' textLength="' + (176 * S).toFixed(1)
      + '" lengthAdjust="spacingAndGlyphs">' + P.head + "</text>"
      // o assunto
      + rays + motifs
      // o nome proprio da peca, na tarja clara
      + '<rect x="' + X(14) + '" y="' + Y(186) + '" width="' + (172 * S).toFixed(1)
      + '" height="' + (26 * S).toFixed(1) + '" fill="' + P.ink2 + '"/>'
      + '<text x="' + X(100) + '" y="' + Y(204)
      + '" text-anchor="middle" font-family="Oswald,Impact,sans-serif"'
      + ' font-size="' + (15 * S).toFixed(1) + '" fill="' + P.ink + '"'
      + ' textLength="' + Math.min(160 * S, name.length * 10 * S).toFixed(1)
      + '" lengthAdjust="spacingAndGlyphs">' + name + "</text>"
      // o slogan
      + '<text x="' + X(100) + '" y="' + Y(228)
      + '" text-anchor="middle" font-family="Oswald,Impact,sans-serif"'
      + ' font-size="' + (8.5 * S).toFixed(1) + '" fill="' + P.ink + '"'
      + ' textLength="' + (170 * S).toFixed(1)
      + '" lengthAdjust="spacingAndGlyphs">' + P.slogan + "</text>"
      // o rodape da reparticao
      + '<rect x="' + X(0) + '" y="' + Y(238) + '" width="' + (200 * S).toFixed(1)
      + '" height="' + (22 * S).toFixed(1) + '" fill="' + P.ink + '"/>'
      + '<text x="' + X(100) + '" y="' + Y(252)
      + '" text-anchor="middle" font-family="monospace" font-size="'
      + (7 * S).toFixed(1) + '" letter-spacing="' + (2 * S).toFixed(1)
      + '" fill="' + P.paper + '">C.R.O.N.O.S. · TEMPORAL OPERATIONS</text>'
      + dots
      + "</g>";
  }

  /* A PELE DO EXEMPLAR. Duas caixas da mesma classe sao feitas do mesmo
     material, e mesmo assim nenhuma fabrica entrega duas iguais: o papelao
     sai de lotes diferentes, envelhece em prateleiras diferentes e amarela
     de um jeito diferente. Entao cada caixa desloca a propria cor um pouco,
     a partir da semente dela. A classe continua reconhecivel porque o
     deslocamento e pequeno; o exemplar fica unico porque ele existe. */
  function tintHex(hex, dl, dw){
    const n = parseInt(hex.slice(1), 16);
    let R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
    R = Math.max(0, Math.min(255, Math.round(R * dl + dw * 1.15)));
    G = Math.max(0, Math.min(255, Math.round(G * dl + dw * 0.55)));
    B = Math.max(0, Math.min(255, Math.round(B * dl - dw * 0.75)));
    return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }

  function crateSVG(l, i){
    const r = l.secret ? "selado": (l.rarity || "comum");
    const base = RARITY[r] || RARITY.comum;
    const rnd = lotRng(lotSeed(l.id) + i);
    // a pele deste exemplar: um pouco mais clara ou escura, um pouco mais
    // amarelada ou acinzentada que a irma dela na mesma mesa
    const dl = 0.88 + rnd() * 0.26, dw = rnd() * 26 - 11;
    const P = {};
    for (const k in base) P[k] = (typeof base[k] === "string"
      && base[k].charAt(0) === "#") ? tintHex(base[k], dl, dw): base[k];
    // ══ A CAIXA INTEIRA E A EMBALAGEM ══════════════════════════════════
    // O cartaz colado era um adesivo timido; o pedido e a caixa TODA
    // personalizada. Entao a paleta do cartaz da familia toma as tres faces
    // (o papelao ja sai da fabrica tingido na cor do anuncio) e a impressao
    // e feita direto na frente, sem papel por cima. A RARIDADE nao some:
    // ela continua na ferragem (cinta e cera, faixa de canto, trincos,
    // rasgo com lacre partido, cadeado), no halo e nas particulas.
    // dl e dw continuam por cima, entao dois exemplares da mesma familia
    // nunca saem com o mesmo tom.
    const AD = (!l.secret && (l.pieces || []).length)
      ? Object.assign({}, POSTER[posterKeyOf(l.pieces[0])] || POSTER.especial)
        : null;
    if (AD){
      // DOIS CANAIS, NAO UM. Na primeira tentativa a cor do anuncio SUBSTITUIU
      // as faces, e o custo apareceu na foto das seis classes: a paradoxal,
      // que era um cofre de metal escuro, virou uma caixa creme igual as
      // outras. Familia e raridade sao coisas diferentes e as duas tem que
      // sobreviver, entao a face e uma MISTURA: o tom vem do anuncio, e o
      // quanto ele escurece vem da classe. O cofre continua cofre, o lacrado
      // continua preto, e mesmo assim os dois anunciam o que carregam.
      const mix = (a, b, t) => {
        const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
        const r = Math.round(((A >> 16) & 255) * (1 - t) + ((B >> 16) & 255) * t);
        const g = Math.round(((A >> 8) & 255) * (1 - t) + ((B >> 8) & 255) * t);
        const c = Math.round((A & 255) * (1 - t) + (B & 255) * t);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + c).toString(16).slice(1);
      };
      // quanto da classe sobrevive: o cofre e o lacrado mandam quase tudo, o
      // papelao comum quase nada
      const keep = r === "selado" ? 0.82: r === "paradoxal" ? 0.72
        : r === "rara" ? 0.55: 0.44;
      P.top  = tintHex(mix(AD.paper, base.top,  keep), 1.04 * dl, dw * 0.5);
      P.mid  = tintHex(mix(AD.paper, base.mid,  keep), 0.97 * dl, dw * 0.5);
      P.low  = tintHex(mix(AD.paper, base.low,  keep), 0.90 * dl, dw * 0.5);
      P.side = tintHex(mix(AD.paper, base.side, keep), 0.78 * dl, dw * 0.5);
      P.dark = tintHex(mix(AD.paper, base.dark, keep), 0.66 * dl, dw * 0.5);
      P.edge = tintHex(mix(AD.ink, base.edge, keep * 0.5), 0.85, 0);
      // a tinta do anuncio tambem cede: numa caixa escura ela precisa clarear
      // para continuar sendo leitura, e nao um borrao mais escuro no escuro
      AD.dark = keep > 0.6;
    }
    const u = "k" + (String(l.id).replace(/\W/g, "") || i) + i + "_";
    const n = Math.max(1, Math.min(3, (l.pieces || []).length || 1));
    // O VOLUME DIZ QUANTAS PECAS. Uma peca e rasa, tres e funda: fisico, e
    // nao um numero escrito na tampa.
    const TOP = n >= 3 ? 74: n === 2 ? 90: 104;
    const H = 186 - TOP;
    const num = (v) => v.toFixed(1);
    // as pequenas mentiras que fazem parecer coisa usada
    const tilt = (rnd() * 5 - 2.5);
    const tapeA = (rnd() * 8 - 4);
    const wear = 0.2 + rnd() * 0.5;
    const lidWobble = rnd() * 2.6 - 1.3;   // a tampa nunca assenta reta
    const lidLift = rnd() * 2.4 - 0.6;     // nem sempre encosta ate o fim
    const hasTwine = rnd() > 0.58;         // amarrada com barbante?
    const hasDate = rnd() > 0.42;          // carimbo de data no canto?
    const sx = 0.93 + rnd() * 0.14;        // mais larga ou mais estreita
    const sy = 0.95 + rnd() * 0.12;        // mais alta ou mais baixa
    // O CARTAZ E MEDIDO ANTES DA FERRAGEM. Fotografado nas seis classes, ele
    // batia na cinta da incomum, na chapa da rara e no furo de mao: cada um
    // desses tres era posicionado por fracao da altura, sem saber onde o
    // cartaz termina. Agora o cartaz e a primeira medida da frente, e cinta,
    // selo e chapa se colocam em relacao a ele.
    const pw = 126, ph = Math.max(30, Math.min(50, H - 42));
    const bandY = TOP + 13 + ph;           // a primeira linha livre sob ele

    let stains = "";
    for (let s = 0; s < 2 + Math.round(rnd()); s++)
      stains += '<ellipse cx="' + num(46 + rnd() * 140)
        + '" cy="' + num(TOP + 14 + rnd() * (H - 28))
        + '" rx="' + num(7 + rnd() * 17) + '" ry="' + num(4 + rnd() * 9)
        + '" fill="' + P.edge + '" opacity="' + num(0.06 + rnd() * 0.1) + '"/>';
    // ── QUANTO ESTA GASTA ──
    // Nao basta a cor mudar: duas caixas do mesmo tom ainda saem gemeas. Cada
    // exemplar tira um GRAU DE DESGASTE, e o grau muda o que aconteceu com
    // ela no deposito. Uma acabou de chegar; outra tomou chuva num canto;
    // outra foi remendada; outra apanhou de verdade num canto amassado.
    const tier = Math.floor(rnd() * 4);          // 0 nova .. 3 surrada
    let damage = "";
    if (tier >= 1){
      // a mancha de umidade, que sobe do pe por capilaridade e seca torta
      const wx = 34 + rnd() * 110;
      damage += '<path d="M' + num(wx) + " 186 q" + num(14 + rnd() * 18) + " -"
        + num(16 + rnd() * 20) + " " + num(34 + rnd() * 26) + ' 0 Z" fill="'
        + P.edge + '" opacity="' + num(0.18 + rnd() * 0.14) + '"/>';
    }
    if (tier >= 2){
      // o remendo: alguem ja abriu esta caixa e fechou de novo com fita
      const ry = TOP + 24 + rnd() * (H - 56);
      damage += '<g transform="rotate(' + num(rnd() * 6 - 3) + " 112 "
        + num(ry) + ')"><rect x="' + num(52 + rnd() * 30) + '" y="' + num(ry)
        + '" width="' + num(52 + rnd() * 40) + '" height="10" fill="#c8b888"'
        + ' opacity=".42"/><rect x="' + num(52 + rnd() * 30) + '" y="' + num(ry)
        + '" width="' + num(52 + rnd() * 40) + '" height="2" fill="#fff"'
        + ' opacity=".16"/></g>';
    }
    if (tier >= 3){
      // o canto amassado: a aresta de cima afunda e o papelao vinca em leque
      damage += '<path d="M' + num(TOP > 90 ? 196: 196) + " " + num(TOP)
        + " l-26 3 l-6 12 l16 -2 Z\" fill=\"" + P.edge + '" opacity=".4"/>'
        + '<g stroke="' + P.edge + '" stroke-opacity=".34" stroke-width="1">'
        + '<path d="M170 ' + num(TOP + 4) + " l14 11\"/>"
        + '<path d="M176 ' + num(TOP + 3) + " l10 13\"/></g>";
    }
    // um vinco: papelao guardado torto encosta em alguma coisa e amassa
    const creaseY = TOP + 20 + rnd() * (H - 40);
    const crease = '<path d="M' + num(34 + rnd() * 30) + " " + num(creaseY)
      + " q" + num(28 + rnd() * 30) + " " + num(rnd() * 7 - 3.5) + " "
      + num(66 + rnd() * 44) + ' 1" fill="none" stroke="' + P.edge
      + '" stroke-opacity="' + num(0.2 + rnd() * 0.2) + '" stroke-width="1.4"/>';

    // ── a ferragem da raridade: o que a corporacao fez COM a caixa ──
    let hw = "";
    if (P.hw === "none"){
      // COMUM: papelao cru de verdade. Ela nao ganha nada colado; o que a
      // distingue e ser a mais POBRE da mesa. A ondulacao do papelao fica a
      // mostra na aresta, o papel e fosco e ela e a unica que nao tem
      // ferragem nenhuma. Se voce nao ve nada, e porque nao tem nada: essa e
      // a informacao.
      let corr = "";
      for (let k = 0; k < 22; k++)
        corr += '<path d="M' + num(30 + k * 7.6) + " " + num(TOP)
          + " q1.9 2.6 0 5.2\" fill=\"none\" stroke=\"" + P.edge
          + '" stroke-opacity=".3" stroke-width="1"/>';
      hw = corr;
    }
    if (P.hw === "tamper"){
      // MACABRO, NAO CARNAVALESCO. A versao anterior atravessava a frente com
      // duas fitas vermelhas berrantes e um lacre partido no meio do cartaz:
      // ficou festiva, e uma caixa que devia dar um frio na espinha virou
      // enfeite. O erro foi por a violacao no lugar mais barulhento.
      //
      // Agora a frente FICA INTEIRA, com o anuncio limpo, e o que aconteceu
      // com esta caixa e contado na LATERAL, que e onde o olho chega depois:
      // a tarja CONFIDENCIAL atravessada, o sangue seco quase preto que
      // escorreu e secou, e um unico pingo que passou pela quina e desceu
      // pela frente. Silencioso, e por isso perturbador.
      const sideT2 = 'transform="matrix(0.42,-0.30,0,' + num(H / 100)
        + ',196,' + num(TOP) + ')"';
      hw = '<g ' + sideT2 + '>'
        // o encharcado subindo do pe da lateral
        + '<path d="M0 100 V58 q16 -12 32 4 q14 14 30 -2 q16 -10 38 6 V100 Z"'
        + ' fill="#2a0509" opacity=".82"/>'
        + '<path d="M0 58 q16 -12 32 4 q14 14 30 -2 q16 -10 38 6"'
        + ' fill="none" stroke="#4d0d14" stroke-width="3" opacity=".9"/>'
        // os escorridos que desceram e secaram
        + '<g fill="#380a0f" opacity=".85">'
        + '<path d="M18 20 q5 30 -1 46 q-7 -22 1 -46 Z"/>'
        + '<path d="M52 12 q4 36 -2 54 q-6 -26 2 -54 Z"/>'
        + '<path d="M78 26 q6 24 0 40 q-8 -18 0 -40 Z"/></g>'
        // a tarja CONFIDENCIAL, atravessada e desbotada
        + '<g transform="rotate(-13 50 40)">'
        + '<rect x="-8" y="30" width="116" height="20" fill="#5e1218"'
        + ' opacity=".92"/>'
        + '<rect x="-8" y="30" width="116" height="4" fill="#8f2530"'
        + ' opacity=".7"/>'
        + '<text x="50" y="45" text-anchor="middle" font-family="Oswald,'
        + 'Impact,sans-serif" font-size="14" fill="#e8d9c4" opacity=".85"'
        + ' textLength="104" lengthAdjust="spacingAndGlyphs">CONFIDENCIAL'
        + "</text></g>"
        + "</g>"
        // O PINGO QUE PASSOU A QUINA. E ele que faz o olho voltar: a frente
        // esta limpa, e mesmo assim alguma coisa escorreu de la para ca.
        + '<path d="M193 ' + num(TOP + H * 0.52)
        + " q-4 14 -1 26 q-5 -12 -3 -26 Z\" fill=\"#2a0509\" opacity=\".8\"/>"
        + '<ellipse cx="191" cy="' + num(TOP + H * 0.82)
        + '" rx="4" ry="6" fill="#2a0509" opacity=".7"/>';
    }
    if (P.hw === "rib"){
      // A RARA REFEITA. A anterior era papelao pintado de cinza com uma tarja
      // impressa: cor diferente, objeto igual. Uma caixa de arquivo de aco de
      // verdade se distingue pela CONSTRUCAO, e nao pela cor: ela tem aba de
      // metal correndo na aresta de cima, dois trilhos estampados na frente,
      // o porta-etiqueta de latao com moldura, e o puxador embutido. Nada
      // disso existe numa caixa de papelao, entao a classe se le de longe.
      hw = // a aba de metal da aresta de cima, com a luz correndo nela
        '<path d="M28 ' + num(TOP) + " H196 V" + num(TOP + 9) + " H28 Z\""
        + ' fill="#8e9ba3"/>'
        + '<path d="M28 ' + num(TOP) + " H196 V" + num(TOP + 3) + " H28 Z\""
        + ' fill="#c3d0d8"/>'
        + '<path d="M196 ' + num(TOP) + " L238 " + num(TOP - 30) + " V"
        + num(TOP - 21) + " L196 " + num(TOP + 9) + ' Z" fill="#5d6a72"/>'
        // os trilhos estampados sairam: com o cartaz na frente eles so
        // riscavam o papel por cima e nao davam rigidez a nada
        // o puxador embutido, na altura da mao
        + '<rect x="96" y="' + num(TOP + H - 32) + '" width="62" height="17"'
        + ' rx="3" fill="#141a1e"/>'
        + '<rect x="96" y="' + num(TOP + H - 32) + '" width="62" height="4"'
        + ' rx="2" fill="#000" opacity=".55"/>'
        + '<rect x="96" y="' + num(TOP + H - 19) + '" width="62" height="3"'
        + ' rx="1.5" fill="#9fb0b8" opacity=".5"/>'
        // A TARJA VIOLETA VIROU FAIXA DE CANTO, atravessada por cima do
        // proprio cartaz como classificacao carimbada depois da impressao: o
        // canal de raridade continua inteiro e nada mais briga com chapa
        // nenhuma no meio da frente.
        + '<g transform="rotate(-45 178 ' + num(TOP + H - 20) + ')">'
        + '<rect x="146" y="' + num(TOP + H - 27) + '" width="64" height="13"'
        + ' fill="#6f45a8" opacity=".93"/>'
        + '<rect x="146" y="' + num(TOP + H - 27) + '" width="64"'
        + ' height="3.5" fill="#a97fe0" opacity=".6"/></g>';
    }
    if (P.hw === "wax")
      // A CINTA FICOU EM PE. Deitada ela atravessava o cartaz e o furo de
      // mao; em pe ela abraca a caixa por cima da tampa, como cinta de
      // arquivo de verdade, passa a ESQUERDA do cartaz e o disco de cera do
      // setor fica no pe dela, acima da etiqueta.
      hw = '<path d="M172 ' + num(TOP) + " L214 " + num(TOP - 30)
        + " h15 L187 " + num(TOP) + ' Z" fill="#3b4229"/>'
        + '<rect x="172" y="' + num(TOP) + '" width="15" height="' + num(H)
        + '" fill="#4a5334"/>'
        + '<rect x="172" y="' + num(TOP) + '" width="4" height="' + num(H)
        + '" fill="#6d7a4c" opacity=".7"/>'
        + '<circle cx="179.5" cy="' + num(TOP + H - 44)
        + '" r="12" fill="#2f7d52"/>'
        + '<circle cx="176.5" cy="' + num(TOP + H - 47)
        + '" r="7.5" fill="#74c493" opacity=".75"/>';
    if (P.hw === "tape")
      // fita violeta de sala restrita, atravessada e assinada
      hw = '<g transform="rotate(' + num(tapeA - 2) + ' 112 '
        + num(TOP + H * 0.5) + ')">'
        + '<rect x="20" y="' + num(TOP + H * 0.5 - 7) + '" width="184"'
        + ' height="14" fill="#6f45a8"/>'
        + '<rect x="20" y="' + num(TOP + H * 0.5 - 7) + '" width="184"'
        + ' height="3.4" fill="#a97fe0" opacity=".55"/>'
        + '<rect x="20" y="' + num(TOP + H * 0.5 + 3.6) + '" width="184"'
        + ' height="3.4" fill="#000" opacity=".3"/></g>';
    if (P.hw === "chain"){
      // NAO E MAIS CORRENTE POR CIMA DE PAPELAO: e outro objeto. Maleta de
      // aco com trincos, rebites e cantos arredondados, e a luz do que tem
      // dentro escapando pela juncao das duas metades.
      let rivets = "";
      for (let k = 0; k < 8; k++)
        rivets += '<circle cx="' + num(38 + k * 21) + '" cy="' + num(TOP + H - 12)
          + '" r="2.4" fill="#9aa2b0" opacity=".55"/>';
      hw = '<rect x="28" y="' + num(bandY) + '" width="168"'
        + ' height="3.4" fill="' + P.glow + '" opacity=".5"/>'
        + '<rect x="28" y="' + num(bandY) + '" width="168"'
        + ' height="1.2" fill="#fff" opacity=".3"/>'
        + rivets
        // os dois trincos
        + '<g fill="#39404d">'
        + '<rect x="52" y="' + num(bandY - 9) + '" width="24"'
        + ' height="19" rx="2.5"/>'
        + '<rect x="150" y="' + num(bandY - 9) + '" width="24"'
        + ' height="19" rx="2.5"/></g>'
        + '<g fill="#a7aebd">'
        + '<rect x="56" y="' + num(bandY - 5) + '" width="16"'
        + ' height="5" rx="1.5"/>'
        + '<rect x="154" y="' + num(bandY - 5) + '" width="16"'
        + ' height="5" rx="1.5"/></g>';
    }
    if (P.hw === "tamper2"){
      // A FAIXA VERMELHA MORREU AQUI. Ela era um adesivo colado numa caixa
      // igual as outras, e adesivo nao e informacao: dizia "isto e rigged"
      // do mesmo jeito que a palavra escrita diria. Agora a caixa esta
      // VIOLADA, e isso se ve na forma dela: a tampa nao assenta, um canto
      // foi rasgado e remendado, o lacre esta partido pendurado, e a
      // chamusca de onde alguem forcou continua no papelao.
      const tornX = 40 + rnd() * 22;
      hw = // o canto rasgado, com o miolo escuro aparecendo
        '<path d="M' + num(tornX) + " " + num(TOP + H - 46)
        + " l18 -7 l9 12 l-7 10 l-16 4 Z\" fill=\"#120c07\"/>"
        + '<path d="M' + num(tornX + 2) + " " + num(TOP + H - 44)
        + ' l14 -5 l6 9 l-6 7 l-12 3 Z" fill="' + P.edge + '" opacity=".55"/>'
        // o remendo de fita crua por cima do rasgo, torto e mal colado
        + '<g transform="rotate(' + num(tapeA * 2 - 6) + " " + num(tornX + 14)
        + " " + num(TOP + H - 40) + ')">'
        + '<rect x="' + num(tornX - 8) + '" y="' + num(TOP + H - 48)
        + '" width="48" height="15" fill="#c8b888" opacity=".5"/></g>'
        // o lacre partido, pendurado por um fio
        + '<path d="M150 ' + num(TOP + H * 0.36) + " q5 9 1 17\" stroke=\"#7a2323\""
        + ' stroke-width="1.6" fill="none"/>'
        + '<circle cx="151" cy="' + num(TOP + H * 0.36 + 20)
        + '" r="8" fill="#8f2530"/>'
        + '<path d="M144 ' + num(TOP + H * 0.36 + 17) + " l14 6\" stroke=\"#2a0d0f\""
        + ' stroke-width="2.2"/>'
        // a chamusca de quem forcou a tampa
        + '<ellipse cx="96" cy="' + num(TOP + 12) + '" rx="34" ry="9"'
        + ' fill="#140d08" opacity=".5"/>'
        + '<ellipse cx="88" cy="' + num(TOP + 10) + '" rx="18" ry="5"'
        + ' fill="#0a0604" opacity=".55"/>';
    }
    if (P.hw === "lock")
      // sem etiqueta, com tarja e cadeado: voce nao pode ler este processo
      hw = '<rect x="52" y="' + num(TOP + H * 0.34) + '" width="120"'
        + ' height="17" fill="#000"/>'
        + '<rect x="96" y="' + num(TOP + H * 0.62) + '" width="30" height="26"'
        + ' rx="3" fill="#101413"/>'
        + '<path d="M104 ' + num(TOP + H * 0.62) + ' v-8 a7 7 0 0 1 14 0 v8"'
        + ' fill="none" stroke="#5fd08a" stroke-width="3"/>'
        + '<circle cx="111" cy="' + num(TOP + H * 0.62 + 12) + '" r="3.4"'
        + ' fill="#5fd08a"/>';

    // ══════════════════════════════════════════════════════════════════════
    // O QUE TEM DENTRO, LEGIVEL COM A CAIXA FECHADA
    //
    // Ate aqui a caixa fechada so dizia a CLASSE, e o conteudo era segredo
    // ate o hover. Numa mesa de tres a seis lotes isso obriga o jogador a
    // passar o mouse em tudo antes de pensar, e um jogador experiente nao
    // deveria precisar: uma caixa de apreensao de verdade vem carimbada com
    // o que foi apreendido.
    //
    // Entao a frente ganha os CARIMBOS DE CONTEUDO, um por peca, na tinta
    // gasta de estencil. Cada familia tem a sua forma, e as formas sao as
    // mesmas da gramatica da maquina, que o jogador ja le no pip-boy:
    //   dado       -> o quadrado com o ponto
    //   funcao     -> os tres soquetes em fila
    //   modulo     -> o quadrado tracejado
    //   valvula    -> o circulo com a haste
    //   suprimento -> a maleta
    // Contar os carimbos ja diz quantas pecas tem; a forma deles diz o que
    // sao. Sem hover, sem palavra.
    const bookOf = (pid) => {
      const c = catalog || {};
      if (c.funcoes && c.funcoes[pid]) return "fn";
      if (c.geradores && c.geradores[pid]) return "die";
      if (c.modulos && c.modulos[pid]) return "mod";
      if (c.valvulas && c.valvulas[pid]) return "valve";
      if (c.suprimentos && c.suprimentos[pid]) return "sup";
      return "die";
    };
    // ── O REFORCO DE CANTO DA TAMPA ──
    // TENTATIVA 1 FALHOU E O MOTIVO IMPORTA: eu desenhei uma peca de canto
    // reto e girei por multiplos de 90°. Mas a tampa vista de tres quartos e
    // um TRAPEZIO, nao um retangulo, os cantos dela nao tem 90°, e nenhum
    // giro faz uma peca ortogonal encostar nas duas arestas ao mesmo tempo.
    // Resultado: chapas flutuando fora da tampa.
    //
    // A peca nao pode ser desenhada e depois posicionada: ela tem que ser
    // CONSTRUIDA a partir do canto. Dado o vertice P e os dois vizinhos A e
    // B, ando um pedaco por cada aresta de verdade e fecho o paralelogramo
    // P -> P+u -> P+u+v -> P+v. Assim ela hugs as duas arestas por construcao,
    // em qualquer angulo, e nao existe caso em que vaze.
    //
    // E metal: a cor nao muda com a familia da caixa (a ferragem de uma caixa
    // nao fica verde so porque o anuncio dela e verde). Sempre o mesmo aco
    // fosco das gavetas e dos grampos da sala.
    const lidCorner = (px, py, ax, ay, bx, by) => {
      const la = 30, lb = 17;                 // aresta longa, aresta curta
      const na = Math.hypot(ax - px, ay - py) || 1;
      const nb = Math.hypot(bx - px, by - py) || 1;
      const ux = (ax - px) / na * la, uy = (ay - py) / na * la;
      const vx = (bx - px) / nb * lb, vy = (by - py) / nb * lb;
      const P = (sx, sy) => num(px + ux * sx + vx * sy) + " "
        + num(py + uy * sx + vy * sy);
      const quad = (a, b, c, d) => "M" + P(a[0], a[1]) + " L" + P(b[0], b[1])
        + " L" + P(c[0], c[1]) + " L" + P(d[0], d[1]) + " Z";
      return '<g class="lf-lidcorner">'
        // a chapa, com a sombra dela por baixo
        + '<path d="' + quad([0, 0], [1, 0], [1, 1], [0, 1])
        + '" fill="#2b3138" opacity=".55"'
        + ' transform="translate(1.2,1.6)"/>'
        + '<path d="' + quad([0, 0], [1, 0], [1, 1], [0, 1])
        + '" fill="#79838f"/>'
        // o chanfro claro na aresta de fora, que e o que faz ela parecer aco
        + '<path d="' + quad([0, 0], [1, 0], [1, 0.28], [0, 0.28])
        + '" fill="#b6c0cb"/>'
        + '<path d="' + quad([0, 0], [0.2, 0], [0.2, 1], [0, 1])
        + '" fill="#b6c0cb" opacity=".7"/>'
        // o recorte interno, para nao ser so um retangulo cinza
        + '<path d="' + quad([0.42, 0.42], [1, 0.42], [1, 1], [0.42, 1])
        + '" fill="#5d6874"/>'
        // os dois rebites, um por aresta
        + '<circle cx="' + num(px + ux * 0.22 + vx * 0.62) + '" cy="'
        + num(py + uy * 0.22 + vy * 0.62) + '" r="1.6" fill="#242830"/>'
        + '<circle cx="' + num(px + ux * 0.72 + vx * 0.2) + '" cy="'
        + num(py + uy * 0.72 + vy * 0.2) + '" r="1.6" fill="#242830"/>'
        + "</g>";
    };

    // ── A ABA QUE DOBRA POR CIMA DA ARESTA ──
    // A chapa de cima sozinha ainda lia como ADESIVO: uma cantoneira de
    // verdade nao e plana, ela DOBRA por cima da quina e desce pela parede.
    // Sem essa descida nao ha 2.5D nenhum, so um desenho no tampo.
    // Anda `len` a partir do vertice P na direcao de um vizinho e desce
    // `depth` pela parede da tampa; a face de baixo e mais escura, porque
    // olha para o chao e nao para a pendente.
    const lidSkirt = (px, py, tx, ty, len, depth, dark) => {
      const n = Math.hypot(tx - px, ty - py) || 1;
      const ux = (tx - px) / n * len, uy = (ty - py) / n * len;
      const p = (sx, sy) => num(px + ux * sx) + " " + num(py + uy * sx + sy);
      return '<g class="lf-lidskirt">'
        + '<path d="M' + p(0, 0) + " L" + p(1, 0) + " L" + p(1, depth)
        + " L" + p(0, depth) + ' Z" fill="' + (dark ? "#4d565f": "#6b7681")
        + '"/>'
        // o brilho da dobra, bem no vinco da quina
        + '<path d="M' + p(0, 0) + " L" + p(1, 0) + " L" + p(1, 2.2)
        + " L" + p(0, 2.2) + ' Z" fill="#aab4bf"/>'
        // a sombra no pe da aba, onde ela solta da parede
        + '<path d="M' + p(0, depth - 2) + " L" + p(1, depth - 2)
        + " L" + p(1, depth) + " L" + p(0, depth) + ' Z" fill="#2b3138"'
        + ' opacity=".7"/>'
        + '<circle cx="' + num(px + ux * 0.5) + '" cy="'
        + num(py + uy * 0.5 + depth * 0.55) + '" r="1.5" fill="#242830"/>'
        + "</g>";
    };
    const stampAt = (kind, cx, cy, s) => {
      const st = ' fill="none" stroke="' + P.stamp + '" stroke-width="'
        + num(2.2 * s) + '" stroke-linejoin="round"';
      if (kind === "fn")
        return '<g' + st + '><rect x="' + num(cx - 15 * s) + '" y="'
          + num(cy - 8 * s) + '" width="' + num(9 * s) + '" height="'
          + num(16 * s) + '" rx="' + num(1.5 * s) + '"/><rect x="'
          + num(cx - 4.5 * s) + '" y="' + num(cy - 8 * s) + '" width="'
          + num(9 * s) + '" height="' + num(16 * s) + '" rx="' + num(1.5 * s)
          + '"/><rect x="' + num(cx + 6 * s) + '" y="' + num(cy - 8 * s)
          + '" width="' + num(9 * s) + '" height="' + num(16 * s) + '" rx="'
          + num(1.5 * s) + '"/></g>';
      if (kind === "mod")
        return '<rect x="' + num(cx - 10 * s) + '" y="' + num(cy - 10 * s)
          + '" width="' + num(20 * s) + '" height="' + num(20 * s) + '" rx="'
          + num(3 * s) + '"' + st + ' stroke-dasharray="' + num(4 * s) + " "
          + num(3 * s) + '"/>';
      if (kind === "valve")
        return '<g' + st + '><circle cx="' + num(cx) + '" cy="' + num(cy + 2 * s)
          + '" r="' + num(9 * s) + '"/><path d="M' + num(cx) + " "
          + num(cy - 7 * s) + " V" + num(cy - 14 * s) + " M" + num(cx - 6 * s)
          + " " + num(cy - 14 * s) + " H" + num(cx + 6 * s) + '"/></g>';
      if (kind === "sup")
        return '<g' + st + '><rect x="' + num(cx - 11 * s) + '" y="'
          + num(cy - 6 * s) + '" width="' + num(22 * s) + '" height="'
          + num(15 * s) + '" rx="' + num(2 * s) + '"/><path d="M'
          + num(cx - 5 * s) + " " + num(cy - 6 * s) + " V" + num(cy - 11 * s)
          + " H" + num(cx + 5 * s) + " V" + num(cy - 6 * s) + '"/></g>';
      // dado
      return '<g' + st + '><rect x="' + num(cx - 10 * s) + '" y="'
        + num(cy - 10 * s) + '" width="' + num(20 * s) + '" height="'
        + num(20 * s) + '" rx="' + num(4 * s) + '"/></g>'
        + '<circle cx="' + num(cx) + '" cy="' + num(cy) + '" r="' + num(3 * s)
        + '" fill="' + P.stamp + '"/>';
    };
    let stamps = "";
    if (r !== "selado"){
      // EM COLUNA, NA FAIXA LIVRE DA DIREITA. Em fila no meio da frente eles
      // caiam em cima do furo de mao e da etiqueta; a coluna da direita e a
      // unica area da caixa que nao tem nada, e e onde carimbo de conteudo
      // vai numa caixa de verdade, para ser lido com a caixa na prateleira.
      const list = (l.pieces || []).slice(0, 3);
      // 186, nao 172: o cartaz vai de 54 a 180, e a coluna de carimbos caia
      // em cima da beirada dele. Na faixa 176..196 ela bate no papelao puro.
      const sx = 186;
      const step = Math.min(34, (H - 34) / Math.max(1, list.length));
      const y0 = TOP + H * 0.28;
      list.forEach((pid, k) => {
        const sy = y0 + k * step;
        // cada carimbo entra torto de um jeito proprio: sao batidos a mao
        stamps += '<g opacity="' + num(0.62 + rnd() * 0.26)
          + '" transform="rotate(' + num(rnd() * 8 - 4) + " " + num(sx) + " "
          + num(sy) + ')">' + stampAt(bookOf(pid), sx, sy, 0.62) + "</g>";
      });
    }

    // ── O BARBANTE E O CARIMBO DE DATA ──
    // Duas coisas baratas que cada exemplar tem ou nao tem, sorteadas pela
    // semente. Sao elas que fazem duas caixas iguais de classe pararem de ser
    // iguais de aparencia: uma vem amarrada e a outra nao, uma foi carimbada
    // no dia da apreensao e a outra ficou sem.
    let extras = "";
    if (hasTwine)
      extras += '<g stroke="#8a7a54" stroke-width="2.4" fill="none"'
        + ' opacity=".72">'
        // a volta que sobe pela frente e passa por cima da tampa
        + '<path d="M' + num(74) + " 186 V" + num(TOP - 6) + '"/>'
        + '<path d="M74 ' + num(TOP - 6) + " L116 " + num(TOP - 36) + '"/>'
        + '<path d="M28 ' + num(TOP + H * 0.5) + ' H196"/>'
        + '<path d="M196 ' + num(TOP + H * 0.5) + " L238 "
        + num(TOP + H * 0.5 - 30) + '"/></g>'
        // o no, onde as duas voltas se cruzam
        + '<circle cx="74" cy="' + num(TOP + H * 0.5) + '" r="4.2"'
        + ' fill="#6f6240"/>';
    if (hasDate)
      extras += '<g transform="rotate(' + num(rnd() * 10 - 5) + ' 62 '
        + num(TOP + H - 22) + ')" opacity="' + num(0.4 + rnd() * 0.2) + '">'
        + '<rect x="36" y="' + num(TOP + H - 32) + '" width="52" height="19"'
        + ' rx="2" fill="none" stroke="' + P.stamp + '" stroke-width="1.6"/>'
        + '<text x="62" y="' + num(TOP + H - 19) + '" text-anchor="middle"'
        + ' font-family="monospace" font-size="9" letter-spacing="1"'
        + ' fill="' + P.stamp + '">'
        + String(1 + Math.floor(rnd() * 28)).padStart(2, "0") + "."
        + String(1 + Math.floor(rnd() * 12)).padStart(2, "0") + "</text></g>";

    // ══════════════════════════════════════════════════════════════════
    // O ACABAMENTO DO PAPELAO
    //
    // O que separava esta caixa da maleta nao era luz, era MARCENARIA. Uma
    // caixa de verdade tem coisas que ninguem desenha e todo mundo reconhece:
    // a ONDA do miolo aparecendo no corte, os GRAMPOS que fecham a quina, a
    // SETA de empilhamento estampada na lateral, o CARIMBO REDONDO do
    // fabricante, e os VINCOS das abas dobradas na tampa. Sao esses detalhes
    // que fazem o olho aceitar o material.
    //
    // A lateral e uma face inclinada, entao tudo que mora nela e desenhado
    // num sistema proprio de 100x100 e jogado no lugar por uma matriz que
    // segue as duas arestas do quadrilatero: assim seta e carimbo deitam
    // junto com a face em vez de flutuar por cima dela.
    const sideT = 'transform="matrix(0.42,-0.30,0,' + num(H / 100)
      + ',196,' + num(TOP) + ')"';

    // ── a onda do miolo no corte de cima da caixa ──
    let flute = "";
    for (let k = 0; k < 42; k++)
      flute += "M" + num(28 + k * 4) + " " + num(TOP + 4.5)
        + " q2 -3.2 4 0 ";
    flute = '<path d="' + flute + '" fill="none" stroke="' + P.edge
      + '" stroke-opacity=".34" stroke-width="1"/>';

    // ── os grampos da quina, dois por lado ──
    const staple = (x, y) => '<g fill="#9aa3ad" opacity=".7">'
      + '<rect x="' + num(x) + '" y="' + num(y) + '" width="9" height="2.6"'
      + ' rx="1"/><rect x="' + num(x) + '" y="' + num(y)
      + '" width="2.4" height="6" rx="1"/><rect x="' + num(x + 6.6) + '" y="'
      + num(y) + '" width="2.4" height="6" rx="1"/></g>';
    const staples = staple(30, TOP + H * 0.3) + staple(30, TOP + H * 0.66)
      + staple(187, TOP + H * 0.3) + staple(187, TOP + H * 0.66);

    // ── o que a lateral carrega: seta de empilhamento e carimbo redondo ──
    const sideMarks = '<g ' + sideT + ' opacity=".5">'
      // a seta de "este lado para cima", estampada
      + '<g fill="none" stroke="' + P.edge + '" stroke-width="5"'
      + ' stroke-linejoin="round">'
      + '<path d="M50 22 L50 60"/><path d="M32 38 L50 20 L68 38"/></g>'
      // o carimbo redondo do fabricante, com a cruz interna
      + '<g fill="none" stroke="' + P.edge + '" stroke-width="4">'
      + '<circle cx="50" cy="80" r="15"/>'
      + '<path d="M50 65 V95 M35 80 H65"/></g>'
      + "</g>";

    // ── os vincos das abas dobradas, na tampa ──
    const lidFolds = '<g stroke="' + P.edge + '" stroke-opacity=".3"'
      + ' stroke-width="1.2" fill="none">'
      + '<path d="M64 ' + num(TOP - 36) + " L86 " + num(TOP - 6) + '"/>'
      + '<path d="M244 ' + num(TOP - 36) + " L222 " + num(TOP - 6) + '"/>'
      + "</g>";

    // as cantoneiras de metal, so nas classes que ganham reforco
    const corner = P.corner
      ? '<g fill="' + P.corner + '" opacity=".9">'
        + '<path d="M28 ' + num(TOP) + ' h22 v6 h-16 v16 h-6 Z"/>'
        + '<path d="M196 ' + num(TOP) + ' h-22 v6 h16 v16 h6 Z"/>'
        + '<path d="M28 186 h22 v-6 h-16 v-16 h-6 Z"/>'
        + '<path d="M196 186 h-22 v-6 h16 v-16 h6 Z"/></g>'
        : "";

    // ── A IMPRESSAO DE FACE INTEIRA ──
    // O anuncio e impresso direto no papelao, cobrindo a frente de ponta a
    // ponta: banda de titulo, raio de sol, motivo, nome, slogan e rodape da
    // corporacao. Sem retangulo colado: o fundo e a propria face, com o
    // gradiente de luz dela, e mancha, vinco e desgaste caem POR CIMA da
    // tinta, como acontece com embalagem de verdade. O lote lacrado continua
    // sem anuncio nenhum.
    const printAd = AD
      ? '<g transform="translate(28 ' + num(TOP + 9) + ')">'
        + posterWide((l.pieces || []).slice(0, 3), l.id, 168, H - 9, AD, true)
        + "</g>"
        : "";

    // a etiqueta de processo. O lote lacrado nao tem: e essa AUSENCIA que
    // diz que ele e lacrado, sem escrever a palavra em lugar nenhum.
    const label = r === "selado" ? "" :
      '<g transform="rotate(' + num(tilt) + ' 32 ' + num(TOP + H - 26) + ')">'
      + '<rect x="30" y="' + num(TOP + H - 26) + '" width="62" height="20"'
      + ' fill="#efe6ce"/>'
      + '<rect x="30" y="' + num(TOP + H - 26) + '" width="62" height="6"'
      + ' fill="#8a2b2b" opacity=".16"/>'
      + '<text x="33" y="' + num(TOP + H - 21) + '" font-family="monospace"'
      + ' font-size="4.5" letter-spacing=".8" fill="#7a2323">CASE</text>'
      + '<text x="33" y="' + num(TOP + H - 11) + '" font-family="Caveat,'
      + 'Segoe Script,cursive" font-size="11" fill="#3a2c1c" opacity=".85">'
      + String(l.id).replace(/^H/, "H-") + "</text></g>";

    return '<svg class="lf-art" viewBox="0 0 260 210" aria-hidden="true">'
      + "<defs>"
      + '<linearGradient id="' + u + 't" x1="0" y1="0" x2=".25" y2="1">'
      + '<stop offset="0%" stop-color="' + P.top + '"/><stop offset="60%"'
      + ' stop-color="' + P.mid + '"/><stop offset="100%" stop-color="'
      + P.low + '"/></linearGradient>'
      + '<linearGradient id="' + u + 'f" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="' + P.mid + '"/><stop offset="44%"'
      + ' stop-color="' + P.low + '"/><stop offset="100%" stop-color="'
      + P.side + '"/></linearGradient>'
      + '<linearGradient id="' + u + 's" x1="0" y1="0" x2="1" y2="0">'
      + '<stop offset="0%" stop-color="' + P.side + '"/><stop offset="100%"'
      + ' stop-color="' + P.dark + '"/></linearGradient>'
      + '<radialGradient id="' + u + 'l" cx=".34" cy="-.2" r="1.1">'
      + '<stop offset="0%" stop-color="#ffe6b4" stop-opacity=".3"/>'
      + '<stop offset="65%" stop-color="#ffd79a" stop-opacity="0"/>'
      + "</radialGradient>"
      + '<radialGradient id="' + u + 'sh" cx=".5" cy=".5" r=".5">'
      + '<stop offset="0%" stop-color="#000" stop-opacity=".7"/>'
      + '<stop offset="100%" stop-color="#000" stop-opacity="0"/>'
      + "</radialGradient>"
      // O BRILHO RASANTE DO TOPO: a luz das pendentes vem de cima e da
      // esquerda, entao a tampa tem uma faixa clara que corre e apaga.
      + '<linearGradient id="' + u + 'gl" x1=".05" y1="0" x2=".85" y2="1">'
      + '<stop offset="0%" stop-color="#fff" stop-opacity=".3"/>'
      + '<stop offset="45%" stop-color="#fff" stop-opacity=".06"/>'
      + '<stop offset="100%" stop-color="#fff" stop-opacity="0"/>'
      + "</linearGradient>"
      // A OCLUSAO DO PE: onde a frente encontra a mesa o ar nao entra, e a
      // ausencia disso e o que fazia a caixa parecer um adesivo chapado.
      + '<linearGradient id="' + u + 'ao" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#000" stop-opacity="0"/>'
      + '<stop offset="100%" stop-color="#000" stop-opacity=".42"/>'
      + "</linearGradient>"
      // A LATERAL FUNDA: ela some para tras, entao escurece na diagonal.
      + '<linearGradient id="' + u + 'dp" x1="0" y1="1" x2="1" y2="0">'
      + '<stop offset="0%" stop-color="#000" stop-opacity=".05"/>'
      + '<stop offset="100%" stop-color="#000" stop-opacity=".38"/>'
      + "</linearGradient>"
      // A FIBRA DO PAPELAO. Sem ela as faces sao chapadas de computador, que
      // era o "cru" que faltava resolver: a maleta tem trama, o portal tem
      // pedra lascada, e a caixa nao tinha textura nenhuma. Duas frequencias
      // com periodos diferentes, para nunca ler como listra.
      + '<pattern id="' + u + 'fib" width="7" height="5"'
      + ' patternUnits="userSpaceOnUse" patternTransform="rotate(9)">'
      + '<path d="M0 0 H7" stroke="' + P.edge + '" stroke-opacity=".13"'
      + ' stroke-width=".8"/>'
      + '<path d="M0 3 H4" stroke="' + P.top + '" stroke-opacity=".1"'
      + ' stroke-width=".7"/></pattern>'
      + "</defs>"
      // a sombra que apoia o objeto na mesa
      + '<ellipse cx="128" cy="196" rx="' + num(112 * sx) + '" ry="13"'
      + ' fill="url(#' + u + 'sh)"/>'
      // ── AS PROPORCOES DO EXEMPLAR ──
      // Cor, desgaste e barbante mudavam a superficie e nao a SILHUETA, entao
      // de longe as caixas continuavam gemeas. Aqui o corpo inteiro (e a
      // tampa junto, senao ela deixa de assentar) e esticado a partir do
      // ponto onde a caixa toca a mesa: uma sai mais larga e baixa, outra mais
      // estreita e funda, como caixas de lotes de fabricacao diferentes.
      + '<g transform="translate(128,186) scale(' + num(sx) + "," + num(sy)
      + ') translate(-128,-186)">'
      // ── o corpo, tres faces, tres luminosidades ──
      + '<g class="lf-cbody">'
      + '<path d="M196 ' + num(TOP) + " L238 " + num(TOP - 30)
      + ' V156 L196 186 Z" fill="url(#' + u + 's)"/>'
      + '<path d="M28 ' + num(TOP) + " L70 " + num(TOP - 30) + " H238 L196 "
      + num(TOP) + ' Z" fill="url(#' + u + 't)"/>'
      + '<path d="M28 ' + num(TOP) + ' H196 V186 H28 Z" fill="url(#' + u
      + 'f)"/>'
      + '<path d="M28 ' + num(TOP) + " H196 V" + num(TOP + 5) + ' H28 Z" fill="'
      + P.edge + '" opacity=".42"/>'
      // as duas dobras verticais do papelao, cada uma com o vinco escuro e o
      // fio de luz do lado que pega a pendente
      + '<g opacity=".22" stroke="' + P.edge + '" stroke-width="1.4">'
      + '<path d="M82 ' + num(TOP + 3) + ' V185"/><path d="M148 '
      + num(TOP + 3) + ' V185"/></g>'
      + '<g opacity=".16" stroke="#fff" stroke-width="1">'
      + '<path d="M84 ' + num(TOP + 3) + ' V185"/><path d="M150 '
      + num(TOP + 3) + ' V185"/></g>'
      // a lateral funda e a oclusao do pe da frente
      + '<path d="M196 ' + num(TOP) + " L238 " + num(TOP - 30)
      + ' V156 L196 186 Z" fill="url(#' + u + 'dp)"/>'
      + '<path d="M28 ' + num(TOP + H - 26) + ' H196 V186 H28 Z" fill="url(#'
      + u + 'ao)"/>'
      // a quina viva onde a frente encontra a lateral: um objeto de verdade
      // sempre tem esse fio de luz, e e ele que da a virada do volume
      + '<path d="M196 ' + num(TOP) + ' V186" stroke="#fff" stroke-opacity=".2"'
      + ' stroke-width="1.4"/>'
      + '<path d="M196 ' + num(TOP) + " L238 " + num(TOP - 30)
      + '" stroke="#fff" stroke-opacity=".14" stroke-width="1.2"/>'
      // a fibra por cima das tres faces, antes das manchas e do desgaste
      + '<path d="M28 ' + num(TOP) + " L70 " + num(TOP - 30)
      + ' H238 V156 L196 186 H28 Z" fill="url(#' + u + 'fib)"/>'
      + printAd
      + flute + staples + sideMarks
      + stains + crease
      // o pe empoeirado de quem mora no chao de um deposito
      + '<path d="M28 172 H196 V186 H28 Z" fill="' + P.edge + '" opacity="'
      + num(wear * 0.5) + '"/>'
      + corner
      // o furo de mao, recortado
      + '<rect x="96" y="' + num(TOP + H - 30) + '" width="60" height="14"'
      + ' rx="7" fill="#0d0906"/>'
      + '<rect x="96" y="' + num(TOP + H - 18) + '" width="60" height="2"'
      + ' rx="1" fill="#e2c99c" opacity=".22"/>'
      + label + stamps + extras + hw
      // a luz da pendente, por ultimo, atravessando tudo
      + '<path d="M28 ' + num(TOP) + " L70 " + num(TOP - 30)
      + ' H238 V156 L196 186 H28 Z" fill="url(#' + u + 'l)"/>'
      + "</g>"
      // ── O ENCAIXE: o rebaixo no corpo onde a aba da tampa assenta ──
      // Sem isto a tampa so "flutuava perto" do corpo, nunca ENCAIXAVA nele:
      // nao existia nenhuma marca no proprio corpo dizendo onde ela senta.
      // E um canal raso seguindo a mesma linha do topo: escuro por cima (a
      // sombra de dentro do canal), claro por baixo (o labio que pega luz).
      // Mora na CAMADA DO CORPO, entao fica escondido atras da tampa fechada
      // e so aparece quando ela sobe no hover, o "clique" visual do encaixe.
      + '<g class="lf-lidwell" opacity="' + (P.hw === "tamper" ? "1": "0")
      + '">'
      + '<path d="M32 ' + num(TOP - 1) + " L72 " + num(TOP - 27)
      + " H234 L192 " + num(TOP - 1) + '" fill="none" stroke="' + P.edge
      + '" stroke-width="2.4" opacity=".55"/>'
      + '<path d="M32 ' + num(TOP + 1.6) + " L72 " + num(TOP - 24.4)
      + " H234 L192 " + num(TOP + 1.6) + '" fill="none" stroke="#fff"'
      + ' stroke-width="1" opacity=".2"/>'
      + "</g>"
      // ── A TAMPA, em plano proprio: e ela que levanta no hover ──
      // Fica por ultimo no documento para tombar POR CIMA da traseira da
      // caixa, como tampa de verdade, e nao sumir atras dela.
      // A TAMPA DA VIOLADA NAO ASSENTA. Quem forcou a caixa fechou de
      // qualquer jeito, entao ela fica torta e levantada de um lado. E o
      // sinal mais barato e mais forte de todos, porque muda a SILHUETA: da
      // para ver de longe, sem enxergar detalhe nenhum.
      + '<g class="lf-lid"' + (P.hw === "tamper"
          ? ' transform="rotate(-3.4 112 ' + num(TOP) + ') translate(0,-5)"'
          // NENHUMA TAMPA ASSENTA IGUAL. Ate aqui a unica silhueta diferente
          // era a da violada, e todas as outras eram identicas: mesma altura,
          // mesma inclinacao, mesmo tudo. Uma tampa de papelao guardada por
          // um funcionario apressado cai um grau para um lado ou para outro,
          // e e esse grau que faz duas caixas da mesma classe pararem de ser
          // gemeas mesmo antes de ler etiqueta nenhuma.
          : ' transform="rotate(' + num(lidWobble) + " 112 " + num(TOP) + ")"
            + " translate(0," + num(lidLift) + ')"') + ">"
      // o topo da tampa, com o brilho rasante da pendente correndo nele
      + '<path d="M22 ' + num(TOP - 6) + " L64 " + num(TOP - 36) + " H244 L202 "
      + num(TOP - 6) + ' Z" fill="url(#' + u + 't)"/>'
      + '<path d="M22 ' + num(TOP - 6) + " L64 " + num(TOP - 36) + " H244 L202 "
      + num(TOP - 6) + ' Z" fill="url(#' + u + 'gl)"/>'
      + '<path d="M22 ' + num(TOP - 6) + " L64 " + num(TOP - 36) + " H244 L202 "
      + num(TOP - 6) + ' Z" fill="' + P.edge + '" opacity=".14"/>'
      + lidFolds
      // a PAREDE da tampa: e a espessura dela que faz a tampa ser tampa e nao
      // um papel pousado. O corte do papelao aparece na aresta de cima.
      + '<path d="M22 ' + num(TOP - 6) + " H202 V" + num(TOP + 8) + ' H22 Z"'
      + ' fill="url(#' + u + 'f)"/>'
      + '<path d="M22 ' + num(TOP - 6) + ' H202 V' + num(TOP - 2) + ' H22 Z"'
      + ' fill="' + P.top + '" opacity=".75"/>'
      + '<path d="M22 ' + num(TOP - 6) + ' H202" stroke="#fff"'
      + ' stroke-opacity=".26" stroke-width="1.4"/>'
      // a sombra que a parede da tampa joga na frente da caixa
      + '<path d="M22 ' + num(TOP + 8) + ' H202 V' + num(TOP + 13) + ' H22 Z"'
      + ' fill="#000" opacity=".26"/>'
      // a parede lateral da tampa, mais escura, com a quina viva
      + '<path d="M202 ' + num(TOP - 6) + " L244 " + num(TOP - 36) + " V"
      + num(TOP - 24) + " L202 " + num(TOP + 8) + ' Z" fill="url(#' + u + 's)"/>'
      + '<path d="M202 ' + num(TOP - 6) + " L244 " + num(TOP - 36) + '"'
      + ' stroke="#fff" stroke-opacity=".2" stroke-width="1.3"/>'
      + '<path d="M202 ' + num(TOP - 6) + ' V' + num(TOP + 8) + '"'
      + ' stroke="#000" stroke-opacity=".3" stroke-width="1.2"/>'
      // ── O REFORCO DOS QUATRO CANTOS ──
      // Uma chapa presa em cada ponta do trapezio de cima, para o encaixe da
      // tampa se LER: ela nao e so uma tampa pousada, e uma peca com
      // ferragem propria que trava nos quatro cantos do corpo.
      // Cada chamada passa o VERTICE e os DOIS VIZINHOS dele no trapezio da
      // tampa, e a chapa se constroi andando por essas duas arestas, por
      // isso ela encosta certo nos quatro, apesar de nenhum ser 90°.
      //   frente-esq (22, TOP-6)   vizinhos: frente-dir e fundo-esq
      //   frente-dir (202, TOP-6)  vizinhos: frente-esq e fundo-dir
      //   fundo-esq  (64, TOP-36)  vizinhos: fundo-dir e frente-esq
      //   fundo-dir  (244, TOP-36) vizinhos: fundo-esq e frente-dir
      + lidCorner(22, TOP - 6, 202, TOP - 6, 64, TOP - 36)
      + lidCorner(202, TOP - 6, 22, TOP - 6, 244, TOP - 36)
      + lidCorner(64, TOP - 36, 244, TOP - 36, 22, TOP - 6)
      + lidCorner(244, TOP - 36, 64, TOP - 36, 202, TOP - 6)
      // ── E AS ABAS QUE DOBRAM PELAS PAREDES ──
      // So as paredes que a camera VE ganham aba: a parede da frente (22->202)
      // e a lateral direita (202->244). A parede esquerda e a de tras estao de
      // costas para o jogador, e desenhar aba nelas seria ferragem boiando no
      // ar. Duas abas por canto visivel e o que faz a cantoneira dobrar.
      + lidSkirt(22, TOP - 6, 202, TOP - 6, 30, 14, false)
      + lidSkirt(202, TOP - 6, 22, TOP - 6, 30, 14, false)
      + lidSkirt(202, TOP - 6, 244, TOP - 36, 17, 14, true)
      + lidSkirt(244, TOP - 36, 202, TOP - 6, 17, 14, true)
      + "</g></g></svg>";
  }

  function leakHTML(l){
    const r = l.rarity || "comum";
    if (r === "comum") return "";                    // nao vaza nada
    const n = r === "incomum" ? 2: r === "rara" ? 3: 4;
    let out = "";
    for (let i = 1; i <= n; i++) out += '<span class="lf-leak p' + i + '"></span>';
    return '<span class="lf-leaks">' + out + "</span>";
  }

  /* ══════════════════════════════════════════════════════════════════════
     A FICHA DO PROCESSO

     O que existia antes era um retangulo preto desenhado POR CIMA da caixa,
     com as pecas espremidas em nomes de 6px. Nao dava para acompanhar, nao
     tinha nada a ver com o objeto, e escondia justamente a coisa que o
     jogador precisa olhar.

     Agora a caixa abre: a tampa levanta e a papelada sai AO LADO, em pasta de
     arquivo, com espaco para ser lida. Tres niveis, e cada um responde uma
     pergunta diferente:

       1. a caixa fechada  -> o que e isto, de que classe, quantas pecas
       2. a ficha aberta   -> quais sao as pecas, uma por linha, com nome
       3. a ficha da peca  -> o que ESTA peca faz na SUA maquina, com as suas
                              tres linhas ao lado e as legais acesas

     O nivel 3 e o hover dentro do hover, e e a unica coisa da fase que
     responde "onde isto encaixa" antes de voce gastar o lance. Nada e escrito
     por extenso: tudo e desenhado na gramatica das casas.

     MORA NO ESCOPO DO ARQUIVO, e nao dentro de uma tela. Eu escrevi isto
     dentro do mountConsumo e chamei do mountBid: sao duas funcoes irmas, o
     nome nao existia la, e a fase inteira parou de montar com um
     ReferenceError repetido setenta e quatro vezes. Uma peca usada por duas
     telas pertence as duas, entao ela sobe.
     ══════════════════════════════════════════════════════════════════════ */
  function myRows(){
    try { const L = selfLeilao(app()); return (L && L.rows) || []; }
    catch(e){ return []; }
  }
  /* A MESMA LEI QUE O MOTOR APLICA NA ENTRADA, para um soquete que acende
     aqui nunca ser recusado la. */
  function legalRowsFor(pid, rows){
    const c = catalog || {};
    const fn = c.funcoes && c.funcoes[pid];
    const md = c.modulos && c.modulos[pid];
    const out = [];
    (rows || []).forEach((r, i) => {
      if (fn){ if (!r.sealed) out.push(i); return; }
      if (md && md.kind === "acoplador"){
        const cur = r.funcao && c.funcoes && c.funcoes[r.funcao];
        if (cur && !r.extra && cur.modules.length === 2) out.push(i);
        return;
      }
      if (md && md.kind === "parasita"){ if (r.funcao) out.push(i); return; }
    });
    return out;
  }
  function pieceNeedsRow(pid){
    const c = catalog || {};
    return !!((c.funcoes && c.funcoes[pid]) || (c.modulos && c.modulos[pid]));
  }
  /* uma das SUAS tres linhas, so para olhar: o que ja mora nela, desenhado na
     gramatica da maquina, e se ela aceita a peca que voce esta lendo */
  function miniRowHTML(row, i, legal){
    const c = catalog || {};
    const fn = row && row.funcao && c.funcoes ? c.funcoes[row.funcao]: null;
    let inner = fn ? fn.modules.map(e => houseHTML(e)).join(""): "";
    for (let k = (fn ? fn.modules.length: 0); k < ROW_SOCKETS; k++)
      inner += '<i class="lf-mcell is-void"></i>';
    return '<span class="lf-frow' + (legal ? " is-legal": "")
      + (row && row.sealed ? " is-shut": "") + '">'
      + '<b class="lf-frown">' + (i + 1) + "</b>"
      + '<span class="lf-prow2">' + inner + "</span></span>";
  }

  function filePanelHTML(l){
    if (l.secret)
      // O LACRADO TEM FICHA, E ELA E TARJADA. Nao mostrar ficha nenhuma seria
      // a mesma tela de uma caixa vazia; a tarja diz que o processo EXISTE e
      // que voce e que nao pode ler.
      return '<div class="lf-file is-sealed">'
        + '<div class="lf-fhead"><span class="lf-fno">'
        + String(l.id).replace(/^H/, "H-") + "</span>"
        + '<span class="lf-fband"></span></div>'
        + '<div class="lf-fbody"><div class="lf-fredact"></div>'
        + '<div class="lf-fredact short"></div>'
        + '<div class="lf-fredact"></div>'
        + '<span class="lf-flock">' + ic("helalock") + "</span></div></div>";

    const rows = myRows();
    const body = (l.pieces || []).map(pid => {
      const legal = legalRowsFor(pid, rows);
      const c = catalog || {};
      const fn = c.funcoes && c.funcoes[pid];
      const wants = pieceNeedsRow(pid) && rows.length > 0;
      // A MATRIZ INTEIRA SAIU DAQUI. Eu desenhava as suas tres linhas dentro
      // do painel da peca, e era invasao de territorio: a matriz e do pip-boy
      // e o jogador ja olha para ela la. Aqui ele parou o mouse em cima de UMA
      // peca para ler o que ELA faz, e mais nada. O que sobra do assunto
      // "onde isto cabe" sao as tres marquinhas da linha recolhida, que
      // ocupam dezesseis pixels e nao competem com nada.
      const matrix = "";
      // ── O QUE ELA FAZ, SOQUETE POR SOQUETE ──
      // Mostrar a linha inteira de uma vez nao respondia a pergunta: os tres
      // desenhos ficavam grudados e o jogador nao sabia se aquilo era uma
      // coisa ou tres. Agora cada soquete e uma celula com o seu numero
      // embaixo, no tamanho em que a casa se le, e os vazios aparecem como
      // vazios. E a mesma gramatica da maquina, so que grande.
      let works = "";
      if (fn){
        const mods = fn.modules || [];
        for (let s = 0; s < ROW_SOCKETS; s++)
          works += '<span class="lf-fsock' + (s < mods.length ? "": " is-void")
            + '">' + (s < mods.length ? houseHTML(mods[s]): "")
            + '<b>' + (s + 1) + "</b>"
            // A FRASE, so aqui: quem chegou neste painel pediu o detalhe
            + '<em>' + (s < mods.length ? effWords(mods[s]): "empty socket")
            + "</em></span>";
        works = '<div class="lf-fworks">' + works + "</div>";
      } else {
        // dado, modulo, valvula ou suprimento: a peca inteira e o efeito
        works = '<div class="lf-fworks is-solo">'
          + '<span class="lf-fsock">' + pieceBodyHTML(pid) + "</span></div>";
      }
      // SO FUNCAO TEM PAINEL FUNDO. Um dado nao tem o que explicar: o corpo
      // dele ja diz o tipo e o valor, e abrir um painel para repetir isso so
      // dava um passo a mais entre o jogador e a informacao. O detalhe existe
      // onde ha efeito para ler, e efeito quem tem e funcao.
      const deep = fn ? '<div class="lf-fdeep">'
        + '<span class="lf-fdname">' + pieceName(pid) + "</span>"
        + works
        // A FAMILIA E NOME PROPRIO, e nome e identidade e nao descricao de
        // efeito: dizer "recarga" e legitimo, dizer "da 2 de energia" nao.
        + '<span class="lf-fdfam lf-fam-' + (fn.family || "recarga")
        + '"><i></i>' + (fn.family || "recarga") + "</span>"
        + matrix + "</div>": "";
      return '<div class="lf-fpiece' + (fn ? "": " is-flat")
        + '" data-p="' + pid + '">'
        + '<span class="lf-fbed">' + pieceBodyHTML(pid) + "</span>"
        + '<span class="lf-fname">' + pieceName(pid) + "</span>"
        + (wants
            ? '<span class="lf-frows">'
              + rows.slice(0, 3).map((r, i) => '<i class="'
                  + (legal.indexOf(i) >= 0 ? "ok": "no") + '"></i>').join("")
              + "</span>"
              : "")
        + deep + "</div>";
    }).join("");

    return '<div class="lf-file">'
      + '<div class="lf-fhead"><span class="lf-fno">'
      + String(l.id).replace(/^H/, "H-") + "</span>"
      // a tarja da classe e a MESMA materia da caixa, nunca a palavra
      + '<span class="lf-fband"></span></div>'
      + '<div class="lf-fbody">' + body + "</div>"
      // O LANCE NASCE NO PROCESSO QUE VOCE ESTA LENDO. Este e o encaixe: a
      // trilha unica se muda para ca quando o lote abre, entao o numero e
      // dado no pe da ficha daquele lote e nunca mais numa tira solta no
      // rodape da tela, longe do objeto que ele esta comprando.
      + '<div class="lf-fbid"></div></div>';
  }

  /* A ZONA DO LEILAO: irma do #market-zone, no mesmo lugar do plano, criada
     uma vez e reaproveitada. A carreta some por completo enquanto ela esta de
     pe, e volta inteira quando o leilao sai. */
  function leilaoZone(){
    let z = document.getElementById("leilao-zone");
    if (!z){
      const mz = document.getElementById("market-zone");
      if (!mz || !mz.parentElement) return null;
      z = document.createElement("div");
      z.id = "leilao-zone";
      z.className = "zone leilao-zone";
      mz.parentElement.insertBefore(z, mz.nextSibling);
    }
    return z;
  }

  /* A projecao da mesa: um anel visto de cima, ligeiramente inclinado. */
  function spinTable(house, n){
    const ring = house.querySelector(".lf-ring");
    if (!ring || !n) return;
    const boxes = [...ring.children];
    const st = { rot: 0, vel: 0, drag: null };
    // RAIO EM PIXELS DO PROPRIO ANEL. Usar vw/vh aqui era erro: o mundo esta
    // dentro de uma camera com escala propria, entao a unidade de viewport nao
    // corresponde ao tamanho da mesa e as caixas caiam todas no mesmo ponto.
    const box = ring.getBoundingClientRect();
    /* ══════════════════════════════════════════════════════════════════════
       A MESA QUE RODA, DE VOLTA.

       Eu troquei este anel por uma bancada com degrau achando que resolvia a
       queixa de ter que girar, e a bancada ficou pior: a mesa olhou e
       mandou reverter. Fica registrado para nao tentar de novo. O que estava
       errado nao era o anel, era a FOLGA entre as caixas.

       Entao o anel volta inteiro, e o raio passa a crescer com a contagem de
       lotes: com tres ele nem precisava ser grande, com seis a mesa antiga
       amassava tudo. Cada quantidade ganha o raio que ela precisa para as
       caixas nao se comerem.
       ══════════════════════════════════════════════════════════════════════ */
    // BEM MAIS LONGE. Cada rodada de aumento ficou curta: 0.40, depois 0.58,
    // depois 0.62 para tres. O raio agora e quase a largura inteira do anel
    // ate para o caso menor, e cresce muito para os maiores. Quem for para
    // tras sai bastante do quadro, e tudo bem: girar traz de volta, e o custo
    // de uma caixa parcialmente fora e menor que o de seis se comendo.
    // A MESA REDONDA TEM MUITO MAIS ESPACO DO QUE EU ESTAVA USANDO. Com seis
    // lotes ainda ficava poluido enquanto sobrava tampo vazio dos dois lados.
    // O raio para seis quase dobra; quem for para tras sai do quadro e volta
    // com o giro, que e para isso que o giro existe.
    // COM SEIS, MAIS LONGE AINDA. As caixas cresceram 15%, entao o mesmo raio
    // deixa menos ar entre elas do que antes; e com seis lotes o anel ja era
    // o caso mais apertado dos quatro. O de seis sobe mais que os outros
    // justamente porque o problema cresce com a contagem, nao linearmente.
    const SPREAD = n >= 6 ? 2.65: n === 5 ? 2.1: n === 4 ? 1.6: 1.15;
    const RX = Math.max(250, box.width * SPREAD);
    // MAIS PERTO DA MESA: o anel achatava demais (0.2) e as caixas pareciam
    // pairar acima do tampo em vez de estar POUSADAS nele. Um raio vertical
    // maior aproxima cada caixa da elipse do tampo.
    const RY = Math.max(30, box.height * 0.26);
    const place = () => {
      boxes.forEach((el, i) => {
        const th = st.rot + (i / n) * Math.PI * 2;
        const depth = (Math.cos(th) + 1) / 2;        // 0 fundo .. 1 frente
        const x = Math.sin(th) * RX;
        const y = -Math.cos(th) * RY;
        const back = depth < 0.5;
        const sc = 0.58 + 0.42 * depth;
        // O QUADRO DA CAIXA NAO SE MEXE MAIS AO ABRIR, e este era o bug do
        // hover "fragil". Eu deslocava a propria .lf-box 78px para a esquerda
        // e a encolhia: o retangulo que recebe o ponteiro ia junto, o cursor
        // ficava de fora, disparava pointerleave, a ficha fechava, a caixa
        // voltava, entrava de novo, e a coisa piscava sem parar.
        // Agora o deslocamento acontece so no DESENHO (.lf-crate, no CSS). O
        // alvo do mouse fica parado, entao abrir e ler nunca mais tira a
        // ficha de baixo do ponteiro.
        el.style.transform = "translate(-50%,-50%) translate("
          + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale("
          + sc.toFixed(3) + ")";
        // ══ ESCREVER SO O QUE MUDOU ══════════════════════════════════
        // Aqui estava o travamento. Esta funcao roda A CADA QUADRO durante a
        // inercia, e escrevia transform + opacity + zIndex + filter + classe
        // em TODAS as caixas, sempre. Cada caixa e um SVG grande e pesado, e
        // reatribuir `filter` obriga o navegador a repintar o desenho inteiro
        // mesmo quando o valor e identico ao do quadro anterior. Com seis
        // lotes eram trinta escritas de estilo por quadro, quase todas
        // inuteis.
        // Agora cada propriedade e comparada com o ultimo valor aplicado e so
        // vai para o DOM se mudou de verdade. O transform muda sempre (e o
        // giro), o resto quase nunca.
        const m = el.__lf || (el.__lf = {});
        const op = (0.62 + 0.38 * depth).toFixed(2);
        if (m.op !== op){ el.style.opacity = op; m.op = op; }
        const zi = String(10 + Math.round(depth * 40));
        if (m.zi !== zi){ el.style.zIndex = zi; m.zi = zi; }
        // O BLUR SAIU DE VEZ. Desfoque em SVG grande e a coisa mais cara que
        // havia nesta tela, recalculada a cada quadro para dar uma nevoa que
        // eu mesmo pedi para tirar. A profundidade continua legivel
        // por brilho e opacidade, que sao baratos.
        // O valor tambem e QUANTIZADO: sem isso ele muda na terceira casa
        // decimal a cada quadro e a comparacao nunca economiza nada.
        const open = el.classList.contains("is-open");
        const fil = open
          ? "brightness(1.22) saturate(1.1) drop-shadow(0 0 18px rgba(255,214,150,.5))"
            : "brightness(" + (0.74 + Math.round(depth * 10) / 10 * 0.5).toFixed(2) + ")";
        if (m.fil !== fil){ el.style.filter = fil; m.fil = fil; }
        // ABRIR A FICHA VALE PARA QUALQUER LOTE VIRADO PARA VOCE, e nao so
        // para o que esta exatamente no eixo. Com o corte antigo em 0.86 so
        // uma caixa por vez aceitava hover, e era isso que obrigava a girar
        // ate para dar uma olhada. Em 0.62 a frente inteira da mesa responde.
        const front = depth > 0.62;
        if (m.front !== front){ el.classList.toggle("is-front", front);
          m.front = front; }
      });
    };
    place();
    /* ══ ABRIR O PROCESSO E UM CLIQUE, NAO UM HOVER ═════════════════════════
       Com hover a ficha fechava sozinha no instante em que o mouse saia da
       caixa, e sair da caixa e exatamente o que voce faz para ir ler a
       ficha, mexer na trilha do lance ou rolar a roda. O painel fugia da
       propria leitura.
       Agora e o comportamento de FILE completo: clicar abre e TRAVA; a caixa
       fica aberta ate voce clicar em qualquer outro lugar (outra caixa, a
       mesa, a sala). So o lote de frente abre: os outros estao de lado na
       mesa e ninguem le uma pasta de perfil. */
    const openBox = (el) => {
      /* QUALQUER CAIXA ABRE, e nao so a que esta exatamente de frente. Com
         uma caixa aberta, o `place()` para de marcar as outras como frente, e
         entao clicar numa vizinha nao fazia NADA: a mesa parecia travada e a
         caixa errada continuava aberta. Voce clicou naquela caixa, entao e
         aquela que abre.
         Se ela nao esta de frente, a mesa GIRA ate ela antes de abrir, que e
         o que a mao esperava ao clicar numa caixa de lado. */
      if (el.classList.contains("is-open")) return;
      if (!el.classList.contains("is-front")){
        const alvo = [...boxes].indexOf(el);
        if (alvo >= 0 && boxes.length){
          // leva a caixa escolhida para o eixo da frente pelo caminho curto
          const passo = (Math.PI * 2) / boxes.length;
          let d = -alvo * passo - st.rot;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          st.rot += d; st.vel = 0; place();
        }
      }
      // ABRIR PARA A MESA NA HORA. Ler uma ficha enquanto o tampo ainda
      // desliza embaixo dela e desconfortavel: a caixa que voce acabou de
      // escolher sai de baixo do seu olho.
      st.vel = 0;
      boxes.forEach(o => o.classList.remove("is-open"));
      el.classList.add("is-open");
      // A TRILHA SEGUE O PROCESSO ABERTO. Existe uma so, e ela se muda para
      // o pe da ficha do lote que voce esta lendo. Assim o lance mora no
      // objeto: voce le a peca, ve em que linha ela cabe, e da o numero no
      // mesmo lugar, sem tirar o olho da caixa.
      // O QUADRO NAO SE MUDA MAIS. Ele mora no canto direito da sala e fica
      // la: mudar mobilia de lugar a cada clique era o que fazia ele sumir
      // quando nenhuma caixa estava aberta. O que muda e o ESTADO da sala,
      // que acende o quadro e diz para qual lote ele vale agora.
      const slot = el.querySelector(".lf-fbid");
      const track = house.querySelector(".lf-track")
        || document.querySelector(".lf-track");
      if (slot && track && track.parentElement !== slot) slot.appendChild(track);
      try { snd("lift"); } catch(e){}
      place();
    };
    const closeAll = () => {
      let had = false;
      boxes.forEach(o => {
        if (o.classList.contains("is-open")){ o.classList.remove("is-open");
          had = true; }
      });
      // o quadro de lances volta ao repouso junto: ele continua na parede,
      // dizendo o bolso, mas para de dizer que vale para um lote

      if (had) place();
      return had;
    };
    boxes.forEach(el => {
      el.addEventListener("click", (e) => {
        // o clique na CAIXA abre; cliques em coisas dentro da ficha aberta
        // (trilha, lacre, peca) sao dela e nao devem fechar nem reabrir
        if (e.target.closest(".lf-file")) return;
        // isto foi o fim de um arrasto: nao abre. A marca ja foi limpa pela
        // captura (que roda antes), entao o que se le aqui e o carimbo que
        // ela deixou para este clique especifico.
        if (st.swallowedThisClick) return;
        e.stopPropagation();
        openBox(el);
      });
      // A PECA TAMBEM TRAVA NO CLIQUE, pelo mesmo motivo que a caixa: o
      // painel fundo fugia quando o mouse saia da linha para ir ler ele.
      // Clicar de novo na mesma peca fecha; clicar em outra troca.
      el.querySelectorAll(".lf-fpiece:not(.is-flat)").forEach(pc => {
        pc.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const on = pc.classList.contains("is-reading");
          el.querySelectorAll(".lf-fpiece").forEach(o =>
            o.classList.remove("is-reading"));
          if (!on) pc.classList.add("is-reading");
        });
      });
    });
    // CLICAR FORA FECHA. No documento, na fase de captura, para pegar
    // tambem os cliques que outros elementos parariam no caminho.
    const outside = (e) => {
      // QUALQUER clique encerra a divida do arrasto anterior, tenha ele
      // caido numa caixa ou no vazio. Este ouvinte roda na CAPTURA, ou seja
      // antes de todo mundo, entao ele e o unico lugar que ve 100% dos
      // cliques e pode garantir que a marca nunca atravessa dois.
      const swallowed = st.swallowClick;
      st.swallowClick = false;
      st.swallowedThisClick = swallowed;
      // o carimbo vale so para este clique: o proximo comeca limpo
      setTimeout(() => { st.swallowedThisClick = false; }, 0);
      if (e.target.closest && e.target.closest(".lf-box")) return;
      if (swallowed) return;          // o arrasto acabou fora: so limpa
      closeAll();
    };
    document.addEventListener("click", outside, true);
    // quando a fase sai, o ouvinte sai junto: sem isto ele sobreviveria a
    // sala e ficaria fechando caixas de uma mesa que nao existe mais
    house.__lfCleanup = () => document.removeEventListener("click", outside, true);
    // o giro por inercia, para a mesa ter peso
    let raf = 0;
    const tick = () => {
      raf = 0;
      if (st.drag || Math.abs(st.vel) < 0.0004) { st.vel = 0; return; }
      // DESACELERACAO MAIS LONGA E MAIS MACIA. Com 0.94 a mesa parava quase
      // seca, o que lia como travamento e nao como peso. 0.965 estica o
      // deslizar sem deixar a mesa fugindo do controle.
      st.rot += st.vel; st.vel *= 0.965; place();
      raf = requestAnimationFrame(tick);
    };
    const spin = () => { if (!raf) raf = requestAnimationFrame(tick); };
    // ══ A MESA SE PUXA PELAS CAIXAS ══════════════════════════════════════
    // Antes o arrasto so pegava se voce agarrasse o TAMPO VAZIO, porque um
    // pointerdown em cima de um lote era descartado para nao atrapalhar o
    // clique. Mas o que a mao quer agarrar numa mesa giratoria e justamente o
    // que esta em cima dela.
    // Os dois gestos convivem por LIMIAR: o toque comeca como candidato a
    // arrasto E a clique; se o ponteiro andar mais que 5px, vira arrasto e o
    // clique e cancelado; se soltar antes disso, foi um clique e a caixa
    // abre. Nenhum dos dois precisa de um alvo separado.
    const DRAG_MIN = 5;
    ring.addEventListener("pointerdown", (e) => {
      // NADA DE CAPTURAR O PONTEIRO AQUI, e foi este detalhe que quebrou o
      // abrir das caixas. `setPointerCapture` REDIRECIONA os eventos
      // seguintes para o elemento que capturou, inclusive o `click`. Com a
      // captura ligada ja no pointerdown, todo clique curto passava a ser
      // entregue ao ANEL, e o ouvinte de clique da caixa nunca rodava: a
      // caixa parava de abrir sem nenhum erro no console.
      // A captura so serve para o arrasto nao escapar quando o ponteiro sai
      // do elemento, e isso so importa DEPOIS que o arrasto comeca. Entao ela
      // e ligada la, no cruzamento do limiar.
      st.drag = { x: e.clientX, rot: st.rot, moved: false, id: e.pointerId };
    });
    ring.addEventListener("pointermove", (e) => {
      if (!st.drag) return;
      const dx = e.clientX - st.drag.x;
      if (!st.drag.moved){
        if (Math.abs(dx) < DRAG_MIN) return;       // ainda pode ser clique
        st.drag.moved = true;
        ring.classList.add("is-grabbing");
        // agora sim: daqui para a frente e arrasto, e ele nao pode escapar
        try { ring.setPointerCapture && ring.setPointerCapture(st.drag.id); }
        catch(err){}
      }
      // MAIS DEVAGAR: 0.006 por pixel girava rapido demais para acompanhar.
      const nrot = st.drag.rot + dx * 0.0035;
      // a velocidade e SUAVIZADA em vez de copiada do ultimo quadro, senao um
      // tranco no fim do arrasto vira um chute na inercia
      st.vel = st.vel * 0.6 + (nrot - st.rot) * 0.4;
      st.rot = nrot; place();
    });
    const drop = (e) => {
      if (!st.drag) return;
      const wasDrag = st.drag.moved;
      st.drag = null;
      ring.classList.remove("is-grabbing");
      if (wasDrag){
        // arrastou: solta com inercia, e marca que o proximo clique e so o
        // fim do gesto e nao um pedido de abrir. Quem apaga a marca e o
        // proprio ouvinte de clique, ao consumi-la: sem timer, sem depender
        // de qual evento chega primeiro.
        st.swallowClick = true;
        spin();
      }
    };
    ring.addEventListener("pointerup", drop);
    ring.addEventListener("pointercancel", drop);
    ring.addEventListener("wheel", (e) => {
      // A RODA DO MOUSE SERVIA DUAS COISAS AO MESMO TEMPO, E ERA ISSO QUE
      // FICAVA BUGADO. A trilha do lance tem o proprio wheel (linha ~3793),
      // mas `preventDefault()` nao para a propagacao: o mesmo evento subia
      // ate aqui e girava a mesa junto, entao rolar para dar lance tambem
      // girava as caixas. Com um lote aberto, a roda serve so ao lance: a
      // mesa simplesmente ignora o evento e deixa a trilha responder sozinha.
      if (ring.querySelector(".lf-box.is-open")) return;
      e.preventDefault();
      st.vel += (e.deltaY > 0 ? 1: -1) * 0.012; spin();
    }, { passive:false });
  }

  /* lotBodyHTML morreu aqui. Ele desenhava o interior da caixa como uma tira
     de pecas para ser jogada dentro do retangulo preto que cobria o objeto.
     Quem faz esse trabalho agora e filePanelHTML, que abre a ficha AO LADO e
     tem espaco para o nome, o berco e a matriz. Funcao sem chamador vira
     mentira sobre como a tela funciona, entao ela sai. */

  /* the real dice, stamped into their slots AFTER the card exists */
  function dressPieces(root){
    (root || document).querySelectorAll(".lf-pdie[data-gid]").forEach(sl => {
      if (sl.firstChild) return;
      try { sl.appendChild(genDieEl(sl.dataset.gid, null,
        { static:true, catalogue:true })); }
      catch(e){}
    });
  }
  function mountBid(req){
    const root = layer();
    root.dataset.kind = "bid";
    const o = req.options || {};
    const state = { lot:null, sealed:false, amount:0 };
    const budget = o.budget|0, currency = (o.currency||"gold").toUpperCase();
    const min = budget > 0 ? (o.min|0) || 1 : 0;
    const lots = o.lots || [];
    // O LEILAO E CENA PROPRIA, NAO UM CARTAZ EM CIMA DA CARRETA. Ele morava
    // dentro do #market-zone, empilhado sobre o mercador, com CSS escondendo
    // as partes dele. Isso ja custou caro: quando a minha sala ficou
    // transparente por um bug, o que apareceu foi a carreta, porque ela nunca
    // tinha saido de la. Agora a janela mostra UMA das duas, nunca uma pintada
    // sobre a outra.
    // A SALA MORA DENTRO DA JANELA, ATRAS DO ARCO. Tentei uma zona irma e ela
    // cobriu duas coisas que nao sao minhas: o papel de parede do quarto
    // (.game-grid::after) e o proprio arco (.portal-bg, z-index 1 dentro do
    // #market-zone). O certo e: a janela e a moldura, o arco fica por cima, e
    // o CONTEUDO dela troca, carreta ou sala de evidencias.
    const zone = document.getElementById("market-zone");
    document.body.classList.add("lf-scene");

    let house = null;
    if (zone){
      house = document.createElement("div");
      house.className = "lf-house" + ((o.round|0)===0 ? " lf-enter": "");
      // A MOLDURA POR CIMA DO CONTEUDO. A pedra do arco e do quarto e nao do
      // leilao, entao ela e desenhada depois da sala, num arquivo que so tem
      // pedra e abertura transparente. Ela entra e sai junto com a fase.
      if (!zone.querySelector(".lf-frame")){
        const fr = document.createElement("div");
        fr.className = "lf-frame";
        fr.setAttribute("aria-hidden", "true");
        zone.appendChild(fr);
      }
      // the log names lots by what they showed on the card
      try{
        window.__leilaoLots = window.__leilaoLots || {};
        window.__leilaoLotPieces = window.__leilaoLotPieces || {};
        lots.forEach(l => { window.__leilaoLots[l.id] =
          l.secret ? "the sealed lot": pieceName(l.pieces[0]||l.id);
          window.__leilaoLotPieces[l.id] = list_of(l); });
        function list_of(l){ return l.secret ? []: (l.pieces || []); }
      }catch(e){}
      const lotName = id => {
        const l = lots.find(x => x.id === id);
        return l ? (l.secret ? "sealed lot" : pieceName(l.pieces[0]||l.id)) : id;
      };
      const hist = (o.history||[]).slice(-1).map(rnd =>
        Object.entries(rnd).map(([p,b]) =>
          "<span>" + p + ", " + lotName(b.lot) + " · " + b.amount
          + "</span>").join("")).join("");
      const seatCol = n => {
        try{ return window.__seatColor ? window.__seatColor(n) : "#b9a26a"; }
        catch(e){ return "#b9a26a"; }
      };
      const inRoom = ((app().view && app().view.travelers) || [])
        .filter(t => !t.is_terminated);
      // A MESA FECHANDO, SEM NENHUM NUMERO A MOSTRA. O pregao e as cegas,
      // entao o lance de cada um e segredo; mas QUEM JA FECHOU e publico, e e
      // essa a tensao da rodada. Cada assento leva um disco de cera apagado
      // que acende quando aquele viajante lacra. Voce ve a sala fechando em
      // volta sem ver por quanto.
      // NAO LER UM CAMPO QUE O SERVIDOR NAO MANDA. Eu ia acender o disco por
      // `t.leilao.sealed`, e o `sealed` que existe no sessao.py e outro: e o
      // selo de uma LINHA da matriz, nao o lacre do lance. O servidor hoje
      // resolve o pregao inteiro de uma vez (`_ask_all`) e nunca conta quem ja
      // respondeu, entao esse fato ainda nao chega ao cliente.
      // O desenho fica pronto e a fonte fica honesta: um conjunto que so
      // enche quando o servidor passar a avisar. Vazio, todos os discos ficam
      // apagados, que e a verdade no comeco da rodada.
      window.__lfSealed = window.__lfSealed || {};
      const plates = inRoom.map(t =>
        '<span class="lf-plate2'
        + (window.__lfSealed[t.name] ? " is-sealed": "")
        + '" style="--s:' + seatCol(t.name) + '">'
        + '<i></i>' + t.name + (t.is_self ? " (you)": "")
        + '<s class="lf-waxdot"></s></span>').join("");
      // ══ A SALA DE EVIDENCIAS ═══════════════════════════════════════════
      // Nao e casa de leilao: e o deposito de apreensoes do Bureau com um
      // pregao improvisado dentro. Tudo que e de leilao aqui parece montado
      // hoje de manha (placa de papelao, cavalete, giz, cordao), e tudo que e
      // do deposito e permanente (gaiola, estantes, estencil, lampada).
      // A caixa NAO tem contorno colorido: no mercado borda colorida quer
      // dizer ERA, e reaproveitar esse canal para raridade ensinaria duas
      // coisas com o mesmo sinal. Raridade e o que FIZERAM com a caixa (fita,
      // lacre, cadeado, corrente) e o que VAZA dela (poeira, faisca, luz).
      const front = lots.slice(0, 3), back = lots.slice(3);
      const boxHTML = (l, i, tier) =>
        '<div class="lf-box r-' + (l.secret ? "selado": (l.rarity || "comum"))
        + (tier ? " is-back": "")
        // a tampa sobe conforme a caixa e mais funda, e o carimbo sobe com
        // ela: uma so porcentagem servia so para a caixa de uma peca
        + '" style="--lid:' + [42, 42, 36, 28][
            Math.max(1, Math.min(3, (l.pieces || []).length || 1))]
        + '%" data-i="' + i + '" data-lot="' + l.id + '">'
        + ""
        // O OBJETO E UM SVG AUTORADO, como a maleta e o portal: tres faces
        // com luminosidades diferentes, furo de mao recortado, etiqueta de
        // processo e etiqueta pendurada. O CSS so o VESTE (raridade, carimbo,
        // estado) e nunca o desenha.
        + '<div class="lf-crate">'
        + crateSVG(l, i)
        // O CARIMBO DE CATEGORIA E A PLAQUETA ROMANA SAIRAM.
        // Os tres retangulos no alto diziam "aqui dentro tem uma funcao" e o
        // algarismo flutuando embaixo dizia "este e o lote II". Os dois eram
        // verdade quando a caixa era muda; com a embalagem inteira anunciando
        // o conteudo por nome, familia e motivo, viraram ruido colado por
        // cima de um objeto que ja fala. O numero do processo continua na
        // etiqueta, que e onde numero de caixa mora.
        + ""
        + "</div>"
        // A FICHA DO PROCESSO, AO LADO. O interior nao e mais um retangulo
        // preto desenhado por cima do objeto: a tampa levanta e a papelada
        // sai da caixa, que e o que acontece quando alguem abre um processo.
        + filePanelHTML(l)
        // UMA VEZ, NAO DUAS. As particulas estavam sendo emitidas em dobro:
        // a mesma chamada aparecia duas linhas seguidas, e a raridade rara
        // soltava seis faiscas onde a regra pede tres.
        + leakHTML(l)
        + "</div>";
      house.innerHTML =
        //, o deposito, permanente,
        // O FUNDO DA SALA E UM SVG AUTORADO: estantes de tres niveis cheias de
        // caixas, gaiola de tela, luminarias pendentes com cone de luz,
        // escada, carrinho de arquivo e o estencil com o nivel tarjado.
        '<img class="lf-room" src="assets/evidenceroom.svg?v18" alt="">'
        //, o pregao, improvisado,
        + '<span class="lf-placard">LOTES DA HORA<b>RODADA '
        + ((o.round|0)+1) + "</b></span>"
        // ══ A REGUA DO PREGAO ══════════════════════════════════════════
        // O mercado ja resolveu isto com a regua de meta (chave em cima,
        // valor embaixo) e a mesma regua serve aqui. Quatro fatos, e os
        // quatro mudam a decisao: em que rodada da Hora estamos, em que
        // moeda se paga (e a Hora 3 que troca, e a troca precisa ser
        // visivel), quanto eu tenho, e quantos lotes ainda restam, que e o
        // que diz se ainda da para esperar o proximo.
        + '<div class="lf-plates">' + plates + "</div>"
        + (hist ? '<div class="lf-board">' + hist
             + '<i class="lf-bcalha"><i></i></i></div>': "")
        //, A MESA QUE RODA. Todos os lotes num anel: arrastar gira, o que
        //   vem para a frente cresce e clareia, o que vai para tras encolhe e
        //   apaga. Serve 3 ou 6 sem trocar leiaute nenhum, que era o que
        //   travava as duas prateleiras.,
        + '<div class="lf-turntable"><div class="lf-ring">'
        + lots.map((l, i) => boxHTML(l, i, false)).join("")
        + "</div></div>"
        // O CORDAO DE ISOLAMENTO MORREU AQUI. Era uma faixa vermelha atravessada
        // no pe da janela, e nao servia a nada: nao dizia regra, nao dizia
        // estado, e cortava a cena com um risco que so chamava atencao para si.
        // Casa de leilao fina tem cordao de veludo; deposito de apreensao nao.
        + "";
      // THE BID LIVES WHERE THE LOTS ARE. One screen: you never look away
      // from the floor to raise a number. The instrument is brass hardware
      // bolted to the rostrum: an ink line for the lot, a dial for the
      // amount, a wax seal to close it.
      // ══ A TRILHA DO LANCE, NA CAIXA ═══════════════════════════════════
      // A acao mora no objeto, como no Balatro: marcar um lote abre, sob ele,
      // uma trilha de tracos, um por unidade de bolso, agrupados de cinco em
      // cinco. Voce le PROPORCAO, nunca algarismo. O lacre fecha e a caixa
      // vira de costas. A tira de papel no rodape morreu com isto.
      const track = document.createElement("div");
      track.className = "lf-track";
      let marks = "";
      for (let k = 1; k <= Math.max(1, budget); k++)
        marks += '<i' + (k % 5 === 0 ? ' class="five"': "") + ' data-n="' + k
          + '"></i>';
      /* A MOEDA E UM GLIFO NO INICIO DO BOLSO, e nao uma celula de placar.
         Era o ultimo dos quatro fatos que ainda nao tinha corpo na sala: a
         rodada ja mora na placa de papelao pendurada, o bolso e a propria
         trilha, e quantos lotes restam sao as caixas em cima da mesa, que
         estao la para serem contadas. Faltava dizer EM QUE se paga, e a
         Hora 3 troca isso no meio da partida sem avisar ninguem.
         Ele vive colado no primeiro traco: voce le "quatro dos meus doze" e
         "de energia" no mesmo relance, sem tirar o olho da regua. */
      const L0 = (function(){ try { return selfLeilao(app()) || {}; }
        catch(e){ return {}; } })();
      const moeda = String(o.currency || o.moeda || L0.currency || "energy");
      const ehOuro = /gold|ouro/i.test(moeda);
      track.innerHTML = '<span class="lf-tcoin' + (ehOuro ? " is-gold": "")
        + '" title="' + (ehOuro ? "gold": "energy") + '">'
        + ic(ehOuro ? "gold": "energy") + "</span>"
        + '<span class="lf-tmarks">' + marks + "</span>"
        + '<button class="lf-wax lf-wax2" id="lf-tseal" type="button" disabled>'
        + '<span>LACRAR</span></button>';
      house.appendChild(track);
      // arrastar sobre a trilha define o lance; a roda tambem
      const marksEl = track.querySelector(".lf-tmarks");
      // TOCAR A TRILHA JA MARCA O LOTE. Ela agora mora dentro da ficha de um
      // lote especifico, entao mexer nela nao pode exigir um clique separado
      // na caixa: o processo que esta aberto e o processo que recebe o lance.
      /* O QUADRO NAO MORA MAIS DENTRO DA CAIXA, entao ele nao pode achar o
         lote subindo pelos pais: subindo, ele agora chega na SALA e volta de
         mao vazia, e o lance ficava sem dono. Ele pergunta para a mesa qual
         lote esta aberto, que e a mesma pergunta que o olho do jogador faz. */
      const adoptLot = () => {
        const box = track.closest && track.closest(".lf-box");
        if (!box) return;
        const lot = lots[+box.dataset.i];
        if (!lot || state.lot === lot.id) return;
        state.lot = lot.id;
        if (state.amount < min) state.amount = min;
        house.querySelectorAll(".lf-box").forEach(x =>
          x.classList.toggle("is-pinned", x === box));
      };
      /* A REGUA FICOU EM PE quando o quadro virou mobilia da parede direita,
         entao ler o valor pela posicao HORIZONTAL passou a ser ler a coisa
         errada: o dedo sobe e desce, e a conta olhava para os lados. Ela
         agora mede no eixo que a regua realmente ocupa, e continua servindo
         se um dia ela voltar a ser deitada. */
      // serve deitada ou em pe: mede no eixo que a regua realmente ocupa
      const setFromX = (clientX, clientY) => {
        const r = marksEl.getBoundingClientRect();
        const emPe = r.height > r.width;
        const f = emPe
          ? Math.max(0, Math.min(1, (r.bottom - clientY) / r.height))
          : Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        const v = Math.round(f * budget);
        if (v === state.amount) return;
        state.amount = v; snd("dice_lock"); paintCounter();
        // com lance na regua o quadro esta EM USO, e tem que parecer aceso

      };
      let dragging = false;
      marksEl.addEventListener("pointerdown", (e) => {
        if (state.sealed) return;
        adoptLot();
        if (state.lot == null) return;
        dragging = true; marksEl.setPointerCapture &&
          marksEl.setPointerCapture(e.pointerId); setFromX(e.clientX, e.clientY);
      });
      marksEl.addEventListener("pointermove", (e) => {
        if (dragging) setFromX(e.clientX, e.clientY); });
      const stop = () => { dragging = false; };
      marksEl.addEventListener("pointerup", stop);
      marksEl.addEventListener("pointercancel", stop);
      marksEl.addEventListener("wheel", (e) => {
        // e a trilha que responde, e SO ela: sem isto o mesmo giro subia para
        // o anel e mexia a mesa junto com o lance
        e.preventDefault();
        e.stopPropagation();
        if (state.sealed || state.lot == null) return;
        const v = state.amount + (e.deltaY < 0 ? 1: -1);
        if (v < 0 || v > budget){ snd("whiff"); return; }
        state.amount = v; snd("dice_lock"); paintCounter();
        // com lance na regua o quadro esta EM USO, e tem que parecer aceso

      }, { passive:false });

      const counter = document.createElement("div");
      counter.className = "lf-counter is-hidden";
      counter.innerHTML =
        '<span class="lf-ink2" id="lf-ink">mark a lot above</span>'
        + '<span class="lf-dial" id="lf-dial" title="turn: click the top half'
        + ' to raise, the bottom half to lower, or use the wheel">'
        + '<b id="lf-dialn">0</b><i>' + currency + "</i></span>"
        + '<button class="lf-wax" id="lf-seal" type="button" disabled>'
        + '<span>SEAL</span></button>';
      // ══ A MESA QUE RODA ═══════════════════════════════════════════════
      // Mesmo metodo do cerebro da HELA: cada caixa e projetada num anel, e a
      // PROFUNDIDADE decide escala, opacidade, deslocamento vertical e ordem
      // de empilhamento. Arrastar gira; a roda tambem. Nao existe leiaute
      // diferente para 3 ou para 6, so mais gente no mesmo anel.
      try{ spinTable(house, lots.length); }catch(e){}
      house.appendChild(counter);
      zone.appendChild(house);
      // the dice are real elements and go in only once the cards exist
      dressPieces(house);
      const paintCounter = () => {
        const ink = counter.querySelector("#lf-ink");
        const dn = counter.querySelector("#lf-dialn");
        const seal = counter.querySelector("#lf-seal");
        if (ink){
          ink.textContent = state.lot ? lotLabel() : "mark a lot above";
          ink.classList.toggle("is-empty", !state.lot);
        }
        if (dn) dn.textContent = state.amount;
        if (seal) seal.disabled =
          state.sealed || state.lot == null || state.amount < min;
        counter.classList.toggle("is-sealed", state.sealed);
        // A TRILHA: os tracos acesos sao o lance, e a proporcao se le sozinha.
        house.classList.toggle("has-mark", state.lot != null);
        track.querySelectorAll(".lf-tmarks i").forEach((m) =>
          m.classList.toggle("on", (+m.dataset.n) <= state.amount));
        const tseal = track.querySelector("#lf-tseal");
        if (tseal){
          tseal.disabled = state.sealed || state.lot == null
            || state.amount < min;
          tseal.classList.toggle("is-sealed", state.sealed);
        }
      };
      const bump = d => {
        if (state.sealed) return;
        const v = state.amount + d;
        if (v < 0 || v > budget){ snd("whiff"); return; }
        state.amount = v;
        snd("dice_lock");
        paintCounter(); paintDevice();
      };
      const dial = counter.querySelector("#lf-dial");
      dial.addEventListener("click", e => {
        const r = dial.getBoundingClientRect();
        bump(e.clientY < r.top + r.height / 2 ? 1 : -1);
      });
      dial.addEventListener("wheel", e => {
        e.preventDefault(); bump(e.deltaY < 0 ? 1 : -1);
      }, { passive:false });
      // o lacre da trilha aciona o mesmo gesto do balcao, que segue existindo
      // escondido como motor: um so caminho de codigo para selar.
      track.querySelector("#lf-tseal").addEventListener("click", () => {
        const b = counter.querySelector("#lf-seal");
        if (b && !b.disabled) b.click();
      });
      counter.querySelector("#lf-seal").addEventListener("click", () => {
        if (state.sealed || state.lot == null || state.amount < min) return;
        state.sealed = true;
        snd("chart_stamp");
        // O LACRE FECHA E VIRA A CAIXA. O seu numero morre dentro dela: a
        // tampa desce, o objeto gira de costas e a cera cai por cima. A mesa
        // ve que voce fechou e nunca ve por quanto, que e a regra do pregao
        // as cegas desenhada em vez de escrita.
        house.querySelectorAll(".lf-box").forEach(x => {
          x.classList.remove("is-open");
          x.classList.toggle("is-sealed", x.classList.contains("is-pinned"));
        });
        paintCounter(); paintDevice();
        const g = app();
        // THE HALL STAYS. You sealed in the dark; now you watch the room
        // resolve. The window only tunes back after the ceremony.
        /* ══ O TEMPO DE VER O QUE ACONTECEU ═══════════════════════════
           A queixa de mesa: as coisas passam rapido demais, e o lugar
           onde isso mais dói é aqui: você lacra às cegas e a sala resolve.
           Esse é o único momento em que você descobre se ganhou, e ele
           durava 2,4 segundos contando a viagem da resposta ao servidor e a
           volta dos eventos, ou seja bem menos que isso na tela.
           Agora a sala segura 3,8 segundos e a resposta sai um pouco depois
           do lacre, para o gesto de fechar ser visto antes de a mesa virar.
           É o mesmo princípio do Balatro: o número sobe onde o olho está. */
        house.classList.add("is-waiting");
        ceremonyUntil = Date.now() + 3800;
        setTimeout(() => {
          g.respond({ lot: state.lot, amount: state.amount });
        }, 760);
      });
      house.querySelectorAll(".lf-box").forEach(el => {
        el.addEventListener("click", () => {
          if (state.sealed) return;
          const lot = lots[+el.dataset.i];
          state.lot = lot.id;
          if (state.amount < min) state.amount = min;
          house.querySelectorAll(".lf-box").forEach(x =>
            x.classList.toggle("is-pinned", x===el));
          snd("quill");
          paintCounter();
          try{
            const g = app();
            if (g && g.helaSay) g.helaSay(
              "Marked. Now the <b>dial</b>, then the <b>wax</b>. Your number "
              + "dies in that envelope with everything else I keep.", 5200);
          }catch(e){}
          paintDevice();
        });
      });
    }

    // the DEVICE takes the amount: the classic cockpit slot, no invention
    function lotLabel(){
      const lot = lots.find(l => l.id===state.lot);
      if (!lot) return null;
      return lot.secret ? "SEALED LOT" : pieceName(lot.pieces[0]||lot.id);
    }
    function paintCRT(){
      // THE PIP-BOY IS NOT MY BILLBOARD. This wiped the cabin's screen
      // and printed AUCTION OPEN / mark a lot through the window on it.
      // The instrument on the rostrum is already complete (ink line,
      // dial, wax), so this was a duplicate bought with the player's own
      // device: during a bid his screen stopped being his.
      if (true) return;
      const a = app();
      const body = a && a.dom && a.dom.machine;
      if (!body) return;
      const sig = "bid:" + state.lot + ":" + state.amount + ":" + state.sealed;
      if (body.dataset.lfSig === sig) return;
      body.dataset.lfSig = sig;
      body.innerHTML = "";
      const crt = mk("div", "lf-crt");
      if (state.sealed){
        crt.innerHTML = '<span class="lf-crt-stamp">SEALED</span>';
      } else if (state.lot){
        crt.innerHTML =
          '<span class="lf-crt-lot">' + lotLabel() + "</span>"
          + '<b class="lf-crt-amt">' + state.amount + "</b>"
          + '<span class="lf-crt-sub">' + currency + " · funds " + budget
          + (min ? " · min " + min : "") + "</span>";
      } else {
        crt.innerHTML = '<span class="lf-crt-idle">AUCTION OPEN</span>'
          + '<span class="lf-crt-sub">mark a lot through the window</span>';
      }
      body.appendChild(crt);
    }
    function paintDevice(which){
      paintCRT();
      if (which === "crt") return;
      // o numero mora no balcao. NAO chamar paintCounter daqui: ele e um
      // `const` declarado depois, e chamar antes da declaracao derrubava a
      // montagem inteira do leilao ("paintCounter is not defined"), o que
      // fazia a sala ser reconstruida a cada tique para sempre. Quem mexe no
      // numero ja repinta o balcao no proprio handler.
      if (true) return;
      const a = app();
      const dbody = a && a.dom && a.dom.dice;
      if (!dbody) return;
      dbody.innerHTML = "";
      if (a.dom.diceMeta) a.dom.diceMeta.textContent =
        "funds " + budget + " " + currency.toLowerCase()
        + (min ? " · min " + min : "");
      const cols = mk("div", "dice-cols");
      const gcol = mk("div", "dice-col gen-col");
      gcol.appendChild(mk("div", "dice-pool-label",
        "Sealed bid · round " + ((o.round|0)+1)));
      const meter = mk("div", "lf-meter");
      if (state.lot){
        meter.innerHTML = '<span class="lf-mlot">' + lotLabel() + "</span>"
          + '<b class="lf-mamt">' + state.amount + "</b>"
          + '<span class="lf-mcur">' + currency + "</span>";
        meter.title = "Press to raise the bid, CLR lowers, CONFIRM seals";
        meter.addEventListener("click", () => {
          if (state.sealed) return;
          if (state.amount >= budget){ snd("whiff"); return; }
          state.amount++; snd("dice_lock"); paintDevice();
        });
        meter.addEventListener("wheel", (e) => {
          e.preventDefault();
          if (state.sealed) return;
          const d = e.deltaY < 0 ? 1 : -1;
          const v = state.amount + d;
          if (v < 0 || v > budget){ snd("whiff"); return; }
          state.amount = v; snd("dice_lock"); paintDevice();
        }, { passive:false });
      } else {
        meter.innerHTML =
          '<span class="lf-mlot is-empty">mark a lot through the window</span>';
      }
      gcol.appendChild(meter);
      const actions = mk("div", "dice-actions");
      const dn = mk("button", "btn btn-ghost btn-sm", "−");
      dn.id = "lf-dn";
      dn.addEventListener("click", () => {
        if (state.sealed || state.amount<=0) return;
        state.amount--; snd("dice_lock"); paintDevice();
      });
      const up = mk("button", "btn btn-ghost btn-sm", "+");
      up.id = "lf-up";
      up.addEventListener("click", () => {
        if (state.sealed) return;
        if (state.amount >= budget){ snd("whiff"); return; }
        state.amount++; snd("dice_lock"); paintDevice();
      });
      const seal = mk("button", "btn btn-primary btn-sm", "Seal");
      seal.id = "lf-seal";
      seal.disabled = state.sealed || state.lot==null || state.amount<min;
      seal.addEventListener("click", () => {
        if (seal.disabled) return;
        state.sealed = true;
        snd("chart_stamp");
        paintDevice();
        const g = app();
        setTimeout(() => {
          unmount();
          g.respond({ lot: state.lot, amount: state.amount });
        }, 520);
      });
      actions.appendChild(dn); actions.appendChild(up);
      actions.appendChild(seal);
      gcol.appendChild(actions);
      cols.appendChild(gcol);
      try{ cols.appendChild(a._vitalsColEl()); }catch(e){}
      dbody.appendChild(cols);
      try{ window.__cabinPulse && window.__cabinPulse(); }catch(e){}
    }
    deviceFace = { crt: () => paintDevice("crt"), tray: () => paintDevice() };
    paintDevice();
    // the auction OWNS its scene: the phase takes you to the window (the
    // first scene of the Hour), exactly like the drawer takes the delivery
    try{
      const g = app();
      if (g && g.camera && g.camera.setScene){
        g.camera._engage && g.camera._engage();
        g.camera.setScene("market");
      }
      // the boot tour may steal the camera back: hold the window only until
      // the player's FIRST gesture; from then on the camera is theirs
      // so um gesto de CAMERA solta o enquadramento: as teclas de cena e a
      // roda. Clicar num lote e jogar, nao e querer olhar para outro lado.
      camReleased = false;
      const release = (e) => {
        if (e.type === "keydown" && !/^[0-9wasdWASD]$/.test(e.key)) return;
        camReleased = true;
        window.removeEventListener("keydown", release, true);
        window.removeEventListener("wheel", release, true);
      };
      window.addEventListener("keydown", release, { capture:true });
      window.addEventListener("wheel", release, { capture:true, passive:true });
      if ((o.round|0) === 0 && g && g.helaSay)
        // she is not a tutorial: she sells the room and insults the buyer
        g.helaSay("An <b>auction</b>. The Bureau sells the future by the "
          + "kilo and calls it opportunity. Touch what you covet.", 5600);
    }catch(e){}
    return root;
  }

  /* ── consumo ── */
  /* ══════════════════════════════════════════════════════════════════════
     PERGUNTAR A LINHA EM CIMA DA MAQUINA

     Devolve uma promessa que so resolve quando o jogador toca uma linha
     LEGAL da matriz, ou desiste com Escape. Enquanto a pergunta esta no ar
     o corpo ganha `lf-rowpick`, e cada celula da matriz recebe `lf-legal`
     ou `lf-shut`: quem pode receber a peca acende e pulsa, quem nao pode
     apaga e sai do caminho do clique.

     A etiqueta segue o canto da matriz com o DESENHO da peca, e nao o nome
     dela: quem chega ate aqui ja viu esse mesmo desenho na caixa e no
     bilhete, entao a terceira vez ele ja e reconhecimento e nao leitura.
     ══════════════════════════════════════════════════════════════════════ */
  /* O gancho existe para a sonda poder exercitar a pergunta sem precisar
     vencer um leilao inteiro primeiro: a fase de consumo so monta depois de
     uma rodada completa, e isso nao cabe no tempo de uma sonda. */
  window.__lfAskRow = (pid, legal, dica) => askRowOnMatrix(pid, legal, dica);
  /* ══════════════════════════════════════════════════════════════════════
     QUAL DOS SEUS DADOS MORRE

     A regra, literal: com slot livre o dado novo entra e pronto,
     ninguem pergunta nada. Sem slot livre, o dono escolhe qual dos dele
     quebra, e escolhe BATENDO: o ponteiro vira martelo, os dados dele ficam
     vermelhos e chamam, e o que ele acertar e o que morre.

     Escape desiste. Desistir tem preco (o dado novo vai embora, que e o que
     o motor faz sem uma troca), mas a HELA avisa antes.
     ══════════════════════════════════════════════════════════════════════ */
  function askDieToBreak(novo, bancada){
    /* ══ A DECISAO ACONTECE NO COMPARTIMENTO DE DADOS DA MAQUINA ═══════════
       Regra de design deste jogo, ja escrita mais de uma vez e ja violada
       duas: POPUP NAO EXISTE. Tudo e material, tudo e componente
       fisico. Quebrar um dado se decide onde os dados moram: a bandeja
       GENERATORS do aparelho, com os dados que ja estao la, apagados e sem
       valor de rodada, o martelinho no cursor e o brilho vermelho.
       A forja flutuante morreu. Se a bandeja nao estiver desenhada, ela e
       construida NO LUGAR DELA no chassi, porque o compartimento existe na
       maquina, nao no meio da cena. */
    soltarPalcoDepois();
    return new Promise(res => {
      try {
        const a = app();
        if (a && window.__leilaoMachine) window.__leilaoMachine.dice(a);
      } catch(e){}
      const console_ = document.querySelector("#hull-console");
      let pool = console_ && console_.querySelector(".dice-pool");
      let poolNossa = false;
      if (!pool && console_){
        // o compartimento construido no proprio chassi, na posicao que o
        // CSS da bandeja ja define; nunca um painel solto
        pool = document.createElement("div");
        pool.className = "dice-pool";
        (bancada || []).forEach(gid =>
          pool.appendChild(genDieEl(gid, null, { static: true })));
        console_.appendChild(pool);
        poolNossa = true;
      }
      const alvos = pool ? pool.querySelectorAll(".die[data-gid]").length : 0;
      try { window.__lfTrilha.push("martelo na bandeja, alvos=" + alvos); }
      catch(e){}
      if (!alvos){
        try { window.__lfTrilha.push("bandeja impossivel, sem pergunta"); }
        catch(e){}
        if (poolNossa && pool) pool.remove();
        res(null); return;
      }
      acenderMaquina();
      document.body.classList.add("lf-hammer");
      try { const g = app(); if (g && g.helaSay) g.helaSay(
        "The bench is full. Break one of yours, or lose the new one.",
        5200); } catch(e){}

      let prazo = 0;
      const limpar = () => {
        clearTimeout(prazo);
        document.body.classList.remove("lf-hammer");
        apagarDeVolta();
        pool.removeEventListener("click", naBatida, true);
        document.removeEventListener("keydown", noEsc, true);
        if (poolNossa) pool.remove();
      };
      const naBatida = (e) => {
        const d = e.target.closest(".die[data-gid]");
        if (!d) return;
        e.stopPropagation(); e.preventDefault();
        const gid = d.dataset.gid;
        try { snd("dice_lock"); } catch(err){}
        limpar(); res(gid);
      };
      const noEsc = (e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation(); limpar(); res(null);
      };
      pool.addEventListener("click", naBatida, true);
      document.addEventListener("keydown", noEsc, true);
      // prazo SO para bandeja invisivel: quem pensa, pensa o tempo que for
      const tique = () => {
        const d = pool.querySelector(".die[data-gid]");
        const b = d && d.getBoundingClientRect();
        const visivel = !!(d && b && b.width > 4
          && +getComputedStyle(d).opacity > 0.5);
        if (visivel){ prazo = setTimeout(tique, 25000); return; }
        try { window.__lfTrilha.push("bandeja invisivel, prazo venceu"); }
        catch(e){}
        limpar(); res(null);
      };
      prazo = setTimeout(tique, 25000);
    });
  }

  /* uma linha esta ocupada quando ela ja tem funcao. Serve so para avisar
     o preco: ocupada continua sendo escolha legal, sempre. */
  function ocupada(r){
    const cel = document.querySelector(
      '#hull-console .matrix-wrap .cell[data-r="' + r + '"].filled');
    if (cel) return true;
    const rot = document.querySelectorAll(
      "#hull-console .matrix-wrap .matrix-fnlabel")[r];
    const nome = rot && rot.textContent && rot.textContent.trim();
    return !!(nome && nome.length > 1);
  }

  /* ══ A MAQUINA ESTA MESMO NA TELA? ═══════════════════════════════════════
     A pergunta de linha acontece em cima do vidro da maquina. Se a maquina
     nao estiver visivel, a pergunta acontece no escuro e a linha cai no
     padrao sem o jogador saber que houve escolha, que e exatamente o defeito
     do dado sumindo em mesa.
     O GUARDA DIZ POR QUE RECUSOU. Passei tres rodadas de sonda medindo isto
     por fora e concluindo errado duas vezes. Um guarda que so devolve nulo
     obriga essa perseguicao; um que guarda o motivo responde de primeira. */
  /* ══ ACENDER A MAQUINA PARA PERGUNTAR, DE VERDADE ══════════════════════
     A regra que apaga o console quando o braco vira ponteiro e `!important`,
     e a minha regra de palco, que deveria ganhar por especificidade, nao
     estava ganhando: medido, `#hull-console esta com opacidade 0` bem no
     instante da pergunta, e por isso a escolha de linha e a do martelo eram
     puladas em silencio. A funcao entrava no padrao e o dado sumia sem que
     ninguem perguntasse nada, que e justamente o defeito que esta fase toda
     existe para consertar.
     Estilo inline com `important` nao perde para folha nenhuma. Guardo o que
     estava escrito antes para devolver quando a pergunta acabar. */
  /* Alem do console inteiro, ACENDE AS PECAS QUE A PERGUNTA USA. O app.css
     apaga a bandeja de dados fora da alocacao:
       body.cabin-on:not(.allocating) #hull-console .dice-pool
         { opacity: 0; pointer-events: none !important; }
     e o martelo acontece no CONSUMO, nao na alocacao. Resultado visto jogando: o
     jogador era mandado escolher um dado para destruir entre
     dados invisiveis e inclicaveis. A matriz tinha o mesmo problema, e foi o
     que fez a pergunta de linha ser pulada em silencio por tantas Horas.
     Estilo inline com `important` nao perde para folha nenhuma. */
  function acenderMaquina(){
    const c = document.querySelector("#hull-console");
    if (!c) return;
    if (c.__lfAntes == null) c.__lfAntes = c.getAttribute("style") || "";
    c.style.setProperty("opacity", "1", "important");
    /* O CONSOLE NAO RECEBE CLIQUE, so as pecas dentro dele. Ele e um painel
       de 673x405 deitado por cima da cena: forcando `pointer-events:auto`
       nele, ele passou a comer TODO clique do leilao. Visto na Hora 3, jogando: nao abria caixa, nao abria gaveta, nao
       girava a mesa. Nada estava quebrado, estava tudo atras de um vidro
       invisivel que eu mesmo pus na frente.
       Acender e sobre PINTURA. Quem precisa de clique e a celula e o dado,
       e sao eles que recebem. */
    c.style.setProperty("pointer-events", "none", "important");
    [".dice-pool", ".dice-pool .die", ".matrix-wrap", ".matrix-wrap .cell",
     ".escape-slot"].forEach(sel => {
      c.querySelectorAll(sel).forEach(el => {
        if (el.__lfAntes == null) el.__lfAntes = el.getAttribute("style") || "";
        el.style.setProperty("opacity", "1", "important");
        el.style.setProperty("pointer-events", "auto", "important");
      });
    });
    const h = document.querySelector("#hull-manopla");
    if (h){
      if (h.__lfAntes == null) h.__lfAntes = h.getAttribute("style") || "";
      h.style.setProperty("opacity", "1", "important");
    }
    /* o proprio acendedor confere o que conseguiu: se o computado ainda for
       zero depois do inline important, a trilha grava e o mistério vira
       medida em vez de teoria */
    try { window.__lfTrilha.push("acendi: op="
      + getComputedStyle(c).opacity); } catch(e){}
  }
  function apagarDeVolta(){
    ["#hull-console", "#hull-manopla",
     "#hull-console .dice-pool", "#hull-console .dice-pool .die",
     "#hull-console .matrix-wrap", "#hull-console .matrix-wrap .cell",
     "#hull-console .escape-slot"].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el.__lfAntes != null){
          el.setAttribute("style", el.__lfAntes); el.__lfAntes = null;
        }
      });
    });
  }

  function matrizNaTela(){
    const marca = (m) => { window.__lfPorQue = m; return null; };
    const wrap = document.querySelector("#hull-console .matrix-wrap");
    if (!wrap) return marca("nao existe .matrix-wrap dentro de #hull-console");
    const b = wrap.getBoundingClientRect();
    if (b.width < 40 || b.height < 40)
      return marca("matriz pequena demais: " + Math.round(b.width) + "x"
        + Math.round(b.height));
    if (b.right < 0 || b.bottom < 0
        || b.left > innerWidth || b.top > innerHeight)
      return marca("matriz fora da tela em " + Math.round(b.left) + ","
        + Math.round(b.top));
    let n = wrap;
    while (n && n !== document.body){
      const cs = getComputedStyle(n);
      const quem = (n.id ? "#" + n.id : n.tagName.toLowerCase() + "."
        + ((n.className && (n.className.baseVal || n.className)) || "")
          .toString().trim().split(" ")[0]);
      if (cs.display === "none") return marca(quem + " esta display:none");
      if (cs.visibility === "hidden") return marca(quem + " esta invisivel");
      if (+cs.opacity < 0.15)
        return marca(quem + " esta com opacidade " + cs.opacity);
      n = n.parentElement;
    }
    window.__lfPorQue = "visivel";
    return wrap;
  }

  /* REDE DE SEGURANCA DO PALCO. Se qualquer coisa estourar entre acender a
     maquina e receber a resposta, o estado forcado fica preso e a cena inteira
     trava atras dele. Este relogio devolve tudo sozinho depois de meio minuto,
     aconteca o que acontecer. */
  function soltarPalcoDepois(){
    clearTimeout(soltarPalcoDepois._t);
    soltarPalcoDepois._t = setTimeout(() => {
      document.body.classList.remove("lf-rowpick", "lf-hammer");
      try { apagarDeVolta(); } catch(e){}
    }, 30000);
  }

  function askRowOnMatrix(pid, legal, dica){
    soltarPalcoDepois();
    // a maquina precisa estar ACESA para poder ser perguntada: o desenho da
    // matriz so nasce quando alguem pede
    try {
      const a = app();
      if (a && window.__leilaoMachine) window.__leilaoMachine.idle(a);
    } catch(e){}
    // O PALCO PRIMEIRO, A CONFERENCIA DEPOIS. Conferir antes de montar era
    // perguntar "da para ver?" com as luzes apagadas: a maleta ainda por
    // cima e o console ainda no fundo. A classe levanta a maquina e recua a
    // maleta; se mesmo assim nao der para ver, ela sai e a ficha reassume.
    document.body.classList.add("lf-rowpick");
    acenderMaquina();
    const wrap = matrizNaTela();
    if (!wrap || !legal || !legal.length){
      document.body.classList.remove("lf-rowpick");
      return Promise.resolve(null);
    }
    // a matriz e uma grade plana: rotulo, tres celulas, rotulo, tres...
    // entao a linha de cada rotulo e a posicao dele entre os rotulos.
    const rotulos = [...wrap.querySelectorAll(".matrix-fnlabel")];
    const daLinha = (r) => [rotulos[r]].concat(
      [...wrap.querySelectorAll('.cell[data-r="' + r + '"]')]).filter(Boolean);

    /* O CARTAZ COM OS MODULOS SAIU. Eu tinha pendurado uma etiqueta ao lado
       da matriz com o desenho da peca e o nome dela, e ela virou um pop-up
       flutuando no meio da cena: quebra a imersao e repete o que a propria
       maquina ja esta mostrando acesa.
       Quem diz qual peca esta entrando e a HELA, com voz, que e o canal que
       este jogo ja usa para falar. */
    const tag = document.createElement("div");
    tag.className = "lf-rowtag is-mudo";
    document.body.appendChild(tag);
    const b = wrap.getBoundingClientRect();
    tag.style.left = Math.round(b.right + 12) + "px";
    tag.style.top = Math.round(b.top) + "px";
    // A ETIQUETA ACENDE POR ESTILO INLINE, e nao por classe. Medi opacidade
    // zero duas vezes seguidas com a classe posta e a regra certa na folha,
    // o que quer dizer que alguma coisa mais especifica estava ganhando. Em
    // vez de caçar quem, escrevo direto no elemento: inline vence tudo, e a
    // transicao continua fazendo o esmaecido.
    void tag.offsetWidth;          // fecha o estado inicial antes de acender
    tag.classList.add("on");
    tag.style.opacity = "1";

    // a classe do palco ja foi posta la em cima, antes da conferencia
    for (let r = 0; r < 3; r++){
      const ok = legal.indexOf(r) >= 0;
      daLinha(r).forEach(n => n.classList.add(ok ? "lf-legal": "lf-shut"));
      // A LINHA JA OCUPADA CONTINUA VALENDO, e a regra e essa mesma: por em
      // cima destroi a de baixo. Mas o preco tem que aparecer ANTES do
      // clique, senao a pessoa descobre que perdeu uma funcao depois.
      if (ok && ocupada(r)) daLinha(r).forEach(n => n.classList.add("lf-eat"));
    }
    try { const g = app(); if (g && g.helaSay) g.helaSay(
      "Choose the row. The lit ones will take it.", 3200); } catch(e){}

    return new Promise(res => {
      let prazo = 0;
      const limpar = () => {
        clearTimeout(prazo);
        document.body.classList.remove("lf-rowpick");
        apagarDeVolta();
        wrap.querySelectorAll(".lf-legal,.lf-shut,.lf-eat").forEach(n =>
          n.classList.remove("lf-legal", "lf-shut", "lf-eat"));
        wrap.removeEventListener("click", noClique, true);
        document.removeEventListener("keydown", noEsc, true);
        tag.classList.remove("on");
        tag.style.opacity = "0";
        setTimeout(() => tag.remove(), 200);
      };
      const noClique = (e) => {
        const alvo = e.target.closest(".lf-legal");
        if (!alvo) return;
        e.stopPropagation(); e.preventDefault();
        // o rotulo nao carrega data-r, entao a linha vem da posicao dele
        const r = alvo.dataset && alvo.dataset.r != null
          ? +alvo.dataset.r: rotulos.indexOf(alvo);
        if (!(r >= 0)) return;
        try { snd("dice_lock"); } catch(err){}
        limpar(); res(r);
      };
      const noEsc = (e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation(); limpar(); res(null);
      };
      wrap.addEventListener("click", noClique, true);
      document.addEventListener("keydown", noEsc, true);
      /* O PRAZO NAO ATROPELA QUEM PENSA. A regra: o passe so vem
         DEPOIS de todas as escolhas. Entao o prazo confere: a pergunta esta
         VISIVEL? Se esta, o jogador esta decidindo e o relogio se estica
         para sempre. Ele so resolve sozinho no caso patologico, a pergunta
         que abriu invisivel e viraria refem. */
      const tickLinha = () => {
        const c = document.querySelector("#hull-console");
        const cel = wrap.querySelector(".cell.lf-legal");
        const b = cel && cel.getBoundingClientRect();
        const visivel = !!(c && cel && b && b.width > 4
          && +getComputedStyle(c).opacity > 0.5);
        if (visivel){ prazo = setTimeout(tickLinha, 20000); return; }
        try { window.__lfTrilha.push("linha invisivel, prazo venceu"); }
        catch(e){}
        limpar(); res(null);
      };
      prazo = setTimeout(tickLinha, 20000);
    });
  }

  function mountConsumo(req){
    /* O LEITOR EXISTE DESDE O PRIMEIRO INSTANTE DA FASE. Ele estava sendo
       publicado la embaixo, depois de um monte de preparo, e a trilha de uma
       partida mostrou o jogador enfiando bilhete na boca com
       `feed=undefined` quatro vezes seguidas: a mao chegou antes do gancho.
       Declarado aqui em cima, ele aponta para a funcao que ainda vai ser
       definida (o iamento cuida disso) e a boca nunca fica muda. */
    window.__lfFeedLot = (id) => armarLote(id, true);
    // queimar um bilhete tira ele da decisao desta Hora tambem
    window.__lfDropLot = (id) => {
      if (picks[id]) delete picks[id];
      render();
      /* queimar o ULTIMO bilhete tambem encerra a vez: sem lote para decidir
         nao ha por que segurar o jogador na fase */
      const q1 = window.__lfQueimados || {};
      const faltam1 = (o.maleta || []).filter(l =>
        !picks[l.id] && !q1[l.id]).length;
      if (!faltam1) setTimeout(() => { try { fecharFase(true); } catch(e){} }, 380);
    };
    montarFecho._armado = false;
    fecharFase._foi = false;
    fecharFase._querFechar = false;
    fecharFase._desde = Date.now();
    clearInterval(window.__lfLeiTimer);
    window.__lfLeiTimer = setInterval(() => {
      try { leiDoPasse(); } catch(e){} }, 1200);
    window.__lfLidos = {};
    const root = layer();
    // back to the desk: the case is where offers land
    try{
      const g = app();
      if (g && g.camera && g.camera.setScene) g.camera.setScene("main");
    }catch(e){}
    const o = req.options || {};
    const picks = {};
    try{
      window.__leilaoLots = window.__leilaoLots || {};
      window.__leilaoLotPieces = window.__leilaoLotPieces || {};
      (o.maleta||[]).forEach(l => { window.__leilaoLotPieces[l.id] =
        (l.pieces || []); window.__leilaoLots[l.id] =
        (l.pieces||[]).map(pieceName).join(" · ") || l.id; });
    }catch(e){}
    // NOTHING FLOATS: the docket is filed INSIDE the briefcase, in the
    // EQUIPMENT recess where the offers already rest
    const dock = document.createElement("div");
    dock.className = "lf-casedock";
    const caseZone = document.getElementById("rucksack-zone");
    // NO HOVER DUMP HERE. It printed the raw effect dict over the very slip it
    // was describing, and now that the offer draws its pieces there is nothing
    // left for it to add. Description goes away when the drawing says it.
    /* WHICH ROWS MAY TAKE THIS PIECE. The same law the driver enforces on the
       way in, so a socket that lights here never gets refused there. */
    function legalRows(pid){
      const grid = o.rows || [];
      const c = catalog || {};
      const fn = c.funcoes && c.funcoes[pid];
      const md = c.modulos && c.modulos[pid];
      const out = [];
      grid.forEach((r, i) => {
        if (fn){ if (!r.sealed) out.push(i); return; }
        if (md && md.kind === "acoplador"){
          const cur = r.funcao && c.funcoes && c.funcoes[r.funcao];
          if (cur && !r.extra && cur.modules.length === 2) out.push(i);
          return;
        }
        if (md && md.kind === "parasita"){ if (r.funcao) out.push(i); return; }
      });
      return out;
    }
    function needsRow(pid){ return legalRows(pid).length > 0
      && !!((catalog||{}).funcoes && catalog.funcoes[pid]
            || (catalog||{}).modulos && catalog.modulos[pid]); }
    function isDiePiece(pid){
      return !!((catalog||{}).geradores && catalog.geradores[pid]); }

    function slotHTML(i, chosen, legal){
      const r = (o.rows || [])[i] || {};
      const c = catalog || {};
      const fn = r.funcao && c.funcoes && c.funcoes[r.funcao];
      let inner = "";
      if (fn) inner = fn.modules.map(e => houseHTML(e)).join("");
      for (let k = (fn ? fn.modules.length: 0); k < ROW_SOCKETS; k++)
        inner += '<i class="lf-mcell is-void"></i>';
      return '<button type="button" class="lf-slot lf-fam-'
        + (fn ? (fn.family || "recarga"): "none")
        + (chosen ? " is-chosen": "") + (legal ? "": " is-shut")
        + '" data-row="' + i + '"' + (legal ? "": " disabled")
        + ' title="' + (fn ? fn.name: "empty row")
        + (r.sealed ? " (sealed)": "") + '">'
        + '<span class="lf-slotn">' + (i + 1) + "</span>"
        + '<span class="lf-prow2">' + inner + "</span></button>";
    }

    /* UMA PERGUNTA POR PECA, EM FILA. Um lote pode trazer funcao e dado
       juntos; perguntar as duas linhas ao mesmo tempo em cima da mesma
       matriz seria duas luzes disputando o mesmo vidro. Entao a fila
       espera cada resposta antes de acender a proxima.

       Se o jogador desistir com Escape, a linha cai no padrao antigo (a
       primeira vazia, senao a primeira legal). Desistir nunca pode custar
       a peca: e a mesma lei do dado que sumia em silencio. */
    async function perguntarLinhas(lot, pick){
      for (const pid of (lot.pieces || [])){
        /* O DADO: com slot livre ele entra e pronto, ninguem pergunta nada.
           Sem slot livre, o dono escolhe qual dos dele quebra, batendo. */
        if (isDiePiece(pid)){
          /* BANCADA CHEIA SEMPRE PERGUNTA. Provado no motor: `bruto` e `tita`
             entram sem reclamar QUANDO VEM UMA TROCA JUNTO, e sao descartados
             quando ela nao vem. Eles nunca foram instalados em 36 partidas de
             simulador nao porque sejam ruins, mas porque ninguem estava
             perguntando ao dono qual dado dele morre.
             Entao o silencio aqui e proibido: se ha bancada e ela esta no
             teto, o martelo abre. */
          const bancada = o.generators || [];
          const teto = o.cap | 0;
          /* O TETO CRESCE COM AS FUNCOES DO PROPRIO TICKET. Duas funcoes
             seguram dois dados, SEMPRE: se este lote traz uma funcao junto
             do dado, ela e instalada antes e abre a vaga. O servidor manda o
             teto de ANTES da instalacao, e eu perguntava com o numero velho:
             pergunta falsa, no meio da tela, para destruir um dado que nem
             precisava morrer. Regra da mesa, agora obedecida. */
          const funcoesDoLote = (lot.pieces || []).filter(px =>
            (catalog || {}).funcoes && catalog.funcoes[px]).length;
          const efetivoTeto = teto + funcoesDoLote;
          const cheia = efetivoTeto > 0 && bancada.length >= efetivoTeto;
          try { window.__lfTrilha.push("teto? servidor=" + teto + " +funcoes="
            + funcoesDoLote + " bancada=" + bancada.length
            + (cheia ? " CHEIA" : " tem vaga")); } catch(e){}
          if (!cheia) continue;
          try { window.__lfTrilha.push("martelo? bancada=" + bancada.length
            + " teto=" + teto); } catch(e){}
          const morto = await askDieToBreak(pid, bancada);
          try { window.__lfTrilha.push("martelo quebrou=" + morto); } catch(e){}
          if (morto){ pick.swaps = pick.swaps || {}; pick.swaps[pid] = morto; }
          else {
            /* desistir tem preco, e o preco tem que ser DITO. Sem troca o
               motor descarta o dado novo, e ate hoje isso acontecia sem uma
               palavra: o premio evaporava e o jogador nunca soube por que. */
            try { const g2 = app(); if (g2 && g2.helaSay) g2.helaSay(
              "Nothing broken, nothing gained: <b>" + pieceName(pid)
              + "</b> goes back to the Bureau.", 4200); } catch(e){}
          }
          continue;
        }
        const legal = legalRows(pid);
        try { window.__lfTrilha.push("linha? " + pid + " legais="
          + legal.join(",") + " precisa=" + needsRow(pid)); } catch(e){}
        if (!legal.length || !needsRow(pid)) continue;
        const r = await askRowOnMatrix(pid, legal, pieceName(pid));
        try { window.__lfTrilha.push("linha resposta=" + r
          + " porque=" + (window.__lfPorQue || "-")); } catch(e){}
        if (r != null){ pick.rows[pid] = r; continue; }
        const vazias = legal.filter(i => !((o.rows||[])[i] || {}).funcao);
        pick.rows[pid] = vazias.length ? vazias[0]: legal[0];
      }
      return pick;
    }

    /* ══ ARMAR UM LOTE ═════════════════════════════════════════════════
       Um lugar so para isto, porque agora existem DUAS portas: a ficha de
       papel (quando ela ainda aparece) e a BOCA DA MAQUINA, que e a porta
       que fica como a unica. As duas tem que armar do mesmo jeito,
       senao alocar pelo bilhete e alocar pelo papel viram dois jogos. */
    /* `porLeitor` diz de onde veio o gesto. Pela FICHA de papel, clicar de
       novo desarma, que e o comportamento de uma caixa de selecao. Pelo
       LEITOR, nunca: enfiar o bilhete na boca outra vez nao e desenfiar. A
       trilha de uma partida mostrou o mesmo lote armando e desarmando em
       sequencia e chegando ao fim da Hora desarmado, com tres bilhetes
       parados na maleta e nada instalado. */
    let emPergunta = 0;   // quantas perguntas (linha/martelo) estao no ar
    /* UM TICKET POR VEZ. Em jogo, o segundo entrou com a pergunta do
       primeiro ainda aberta, e as duas leituras se embaralharam: ele acabou
       decidindo os dois no escuro. A boca agora ACEITA o segundo, mas ele
       espera na fila: o primeiro resolve todas as escolhas, e so entao o
       proximo comeca. Resolucao intermediaria no meio da fase, como ele
       pediu. */
    const filaDeLeitura = [];

    function leiDoPasse(){
      clearTimeout(leiDoPasse._auto);
      const qA = window.__lfQueimados || {};
      const resto = (o.maleta || []).filter(l => !picks[l.id] && !qA[l.id]);
      const decidiu = Object.keys(picks).length
        || Object.keys(qA).filter(k => (o.maleta || []).some(l => l.id === k)).length;
      try { window.__lfTrilha.push("auto? resto=" + resto.length
        + " decididos=" + Object.keys(picks).length); } catch(e){}
      /* NUNCA no meio de uma pergunta: a trilha pegou o passe automatico
         disparando com a escolha de linha ainda aberta, o que fecharia a
         fase por baixo da decisao. Quando a pergunta acaba, o armarLote
         chama render de novo e a lei roda no momento certo. */
      const perguntaAberta = emPergunta > 0
        || filaDeLeitura.length > 0
        || document.body.classList.contains("lf-rowpick")
        || document.body.classList.contains("lf-hammer");
      if (!resto.length && decidiu && !perguntaAberta){
        try { window.__lfTrilha.push("ultimo ticket decidido, passa sozinho"); }
        catch(e){}
        leiDoPasse._auto = setTimeout(() => {
          if (emPergunta > 0 || filaDeLeitura.length > 0
              || document.body.classList.contains("lf-rowpick")
              || document.body.classList.contains("lf-hammer")) return;
          try { fecharFase(true); } catch(e){} }, 460);
      }
    }

    async function armarLote(id, porLeitor){
      try { window.__lfTrilha.push("armar:" + id + " lotes="
        + (o.maleta||[]).map(l => l.id).join("|")); } catch(e){}
      if (porLeitor && (emPergunta > 0 || armarLote._rodando)){
        if (!filaDeLeitura.includes(id) && !picks[id]){
          filaDeLeitura.push(id);
          // o bilhete some do rack na hora: FOI engolido, so espera a vez
          window.__lfLidos = window.__lfLidos || {};
          window.__lfLidos[id] = true;
          try { const g9 = app();
            g9 && g9.renderRucksack && g9.renderRucksack(); } catch(e){}
          try { window.__lfTrilha.push("na fila: " + id); } catch(e){}
        }
        return true;
      }
      if (picks[id] && porLeitor){
        try { window.__lfTrilha.push("ja armado, leitor nao desarma"); } catch(e){}
        return true;
      }
      if (picks[id]){ delete picks[id]; snd("whiff"); render(); return false; }
      const lot = (o.maleta||[]).find(l => l.id === id);
      if (!lot){ try { window.__lfTrilha.push("armar:LOTE NAO ACHADO " + id); }
        catch(e){} return false; }
      picks[id] = { lot:id, rows:{} };
      /* O BILHETE LIDO SAI DA MALETA NA HORA. O lote so deixa o estojo no
         servidor quando a Hora fecha, entao o rack redesenhava o mesmo
         bilhete e ele parecia TELEPORTAR de volta depois de consumido.
         Esta lista diz ao rack o que ja foi lido. */
      window.__lfLidos = window.__lfLidos || {};
      window.__lfLidos[id] = true;
      try { const g0 = app(); g0 && g0.renderRucksack && g0.renderRucksack(); }
      catch(e){}
      snd("lift");
      render();
      armarLote._rodando = true;
      emPergunta++;
      try { await perguntarLinhas(lot, picks[id]); }
      finally { emPergunta--; armarLote._rodando = false; }
      try { window.__lfTrilha.push("armado:" + id + " linhas="
        + JSON.stringify(picks[id].rows)); } catch(e){}
      render();
      // um fecho adiado (PASS no meio da pergunta) dispara agora, com a
      // resposta ja gravada nos swaps
      if (fecharFase._querFechar){
        fecharFase._querFechar = false;
        setTimeout(() => { try { fecharFase(true); } catch(e){} }, 260);
      }
      /* o proximo da fila comeca sozinho, com as perguntas do anterior ja
         fechadas: a resolucao intermediaria, como tem que ser */
      if (filaDeLeitura.length){
        const prox = filaDeLeitura.shift();
        setTimeout(() => { try { armarLote(prox, true); } catch(e){} }, 260);
      }
      return true;
    }

    /* O LEITOR DA MAQUINA COMO PORTA. Enquanto esta fase esta montada, o
       bilhete que entra na boca arma o lote direto. O gancho morre junto
       com a fase: fora dela um bilhete no leitor nao tem o que instalar. */
    // (o gancho ja foi publicado no topo da fase)

    /* ══ QUANDO O PAPEL NAO PRECISA EXISTIR ═══════════════════════════════
       O caminho e um so: o bilhete esta na maleta, voce
       leva ele ate a boca da maquina, e a maquina pergunta o que precisa. Se
       esse caminho esta inteiro, a ficha de papel nao tem funcao nenhuma e
       so ocupa a mesa.
       Inteiro quer dizer as duas pontas: bilhete desenhado no rack E maquina
       na tela para responder. Faltando qualquer uma, o papel volta, porque
       ficar sem caminho nenhum e o unico resultado inaceitavel. */
    function semPapel(){
      /* ══ O PAPEL FICA ATE O BILHETE PROVAR QUE FUNCIONA ══════════════════
         Descoberto jogando: o papel era quem fazia o trabalho. `semPapel()`
         exigia a matriz na tela, e no leilao ela esta apagada, entao a ficha
         SEMPRE aparecia e era por ela que o lote virava peca.
         Quando eu tirei o papel, sobrou so o caminho do bilhete, e ai a
         verdade apareceu: em tres Horas seguidas os bilhetes empilharam na
         maleta (1, 2, 3) com ZERO funcoes e ZERO dados instalados. O caminho
         do bilhete passou nas minhas provas sinteticas e nunca numa partida.
         Enquanto ele nao for provado JOGANDO, o papel fica. Um caminho feio
         que instala e melhor que um bonito que nao instala. */
      /* PELA MALETA, e nao pelo desenho. Perguntando ao DOM se existe bilhete,
         o papel voltava assim que o ultimo bilhete era lido (ele some do rack
         na hora), e o jogador via papel de novo no fim da fase.
         A pergunta certa e se esta Hora TEM lote para instalar, e isso quem
         responde e a maleta do viajante. */
      return ((o.maleta || []).length > 0);
    }

    function render(){
      /* ══ A REGRA DO RAFAEL, LITERAL ═══════════════════════════════════════
         Consumiu o ULTIMO ticket, a vez passa SOZINHA. O PASS existe so para
         quem tem ticket e nao quer usar. A regra mora AQUI porque todo
         caminho (leitor, ficha, queima, pergunta respondida) termina num
         render, entao nenhum consegue escapar dela. As versoes anteriores
         moravam dentro de um caminho especifico e vazavam pelos outros. */
      leiDoPasse();
      // com o caminho do bilhete inteiro, a ficha some e sobra o fecho
      if (semPapel()){
        dock.innerHTML = "";
        dock.classList.add("is-quiet");
        montarFecho();
        return;
      }
      dock.classList.remove("is-quiet");
      dock.innerHTML = (o.maleta||[]).map(l => {
        const armed = picks[l.id];
        const rowPiece = (l.pieces||[]).find(needsRow);
        const chosen = armed && rowPiece != null
          ? armed.rows[rowPiece]: null;
        const legal = rowPiece != null ? legalRows(rowPiece): [];
        return '<div class="lf-offer' + (armed ? " is-armed": "")
          + '" data-id="' + l.id + '">'
          + '<i class="lf-punch"></i>'
          + '<span class="lf-obody">'
          + (l.pieces||[]).map(p => '<span class="lf-opiece">'
              + pieceBodyHTML(p) + "<em>" + pieceName(p) + "</em></span>").join("")
          + "</span>"
          + '<em class="lf-ink-stamp">' + (armed ? "INSTALL": "") + "</em>"
          // A LINHA NAO SE ESCOLHE NO PAPEL. Ela se escolhe em cima do vidro
          // da maquina, que esta acesa ali do lado com as tres linhas e os
          // soquetes vazios a mostra. O que sobra aqui e so o RECIBO: em
          // qual linha ela ficou, para a ficha nao virar decisao muda.
          + (armed && rowPiece != null && chosen != null
              ? '<div class="lf-rowecho">' + slotHTML(chosen, true, true)
                + "</div>"
                : "")
          // ══ A TROCA DE DADO ═══════════════════════════════════════════
          // A regra do ticket vale para dados: bancada cheia, o dado novo so
          // entra destruindo um atual, e A ESCOLHA E DO DONO. Ate aqui o
          // cliente nem perguntava e o motor descartava o premio em silencio.
          // Com o lote armado e um dado dentro, os SEUS dados aparecem e o
          // que voce tocar e o que morre; nenhum tocado, vale o descarte.
          + (armed ? (l.pieces||[]).filter(isDiePiece).map(pd => {
              const bench = o.generators || [];
              if (bench.length < (o.cap|0) || !bench.length) return "";
              const chosenSwap = armed.swaps && armed.swaps[pd];
              return '<div class="lf-swap" data-piece="' + pd + '">'
                + '<b>' + pieceName(pd) + " enters if one dies:</b>"
                + bench.map(g => '<button type="button" class="lf-swopt'
                    + (chosenSwap === g ? " is-doomed": "")
                    + '" data-gid="' + g + '" title="' + pieceName(g)
                    + '">' + pieceBodyHTML(g) + "</button>").join("")
                + "</div>";
            }).join(""): "")
          + "</div>";
      }).join("");
      // an offer must SAY what it does before you install it: the same
      // reading the machine rows give, raised beside the case
      dock.classList.toggle("is-wide", (o.maleta||[]).length > 3);
      // CHOOSING THE ROW IS ITS OWN GESTURE, and it must not read as a click
      // on the paper underneath, which would put the offer straight back down
      // o recibo da linha e so leitura: tocar nele reabre a pergunta na
      // maquina, que continua sendo o unico lugar onde a linha se escolhe
      dock.querySelectorAll(".lf-rowecho .lf-slot").forEach(sl => {
        sl.addEventListener("click", async ev => {
          ev.stopPropagation();
          const off = sl.closest(".lf-offer");
          const pick = off && picks[off.dataset.id];
          const lot = off && (o.maleta||[]).find(l => l.id === off.dataset.id);
          if (!pick || !lot) return;
          await perguntarLinhas(lot, pick);
          render();
        });
      });
      // tocar um dado seu marca (ou desmarca) quem morre na troca
      dock.querySelectorAll(".lf-swopt").forEach(bt => {
        bt.addEventListener("click", ev => {
          ev.stopPropagation();
          const off = bt.closest(".lf-offer");
          const holder = bt.closest(".lf-swap");
          const pick = off && picks[off.dataset.id];
          if (!pick || !holder) return;
          pick.swaps = pick.swaps || {};
          const pd = holder.dataset.piece, gid = bt.dataset.gid;
          if (pick.swaps[pd] === gid) delete pick.swaps[pd];
          else pick.swaps[pd] = gid;
          snd("dice_lock");
          render();
        });
      });
      dock.querySelectorAll(".lf-offer").forEach(el=>{
        el.addEventListener("click", ()=> armarLote(el.dataset.id));
      });
      montarFecho();
    }

    /* Fechar a fase e uma coisa so, chamada de dois lugares: o cadeado da
       maleta (o jogador decidiu parar) e o automatico (o ultimo bilhete achou
       destino, nao ha mais nada para decidir). */
    function fecharFase(sozinho){
      if (fecharFase._foi) return;
      /* FECHAR COM PERGUNTA ABERTA E PERDER PECA: a resposta ainda nao esta
         nos swaps, o servidor descarta o dado novo, e foi ASSIM que o
         abencoado evaporou em mesa (bastou apertar PASS com a pergunta do
         dado pendurada e invisivel). Agora o fecho ADIA: espera as
         respostas, e se fecha sozinho logo depois delas. */
      if (emPergunta > 0 || filaDeLeitura.length){
        fecharFase._querFechar = true;
        try { window.__lfTrilha.push("fechar adiado, pergunta aberta"); }
        catch(e){}
        return;
      }
      /* NAO FECHA NO PRIMEIRO SEGUNDO. A trilha de uma partida mostrou
         `fechar com 0 armado(s)` ACONTECENDO ANTES de qualquer bilhete ser
         lido, e depois disso todo bilhete caia numa fase morta. Um fecho que
         dispara sozinho no instante em que a maleta abre nao e uma decisao do
         jogador: e um toque que escorregou.
         Passar de proposito continua valendo, so nao no primeiro segundo. */
      /* o automatico NAO passa por este guarda: ele nao e um toque que
         escorregou, e a conclusao de uma decisao que o jogador acabou de
         tomar. Barrar ele era o que deixava a fase aberta pedindo PASS
         depois do ultimo bilhete ja ter achado destino. */
      if (!sozinho && Date.now() - (fecharFase._desde || 0) < 1000){
        try { window.__lfTrilha.push("fecho cedo demais, ignorado"); } catch(e){}
        return;
      }
      fecharFase._foi = true;
      {
        const a = app();
        try { window.__lfTrilha.push("fechar com "
          + Object.keys(picks).length + " armado(s)"); } catch(e){}
        // o gancho do leitor morre com a fase: fora dela um bilhete na boca
        // chamaria um fechamento velho, de uma Hora que ja acabou
        /* NAO APAGO O GANCHO AQUI. Quem sabe que a fase acabou e o desmonte,
           e apagar antes deixava o leitor morto com a fase ainda de pe: a
           trilha de uma partida mostrou `feed=undefined` em toda tentativa,
           com os bilhetes empilhando e nada instalando. */
        clearInterval(window.__lfLeiTimer);
        try { delete window.__lfFeedLot; } catch(e){ window.__lfFeedLot = null; }
        try { window.__malaLock && window.__malaLock.disarm(); } catch(e){}
        unmount();
        snd("confirm");
        a.respond({ activate: Object.values(picks) });
      }
    }

    function montarFecho(){
      const fechar = fecharFase;
      /* O CADEADO E O FECHO. Os numerais que viram palavra ja sao o gesto de
         fechar do jogo (PASS, FIRE): uma placa CLOSE do lado deles e um botao
         a mais para a mesma coisa.
         POR QUE ELE TINHA DERRUBADO A FASE: `montarFecho` roda dentro do
         `render`, e o render acontece varias vezes (a repescagem em quadro e
         a de 320ms). Eu rearmava o cadeado em toda passada, e armar mexe na
         maleta, que redesenha, que chama render de novo. A montagem nunca
         terminava e o leitor nunca era publicado: `feed=undefined` em toda
         tentativa, bilhete empilhando, nada instalando.
         Armar UMA VEZ resolve, e o resto do render nao encosta mais nele. */
      /* REARMAR SEMPRE QUE O CADEADO ESTIVER APAGADO. "Armar uma vez"
         partia do principio de que ninguem mais mexia no cadeado, e e
         mentira: a cabine arma e desarma ele por conta propria entre os
         renders (e o mesmo botao do FIRE da entrega). O callback morria no
         meio da fase, o PASS virava enfeite, e o jogador ficava preso com
         bilhete na maleta e nenhum jeito de passar a vez. O jogo "morria"
         exatamente assim.
         Rearmar quando a classe lk-live sumiu e idempotente: arma, a classe
         acende, o render seguinte pula. */
      window.__lfFecharAtual = fecharFase;
      const lk0 = document.querySelector("#mala-extra #mala-lock");
      if (montarFecho._armado && lk0 && lk0.classList.contains("lk-live"))
        return;
      try {
        if (window.__malaLock && window.__malaLock.arm){
          montarFecho._armado = true;
          window.__malaLock.arm(fechar);
          window.__malaLock.setFace("PASS",
            "GIRE PARA PASSAR · O QUE FOI LIDO ENTRA");
          /* segundo caminho ate o MESMO fecho: se outro sistema roubar o
             callback do cadeado, o clique fisico ainda fecha a fase. O
             guarda _foi engole a duplicata quando os dois caminhos vivem. */
          if (lk0 && !lk0.__lfOuvindo){
            lk0.__lfOuvindo = true;
            lk0.addEventListener("click", () => setTimeout(() => {
              try { window.__lfFecharAtual && window.__lfFecharAtual(); }
              catch(e2){}
            }, 90), true);
          }
          return;
        }
      } catch(e){ montarFecho._armado = false; }
    }
    // the dock must be IN the case before the first paint, or the brass plate
    // has no host and the player is left with a docket that cannot be closed
    if (caseZone) caseZone.appendChild(dock); else root.appendChild(dock);
    document.body.classList.add("lf-case-open");
    render();
    /* O PAPEL SO PODE SUMIR DEPOIS QUE O BILHETE APARECE. Na primeira pintura
       o rack ainda nao desenhou os bilhetes desta Hora, entao `semPapel()`
       diz nao e a ficha nasce. Ela nasce certa: naquele instante o caminho do
       bilhete REALMENTE nao existia. O que faltava era perguntar de novo
       depois, quando ele existe. Duas repescagens bastam: uma no quadro
       seguinte e uma depois da maleta assentar. */
    requestAnimationFrame(() => { if (mounted) render(); });
    setTimeout(() => { if (mounted) render(); }, 320);
    // the rows the case is asking about have to be ON the machine while it
    // asks: the dispatcher only repaints between decisions, so during one the
    // screen would still be showing the Hour before.
    try{
      const a = app();
      if (a && window.__leilaoMachine) window.__leilaoMachine.idle(a);
    }catch(e){}
    return root;
  }

  /* ── THE LIVE MACHINE: the mode owns the machine slot ── */
  const FAMILY_ICON = { recarga:"energy", paradoxo:"paradox", viagem:"travel",
    defesa:"seal2", boom:"booms", especial:"cog" };
  const FAMILY_CLS = { recarga:"fn-recharge", paradoxo:"fn-paradox",
    viagem:"fn-travel", defesa:"fn-recharge", boom:"fn-paradox",
    especial:"fn-travel" };
  const EFF_ICON = { energy:"energy", gold:"gold", boom:"booms",
    century:"travel", damage:"paradox", shield:"seal2", charge:"lantern",
    burn_for_energy:"recycle", burn_for_gold_half:"recycle",
    reflect:"seal2", piece_charge:"lantern", release_piece:"energy",
    release_valve_double:"energy", energy_hour_half:"energy",
    gold_hour_half:"gold", drain_gold_richer:"gold", seed_gold:"plant",
    ripen:"plant", burn_all_present:"paradox", convert:"gold",
    parity:"energy", echo_left:"cog", membrane:"seal2", seal_break:"cog",
    cost_gold:"gold", cost_boom:"booms" };
  /* A GLYPH THIS PHASE ADDED MUST NOT DEPEND ON A FRESH icons.js. That file is
     an ES module imported without a version query by four other files, so the
     browser is free to serve a cached copy on a normal reload while THIS file,
     which is versioned, arrives new. When that happens the helper below
     returned an empty string and a shield house rendered as an empty box: a
     cache turning into what looks exactly like a drawing bug. The auction
     carries its own copy of what the auction added. */
  const OWN_ICONS = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M12 2.6l7.4 2.8v6.1c0 4.6-3.1 8.2-7.4 9.9-4.3-1.7-7.4-5.3'
      + '-7.4-9.9V5.4z"/><path d="M12 6.4l4.1 1.6v3.4c0 2.6-1.7 4.6-4.1 5.6'
      + '-2.4-1-4.1-3-4.1-5.6V8z" opacity=".45"/></svg>' };
  function ic(name){
    try {
      const s = window.__icons.icon(name);
      if (s) return s;
    } catch(e){}
    return OWN_ICONS[name] || "";
  }
  function selfLeilao(app){
    const t = app.view && app.view.travelers
      && app.view.travelers.find(x => x.is_self);
    return t && t.leilao ? t.leilao : null;
  }
  function houseOf(row, col, fn){
    // the effective house at (row,col): parasite > coupler > the function's
    const baseW = fn ? fn.modules.length : 0;
    const pid = row.parasites ? (row.parasites[col] ?? row.parasites[String(col)]) : null;
    const mods = (catalog && catalog.modulos) || {};
    if (col >= baseW && row.extra && mods[row.extra])
      return { eff: mods[row.extra].effect, tag: mods[row.extra].name,
               pid: row.extra };
    if (pid && pid !== "incubadora" && mods[pid])
      return { eff: mods[pid].effect, tag: mods[pid].name, pid: pid };
    if (fn && col < baseW)
      return { eff: fn.modules[col],
               tag: pid === "incubadora" ? "+1 " : null };
    return null;
  }
  function liveMatrixEl(app, interactive, allocState, rowsOverride){
    // a decision surface builds from ITS OWN request rows: the paced view can
    // lag behind the installs the same Hour just made
    const L = selfLeilao(app);
    const rowsSrc = rowsOverride || (L ? L.rows : [{},{},{}]);
    const wrap = document.createElement("div");
    wrap.className = "matrix-wrap";
    if (interactive) wrap.dataset.live = "1";
    rowsSrc.forEach((row, r) => {
      const fn = row.funcao && catalog && catalog.funcoes
        ? catalog.funcoes[row.funcao] : null;
      // GLANCE: no name fits in 46px, so the label is a family GLYPH plus
      // width pips. The name belongs to HOVER, the full reading to the panel.
      const lab = document.createElement("div");
      lab.className = "matrix-fnlabel lf-rowlab "
        + (fn ? (FAMILY_CLS[fn.family] || "fn-recharge") : "");
      if (row.sealed) lab.classList.add("fn-sealed");
      lab.dataset.r = r;
      const w = row.width || 0;
      lab.innerHTML = fn
        ? '<span class="lf-fglyph">' + ic(FAMILY_ICON[fn.family] || "cog")
          + "</span>"
          + '<span class="lf-wpips">'
          + [0,1,2].map(i => '<i class="' + (i < w ? "on" : "") + '"></i>').join("")
          + "</span>"
        : '<span class="lf-fglyph lf-fempty">' + ic("machine") + "</span>";
      wrap.appendChild(lab);
      for (let c = 0; c < 3; c++){
        const cell = document.createElement("div");
        cell.className = "cell"
          + (fn ? " lf-fam-" + (fn.family || "recarga") : "");
        cell.dataset.r = r; cell.dataset.c = c;
        const width = row.width || 0;
        const live = fn && c < width && !row.sealed;
        if (row.sealed && fn && c < width) cell.classList.add("locked");
        if (!fn || c >= width) cell.classList.add("lf-void");
        const modNum = r * 3 + c + 1;
        cell.innerHTML = '<span class="mod-num">' + modNum + "</span>";
        const house = fn ? houseOf(row, c, fn) : null;
        if (house && house.eff){
          // the socket wears the SAME house the lot card wore at auction, so
          // what you bought and what you own are one picture. The old caption
          // printed the raw data key ("burn for energy") under it; the glyphs
          // carry that now, and only a piece's own NAME still gets words.
          //
          // NOT wrapped in .mod-ico on purpose. That box is the classic game's
          // and the gauntlet pins it to 12px with a 5px caption under it, which
          // is the cage that made these unreadable. The auction house stands on
          // its own inside the cell, so the classic machine keeps its rules and
          // this one gets a body you can actually see.
          cell.innerHTML += houseHTML(house.eff, "lf-insocket", house.pid)
            + (house.tag ? '<span class="lf-tag">' + house.tag + "</span>": "");
          if (house.tag) cell.title = house.tag;
        }
        if (interactive && allocState && live){
          cell.addEventListener("click", () =>
            allocState.onCell(r, c, cell));
        }
        wrap.appendChild(cell);
      }
    });
    // HOVER: the whole reading, raised over the console, never crowding the CRT
    const read = document.createElement("div");
    read.className = "lf-readout";
    wrap.appendChild(read);
    const showRow = ri => {
      const row = rowsSrc[ri] || {};
      const fn = row.funcao && catalog && catalog.funcoes
        ? catalog.funcoes[row.funcao] : null;
      if (!fn){
        read.innerHTML = '<b>EMPTY ROW</b><span>win a function at auction'
          + " and it installs here</span>";
      } else {
        // THE LAST PLACE THE RAW DICT SURVIVED. This hover still printed
        // "energy: die · gold: half" straight off the data, on your OWN
        // machine, after the same dump had been killed on the lot card and in
        // the case. The third depth is not a different language, it is the
        // same house drawn bigger and calmer, with room to breathe.
        const w2 = row.width || 0;
        const houses = [];
        for (let c = 0; c < w2; c++){
          const h = houseOf(row, c, fn);
          houses.push('<i>' + (c+1) + "</i>"
            + (h && h.eff ? houseHTML(h.eff, null, h.pid)
              : '<em class="lf-idle">idle</em>')
            + (h && h.tag ? '<em class="lf-rtag">' + h.tag + "</em>": ""));
        }
        read.innerHTML = "<b>" + fn.name + (row.sealed ? " · SEALED" : "")
          + "</b>" + houses.map(h => "<span>" + h + "</span>").join("");
      }
      read.classList.add("on");
    };
    wrap.addEventListener("mouseover", e => {
      const t = e.target.closest("[data-r]");
      if (t) showRow(parseInt(t.dataset.r, 10));
    });
    wrap.addEventListener("mouseleave", () => read.classList.remove("on"));
    return wrap;
  }

  window.__leilaoMachine = {
    idle(app){
      if (deviceFace) return deviceFace.crt();
      const body = app.dom && app.dom.machine;
      if (!body) return;
      const L = selfLeilao(app);
      const sig = JSON.stringify(L && L.rows);
      if (body.dataset.lfSig === sig && body.querySelector(".matrix-wrap"))
        return;
      body.dataset.lfSig = sig;
      body.innerHTML = "";
      body.appendChild(liveMatrixEl(app, false, null));
      try{ window.__cabinPulse && window.__cabinPulse(); }catch(e){}
    },
    dice(app){
      // the CLASSIC cockpit, not an invention: gen column + the device's own
      // escape valve + vitals, so the cabin's layout and keys just work
      if (deviceFace) return deviceFace.tray();
      const body = app.dom && app.dom.dice;
      if (!body) return;
      const L = selfLeilao(app);
      body.innerHTML = "";
      const cols = mk("div", "dice-cols");
      const gcol = mk("div", "dice-col gen-col");
      gcol.appendChild(mk("div", "dice-pool-label", "Generators"));
      const gens = L && Array.isArray(L.generators) ? L.generators : [];
      if (gens.length){
        const pool = mk("div", "dice-pool");
        gens.forEach(gid => pool.appendChild(genDieEl(gid, null, {static:true})));
        gcol.appendChild(pool);
      } else {
        gcol.appendChild(mk("div", "dice-idle",
          "No generators yet, win them at auction."));
      }
      cols.appendChild(gcol);
      try{ cols.appendChild(app._escapeColEl(false)); }catch(e){}
      try{ cols.appendChild(app._vitalsColEl()); }catch(e){}
      body.appendChild(cols);
      if (app.dom.diceMeta) app.dom.diceMeta.textContent = "";
      try{ window.__cabinPulse && window.__cabinPulse(); }catch(e){}
    },
  };

  function mk(tag, cls, text){
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text) d.textContent = text;
    return d;
  }
  // a generator as the classic die: roman face when rolled, kind-tinted ring;
  // quantum shows "?" until the machine decides
  /* THE GENERATORS ARE NOT COLOURED TILES, THEY ARE THINGS THAT DO SOMETHING.
     A class must read at a GLANCE by what it DOES, never by a legend:
       blessed  a warm halo that breathes and throws sparks
       cursed   a NEGATIVE glow, light bending inward, paradox violet
       quantum  the face cannot decide: numerals flicker, the body jitters
       cracked  a real fracture across the face, a chipped corner
       stable   a banded steel collar, dead calm, nothing moves
       big      physically bigger and heavier (size is power, like row width)
     Nothing here is ever fully still. */
  function genDieEl(gid, rolled, opts){
    const g = catalog && catalog.geradores && catalog.geradores[gid];
    const kind = (g && g.kind) || (rolled && rolled.kind) || "natural";
    const base = String(gid || (rolled && rolled.id) || "").split("#")[0];
    // THE CLASS MUST NAME THE PIECE, NOT ONLY ITS FAMILY. cls used to be the
    // KIND for anything non-natural, so it could only ever be cursed, blessed,
    // quantum or big. Every test and every rule written against an ID was
    // therefore dead: the blessed halo and sparks, the cursed negative glow,
    // and the extra size of the two big dice never rendered once. Only the hue
    // worked, because the hue reads kind. Both names go on now, so selectors
    // in either dialect land.
    const cls = base || kind || "comum";
    const d = document.createElement("div");
    d.className = "die lf-die2 lf-g-" + cls
      + (kind && kind !== cls ? " lf-g-" + kind: "")
      + ((opts && opts.static) ? " static": "");
    // o id do proprio dado, para o martelo saber qual ele quebrou
    if (gid) d.dataset.gid = String(gid);
    const v = rolled ? rolled.value: null;
    d.dataset.v = v == null ? "?": String(v);
    const rom = n => ["","I","II","III","IV","V","VI"][n] || String(n);
    // IN A LOT, A DIE'S IDENTITY IS ITS RANGE, not the value it happens to
    // show. Unrolled every die read "?", so a Comum (1-2-3), a Rachado (1-1-2)
    // and a Bruto (1-2-3-4) were the same box and two lots that differed only
    // by their die could not be told apart. Catalogue mode prints the best
    // face it can reach: bigger numeral, better die. The classes that have no
    // faces at all keep "?", and there the mark finally means something.
    const faces = (g && g.faces) || [];
    const face = (opts && opts.catalogue)
      ? (faces.length ? rom(Math.max.apply(null, faces)): "?")
        : (v == null ? "?": rom(v));
    if (opts && opts.catalogue && faces.length)
      d.dataset.faces = faces.length;
    d.style.setProperty("--gen", GEN_HUE[kind] || GEN_HUE.natural);
    let art = "";
    if (cls === "rachado")
      art = '<svg class="lf-die-art" viewBox="0 0 34 34" aria-hidden="true">'
        + '<path d="M23 -1 L18 9 L24 13 L15 21 L19 26 L12 35" fill="none"'
        + ' stroke="#14110c" stroke-width="1.6" stroke-linejoin="round"'
        + ' opacity=".72"/>'
        + '<path d="M34 24 L27 27 L28 34" fill="none" stroke="#14110c"'
        + ' stroke-width="1.2" opacity=".5"/></svg>';
    if (cls === "estavel")
      art = '<svg class="lf-die-art" viewBox="0 0 34 34" aria-hidden="true">'
        + '<rect x="1.5" y="1.5" width="31" height="31" rx="6" fill="none"'
        + ' stroke="#e8f5ea" stroke-width="2" opacity=".55"/>'
        + '<circle cx="4.5" cy="4.5" r="1.2" fill="#e8f5ea" opacity=".8"/>'
        + '<circle cx="29.5" cy="4.5" r="1.2" fill="#e8f5ea" opacity=".8"/>'
        + '<circle cx="4.5" cy="29.5" r="1.2" fill="#e8f5ea" opacity=".8"/>'
        + '<circle cx="29.5" cy="29.5" r="1.2" fill="#e8f5ea" opacity=".8"/></svg>';
    // O LOSANGO E O PENTAGONO: a silhueta ja vem do clip-path, aqui entram o
    // aro (que o recorte comeria se fosse box-shadow) e a marca que CONTA as
    // faces: quatro rebites nas pontas do Bruto, cinco facetas no Tita.
    if (cls === "bruto")
      art = '<svg class="lf-edge" viewBox="0 0 40 40" preserveAspectRatio="none"'
        + ' aria-hidden="true"><polygon points="20,0.8 39.2,20 20,39.2 0.8,20"'
        + '/></svg>'
        + '<span class="lf-rivet v1"></span><span class="lf-rivet v2"></span>'
        + '<span class="lf-rivet v3"></span><span class="lf-rivet v4"></span>';
    if (cls === "tita")
      art = '<svg class="lf-edge" viewBox="0 0 40 40" preserveAspectRatio="none"'
        + ' aria-hidden="true">'
        + '<polygon points="20,0.8 39.2,15.4 32,39.2 8,39.2 0.8,15.4"/></svg>'
        + '<svg class="lf-facet" viewBox="0 0 40 40" preserveAspectRatio="none"'
        + ' aria-hidden="true">'
        + '<line x1="20" y1="20" x2="20" y2="1"/>'
        + '<line x1="20" y1="20" x2="39" y2="15.4"/>'
        + '<line x1="20" y1="20" x2="32" y2="39"/>'
        + '<line x1="20" y1="20" x2="8" y2="39"/>'
        + '<line x1="20" y1="20" x2="1" y2="15.4"/></svg>';
    // A CRUZ E O PENTAGRAMA. Os dois sao um espelho na regra (um sempre casa,
    // o outro nunca casa), entao no corpo eles tambem sao um espelho: o mesmo
    // circulo, a mesma espessura, um sinal para cima e um sinal para baixo.
    if (cls === "abencoado")
      art = '<svg class="lf-die-art lf-sigil-holy" viewBox="0 0 34 34"'
        + ' aria-hidden="true">'
        + '<circle cx="17" cy="17" r="11.5" fill="none" stroke-width="1.1"'
        + ' opacity=".55"/>'
        + '<path d="M17 4.5 L17 29 M10.5 11.5 L23.5 11.5" fill="none"'
        + ' stroke-width="2.6" stroke-linecap="round"/></svg>'
        + '<span class="lf-mote m1"></span><span class="lf-mote m2"></span>'
        + '<span class="lf-mote m3"></span><span class="lf-mote m4"></span>';
    if (cls === "amaldicoado")
      art = '<span class="lf-void2"></span>'
        // pentagrama invertido, tracado de um golpe: 0-2-4-1-3, ponta para baixo
        + '<svg class="lf-die-art lf-sigil-hell" viewBox="0 0 34 34"'
        + ' aria-hidden="true">'
        + '<circle cx="17" cy="17" r="11.5" fill="none" stroke-width="1.1"'
        + ' opacity=".6"/>'
        + '<path d="M17 28.5 L23.46 8.6 L6.54 20.9 L27.46 20.9 L10.54 8.6 Z"'
        + ' fill="none" stroke-width="1.5" stroke-linejoin="round"/></svg>'
        + '<span class="lf-ember e1"></span><span class="lf-ember e2"></span>'
        + '<span class="lf-ember e3"></span><span class="lf-ember e4"></span>';
    // O QUANTICO ESTA CALCULANDO. Ele nao tem valor ate a maquina decidir, e
    // ao ser alocado copia o dado do lado. Entao ele nao mostra um numeral
    // fantasma: mostra a CONTA correndo, preto e verde, e so para quando a
    // celula o resolve. `is-solved` sai no dado ja colocado, com valor.
    if (cls === "quantico" || cls === "quantum"){
      art = '<span class="lf-qrain"><i>I</i><i>V</i><i>II</i><i>III</i>'
        + '<i>I</i><i>IV</i><i>II</i><i>V</i><i>III</i><i>I</i></span>'
        + '<span class="lf-qrain r2"><i>III</i><i>I</i><i>V</i><i>II</i>'
        + '<i>IV</i><i>III</i><i>I</i><i>II</i><i>V</i><i>I</i></span>'
        + '<span class="lf-qscan"></span>';
      if (v != null) d.classList.add("is-solved");
    }
    d.innerHTML = art + '<span class="pips-face">' + face + "</span>";
    d.title = g ? g.name : (rolled ? pieceName(rolled.id) : gid);
    return d;
  }

  // the proof hook: build a real die of any class through the REAL path, so
  // what I check on screen is what the game deals
  window.__lfDie = (gid, value) => genDieEl(gid, { id:gid, value:value,
    kind:(catalog && catalog.geradores && catalog.geradores[gid]
      ? catalog.geradores[gid].kind: "natural") }, {});

  /* THE PROOF SHEET for the generators. Every die the auction can deal, built
     through the same genDieEl the tray calls, rolled and unrolled, on the dark
     ground the tray gives them. A class has to be readable by what it DOES,
     and this is the only way to judge eight of them against each other instead
     of one at a time. window.__lfDice() opens it, calling again closes it. */
  window.__lfDice = () => {
    const old = document.getElementById("lf-dproof");
    if (old){ old.remove(); return "closed"; }
    const c = catalog || {};
    const ids = Object.keys(c.geradores || {});
    if (!ids.length) return "catalog not loaded yet: enter an auction room first";
    const sheet = document.createElement("div");
    sheet.id = "lf-dproof";
    sheet.innerHTML = "<h3>THE GENERATORS &middot; " + ids.length
      + " classes</h3><div class='lf-drow lf-dhead'><em></em>"
      + "<span>in the lot (its range)</span><span>unrolled</span>"
      + "<span>rolled I</span><span>rolled II</span><span>rolled III</span>"
      + "</div>";
    ids.forEach(id => {
      const g = c.geradores[id];
      const row = document.createElement("div");
      row.className = "lf-drow";
      row.innerHTML = "<em>" + g.name + "<b>" + (g.faces.length
        ? g.faces.join(" "): "no faces") + "</b></em>";
      [["catalogue"], [null], [1], [2], [3]].forEach(([v]) => {
        const cell = document.createElement("span");
        try{
          cell.appendChild(v === "catalogue"
            ? genDieEl(id, null, { static:true, catalogue:true })
              : genDieEl(id, v == null ? null
                : { id:id, value:v, kind:g.kind }, { static:true }));
        }catch(e){ cell.textContent = "!"; }
        row.appendChild(cell);
      });
      sheet.appendChild(row);
    });
    document.body.appendChild(sheet);
    return ids.length + " generators drawn";
  };

  /* THE PROOF SHEET for the house grammar. Every function in the catalogue,
     house by house, built through the REAL houseHTML the game calls, and
     mounted INSIDE the auction zone so it renders under the same CSS laws the
     lot cards live under. A sheet in an empty corner lies: the same cell paints
     differently inside the console. Call window.__lfHouses() in the console;
     call it again to close. */
  window.__lfHouses = () => {
    const old = document.getElementById("lf-proof");
    if (old){ old.remove(); return "closed"; }
    const c = catalog || {};
    const fns = Object.values(c.funcoes || {});
    if (!fns.length) return "catalog not loaded yet: enter an auction room first";
    const gaps = new Set();
    Object.values(c.funcoes || {})
      .concat(Object.values(c.modulos || {})
        .map(m => ({ modules:[m.effect], pid:m.id })))
      .concat(Object.values(c.suprimentos || {})
        .map(x => ({ modules:[x.effect] })))
      .forEach(f => (f.modules || []).forEach(e => {
        Object.keys(e || {}).forEach(k => {
          if (!MODIFIER.has(k) && !RES_ICON[k] && !NAMED_ICON[k] && !FORK[k])
            gaps.add(k);
        });
        // the hole this sheet used to share with the test: a house whose keys
        // are ALL modifiers has no key left to be faceless with, so it slipped
        // past both and drew a red `?` on a piece that works.
        const left = Object.keys(e || {}).filter(k => !MODIFIER.has(k));
        if (!left.length && !PIECE_FACE[f.pid]) gaps.add(f.pid || "(empty)");
      }));
    const byFam = {};
    fns.forEach(f => (byFam[f.family || "?"] = byFam[f.family || "?"] || []).push(f));
    const sheet = document.createElement("div");
    sheet.id = "lf-proof";
    sheet.innerHTML =
      "<h3>THE HOUSE GRAMMAR &middot; " + fns.length + " functions</h3>"
      + '<div class="lf-pkey">'
      + ["die (the silence)", "half", "die+2", "double", "flat 3"]
          .map((lbl, i) => '<span>' + houseHTML(
            { energy: ["die","half","die+2","double",3][i] }) + lbl + "</span>")
          .join("")
      + '<span>' + houseHTML({ damage:"die", direction:"future" })
      + "paradox, aimed</span>"
      + '<span>' + houseHTML({ energy:"die", gold:"half" }) + "a pair</span>"
      + "</div>"
      + '<div class="lf-phead"><em></em><span>ON PAPER (the hall)</span>'
      + "<span>ON THE SCREEN (the machine)</span></div>"
      + '<div class="lf-pcols">'
      + Object.entries(byFam).map(([fam, list]) =>
          '<div class="lf-pfam"><b>' + fam + "</b>"
          + list.map(f => '<div class="lf-prow"><em>' + f.name + "</em>"
              + '<span class="lf-strip">'
              + f.modules.map(e => houseHTML(e)).join("") + "</span>"
              // the SAME houses on the tube, under the family's own glass, so
              // the two materials are judged together instead of one at a time
              + '<span class="lf-pcrt lf-fam-' + (f.family || "recarga")
              + '">'
              + f.modules.map(e => houseHTML(e, "lf-insocket")).join("")
              + "</span></div>").join("")
          + "</div>").join("")
      + "</div>"
      + (function(){
          const sup = Object.values(c.suprimentos || {});
          if (!sup.length) return "";
          return '<div class="lf-pfam"><b>suprimentos</b>'
            + sup.map(x => '<div class="lf-prow"><em>' + x.name + "</em>"
                + '<span class="lf-strip">' + houseHTML(x.effect) + "</span>"
                + '<span class="lf-pcrt lf-pneutral">'
                + houseHTML(x.effect, "lf-insocket") + "</span></div>").join("")
            + "</div>";
        })()
      // the MODULES, which this sheet never showed. Both of the night's red
      // gaps lived here and the sheet said "every effect has a face" while
      // they sat on the machine drawing `?`.
      + (function(){
          const md = Object.values(c.modulos || {});
          if (!md.length) return "";
          const byKind = {};
          md.forEach(m => (byKind[m.kind] = byKind[m.kind] || []).push(m));
          return Object.entries(byKind).map(([kind, list]) =>
            '<div class="lf-pfam"><b>' + kind + "</b>"
            + list.map(m => '<div class="lf-prow"><em>' + m.name + "</em>"
                + '<span class="lf-strip">'
                + houseHTML(m.effect, "lf-mod", m.id) + "</span>"
                + '<span class="lf-pcrt lf-pneutral">'
                + houseHTML(m.effect, "lf-insocket", m.id)
                + "</span></div>").join("")
            + "</div>").join("");
        })()
      + (gaps.size
          ? '<p class="lf-pgap">no face yet (' + gaps.size + "): "
            + [...gaps].join(", ") + "</p>"
            : '<p class="lf-pgap ok">every effect has a face</p>');
    // ON THE BODY, not in the market zone. #cam.cam-world carries a transform,
    // and a transformed ancestor turns position:fixed into position:absolute
    // against itself: the sheet came out shrunk, offset and clipped. The cells
    // still build through the real path and wear their real family classes,
    // which are the only local laws that reach them (app.css does not know
    // .lf-mcell at all, checked).
    document.body.appendChild(sheet);
    return fns.length + " functions drawn · " + gaps.size + " effects still faceless";
  };

  /* ── allocation on the live machine ── */
  function mountAllocate(req){
    const a = app();
    // the machine lives on your arm at the desk
    try{
      if (a && a.camera && a.camera.setScene) a.camera.setScene("main");
    }catch(e){}
    const o = req.options || {};
    const dice = (req.private && req.private.dice) || [];
    const rows = o.rows || [];
    const valveSlots = o.valve_slots || 1;
    const placed = {};                 // die index -> "r,c" | "valve"
    let selected = null;

    const rowState = ri => {
      const st = { cursed:null, value:null };
      Object.entries(placed).forEach(([i,key])=>{
        if (key==="valve" || parseInt(key.split(",")[0])!==ri) return;
        const d = dice[parseInt(i)];
        st.cursed = d.kind==="cursed";
        if (d.value!=null && !st.cursed) st.value = d.value;
      });
      return st;
    };
    const dieLegal = (i,ri,ci) => {
      const r = rows[ri];
      if (!r || !r.funcao || r.sealed || ci>=r.width) return false;
      if (Object.values(placed).includes(ri+","+ci)) return false;
      const die = dice[i];
      const st = rowState(ri);
      const isCursed = die.kind==="cursed";
      if (st.cursed!=null && st.cursed!==isCursed) return false;
      if (!isCursed && die.value!=null && st.value!=null
          && st.value!==die.value) return false;
      return true;
    };
    const cellLegal = (ri,ci) =>
      selected!=null && dieLegal(selected,ri,ci);
    // a die with no socket left (rows sealed/full, valve full) cannot hold the
    // hour hostage: the engine discards leftovers, so the button must open
    const anyMoveLeft = () => dice.some((d,i)=>{
      if (placed[i]!=null) return false;
      if (valveCount()<valveSlots) return true;
      for (let ri=0;ri<3;ri++) for (let ci=0;ci<3;ci++)
        if (dieLegal(i,ri,ci)) return true;
      return false;
    });
    const valveCount = () =>
      Object.values(placed).filter(k=>k==="valve").length;

    window.__lfDbg = { cells: [], sel: () => selected, placed };
    const allocState = {
      onCell(ri, ci, cell){
        const ok = cellLegal(ri, ci);
        window.__lfDbg.cells.push({ ri, ci, ok, sel: selected });
        if (!ok) { snd("whiff"); return; }
        placed[selected] = ri+","+ci;
        selected = null;
        snd("place");
        render();
      },
    };

    function render(){
      const done = Object.keys(placed).length === dice.length
        || !anyMoveLeft();
      /* ══ O DADO SEM ONDE ENTRAR ═══════════════════════════════════════════
         Se nenhuma linha sua tem funcao, nenhum modulo aceita dado. A guarda
         acima ainda diz que "ha jogada", e diz certo: sempre da para despejar
         o dado na valvula. So que a tela nao contava isso em lugar nenhum.
         O jogador via um dado, nove modulos mortos e um botao apagado, e a
         unica conclusao possivel era que o jogo tinha quebrado. E a conclusao certa,
         porque a informacao nao existia.
         Agora a sala fala: a valvula chama, e a HELA diz por que. */
      const semSoquete = dice.some((d, i) => {
        if (placed[i] != null) return false;
        for (let ri = 0; ri < 3; ri++)
          for (let ci = 0; ci < 3; ci++) if (dieLegal(i, ri, ci)) return false;
        return true;
      }) && Object.keys(placed).length < dice.length;
      document.body.classList.toggle("lf-sem-soquete", semSoquete);
      if (semSoquete && !mountAllocate._avisou){
        mountAllocate._avisou = true;
        try { if (a && a.helaSay) a.helaSay(
          "No module can take that die: <b>no function is installed</b>. "
          + "Vent it through the escape valve, or the Hour cannot close.",
          5200); } catch(e){}
      }
      if (!semSoquete) mountAllocate._avisou = false;
      // the MACHINE itself is the allocation surface
      const body = a.dom.machine;
      body.dataset.lfSig = "";
      body.innerHTML = "";
      const wrap = liveMatrixEl(a, true, allocState, rows);
      // dress placed dice + legality onto the live matrix
      Object.entries(placed).forEach(([i,key])=>{
        if (key==="valve") return;
        const [ri,ci] = key.split(",");
        const cell = wrap.querySelector(
          '.cell[data-r="'+ri+'"][data-c="'+ci+'"]');
        if (cell){
          const d = dice[parseInt(i)];
          cell.classList.add("filled");
          cell.innerHTML = '<span class="mod-num">'
            + (parseInt(ri)*3+parseInt(ci)+1) + "</span>";
          const die = genDieEl(d.id, d, {static:true});
          die.classList.add("placed");
          die.addEventListener("click", (e)=>{
            e.stopPropagation();
            delete placed[i];
            snd("lift");
            render();
          });
          cell.appendChild(die);
        }
      });
      if (selected!=null){
        for (let ri=0; ri<3; ri++) for (let ci=0; ci<3; ci++){
          if (cellLegal(ri,ci)){
            const cell = wrap.querySelector(
              '.cell[data-r="'+ri+'"][data-c="'+ci+'"]');
            if (cell) cell.classList.add("lf-legal");
          }
        }
      }
      body.appendChild(wrap);
      // the cockpit is the CLASSIC one: gen pool + Clear/Confirm actions,
      // the device's escape valve column, the vitals; the pip-boy's physical
      // CLR/CONFIRM keys press these same buttons
      const dbody = a.dom.dice;
      dbody.innerHTML = "";
      if (a.dom.diceMeta)
        a.dom.diceMeta.textContent =
          Object.keys(placed).length + "/" + dice.length + " placed";
      const cols = mk("div", "dice-cols");
      const gcol = mk("div", "dice-col gen-col");
      gcol.appendChild(mk("div", "dice-pool-label", "Generators"));
      const unplaced = dice.map((d,i)=>i).filter(i => placed[i]==null);
      const pool = mk("div", "dice-pool" + (unplaced.length ? "" : " empty"));
      unplaced.forEach(i => {
        const d = dice[i];
        const die = genDieEl(d.id, d, {});
        if (selected === i) die.classList.add("selected");
        die.addEventListener("click", (e)=>{
          e.stopPropagation();
          selected = selected===i ? null : i;
          snd("lift");
          render();
        });
        pool.appendChild(die);
      });
      if (!unplaced.length)
        pool.appendChild(mk("div", "muted small", "All placed, confirm."));
      else if (done)
        pool.appendChild(mk("div", "muted small", "No socket left, confirm."));
      gcol.appendChild(pool);
      const actions = mk("div", "dice-actions");
      const clear = mk("button", "btn btn-ghost btn-sm", "Clear");
      clear.addEventListener("click", ()=>{
        Object.keys(placed).forEach(k => delete placed[k]);
        selected = null;
        render();
      });
      const confirm = mk("button", "btn btn-primary btn-sm", "Confirm");
      confirm.id = "confirm-alloc";
      confirm.disabled = !done;
      confirm.addEventListener("click", ()=>{
        if (confirm.disabled) return;
        const cells = {};
        const valves = [];
        Object.entries(placed).forEach(([i,k])=>{
          if (k==="valve") valves.push(parseInt(i));
          else cells[k] = parseInt(i);
        });
        unmount();
        snd("confirm");
        a.respond({ cells, valve: valves.length? valves : null });
        setTimeout(()=>{ try{
          window.__leilaoMachine.idle(a);
          window.__leilaoMachine.dice(a);
        }catch(e){} }, 200);
      });
      actions.appendChild(clear); actions.appendChild(confirm);
      gcol.appendChild(actions);
      cols.appendChild(gcol);
      // the ESCAPE VALVE is the device's own vent: drop a die to feed it
      const vcol = mk("div", "dice-col escape-col");
      vcol.appendChild(mk("div", "dice-pool-label", "Escape valve"));
      const vfree = valveCount() < valveSlots;
      const esc = mk("div", "escape-slot venom" + (vfree ? "" : " disabled"));
      esc.innerHTML = '<span class="ev-gear ev-gear-a"></span>'
        + '<span class="ev-gear ev-gear-b"></span><span class="ev-venom"></span>';
      const ring = mk("div", "heat-ring");
      const drop = mk("div", "escape-drop");
      Object.entries(placed).forEach(([i,k])=>{
        if (k==="valve") drop.appendChild(genDieEl(dice[i].id, dice[i], {static:true}));
      });
      drop.addEventListener("click", ()=>{
        if (selected==null || !vfree) return;
        placed[selected] = "valve";
        selected = null;
        snd("socket");
        render();
      });
      ring.appendChild(drop);
      esc.appendChild(ring);
      // ══ A VALVULA GANHA CORPO ══════════════════════════════════════════
      // Ela era a peca com menos tela de toda a fase: uma linha de texto,
      // "Valve 1/1 · charge 4/10", numa fase que virou inteira iconografica.
      // Pior: essa linha so existia enquanto voce alocava, entao fora dali
      // ninguem sabia quanto faltava para a recompensa, e a valvula e
      // justamente a peca que acumula e paga.
      // Agora ela e um manometro: os soquetes dela como marcas cheias ou
      // vazias, e a carga como uma COLUNA que sobe, com o tique do limiar
      // marcado. Voce le "esta quase" sem contar algarismo nenhum.
      const vL = selfLeilao(a);
      const vch = vL ? (vL.valve.charge | 0): 0;
      const vth = vL ? Math.max(1, vL.valve.threshold | 0): 10;
      const vpc = Math.max(0, Math.min(100, (vch / vth) * 100));
      const gauge = mk("div", "lf-vgauge");
      let pips = "";
      for (let i = 0; i < valveSlots; i++)
        pips += '<i class="' + (i < valveCount() ? "on": "") + '"></i>';
      gauge.innerHTML =
        '<span class="lf-vpips">' + pips + "</span>"
        + '<span class="lf-vtube"><b style="height:' + vpc.toFixed(1)
        + '%"></b><s></s></span>';
      gauge.title = "Valve " + valveCount() + "/" + valveSlots
        + " · charge " + vch + "/" + vth;
      esc.appendChild(mk("div", "esc-text")).appendChild(gauge);
      vcol.appendChild(esc);
      cols.appendChild(vcol);
      try{ cols.appendChild(a._vitalsColEl()); }catch(e){}
      dbody.appendChild(cols);
      try{ window.__cabinPulse && window.__cabinPulse(); }catch(e){}
    }
    render();
    // a marker layer so the poll knows this decision is being surfaced
    const root = layer();
    root.dataset.kind = "allocate";
    return root;
  }

  /* ── aim: the MACHINE aims, so the device takes it, the CRT names the
     act, three keys on the tray choose the direction ── */
  function mountAim(req){
    const root = layer();
    root.dataset.kind = "aim";
    const t = (req.options||{}).targets || {};
    try{
      const g = app();
      if (g && g.camera && g.camera.setScene) g.camera.setScene("main");
    }catch(e){}
    function paintCRT(){
      const a = app();
      const body = a && a.dom && a.dom.machine;
      if (!body) return;
      if (body.dataset.lfSig === "aim") return;
      body.dataset.lfSig = "aim";
      body.innerHTML = "";
      const crt = mk("div", "lf-crt");
      crt.innerHTML = '<span class="lf-crt-lot">AIM THE PARADOX</span>'
        + '<b class="lf-crt-amt lf-crt-aim">☄</b>'
        + '<span class="lf-crt-sub">choose a direction on the tray</span>';
      body.appendChild(crt);
    }
    function paintTray(){
      const a = app();
      const dbody = a && a.dom && a.dom.dice;
      if (!dbody) return;
      dbody.innerHTML = "";
      if (a.dom.diceMeta) a.dom.diceMeta.textContent = "";
      const row = mk("div", "lf-aimrow");
      ["past","present","future"].forEach(d => {
        const b2 = mk("button", "lf-aimkey", "");
        b2.type = "button";
        b2.innerHTML = "<b>" + d.toUpperCase() + "</b>"
          + "<span>" + (t[d]||0) + " in range</span>";
        b2.addEventListener("click", () => {
          const g = app();
          unmount();
          snd("paradox");
          g.respond({ direction: d });
        });
        row.appendChild(b2);
      });
      dbody.appendChild(row);
      try{ window.__cabinPulse && window.__cabinPulse(); }catch(e){}
    }
    deviceFace = { crt: paintCRT, tray: paintTray };
    paintCRT(); paintTray();
    return root;
  }

  /* ── THE CEREMONY. The auction resolves in secret and the table deserves
     to SEE it: the winning card is stamped and flies to its owner, a tie
     shakes the card and sends it back to the floor, the sealed lot that
     nobody agreed on burns. Balatro's law: hide the outcome, dramatize the
     resolution. ── */
  function hallCard(lotId){
    // BY ITS ID, NEVER BY ITS TITLE. This used to find the card by matching the
    // text of its <h4> against a name registry. The lot card lost its <h4> the
    // night the lot became its pieces, so the lookup started returning null for
    // every lot and the whole ceremony (won, tied, burnt) stopped firing without
    // a single error. A card is identified by what it IS, not by what it reads.
    const house = document.querySelector(".lf-house");
    if (!house || lotId == null) return null;
    return house.querySelector('.lf-box[data-lot="' + lotId + '"]');
  }
  function seatTint(name){
    try{ return window.__seatColor ? window.__seatColor(name) : "#c9a45c"; }
    catch(e){ return "#c9a45c"; }
  }
  window.__lfEvent = function(kind, p){
    const house = document.querySelector(".lf-house");
    if (!house || !p) return;
    // A MESA FECHANDO EM VOLTA. O servidor avisa assento por assento assim
    // que cada um responde o pregao, e so o assento: o numero continua dentro
    // do envelope. O disco de cera daquele cracha acende na hora.
    if (kind === "leilao_sealed" && p.seat){
      window.__lfSealed = window.__lfSealed || {};
      window.__lfSealed[p.seat] = true;
      house.querySelectorAll(".lf-plate2").forEach(el => {
        if ((el.textContent || "").indexOf(p.seat) === 0)
          el.classList.add("is-sealed");
      });
      return;
    }
    if (kind === "leilao_event" && p.type === "lot_won"){
      const card = hallCard(p.lot);
      if (!card) return;
      const mine = app() && p.player === app().seat;
      card.classList.add("is-won");
      card.style.setProperty("--who", seatTint(p.player));
      const tag = document.createElement("span");
      tag.className = "lf-wontag";
      tag.textContent = (mine ? "YOURS" : p.player) + " · " + p.paid;
      card.appendChild(tag);
      snd(mine ? "confirm" : "socket");
    }
    if (kind === "leilao_event" && p.type === "lot_tied"){
      const card = hallCard(p.lot);
      if (!card) return;
      card.classList.remove("lf-shake"); void card.offsetWidth;
      card.classList.add("lf-shake");
      snd("whiff");
    }
    if (kind === "leilao_event" && p.type === "secret_vanished"){
      // the same title-matching trap as hallCard: the sealed lot is the card
      // that HOLDS the sealed piece, not the card whose heading reads a phrase
      const card = house.querySelector(".lf-box:has(.lf-piece.is-sealed)")
        || [...house.querySelectorAll(".lf-box")]
             .find(c => c.querySelector(".lf-piece.is-sealed"));
      if (card) card.classList.add("is-burnt");
      snd("paradox");
    }
  };

  /* Gancho de prova: montar uma superficie com um pedido sintetico. Existe
     porque a fase de consumo so nasce depois de uma rodada inteira de leilao
     com o assento ganhando lote, e isso nao cabe no tempo de uma sonda. Sem
     ele a corrente bilhete -> boca -> maquina fica sem prova nenhuma. */
  window.__lfMountSurface = (req) =>
    (SURFACES[req && req.kind] ? SURFACES[req.kind](req) : null);

  const SURFACES = {
    leilao_bid: mountBid,
    leilao_consumo: mountConsumo,
    leilao_allocate: mountAllocate,
    leilao_aim: mountAim,
  };

  /* ── reading the rivals: each badge's lower floor shows the RIG they
     actually built at auction (rows are public; volumes stay secret) ── */
  const FAMILY_HEX = { recarga:"#5fd08a", paradoxo:"#b98ae8",
    viagem:"#6fc3e0", defesa:"#5fd08a", boom:"#b98ae8", especial:"#6fc3e0" };
  function rigSig(L){
    // A SIGNATURE THAT CANNOT SEE A CHANGE FREEZES THE DRAWING. This one read
    // function, width and seal, so a rival who grafted a PARASITE kept the old
    // rig on screen forever: a parasite changes no width and no name. The dice
    // are here for the same reason, now that the rig draws them.
    return (L.rows||[]).map(r =>
      (r.funcao||"-")+":"+(r.width||0)+(r.sealed?"!":"")
      +"/"+(r.extra||"")+"/"
      + Object.keys(r.parasites||{}).sort()
          .map(k => k+"="+r.parasites[k]).join(",")).join("|")
      + "#" + (Array.isArray(L.generators) ? L.generators.join(",")
        : (L.generators||0))
      + "/" + (L.cap||0) + "&" + (L.shield||0);
  }
  /* THE CASE HOLDS WHAT YOU WON. The briefcase art prints EQUIPMENT on its
     base-right recess (x458 y370 in the 800x500 case space); the offers
     bought at auction rest there as filed slips until the case opens. */
  /* WHAT YOU WON STAYS WHERE YOU PUT IT. Between phases the offers still
     rest in the EQUIPMENT compartment, in the same place and the same paper
     the docket uses when the case asks a question. The case stops lying
     about being empty. */
  /* THE SHIELD LIVES ON THE FILE, NOT ON THE LIFETHREAD. It belonged around
     the energy bar and I mounted it there, which meant hanging an absolutely
     positioned bar inside `#vz-holo` and giving that panel a positioning
     context it never had. The lifethread is the classic game's own instrument
     and it came out stretched and moved. Adding the shield was never a licence
     to reshape it: the bar is drawn on a rival's FILE now, which is a surface
     the auction owns, and where the energy lives in this phase is still the
     the table's call. */
  const SHIELD_CAP = 10;

  /* ══════════════════════════════════════════════════════════════════════
     O LOTE GANHO VIRA UM VOUCHER DE VERDADE: SEM COMPARTIMENTO PROPRIO

     Tres tentativas erradas antes desta: uma gaveta minha, um envelope, um
     ticket gigante fora de escala. Uma observacao corta o no: A
     MAQUINA DO TEMPO JA TEM UM LEITOR DE VOUCHER, e o estojo ja tem o
     compartimento certo para ele (.ruck-vouchers, o rack VOUCHERS na tampa).

     A armadilha que me fez perder isto duas vezes: `renderRucksack()` faz
     `host.innerHTML = ""` e chama `_ruckVouchers()` DO ZERO a cada
     atualizacao de estado. Injetar o ticket DE FORA, depois que o rack ja
     existe, perde a corrida no proximo tick e o bilhete some ou fica preso
     num estado velho. O conserto certo nao e reagir ao rack: e o rack, ao se
     construir, PERGUNTAR se ha bilhete de leilao para desenhar. Essa pergunta
     mora em `game.js#_ruckVouchers`, que chama `window.__lfLotTickets(me)`
     toda vez que o compartimento e desenhado, nunca desatualiza porque
     nunca existe um instante em que ele nao pergunta.
     ══════════════════════════════════════════════════════════════════════ */
  window.__lfLotTickets = function(me){
    const L = me && me.leilao;
    const held = (L && Array.isArray(L.case)) ? L.case: [];
    if (!held.length) return [];
    const reg = window.__leilaoLots || {};
    const lots = window.__leilaoLotPieces || {};
    // o rack cabe tres nesta altura; o excedente vira contagem no ultimo
    // o que ja foi lido nesta Hora nao se desenha mais
    const lidos = window.__lfLidos || {};
    const queimados = window.__lfQueimados || {};
    const vivos = held.filter(id => !lidos[id] && !queimados[id]);
    if (!vivos.length) return [];
    const show = vivos.slice(-3), extra = vivos.length - show.length;
    return show.map((id, k) => {
      const pieces = lots[id] || [];
      const key = pieces.length ? posterKeyOf(pieces[0]): "especial";
      const P = POSTER[key] || POSTER.especial;
      const isLast = k === show.length - 1;
      return {
        id: id,
        tk: P.ink,
        stub: String(id).replace(/^H/, ""),
        sobra: (isLast && extra > 0) ? extra : 0,
        title: (reg[id] || "an auction lot")
          + ", drag into the machine's ticket slot to install",
        face: ticketFace(pieces, id, P),
      };
    });
  };

  /* ══════════════════════════════════════════════════════════════════════
     A BOCA DA MAQUINA LEU UM BILHETE DE LOTE

     Este e o outro lado do arrasto: `mountTicketDrop` em cabin.js (a boca
     classica, #ticket-drop, que ja engolia SOLO/MARKET/ITEM) reconhece um
     `kind` que comeca com "lot:" e chama esta funcao com o id puro.

     PERDIDA E RESTAURADA: ela morava neste mesmo trecho do arquivo, e some
     junto quando eu apaguei o `decorateCase` inteiro para trocar pelo hook
     de dados, as duas coisas estavam vizinhas, e eu apaguei o vizinho
     errado. `grep -c "__lfUseTicket" == 0` foi o que provou o sumico antes
     de eu reescrever cabin.js e o rack em volta dela: sem esta funcao o
     arrasto tinha metade do caminho (o bilhete saia do rack) e nenhuma
     chegada (nada acontecia ao soltar).

     O que ela faz: se a janela de consumo esta aberta, o docket ativo
     (`.lf-casedock` sem `.is-idle`) tem uma ficha por lote OFERECIDO, com o
     MESMO id que o bilhete no rack. Achar essa ficha e clicar nela e a
     propria instalacao, porque a ficha ja sabe fazer isso sozinha. Fora da
     janela, a maquina avisa em vez de engolir o bilhete em silencio. */
  window.__lfTrilha = [];
  const trilha = (x) => { try { window.__lfTrilha.push(x); } catch(e){} };
  /* ══ QUEIMAR UM BILHETE ═════════════════════════════════════════════════
     O bolso cabe quatro, e a maleta enche. Levar o bilhete de volta para a
     sala do leilao devolve o lote ao Bureau, que e o mesmo gesto de reciclar
     carta no mercado: o jogo ja ensina esse movimento, e ele nao precisava de
     um segundo vocabulario.
     Some do rack na hora e sai da lista de armados, para nao instalar depois
     um lote que voce acabou de jogar fora. */
  window.__lfBurnTicket = function(id){
    try {
      window.__lfLidos = window.__lfLidos || {};
      window.__lfLidos[id] = true;
      window.__lfQueimados = window.__lfQueimados || {};
      window.__lfQueimados[id] = true;
      if (typeof window.__lfDropLot === "function") window.__lfDropLot(id);
      const g = app();
      if (g && g.renderRucksack) g.renderRucksack();
      if (g && g.helaSay) g.helaSay(
        "Back to the Bureau. The case has room again.", 3200);
      snd("recycle");
    } catch(e){
      try { snd("whiff"); } catch(e2){}
    }
    return true;
  };

  window.__lfUseTicket = function(id){
    trilha("useTicket:" + id + " feed=" + (typeof window.__lfFeedLot));
    // A PORTA E A MAQUINA. Antes esta funcao procurava a ficha de papel e
    // clicava nela por baixo dos panos, o que fazia do bilhete um controle
    // remoto do papel. Agora ela arma o lote direto, e o papel virou o que
    // sempre deveria ser: um recibo, quando existe.
    if (typeof window.__lfFeedLot === "function"){
      const dock = document.querySelector(".lf-casedock:not(.is-idle)");
      const offer = dock && dock.querySelector('.lf-offer[data-id="' + id + '"]');
      if (offer){
        offer.classList.remove("lf-fed"); void offer.offsetWidth;
        offer.classList.add("lf-fed");
      }
      try { snd("socket"); } catch(e){}
      window.__lfFeedLot(id);
      return true;
    }
    const dock = document.querySelector(".lf-casedock:not(.is-idle)");
    const offer = dock && dock.querySelector('.lf-offer[data-id="' + id + '"]');
    if (offer){
      if (!offer.classList.contains("is-armed")) offer.click();
      offer.classList.remove("lf-fed"); void offer.offsetWidth;
      offer.classList.add("lf-fed");
      try { snd("socket"); } catch(e){}
      return true;
    }
    try {
      const g = app();
      if (g && g.helaSay) g.helaSay(
        "Nothing to install yet. The reader wakes when the <b>Hour "
        + "closes the auction</b> and the case opens. Your ticket keeps.",
        4200);
      snd("whiff");
    } catch(e){}
    return false;
  };

  /* A FACE DO BILHETE DE LOTE, para o corpo do voucher que ja existe.
     O rack do estojo ja desenha o talao, o picote e a sombra; o que falta e
     o miolo, e o miolo e o cartaz do proprio conteudo, reimpresso deitado no
     tamanho exato do .tkt-body. */
  /* A FACE DO BILHETE: UM TICKET EM MINIATURA, NAO UM CARTAZ ESPREMIDO.
     A primeira versao encolhia o cartaz inteiro (banda, raio de sol, nome,
     slogan, rodape) para 34px de altura, e nessa escala virou ruido: nada
     legivel, so cor gritando. A referencia (ingresso de teatro
     antigo) e mais simples do que um cartaz: uma moldura de friso fino, UM
     emblema pequeno no meio, o titulo numa linha so, e ADMIT ONE correndo
     vertical na quina. E disso que este desenho e feito, na mesma paleta
     da familia, e nada mais. */
  function ticketFace(pieces, id, P0){
    /* O BILHETE E UM ANUNCIO, e nao um icone com legenda. A caixa ja imprime
       a propaganda inteira (tarja com manchete, raio de sol atras do motivo,
       o nome em tarja clara, slogan, rodape da casa) e nao ha motivo nenhum
       para o bilhete falar outra lingua: e o MESMO conteudo, embalado de
       outro jeito.
       Quando o lote traz duas pecas, sao DOIS meios anuncios lado a lado,
       cada um na paleta da sua propria familia. E assim que fica obvio qual
       e a funcao e qual e o dado sem ler uma palavra: a cor separa antes do
       olho chegar no nome.
       O recorte: mordida de quina nos quatro cantos, que e a rebarba de
       ingresso destacado de bloco, mais tres mordidas na borda de fora. Por
       MASCARA, para o buraco ser buraco e o forro do bolso aparecer nele. */
    // o corpo e 76% da largura por toda a altura de um bilhete de 3.9,
    // entao a proporcao dele e 2.96: e esse o retangulo real do desenho
    const W = 168, H = 57;
    const u = "tf" + String(id).replace(/\W/g, "") + "_";
    const list = (pieces || []).slice(0, 2);
    const n = Math.max(1, list.length);

    // a rebarba: quina mordida nos quatro cantos e na borda de fora
    const rq = 5.2;
    let mordidas = "";
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(c => {
      mordidas += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + rq
        + '" fill="#000"/>';
    });
    for (let k = 0; k < 3; k++)
      mordidas += '<circle cx="' + W + '" cy="' + (12 + k * 12)
        + '" r="2" fill="#000"/>';

    // o anuncio: inteiro para uma peca, metade para cada quando sao duas
    let arte = "";
    for (let k = 0; k < n; k++){
      const pk = posterKeyOf(list[k]);
      const P = POSTER[pk] || P0 || POSTER.especial;
      const lw = W / n;
      arte += '<g transform="translate(' + (lw * k).toFixed(1) + ' 0)">'
        + posterWide([list[k]], String(id) + "#" + k, lw, H, P)
        + "</g>";
    }
    // o picote entre as duas metades, que e onde o bilhete se parte
    if (n === 2)
      arte += '<line x1="' + (W / 2) + '" y1="2" x2="' + (W / 2) + '" y2="'
        + (H - 2) + '" stroke="#0008" stroke-width="1"'
        + ' stroke-dasharray="2 2.4"/>';

    return '<svg class="lf-tface" viewBox="0 0 ' + W + " " + H
      + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><mask id="' + u + 'm">'
      + '<rect width="' + W + '" height="' + H + '" fill="#fff"/>'
      + mordidas + "</mask></defs>"
      + '<g mask="url(#' + u + 'm)">' + arte
      // o friso de fora, por ultimo, para o recorte cortar ele junto
      + '<rect x=".8" y=".8" width="' + (W - 1.6) + '" height="' + (H - 1.6)
      + '" fill="none" stroke="#00000055" stroke-width="1.6"/>'
      + "</g></svg>";
  }

  window.__lfTicket = (pieces, id) => ticketSVG(pieces, id);
  function ticketSVG(pieces, id){
    const rnd = lotRng(lotSeed(id) + 5);
    const u = "t" + String(id).replace(/\W/g, "") + "_";
    const num = (v) => v.toFixed(1);
    const W = 170, H = 60, STUB = 36;
    // os furos do picote, recortados por mascara nas duas pontas
    let punch = "";
    for (let k = 0; k < 5; k++){
      const y = 6 + k * 12;
      punch += '<circle cx="0" cy="' + y + '" r="3.2" fill="#000"/>'
        + '<circle cx="' + W + '" cy="' + y + '" r="3.2" fill="#000"/>';
    }
    return '<svg class="lf-ticket" viewBox="0 0 ' + W + " " + H
      + '" aria-hidden="true">'
      + '<defs><mask id="' + u + 'm">'
      + '<rect width="' + W + '" height="' + H + '" rx="3" fill="#fff"/>'
      + punch + "</mask></defs>"
      + '<g mask="url(#' + u + 'm)" transform="rotate('
      + num(rnd() * 1.6 - 0.8) + " " + (W / 2) + " " + (H / 2) + ')">'
      // a face: o mesmo cartaz do lote, reimpresso deitado
      + '<g>' + posterInner(pieces, id, W - STUB, H) + "</g>"
      // o talao destacavel, com a linha de picote e o numero em pe
      + '<rect x="' + (W - STUB) + '" width="' + STUB + '" height="' + H
      + '" fill="#efe6ce"/>'
      + '<line x1="' + (W - STUB) + '" y1="2" x2="' + (W - STUB) + '" y2="'
      + (H - 2) + '" stroke="#7a6a48" stroke-width="1.4"'
      + ' stroke-dasharray="3 3"/>'
      + '<text x="' + (W - STUB + 13) + '" y="' + (H / 2)
      + '" text-anchor="middle" font-family="monospace" font-size="9"'
      + ' fill="#7a2323" textLength="' + (H - 14)
      + '" lengthAdjust="spacingAndGlyphs" transform="rotate(90 '
      + (W - STUB + 13) + " " + (H / 2) + ')">'
      + String(id).replace(/^H/, "H-") + "</text>"
      + '<text x="' + (W - STUB + 26) + '" y="' + (H / 2)
      + '" text-anchor="middle" font-family="Oswald,Impact,sans-serif"'
      + ' font-size="6.5" fill="#4a3a22" textLength="' + (H - 10)
      + '" lengthAdjust="spacingAndGlyphs" transform="rotate(90 '
      + (W - STUB + 26) + " " + (H / 2) + ')">ADMIT ONE INSTALL</text>'
      // o desgaste do papel que andou na gaveta
      + '<rect width="' + W + '" height="' + H + '" rx="3" fill="#3a2c1c"'
      + ' opacity="' + num(0.04 + rnd() * 0.07) + '"/>'
      + "</g></svg>";
  }

  function decorateBadges(a){
    const v = a.view;
    if (!v || !v.travelers || !catalog) return;
    document.querySelectorAll("#players-zone .badge").forEach(b => {
      const nameEl = b.querySelector(".bd-name");
      const t = nameEl && v.travelers.find(x => x.name === nameEl.title);
      const L = t && t.leilao;
      if (!L) return;
      const sig = rigSig(L);
      let rig = b.querySelector(".lf-rig");
      if (rig && rig.dataset.sig === sig) return;
      if (!rig){
        rig = document.createElement("div");
        rig.className = "lf-rig";
        const reg = b.querySelector(".bd-alloc");
        if (reg) reg.replaceWith(rig); else b.appendChild(rig);
      }
      rig.dataset.sig = sig;
      rig.title = "The rig built at auction, rows are public record";
      // GLANCE on a rival: the BAR's width is the function's width, its colour
      // is the family. No name at 8px that nobody can read; the name is the
      // tooltip, exactly like every other object in this game.
      // A RIVAL'S ROW IS THE SAME OBJECT AS MINE, ONE SIZE DOWN. The bar said
      // family and width and stopped there, so two functions of one family and
      // one width were the same picture: the collision the houses were built to
      // kill, surviving on the badge. Same construction as my own matrix, same
      // houses, paper skin because a rival's file IS paper.
      rig.innerHTML = (L.rows||[]).map(r => {
        const fn = r.funcao && catalog.funcoes && catalog.funcoes[r.funcao];
        const w = Math.max(0, Math.min(ROW_SOCKETS, r.width||0));
        let inner = "";
        for (let c = 0; c < ROW_SOCKETS; c++){
          const h = (fn && c < w) ? houseOf(r, c, fn): null;
          inner += (h && h.eff) ? houseHTML(h.eff, null, h.pid)
            : '<i class="lf-mcell is-void"></i>';
        }
        return '<span class="lf-rigrow lf-fam-'
          + (fn ? (fn.family || "recarga"): "none")
          + (r.sealed?" is-sealed":"") + (fn?"":" is-empty") + '" title="'
          + (fn ? fn.name + (r.sealed ? " (sealed this Hour)": "")
            : "empty row") + '">' + inner + "</span>";
      }).join("")
      // WHAT A RIVAL ROLLS IS PUBLIC AND WAS NEVER DRAWN. The machine says what
      // they can DO; the dice say how HARD, and reading one without the other
      // is why a rival's build was unreadable. Same die art as everywhere else,
      // one size down, so a Tita on their bench is a Tita on mine.
      + (function(){
          // WHAT THE RULE LETS ME SEE. On my own seat `generators` is the list;
          // on a rival it is a NUMBER, because today the auction publishes the
          // VOLUME of someone's bench and not its contents (sessao.py). So mine
          // draws the real dice and theirs draws that many blank bodies: the
          // count is public, the faces are not, and the drawing says exactly
          // that instead of pretending the row is empty.
          const own = Array.isArray(L.generators);
          const n = own ? L.generators.length: (L.generators || 0);
          if (!n) return "";
          const cap = L.cap || n;
          const body = own
            ? L.generators.map(g => '<i class="lf-rigdie" data-gid="' + g
                + '"></i>').join("")
                : Array.from({ length: Math.min(n, 6) },
                () => '<i class="lf-rigdie is-hidden"></i>').join("");
          return '<span class="lf-rigdice" title="' + n + ' of ' + cap
            + ' generators' + (own ? "": " (a rival's faces are not public)")
            + '">' + body + "</span>";
        })();
      // THE RESERVE, ON THE FILE. A rival's shield is public and it changes how
      // you read everything else on this badge: a machine with six shield is a
      // machine that can eat a paradox and keep going. Same ten notches as
      // anywhere else, so the cap is part of the reading.
      const sh = Math.max(0, Math.min(SHIELD_CAP, L.shield || 0));
      if (sh) rig.insertAdjacentHTML("beforeend",
        '<span class="lf-shield is-rig" title="' + sh + ' of ' + SHIELD_CAP
        + ' shield"><s class="lf-shsig">' + ic("shield") + '</s>'
        + '<span class="lf-shpips">'
        + Array.from({ length: SHIELD_CAP },
            (_, i) => "<i" + (i < sh ? ' class="is-on"': "") + "></i>").join("")
        + "</span></span>");
      rig.querySelectorAll(".lf-rigdie[data-gid]").forEach(sl => {
        try { sl.appendChild(genDieEl(sl.dataset.gid, null,
          { static:true, catalogue:true })); } catch(e){}
      });
    });
  }

  setInterval(async () => {
    if (mounting) return;
    const a = app();
    // THE MODE HAS TO BE VISIBLE TO CSS. The classic game keeps the pip-boy
    // screen dark outside the allocation, which is right for it: the machine
    // only matters when you allocate. In the auction the machine IS the build
    // you are bidding to grow, so it has to stay lit all Hour. One body flag,
    // and the rule below can add a condition instead of fighting the classic.
    document.body.classList.toggle("lf-on", !!(a && isLeilao()));
    if (!a || !isLeilao()) { if (mounted) unmount(); return; }
    try{ decorateBadges(a); }catch(e){}
    const req = a.pendingReq;
    // A SALA TEM QUE ESTAR NA TELA ENQUANTO SE DA O LANCE. Isto segurava a
    // camera por um TEMPO e soltava no PRIMEIRO clique, e marcar um lote e um
    // clique: o jogador marcava e a sala ia embora enquanto ele ainda estava
    // decidindo o numero. Medido: a camera voltava para `main` e o salao
    // inteiro ficava acima da borda de cima.
    // Agora ela fica enquanto a DECISAO existe, e so sai se o jogador virar a
    // camera ele mesmo, que e o unico gesto que significa "quero olhar outra
    // coisa".
    if (req && req.kind === "leilao_bid" && !camReleased && a.camera){
      try{
        if (a.camera.scene !== "market"){
          a.camera._engage && a.camera._engage();
          a.camera.setScene("market");
        }
        // heal a half-turned camera: flag says market, world stayed behind
        const camEl = document.getElementById("cam");
        if (a.camera.scene === "market" && camEl
            && camEl.dataset.scene !== "market")
          camEl.dataset.scene = "market";
      }catch(e){}
    }
    if (!req || !SURFACES[req.kind]) {
      // the ceremony owns the hall until the room finishes resolving
      if (Date.now() < ceremonyUntil && document.querySelector(".lf-house"))
        return;
      if (mounted) unmount();
      // keep the LIVE machine and cockpit honest between decisions
      if (window.__leilaoMachine && a.dom && a.dom.machine){
        try{
          window.__leilaoMachine.idle(a);
          window.__leilaoMachine.dice(a);
        }catch(e){}
      }
      return;
    }
    // the ceremony gets its beat: the next surface waits for the room to
    // finish resolving before it takes the stage
    if (Date.now() < ceremonyUntil && document.querySelector(".lf-house"))
      return;
    if (mountedReq !== null && mountedReq === reqKey(req)){
      // the market renderer wipes its body on every paced render: if it ate
      // the auction house, put the house back
      if (req.kind === "leilao_bid" && !document.querySelector(".lf-house"))
        mountedReq = null;
      else return;
    }
    mounting = true;
    try {
      unmount();
      await loadCatalog();
      // A MESMA COMPARACAO POR IDENTIDADE, e aqui ela era a raiz: depois do
      // `await` o cliente ja recriou o objeto do pedido, entao isto dava falso
      // e a montagem era PULADA. So que o `unmount()` acima ja tinha apagado a
      // sala. Resultado: a cada tique o leilao era destruido e nao reconstruido,
      // sete vezes em tres segundos, e a sala piscava.
      if (app() && reqKey(app().pendingReq) === reqKey(req)) {
        mounted = SURFACES[req.kind](req);
        mountedReq = reqKey(req);
        snd("phase");
      }
    } catch (e) {
      // UMA MONTAGEM QUE QUEBRA NO MEIO NAO PODE MORRER CALADA. Sem isto o
      // erro virava uma promessa rejeitada invisivel, a sala ficava meio
      // construida e o tique remontava tudo de novo, para sempre.
      try{ console.error("leilao: a montagem falhou -", e); }catch(_){}
    } finally {
      mounting = false;
    }
  }, 400);
})();
