import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssetPreset, VehicleConfig, WeaponConfig } from '../types';
import defaultAssetPresets from '../data/asset-presets.json';
import defaultVehicleConfigs from '../data/vehicle-configs.json';
import defaultWeaponConfigs from '../data/weapon-configs.json';

const DEFAULT_ASSET_PRESETS = defaultAssetPresets as unknown as Record<string, AssetPreset>;
const DEFAULT_VEHICLE_CONFIGS = defaultVehicleConfigs as Record<string, VehicleConfig>;
const DEFAULT_WEAPON_CONFIGS = defaultWeaponConfigs as Record<string, WeaponConfig>;

export const IDENTITY_PRESET: AssetPreset = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

interface PresetStore {
  assetPresets: Record<string, AssetPreset>;
  vehicleConfigs: Record<string, VehicleConfig>;
  weaponConfigs: Record<string, WeaponConfig>;
  setAssetPreset: (id: string, preset: AssetPreset) => void;
  resetAssetPreset: (id: string) => void;
  setVehicleConfig: (id: string, cfg: VehicleConfig) => void;
  resetVehicleConfig: (id: string) => void;
  setWeaponConfig: (id: string, cfg: WeaponConfig) => void;
  resetWeaponConfig: (id: string) => void;
  importAll: (
    assets: Record<string, AssetPreset>,
    vehicles: Record<string, VehicleConfig>,
    weapons?: Record<string, WeaponConfig>,
  ) => void;
  resetAll: () => void;
}

export const usePresetStore = create<PresetStore>()(
  persist(
    (set) => ({
      assetPresets: { ...DEFAULT_ASSET_PRESETS },
      vehicleConfigs: { ...DEFAULT_VEHICLE_CONFIGS },
      weaponConfigs: { ...DEFAULT_WEAPON_CONFIGS },
      setAssetPreset: (id, preset) =>
        set((s) => ({ assetPresets: { ...s.assetPresets, [id]: preset } })),
      resetAssetPreset: (id) =>
        set((s) => ({
          assetPresets: { ...s.assetPresets, [id]: DEFAULT_ASSET_PRESETS[id] ?? IDENTITY_PRESET },
        })),
      setVehicleConfig: (id, cfg) =>
        set((s) => ({ vehicleConfigs: { ...s.vehicleConfigs, [id]: cfg } })),
      resetVehicleConfig: (id) =>
        set((s) => ({
          vehicleConfigs: { ...s.vehicleConfigs, [id]: DEFAULT_VEHICLE_CONFIGS[id] },
        })),
      setWeaponConfig: (id, cfg) =>
        set((s) => ({ weaponConfigs: { ...s.weaponConfigs, [id]: cfg } })),
      resetWeaponConfig: (id) =>
        set((s) => ({
          weaponConfigs: { ...s.weaponConfigs, [id]: DEFAULT_WEAPON_CONFIGS[id] },
        })),
      importAll: (assets, vehicles, weapons) =>
        set(() => ({
          assetPresets: { ...DEFAULT_ASSET_PRESETS, ...assets },
          vehicleConfigs: { ...DEFAULT_VEHICLE_CONFIGS, ...vehicles },
          weaponConfigs: { ...DEFAULT_WEAPON_CONFIGS, ...(weapons ?? {}) },
        })),
      resetAll: () =>
        set(() => ({
          assetPresets: { ...DEFAULT_ASSET_PRESETS },
          vehicleConfigs: { ...DEFAULT_VEHICLE_CONFIGS },
          weaponConfigs: { ...DEFAULT_WEAPON_CONFIGS },
        })),
    }),
    {
      name: 'anywhere-city-presets',
      // Merge persisted state over defaults so newly added assets/vehicles
      // (e.g. patrol car) still exist when older saved data is loaded
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PresetStore>;
        return {
          ...current,
          assetPresets: { ...current.assetPresets, ...(p.assetPresets ?? {}) },
          vehicleConfigs: { ...current.vehicleConfigs, ...(p.vehicleConfigs ?? {}) },
          weaponConfigs: { ...current.weaponConfigs, ...(p.weaponConfigs ?? {}) },
        };
      },
    },
  ),
);

export function getAssetPreset(id: string): AssetPreset {
  return usePresetStore.getState().assetPresets[id] ?? IDENTITY_PRESET;
}

export function getVehicleConfig(id: string): VehicleConfig {
  const cfg = usePresetStore.getState().vehicleConfigs[id];
  return cfg ?? Object.values(usePresetStore.getState().vehicleConfigs)[0];
}

export function getWeaponConfig(id: string): WeaponConfig {
  const cfg = usePresetStore.getState().weaponConfigs[id];
  return cfg ?? DEFAULT_WEAPON_CONFIGS.pistol;
}

export { DEFAULT_ASSET_PRESETS, DEFAULT_VEHICLE_CONFIGS, DEFAULT_WEAPON_CONFIGS };
