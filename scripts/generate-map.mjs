// Generador del mapa por defecto + placements iniciales.
// Uso: npm run generate:map
// Produce: src/data/default-map.json y src/data/initial-placements.json
// El equipo puede regenerar/editar a mano o sustituir por un export de Tiled (.tmj).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'data');
mkdirSync(OUT, { recursive: true });

const W = 160;
const H = 160;

// RNG determinista para que el mapa sea reproducible
let seed = 20260610;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

// ---------- carreteras con espaciado irregular (manzanas variadas) ----------
function roadLines() {
  const lines = [4];
  let pos = 4;
  const steps = [10, 12, 14, 16];
  while (pos + 18 < W - 4) {
    pos += steps[Math.floor(rand() * steps.length)];
    lines.push(pos);
  }
  return lines;
}
const ROADS_X = roadLines();
const ROADS_Z = roadLines();

const isRoadX = (x) => ROADS_X.some((r) => x === r || x === r + 1);
const isRoadZ = (z) => ROADS_Z.some((r) => z === r || z === r + 1);

// ---------- grid ----------
const grid = Array.from({ length: H }, () => Array(W).fill('B'));
for (let z = 0; z < H; z++) {
  for (let x = 0; x < W; x++) {
    if (isRoadX(x) || isRoadZ(z)) grid[z][x] = 'R';
  }
}

// Manzanas entre carreteras (rangos interiores)
function blockRangesFor(roads, size) {
  const ranges = [];
  const edges = [-2, ...roads, size];
  for (let i = 0; i < edges.length - 1; i++) {
    const start = edges[i] + 2;
    const end = edges[i + 1] - 1;
    if (end >= start) ranges.push([start, end]);
  }
  return ranges;
}
const BX = blockRangesFor(ROADS_X, W);
const BZ = blockRangesFor(ROADS_Z, H);

const blocks = [];
for (let bz = 0; bz < BZ.length; bz++) {
  for (let bx = 0; bx < BX.length; bx++) {
    blocks.push({ bx, bz, x0: BX[bx][0], x1: BX[bx][1], z0: BZ[bz][0], z1: BZ[bz][1] });
  }
}

const center = (b) => [Math.floor((b.x0 + b.x1) / 2), Math.floor((b.z0 + b.z1) / 2)];

function paintBlock(b, ch, onlyB = true) {
  for (let z = b.z0; z <= b.z1; z++)
    for (let x = b.x0; x <= b.x1; x++)
      if (!onlyB || grid[z][x] === 'B') grid[z][x] = ch;
}

// ---------- distritos: parque / plaza / comercial / edificios ----------
const parks = [];
const plazas = [];
const shops = [];
for (const b of blocks) {
  const r = rand();
  // el centro de la ciudad concentra comercios; la periferia, parques
  const cx = (b.x0 + b.x1) / 2 / W - 0.5;
  const cz = (b.z0 + b.z1) / 2 / H - 0.5;
  const distCenter = Math.hypot(cx, cz); // 0 centro .. ~0.7 esquina
  if (r < 0.10 + distCenter * 0.12) {
    paintBlock(b, 'G');
    parks.push(b);
  } else if (r < 0.18 + distCenter * 0.12) {
    paintBlock(b, 'P');
    plazas.push(b);
  } else if (r < 0.36 - distCenter * 0.1 + 0.18) {
    // manzana comercial: anillo exterior de tiendas, interior edificio
    for (let z = b.z0; z <= b.z1; z++)
      for (let x = b.x0; x <= b.x1; x++) {
        const edge = x <= b.x0 + 1 || x >= b.x1 - 1 || z <= b.z0 + 1 || z >= b.z1 - 1;
        if (grid[z][x] === 'B' && edge) grid[z][x] = 'C';
      }
    shops.push(b);
  }
}

// ---------- talleres de pintura (garages): pads 3x3 pegados a una carretera ----------
const garages = [];
const garageCandidates = blocks.filter((b) => !parks.includes(b) && !plazas.includes(b));
const garageCount = 8;
for (let i = 0; i < garageCount && garageCandidates.length > 0; i++) {
  const idx = Math.floor((i / garageCount) * garageCandidates.length + rand() * 3) % garageCandidates.length;
  const b = garageCandidates.splice(idx, 1)[0];
  const [, cz] = center(b);
  // pad 3x3 en el borde oeste de la manzana (la acera delante lo conecta a la carretera)
  const gx = b.x0;
  const gz = Math.max(b.z0, Math.min(cz - 1, b.z1 - 2));
  for (let z = gz; z < gz + 3 && z <= b.z1; z++)
    for (let x = gx; x < gx + 3 && x <= b.x1; x++) grid[z][x] = 'T';
  garages.push([gx + 1, gz + 1]);
}

