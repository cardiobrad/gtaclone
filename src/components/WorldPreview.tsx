import { useMemo } from 'react';
import type { MapData } from '../types';
import { TILE_TYPES } from '../engine/mapLoader';
import { Lighting } from './Lighting';
import { Tiles } from './Tiles';
import { Buildings } from './Buildings';

/**
 * Chunk representativo del mundo (cruce de carreteras + edificio + césped)
 * usado por el editor de assets. Usa EXACTAMENTE los mismos componentes,
 * materiales y luces que el GameScene: si queda bien aquí, queda bien en el juego.
 */
function makePreviewMap(): MapData {
  const size = 12;
  const grid = new Uint8Array(size * size);
  const idx = (id: string) => TILE_TYPES.findIndex((t) => t.id === id);
  const road = idx('road');
  const sidewalk = idx('sidewalk');
  const grass = idx('grass');
  const building = idx('building');
  const plaza = idx('plaza');

  const isRoadLine = (i: number) => i === 5 || i === 6;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      let t: number;
      if (isRoadLine(x) || isRoadLine(z)) t = road;
      else if (x < 4 && z < 4) t = building;
      else if (x > 7 && z > 7) t = plaza;
      else t = grass;
      grid[z * size + x] = t;
    }
  }
  // aceras alrededor de la carretera
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      if (grid[z * size + x] === road) continue;
      let near = false;
      for (let dz = -1; dz <= 1 && !near; dz++)
        for (let dx = -1; dx <= 1 && !near; dx++) {
          const nx = x + dx, nz = z + dz;
          if (nx >= 0 && nz >= 0 && nx < size && nz < size && grid[nz * size + nx] === road) near = true;
        }
      if (near && grid[z * size + x] !== building) grid[z * size + x] = sidewalk;
    }
  }
  return { width: size, height: size, grid, types: TILE_TYPES };
}

export function WorldPreview() {
  const map = useMemo(makePreviewMap, []);
  return (
    <>
      <color attach="background" args={['#10131c']} />
      <Lighting shadowSize={20} />
      <Tiles map={map} />
      <Buildings map={map} />
    </>
  );
}
