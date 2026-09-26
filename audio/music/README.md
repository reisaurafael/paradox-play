# Paradoxo, Music tracks (drop files here)

The game now supports **real looping music tracks**. As soon as a file exists here,
it **automatically replaces the synthesizer** for that mood/era. If a file is
missing, the synth keeps playing as the fallback, so you can add tracks one at a
time and hear each immediately. No code changes needed.

## How it works
- Hard-refresh the browser after adding files.
- The engine cross-fades between tracks (~2s) when the era/mood changes.
- Volume follows the existing **Music** slider in Settings.
- Loops should be **seamless** (no silent gap at the end) for best results.

## File names (put them in `web/audio/music/`)
Use **`.ogg`** (preferred, smaller) or **`.mp3`**, either is fine.

| File | When it plays |
|------|----------------|
| `western.ogg`  | **Required for the Wanted mood**, Old-West showdown: tense silence, distant wind, lone whistle/guitar. |
| `horror.ogg`   | **The dread floor**, latches once anyone hits 3 VP / after Secret Market discovery. Unsettling, ancient, wrong. |
| `exploration.ogg` | The calm default bed (used for any era without its own file below). |
| `medieval.ogg` | Optional per-era bed, strings, flute, lute, tabor, horns. |
| `ancient.ogg`, `primordial.ogg`, `modern.ogg`, `contemporary.ogg`, `future.ogg` | Optional per-era beds. |

Start with just **`western.ogg`** and **`horror.ogg`**, those are the two distinct
identities you most want. Add `medieval.ogg` next for the period feel.

## Where to get royalty-free tracks (free, legal)
Pick CC0 (no attribution) or CC-BY (credit in-game footer) loops:
- **Pixabay Music**, https://pixabay.com/music/ (royalty-free, no attribution required). Search: "western showdown loop", "dark ambient horror loop", "medieval tavern loop".
- **incompetech.com** (Kevin MacLeod, CC-BY), huge catalogue; "Western", "Horror", "Medieval" categories.
- **OpenGameArt.org**, https://opengameart.org/ (filter by music + CC0).
- **freesound.org**, https://freesound.org/ (CC0 filter) for ambience/wind/loops you can layer.

Aim for **1-3 minute** seamless loops, mixed fairly quietly (this is background).
If a track has a long intro, trim it so the loop point is musical.

> Tip: to make a loop seamless, top-and-tail in Audacity and add a tiny crossfade,
> or export from your DAW with the loop region only.

## Attribution
If you use CC-BY tracks, list credits in the landing footer / a CREDITS file and
tell me, I'll wire a small in-game credits line.
