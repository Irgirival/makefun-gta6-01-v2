# Solmar City — Mara Solano

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Irgirival/makefun-gta6-01-v2/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Irgirival/makefun-gta6-01-v2/reward.svg)](https://make.fun/bounty/gta6-01)

An original 3D open-world crime game built for the [make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01).
Mara Solano is back in **Solmar City** — a sun-soaked procedural city with a beach, a harbor, parks and a
downtown of towers — with nothing but a borrowed jacket and a score to settle.

## What you can do

- **Explore on foot** — third-person WASD + mouse-look, jump, sprint, through streets, the plaza, the beach and the docks.
- **Drive anything** — six vehicle types (sedan, taxi, sports car, van, police cruiser, city bus) plus the **Solmar Comet 900 motorcycle**, which leans into turns and outruns everything on the road. Press **E** to steal a car or bike, pull the driver out, and go.
- **Live city** — traffic AI that follows the roads and stops for cars ahead, buses on the avenues, pedestrians who stroll the sidewalks and flee from gunfire — joggers, tourists, elders with canes, friends walking in pairs.
- **Wanted 0–5 stars** — crimes raise the heat; Solmar PD cruisers chase you, roadblocks appear at 3+ stars, officers on foot will arrest you if they get close — and at 4+ stars a **police helicopter** hunts you from the sky with a searchlight that stops the heat from cooling off. Break line of sight to cool off.
- **Combat** — fists (**F**) and a pistol (mouse click, **Q** to switch, **R** to reload).
- **Six story missions** — "First Wheels", "The Pickup", "Harbor Run", "Heat Rising", "Solmar Nights" and the finale "The Long Runway" at the new **Solmar Airfield** (runway, terminal, control tower, hangars, parked planes), with dialogue, waypoints, timed runs and cash rewards — plus a repeatable taxi job (**J**), a courier run (**C**, three timed deliveries), stunt-jump ramps that pay for big air, and twelve hidden cash packages.
- **A living sky** — a full **day/night cycle**: the sun arcs across the sky, dusk turns the city orange, and at night the streetlights come on, windows glow, the moon rises, and driving needs real headlights. **Weather** (**T**) brings light and heavy rain: wet roads darken and grip falls, so cars slide and bikes get twitchy.
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
| C | Start a courier run (3 timed deliveries) |
| T | Cycle the weather (clear / light rain / heavy rain) |
| P / Esc | Pause |
| M | Mute |

## Screenshots

Deterministic poses: `?shot=start`, `?shot=drive`, `?shot=chase`, `?shot=mission` (each with `&seed=1`).

An original game — Solmar City, Mara Solano and every character, vehicle and story beat are invented here. No names, art, music or assets from any other game.

---

Built with [make.fun](https://make.fun/r/kfz6780b) — build AI agents, enter bounties, get ranked in the open.
