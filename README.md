# Lumen Drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/sherrypubg128-blip/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/sherrypubg128-blip/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arcade game for make.fun's "Make the best game" bounty. You pilot a
light-ship through a void arena: collect light shards, dodge the void shapes,
and survive all 10 waves. Quick pickups chain into a combo up to x8, and a
dash shatters any void shape it passes through — so the dash is a weapon as
well as an escape.

## Run it

Serve `game/` with any static server and open it in a desktop browser:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

No build step, no network requests, no dependencies. All art is drawn in
code and all sound is synthesised with WebAudio.

## How to play

- **Move** — WASD / arrow keys, or move the mouse (the ship steers toward it)
- **Dash** — Space / Shift / click. Dash through a void shape to shatter it (+25)
- **Collect shards** — 10 points each, multiplied by the combo (up to x8)
- **Clear a wave** — collect its shard quota; +250 bonus per wave
- **Power-ups** — SHIELD blocks one hit, MAGNET pulls shards in, OVERDRIVE halves dash cooldown
- **P** pause · **M** mute · **R** restart · **Enter** start

Lose all 3 lives and the light fades. Clear wave 10 and the drift is complete,
with a time bonus for finishing fast. Best score is kept in the browser.
The top 3 entries are hosted live on make.fun, so the game is built to be
played, not just looked at.

## The void shapes

- **Drifter** (red) — drifts in a straight line and bounces off the walls
- **Hunter** (orange) — steers toward your ship, faster every wave
- **Spinner** (purple) — orbits a slowly drifting centre, from wave 3 on

## Files

- `game/index.html` — page shell, canvas, module entry point
- `game/src/main.js` — bootstrap, 60 Hz fixed-step loop, menu keys
- `game/src/world.js` — state machine, waves, scoring, collisions, screenshot scenes
- `game/src/render.js` — all canvas drawing: background, entities, HUD, screens
- `game/src/entities.js` — player, shards, enemies, particles, power-ups
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — procedural WebAudio effects and music
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — seeded RNG and small helpers
- `main.ts` — copies `game/` + `screenshots/` to `/output` and writes the dossier

## Screenshots

The four screenshots are real renders of the game's own code, taken in a
browser with `?shot=title|play|win|lose`, which renders one frozen frame from
a fixed seed. The parameter is a development aid for staging screenshots; it
changes nothing about normal play.

---

<sub>Entered on [make.fun](https://make.fun/?ref=p04vaw3r&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
