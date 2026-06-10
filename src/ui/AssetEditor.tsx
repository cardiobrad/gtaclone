import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, TransformControls } from '@react-three/drei';
import type { AssetDef, AssetPreset } from '../types';
import assetDefsJson from '../data/asset-defs.json';
import { CAMERA_FOV } from '../constants';
import { useGameStore } from '../stores/gameStore';
import { usePresetStore, DEFAULT_ASSET_PRESETS, IDENTITY_PRESET } from '../stores/presetStore';
import { useAssetStore } from '../stores/assetStore';
import { WorldPreview } from '../components/WorldPreview';
import { AssetModel } from '../components/AssetModel';
import { PlayerModel } from '../components/fallbacks';

const ASSET_DEFS = assetDefsJson as AssetDef[];

type GizmoMode = 'translate' | 'rotate' | 'scale';

const clonePreset = (p: AssetPreset): AssetPreset => ({
  position: [...p.position],
  rotation: [...p.rotation],
  scale: [...p.scale],
  notes: p.notes,
});

function applyToObject(obj: THREE.Object3D, p: AssetPreset) {
  obj.position.set(...p.position);
  obj.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2]);
  obj.scale.set(...p.scale);
}

function readFromObject(obj: THREE.Object3D, notes?: string): AssetPreset {
  return {
    position: [obj.position.x, obj.position.y, obj.position.z],
    rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
    scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    notes,
  };
}

const round = (v: number) => Math.round(v * 1000) / 1000;

function NumberRow({ label, values, step, onChange, toDisplay = (v) => v, fromDisplay = (v) => v }: {
  label: string;
  values: [number, number, number];
  step: number;
  onChange: (axis: number, v: number) => void;
  toDisplay?: (v: number) => number;
  fromDisplay?: (v: number) => number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</span>
      {values.map((v, i) => (
        <label key={i} className="flex flex-1 items-center gap-1">
          <span className="text-[10px] text-zinc-500">{'XYZ'[i]}</span>
          <input
            type="number"
            step={step}
            value={round(toDisplay(v))}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm tabular-nums text-zinc-100"
            onChange={(e) => onChange(i, fromDisplay(Number(e.target.value)))}
          />
        </label>
      ))}
    </div>
  );
}

/**
 * Editor individual de posicionamiento de un asset.
 * El preview usa los mismos componentes/luces/escala que el GameScene
 * (WorldPreview): lo que ves aquí es lo que obtienes en el juego.
 */
