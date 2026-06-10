import type { MapData, PlacementsData, Placement } from '../types';

/**
 * Genera placements automáticos para mapas importados sin capa de objetos:
 * spawn del jugador en una carretera, coches aparcados, árboles en césped
 * y bidones en plazas/aceras.
 */
export function autoPlacements(map: MapData): PlacementsData {
  const { width, height, grid, types } = map;
  const idOf = (tx: number, tz: number) => types[grid[tz * width + tx]].id;

  const roads: [number, number][] = [];
  const grass: [number, number][] = [];
  const plazas: [number, number][] = [];
  for (let z = 1; z < height - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      const id = idOf(x, z);
      if (id === 'road') roads.push([x, z]);
      else if (id === 'grass') grass.push([x, z]);
      else if (id === 'plaza' || id === 'sidewalk') plazas.push([x, z]);
    }
  }

  const placements: Placement[] = [];
  const center = roads[Math.floor(roads.length / 2)] ?? [width / 2, height / 2];

  // coches aparcados, espaciados por el mapa
  const carStep = Math.max(1, Math.floor(roads.length / 12));
  for (let i = 0; i < roads.length && placements.length < 12; i += carStep) {
    const [tx, tz] = roads[i];
    if (Math.abs(tx - center[0]) < 2 && Math.abs(tz - center[1]) < 2) continue;
    const vertical = idOf(tx, tz - 1) === 'road' && idOf(tx, tz + 1) === 'road';
    placements.push({
      asset: i % 3 === 2 ? 'van' : 'sedan',
      vehicle: i % 3 === 2 ? 'van' : 'sedan',
      tx, tz,
      rotY: vertical ? 0 : Math.PI / 2,
    });
  }
  // árboles
  for (let i = 0; i < grass.length; i += Math.max(1, Math.floor(grass.length / 30))) {
    const [tx, tz] = grass[i];
    placements.push({ asset: 'tree', tx, tz, rotY: (tx * 7 + tz * 13) % 6 });
  }
  // bidones
  for (let i = 0; i < plazas.length; i += Math.max(1, Math.floor(plazas.length / 8))) {
    const [tx, tz] = plazas[i];
    placements.push({ asset: 'barrel', tx, tz });
  }

  // pickups de armas y vida repartidos por zonas peatonales
  const pickupTypes = ['uzi', 'health', 'shotgun', 'health'];
  const pickups = pickupTypes.map((type, i) => {
    const spot = plazas[Math.floor(((i + 1) / (pickupTypes.length + 1)) * plazas.length)] ?? plazas[0] ?? center;
    return { type, tx: spot[0], tz: spot[1] };
  });

  return { playerStart: { tx: center[0], tz: center[1], rotY: 0 }, placements, pickups };
}
