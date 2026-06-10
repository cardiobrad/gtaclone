# Anywhere City Web

Top-down 3D sandbox in the browser, inspired by GTA 2. Built from scratch to be **highly customizable**: swappable 3D assets with per-asset transform editing, custom PNG map textures, live vehicle handling tweaks, and Tiled map import. Everything is data-driven.

**[Live demo](#)** — soon.

## Quick start

```bash
npm install
npm run dev           # http://localhost:5173
npm run build         # production build → dist/
npm run preview       # serve dist/ locally
npm run generate:map  # regenerate default-map.json + initial-placements.json
```

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move (on foot and driving) |
| E / Enter | Steal / exit nearest car (including traffic) |
| Space | Handbrake (drifting) |
| F / Ctrl | Shoot (on foot and drive-by) |
| Q / 1–3 | Switch weapon |
| Esc | Pause / close menus |

## World & gameplay

The city (**160×160 tiles**, procedural blocks and districts) is alive: pedestrians walk on sidewalks and cross at **crosswalks**, traffic AI drives varied vehicle types in two-way lanes, and chaos has consequences.

- **Shops** with awnings, **plaza fountains**, parks, lampposts, hydrants, explosive barrels with chain reactions
- **9 vehicle types** with distinct handling (see `vehicle-configs.json`)
- **Weapons**: pistol (infinite), Uzi and shotgun from pickups; medkits restore health
- **Wanted system**: heat from *your* crimes only → up to 6 stars; foot cops, patrol cars, paint shops ($50) to clear heat
- **Gangs** (Zaibatsu / Loonies) with territory respect and hostile AI
- **Medics** dispatch ambulances to revive downed pedestrians
- **Police deploy** from patrol cars at higher wanted levels
- Knockable props (hydrants spray water), carjacking ejections, procedural walk/run animation, synthesized Web Audio

Population uses **streaming recycle** (`PED_COUNT=240`, `TRAFFIC_COUNT=64`) so the visible area stays dense without simulating the entire map every frame.

## Stack

- TypeScript, Vite, React 19, Tailwind 4
- @react-three/fiber + drei (declarative Three.js)
- Zustand (presets in `localStorage`)
- IndexedDB (user GLBs, PNGs, imported maps)
- Procedural canvas textures + Web Audio (no external audio files)

### Physics: arcade math (not Rapier)

Vehicle control uses custom forward/lateral velocity + configurable grip. Collisions are circle-vs-grid on blocked tiles. Zero WASM, fully tunable from JSON. Rapier could be added later for rigid-body features without breaking the preset system.

### Rendering: tile instancing + 3D props

Roads and ground are `InstancedMesh` per tile type; buildings are instanced boxes with flood-fill heights; props and vehicles are individual meshes wrapped in preset transforms (`AssetModel.tsx`).

## Data-driven files

| File | Purpose |
| --- | --- |
| `src/data/tile-types.json` | Tile ids (color, elevation, blocked, drivable) |
| `src/data/default-map.json` | 160×160 character grid (`scripts/generate-map.mjs`) |
| `src/data/initial-placements.json` | Player spawn, parked cars, barrels, trees, pickups |
| `src/data/asset-defs.json` | Replaceable asset catalog |
| `src/data/asset-presets.json` | Default transforms per asset |
| `src/data/vehicle-configs.json` | Arcade handling + health per vehicle |
| `src/data/weapon-configs.json` | Damage, fire rate, spread, pellets |
| `src/data/gangs.json` | Gang colors and territories |
| `src/constants.ts` | Global tuning (`TILE_SIZE=2`, camera, AI counts, …) |

## Customization (in-game Settings)

- **3D assets** — upload GLB, edit position/rotation/scale with gizmos (`WorldPreview` uses the same lighting as gameplay)
- **Tiles & textures** — PNG overrides per material slot
- **Vehicles / weapons** — live sliders
- **Map** — import Tiled JSON (`.tmj`)
- **Presets** — export/import JSON bundle to share with your team

**Transform rule:** the GLTF is never mutated; presets live on a wrapper `<group>` in `AssetModel.tsx`.

## Tiled workflow

1. Create a map in [Tiled](https://www.mapeditor.org/) with a placeholder tileset.
2. Tile index order follows `tile-types.json`, or set a custom property `type` on each tile.
3. Optional object layer `placements`: `sedan`, `van`, `barrel`, `tree`, `trafficlight`, and `player` for spawn.
4. Export as JSON (`.tmj`) and import via Settings → Map.

## Architecture

```
src/
  data/         JSON configs and default map
  engine/       Pure logic (no React): world simulation, mapLoader, tiled,
                textures, sound, input, idb, runtime
  stores/       Zustand: presetStore, assetStore, gameStore, presetIO
  components/   R3F: GameScene, Tiles, Buildings, Entities, Particles, AssetModel
  ui/           React HUD and menus
scripts/        generate-map.mjs
```

`engine/world.ts` mutates simulation state in one `useFrame` tick; meshes read positions each frame without React re-renders. HUD/menus use Zustand at low frequency (~10 Hz).

## Performance notes

- One `InstancedMesh` per tile type and building height band
- Procedural low-poly fallbacks (no model downloads required)
- Single `THREE.Points` particle pool (800)
- Minimap: pre-rendered 1 px/tile background + dynamic dots

## Privacy & security

See [SECURITY.md](./SECURITY.md). No backend, no API keys in repo, no telemetry. User uploads stay in the browser.

## Deploy

See [docs/DEPLOY.md](./docs/DEPLOY.md) for GitHub + Netlify steps.

## License

MIT — see [LICENSE](./LICENSE).
