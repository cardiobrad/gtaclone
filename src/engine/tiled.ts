import type { MapData, PlacementsData, Placement } from '../types';
import { TILE_TYPES } from './mapLoader';

/**
 * Importador de mapas de Tiled (export JSON, .tmj).
 *
 * Convención para el equipo de level design:
 * - Una capa de tiles (la primera "tilelayer") donde el ÍNDICE del tile en el
 *   tileset (gid - firstgid) corresponde al orden de tile-types.json:
 *   0=road, 1=sidewalk, 2=grass, 3=plaza, 4=building, 5=water.
 *   (También se respeta la propiedad custom "type" del tile si existe.)
 * - Una capa de objetos opcional llamada "placements": cada objeto con
 *   name = id del asset (sedan, van, barrel, tree, trafficlight) y rotación en grados.
 *   Un objeto llamado "player" marca el punto de spawn.
 */

interface TiledLayer {
  type: string;
  name: string;
  width?: number;
  height?: number;
  data?: number[];
  objects?: TiledObject[];
}
interface TiledObject { name: string; x: number; y: number; rotation?: number }
interface TiledTilesetTile { id: number; properties?: { name: string; value: unknown }[] }
interface TiledTileset { firstgid: number; tiles?: TiledTilesetTile[] }
interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets?: TiledTileset[];
}

const GID_FLAGS_MASK = 0x1fffffff; // Tiled usa los bits altos para flips

export function parseTiledMap(json: TiledMap): { map: MapData; placements: PlacementsData | null } {
  const tileLayer = json.layers.find((l) => l.type === 'tilelayer' && l.data);
  if (!tileLayer || !tileLayer.data) throw new Error('El .tmj no tiene ninguna capa de tiles con data.');

  const firstgid = json.tilesets?.[0]?.firstgid ?? 1;

  // mapping opcional por propiedad custom "type" en el tileset
  const typeByLocalId = new Map<number, number>();
  for (const t of json.tilesets?.[0]?.tiles ?? []) {
    const prop = t.properties?.find((p) => p.name === 'type');
    if (typeof prop?.value === 'string') {
      const idx = TILE_TYPES.findIndex((tt) => tt.id === prop.value);
      if (idx >= 0) typeByLocalId.set(t.id, idx);
    }
  }

  const width = tileLayer.width ?? json.width;
  const height = tileLayer.height ?? json.height;
  const grid = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const gid = (tileLayer.data[i] ?? 0) & GID_FLAGS_MASK;
    if (gid === 0) { grid[i] = TILE_TYPES.findIndex((t) => t.id === 'building'); continue; }
    const local = gid - firstgid;
    const mapped = typeByLocalId.get(local);
    grid[i] = mapped !== undefined ? mapped : Math.min(local, TILE_TYPES.length - 1);
  }
  const map: MapData = { width, height, grid, types: TILE_TYPES };

  // capa de objetos
  const objLayer = json.layers.find((l) => l.type === 'objectgroup');
  let placements: PlacementsData | null = null;
  if (objLayer?.objects?.length) {
    const list: Placement[] = [];
    let playerStart = { tx: width / 2, tz: height / 2, rotY: 0 };
    for (const o of objLayer.objects) {
      const tx = o.x / json.tilewidth - 0.5;
      const tz = o.y / json.tileheight - 0.5;
      const rotY = ((o.rotation ?? 0) * Math.PI) / 180;
      if (o.name === 'player') {
        playerStart = { tx, tz, rotY };
      } else {
        const isVehicle = o.name === 'sedan' || o.name === 'van';
        list.push({ asset: o.name, tx, tz, rotY, ...(isVehicle ? { vehicle: o.name } : {}) });
      }
    }
    placements = { playerStart, placements: list };
  }
  return { map, placements };
}
