/* =========================================================================
   audio.js, Paradoxo's synthesized audio engine
   -------------------------------------------------------------------------
   All sound is generated with the Web Audio API, no asset files, works offline
   (important for the Tauri/Steam build). Two buses: ambient generative music and
   one-shot SFX, each with its own gain, under a master gain. Volumes persist in
   localStorage. The context must be resumed from a user gesture (autoplay
   policy); call `audio.unlock()` on the first click.

   Mood: retro-futuristic temporal bureaucracy, slow minor-key pads, glassy
   bells, mechanical clicks, and a low dissonant alarm for paradox/danger.
   ========================================================================= */

const LS_KEY = "paradoxo.audio";

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);  // MIDI -> Hz

// ---------------------------------------------------------------------------
// Generative music model
// ---------------------------------------------------------------------------
// Instead of a short fixed chord loop (which gets old fast), each era is a
// *generative preset*: a scale (its modal colour), a set of chord degrees it can
// wander between, and a handful of voices (pad / bass / melody / arpeggio / drum
// / bell) each with its own timbre and probability. A bar scheduler picks the
// next chord by a weighted random walk (never repeating too eagerly), voices a
// pad from the scale, and sprinkles melodic notes, plucks, drums and bells whose
// pitches come from a random walk over the scale and whose timing is jittered.
// A slow "phrase" counter swells and thins the texture over time. The result is
// minutes of evolving, non-looping music with a distinct identity per era.

const SCALE = {
  pentMin:  [0, 3, 5, 7, 10],
  pentMaj:  [0, 2, 4, 7, 9],
  aeolian:  [0, 2, 3, 5, 7, 8, 10],
  dorian:   [0, 2, 3, 5, 7, 9, 10],
  lydian:   [0, 2, 4, 6, 7, 9, 11],
};

// Per-era identity. The whole soundtrack is deliberately slow, low/mid-register
// and consonant, atmospheric, never busy or shrill. What changes as a traveler
// moves through time is the *instrumentation*: deep drones in the primordial
// past, a breathy flute in antiquity, a plucked lute in the medieval era, soft
// strings in the modern era, a warm electric-piano in the contemporary era, and
// an airy synth pad in the future. Bars are long (5-8s) and at most one gentle
// lead note sounds per bar, so the music evolves calmly over long sessions.
const ERA_MUSIC = {
  // Primordial, vast, almost motionless. A deep drone and nothing more.
  primordial: {
    root: 31, scale: SCALE.pentMin, bar: 8000, modProb: 0.10, swellBars: 14,
    degrees: [0, -2, 3], degWeights: [6, 2, 2],
    pad:  { wave: "sine", voices: [0, 7, 12], detune: 7, cutoff: 460, level: 0.26, attack: 3.4, release: 4.2 },
    bass: { wave: "sine", level: 0.30, sub: true },
    lead: null,
  },
  // Ancient, a low wooden flute over a soft modal drone and a gentle hand-drum.
  // A bare, ritual choir hums underneath now and then. Reedy, earthy, sparse.
  ancient: {
    root: 38, scale: SCALE.dorian, bar: 6800, modProb: 0.20, swellBars: 12,
    degrees: [0, 3, -2, 5], degWeights: [5, 2, 2, 1],
    pad:  { kind: "drone", wave: "triangle", voices: [0, 7, 12], detune: 5, cutoff: 680, level: 0.16, attack: 2.2, release: 3.0 },
    bass: { wave: "sine", level: 0.24 },
    lead: { kind: "sustain", timbre: "flute", wave: "triangle", level: 0.12, prob: 0.65, attack: 0.28, hold: 1.9, release: 1.3,
            octave: 12, span: 6, vibrato: 0.008 },
    perc: { kind: "frame", level: 0.12, prob: 0.55, beats: 2 },
    choir: { prob: 0.22, level: 0.06, voices: [0, 7] },
    dark: 0.08,
  },
  // Medieval, authentic period consort: a droning hurdy-gurdy/bagpipe open fifth,
  // a bright plucked LUTE, a wooden RECORDER flute counter-melody, a bowed viol
  // string consort, a sacred CHOIR (chant), a tabor (frame drum) + tambourine.
  // Unmistakably medieval, no synth pads anywhere.
  medieval: {
    root: 40, scale: SCALE.aeolian, bar: 6000, modProb: 0.24, swellBars: 10,
    degrees: [0, 3, 5, -2, 7], degWeights: [4, 3, 2, 2, 1],
    // The signature medieval sound: a continuous reedy open-fifth drone underneath
    // everything (hurdy-gurdy / bagpipe chanter), tuned to the tonic (never modulates).
    drone: { voices: [0, 7], level: 0.11 },
    pad:  { kind: "strings", voices: [0, 7, 12], cutoff: 1500, level: 0.11, attack: 1.4, release: 2.2 },
    bass: { wave: "triangle", level: 0.20 },
    lead: { kind: "pluck", timbre: "lute", level: 0.18, prob: 0.92, decay: 1.1, notes: 3, octave: 12, span: 7 },
    // A wooden recorder/flute line that answers the lute now and then.
    recorder: { prob: 0.42, level: 0.10, octave: 24, span: 6 },
    perc: { kind: "tabor", level: 0.15, prob: 0.78, beats: 3, tamb: 0.5 },
    choir: { prob: 0.5, level: 0.09, voices: [0, 7, 12] },
    dark: 0.07,
  },
  // Modern, a warm bowed string section and a slow cello line, with a distant
  // timpani. Romantic and filmic; strings, not synths.
  modern: {
    root: 40, scale: SCALE.aeolian, bar: 6200, modProb: 0.28, swellBars: 10,
    degrees: [0, 5, 3, -4, 7], degWeights: [4, 3, 2, 2, 1],
    pad:  { kind: "strings", voices: [0, 3, 7, 12], cutoff: 1700, level: 0.12, attack: 1.8, release: 2.6 },
    bass: { wave: "triangle", level: 0.20, sub: true },
    lead: { kind: "sustain", timbre: "cello", wave: "sawtooth", level: 0.10, prob: 0.55, attack: 0.5, hold: 2.2, release: 1.6,
            octave: 0, span: 7, cutoff: 700, vibrato: 0.006 },
    perc: { kind: "timp", level: 0.10, prob: 0.4, beats: 1 },
    choir: { prob: 0.18, level: 0.05, voices: [0, 7] },
    dark: 0.07,
  },
  // Contemporary, a warm electric-piano pad with soft, rounded plucked tones.
  contemporary: {
    root: 43, scale: SCALE.pentMaj, bar: 5800, modProb: 0.30, swellBars: 9,
    degrees: [0, 4, 7, -3, 9], degWeights: [4, 3, 2, 2, 1],
    pad:  { kind: "warm", wave: "triangle", voices: [0, 4, 7, 11], detune: 5, cutoff: 1050, level: 0.13, attack: 1.2, release: 2.0 },
    bass: { wave: "triangle", level: 0.20, sub: true },
    lead: { kind: "pluck", timbre: "rhodes", wave: "sine", level: 0.13, prob: 0.65, decay: 1.4, notes: 1, octave: 12, span: 7 },
    dark: 0.05,
  },
  // Future, an airy, dreamy synth pad and a calm sine lead. Smooth, never tense.
  future: {
    root: 45, scale: SCALE.pentMaj, bar: 5800, modProb: 0.32, swellBars: 9,
    degrees: [0, 2, 7, 9, -3], degWeights: [3, 2, 3, 2, 2],
    pad:  { wave: "sawtooth", voices: [0, 7, 12, 16], detune: 9, cutoff: 1150, level: 0.11, attack: 1.8, release: 2.6 },
    bass: { wave: "sine", level: 0.18, sub: true },
    lead: { kind: "sustain", wave: "sine", level: 0.10, prob: 0.5, attack: 0.7, hold: 2.4, release: 1.8,
            octave: 12, span: 7, vibrato: 0.005 },
    dark: 0.04,   // rare, subtle dread, the only addition to the (liked) future bed
  },
};
// Dynamic MOODS, overlaid by game state, overriding the era bed until a major
// event clears them (see game.js music state machine). Same config schema.
const MOOD_MUSIC = {
  // WANTED, a full spaghetti-Western: a lonesome whistle, a wailing HARMONICA
  // chord, a Morricone muted-TRUMPET call, a twangy guitar arpeggio over a
  // "boom-chick" bass, and a galloping hoofbeat. Unmistakably Old West.
  western: {
    root: 40, scale: SCALE.aeolian, bar: 4400, modProb: 0.22, swellBars: 8,
    degrees: [0, 3, 5, -2, 7], degWeights: [5, 3, 2, 2, 1],
    pad:  { kind: "warm", wave: "triangle", voices: [0, 7], detune: 5, cutoff: 700, level: 0.08, attack: 1.6, release: 2.6 },
    bass: { wave: "triangle", level: 0.24 },
    // The signature lonesome WHISTLE, a pure sine with a wide, slow vibrato.
    lead: { kind: "sustain", timbre: "whistle", wave: "sine", level: 0.19, prob: 0.72,
            attack: 0.14, hold: 2.0, release: 1.2, octave: 12, span: 7, vibrato: 0.03 },
    // Twangy acoustic-guitar arpeggio (see _guitarArp), the saloon backbone.
    guitar: { prob: 0.95, level: 0.18, notes: 4, octave: 0, decay: 0.95 },
    // A reedy harmonica chord that wails and bends, the heart of the Old-West sound.
    harmonica: { prob: 0.55, level: 0.14, voices: [0, 4, 7] },
    // Occasional Morricone muted-trumpet "coyote call", a bold 3-note motif.
    hornCall: { prob: 0.32, level: 0.17 },
    gallop: { prob: 0.9, level: 0.17 },   // galloping hoofbeat rhythm
    dark: 0.03,
  },
  // 3-VP FLOOR, dread/horror: a very slow dissonant cluster (minor 2nd + tritone),
  // a deep sub, an irregular heartbeat, frequent dark swells, plus a whisper/wind
  // bed and the occasional shrieking sting (see _horrorBed). SFX are muffled too.
  horror: {
    root: 29, scale: [0, 1, 6, 7, 8], bar: 9800, modProb: 0.18, swellBars: 14,
    degrees: [0, 1, 6, -1], degWeights: [5, 3, 2, 2],
    // A heavier, deeper dissonant cluster + a stronger sub, genuinely oppressive.
    pad:  { wave: "sine", voices: [0, 1, 6, 13], detune: 16, cutoff: 340, level: 0.30, attack: 3.8, release: 5.4 },
    bass: { wave: "sine", level: 0.46, sub: true },
    lead: { kind: "sustain", wave: "sawtooth", level: 0.10, prob: 0.45, attack: 1.4, hold: 2.8, release: 2.4,
            octave: 24, span: 3, cutoff: 520, vibrato: 0.002 },
    perc: { kind: "timp", level: 0.18, prob: 0.5, beats: 1 },    // slow, heavy heartbeat
    horror: true,   // whisper/wind bed + more frequent dissonant shrieks/stings
    dark: 0.9,      // near-constant low dissonant swells, the dread signature
  },
};
const DEFAULT_ERA = "modern";

