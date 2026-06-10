import { create } from 'zustand';
import { idbPut, idbGet, idbDelete, idbKeys } from '../engine/idb';

/**
 * Archivos custom del usuario (GLB de modelos y PNG de tiles) como object URLs.
 * Persisted in IndexedDB and rehydrated on startup.
 */
interface AssetStore {
  /** assetId -> objectURL del GLB custom. */
  modelUrls: Record<string, string>;
  /** slot de textura -> objectURL del PNG custom. */
  textureUrls: Record<string, string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setModel: (assetId: string, file: Blob) => Promise<void>;
  clearModel: (assetId: string) => Promise<void>;
  setTexture: (slot: string, file: Blob) => Promise<void>;
  clearTexture: (slot: string) => Promise<void>;
}

export const useAssetStore = create<AssetStore>()((set) => ({
  modelUrls: {},
  textureUrls: {},
  hydrated: false,

  hydrate: async () => {
    const keys = await idbKeys();
    const modelUrls: Record<string, string> = {};
    const textureUrls: Record<string, string> = {};
    for (const key of keys) {
      const blob = await idbGet<Blob>(key);
      if (!(blob instanceof Blob)) continue;
      if (key.startsWith('glb:')) modelUrls[key.slice(4)] = URL.createObjectURL(blob);
      else if (key.startsWith('tex:')) textureUrls[key.slice(4)] = URL.createObjectURL(blob);
    }
    set({ modelUrls, textureUrls, hydrated: true });
  },

  setModel: async (assetId, file) => {
    await idbPut(`glb:${assetId}`, file);
    set((s) => ({ modelUrls: { ...s.modelUrls, [assetId]: URL.createObjectURL(file) } }));
  },
  clearModel: async (assetId) => {
    await idbDelete(`glb:${assetId}`);
    set((s) => {
      const next = { ...s.modelUrls };
      delete next[assetId];
      return { modelUrls: next };
    });
  },
  setTexture: async (slot, file) => {
    await idbPut(`tex:${slot}`, file);
    set((s) => ({ textureUrls: { ...s.textureUrls, [slot]: URL.createObjectURL(file) } }));
  },
  clearTexture: async (slot) => {
    await idbDelete(`tex:${slot}`);
    set((s) => {
      const next = { ...s.textureUrls };
      delete next[slot];
      return { textureUrls: next };
    });
  },
}));
