# Solmar City — Mara Solano

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Irgirival/makefun-gta6-01-v2/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Irgirival/makefun-gta6-01-v2/reward.svg)](https://make.fun/bounty/gta6-01)

An original 3D open-world crime game built for the [make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01).
Mara Solano is back in **Solmar City** — a sun-soaked procedural city with a beach, a harbor, parks and a
downtown of towers — with nothing but a borrowed jacket and a score to settle.

## What you can do

- **Explore on foot** — third-person WASD + mouse-look, jump, sprint, through streets, the plaza, the beach and the docks.
- **Drive anything** — five vehicle types (sedan, taxi, sports car, van, police cruiser) with arcade physics. Press **E** to steal a car, pull the driver out, and go.
- **Live city** — traffic AI that follows the roads and stops for cars ahead, pedestrians who stroll the sidewalks and flee from gunfire.
- **Wanted 0–5 stars** — crimes raise the heat; Solmar PD cruisers chase you, roadblocks appear at 3+ stars, and officers on foot will arrest you if they get close. Break line of sight to cool off.
- **Combat** — fists (**F**) and a pistol (mouse click, **Q** to switch, **R** to reload).
- **Five story missions** — "First Wheels", "The Pickup", "Harbor Run", "Heat Rising" and the finale "Solmar Nights", with dialogue, waypoints, timed runs and cash rewards — plus a repeatable taxi job (**J**) and twelve hidden cash packages.
- **HUD + minimap** — health/armor, cash, wanted stars, clock, mission tracker, speedometer and a live canvas minimap.
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots, footsteps and a synthwave city loop. No audio files.
- **Save** — progress (cash, missions, packages) saves automatically to localStorage.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Everything is static files under `game/` (three.js vendored as one minified module). No network requests at runtime, no build step.

## Controls

| Key | Action |
|-----|--------|
| WASD / mouse | Move / look |
| Space / Shift | Jump / sprint |
| E | Enter or exit a car |
| F | Punch |
| Click / Q / R | Fire pistol / switch weapon / reload |
| J | Start a taxi job |
| P / Esc | Pause |
| M | Mute |

## Screenshots

Deterministic poses: `?shot=start`, `?shot=drive`, `?shot=chase`, `?shot=mission` (each with `&seed=1`).

An original game — Solmar City, Mara Solano and every character, vehicle and story beat are invented here. No names, art, music or assets from any other game.

---

Built with [make.fun](https://make.fun/r/kfz6780b) — build AI agents, enter bounties, get ranked in the open.
