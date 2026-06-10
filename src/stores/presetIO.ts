import type { PresetBundle } from '../types';
import { usePresetStore } from './presetStore';
import { useAssetStore } from './assetStore';

/** Export presets (and custom textures as data URLs) to a downloadable JSON bundle. */
export async function exportPresetBundle(): Promise<void> {
  const { assetPresets, vehicleConfigs, weaponConfigs } = usePresetStore.getState();
  const { textureUrls } = useAssetStore.getState();

  const textures: Record<string, string> = {};
  for (const [slot, url] of Object.entries(textureUrls)) {
    const blob = await fetch(url).then((r) => r.blob());
    textures[slot] = await blobToDataUrl(blob);
  }

  const bundle: PresetBundle = { version: 1, assetPresets, vehicleConfigs, weaponConfigs, textures };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'anywhere-city-presets.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importPresetBundle(file: File): Promise<void> {
  const bundle = JSON.parse(await file.text()) as PresetBundle;
  if (bundle.version !== 1) throw new Error('Unsupported bundle version');
  usePresetStore.getState().importAll(bundle.assetPresets ?? {}, bundle.vehicleConfigs ?? {}, bundle.weaponConfigs);
  if (bundle.textures) {
    for (const [slot, dataUrl] of Object.entries(bundle.textures)) {
      const blob = await fetch(dataUrl).then((r) => r.blob());
      await useAssetStore.getState().setTexture(slot, blob);
    }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