// ---------- aceras: tiles no-carretera con vecino de carretera ----------
for (let z = 0; z < H; z++) {
  for (let x = 0; x < W; x++) {
    if (grid[z][x] === 'R' || grid[z][x] === 'T') continue;
    let near = false;
    for (let dz = -1; dz <= 1 && !near; dz++)
      for (let dx = -1; dx <= 1 && !near; dx++) {
        const nx = x + dx, nz = z + dz;
        if (nx >= 0 && nz >= 0 && nx < W && nz < H && grid[nz][nx] === 'R') near = true;
      }
    if (near) grid[z][x] = 'S';
  }
}

// ---------- pasos de cebra: tramos rectos con acera + intersecciones ----------
function sidewalkAt(x, z) {
  return x >= 0 && z >= 0 && x < W && z < H && grid[z][x] === 'S';
}
function hasSidewalkEW(x, z) {
  return sidewalkAt(x - 1, z) || sidewalkAt(x + 1, z);
}
function hasSidewalkNS(x, z) {
  return sidewalkAt(x, z - 1) || sidewalkAt(x, z + 1);
}
function isIntersection(x, z) {
  return isRoadX(x) && isRoadZ(z);
}

// Cruces a mitad de manzana (carreteras verticales) — nunca en intersecciones
for (const rx of ROADS_X) {
  for (let li = 0; li < ROADS_Z.length - 1; li++) {
    const zStart = ROADS_Z[li] + 2;
    const zEnd = ROADS_Z[li + 1] - 1;
    if (zEnd <= zStart) continue;
    const zMid = Math.floor((zStart + zEnd) / 2);
    for (const dx of [0, 1]) {
      const x = rx + dx;
      if (grid[zMid][x] !== 'R') continue;
      if (isIntersection(x, zMid)) continue;
      if (!hasSidewalkEW(x, zMid)) continue;
      grid[zMid][x] = 'X';
    }
  }
}
// Cruces a mitad de manzana (carreteras horizontales) — nunca en intersecciones
for (const rz of ROADS_Z) {
  for (let li = 0; li < ROADS_X.length - 1; li++) {
    const xStart = ROADS_X[li] + 2;
    const xEnd = ROADS_X[li + 1] - 1;
    if (xEnd <= xStart) continue;
    const xMid = Math.floor((xStart + xEnd) / 2);
    for (const dz of [0, 1]) {
      const z = rz + dz;
      if (grid[z][xMid] !== 'R') continue;
      if (isIntersection(xMid, z)) continue;
      if (!hasSidewalkNS(xMid, z)) continue;
      grid[z][xMid] = 'X';
    }
  }
}

const map = { width: W, height: H, rows: grid.map((r) => r.join('')) };
writeFileSync(join(OUT, 'default-map.json'), JSON.stringify(map, null, 2));

// ---------- placements ----------
const placements = [];

// Coches aparcados junto al bordillo (variedad de modelos)
const PARKED = ['sedan', 'taxi', 'muscle', 'van', 'sport', 'pickup', 'sedan', 'taxi'];
let carIdx = 0;
for (const c of ROADS_X.filter((_, i) => i % 2 === 0)) {
  for (let r = 6; r < H - 6; r += 7 + Math.floor(rand() * 5)) {
    if (isRoadZ(r)) continue;
    if (rand() < 0.3) continue;
    const m = PARKED[carIdx % PARKED.length];
    placements.push({ asset: m, vehicle: m, tx: c, tz: r, rotY: c < W / 2 ? Math.PI : 0 });
    carIdx++;
  }
}

// Árboles en los parques
for (const b of parks) {
  for (let z = b.z0 + 1; z <= b.z1 - 1; z += 3)
    for (let x = b.x0 + 1; x <= b.x1 - 1; x += 3)
      if (rand() < 0.8) placements.push({ asset: 'tree', tx: x, tz: z, rotY: ((x * 7 + z * 13) % 6) });
}

