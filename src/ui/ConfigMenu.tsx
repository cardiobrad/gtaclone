import { useMemo, useRef, useState } from 'react';
import type { MapData, VehicleConfig, WeaponConfig } from '../types';
import assetDefsJson from '../data/asset-defs.json';
import type { AssetDef } from '../types';
import { useGameStore, getActiveMap } from '../stores/gameStore';
import { usePresetStore, DEFAULT_VEHICLE_CONFIGS, DEFAULT_WEAPON_CONFIGS } from '../stores/presetStore';
import { useAssetStore } from '../stores/assetStore';
import { TEXTURE_SLOTS, defaultTexture } from '../engine/textures';
import { TILE_TYPES } from '../engine/mapLoader';
import { parseTiledMap } from '../engine/tiled';
import { exportPresetBundle, importPresetBundle } from '../stores/presetIO';
import { sound } from '../engine/sound';

const ASSET_DEFS = assetDefsJson as AssetDef[];
const TABS = [
  { id: 'assets', label: '3D Assets' },
  { id: 'tiles', label: 'Tiles & textures' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'map', label: 'Map' },
  { id: 'presets', label: 'Presets' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const CATEGORY_LABEL: Record<string, string> = {
  character: 'Character',
  vehicle: 'Vehicle',
  prop: 'Prop',
};

function FileButton({ label, accept, onFile, className }: { label: string; accept: string; onFile: (f: File) => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className={className} onClick={() => ref.current?.click()}>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </>
  );
}

const btnSm = 'rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-200 transition hover:bg-zinc-700';
const btnAccent = 'rounded bg-yellow-400 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black transition hover:bg-yellow-300';
const btnDanger = 'rounded border border-red-800 bg-red-950/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition hover:bg-red-900/50';

// ---------------------------------------------------------------- pestañas

function AssetsTab() {
  const openEditor = useGameStore((s) => s.openEditor);
  const modelUrls = useAssetStore((s) => s.modelUrls);
  const setModel = useAssetStore((s) => s.setModel);
  const clearModel = useAssetStore((s) => s.clearModel);

  return (
    <div className="space-y-2">
      <p className="mb-4 text-sm text-zinc-400">
        Upload your own GLB model for any asset and fine-tune its placement in the dedicated editor.
        The transform is stored as a preset and applied to every spawn of that asset.
      </p>
      {ASSET_DEFS.map((def) => (
        <div key={def.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <div className="flex-1">
            <div className="font-bold text-zinc-100">{def.name}</div>
            <div className="text-xs text-zinc-500">
              {CATEGORY_LABEL[def.category]} · {modelUrls[def.id] ? <span className="text-emerald-400">custom GLB</span> : 'default model'}
            </div>
          </div>
          <FileButton label="Upload GLB" accept=".glb,.gltf" className={btnSm} onFile={(f) => void setModel(def.id, f)} />
          {modelUrls[def.id] && (
            <button className={btnDanger} onClick={() => void clearModel(def.id)}>Remove GLB</button>
          )}
          <button className={btnAccent} onClick={() => openEditor(def.id)}>Edit placement</button>
        </div>
      ))}
    </div>
  );
}

function TilesTab() {
  const textureUrls = useAssetStore((s) => s.textureUrls);
  const setTexture = useAssetStore((s) => s.setTexture);
  const clearTexture = useAssetStore((s) => s.clearTexture);

  const defaultPreviews = useMemo(() => {
    const out: Record<string, string> = {};
    for (const slot of TEXTURE_SLOTS) {
      const img = defaultTexture(slot.id).image as HTMLCanvasElement;
      out[slot.id] = img.toDataURL();
    }
    return out;
  }, []);

  return (
    <div className="space-y-2">
      <p className="mb-4 text-sm text-zinc-400">
        Upload a PNG to replace any world texture. The change is applied live to the matching
        InstancedMesh (no new meshes are created).
      </p>
      {TEXTURE_SLOTS.map((slot) => (
        <div key={slot.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <img
            src={textureUrls[slot.id] ?? defaultPreviews[slot.id]}
            alt={slot.name}
            className="h-12 w-12 rounded border border-zinc-700 object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="flex-1">
            <div className="font-bold text-zinc-100">{slot.name}</div>
            <div className="text-xs text-zinc-500">{slot.hint}</div>
          </div>
          <FileButton label="Upload PNG" accept="image/png,image/jpeg,image/webp" className={btnSm} onFile={(f) => void setTexture(slot.id, f)} />
          {textureUrls[slot.id] && (
            <button className={btnDanger} onClick={() => void clearTexture(slot.id)}>Restore</button>
          )}
        </div>
      ))}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-40 text-zinc-400">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} className="flex-1" onChange={(e) => onChange(Number(e.target.value))} />
      <span className="w-14 text-right tabular-nums text-zinc-200">{value}</span>
    </label>
  );
}

function VehiclesTab() {
  const vehicleConfigs = usePresetStore((s) => s.vehicleConfigs);
  const setVehicleConfig = usePresetStore((s) => s.setVehicleConfig);
  const resetVehicleConfig = usePresetStore((s) => s.resetVehicleConfig);

  const update = (cfg: VehicleConfig, patch: Partial<VehicleConfig>) =>
    setVehicleConfig(cfg.id, { ...cfg, ...patch });

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Arcade handling and display name per vehicle (vehicle-configs.json). The name fades in at the
        bottom when you jack a car. Changes apply live.
      </p>
      {Object.values(vehicleConfigs).map((cfg) => (
        <div key={cfg.id} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-zinc-100">{cfg.id}</div>
            {DEFAULT_VEHICLE_CONFIGS[cfg.id] && (
              <button className={btnSm} onClick={() => resetVehicleConfig(cfg.id)}>Reset</button>
            )}
          </div>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 text-zinc-400">Display name</span>
            <input
              type="text"
              maxLength={40}
              value={cfg.name}
              className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-100"
              onChange={(e) => update(cfg, { name: e.target.value })}
            />
          </label>
          <Slider label="Top speed (m/s)" value={cfg.maxSpeed} min={8} max={50} step={1} onChange={(v) => update(cfg, { maxSpeed: v })} />
          <Slider label="Acceleration" value={cfg.accel} min={4} max={40} step={1} onChange={(v) => update(cfg, { accel: v })} />
          <Slider label="Brakes" value={cfg.brake} min={10} max={60} step={1} onChange={(v) => update(cfg, { brake: v })} />
          <Slider label="Steering (rad/s)" value={cfg.turnRate} min={1} max={5} step={0.1} onChange={(v) => update(cfg, { turnRate: v })} />
          <Slider label="Lateral grip" value={cfg.grip} min={0.5} max={0.99} step={0.01} onChange={(v) => update(cfg, { grip: v })} />
          <Slider label="Drift grip" value={cfg.driftGrip} min={0.9} max={1} step={0.005} onChange={(v) => update(cfg, { driftGrip: v })} />
        </div>
      ))}
    </div>
  );
}

function WeaponsTab() {
  const weaponConfigs = usePresetStore((s) => s.weaponConfigs);
  const setWeaponConfig = usePresetStore((s) => s.setWeaponConfig);
  const resetWeaponConfig = usePresetStore((s) => s.resetWeaponConfig);

  const update = (cfg: WeaponConfig, patch: Partial<WeaponConfig>) =>
    setWeaponConfig(cfg.id, { ...cfg, ...patch });

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Per-weapon parameters (weapon-configs.json). Switch with Q in game; ammo comes
        from the pickups scattered around the city.
      </p>
      {Object.values(weaponConfigs).map((cfg) => (
        <div key={cfg.id} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-zinc-100">
              {cfg.name}{' '}
              <span className="text-xs font-normal text-zinc-500">
                {cfg.infinite ? '· infinite ammo' : `· +${cfg.pickupAmmo} rounds per pickup`}
                {cfg.auto ? ' · automatic' : ''}
              </span>
            </div>
            {DEFAULT_WEAPON_CONFIGS[cfg.id] && (
              <button className={btnSm} onClick={() => resetWeaponConfig(cfg.id)}>Reset</button>
            )}
          </div>
          <Slider label="Damage per bullet" value={cfg.damage} min={5} max={80} step={1} onChange={(v) => update(cfg, { damage: v })} />
          <Slider label="Fire rate (s)" value={cfg.cooldown} min={0.05} max={1.5} step={0.01} onChange={(v) => update(cfg, { cooldown: v })} />
          <Slider label="Bullet speed" value={cfg.bulletSpeed} min={15} max={60} step={1} onChange={(v) => update(cfg, { bulletSpeed: v })} />
          <Slider label="Range (s lifetime)" value={cfg.bulletLife} min={0.2} max={1.5} step={0.05} onChange={(v) => update(cfg, { bulletLife: v })} />
          <Slider label="Pellets per shot" value={cfg.pellets} min={1} max={10} step={1} onChange={(v) => update(cfg, { pellets: v })} />
          <Slider label="Spread (rad)" value={cfg.spread} min={0} max={0.4} step={0.01} onChange={(v) => update(cfg, { spread: v })} />
        </div>
      ))}
    </div>
  );
}

function serializeRows(map: MapData): string[] {
  const rows: string[] = [];
  for (let z = 0; z < map.height; z++) {
    let row = '';
    for (let x = 0; x < map.width; x++) row += TILE_TYPES[map.grid[z * map.width + x]].char;
    rows.push(row);
  }
  return rows;
}

function MapTab() {
  const customMap = useGameStore((s) => s.customMap);
  const setCustomMap = useGameStore((s) => s.setCustomMap);
  const { map } = getActiveMap({ customMap });
  const [error, setError] = useState<string | null>(null);

  const importTmj = async (file: File) => {
    setError(null);
    try {
      const json = JSON.parse(await file.text());
      const { map: parsed, placements } = parseTiledMap(json);
      await setCustomMap({
        rows: serializeRows(parsed),
        width: parsed.width,
        height: parsed.height,
        placements,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import the map');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div className="font-bold text-zinc-100">Active map</div>
        <div className="text-sm text-zinc-400">
          {customMap ? 'Map imported from Tiled' : 'Default map'} · {map.width}×{map.height} tiles
        </div>
        <div className="mt-3 flex gap-2">
          <FileButton label="Import Tiled map (.tmj)" accept=".tmj,.json" className={btnAccent} onFile={(f) => void importTmj(f)} />
          {customMap && (
            <button className={btnDanger} onClick={() => void setCustomMap(null)}>Restore default map</button>
          )}
        </div>
        {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm leading-6 text-zinc-400">
        <div className="mb-1 font-bold text-zinc-200">Level design conventions (Tiled)</div>
        <ul className="list-inside list-disc">
          <li>Tile layer: the tile index in the tileset follows the order of <code>tile-types.json</code>: 0=road, 1=sidewalk, 2=grass, 3=plaza, 4=building, 5=shop, 6=spray shop, 7=water (or a custom <code>type</code> property per tile).</li>
          <li>Optional <code>placements</code> object layer: each object is named after the asset (<code>sedan</code>, <code>van</code>, <code>barrel</code>, <code>tree</code>, <code>trafficlight</code>…); a <code>player</code> object marks the spawn.</li>
          <li>If there is no object layer, the game auto-generates placements.</li>
        </ul>
      </div>
    </div>
  );
}

function PresetsTab() {
  const resetAll = usePresetStore((s) => s.resetAll);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Export your presets (asset transforms, vehicle handling and custom textures) to a JSON
        bundle to share with the team, or import an existing one.
      </p>
      <div className="flex gap-2">
        <button className={btnAccent} onClick={() => void exportPresetBundle()}>Export presets (JSON)</button>
        <FileButton
          label="Import presets"
          accept=".json"
          className={btnSm}
          onFile={(f) => {
            importPresetBundle(f)
              .then(() => setMsg('Presets imported successfully.'))
              .catch((e) => setMsg(`Error: ${e instanceof Error ? e.message : 'invalid bundle'}`));
          }}
        />
        <button
          className={btnDanger}
          onClick={() => {
            resetAll();
            setMsg('Presets restored to team defaults.');
          }}
        >
          Reset everything
        </button>
      </div>
      {msg && <div className="text-sm text-emerald-400">{msg}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- contenedor

export function ConfigMenu() {
  const setConfigOpen = useGameStore((s) => s.setConfigOpen);
  const muted = useGameStore((s) => s.muted);
  const setMuted = useGameStore((s) => s.setMuted);
  const [tab, setTab] = useState<TabId>('assets');

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[85vh] w-[min(960px,92vw)] flex-col rounded-xl border border-zinc-700 bg-[#12121a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-xl font-black uppercase tracking-widest text-yellow-300">Settings</h2>
          <div className="flex items-center gap-3">
            <button
              className={btnSm}
              onClick={() => {
                setMuted(!muted);
                sound.setMuted(!muted);
              }}
            >
              {muted ? 'Sound: OFF' : 'Sound: ON'}
            </button>
            <button className={btnAccent} onClick={() => setConfigOpen(false)}>Close</button>
          </div>
        </div>
        <div className="flex gap-1 border-b border-zinc-800 px-6 pt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`rounded-t-lg px-4 py-2 text-sm font-bold uppercase tracking-wide transition ${
                tab === t.id ? 'bg-zinc-800 text-yellow-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'assets' && <AssetsTab />}
          {tab === 'tiles' && <TilesTab />}
          {tab === 'vehicles' && <VehiclesTab />}
          {tab === 'weapons' && <WeaponsTab />}
          {tab === 'map' && <MapTab />}
          {tab === 'presets' && <PresetsTab />}
        </div>
      </div>
    </div>
  );
}