// --- Optional REAL music tracks --------------------------------------------
// Drop looping audio files into web/audio/music/ and they AUTOMATICALLY take over
// from the synthesizer for that mood/era (the synth stays as the fallback when a
// file is absent). Each logical key lists candidate URLs, the first that loads
// wins, so you can ship .ogg (preferred, smaller) or .mp3. Seamless loops sound
// best (no silent tail). Suggested CC0 / royalty-free sources are in the handoff.
//
//   exploration  -> the calm default bed (used when no era-specific file is present)
//   western      -> WANTED mood (Old-West showdown)
//   horror       -> the latched "Secret Market / 3-VP" dread floor
//   era_*        -> optional per-era beds (override `exploration` for that era)
const MUSIC_SRC = {
  exploration: ["audio/music/exploration.ogg", "audio/music/exploration.mp3"],
  western:     ["audio/music/western.ogg", "audio/music/western.mp3"],
  horror:      ["audio/music/horror.ogg", "audio/music/horror.mp3"],
  era_primordial:   ["audio/music/primordial.ogg", "audio/music/primordial.mp3"],
  era_ancient:      ["audio/music/ancient.ogg", "audio/music/ancient.mp3"],
  era_medieval:     ["audio/music/medieval.ogg", "audio/music/medieval.mp3"],
  era_modern:       ["audio/music/modern.ogg", "audio/music/modern.mp3"],
  era_contemporary: ["audio/music/contemporary.ogg", "audio/music/contemporary.mp3"],
  era_future:       ["audio/music/future.ogg", "audio/music/future.mp3"],
};