export function AssetEditor({ assetId }: { assetId: string }) {
  const def = ASSET_DEFS.find((d) => d.id === assetId);
  const openEditor = useGameStore((s) => s.openEditor);
  const storedPreset = usePresetStore((s) => s.assetPresets[assetId]) ?? IDENTITY_PRESET;
  const setAssetPreset = usePresetStore((s) => s.setAssetPreset);
  const modelUrl = useAssetStore((s) => s.modelUrls[assetId]);
  const setModel = useAssetStore((s) => s.setModel);
  const clearModel = useAssetStore((s) => s.clearModel);

  const [preset, setPreset] = useState<AssetPreset>(() => clonePreset(storedPreset));
  const [mode, setMode] = useState<GizmoMode>('translate');
  const [snap, setSnap] = useState(true);
  const [showReference, setShowReference] = useState(true);
  const [target, setTarget] = useState<THREE.Group | null>(null);
  const [saved, setSaved] = useState(false);

  // aplicar el preset local al objeto del gizmo
  useEffect(() => {
    if (target) applyToObject(target, preset);
  }, [target, preset]);

  const dirty = JSON.stringify(preset) !== JSON.stringify(storedPreset);

  const set = (patch: Partial<AssetPreset>) => {
    setSaved(false);
    setPreset((p) => ({ ...p, ...patch }));
  };

  const modeBtn = (m: GizmoMode, label: string) => (
    <button
      className={`flex-1 rounded px-2 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
        mode === m ? 'bg-yellow-400 text-black' : 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
      }`}
      onClick={() => setMode(m)}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80">
      <div className="flex h-[90vh] w-[min(1200px,95vw)] overflow-hidden rounded-xl border border-zinc-700 bg-[#101018] shadow-2xl">
        {/* preview 3D */}
        <div className="relative flex-1">
          <Canvas shadows>
            <PerspectiveCamera makeDefault fov={CAMERA_FOV} position={[5, 12, 9]} />
            <OrbitControls makeDefault target={[0, 0.8, 0]} maxPolarAngle={Math.PI / 2.05} />
            <WorldPreview />
            <gridHelper args={[24, 24, '#facc15', '#33333f']} position={[0, 0.12, 0]} />
            <group ref={setTarget}>
              <AssetModel assetId={assetId} ignorePreset />
            </group>
            {target && (
              <TransformControls
                object={target}
                mode={mode}
                translationSnap={snap ? 0.25 : null}
                rotationSnap={snap ? Math.PI / 12 : null}
                scaleSnap={snap ? 0.1 : null}
                onObjectChange={() => {
                  setSaved(false);
                  setPreset((p) => readFromObject(target, p.notes));
                }}
              />
            )}
            {showReference && (
              <group position={[3, 0, 0]}>
                <PlayerModel />
              </group>
            )}
          </Canvas>
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/60 px-3 py-1.5 text-xs text-zinc-300">
            Drag the gizmo · right-click to orbit · scroll to zoom
          </div>
        </div>

        {/* panel de controles */}
        <div className="flex w-80 flex-col gap-4 overflow-y-auto border-l border-zinc-800 bg-[#13131c] p-5">
          <div>
            <div className="text-lg font-black uppercase tracking-wide text-yellow-300">{def?.name ?? assetId}</div>
            <div className="text-xs text-zinc-500">
              Placement editor · {modelUrl ? 'custom GLB' : 'default model'}
            </div>
          </div>

          <div className="flex gap-2">
            {modeBtn('translate', 'Move')}
            {modeBtn('rotate', 'Rotate')}
            {modeBtn('scale', 'Scale')}
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Snapping (0.25 u / 15°)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={showReference} onChange={(e) => setShowReference(e.target.checked)} />
            Show human reference
          </label>

          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <NumberRow
              label="Position"
              values={preset.position}
              step={0.05}
              onChange={(axis, v) => {
                const position = [...preset.position] as AssetPreset['position'];
                position[axis] = v;
                set({ position });
              }}
            />
            <NumberRow
              label="Rotation°"
              values={preset.rotation}
              step={1}
              toDisplay={(v) => (v * 180) / Math.PI}
              fromDisplay={(v) => (v * Math.PI) / 180}
              onChange={(axis, v) => {
                const rotation = [...preset.rotation] as AssetPreset['rotation'];
                rotation[axis] = v;
                set({ rotation });
              }}
            />
            <NumberRow
              label="Scale"
              values={preset.scale}
              step={0.05}
              onChange={(axis, v) => {
                const scale = [...preset.scale] as AssetPreset['scale'];
                scale[axis] = v;
                set({ scale });
              }}
            />
            <button
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              onClick={() => set({ scale: [preset.scale[0], preset.scale[0], preset.scale[0]] })}
            >
              Match scale (uniform = X)
            </button>
          </div>

          <div className="space-y-2">
            <FileRow
              hasCustom={!!modelUrl}
              onUpload={(f) => void setModel(assetId, f)}
              onClear={() => void clearModel(assetId)}
            />
          </div>

          <div className="mt-auto space-y-2">
            <button
              className="w-full rounded-lg bg-yellow-400 py-2.5 font-black uppercase tracking-widest text-black transition hover:bg-yellow-300 disabled:opacity-40"
              disabled={!dirty}
              onClick={() => {
                setAssetPreset(assetId, clonePreset(preset));
                setSaved(true);
              }}
            >
              Save & apply
            </button>
            {saved && <div className="text-center text-xs text-emerald-400">Preset applied to the live game.</div>}
            <button
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm font-bold uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
              onClick={() => set(clonePreset(DEFAULT_ASSET_PRESETS[assetId] ?? IDENTITY_PRESET))}
            >
              Reset to original preset
            </button>
            <button
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm font-bold uppercase tracking-wide text-zinc-300 hover:bg-zinc-800"
              onClick={() => openEditor(null)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileRow({ hasCustom, onUpload, onClear }: { hasCustom: boolean; onUpload: (f: File) => void; onClear: () => void }) {
  return (
    <div className="flex gap-2">
      <label className="flex-1 cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-zinc-200 hover:bg-zinc-800">
        Upload GLB
        <input
          type="file"
          accept=".glb,.gltf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = '';
          }}
        />
      </label>
      {hasCustom && (
        <button
          className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-300 hover:bg-red-900/50"
          onClick={onClear}
        >
          Remove
        </button>
      )}
    </div>
  );
}
