import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MapData } from '../types';
import { TILE_SIZE } from '../constants';
import { buildingRegions } from '../engine/mapLoader';
import { useSlotTexture } from './useSlotTexture';

/** Alturas posibles (unidades de mundo); cada región contigua usa una sola. */
const HEIGHTS = [4, 6, 9, 12];
const FLOOR_HEIGHT = 2;

const TINTS = ['#ffffff', '#e8d8c8', '#cdd5e0', '#d8c8c8', '#c8d8cc'];

interface BucketData {
  height: number;
  /** repetición vertical de la fachada (los comercios usan 1: escaparate completo). */
  repeatY?: number;
  instances: { x: number; z: number; tint: string }[];
}

function BuildingBucket({ data, facade, roof }: { data: BucketData; facade: THREE.Texture; roof: THREE.Texture }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const materials = useMemo(() => {
    const f = facade.clone();
    f.needsUpdate = true;
    f.repeat.set(1, data.repeatY ?? data.height / FLOOR_HEIGHT);
    const side = new THREE.MeshStandardMaterial({ map: f, roughness: 0.9 });
    const top = new THREE.MeshStandardMaterial({ map: roof, roughness: 0.95 });
    const bottom = new THREE.MeshStandardMaterial({ color: '#222' });
    return [side, side, top, bottom, side, side];
  }, [facade, roof, data.height, data.repeatY]);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(TILE_SIZE, data.height, TILE_SIZE);
    g.translate(0, data.height / 2, 0);
    return g;
  }, [data.height]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    data.instances.forEach((inst, i) => {
      dummy.position.set(inst.x, 0, inst.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(inst.tint));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [data]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, materials, data.instances.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  );
}

const SHOP_HEIGHT = 3.2;
const SHOP_TINTS = ['#ffffff', '#f0e0cc', '#dce8f0', '#f0dcdc'];

export function Buildings({ map }: { map: MapData }) {
  const facade = useSlotTexture('facade');
  const shopFacade = useSlotTexture('shop_facade');
  const roof = useSlotTexture('roof');

  const { buckets, shopBucket } = useMemo(() => {
    const regions = buildingRegions(map);
    const result = new Map<number, BucketData>();
    const shopBucket: BucketData = { height: SHOP_HEIGHT, repeatY: 1, instances: [] };
    for (let tz = 0; tz < map.height; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        const i = tz * map.width + tx;
        const region = regions[i];
        if (region < 0) continue;
        const x = (tx - map.width / 2 + 0.5) * TILE_SIZE;
        const z = (tz - map.height / 2 + 0.5) * TILE_SIZE;

        // los comercios son edificios bajos con fachada de escaparate
        if (map.types[map.grid[i]].id === 'shop') {
          shopBucket.instances.push({ x, z, tint: SHOP_TINTS[(tx * 31 + tz * 17) % SHOP_TINTS.length] });
          continue;
        }

        // hash determinista de la región → altura y tinte
        const h = HEIGHTS[(region * 2654435761) % HEIGHTS.length];
        const tint = TINTS[(region * 40503) % TINTS.length];
        let bucket = result.get(h);
        if (!bucket) {
          bucket = { height: h, instances: [] };
          result.set(h, bucket);
        }
        bucket.instances.push({ x, z, tint });
      }
    }
    return { buckets: [...result.values()], shopBucket };
  }, [map]);

  return (
    <group>
      {buckets.map((b) => (
        <BuildingBucket key={b.height} data={b} facade={facade} roof={roof} />
      ))}
      {shopBucket.instances.length > 0 && (
        <BuildingBucket data={shopBucket} facade={shopFacade} roof={roof} />
      )}
    </group>
  );
}