// THE FILES THAT ARE REALLY SHIPPED. Only these are ever requested: asking for a track
// that is not there cost a 404 in the console of every session. Dropping a new file into
// web/audio/music/ or web/audio/ambience/ means adding its path here too
// (tests/test_audio_shipped.py fails until the list and the folder agree).
const SHIPPED = new Set([
  "audio/ambience/seascape.wav",
]);
const shipped = (urls) => urls.filter((u) => SHIPPED.has(u));

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.started = false;
    const saved = this._load();
    this.vol = { master: saved.master ?? 0.8, music: saved.music ?? 0.35, sfx: saved.sfx ?? 0.7 };
    this.muted = saved.muted ?? false;
    // a silence that is NOT saved: a split-table panel without sound. The real
    // mute goes to localStorage, which the panels share, and would silence the
    // panel that should play.
    this.quiet = false;
    this._musicTimer = null;
    this._step = 0;          // bar counter (drives the slow phrase swell)
    this._curDeg = null;     // current chord degree (root offset, in semitones)
    this._degHist = [];      // recent chord degrees, to avoid eager repetition
    this._melDeg = 0;        // melody position as a scale-degree index (random walk)
    this.era = DEFAULT_ERA;
    this.mood = null;        // active dynamic mood ("western"|"horror") or null
    this.cfg = ERA_MUSIC[DEFAULT_ERA];
    // Asset-music layer (real files): buffers cache + the currently looping source.
    this._trackBuf = {};     // key -> Promise<AudioBuffer|null> (cached)
    this._assetKey = null;   // logical key currently playing as an asset
    this._assetSrc = null;   // the looping BufferSource
    this._assetGain = null;  // its crossfade gain
    this._assetActive = false; // when true, the synth scheduler stays silent
  }

  // The logical music key for the current era/mood, assets are keyed off this.
  _logicalKey() {
    if (this.mood === "western") return "western";
    if (this.mood === "horror") return "horror";
    const eraKey = "era_" + this.era;
    return MUSIC_SRC[eraKey] ? eraKey : "exploration";
  }

  // Lazily fetch + decode a track; cache the promise. Resolves to null if the file
  // is absent (404) or undecodable, the caller then falls back to the synth.
  _loadTrack(key) {
    if (this._trackBuf[key] !== undefined) return this._trackBuf[key];
    const urls = shipped(MUSIC_SRC[key] || []);
    if (!urls.length) return (this._trackBuf[key] = Promise.resolve(null));   // no file: the synth plays
    const attempt = async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.arrayBuffer();
          return await this.ctx.decodeAudioData(data);
        } catch (_) { /* try next candidate */ }
      }
      return null;
    };
    const p = attempt();
    this._trackBuf[key] = p;
    return p;
  }

  // Pick the right asset for the current era/mood and cross-fade to it; if no file
  // exists for that key, hand back to the synthesizer.
  async _applyMusicSource() {
    if (!this.ready || !this.ctx) return;
    const key = this._logicalKey();
    if (key === this._assetKey && this._assetActive) return;   // already playing it
    let buf = null;
    try { buf = await this._loadTrack(key); } catch (_) { buf = null; }
    // The era/mood may have changed again while we were loading, re-check.
    if (key !== this._logicalKey()) return;
    if (buf) {
      this._startAssetLoop(key, buf);
    } else {
      this._stopAssetLoop();   // no file -> resume synth (fallback)
    }
  }

  _startAssetLoop(key, buf) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const fadeOld = this._assetSrc, fadeOldGain = this._assetGain;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + 2.2);     // crossfade in
    src.connect(g); g.connect(this.musicBus);
    try { src.start(t); } catch (_) {}
    this._assetSrc = src; this._assetGain = g; this._assetKey = key; this._assetActive = true;
    if (fadeOld) {  // fade the previous asset out, then stop it
      try {
        fadeOldGain.gain.cancelScheduledValues(t);
        fadeOldGain.gain.setValueAtTime(fadeOldGain.gain.value, t);
        fadeOldGain.gain.linearRampToValueAtTime(0.0001, t + 2.0);
        fadeOld.stop(t + 2.3);
      } catch (_) {}
    }
  }

  _stopAssetLoop() {
    this._assetActive = false; this._assetKey = null;
    const src = this._assetSrc, g = this._assetGain;
    this._assetSrc = null; this._assetGain = null;
    if (!src || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.6);
      src.stop(t + 1.9);
    } catch (_) {}
  }

  // Switch the musical era (called as the player's traveler moves through time).
  // The change is *gradual*: the music bus dips over ~1.6s, the new era's voices
  // take over at the quiet point, then it swells back, so eras cross-fade into
  // one another rather than cutting. Already-scheduled tails of the old era ring
  // out naturally underneath, which smooths the seam further.
  setEra(key) {
    if (!ERA_MUSIC[key] || key === this.era) return;
    this.era = key;
    // While a dynamic mood (Wanted/Terminated) is active it OWNS the soundtrack,
    // just remember the era; it takes effect once the mood clears.
    if (this.mood) return;
    this._crossfadeTo(ERA_MUSIC[key]);
    this._applyMusicSource();      // swap real track if one exists for this era
  }

  // Switch the dynamic mood overlay. `mood` is "western" | "horror" | null. A mood
  // overrides the era bed and persists until a major event clears it (null).
  setMood(mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    const target = mood ? MOOD_MUSIC[mood] : ERA_MUSIC[this.era];
    if (target) this._crossfadeTo(target);
    this._applyMusicSource();      // swap to western/horror/era track if a file exists
    this._applySfxTone();
  }

  // Darken every sound effect while the horror mood is active (muffled, ominous);
  // transparent otherwise. Ramped so the shift itself feels intentional.
  _applySfxTone() {
    if (!this.ready || !this.sfxFilter) return;
    const t = this.ctx.currentTime;
    const horror = this.mood === "horror";
    const f = this.sfxFilter.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.linearRampToValueAtTime(horror ? 900 : 18000, t + 1.2);
    this.sfxFilter.Q.value = horror ? 2.2 : 0.7;
  }

  // Gradually hand over to a new music config: dip the bus, swap voices at the
  // quiet point, swell back, so the change cross-fades rather than cutting.
  _crossfadeTo(cfg) {
    this._step = 0;
    this._curDeg = null;
    this._degHist = [];
    if (this.ready && this.musicBus && !this.muted) {
      const t = this.ctx.currentTime;
      const target = this.vol.music;
      const g = this.musicBus.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(target * 0.18, t + 0.8);   // fade down
      g.linearRampToValueAtTime(target, t + 2.4);          // swell back in
      clearTimeout(this._eraSwap);
      this._eraSwap = setTimeout(() => { this.cfg = cfg; }, 800);
    } else {
      this.cfg = cfg;
    }
  }

  _load() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
  _save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...this.vol, muted: this.muted })); } catch {}
  }

  /* Initialise the graph (idempotent). Safe to call before unlock. */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = (this.muted || this.quiet) ? 0 : this.vol.master;
    // THE SPEAKER'S GUARD (the owner, 29/09: "it's burning the sound box", above all on a phone):
    // everything passes a brick-wall limiter before the speaker, so stacked sounds can never clip;
    // on a phone or tablet the bass a small speaker cannot play (it only rattles) is cut, and the
    // whole mix sits lower
    const touch = document.documentElement.classList.contains("pdx-touch")
      || (window.matchMedia && matchMedia("(pointer: coarse)").matches);
    this.guard = this.ctx.createDynamicsCompressor();
    this.guard.threshold.value = touch ? -16 : -10; this.guard.knee.value = 2; this.guard.ratio.value = 20;
    this.guard.attack.value = 0.002; this.guard.release.value = 0.22;
    this.trim = this.ctx.createGain(); this.trim.gain.value = touch ? 0.62 : 0.9;
    let head = this.guard;
    if (touch) {
      this.lowCut = this.ctx.createBiquadFilter(); this.lowCut.type = "highpass";
      this.lowCut.frequency.value = 170; this.lowCut.Q.value = 0.6;
      this.master.connect(this.lowCut); this.lowCut.connect(this.guard);
    } else this.master.connect(this.guard);
    head.connect(this.trim); this.trim.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.vol.music;
    // THE LAST TIMELINE'S WARMTH (mend.js): two gentle shelves on the music. While
    // the timeline is unravelled the score is a touch thin and bright; each mended
    // century warms it a little (setWarmth 0..1). Subtle on purpose: at most 3 dB.
    this.warmLow = this.ctx.createBiquadFilter();
    this.warmLow.type = "lowshelf"; this.warmLow.frequency.value = 240; this.warmLow.gain.value = -1.5;
    this.warmHigh = this.ctx.createBiquadFilter();
    this.warmHigh.type = "highshelf"; this.warmHigh.frequency.value = 4200; this.warmHigh.gain.value = 0.8;
    this.musicBus.connect(this.warmLow);
    this.warmLow.connect(this.warmHigh);
    this.warmHigh.connect(this.master);
    // gentle reverb-ish: a lowpassed delay feedback for space
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.vol.sfx;
    // SFX pass through a tone filter so the HORROR mood can darken/muffle every
    // sound effect (a much lower cutoff), making the whole audio direction dread.
    this.sfxFilter = this.ctx.createBiquadFilter();
    this.sfxFilter.type = "lowpass";
    this.sfxFilter.frequency.value = 18000;   // transparent by default
    this.sfxFilter.Q.value = 0.7;
    this.sfxBus.connect(this.sfxFilter);
    this.sfxFilter.connect(this.master);

    // THE SEASCAPE rides its own bus straight to master. While the chart fills the
    // eyes we duck BOTH music and sfx to a murmur (the sea should cut the other
    // game sounds), but the surf + gulls on this bus are never ducked.
    this.seaBus = this.ctx.createGain();
    this.seaBus.gain.value = 1;
    this.seaBus.connect(this.master);

    this.ready = true;
    this._applySfxTone();
    if (this._warmth != null) this.setWarmth(this._warmth);   // a mend heard before the audio woke
  }

  /* How whole the last timeline is, 0..1 (mend.js): the music warms as it mends. */
  setWarmth(f) {
    f = Math.max(0, Math.min(1, +f || 0));
    this._warmth = f;
    if (!this.ctx || !this.warmLow) return;
    const t = this.ctx.currentTime;
    this.warmLow.gain.setTargetAtTime(-1.5 + 4.5 * f, t, 1.2);     // -1.5 dB thin, +3 dB warm
    this.warmHigh.gain.setTargetAtTime(0.8 - 2.6 * f, t, 1.2);     // +0.8 dB bright, -1.8 dB soft
  }

  /* Resume the context from a user gesture and start the music. */
  unlock() {
    if (this._seaWant !== undefined) { const w = this._seaWant; delete this._seaWant; setTimeout(() => this.setSeascape(w), 300); }
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (!this.started) { this.started = true; this._startMusic(); this._applyMusicSource(); }
  }

  /* ----------------------------- Volume API ------------------------------ */
  setVolume(bus, v) {
    v = Math.max(0, Math.min(1, v));
    this.vol[bus] = v;
    if (this.ready && !this.muted && !this.quiet) {
      const g = bus === "master" ? this.master : bus === "music" ? this.musicBus : this.sfxBus;
      // Cancel any in-flight automation (e.g. an era cross-fade on the music bus)
      // so the slider takes effect immediately.
      try { g.gain.cancelScheduledValues(this.ctx.currentTime); } catch {}
      g.gain.value = v;
    }
    this._save();
  }
  setMuted(m) {
    this.muted = m;
    if (this.ready) this.master.gain.value = (m || this.quiet) ? 0 : this.vol.master;
    this._save();
  }

  /* ------------------------------- SFX ----------------------------------- */
  _env(type, freq, t0, dur, peak, { detune = 0, sweepTo = null, filter = null } = {}) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type; osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || "lowpass"; f.frequency.value = filter.freq || 1200;
      node.connect(f); f.connect(g);
    } else { node.connect(g); }
    g.connect(this.sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  /* ---- Horror-state SFX reinterpretation --------------------------------- */
  // While the horror floor is latched, the entire sound design turns wrong: clicks
  // become dissonant scrapes, the pleasant die-place becomes an unnatural reversed
  // swell, confirmations groan, temporal events shriek and destabilise. Returns
  // true if it produced a bespoke horror sound for `name`.
  _horrorSfx(name, t) {
    switch (name) {
      case "click":     // a dry, dissonant scrape, nothing pleasant left
        this._hDissonant(t, [NOTE(44), NOTE(45)], 0.16, 0.16); return true;
      case "place":     // die allocation: a DISTURBING reversed swell into a dead thud
        this._hReverseSwell(t, 0.34);
        this._hThud(t + 0.30, 70, 0.22); return true;
      case "confirm":   // a low, groaning tritone instead of a bright chime
        this._hDrone(t, [NOTE(41), NOTE(47)], 0.5, 0.24, -6); return true;
      case "dice":      // scattered detuned taps that decay wrong
      case "dice_roll":
        for (let i = 0; i < 6; i++)
          this._hTap(t + i * 0.06, 180 + Math.random() * 500, 0.14 - i * 0.015); return true;
      case "dice_lock": // the result doesn't snap bright, it lands with a dull dread hit
        this._hThud(t, 96, 0.26); this._hDissonant(t + 0.02, [NOTE(51), NOTE(52)], 0.18, 0.4); return true;
      case "coin": case "cp": case "energy":
        this._hDrone(t, [NOTE(45), NOTE(46)], 0.34, 0.2, 0); return true;
      case "deliver":   // a hollow, descending non-resolution
        [NOTE(52), NOTE(49), NOTE(44)].forEach((f, i) => this._hDrone(t + i * 0.14, [f, f * 1.03], 0.4, 0.18, 0)); return true;
      case "phase":     // a rising unstable groan (something is coming)
        this._hRise(t, 60, 150, 0.7, 0.28); return true;
      case "travel":    // temporal shift = unstable, threatening pitch-warble whoosh
        this._hWarpWhoosh(t); return true;
      case "paradox":   // an intensified nightmare alarm, detuned, screaming, unstable
        this._hParadox(t); return true;
      case "wanted":    // still ominous, but let it pass to a dulled version
        return false;
      case "bell":      // a cracked, detuned death-knell instead of a shop bell
        this._hKnell(t); return true;
      case "heat": case "explode": case "terminate":
        return false;   // these are already dark; the muffled bus suffices
      default:
        return false;   // unhandled -> muffled normal sound
    }
  }
  // a short pair of clashing detuned tones (minor 2nd), instant "wrongness"
  _hDissonant(t, freqs, peak, dur) {
    freqs.forEach((f) => this._env("sawtooth", f, t, dur, peak / freqs.length, { filter: { freq: 900 } }));
  }
  // a low sustained groan/drone cluster with optional beating
  _hDrone(t, freqs, dur, peak, det = 0) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
    lp.connect(g); g.connect(this.sfxBus);
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det + i * 4;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  // an unnatural REVERSED swell, noise+tone that grows from nothing then cuts (a
  // sound played backwards; deeply uncanny for a simple UI action)
  _hReverseSwell(t, dur) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuf(); src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 3;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1400, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + dur);   // grows...
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02); // ...then abruptly gone
    src.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    src.start(t); src.stop(t + dur + 0.05);
    const o = ctx.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(240, t + dur);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.12, t + dur); og.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    o.connect(og); og.connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  // a dull, dead low thud
  _hThud(t, freq, peak) {
    const o = this.ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.45, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
    o.connect(lp); lp.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + 0.26);
  }
  // a small detuned dead tap
  _hTap(t, freq, peak) {
    this._env("square", freq, t, 0.05, Math.max(0.02, peak), { detune: 20, filter: { freq: 700 } });
  }
  // a slow rising groan, dread building
  _hRise(t, f0, f1, dur, peak) {
    const o = this.ctx.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const o2 = this.ctx.createOscillator(); o2.type = "sawtooth"; o2.detune.value = 18;
    o2.frequency.setValueAtTime(f0, t); o2.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + dur + 0.2); o2.start(t); o2.stop(t + dur + 0.2);
  }
  // an unstable, threatening temporal whoosh with wild pitch warble
  _hWarpWhoosh(t) {
    const ctx = this.ctx, dur = 0.9;
    const o = ctx.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(70, t + dur);
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 11;
    const lg = ctx.createGain(); lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t + dur);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 4;
    bp.frequency.setValueAtTime(1200, t); bp.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.26, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp); bp.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  // the horror paradox alarm, a screaming detuned cluster that destabilises
  _hParadox(t) {
    const ctx = this.ctx, dur = 1.4;
    [NOTE(41), NOTE(42), NOTE(47.5)].forEach((f) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f;
      o.frequency.linearRampToValueAtTime(f * 0.94, t + dur);   // sag downward, wrong
      o.detune.value = Math.random() * 24 - 12;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800;
      o.connect(lp); lp.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  // a cracked, detuned death-knell (replaces the merchant bell in horror)
  _hKnell(t) {
    const base = 260;
    [[1, 0.3, 2.4], [2.05, 0.18, 1.6], [2.71, 0.12, 1.2], [4.13, 0.08, 0.8]].forEach(([r, gn, dr]) => {
      const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.value = base * r; o.detune.value = -14;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gn, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dr);
      o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + dr + 0.05);
    });
  }

  // ── THE SEASCAPE: real surf (studio-rendered loop) + gulls + harbor life,
  //    only while the chart is open. The era music YIELDS to the sea. ──
  _seaBuffer() {
    if (this._seaBufP !== undefined) return this._seaBufP;
    const attempt = async () => {
      for (const url of shipped(["audio/ambience/seascape.ogg", "audio/ambience/seascape.wav"])) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          return await this.ctx.decodeAudioData(await r.arrayBuffer());
        } catch (e) { /* try next */ }
      }
      return null;
    };
    this._seaBufP = attempt();
    return this._seaBufP;
  }
  setSeascape(on) {
    on = !!on;
    if (!this.ready) { this._seaWant = on; return; }
    if (on === !!this._seaOn) return;
    this._seaOn = on;
    const t = this.ctx.currentTime;
    // the era music AND the desk/machine sfx yield while the chart fills the eyes
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.0001 : this.vol.music, t, 0.7);
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? this.vol.sfx * 0.22 : this.vol.sfx, t, 0.7);
    if (!on) {
      clearTimeout(this._gullT); clearTimeout(this._habT);
      if (this._seaNodes) {
        const nodes = this._seaNodes, t2 = this.ctx.currentTime;
        nodes.g.gain.cancelScheduledValues(t2); nodes.g.gain.setTargetAtTime(0.0001, t2, 0.5);
        setTimeout(() => nodes.stop && nodes.stop(), 1900);
        this._seaNodes = null;
      }
      return;
    }
    (async () => {
      const buf = await this._seaBuffer();
      if (!this._seaOn || this._seaNodes) return;
      const ctx = this.ctx, t0 = ctx.currentTime;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      if (buf) {   // the rendered surf: crashes, wash, depth, a real shoreline
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        src.connect(g); g.connect(this.seaBus || this.sfxBus);
        g.gain.setTargetAtTime(0.5, t0, 1.6);
        src.start(t0);
        this._seaNodes = { g, stop: () => { try { src.stop(); } catch (e) {} } };
      } else {     // fallback: synthesized bed
        const src = ctx.createBufferSource(); src.buffer = this._noiseBuf(); src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 0.4;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
        const lfoG = ctx.createGain(); lfoG.gain.value = 0.02;
        lfo.connect(lfoG); lfoG.connect(g.gain);
        src.connect(lp); lp.connect(g); g.connect(this.seaBus || this.sfxBus);
        g.gain.setTargetAtTime(0.09, t0, 1.4);
        src.start(t0); lfo.start(t0);
        this._seaNodes = { g, stop: () => { try { src.stop(); lfo.stop(); } catch (e) {} } };
      }
      const gull = () => {
        if (!this._seaOn) return;
        if (Math.random() < 0.9) this._gull();
        this._gullT = setTimeout(gull, 4000 + Math.random() * 6000);
      };
      this._gullT = setTimeout(gull, 1600 + Math.random() * 3000);
      const harbor = () => {   // rare port life: timbers lean, a far bell tolls
        if (!this._seaOn) return;
        const roll = Math.random();
        if (roll < 0.45) this.play("chart_creak");
        else if (roll < 0.62) this.play("chart_bell");
        this._habT = setTimeout(harbor, 11000 + Math.random() * 13000);
      };
      this._habT = setTimeout(harbor, 6000 + Math.random() * 8000);
    })();
  }
  _gull() {   // "kee-ahh", one to three cries, far off
    const ctx = this.ctx, t0 = ctx.currentTime;
    const cries = 1 + (Math.random() * 2 | 0);
    for (let i = 0; i < cries; i++) {
      const t = t0 + i * (0.3 + Math.random() * 0.12);
      const o = ctx.createOscillator(); o.type = "sawtooth";
      const f0 = 1150 + Math.random() * 250;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.35, t + 0.07);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.72, t + 0.3);
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = 2.4;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(bp); bp.connect(g); g.connect(this.seaBus || this.sfxBus);
      o.start(t); o.stop(t + 0.4);
    }
  }
  // level: the purr's loudness (a sleeping cat purrs softer than a petted one)
  purrLoop(on, level = 0.085) {
    if (!this.ctx || !this.master) return;
    if (on) {
      if (this._purrN) return;
      const c = this.ctx;
      const osc = c.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 52;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300;
      const g = c.createGain(); g.gain.value = 0.0001;
      const lfo = c.createOscillator(); lfo.frequency.value = 23;
      const lg = c.createGain(); lg.gain.value = 0.05;
      lfo.connect(lg); lg.connect(g.gain);
      osc.connect(lp); lp.connect(g); g.connect(this.master);
      osc.start(); lfo.start();
      g.gain.linearRampToValueAtTime(level, c.currentTime + 0.7);
      this._purrN = { osc, lfo, g };
    } else if (this._purrN) {
      const n = this._purrN; this._purrN = null;
      try { n.g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.55); } catch (e) {}
      setTimeout(() => { try { n.osc.stop(); n.lfo.stop(); } catch (e) {} }, 750);
    }
  }

  play(name, opt = {}) {
    if (!this.ready || this.muted || this.quiet) return;
    if (this.ctx.state === "suspended") return;
    const t = this.ctx.currentTime;
    // never a pile-up: the same sound again within 60 ms is dropped, and no more than 6 sounds
    // start in any 150 ms (a burst of events becomes one clean hit, not a wall of noise)
    const nowMs = t * 1000, last = (this._lastAt || (this._lastAt = {}))[name];
    if (last != null && nowMs - last < 60) return;
    const recent = (this._recent || (this._recent = [])).filter((x) => nowMs - x < 150);
    if (recent.length >= 6) { this._recent = recent; return; }
    recent.push(nowMs); this._recent = recent; this._lastAt[name] = nowMs;
    // HORROR STATE, the whole audio identity changes. Every UI sound is reinterpreted
    // through an unnatural, dread aesthetic (see _horrorSfx). If it handles the name,
    // we return; anything it doesn't override still passes through the muffled bus.
    if (this.mood === "horror" && this._horrorSfx(name, t)) return;
    switch (name) {
      case "click":    this._env("triangle", 380, t, 0.06, 0.25); break;
      case "hover":    this._env("sine", 1180, t, 0.028, 0.035, { filter: { type: "highpass", freq: 700 } }); break;
      case "tap":      this._env("triangle", 340, t, 0.05, 0.15, { filter: { freq: 1300 } }); this._env("square", 520, t, 0.03, 0.05); break;
      case "lift":     this._env("triangle", 480, t, 0.06, 0.12, { sweepTo: 720 }); this._env("sine", 900, t + 0.01, 0.04, 0.05); break;
      case "whiff":    this._env("sine", 620, t, 0.14, 0.06, { sweepTo: 260, filter: { type: "bandpass", freq: 520 } }); break;
      case "pan": {   // a soft airy whoosh as the camera turns to another scene
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
        const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8;
        bp.frequency.setValueAtTime(950, t); bp.frequency.exponentialRampToValueAtTime(300, t + 0.32);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.07, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
        src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + 0.4);
        break;
      }
      /* ── THE CHART SPEAKS PAPER & WATER (Paradox Sea vocabulary) ── */
      case "quill": {   // the pen scratches a course onto the chart; rides the stroke
        const dur = Math.min(2.6, Math.max(0.35, (opt.dur || 700) / 1000));
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(); src.loop = true;
        const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3400; bp.Q.value = 1.6;
        const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        const seg = Math.max(4, Math.round(dur * 7));   // nib pressure wobbles per stroke
        for (let i = 1; i <= seg; i++) {
          const tt = t + dur * i / seg;
          g.gain.linearRampToValueAtTime(i === seg ? 0.0001 : 0.028 + 0.026 * ((i * 7919) % 97) / 97, tt);
        }
        src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(this.sfxBus);
        src.start(t); src.stop(t + dur + 0.05);
        break;
      }
      case "chart_splash": {   // landfall, the water takes the hull's push
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
        const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass";
        lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.3);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        src.connect(lp); lp.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + 0.4);
        this._env("sine", 300, t + 0.05, 0.12, 0.05, { sweepTo: 180 });
        break;
      }
      case "chart_stamp":   // a decision pressed into paper, dull, certain
        this._env("sine", 130, t, 0.09, 0.3, { sweepTo: 70, filter: { freq: 500 } });
        {
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 1.2;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
          src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + 0.08);
        }
        break;
      case "chart_brush": {   // a dry brush over paper, that mark is not an option
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
        const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2400;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        src.connect(hp); hp.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + 0.2);
        break;
      }
      case "chart_creak":   // old timbers lean, the barge gets underway
        this._env("sawtooth", 68, t, 0.5, 0.09, { sweepTo: 96, filter: { type: "bandpass", freq: 240 } });
        this._env("sawtooth", 54, t + 0.16, 0.4, 0.06, { sweepTo: 44, filter: { type: "bandpass", freq: 190 } });
        break;
      case "chart_bell": {   // a far-off harbor bell, arrival, or a restoration
        const base = opt.warm ? 392 : 470;
        [[1, 0.10], [2.76, 0.045], [5.4, 0.02]].forEach(([r, gn]) =>
          this._env("sine", base * r, t, 1.1, gn, { filter: { freq: 2400 } }));
        if (opt.warm) [[1.25, 0.07], [3.0, 0.03]].forEach(([r, gn]) =>
          this._env("sine", base * r, t + 0.35, 0.9, gn, { filter: { freq: 2200 } }));
        break;
      }
      case "sea_monster": {   // something vast turns beneath the hull
        [[46, .13], [61.5, .09], [92, .05]].forEach(([f, gn]) => {
          const o = this.ctx.createOscillator(); o.type = "sawtooth";
          o.frequency.setValueAtTime(f, t);
          o.frequency.linearRampToValueAtTime(f * 1.18, t + 0.5);
          o.frequency.linearRampToValueAtTime(f * 0.82, t + 1.15);
          const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(gn, t + 0.22); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
          o.connect(lp); lp.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + 1.3);
        });
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
        const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass";
        bp.frequency.setValueAtTime(240, t); bp.frequency.exponentialRampToValueAtTime(90, t + 0.9); bp.Q.value = 2;
        const g2 = this.ctx.createGain(); g2.gain.setValueAtTime(0.0001, t);
        g2.gain.linearRampToValueAtTime(0.06, t + 0.15); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
        src.connect(bp); bp.connect(g2); g2.connect(this.sfxBus); src.start(t); src.stop(t + 1.05);
        break;
      }
      case "sea_storm": {   // the boom AS WEATHER: crack, long roll, rain wash
        const crk = this.ctx.createBufferSource(); crk.buffer = this._noiseBuf();
        const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.24, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        crk.connect(hp); hp.connect(g); g.connect(this.sfxBus); crk.start(t); crk.stop(t + 0.2);
        const rol = this.ctx.createBufferSource(); rol.buffer = this._noiseBuf(); rol.loop = true;
        const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass";
        lp.frequency.setValueAtTime(340, t); lp.frequency.exponentialRampToValueAtTime(70, t + 1.6);
        const g2 = this.ctx.createGain(); g2.gain.setValueAtTime(0.0001, t + 0.05);
        g2.gain.linearRampToValueAtTime(0.19, t + 0.3); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
        rol.connect(lp); lp.connect(g2); g2.connect(this.sfxBus); rol.start(t); rol.stop(t + 2);
        const rn = this.ctx.createBufferSource(); rn.buffer = this._noiseBuf(); rn.loop = true;
        const bp3 = this.ctx.createBiquadFilter(); bp3.type = "bandpass"; bp3.frequency.value = 3000; bp3.Q.value = 0.5;
        const g3 = this.ctx.createGain(); g3.gain.setValueAtTime(0.0001, t + 0.1);
        g3.gain.linearRampToValueAtTime(0.028, t + 0.5); g3.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        rn.connect(bp3); bp3.connect(g3); g3.connect(this.sfxBus); rn.start(t); rn.stop(t + 1.8);
        break;
      }
      case "sea_sail": {   // the hull shoulders through the water (rides the stroke)
        const dur = Math.min(2.6, Math.max(0.4, (opt.dur || 900) / 1000));
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(); src.loop = true;
        const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 480; bp.Q.value = 0.7;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.045, t + dur * 0.25);
        g.gain.setValueAtTime(0.045, t + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = 1.7;
        const lg = this.ctx.createGain(); lg.gain.value = 0.015;
        lfo.connect(lg); lg.connect(g.gain);
        src.connect(bp); bp.connect(g); g.connect(this.sfxBus);
        src.start(t); src.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur);
        break;
      }
      case "sea_treasure": {   // the relic settles among coin
        for (let i = 0; i < 7; i++) {
          const tt = t + 0.045 * i + Math.random() * 0.02;
          this._env("square", 2100 + Math.random() * 900, tt, 0.05, 0.032, { filter: { type: "highpass", freq: 1500 } });
        }
        this._env("sine", 160, t, 0.12, 0.16, { sweepTo: 90 });
        break;
      }
      case "chart_rumble": {   // thunder rolls somewhere past the chart's edge
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(); src.loop = true;
        const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 130;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.18); g.gain.linearRampToValueAtTime(0.1, t + 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
        src.connect(lp); lp.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + 1.05);
        break;
      }
      case "place":    this._env("square", 220, t, 0.05, 0.18, { filter: { freq: 900 } }); break;
      case "socket": {
        // The Thanos moment, setting a causality stone into the gauntlet: a deep
        // sub CHUNK + a hard metallic clink + a resonant socket ring + a rising
        // power shimmer that climbs with the die's strength (opt.power 0..1).
        const pw = Math.max(0, Math.min(1, opt.power ?? 0.5));
        this._env("sine", 150, t, 0.24, 0.36, { sweepTo: 46, filter: { freq: 380 } });   // sub boom
        this._env("triangle", 92, t, 0.14, 0.20, { filter: { freq: 300 } });             // body weight
        {                                                                                 // metallic clink transient
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 5;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.24, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
          src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + 0.1);
        }
        [[1, 0.15, 0.5], [2.03, 0.10, 0.4], [3.4, 0.05, 0.3]].forEach(([r, gn, dr]) =>   // inharmonic ring
          this._env("sine", 520 * r, t + 0.012, dr, gn));
        this._env("sine", 700 + pw * 520, t + 0.02, 0.3 + pw * 0.28, 0.05 + pw * 0.11,   // power shimmer
                  { sweepTo: 1500 + pw * 1500 });
        break;
      }
      case "dice":
        for (let i = 0; i < 4; i++) this._env("triangle", 300 + Math.random() * 260, t + i * 0.05, 0.06, 0.18);
        break;
      case "confirm":  this._env("sine", NOTE(69), t, 0.12, 0.3); this._env("sine", NOTE(76), t + 0.07, 0.18, 0.28); break;
      case "phase":    this._env("sine", NOTE(57), t, 0.5, 0.22, { sweepTo: NOTE(64) }); break;
      case "coin":     this._env("square", NOTE(88), t, 0.07, 0.2); this._env("square", NOTE(93), t + 0.06, 0.1, 0.18); break;
      case "cp":       this._env("sine", NOTE(84), t, 0.18, 0.3); this._env("sine", NOTE(91), t + 0.08, 0.22, 0.28); break;
      case "deliver":  this._env("sine", NOTE(72), t, 0.18, 0.28); this._env("sine", NOTE(79), t + 0.09, 0.2, 0.26); this._env("sine", NOTE(84), t + 0.18, 0.24, 0.24); break;
      case "energy":   this._env("triangle", NOTE(67), t, 0.16, 0.22, { sweepTo: NOTE(74) }); break;
      case "travel":   // rising temporal whoosh
        this._env("sawtooth", 180, t, 0.7, 0.18, { sweepTo: 1300, filter: { type: "bandpass", freq: 800 } });
        this._env("sine", 90, t, 0.7, 0.12, { sweepTo: 600 });
        break;
      case "paradox":  // low dissonant alarm, two detuned tones + a beat
        this._env("sawtooth", NOTE(41), t, 1.0, 0.3, { filter: { freq: 700 } });
        this._env("sawtooth", NOTE(42), t, 1.0, 0.28, { detune: 12, filter: { freq: 700 } });
        this._env("square", NOTE(53), t + 0.0, 0.25, 0.22);
        this._env("square", NOTE(53), t + 0.35, 0.25, 0.22);
        break;
      case "heat":     this._env("sawtooth", 140, t, 0.2, 0.18, { sweepTo: 90, filter: { freq: 500 } }); break;
      case "explode":  this._env("sawtooth", 120, t, 0.6, 0.32, { sweepTo: 40, filter: { freq: 600 } }); break;
      case "wanted": {
        // Old-West sting: a harmonica-ish bend + a little saloon-piano triad fall.
        this._env("sawtooth", NOTE(64), t, 0.5, 0.22, { sweepTo: NOTE(67), filter: { type: "bandpass", freq: 1100 } });
        [76, 72, 67].forEach((n, i) => this._env("triangle", NOTE(n), t + 0.18 + i * 0.13, 0.22, 0.2));
        this._env("sine", NOTE(43), t + 0.18, 0.7, 0.16);  // low drone
        break;
      }
      case "bell": {   // shopkeeper's counter bell, a bright, clear DING-ding with
        // inharmonic partials (real bells aren't harmonic) + a noise strike "ting".
        const base = 1046;
        const parts = [[1, 0.42, 1.5], [2.0, 0.26, 1.1], [2.76, 0.18, 0.9],
                       [3.76, 0.12, 0.6], [5.43, 0.07, 0.45]];
        const strike = (st, vol) => {
          parts.forEach(([r, gn, dr]) => this._env("sine", base * r, st, dr, gn * vol));
          // a short metallic noise transient gives the clapper "ting"
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const f = this.ctx.createBiquadFilter(); f.type = "bandpass";
          f.frequency.value = base * 2.4; f.Q.value = 3;
          const ng = this.ctx.createGain();
          ng.gain.setValueAtTime(0.18 * vol, st);
          ng.gain.exponentialRampToValueAtTime(0.0001, st + 0.06);
          src.connect(f); f.connect(ng); ng.connect(this.sfxBus);
          src.start(st); src.stop(st + 0.08);
        };
        strike(t, 1.0);
        strike(t + 0.20, 0.6);
        break;
      }
      case "merchant_step": // a heavily-loaded cart wheel crossing one century:
        // a low wooden thud + a short axle creak, with an occasional bag-of-coins
        // chink so each rolling space feels laden, not a thin plink.
        this._env("triangle", 126 + Math.random() * 32, t, 0.13, 0.14, { filter: { freq: 480 } });
        this._env("triangle", 96, t, 0.10, 0.08, { filter: { freq: 300 } });   // low body weight
        this._env("sawtooth", 300 + Math.random() * 60, t + 0.02, 0.16, 0.05,
                  { sweepTo: 205, filter: { type: "bandpass", freq: 700 } });   // axle creak
        if (Math.random() < 0.55) {   // coins settling in a heavy bag
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3400; bp.Q.value = 7;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.07, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
          src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(t + 0.05); src.stop(t + 0.19);
        }
        break;
      case "merchant_pack": {
        // The Merchant HURRIEDLY packs up before departing: crates dragged + stacked,
        // heavy coin bags dropped and jingling, odd wares clattering, drawers/lids
        // banging, a leather strap cinched tight. Busy, laden, characterful.
        // crate drags + thuds
        [0.0, 0.28, 0.62, 0.95].forEach((d, i) => {
          this._env("triangle", 150 - i * 10, t + d, 0.16, 0.15, { sweepTo: 90, filter: { freq: 620 } });
          // a drag = short filtered-noise scrape before the thud
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 1.5;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t + d - 0.12);
          g.gain.linearRampToValueAtTime(0.08, t + d - 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02);
          src.connect(bp); bp.connect(g); g.connect(this.sfxBus);
          try { src.start(Math.max(t, t + d - 0.12)); src.stop(t + d + 0.05); } catch (_) {}
        });
        // heavy coin bags dropped + jingling
        const bag = (st) => {
          this._env("triangle", 90, st, 0.12, 0.13, { filter: { freq: 260 } });   // the drop
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3500; bp.Q.value = 6;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.16, st + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.3);
          src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(st + 0.02); src.stop(st + 0.33);
        };
        bag(t + 0.4); bag(t + 1.05);
        // wares clatter (glass + trinkets)
        [1900, 2600, 3300].forEach((f, i) => this._env("sine", f, t + 0.7 + i * 0.05, 0.1, 0.05));
        this._env("sine", 2100, t + 1.25, 0.1, 0.05);
        // lid/drawer bang
        this._env("triangle", 180, t + 1.3, 0.1, 0.14, { sweepTo: 110, filter: { freq: 700 } });
        // leather strap cinched tight (rising stretch)
        {
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass";
          bp.frequency.setValueAtTime(650, t + 1.45); bp.frequency.linearRampToValueAtTime(1500, t + 1.75); bp.Q.value = 2.4;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t + 1.45);
          g.gain.linearRampToValueAtTime(0.11, t + 1.58); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.82);
          src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(t + 1.45); src.stop(t + 1.86);
        }
        break;
      }
      case "merchant_teleport": {
        // The temporal teleportation on arrival, a shimmering whoosh that sucks
        // inward and POPS out of time, with a sparkling quantum tail.
        const dur = 0.9;
        // inward suck (falling filtered whoosh)
        this._env("sawtooth", 900, t, dur, 0.16, { sweepTo: 120, filter: { type: "bandpass", freq: 900 } });
        this._env("sine", 300, t, dur, 0.12, { sweepTo: 60 });
        // the POP out of time
        this._env("sine", 140, t + dur * 0.72, 0.16, 0.22, { sweepTo: 1400 });
        // sparkling quantum shimmer tail (bright bell partials rising away)
        [1200, 1700, 2300, 3100].forEach((f, i) =>
          this._env("sine", f, t + dur * 0.7 + i * 0.05, 0.4, 0.06, { sweepTo: f * 1.6 }));
        // a soft airy noise burst at the vanish
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
        const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7 + 0.35);
        src.connect(hp); hp.connect(g); g.connect(this.sfxBus); src.start(t + dur * 0.7); src.stop(t + dur * 0.7 + 0.37);
        break;
      }
      case "cart": {
        // A whole travelling wagon on the move: wheels rolling, wood creaking,
        // crates shifting, coins jingling, a leather strap tightening, the odd clink.
        const dur = 2.0;
        // wheel rumble (low noise roll)
        {
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(); src.loop = true;
          const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 240; lp.Q.value = 1.2;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.24, t + 0.3);
          g.gain.setValueAtTime(0.24, t + dur - 0.5);
          g.gain.linearRampToValueAtTime(0.0001, t + dur);
          src.connect(lp); lp.connect(g); g.connect(this.sfxBus);
          src.start(t); src.stop(t + dur + 0.1);
        }
        // wheel thuds (heavy wooden, rhythmic)
        for (let i = 0; i < 7; i++)
          this._env("triangle", 118 + Math.random() * 26, t + 0.14 + i * 0.26, 0.12, 0.14, { filter: { freq: 450 } });
        // axle creaks
        this._env("sawtooth", 210, t + 0.3, 0.6, 0.09, { sweepTo: 150, filter: { type: "bandpass", freq: 520 } });
        this._env("sawtooth", 200, t + 1.15, 0.5, 0.07, { detune: 12, sweepTo: 150, filter: { type: "bandpass", freq: 520 } });
        // crate/wood shifts
        [0.5, 1.4].forEach((d) => this._env("triangle", 190, t + d, 0.1, 0.13, { sweepTo: 120, filter: { freq: 800 } }));
        // coins jingling (bright metallic noise bursts)
        const jingle = (st) => {
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3600; bp.Q.value = 6;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12, st); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.14);
          src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(st); src.stop(st + 0.16);
        };
        [0.6, 0.72, 0.82, 1.5, 1.62].forEach(jingle);
        // leather strap tightening (rising filtered-noise stretch)
        {
          const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
          const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass";
          bp.frequency.setValueAtTime(700, t + 0.9); bp.frequency.linearRampToValueAtTime(1500, t + 1.2); bp.Q.value = 2;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t + 0.9);
          g.gain.linearRampToValueAtTime(0.09, t + 1.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.28);
          src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(t + 0.9); src.stop(t + 1.32);
        }
        // a glass clink among the wares
        this._env("sine", 2100, t + 1.05, 0.12, 0.06);
        this._env("sine", 3300, t + 1.08, 0.10, 0.04);
        break;
      }
      case "crack": {  // a sharp wood/reality snap, the sign being ripped from its hook
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
        const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 1.2;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.34, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        src.connect(bp); bp.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + 0.14);
        this._env("sawtooth", 260, t, 0.14, 0.17, { sweepTo: 70, filter: { freq: 700 } });
        break;
      }
      case "glass": {  // shattering glass, bright noise burst + falling inharmonic shards
        const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf();
        const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        src.connect(hp); hp.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + 0.32);
        [5200, 4300, 6100, 3700, 7000].forEach((f, i) => this._env("sine", f, t + 0.02 + i * 0.04, 0.12, 0.05));
        break;
      }
      case "creak":    // wooden door/awning creak, a slow detuned bandpass groan
        this._env("sawtooth", 220, t, 0.55, 0.10, { sweepTo: 150, filter: { type: "bandpass", freq: 520 } });
        this._env("sawtooth", 224, t, 0.55, 0.07, { detune: 14, sweepTo: 158, filter: { type: "bandpass", freq: 520 } });
        break;
      case "wood":     // a hollow wooden knock, the OPEN sign settling on its hook
        this._env("triangle", 200, t, 0.12, 0.16, { sweepTo: 120, filter: { freq: 900 } });
        this._env("sine", 95, t, 0.10, 0.10);
        break;
      case "dice_roll":   // quantum-computer materialisation: rising digital glitch
        for (let i = 0; i < 9; i++)
          this._env("square", 400 + Math.random() * 1400, t + i * 0.045, 0.04, 0.07,
                    { filter: { type: "bandpass", freq: 1200 } });
        this._env("sine", 220, t, 0.42, 0.1, { sweepTo: 900 });
        break;
      case "dice_lock":   // result snaps into being
        this._env("triangle", NOTE(81), t, 0.14, 0.22, { sweepTo: NOTE(88) });
        this._env("square", NOTE(93), t + 0.02, 0.08, 0.12);
        break;
      case "terminate":this._env("sawtooth", NOTE(50), t, 0.8, 0.3, { sweepTo: NOTE(36), filter: { freq: 700 } }); break;
      case "victory":
        [69, 73, 76, 81].forEach((n, i) => this._env("sine", NOTE(n), t + i * 0.13, 0.5, 0.3));
        break;
      case "purr": {   // a low amplitude-modulated rumble, a contented cat
        const dur = 2.2;
        const o = this.ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 55;
        const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 330;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.3);
        g.gain.setValueAtTime(0.15, t + dur - 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        const lfo = this.ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 26;
        const lg = this.ctx.createGain(); lg.gain.value = 0.085; lfo.connect(lg); lg.connect(g.gain);
        o.connect(lp); lp.connect(g); g.connect(this.sfxBus);
        o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
        break;
      }
      case "meow": {   // a small rising-then-falling chirp
        const o = this.ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(740, t + 0.14);
        o.frequency.linearRampToValueAtTime(430, t + 0.4);
        const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 4.5;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.13, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(bp); bp.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + 0.55);
        break;
      }
      default: break;
    }
  }

  /* ----------------------------- Music ----------------------------------- */
  // Bar-by-bar generative scheduler. Each tick lays down one bar of music from
  // the current era preset; the bar length sets the pace. Because every voice is
  // chosen probabilistically from a random walk over the era's scale, the output
  // evolves for minutes without an audible loop.
  _startMusic() {
    if (!this.ready) return;
    const tick = () => {
      if (!this.ready) return;
      const cfg = this.cfg || ERA_MUSIC[DEFAULT_ERA];
      // When a real asset track is playing, the synthesizer stays silent (the asset
      // IS the music); it resumes automatically if no file exists for the new mood.
      if (!this.muted && !this.quiet && !this._assetActive && this.ctx.state === "running") {
        try { this._bar(cfg); } catch (_) { /* never let a synth glitch kill the loop */ }
      }
      this._step++;
      this._musicTimer = setTimeout(tick, cfg.bar);
    };
    tick();
  }

  /* --- scale / pitch helpers --- */
  _deg2note(root, scale, deg) {
    const n = scale.length;
    const oct = Math.floor(deg / n);
    const idx = ((deg % n) + n) % n;
    return root + oct * 12 + scale[idx];
  }
  _wpick(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  // Pick the next chord degree by weighted random, biased away from the last one.
  _nextDegree(cfg) {
    const degs = cfg.degrees, w = cfg.degWeights.slice();
    const last = this._degHist[this._degHist.length - 1];
    for (let i = 0; i < degs.length; i++) if (degs[i] === last) w[i] *= 0.25;
    const d = this._wpick(degs, w);
    this._degHist.push(d);
    if (this._degHist.length > 4) this._degHist.shift();
    return d;
  }

  // One bar: choose/keep the chord, voice a slow pad + low drone, and at most one
  // gentle lead note. Deliberately sparse so the music stays calm and spacious.
  _bar(cfg) {
    const ctx = this.ctx, t = ctx.currentTime + 0.06;
    const bar = cfg.bar / 1000;
    // A very slow swell breathes the texture in and out over many bars.
    const swell = 0.62 + 0.38 * Math.sin((this._step / (cfg.swellBars || 10)) * Math.PI * 2);

    if (this._curDeg == null || Math.random() < (cfg.modProb ?? 0.25))
      this._curDeg = this._nextDegree(cfg);
    const root = cfg.root + this._curDeg;

    // A steady reedy drone (hurdy-gurdy / bagpipe) pinned to the ERA TONIC, it never
    // modulates with the chord, which is exactly what makes it sound medieval.
    if (cfg.drone) this._droneVoice(cfg.root, cfg.drone, t, bar + 0.9, swell);
    if (cfg.pad) {
      const notes = cfg.pad.voices.map((iv) => root + iv);
      // The pad's *kind* picks the instrument so older eras sound acoustic, not synth.
      if (cfg.pad.kind === "strings") this._stringEnsemble(notes, cfg.pad, t, bar + 0.7, swell);
      else this._pad(notes, cfg.pad, t, bar + 0.7, swell);
    }
    if (cfg.bass) this._bassNote(root, cfg.bass, t, bar);
    if (cfg.lead && Math.random() < cfg.lead.prob) this._lead(root, cfg, t, bar, swell);
    if (cfg.recorder && Math.random() < cfg.recorder.prob) this._recorder(root, cfg, t, bar, swell);
    if (cfg.choir && Math.random() < cfg.choir.prob)
      this._choir(cfg.choir.voices.map((iv) => root + iv), t, bar + 0.6, cfg.choir.level, swell);
    if (cfg.perc) this._percPhrase(cfg.perc, t, bar, swell);
    if (cfg.gallop && Math.random() < cfg.gallop.prob) this._gallop(cfg.gallop.level * swell, t, bar);
    if (cfg.guitar && Math.random() < cfg.guitar.prob) this._guitarArp(root, cfg, t, bar);
    if (cfg.harmonica && Math.random() < cfg.harmonica.prob)
      this._harmonica(cfg.harmonica.voices.map((iv) => root + iv), cfg.harmonica.level * swell, t, bar);
    if (cfg.hornCall && Math.random() < cfg.hornCall.prob) this._hornCall(root, cfg, t, bar);
    if (cfg.horror) this._horrorBed(root, t, bar);
    // Occasional dread, a low dissonant swell evoking the Paradix creatures. Rare
    // enough not to disturb the calm bed; present in every era.
    if (Math.random() < (cfg.dark ?? 0)) this._darkMotif(root, t, bar);
  }

  // Western twangy guitar, a short descending arpeggio of plucked notes with a
  // bright bandpass "twang", spaced across the first half of the bar.
  _guitarArp(root, cfg, t, bar) {
    const G = cfg.guitar, n = G.notes || 3;
    let when = t + bar * (0.05 + Math.random() * 0.12);
    let deg = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const note = this._deg2note(root, cfg.scale, deg) + (G.octave || 0);
      const o = this.ctx.createOscillator(); o.type = "triangle"; o.frequency.value = NOTE(note);
      const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = NOTE(note) * 2.2; f.Q.value = 4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(G.level, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, when + (G.decay || 0.9));
      o.connect(f); f.connect(g); g.connect(this.musicBus);
      o.start(when); o.stop(when + (G.decay || 0.9) + 0.05);
      when += bar * (0.10 + Math.random() * 0.06);
      deg -= 1 + (Math.random() < 0.4 ? 1 : 0);
      if (deg < 0) deg += 5;
    }
  }

  // Wailing HARMONICA chord, stacked reedy voices (sawtooth through a nasal
  // band-pass) with a shared vibrato and a slow pitch "bend" up into the note, then
  // a fall. The soul of the Old-West sound.
  _harmonica(notes, level, t, bar) {
    const ctx = this.ctx;
    const st = t + bar * (0.08 + Math.random() * 0.18);
    const dur = Math.min(2.6, bar * 0.62);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, st);
    g.gain.linearRampToValueAtTime(level, st + 0.35);
    g.gain.setValueAtTime(level, st + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, st + dur);
    // nasal reed formant
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 1.1;
    const peak = ctx.createBiquadFilter(); peak.type = "peaking"; peak.frequency.value = 900; peak.Q.value = 0.8; peak.gain.value = 7;
    bp.connect(peak); peak.connect(g); g.connect(this.musicBus);
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 5.6;
    const lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg); lfo.start(st); lfo.stop(st + dur + 0.2);
    notes.forEach((n) => {
      for (const d of [-7, 6]) {
        const o = ctx.createOscillator(); o.type = "sawtooth";
        const f = NOTE(n + 12);
        o.frequency.setValueAtTime(f * 0.94, st);           // bend UP into pitch
        o.frequency.linearRampToValueAtTime(f, st + 0.3);
        o.frequency.setValueAtTime(f, st + dur * 0.7);
        o.frequency.linearRampToValueAtTime(f * 0.99, st + dur);  // slight fall
        o.detune.value = d; lg.connect(o.detune);
        const og = ctx.createGain(); og.gain.value = 0.5 / notes.length;
        o.connect(og); og.connect(bp);
        o.start(st); o.stop(st + dur + 0.2);
      }
    });
  }

  // Morricone muted-TRUMPET call, a bold, brassy 3-note motif (a "coyote howl")
  // with a buzzy sawtooth through a bright band-pass and a hard attack.
  _hornCall(root, cfg, t, bar) {
    const ctx = this.ctx, L = cfg.hornCall;
    const phrase = [ [4, 0.42], [7, 0.30], [4, 0.6] ];   // sol -> do' -> sol (falling call)
    let when = t + bar * (0.12 + Math.random() * 0.2);
    phrase.forEach(([deg, hold]) => {
      const n = this._deg2note(root, cfg.scale, deg) + 12;
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = NOTE(n);
      const o2 = ctx.createOscillator(); o2.type = "square"; o2.frequency.value = NOTE(n); o2.detune.value = 6;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = NOTE(n) * 2.4; bp.Q.value = 3.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(L.level, when + 0.04);
      g.gain.setValueAtTime(L.level, when + hold * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, when + hold);
      o.connect(bp); o2.connect(bp); bp.connect(g); g.connect(this.musicBus);
      // a touch of vibrato on the sustained tail
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 6;
      const lg = ctx.createGain(); lg.gain.value = NOTE(n) * 0.008;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(when); lfo.stop(when + hold + 0.05);
      o.start(when); o.stop(when + hold + 0.05); o2.start(when); o2.stop(when + hold + 0.05);
      when += hold + 0.04;
    });
  }

  // Galloping hoofbeat, a "da-da-dum" clop rhythm of short muted wooden hits,
  // repeated across the bar. Drives the Old-West momentum.
  _gallop(level, t, bar) {
    const pattern = [0, 0.12, 0.24, 0.55, 0.67, 0.79];   // two triplet gallops
    pattern.forEach((frac, i) => {
      const when = t + bar * frac;
      const accent = (i % 3 === 2) ? 1 : 0.6;
      const o = this.ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(150, when); o.frequency.exponentialRampToValueAtTime(60, when + 0.09);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(Math.max(0.001, level * accent), when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);
      const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
      o.connect(f); f.connect(g); g.connect(this.musicBus);
      o.start(when); o.stop(when + 0.13);
    });
  }

  // Continuous reedy DRONE (hurdy-gurdy / bagpipe), an open fifth held on the era
  // tonic, buzzy sawtooths through a nasal formant. Bars overlap so it never gaps.
  _droneVoice(root, d, t, dur, swell = 1) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const peak = (d.level || 0.1) * (0.75 + 0.25 * swell);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.6);
    g.gain.setValueAtTime(peak, t + dur - 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 640; bp.Q.value = 0.8;
    const form = ctx.createBiquadFilter(); form.type = "peaking"; form.frequency.value = 1150; form.Q.value = 1; form.gain.value = 8;
    bp.connect(form); form.connect(g); g.connect(this.musicBus);
    (d.voices || [0, 7]).forEach((iv) => {
      for (const det of [-5, 5]) {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = NOTE(root + iv - 12); o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = 0.4 / (d.voices || [0, 7]).length;
        o.connect(og); og.connect(bp);
        o.start(t); o.stop(t + dur + 0.2);
      }
    });
  }

  // Wooden RECORDER / flute, a soft breathy sustained line with a gentle vibrato
  // and a puff of breath noise on the attack. A period counter-melody to the lute.
  _recorder(root, cfg, t, bar, swell) {
    const R = cfg.recorder;
    this._melDeg += this._wpick([-2, -1, 0, 1, 2], [2, 3, 2, 3, 2]);
    this._melDeg = Math.max(0, Math.min(R.span || 6, this._melDeg));
    const n = this._deg2note(root, cfg.scale, this._melDeg) + (R.octave || 24);
    const st = t + bar * (0.3 + Math.random() * 0.25);
    const dur = Math.min(2.2, bar * 0.5);
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = NOTE(n);
    // a light odd-harmonic edge so it reads as a wooden pipe, not a pure sine
    const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = NOTE(n) * 2; o2.detune.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, st);
    g.gain.linearRampToValueAtTime(R.level * swell, st + 0.12);
    g.gain.setValueAtTime(R.level * swell, st + dur * 0.65);
    g.gain.linearRampToValueAtTime(0.0001, st + dur);
    const o2g = ctx.createGain(); o2g.gain.value = 0.18;
    o.connect(g); o2.connect(o2g); o2g.connect(g); g.connect(this.musicBus);
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 5.2;
    const lg = ctx.createGain(); lg.gain.value = NOTE(n) * 0.006;
    lfo.connect(lg); lg.connect(o.frequency); lfo.start(st); lfo.stop(st + dur);
    o.start(st); o.stop(st + dur + 0.1); o2.start(st); o2.stop(st + dur + 0.1);
    // breath transient
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuf();
    const bpf = ctx.createBiquadFilter(); bpf.type = "bandpass"; bpf.frequency.value = 2400; bpf.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(R.level * 0.5, st); ng.gain.exponentialRampToValueAtTime(0.0001, st + 0.12);
    src.connect(bpf); bpf.connect(ng); ng.connect(this.musicBus); src.start(st); src.stop(st + 0.14);
  }

  // Horror bed, the heavy, oppressive ambience that says reality is WRONG: a deep
  // pulsing sub-drone, a breathy wind/whisper, disembodied whisper-syllables, a
  // strange metallic resonance ring, and now and then a shrieking dissonant sting.
  _horrorBed(root, t, bar) {
    const ctx = this.ctx;
    // Deep, slowly-throbbing sub drone, a physical pressure under everything.
    {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = NOTE(root - 24);
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = NOTE(root - 24) * 1.012; // beating
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + bar * 0.45);
      g.gain.linearRampToValueAtTime(0.05, t + bar);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 120;
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.musicBus);
      o.start(t); o.stop(t + bar + 0.2); o2.start(t); o2.stop(t + bar + 0.2);
    }
    // Wind/whisper: filtered noise that slowly opens and closes.
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuf(); src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.setValueAtTime(380, t); bp.frequency.linearRampToValueAtTime(680, t + bar * 0.5);
    bp.frequency.linearRampToValueAtTime(300, t + bar); bp.Q.value = 1.4;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.055, t + bar * 0.4);
    ng.gain.linearRampToValueAtTime(0.0001, t + bar);
    src.connect(bp); bp.connect(ng); ng.connect(this.musicBus);
    src.start(t); src.stop(t + bar + 0.1);
    // Disembodied WHISPER, a short burst of vowel-formant noise that swells past you.
    if (Math.random() < 0.5) this._whisper(t + bar * (0.15 + Math.random() * 0.6));
    // A strange metallic RESONANCE, a struck inharmonic ring that hangs and decays.
    if (Math.random() < 0.35) {
      const st = t + bar * (0.3 + Math.random() * 0.5);
      const base = 300 + Math.random() * 400;
      [1, 2.41, 3.86, 5.2].forEach((r, i) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = base * r;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.03 / (i + 1), st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 2.6 - i * 0.3);
        o.connect(g); g.connect(this.musicBus); o.start(st); o.stop(st + 2.7);
      });
    }
    // Occasional shriek, high detuned sawtooth cluster that swells and falls.
    if (Math.random() < 0.2) {
      const st = t + bar * (0.2 + Math.random() * 0.4);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, st);
      sg.gain.linearRampToValueAtTime(0.07, st + 0.6);
      sg.gain.exponentialRampToValueAtTime(0.0001, st + 1.8);
      const hp = ctx.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 2200; hp.Q.value = 2;
      sg.connect(hp); hp.connect(this.musicBus);
      for (const semi of [0, 1, 6]) {
        const o = ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.value = NOTE(root + 36 + semi);
        o.frequency.linearRampToValueAtTime(NOTE(root + 33 + semi), st + 1.8);  // sliding down
        o.detune.value = Math.random() * 16 - 8;
        o.connect(sg); o.start(st); o.stop(st + 1.9);
      }
    }
  }

  // A single disembodied WHISPER, band-passed noise pushed through two shifting
  // vowel formants so it reads as a hushed, wordless voice drifting past.
  _whisper(t) {
    const ctx = this.ctx;
    const dur = 0.9 + Math.random() * 0.7;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuf(); src.loop = true;
    const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.Q.value = 6;
    const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.Q.value = 8;
    // formants sweep between two vowels ("ooo -> aah") to imply a spoken shape
    f1.frequency.setValueAtTime(420, t); f1.frequency.linearRampToValueAtTime(720, t + dur);
    f2.frequency.setValueAtTime(900, t); f2.frequency.linearRampToValueAtTime(1180, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f1); src.connect(f2); f1.connect(g); f2.connect(g); g.connect(this.musicBus);
    src.start(t); src.stop(t + dur + 0.1);
  }

  // A soft period drum pulse, a few warm membrane hits across the bar, with an
  // optional tambourine shimmer (medieval). Always gentle, never a busy beat.
  _percPhrase(p, t, bar, swell) {
    const beats = p.beats || 2;
    for (let i = 0; i < beats; i++) {
      const when = t + bar * (0.08 + i * (0.5 / Math.max(1, beats - 1 || 1)));
      if (i === 0 || Math.random() < p.prob) this._perc(when, p.level * swell, p.kind);
      if (p.tamb && Math.random() < p.tamb) this._tamb(when + bar * 0.12, p.level * 0.35 * swell);
    }
  }
  _perc(t, level, kind = "frame") {
    const ctx = this.ctx;
    const hi = kind === "timp" ? 120 : kind === "tabor" ? 165 : 150;
    const lo = kind === "timp" ? 52 : 72;
    const dur = kind === "timp" ? 0.34 : 0.2;
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(hi, t); o.frequency.exponentialRampToValueAtTime(lo, t + dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.001, level), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + dur + 0.04);
    // A whisper of skin/body, low-passed so it stays warm (never a sharp click).
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuf();
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(level * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(f); f.connect(ng); ng.connect(this.musicBus);
    src.start(t); src.stop(t + 0.1);
  }
  // Soft tambourine, a short, muted shimmer (bandpassed mid, kept low so it is
  // gentle rather than shrill).
  _tamb(t, level) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuf();
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.001, level), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    src.connect(f); f.connect(g); g.connect(this.musicBus);
    src.start(t); src.stop(t + 0.16);
  }
  _noiseBuf() {
    if (this._nbuf) return this._nbuf;
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._nbuf = buf; return buf;
  }

  _pad(notes, p, t, dur, swell = 1) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const peak = (p.level || 0.12) * (0.7 + 0.3 * swell);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + (p.attack || 1.0));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(p.cutoff || 1400, t);
    if (p.sweep) f.frequency.linearRampToValueAtTime((p.cutoff || 1400) * 1.6, t + dur);
    g.connect(f); f.connect(this.musicBus);
    notes.forEach((n) => {
      const o = ctx.createOscillator();
      o.type = p.wave; o.frequency.value = NOTE(n);
      o.detune.value = (Math.random() * 2 - 1) * (p.detune || 4);
      const og = ctx.createGain(); og.gain.value = 0.85 / notes.length + 0.06;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dur + (p.release || 0.4));
    });
  }

  // Bowed string consort (viols / orchestral strings): detuned sawtooth voices
  // through a lowpass + a body formant, with a shared gentle vibrato and a slow
  // bow swell. Reads as strings, not a synth pad.
  _stringEnsemble(notes, p, t, dur, swell = 1) {
    const ctx = this.ctx;
    const peak = (p.level || 0.12) * (0.7 + 0.3 * swell);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + (p.attack || 1.4));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = p.cutoff || 1600;
    const form = ctx.createBiquadFilter(); form.type = "peaking"; form.frequency.value = 1100; form.Q.value = 0.9; form.gain.value = 6;
    lp.connect(form); form.connect(g); g.connect(this.musicBus);
    // shared vibrato (cents) for a unified bow
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 5.0;
    const lg = ctx.createGain(); lg.gain.value = 7;
    lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.3);
    notes.forEach((n) => {
      for (const d of [-6, 6]) {       // two slightly detuned bows per note
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = NOTE(n); o.detune.value = d;
        lg.connect(o.detune);
        const og = ctx.createGain(); og.gain.value = 0.42 / notes.length;
        o.connect(og); og.connect(lp);
        o.start(t); o.stop(t + dur + 0.3);
      }
    });
  }

  // Plucked lute / harp, an additive tone (fundamental + decaying harmonics) with
  // a fast pluck attack. Bright and stringy, clearly not a pad.
  _lutePluck(freq, t, peak, decay = 1.1) {
    const ctx = this.ctx;
    const parts = [[1, 1.0, decay], [2, 0.5, decay * 0.6], [3, 0.26, decay * 0.42], [4, 0.14, decay * 0.3]];
    for (const [mult, amp, dec] of parts) {
      const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * amp), t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g); g.connect(this.musicBus);
      o.start(t); o.stop(t + dec + 0.05);
    }
  }

  // Choir "aah", detuned voices through vowel formants, slow swell. Sacred/period.
  _choir(notes, t, dur, level = 0.06, swell = 1) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level * (0.6 + 0.4 * swell), t + dur * 0.42);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.frequency.value = 720; f1.Q.value = 4;
    const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 1150; f2.Q.value = 6;
    f1.connect(g); f2.connect(g); g.connect(this.musicBus);
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 5.4;
    const lg = ctx.createGain(); lg.gain.value = 8;
    lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.2);
    notes.forEach((n) => {
      for (const d of [-7, 0, 7]) {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = NOTE(n + 12); o.detune.value = d;
        lg.connect(o.detune);
        const og = ctx.createGain(); og.gain.value = 0.4 / notes.length;
        o.connect(og); og.connect(f1); og.connect(f2);
        o.start(t); o.stop(t + dur + 0.2);
      }
    });
  }

  // The Paradix dread, a low, slow, dissonant swell (root + minor 2nd), very dark
  // lowpass, with a faint high shimmer. Occasional and subtle.
  _darkMotif(root, t, bar) {
    const ctx = this.ctx;
    const dur = Math.max(4.5, bar * 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.095, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300;
    lp.connect(g); g.connect(this.musicBus);
    for (const n of [root - 12, root - 12 + 1]) {   // root + minor 2nd = unease
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = NOTE(n);
      o.detune.value = (Math.random() * 8 - 4);
      o.connect(lp); o.start(t); o.stop(t + dur + 0.2);
    }
    // faint high paradox shimmer, very quiet
    const s = ctx.createOscillator(); s.type = "sine"; s.frequency.value = NOTE(root + 25);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t + 0.5);
    sg.gain.linearRampToValueAtTime(0.018, t + dur * 0.5);
    sg.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(sg); sg.connect(this.musicBus); s.start(t + 0.5); s.stop(t + dur + 0.1);
  }

  _bassNote(root, b, t, dur) {
    const ctx = this.ctx;
    const base = root - 12 - (b.sub ? 12 : 0);
    const o = ctx.createOscillator();
    o.type = b.wave; o.frequency.value = NOTE(base);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(b.level || 0.2, t + 0.18);
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 0.96);
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
    o.connect(f); f.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + dur + 0.1);
  }

  // A single gentle lead note (sustained breath/string, or a soft pluck) chosen
  // by a calm random walk over the scale, kept in a warm mid-low register.
  _lead(root, cfg, t, bar, swell) {
    const L = cfg.lead;
    const span = L.span || 7;
    const notes = L.kind === "pluck" ? (L.notes || 1) : 1;
    let when = t + bar * (0.12 + Math.random() * 0.25);
    for (let i = 0; i < notes; i++) {
      this._melDeg += this._wpick([-2, -1, 0, 1, 2], [2, 3, 2, 3, 2]);
      this._melDeg = Math.max(0, Math.min(span, this._melDeg));
      const n = this._deg2note(root, cfg.scale, this._melDeg) + (L.octave || 12);
      if (L.kind === "pluck") {
        if (L.timbre === "lute") this._lutePluck(NOTE(n), when, L.level * swell, L.decay || 1.1);
        else this._pluck(NOTE(n), when, L.level * swell, L.wave, L.decay || 1.0, L.cutoff || null);
        when += (L.decay || 1.0) * (0.6 + Math.random() * 0.4) + bar * 0.1;
      } else {
        this._sustainNote(NOTE(n), when, L.level * swell, L);
      }
    }
  }

  // Sustained lead, slow attack, hold, slow release, gentle vibrato. Used for
  // the flute / strings / airy-synth leads. Soft and never sharp.
  _sustainNote(freq, t, peak, L) {
    const ctx = this.ctx;
    const attack = L.attack || 0.5, hold = L.hold || 1.8, release = L.release || 1.4;
    const dur = attack + hold + release;
    const o = ctx.createOscillator();
    o.type = L.wave; o.frequency.value = freq;
    o.detune.value = (Math.random() * 2 - 1) * 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.001, peak), t + attack);
    g.gain.setValueAtTime(Math.max(0.001, peak), t + attack + hold);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (L.cutoff) {
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = L.cutoff;
      o.connect(f); node = f;
    }
    node.connect(g); g.connect(this.musicBus);
    // Gentle vibrato keeps the tone alive without sounding electronic.
    if (L.vibrato) {
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 4.5;
      const lg = ctx.createGain(); lg.gain.value = freq * L.vibrato;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
    }
    o.start(t); o.stop(t + dur + 0.1);
  }

  // Soft plucked/decaying voice, lute, harp, rounded e-piano tones.
  _pluck(freq, t, peak, wave = "triangle", decay = 1.0, filterHz = null) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = wave; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = filterHz || 1400;
    o.connect(f); f.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + decay + 0.05);
  }
}

export const audio = new AudioEngine();
