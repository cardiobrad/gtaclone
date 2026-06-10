import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MapData } from '../types';
import { TILE_SIZE } from '../constants';
import { useSlotTexture } from './useSlotTexture';

interface TileInstance { x: number; z: number; y: number; rot: number }

/** Una InstancedMesh por slot de textura — performance first. */
function TileLayer({ instances, slot, color }: { instances: TileInstance[]; slot: string | null; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tex = useSlotTexture(slot ?? 'road_x');

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y - 0.05, inst.z);
      dummy.rotation.set(0, inst.rot, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);

  if (instances.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, instances.length]} receiveShadow frustumCulled={false}>
      <boxGeometry args={[TILE_SIZE, 0.1, TILE_SIZE]} />
      {slot ? (
        <meshStandardMaterial map={tex} roughness={0.95} />
      ) : (
        <meshStandardMaterial color={color} roughness={0.9} />
      )}
    </instancedMesh>
  );
}

/** Suelo completo del mapa agrupado por tipo de tile (y orientación de carretera). */
export function Tiles({ map }: { map: MapData }) {
  const layers = useMemo(() => {
    const buckets = new Map<string, { slot: string | null; color: string; instances: TileInstance[] }>();
    const push = (key: string, slot: string | null, color: string, inst: TileInstance) => {
      let b = buckets.get(key);
      if (!b) {
        b = { slot, color, instances: [] };
        buckets.set(key, b);
      }
      b.instances.push(inst);
    };

    const isRoadLike = (tx: number, tz: number) => {
      if (tx < 0 || tz < 0 || tx >= map.width || tz >= map.height) return false;
      const id = map.types[map.grid[tz * map.width + tx]].id;
      return id === 'road' || id === 'crosswalk';
    };

    for (let tz = 0; tz < map.height; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        const type = map.types[map.grid[tz * map.width + tx]];
        if (type.building) continue;
        const x = (tx - map.width / 2 + 0.5) * TILE_SIZE;
        const z = (tz - map.height / 2 + 0.5) * TILE_SIZE;
        const y = type.elevation;

        if (type.id === 'road') {
          const vertical = isRoadLike(tx, tz - 1) || isRoadLike(tx, tz + 1);
          const horizontal = isRoadLike(tx - 1, tz) || isRoadLike(tx + 1, tz);
          if (vertical && horizontal) push('road_x', 'road_x', type.color, { x, z, y, rot: 0 });
          else if (horizontal) push('road_h', 'road', type.color, { x, z, y, rot: Math.PI / 2 });
          else push('road_v', 'road', type.color, { x, z, y, rot: 0 });
        } else if (type.id === 'crosswalk') {
          const vertical = isRoadLike(tx, tz - 1) || isRoadLike(tx, tz + 1);
          const horizontal = isRoadLike(tx - 1, tz) || isRoadLike(tx + 1, tz);
          if (horizontal && !vertical) push('cross_h', 'crosswalk', type.color, { x, z, y, rot: Math.PI / 2 });
          else push('cross_v', 'crosswalk', type.color, { x, z, y, rot: 0 });
        } else {
          const slot = ['sidewalk', 'grass', 'plaza', 'garage'].includes(type.id) ? type.id : null;
          push(type.id, slot, type.color, { x, z, y, rot: 0 });
        }
      }
    }
    return [...buckets.entries()];
  }, [map]);

  return (
    <group>
      {layers.map(([key, layer]) => (
        <TileLayer key={key} instances={layer.instances} slot={layer.slot} color={layer.color} />
      ))}
    </group>
  );
}
