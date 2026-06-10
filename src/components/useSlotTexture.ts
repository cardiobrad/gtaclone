import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useAssetStore } from '../stores/assetStore';
import { defaultTexture } from '../engine/textures';

/** Textura de un slot: PNG custom del usuario si existe, si no la procedural por defecto. */
export function useSlotTexture(slot: string): THREE.Texture {
  const url = useAssetStore((s) => s.textureUrls[slot]);
  const [tex, setTex] = useState<THREE.Texture>(() => defaultTexture(slot));
  useEffect(() => {
    if (!url) {
      setTex(defaultTexture(slot));
      return;
    }
    let alive = true;
    new THREE.TextureLoader().load(url, (t) => {
      if (!alive) {
        t.dispose();
        return;
      }
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      setTex(t);
    });
    return () => { alive = false; };
  }, [url, slot]);
  return tex;
}
