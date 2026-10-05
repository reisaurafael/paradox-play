import{audio}from"./audio.js?202610051319";const MAX=140,KEEP=40,SHOW_MS=7e3,STAMPS=[["bang","BANG!"],["what","WHAT?"],["ha","HA!"],["thumb","NICE"],["coffee","COFFEE"],["gg","GG"],["wait","WAIT"],["hurry","HURRY"]],STAMP_WORD=Object.fromEntries(STAMPS),STAMP_NAME={},W={talk:null,notes:[],open:!1,unread:0,el:null},talk=()=>window.PDX_ONLINE&&window.PDX_ONLINE.talk?window.PDX_ONLINE.talk():null,sfx=(name,opt)=>{try{audio.palette==="new"&&audio.play(name,opt)}catch{}},active=id=>{const s=document.getElementById(id);return!!(s&&s.classList.contains("is-active"))},colourOf=seat=>{try{return seat&&window.__seatColor&&window.__seatColor(seat)||"#3b2a1a"}catch{return"#3b2a1a"}},CSS=`
#wire { position: fixed; left: 14px; bottom: 14px; z-index: 70; display: none; font-family: 'JetBrains Mono', 'Courier New', monospace; color: #1d1208; }
html.wire-on #wire { display: block; }
#wire .wr-tag { position: relative; display: block; padding: 7px 14px 6px; border: 2.5px solid #140a04; border-radius: 3px; cursor: pointer;
  font: 700 15px/1 Oswald, 'Arial Narrow', sans-serif; letter-spacing: .14em; color: #f3e6c8; background: #3a2414;
  box-shadow: 3px 3px 0 #140a04; rotate: -2deg; }
#wire .wr-tag:hover { translate: 0 -2px; }
#wire .wr-tag:active { translate: 1px 1px; box-shadow: 2px 2px 0 #140a04; }
#wire .wr-tag i { position: absolute; right: -10px; top: -10px; min-width: 20px; height: 20px; padding: 0 4px; border: 2px solid #140a04; border-radius: 10px;
  background: #c8321e; color: #fff4e0; font: 700 12px/16px Oswald, sans-serif; letter-spacing: 0; text-align: center; font-style: normal; display: none; }
#wire .wr-tag i.on { display: block; }
.wr-paper { background-color: #eadbb4;
  background-image: radial-gradient(rgba(90, 60, 20, .16) 1px, transparent 1.3px); background-size: 5px 5px;
  border: 2px solid #140a04; box-shadow: 4px 4px 0 #140a04; }

#wire .wr-feed { position: absolute; left: 0; bottom: 46px; width: 330px; display: flex; flex-direction: column-reverse; gap: 8px; pointer-events: none; }
.wr-slip { position: relative; padding: 9px 12px 9px; font-size: 14px; line-height: 1.32; word-wrap: break-word; overflow-wrap: anywhere;
  clip-path: polygon(0 4px, 4% 0, 9% 4px, 14% 0, 19% 4px, 24% 0, 29% 4px, 34% 0, 39% 4px, 44% 0, 49% 4px, 54% 0, 59% 4px, 64% 0, 69% 4px, 74% 0, 79% 4px, 84% 0, 89% 4px, 94% 0, 100% 4px, 100% 100%, 0 100%); }
.wr-slip .wr-who { display: inline-block; margin: 0 8px 3px 0; padding: 1px 6px 0; border: 2px solid currentColor; border-radius: 2px;
  font: 700 12px/1.2 Oswald, 'Arial Narrow', sans-serif; letter-spacing: .1em; text-transform: uppercase; rotate: -3deg; background: rgba(255, 250, 235, .5); }
.wr-slip .wr-head { font: 600 10px/1 Oswald, sans-serif; letter-spacing: .3em; color: #6d5530; margin-bottom: 4px; }
.wr-slip .wr-txt { display: block; color: #1d1208; }
.wr-slip .wr-big { display: inline-block; margin: 2px 0 0 4px; padding: 2px 10px; border: 3px double #b0281a; color: #b0281a; font: 700 22px/1 Oswald, sans-serif; letter-spacing: .06em; rotate: -6deg; }
.wr-slip.wr-mine { background-color: #dcd3bd; }
#wire .wr-feed .wr-slip { animation: wrIn .28s cubic-bezier(.2, .9, .3, 1.2) both; }
#wire .wr-feed .wr-slip.wr-go { animation: wrOut .4s ease-in forwards; }
@keyframes wrIn { from { translate: -40px 0; opacity: 0; } }
@keyframes wrOut { to { translate: -30px 0; opacity: 0; } }
html[data-fx="off"] #wire .wr-slip, body.gfx-low #wire .wr-slip { animation: none !important; }

#wire .wr-pad { position: absolute; left: 0; bottom: 46px; width: 360px; display: none; padding: 0 0 10px; rotate: .6deg; }
#wire.open .wr-pad { display: block; }
#wire.open .wr-feed { display: none; }
#wire .wr-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 5px 12px; background: #3a2414; color: #f3e6c8;
  font: 700 14px/1 Oswald, sans-serif; letter-spacing: .3em; border-bottom: 2px solid #140a04; }
#wire .wr-x { border: 2px solid #f3e6c8; background: none; color: #f3e6c8; font: 700 13px/1 Oswald, sans-serif; width: 24px; height: 22px; cursor: pointer; padding: 0; }
#wire .wr-log { max-height: min(38vh, 300px); overflow-y: auto; padding: 8px 10px 4px; display: flex; flex-direction: column; gap: 7px; overscroll-behavior: contain; }
#wire .wr-log .wr-slip { box-shadow: 2px 2px 0 #140a04; border: 1.6px solid #140a04; }
#wire .wr-empty { font-size: 13px; color: #6d5530; padding: 4px 2px; }
#wire .wr-line { display: flex; gap: 6px; padding: 6px 10px 0; align-items: stretch; }
#wire .wr-in { flex: 1; min-width: 0; font: 600 14px/1.2 'JetBrains Mono', 'Courier New', monospace; color: #1d1208; padding: 6px 8px;
  background: #fbf3dc; border: 2px solid #140a04; border-radius: 0; outline: none; }
#wire .wr-in:focus { box-shadow: inset 0 -3px 0 #c8321e; }
#wire .wr-send { font: 700 14px/1 Oswald, sans-serif; letter-spacing: .12em; padding: 0 12px; border: 2px solid #140a04; background: #c8321e; color: #fff4e0;
  box-shadow: 2px 2px 0 #140a04; cursor: pointer; }
#wire .wr-send:active { translate: 1px 1px; box-shadow: 1px 1px 0 #140a04; }
#wire .wr-meta { display: flex; justify-content: space-between; padding: 3px 12px 0; font-size: 11px; color: #6d5530; min-height: 15px; }
#wire .wr-meta b { color: #b0281a; }
#wire .wr-stamps { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 10px 0; }
#wire .wr-st { font: 700 13px/1 Oswald, sans-serif; letter-spacing: .05em; color: #b0281a; background: #f6ecd2; border: 2px solid #b0281a; padding: 5px 8px 4px;
  cursor: pointer; rotate: -2deg; box-shadow: 2px 2px 0 rgba(20, 10, 4, .8); }
#wire .wr-st:nth-child(2n) { rotate: 2deg; }
#wire .wr-st:hover { background: #fff; }
#wire .wr-st:active { translate: 1px 1px; box-shadow: 1px 1px 0 rgba(20, 10, 4, .8); }

html.pdx-touch #wire, html.pdx-m-on #wire { left: 8px; bottom: auto; top: 8px; }
html.pdx-touch #wire .wr-pad, html.pdx-m-on #wire .wr-pad, html.pdx-touch #wire .wr-feed, html.pdx-m-on #wire .wr-feed { bottom: auto; top: 40px; }
html.pdx-touch #wire .wr-feed, html.pdx-m-on #wire .wr-feed { flex-direction: column; width: 290px; }
html.pdx-touch #wire .wr-pad, html.pdx-m-on #wire .wr-pad { width: 340px; }
html.pdx-touch #wire .wr-log, html.pdx-m-on #wire .wr-log { max-height: 128px; }
html.pdx-touch #wire .wr-tag, html.pdx-m-on #wire .wr-tag { padding: 6px 10px 5px; font-size: 13px; }

html.pdx-m-on #wire { left: calc(var(--pdx-col-r, 190px) + 112px); top: 10px; }
html.pdx-m-on #wire .wr-feed { width: 250px; }
`;function build(){if(W.el)return W.el;const st=document.createElement("style");st.textContent=CSS,document.head.appendChild(st);const el=W.el=document.createElement("div");el.id="wire",el.innerHTML=`<div class="wr-feed" aria-live="polite"></div>
    <div class="wr-pad wr-paper" role="dialog" aria-label="Notes">
      <div class="wr-bar"><span>WIRE</span><button type="button" class="wr-x" aria-label="Close">X</button></div>
      <div class="wr-log"></div>
      <div class="wr-line"><input class="wr-in" type="text" maxlength="${MAX}" autocomplete="off" spellcheck="false" placeholder="Type a note" aria-label="Type a note"><button type="button" class="wr-send">SEND</button></div>
      <div class="wr-meta"><b class="wr-say"></b><span class="wr-n">0/${MAX}</span></div>
      <div class="wr-stamps">${STAMPS.map(([k,w])=>`<button type="button" class="wr-st" data-k="${k}"${STAMP_NAME[k]?` aria-label="${STAMP_NAME[k]}" title="${STAMP_NAME[k]}"`:""}>${w}</button>`).join("")}</div>
    </div>
    <button type="button" class="wr-tag" aria-label="Notes">WIRE<i></i></button>`,document.body.appendChild(el);const inp=el.querySelector(".wr-in"),n=el.querySelector(".wr-n");el.querySelector(".wr-tag").addEventListener("click",()=>toggle()),el.querySelector(".wr-x").addEventListener("click",()=>toggle(!1)),el.querySelector(".wr-send").addEventListener("click",()=>send()),inp.addEventListener("input",()=>{n.textContent=`${inp.value.length}/${MAX}`});for(const t of["keydown","keyup","keypress"])el.addEventListener(t,e=>{t==="keydown"&&e.key==="Enter"&&e.target===inp&&(e.preventDefault(),send()),t==="keydown"&&e.key==="Escape"&&(e.preventDefault(),toggle(!1)),e.stopPropagation()});for(const b of el.querySelectorAll(".wr-st"))b.addEventListener("click",()=>stamp(b.dataset.k));return el}function say(txt){const s=W.el&&W.el.querySelector(".wr-say");s&&(s.textContent=txt,clearTimeout(W.sayT),W.sayT=setTimeout(()=>{s.textContent=""},2200))}async function send(){const T=talk(),inp=W.el.querySelector(".wr-in"),txt=inp.value.trim();if(!T||!txt)return;if(!await T.say(txt)){say("ONE MOMENT");return}inp.value="",W.el.querySelector(".wr-n").textContent=`0/${MAX}`,sfx("carriage")}async function stamp(k){const T=talk();if(T){if(!await T.stamp(k)){say("ONE MOMENT");return}sfx("card_pick")}}function toggle(on=!W.open){W.open=on,W.el.classList.toggle("open",on),on?(W.unread=0,badge(),drawLog(),sfx("clipboard_open"),document.documentElement.classList.contains("pdx-touch")||setTimeout(()=>W.el.querySelector(".wr-in").focus(),30)):(W.el.querySelector(".wr-in").blur(),sfx("clipboard_shut"))}function badge(){const i=W.el.querySelector(".wr-tag i");i.textContent=W.unread>9?"9+":String(W.unread),i.classList.toggle("on",W.unread>0)}function slip(note){const T=talk(),seat=T&&T.seatOf(note.uid)||"?",d=document.createElement("div");d.className="wr-slip wr-paper"+(note.mine?" wr-mine":""),d.style.rotate=(note.t%7-3)*.35+"deg";const head=document.createElement("div");head.className="wr-head",head.textContent="TELEGRAM";const who=document.createElement("span");who.className="wr-who";const name=s=>{who.textContent=s,who.style.color=colourOf(s)};if(name(seat),seat==="?"&&setTimeout(()=>{const s2=T&&T.seatOf(note.uid);s2&&name(s2)},1200),d.append(head,who),note.text!=null){const x=document.createElement("span");x.className="wr-txt",x.textContent=note.text,d.append(x)}else{const b=document.createElement("span");b.className="wr-big",b.textContent=STAMP_WORD[note.stamp]||"",STAMP_NAME[note.stamp]&&b.setAttribute("aria-label",STAMP_NAME[note.stamp]),d.append(b)}return d}function drawLog(){const log=W.el.querySelector(".wr-log");if(log.textContent="",!W.notes.length){const e=document.createElement("div");e.className="wr-empty",e.textContent="No notes yet.",log.append(e);return}for(const n of W.notes)log.append(slip(n));log.scrollTop=log.scrollHeight}function arrive(note){if(W.notes.push(note),W.notes.length>KEEP&&W.notes.shift(),W.open)drawLog();else if(!note.mine&&note.t>=W.since){W.unread++,badge();const feed=W.el.querySelector(".wr-feed"),s=slip(note);for(feed.prepend(s);feed.children.length>3;)feed.lastElementChild.remove();setTimeout(()=>{s.classList.add("wr-go"),setTimeout(()=>s.remove(),420)},SHOW_MS)}!note.mine&&note.t>=W.since&&(note.text!=null?sfx("typeline",{n:Math.min(8,3+Math.floor(note.text.length/25))}):sfx("notch"))}function attach(T){build(),W.talk=T,W.notes=[],W.unread=0,badge(),W.since=Date.now()-3e3,W.el.querySelector(".wr-feed").textContent="",W.open&&drawLog(),T&&(T.onnote=note=>arrive(note)),show()}function show(){const on=!!(W.talk&&talk()===W.talk&&(active("screen-lobby")||active("screen-game")));document.documentElement.classList.toggle("wire-on",on),!on&&W.open&&toggle(!1)}function boot(){window.addEventListener("pdx:talk",e=>attach(e.detail)),talk()&&attach(talk()),setInterval(()=>{if(W.el&&(show(),document.documentElement.classList.contains("pdx-m-on"))){const c=document.getElementById("pdx-mcol"),r=c&&c.getBoundingClientRect();r&&r.width&&document.documentElement.style.setProperty("--pdx-col-r",Math.round(r.right)+"px")}},600)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",boot):boot(),window.__pdxWire={notes:()=>W.notes.slice(),open:()=>toggle(!0),close:()=>toggle(!1)};
