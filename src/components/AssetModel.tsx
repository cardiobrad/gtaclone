import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { usePresetStore, IDENTITY_PRESET } from '../stores/presetStore';
import { useAssetStore } from '../stores/assetStore';
import { FALLBACK_MODELS, UnknownModel } from './fallbacks';

const gltfCache = new Map<string, Promise<GLTF>>();

function loadGltf(url: string): Promise<GLTF> {
  let p = gltfCache.get(url);
  if (!p) {
    p = new GLTFLoader().loadAsync(url);
    gltfCache.set(url, p);
  }
  return p;
}

/** GLB del usuario, clonado por instancia y con sombras activadas. */
function CustomGLB({ url }: { url: string }) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    loadGltf(url)
      .then((gltf) => {
        if (!alive) return;
        const clone = gltf.scene.clone(true);
        clone.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        setScene(clone);
      })
      .catch((err) => console.error('Error cargando GLB', url, err));
    return () => { alive = false; };
  }, [url]);
  if (!scene) return null;
  return <primitive object={scene} />;
}

/**
 * Modelo de un asset con su preset de posicionamiento aplicado.
 *
 * REGLA DE ORO: el GLTF original nunca se modifica; el preset (position /
 * rotation / scale) vive en un <group> wrapper. Así el artista puede subir
 * el modelo con el pivot que quiera y ajustarlo en el editor.
 */
export function AssetModel({
  assetId,
  ignorePreset = false,
  fallbackProps,
}: {
  assetId: string;
  ignorePreset?: boolean;
  /** Props extra para el modelo fallback (p. ej. variante de peatón). */
  fallbackProps?: Record<string, unknown>;
}) {
  const preset = usePresetStore((s) => s.assetPresets[assetId]) ?? IDENTITY_PRESET;
  const url = useAssetStore((s) => s.modelUrls[assetId]);
  const p = ignorePreset ? IDENTITY_PRESET : preset;
  const Fallback = FALLBACK_MODELS[assetId];
  return (
    <group
      position={p.position}
      rotation={[p.rotation[0], p.rotation[1], p.rotation[2]]}
      scale={p.scale}
    >
      {url ? <CustomGLB url={url} /> : Fallback ? Fallback(fallbackProps) : <UnknownModel />}
    </group>
  );
}
