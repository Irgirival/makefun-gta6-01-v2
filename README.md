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
- **Six story missions** — "First Wheels", "The Pickup", "Harbor Run", "Heat Rising", "Solmar Nights" and "The Long Runway" at the **Solmar Airfield** (runway, terminal, control tower, hangars, parked planes), with dialogue, waypoints, timed runs and cash rewards — plus a repeatable taxi job (**J**), a courier run (**C**, three timed deliveries), stunt-jump ramps that pay for big air, and twelve hidden cash packages.
- **v3 — street racing** — press **G** at the chequered start banner by the plaza to race three circuits (**Downtown Loop**, **Harbor Sprint**, **Airfield GP**) against three AI rivals with rubber-banding, live positions and cash prizes, on a season ladder that saves.
- **v3 — Vic's garage** — bring your car to the garage and spend cash on a respray (**U**, eight paints), engine upgrades (**I**, +8% top speed, three levels) and armor plating (**O**). Your tuned car persists in the save. Engine Lv1+ unlocks **nitro** (hold **Shift** for +35% top speed, with a meter and a blue exhaust flame), and **Y** buys neon underglow that glows at night.
- **v3 — Mission 7, "The Verde Heist"** — the story finale: lift the casino's take from the Isla Verde marina, run it to the airfield under a city-wide alarm, lose the heat and bring the money home to the plaza — then the epilogue screen closes Mara's arc.
- **v3 — Isla Verde** — a second district across the causeway bridge: boardwalk shops, a lighthouse that sweeps the bay at night, a marina, a resort hotel, palm rows and its own tourists. Courier runs sometimes end there.
- **v3 — boats** — five stealable, drivable boats in the harbor and the Isla Verde marina (**E** to board). Heavy boats, a bobbing hull, a foam wake, and rain that chops up the swell. The PD waits on the shore — cruisers cannot follow you onto the water. Sail the five orange harbor-tour buoys in order for $500, repeatable.
- **v3 — safehouse** — walk into Mara's yellow house to clear the wanted level, heal up, restock pistol ammo, refill the nitro tank and change outfit (the jacket cycles through five colours).
- **v3 — radio** — press **N** to cycle three synthesized stations: **Solmar FM** (synthwave), **Radio Verde** (latin groove) and **Talk Solmar** (late-night callers) — each with its own DJ greeting you on tune-in.
- **v3 — vigilante contracts** — press **V** while driving to hunt a fugitive in a stolen Comet GT: ram it three times or pin it for two seconds and the PD pays a $600 bounty. At 3+ stars the PD fights back with **spike strips** and extra **roadblocks**. Race winners also keep a fastest-time record per circuit, saved with the ladder.
- **A living sky** — a full **day/night cycle**: the sun arcs across the sky, dusk turns the city orange, and at night the streetlights come on, windows glow, the moon rises, and driving needs real headlights. **Weather** (**T**) brings light and heavy rain: wet roads darken and grip falls, so cars slide and bikes get twitchy.
- **HUD + minimap** — health/armor, cash, wanted stars, clock, mission tracker, speedometer and a live canvas minimap.
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots, footsteps and a synthwave city loop. No audio files.
- **Save** — progress (cash, missions, packages, racing ladder, garage tuning, radio station, bounties) saves automatically to localStorage.

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