// Fuentes en el centro de las plazas, bancos alrededor
for (const b of plazas) {
  const [cx, cz] = center(b);
  placements.push({ asset: 'fountain', tx: cx, tz: cz });
  placements.push(
    { asset: 'bench', tx: cx - 3, tz: cz, rotY: Math.PI / 2 },
    { asset: 'bench', tx: cx + 3, tz: cz, rotY: -Math.PI / 2 },
    { asset: 'bench', tx: cx, tz: cz - 3, rotY: Math.PI },
    { asset: 'bench', tx: cx, tz: cz + 3, rotY: 0 },
  );
}
// Alguna fuente también en parques grandes
for (const b of parks) {
  if (b.x1 - b.x0 >= 10 && b.z1 - b.z0 >= 10 && rand() < 0.5) {
    const [cx, cz] = center(b);
    placements.push({ asset: 'fountain', tx: cx, tz: cz });
  }
}

// Farolas en esquinas de cruces (una de cada dos para no saturar)
for (let i = 0; i < ROADS_X.length; i++) {
  for (let j = 0; j < ROADS_Z.length; j++) {
    if ((i + j) % 2 !== 0) continue;
    const c = ROADS_X[i], r = ROADS_Z[j];
    if (c - 1 >= 0 && r - 1 >= 0) placements.push({ asset: 'lamp', tx: c - 1, tz: r - 1, rotY: Math.PI / 4 });
    if (c + 2 < W && r + 2 < H) placements.push({ asset: 'lamp', tx: c + 2, tz: r + 2, rotY: Math.PI + Math.PI / 4 });
  }
}

// Semáforos en algunos cruces grandes
for (let i = 1; i < ROADS_X.length; i += 3) {
  for (let j = 1; j < ROADS_Z.length; j += 3) {
    const c = ROADS_X[i], r = ROADS_Z[j];
    placements.push({ asset: 'trafficlight', tx: c - 1, tz: r + 2, rotY: 0 });
    placements.push({ asset: 'trafficlight', tx: c + 2, tz: r - 1, rotY: Math.PI });
  }
}

// Hidrantes SIEMPRE sobre la acera (primera columna de la manzana, junto a la calzada)
for (const b of shops) {
  if (rand() < 0.7) placements.push({ asset: 'hydrant', tx: b.x0, tz: center(b)[1] });
}
for (const b of blocks) {
  if (shops.includes(b) || rand() > 0.25) continue;
  placements.push({ asset: 'hydrant', tx: center(b)[0], tz: b.z0 });
}

// Bidones explosivos: callejones y esquinas industriales
for (const b of plazas) {
  const [cx, cz] = center(b);
  placements.push(
    { asset: 'barrel', tx: cx + 3, tz: cz + 3 },
    { asset: 'barrel', tx: cx + 4, tz: cz + 3 },
  );
}
for (let i = 0; i < 14; i++) {
  const b = blocks[Math.floor(rand() * blocks.length)];
  if (parks.includes(b) || plazas.includes(b)) continue;
  placements.push({ asset: 'barrel', tx: b.x0 - 1, tz: b.z0 + 1 + Math.floor(rand() * 3) });
}

// ---------- pickups (armas y vida) ----------
const pickups = [];
const weaponTypes = ['uzi', 'shotgun'];
plazas.forEach((b, i) => {
  const [cx, cz] = center(b);
  pickups.push({ type: weaponTypes[i % 2], tx: cx + 1, tz: cz + 1 });
});
parks.forEach((b, i) => {
  if (i % 2 !== 0) return;
  const [cx, cz] = center(b);
  pickups.push({ type: 'health', tx: cx, tz: cz + 2 });
});
// extras en esquinas del mapa
pickups.push(
  { type: 'uzi', tx: 6, tz: Math.floor(H / 2) },
  { type: 'shotgun', tx: W - 6, tz: Math.floor(H / 2) },
  { type: 'health', tx: Math.floor(W / 2), tz: 6 },
  { type: 'health', tx: Math.floor(W / 2), tz: H - 6 },
);

// Start: junto a una carretera cerca del centro
const startRoadX = ROADS_X[Math.floor(ROADS_X.length / 2)];
const startRoadZ = ROADS_Z[Math.floor(ROADS_Z.length / 2)];

const out = {
  playerStart: { tx: startRoadX - 1, tz: startRoadZ + 3, rotY: Math.PI },
  placements,
  pickups,
};
writeFileSync(join(OUT, 'initial-placements.json'), JSON.stringify(out, null, 2));

console.log(
  `Mapa ${W}x${H}: ${blocks.length} manzanas (${parks.length} parques, ${plazas.length} plazas, ${shops.length} comerciales, ${garages.length} talleres), ${placements.length} placements, ${pickups.length} pickups.`,
);
