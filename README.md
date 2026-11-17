# Emberfall Keep

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/sherrypubg128-blip/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/sherrypubg128-blip/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A tower-defense game for make.fun's **"Make the best game"** bounty ($1,000).
Shadow creatures crawl a winding stone road to snuff out the Ember Keep — the
last hearth. Build ember towers on the open ground, spend the gold your kills
pay, hold the line, and survive all 12 waves, including the Hollow King.

## How to play

- **Goal:** stop the shadows reaching the keep. Lose a life for every foe
  that slips through; lose all 20 and the embers fade. Clear wave 12 and the
  keep stands.
- **Build:** click a tower card, then click open ground. Towers fire on their
  own. Click one of your towers to see its range, upgrade it, or sell it.
- **Waves:** press **Space** or the Send Wave button when you are ready.
  Clearing a wave pays a gold bonus.

## Towers

| Tower | Cost | Role |
| --- | --- | --- |
| Ember Bolt | 50g | Fast single-target ember bolts |
| Cinder Snare | 75g | Sticky cinders that slow foes |
| Storm Coil | 120g | Lightning that chains to 3 foes |
| Mortar | 150g | Splashing fireballs, long range |
| Sun Lance | 200g | Piercing beam, longest range |

Every tower upgrades twice (damage ×1.6 and range ×1.1 per level) and sells
back for 70% of what you put into it.

## Foes

Shamblers, fast Skitters, armoured Husks, slow-resistant Wraiths — and on
wave 12, the Hollow King himself, with an escort.

## Controls

Mouse builds and selects. Keys: **1–5** pick a tower, **Space** sends a wave
(or pauses mid-wave), **P** pauses, **F** toggles 2× speed, **M** mutes,
**Esc** deselects, **R** restarts, **Enter** starts.

## Tech

Plain Canvas 2D, zero libraries, zero network requests. All art is drawn in
code and all sound is synthesized with WebAudio. The simulation runs on a
fixed 60 Hz timestep, separate from rendering.

## Screenshots

The screenshots in `screenshots/` are real renders of this game's code in a
browser. They were staged with the `?shot=` query parameter, a dev aid that
sets up a fixed scene (title, mid-game, victory, defeat) by running the
simulation a fixed number of ticks — the same code path the player uses, just
without waiting. `?shot=play`, `?shot=win`, `?shot=lose` stage those scenes;
no parameter shows the title screen. The game also exposes a
`window.__emberfall` hook (game state, wave control, tower placement) for
play-testing in a browser console.

## Running it

Serve `game/` with any static file server and open `game/index.html`, or run
the entry program to produce the submission output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
