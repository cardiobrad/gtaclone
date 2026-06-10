import type { MapData, TileTypeDef } from '../types';
import { TILE_SIZE } from '../constants';
import tileTypesJson from '../data/tile-types.json';

export const TILE_TYPES = tileTypesJson as TileTypeDef[];

export interface SimpleMapJson {
  width: number;
  height: number;
  rows: string[];
}

/** Parsea el formato simple de mapa (rows de caracteres, ver tile-types.json). */
export function parseSimpleMap(json: SimpleMapJson): MapData {
  const { width, height, rows } = json;
  const charToIndex = new Map<string, number>();
  TILE_TYPES.forEach((t, i) => charToIndex.set(t.char, i));
  const grid = new Uint8Array(width * height);
  for (let z = 0; z < height; z++) {
    const row = rows[z] ?? '';
    for (let x = 0; x < width; x++) {
      grid[z * width + x] = charToIndex.get(row[x] ?? 'B') ?? 0;
    }
  }
  return { width, height, grid, types: TILE_TYPES };
}

export function tileAt(map: MapData, tx: number, tz: number): TileTypeDef | null {
  if (tx < 0 || tz < 0 || tx >= map.width || tz >= map.height) return null;
  return map.types[map.grid[tz * map.width + tx]];
}

export function isBlocked(map: MapData, tx: number, tz: number): boolean {
  const t = tileAt(map, tx, tz);
  return t === null || !!t.blocked;
}

/** Centro de un tile en coordenadas de mundo. */
export function tileToWorld(map: MapData, t: number, axis: 'x' | 'z'): number {
  const size = axis === 'x' ? map.width : map.height;
  return (t - size / 2 + 0.5) * TILE_SIZE;
}

export function worldToTile(map: MapData, w: number, axis: 'x' | 'z'): number {
  const size = axis === 'x' ? map.width : map.height;
  return Math.floor(w / TILE_SIZE + size / 2);
}

/**
 * Regiones contiguas de edificios (flood fill). Cada región comparte altura,
 * para que los bloques adyacentes parezcan un único edificio.
 */
export function buildingRegions(map: MapData): Int16Array {
  const { width, height, grid, types } = map;
  const region = new Int16Array(width * height).fill(-1);
  let next = 0;
  const stack: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (!types[grid[i]].building || region[i] !== -1) continue;
    const id = next++;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      if (region[j] !== -1 || !types[grid[j]].building) continue;
      region[j] = id;
      const x = j % width;
      const z = Math.floor(j / width);
      if (x > 0) stack.push(j - 1);
      if (x < width - 1) stack.push(j + 1);
      if (z > 0) stack.push(j - width);
      if (z < height - 1) stack.push(j + width);
    }
  }
  return region;
}
