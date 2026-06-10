import { create } from 'zustand';
import type { MapData, PlacementsData } from '../types';
import { parseSimpleMap } from '../engine/mapLoader';
import { autoPlacements } from '../engine/autoPlace';
import { idbGet, idbPut, idbDelete } from '../engine/idb';
import defaultMapJson from '../data/default-map.json';
import defaultPlacementsJson from '../data/initial-placements.json';

export type Screen = 'menu' | 'game';

export interface HudState {
  health: number;
  speedKmh: number;
  inCar: boolean;
  dead: boolean;
  weapon: string;
  /** null = munición infinita. */
  ammo: number | null;
  wanted: number;
  money: number;
  gangs: { id: string; name: string; color: string; hostile: boolean }[];
}

export interface VehicleBannerState {
  name: string;
  token: number;
}

interface CustomMapStored {
  rows: string[];
  width: number;
  height: number;
  placements: PlacementsData | null;
}

interface GameStore {
  screen: Screen;
  paused: boolean;
  configOpen: boolean;
  /** id del asset abierto en el editor individual (null = cerrado). */
  editorAsset: string | null;
  muted: boolean;
  hud: HudState;
  vehicleBanner: VehicleBannerState | null;
  /** Se incrementa para forzar la reconstrucción del mundo. */
  worldVersion: number;
  customMap: { map: MapData; placements: PlacementsData | null } | null;

  startGame: () => void;
  exitToMenu: () => void;
  setPaused: (v: boolean) => void;
  setConfigOpen: (v: boolean) => void;
  openEditor: (assetId: string | null) => void;
  setMuted: (v: boolean) => void;
  setHud: (h: HudState) => void;
  showVehicleBanner: (name: string) => void;
  restartWorld: () => void;
  setCustomMap: (stored: CustomMapStored | null) => Promise<void>;
  hydrateCustomMap: () => Promise<void>;
}

export const useGameStore = create<GameStore>()((set) => ({
  screen: 'menu',
  paused: false,
  configOpen: false,
  editorAsset: null,
  muted: false,
  hud: { health: 100, speedKmh: 0, inCar: false, dead: false, weapon: 'Pistol', ammo: null, wanted: 0, money: 0, gangs: [] },
  vehicleBanner: null,
  worldVersion: 0,
  customMap: null,

  startGame: () => set({ screen: 'game', paused: false }),
  exitToMenu: () => set((s) => ({ screen: 'menu', paused: false, configOpen: false, vehicleBanner: null, worldVersion: s.worldVersion + 1 })),
  setPaused: (v) => set({ paused: v }),
  setConfigOpen: (v) => set({ configOpen: v }),
  openEditor: (assetId) => set({ editorAsset: assetId }),
  setMuted: (v) => set({ muted: v }),
  setHud: (h) => set({ hud: h }),
  showVehicleBanner: (name) =>
    set((s) => ({
      vehicleBanner: { name: name.trim() || 'Vehicle', token: (s.vehicleBanner?.token ?? 0) + 1 },
    })),
  restartWorld: () => set((s) => ({ worldVersion: s.worldVersion + 1, paused: false, vehicleBanner: null })),

  setCustomMap: async (stored) => {
    if (stored === null) {
      await idbDelete('map:custom');
      set((s) => ({ customMap: null, worldVersion: s.worldVersion + 1 }));
      return;
    }
    await idbPut('map:custom', JSON.stringify(stored));
    const map = parseSimpleMap({ width: stored.width, height: stored.height, rows: stored.rows });
    set((s) => ({ customMap: { map, placements: stored.placements }, worldVersion: s.worldVersion + 1 }));
  },

  hydrateCustomMap: async () => {
    const raw = await idbGet<string>('map:custom');
    if (typeof raw !== 'string') return;
    try {
      const stored = JSON.parse(raw) as CustomMapStored;
      const map = parseSimpleMap({ width: stored.width, height: stored.height, rows: stored.rows });
      set({ customMap: { map, placements: stored.placements } });
    } catch {
      await idbDelete('map:custom');
    }
  },
}));

export const DEFAULT_MAP: MapData = parseSimpleMap(defaultMapJson);
export const DEFAULT_PLACEMENTS = defaultPlacementsJson as PlacementsData;

/** Mapa y placements activos (custom si el usuario importó uno). */
export function getActiveMap(s: { customMap: GameStore['customMap'] }): { map: MapData; placements: PlacementsData } {
  if (s.customMap) {
    return {
      map: s.customMap.map,
      placements: s.customMap.placements ?? autoPlacements(s.customMap.map),
    };
  }
  return { map: DEFAULT_MAP, placements: DEFAULT_PLACEMENTS };
}
