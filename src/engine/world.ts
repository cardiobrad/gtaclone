import type { MapData, PlacementsData, VehicleConfig, WeaponConfig, GangDef } from '../types';
import {
  TILE_SIZE, PLAYER_SPEED, PLAYER_RADIUS, PLAYER_MAX_HEALTH,
  MAX_BULLETS,
  EXPLOSION_DAMAGE_RADIUS, EXPLOSION_IMPULSE_RADIUS, EXPLOSION_CHAIN_RADIUS, EXPLOSION_DAMAGE,
  CAR_ENTER_DIST, BARREL_CAR_EXPLODE_SPEED,
  PED_COUNT, PED_WALK_SPEED, PED_FLEE_SPEED, PED_RADIUS, PED_CORPSE_TIME, PED_RUNOVER_SPEED,
  TRAFFIC_COUNT, TRAFFIC_CRUISE,
  PICKUP_RADIUS, PICKUP_RESPAWN, HEALTH_PICKUP_AMOUNT,
  CRASH_DAMAGE_THRESHOLD, CRASH_DAMAGE_SCALE,
  WANTED_THRESHOLDS, HEAT_DECAY, HEAT_DECAY_DELAY,
  CRIME_PED_KILL, CRIME_GANG_KILL, CRIME_COP_KILL, CRIME_CAR_DESTROY,
  MAX_COPS, COP_SPEED, COP_SHOOT_RANGE, COP_SHOOT_COOLDOWN, COP_BULLET_DAMAGE,
  MAX_POLICE_CARS, POLICE_CRUISE,
  GANG_MEMBERS_PER_GANG, GANG_SPEED, GANG_SHOOT_RANGE, GANG_SHOOT_COOLDOWN, GANG_BULLET_DAMAGE,
  GANG_AGGRO_DIST, GANG_KILL_RESPECT, GANG_RESPECT_MAX, GANG_RESPECT_REGEN,
  MONEY_PED, MONEY_GANG, MONEY_COP, MONEY_CAR,
  RUNOVER_PLAYER_SPEED,
  CRIME_SHOOT_RATE, GARAGE_CLEAR_TIME, GARAGE_COST, OFFROAD_DRAG,
  PROP_KNOCK_MIN_SPEED, PROP_KNOCK_DESPAWN, HYDRANT_DESPAWN,
  EJECT_PASSENGER_CHANCE, EJECT_DOWNED_TIME, ANGRY_TIME, PUNCH_REACH, PUNCH_COOLDOWN, PUNCH_DAMAGE,
  PED_RECYCLE_DIST, PED_SPAWN_MIN, PED_SPAWN_MAX,
  TRAFFIC_RECYCLE_DIST, TRAFFIC_SPAWN_MIN, TRAFFIC_SPAWN_MAX,
  MEDIC_SPEED, MEDIC_HEAL_TIME, MEDIC_DISPATCH_COOLDOWN, MEDIC_DETECT_DIST,
  AMBULANCE_ARRIVE_DIST, AMBULANCE_STUCK_DIST, AMBULANCE_STUCK_TIME, AMBULANCE_CRUISE,
  POLICE_DEPLOY_DIST, POLICE_DEPLOY_SPEED,
} from '../constants';
import { tileToWorld } from './mapLoader';
import { input } from './input';
import gangsJson from '../data/gangs.json';

export const GANGS = gangsJson as GangDef[];

// ---------------------------------------------------------------- tipos

export interface PlayerState {
  x: number; z: number;
  heading: number;
  health: number;
  carId: string | null;
  shootCooldown: number;
  moving: boolean;
  deadTimer: number;
  weapons: Record<string, number>;
  currentWeapon: string;
  money: number;
  /** invulnerabilidad breve tras un atropello. */
  hurtCooldown: number;
}

export type CarKind = 'civ' | 'police' | 'ambulance';

export interface CarState {
  id: string;
  assetId: string;
  configId: string;
  kind: CarKind;
  /** los coches patrulla viven en un pool: inactivos hasta que sube el wanted. */
  active: boolean;
  x: number; z: number;
  heading: number;
  vx: number; vz: number;
  drift: number;
  health: number;
  dead: boolean;
  ai: boolean;
  aiSpeed: number;
  targetHeading: number;
  laneCoord: number | null;
  lastTile: number;
  stun: number;
  blockedTime: number;
  /** reciclaje de patrullas destruidas. */
  recycle: number;
  /** polis ya desplegados desde este coche patrulla. */
  deployed: boolean;
}

export type PedKind = 'civ' | 'cop' | 'gang' | 'medic';
export type PedAIState = 'walk' | 'flee' | 'chase' | 'dead' | 'downed';

export interface PedState {
  id: string;
  kind: PedKind;
  gangId?: string;
  active: boolean;
  x: number; z: number;
  heading: number;
  dirX: number; dirZ: number;
  state: PedAIState;
  timer: number;
  variant: number;
  shootCooldown: number;
  /** agresividad individual de pandilleros provocados. */
  provoked: number;
  /** civiles cabreados (p. ej. conductor eyectado) que atacan a puñetazos. */
  angry: number;
  moving: boolean;
}

export interface PickupState {
  id: string;
  type: string;
  x: number; z: number;
  active: boolean;
  respawn: number;
}

export interface PropState {
  id: string;
  assetId: string;
  x: number; z: number;
  rotY: number;
  alive: boolean;
  fuse: number;
  radius: number;
  explosive: boolean;
  /** quién encendió la mecha (atribución del crimen de la explosión). */
  litByPlayer: boolean;
  /** props volcables por coches (hidrante, farola, semáforo). */
  knockable: boolean;
  knocked: boolean;
  /** segundos desde el golpe (anima la caída y programa el despawn). */
  knockTime: number;
  knockDirX: number;
  knockDirZ: number;
}

export interface BulletState {
  x: number; z: number;
  dx: number; dz: number;
  life: number;
  speed: number;
  damage: number;
  fromPlayer: boolean;
}

export interface WorldEvents {
  onPunch: (x: number, z: number) => void;
  onExplosion: (x: number, z: number) => void;
  onShoot: (x: number, z: number, heading: number) => void;
  onCrash: (intensity: number) => void;
  onPlayerDeath: () => void;
  onPedDeath: (x: number, z: number) => void;
  onPickup: (type: string) => void;
  onBulletHit: (x: number, z: number) => void;
  /** taller de pintura: wanted limpiado. */
  onRespray: (x: number, z: number) => void;
  /** un sanitario ha revivido a un peatón. */
  onHeal: (x: number, z: number) => void;
  /** el jugador acaba de subir a un vehículo. */
  onVehicleEnter: (configId: string) => void;
}

export interface World {
  map: MapData;
  player: PlayerState;
  cars: CarState[];
  peds: PedState[];
  props: PropState[];
  pickups: PickupState[];
  bullets: BulletState[];
  walkTiles: [number, number][];
  roadTiles: [number, number][];
  gangWalkTiles: Record<string, [number, number][]>;
  gangRespect: Record<string, number>;
  /** crimen acumulado → estrellas. */
  heat: number;
  wanted: number;
  timeSinceCrime: number;
  copSpawnTimer: number;
  policeSpawnTimer: number;
  garageTimer: number;
  /** streaming de población: cadencia del reciclado de NPCs lejanos. */
  popTimer: number;
  /** misión de la ambulancia. */
  medicStage: 'idle' | 'driving' | 'healing' | 'returning';
  medicTargetId: string | null;
  medicTimer: number;
  /** segundos parado cerca del herido sin poder acercarse más (dispara la bajada). */
  medicArriveStuck: number;
  startX: number; startZ: number; startRot: number;
  time: number;
}

const PROP_RADIUS: Record<string, number> = {
  barrel: 0.45,
  tree: 0.4,
  trafficlight: 0.22,
  fountain: 1.35,
  lamp: 0.16,
  bench: 0.5,
  hydrant: 0.2,
};

/** Modelos civiles del tráfico IA (con repetición ponderada). */
const CIV_TRAFFIC = ['sedan', 'taxi', 'sedan', 'van', 'muscle', 'taxi', 'pickup', 'sport', 'sedan', 'bus', 'van', 'truck'];

/** Props que un coche puede volcar (en vez de chocar contra ellos). */
const KNOCKABLE = new Set(['hydrant', 'lamp', 'trafficlight']);

// ---------------------------------------------------------------- helpers

function toTileX(map: MapData, x: number) { return Math.floor(x / TILE_SIZE + map.width / 2); }
function toTileZ(map: MapData, z: number) { return Math.floor(z / TILE_SIZE + map.height / 2); }

function tileIdAt(map: MapData, tx: number, tz: number): string | null {
  if (tx < 0 || tz < 0 || tx >= map.width || tz >= map.height) return null;
  return map.types[map.grid[tz * map.width + tx]].id;
}

function isRoadAt(map: MapData, tx: number, tz: number) {
  const id = tileIdAt(map, tx, tz);
  return id === 'road' || id === 'crosswalk';
}

function isPedPathTile(id: string | null): boolean {
  return id === 'sidewalk' || id === 'plaza' || id === 'grass' || id === 'crosswalk';
}

function pedTileAt(w: World, ped: PedState): string | null {
  return tileIdAt(w.map, toTileX(w.map, ped.x), toTileZ(w.map, ped.z));
}

/** ¿El coche va hacia el peatón? */
function carHeadingToward(car: CarState, px: number, pz: number): boolean {
  const dx = px - car.x, dz = pz - car.z;
  const dist = Math.hypot(dx, dz) || 1;
  const toPed = Math.atan2(dx / dist, dz / dist);
  let dh = toPed - car.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  return Math.abs(dh) < 0.65;
}

/** Imprudencia: acera/césped, paso de cebra a velocidad, o acercarse rápido al peatón. */
function isVehicleReckless(w: World, car: CarState, ped: PedState): boolean {
  const speed = Math.max(Math.hypot(car.vx, car.vz), car.aiSpeed);
  const surface = tileIdAt(w.map, toTileX(w.map, car.x), toTileZ(w.map, car.z));
  if (surface === 'sidewalk' || surface === 'grass' || surface === 'plaza') return true;
  if (surface === 'crosswalk' && speed > 4) return true;
  const dist = Math.hypot(car.x - ped.x, car.z - ped.z);
  if (speed > 7 && dist < 10 && carHeadingToward(car, ped.x, ped.z)) return true;
  return false;
}

/** Huye si un vehículo imprudente está cerca. */
function fleeFromRecklessVehicle(w: World, ped: PedState): boolean {
  if (ped.kind !== 'civ' && ped.kind !== 'gang') return false;
  if (ped.state === 'dead' || ped.state === 'downed' || ped.angry > 0) return false;
  for (const car of w.cars) {
    if (!car.active || car.dead) continue;
    if (!isVehicleReckless(w, car, ped)) continue;
    const dist = Math.hypot(car.x - ped.x, car.z - ped.z);
    if (dist > 14) continue;
    ped.state = 'flee';
    ped.timer = 2.5 + Math.random() * 2;
    const dx = ped.x - car.x, dz = ped.z - car.z;
    const d = Math.hypot(dx, dz) || 1;
    ped.dirX = dx / d;
    ped.dirZ = dz / d;
    return true;
  }
  return false;
}

/** En calzada sin paso de cebra: volver a acera o paso legal más cercano. */
function steerPedToLegalTile(w: World, ped: PedState): boolean {
  if (pedTileAt(w, ped) !== 'road') return false;
  let bestDist = Infinity;
  let bestDx = 0;
  let bestDz = 0;
  const tx = toTileX(w.map, ped.x);
  const tz = toTileZ(w.map, ped.z);
  for (let dz = -14; dz <= 14; dz++) {
    for (let dx = -14; dx <= 14; dx++) {
      const id = tileIdAt(w.map, tx + dx, tz + dz);
      if (id !== 'sidewalk' && id !== 'crosswalk') continue;
      const wx = tileToWorld(w.map, tx + dx, 'x');
      const wz = tileToWorld(w.map, tz + dz, 'z');
      const d = Math.hypot(wx - ped.x, wz - ped.z);
      if (d < bestDist) {
        bestDist = d;
        const dd = d || 1;
        bestDx = (wx - ped.x) / dd;
        bestDz = (wz - ped.z) / dd;
      }
    }
  }
  if (bestDist === Infinity) return false;
  ped.dirX = bestDx;
  ped.dirZ = bestDz;
  return true;
}

/** ¿Cruzar en esta dirección lleva de acera a acera por paso de cebra? */
function pedCanCrossViaCrosswalk(w: World, ped: PedState, dx: number, dz: number): boolean {
  let sawCross = false;
  for (let s = 1; s <= 5; s++) {
    const id = tileIdAt(
      w.map,
      toTileX(w.map, ped.x + dx * s * 1.4),
      toTileZ(w.map, ped.z + dz * s * 1.4),
    );
    if (id === 'crosswalk') { sawCross = true; continue; }
    if (id === 'road') return false;
    if (isPedPathTile(id) && id !== 'crosswalk') return sawCross;
    return false;
  }
  return sawCross;
}

function angleLerp(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function laneCoordFor(map: MapData, tx: number, tz: number, dirX: number, dirZ: number): number {
  if (dirZ !== 0) {
    const base = isRoadAt(map, tx - 1, tz) ? tx - 1 : tx;
    const laneTx = dirZ > 0 ? base : Math.min(base + 1, map.width - 1);
    return tileToWorld(map, laneTx, 'x');
  }
  const base = isRoadAt(map, tx, tz - 1) ? tz - 1 : tz;
  const laneTz = dirX > 0 ? base : Math.min(base + 1, map.height - 1);
  return tileToWorld(map, laneTz, 'z');
}

// ---------------------------------------------------------------- creación

export function createWorld(map: MapData, placements: PlacementsData): World {
  const twx = (t: number) => tileToWorld(map, t, 'x');
  const twz = (t: number) => tileToWorld(map, t, 'z');
  const startX = twx(placements.playerStart.tx);
  const startZ = twz(placements.playerStart.tz);

  const cars: CarState[] = [];
  const props: PropState[] = [];
  let n = 0;

  const makeCar = (assetId: string, configId: string, x: number, z: number, heading: number, ai: boolean, kind: CarKind = 'civ', active = true): CarState => ({
    id: `car-${n++}`, assetId, configId, kind, active, x, z, heading,
    vx: 0, vz: 0, drift: 0,
    health: 999,
    dead: false,
    ai, aiSpeed: 0, targetHeading: heading, laneCoord: null, lastTile: -1, stun: 0, blockedTime: 0, recycle: 0, deployed: false,
  });

  for (const p of placements.placements) {
    const x = twx(p.tx);
    const z = twz(p.tz);
    if (p.vehicle) {
      cars.push(makeCar(p.asset, p.vehicle, x, z, p.rotY ?? 0, false));
    } else {
      props.push({
        id: `prop-${n++}`, assetId: p.asset, x, z, rotY: p.rotY ?? 0,
        alive: true, fuse: 0,
        radius: PROP_RADIUS[p.asset] ?? 0.35,
        explosive: p.asset === 'barrel',
        litByPlayer: false,
        knockable: KNOCKABLE.has(p.asset),
        knocked: false, knockTime: 0, knockDirX: 0, knockDirZ: 1,
      });
    }
  }

  const walkTiles: [number, number][] = [];
  const roadTiles: [number, number][] = [];
  for (let tz = 1; tz < map.height - 1; tz++) {
    for (let tx = 1; tx < map.width - 1; tx++) {
      const id = tileIdAt(map, tx, tz);
      if (id === 'sidewalk' || id === 'plaza' || id === 'grass') walkTiles.push([tx, tz]);
      else if (id === 'road') roadTiles.push([tx, tz]);
    }
  }

  // tráfico IA repartido por las carreteras
  const shuffledRoads = seededShuffle(roadTiles, 1337);
  let placed = 0;
  for (const [tx, tz] of shuffledRoads) {
    if (placed >= TRAFFIC_COUNT) break;
    if (Math.abs(twx(tx) - startX) < 12 && Math.abs(twz(tz) - startZ) < 12) continue;
    const vertical = isRoadAt(map, tx, tz - 1) && isRoadAt(map, tx, tz + 1);
    const dir: [number, number] = vertical
      ? (isRoadAt(map, tx - 1, tz) ? [0, -1] : [0, 1])
      : (isRoadAt(map, tx, tz - 1) ? [-1, 0] : [1, 0]);
    const heading = Math.atan2(dir[0], dir[1]);
    const model = CIV_TRAFFIC[placed % CIV_TRAFFIC.length];
    const car = makeCar(model, model, twx(tx), twz(tz), heading, true);
    car.laneCoord = laneCoordFor(map, tx, tz, dir[0], dir[1]);
    cars.push(car);
    placed++;
  }

  // pool de coches patrulla (inactivos hasta que sube el wanted)
  for (let i = 0; i < MAX_POLICE_CARS; i++) {
    cars.push(makeCar('police', 'police', 0, -9999, 0, true, 'police', false));
  }

  // ambulancia (acude cuando hay peatones muertos)
  cars.push(makeCar('ambulance', 'ambulance', 0, -9999, 0, true, 'ambulance', false));

  const peds: PedState[] = [];
  let pedN = 0;
  const makePed = (kind: PedKind, x: number, z: number, active: boolean, gangId?: string): PedState => ({
    id: `ped-${pedN++}`, kind, gangId, active,
    x, z,
    heading: Math.random() * Math.PI * 2,
    dirX: 0, dirZ: 0,
    state: 'walk', timer: 0,
    variant: pedN % 5,
    shootCooldown: 0,
    provoked: 0,
    angry: 0,
    moving: false,
  });

  // civiles
  const shuffledWalk = seededShuffle(walkTiles, 4242);
  for (let i = 0; i < Math.min(PED_COUNT, shuffledWalk.length); i++) {
    const [tx, tz] = shuffledWalk[i];
    peds.push(makePed('civ', twx(tx), twz(tz), true));
  }

  // bandas en sus territorios
  const gangWalkTiles: Record<string, [number, number][]> = {};
  const gangRespect: Record<string, number> = {};
  for (const gang of GANGS) {
    const t = gang.territory;
    const tiles = walkTiles.filter(([tx, tz]) => tx >= t.x0 && tx <= t.x1 && tz >= t.z0 && tz <= t.z1);
    gangWalkTiles[gang.id] = tiles.length > 0 ? tiles : walkTiles;
    gangRespect[gang.id] = GANG_RESPECT_MAX;
    const spots = seededShuffle(gangWalkTiles[gang.id], gang.id.length * 991);
    for (let i = 0; i < Math.min(GANG_MEMBERS_PER_GANG, spots.length); i++) {
      const [tx, tz] = spots[i];
      peds.push(makePed('gang', twx(tx), twz(tz), true, gang.id));
    }
  }

  // pool de policías a pie
  for (let i = 0; i < MAX_COPS; i++) {
    peds.push(makePed('cop', 0, -9999, false));
  }

  // pool de sanitarios (van en la ambulancia)
  for (let i = 0; i < 2; i++) {
    peds.push(makePed('medic', 0, -9999, false));
  }

  const pickups: PickupState[] = (placements.pickups ?? []).map((pk, i) => ({
    id: `pickup-${i}`, type: pk.type,
    x: twx(pk.tx), z: twz(pk.tz),
    active: true, respawn: 0,
  }));

  return {
    map,
    player: {
      x: startX, z: startZ, heading: placements.playerStart.rotY,
      health: PLAYER_MAX_HEALTH, carId: null, shootCooldown: 0, moving: false, deadTimer: 0,
      weapons: { pistol: 0 },
      currentWeapon: 'pistol',
      money: 0,
      hurtCooldown: 0,
    },
    cars, peds, props, pickups, bullets: [],
    walkTiles, roadTiles, gangWalkTiles, gangRespect,
    heat: 0, wanted: 0, timeSinceCrime: 99,
    copSpawnTimer: 0, policeSpawnTimer: 0, garageTimer: 0, popTimer: 0,
    medicStage: 'idle', medicTargetId: null, medicTimer: 2, medicArriveStuck: 0,
    startX, startZ, startRot: placements.playerStart.rotY,
    time: 0,
  };
}

// ---------------------------------------------------------------- colisión básica

function resolveCircleVsMap(map: MapData, px: number, pz: number, r: number): { x: number; z: number; pushX: number; pushZ: number } {
  let x = px, z = pz;
  const half = TILE_SIZE / 2;
  const tx0 = Math.floor((x - r) / TILE_SIZE + map.width / 2);
  const tx1 = Math.floor((x + r) / TILE_SIZE + map.width / 2);
  const tz0 = Math.floor((z - r) / TILE_SIZE + map.height / 2);
  const tz1 = Math.floor((z + r) / TILE_SIZE + map.height / 2);
  let pushX = 0, pushZ = 0;
  for (let tz = tz0; tz <= tz1; tz++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const outside = tx < 0 || tz < 0 || tx >= map.width || tz >= map.height;
      const blocked = outside || !!map.types[map.grid[tz * map.width + tx]].blocked;
      if (!blocked) continue;
      const cx = (tx - map.width / 2 + 0.5) * TILE_SIZE;
      const cz = (tz - map.height / 2 + 0.5) * TILE_SIZE;
      const nx = Math.max(cx - half, Math.min(x, cx + half));
      const nz = Math.max(cz - half, Math.min(z, cz + half));
      let dx = x - nx, dz = z - nz;
      let d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 < 1e-9) { dx = x - cx; dz = z - cz; d2 = dx * dx + dz * dz || 1; }
      const d = Math.sqrt(d2);
      const push = r - d;
      x += (dx / d) * push;
      z += (dz / d) * push;
      pushX += (dx / d) * push;
      pushZ += (dz / d) * push;
    }
  }
  return { x, z, pushX, pushZ };
}

function pushOutOfCircle(x: number, z: number, ox: number, oz: number, minDist: number): { x: number; z: number; hit: boolean } {
  const dx = x - ox, dz = z - oz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= minDist * minDist || d2 < 1e-9) return { x, z, hit: false };
  const d = Math.sqrt(d2);
  return { x: ox + (dx / d) * minDist, z: oz + (dz / d) * minDist, hit: true };
}

function carCircles(car: CarState, cfg: VehicleConfig): [number, number][] {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const h = cfg.colliderHalfLength;
  return [
    [car.x + fx * h, car.z + fz * h],
    [car.x, car.z],
    [car.x - fx * h, car.z - fz * h],
  ];
}

function carMass(cfg: VehicleConfig): number {
  return cfg.colliderRadius * cfg.colliderHalfLength * 4;
}

// ---------------------------------------------------------------- wanted / crimen

function addCrime(w: World, points: number) {
  w.heat += points;
  w.timeSinceCrime = 0;
}

function updateWanted(w: World, dt: number) {
  w.timeSinceCrime += dt;
  if (w.timeSinceCrime > HEAT_DECAY_DELAY) {
    w.heat = Math.max(0, w.heat - HEAT_DECAY * dt);
  }
  let wanted = 0;
  for (const t of WANTED_THRESHOLDS) if (w.heat >= t) wanted++;
  w.wanted = wanted;

  // regeneración lenta del respeto de las bandas
  for (const gang of GANGS) {
    w.gangRespect[gang.id] = Math.min(GANG_RESPECT_MAX, w.gangRespect[gang.id] + GANG_RESPECT_REGEN * dt);
  }
}

/** Taller de pintura: quedarse en el pad con wanted activo lo limpia (cuesta $). */
function checkGarage(w: World, dt: number, deps: StepDeps) {
  const p = w.player;
  const onGarage =
    p.deadTimer <= 0 &&
    tileIdAt(w.map, toTileX(w.map, p.x), toTileZ(w.map, p.z)) === 'garage';
  if (onGarage && w.wanted > 0) {
    w.garageTimer += dt;
    if (w.garageTimer >= GARAGE_CLEAR_TIME) {
      w.garageTimer = 0;
      p.money = Math.max(0, p.money - GARAGE_COST);
      w.heat = 0;
      w.wanted = 0;
      w.timeSinceCrime = 99;
      deps.events.onRespray(p.x, p.z);
    }
  } else {
    w.garageTimer = 0;
  }
}

// ---------------------------------------------------------------- step principal

export interface StepDeps {
  getVehicleConfig: (id: string) => VehicleConfig;
  getWeaponConfig: (id: string) => WeaponConfig;
  weaponIds: string[];
  events: WorldEvents;
}

export function stepWorld(w: World, dt: number, deps: StepDeps) {
  dt = Math.min(dt, 1 / 20);
  w.time += dt;
  const p = w.player;
  p.hurtCooldown = Math.max(0, p.hurtCooldown - dt);

  for (const car of w.cars) {
    if (car.health === 999) car.health = deps.getVehicleConfig(car.configId).health ?? 100;
  }

  updateWanted(w, dt);
  managePolice(w, dt, deps);
  manageMedics(w, dt, deps);
  managePopulation(w, dt, deps);
  checkGarage(w, dt, deps);

  if (p.deadTimer > 0) {
    p.deadTimer -= dt;
    if (p.deadTimer <= 0) respawn(w);
  } else if (p.carId === null) {
    stepOnFoot(w, dt, deps);
  } else {
    stepDriving(w, dt, deps);
  }

  stepTraffic(w, dt, deps);
  checkPoliceDeploy(w);
  stepFreeCars(w, dt, deps);
  collideCarPairs(w, deps);
  stepPeds(w, dt, deps);
  stepBullets(w, dt, deps);
  stepProps(w, dt, deps);
  stepPickups(w, dt, deps);
  input.endFrame();
}

function respawn(w: World) {
  const p = w.player;
  p.x = w.startX; p.z = w.startZ; p.heading = w.startRot;
  p.health = PLAYER_MAX_HEALTH;
  p.carId = null;
  p.deadTimer = 0;
  p.weapons = { pistol: 0 };
  p.currentWeapon = 'pistol';
  p.money = Math.floor(p.money / 2); // la muerte sale cara
  p.hurtCooldown = 2;
  w.heat = 0;
  w.wanted = 0;
  // la pasma vuelve a comisaría
  for (const ped of w.peds) if (ped.kind === 'cop') ped.active = false;
  for (const car of w.cars) {
    if (car.kind !== 'police') continue;
    if (car.id === p.carId) continue;
    if (car.ai || car.dead) { car.active = false; car.dead = false; car.health = 999; car.z = -9999; }
  }
}

function damagePlayer(w: World, amount: number, deps: StepDeps) {
  const p = w.player;
  if (p.deadTimer > 0) return;
  p.health -= amount;
  if (p.health <= 0) {
    p.health = 0;
    p.deadTimer = 2.5;
    p.carId = null;
    deps.events.onPlayerDeath();
  }
}

// ---------------------------------------------------------------- armas del jugador

function ownedWeapons(p: PlayerState, deps: StepDeps): string[] {
  return deps.weaponIds.filter((id) => {
    const cfg = deps.getWeaponConfig(id);
    return cfg.infinite || (p.weapons[id] ?? 0) > 0;
  });
}

function handleWeaponInput(w: World, dt: number, deps: StepDeps, originX: number, originZ: number, heading: number) {
  const p = w.player;
  const owned = ownedWeapons(p, deps);
  if (input.justPressed('KeyQ')) {
    const idx = owned.indexOf(p.currentWeapon);
    p.currentWeapon = owned[(idx + 1) % owned.length] ?? 'pistol';
  }
  deps.weaponIds.forEach((id, i) => {
    if (input.justPressed(`Digit${i + 1}`) && owned.includes(id)) p.currentWeapon = id;
  });

  p.shootCooldown -= dt;
  const wcfg = deps.getWeaponConfig(p.currentWeapon);
  const wantShoot = wcfg.auto
    ? input.isDown('KeyF', 'ControlLeft')
    : input.justPressed('KeyF', 'ControlLeft');
  if (wantShoot && p.shootCooldown <= 0) {
    const ammo = p.weapons[p.currentWeapon] ?? 0;
    if (!wcfg.infinite && ammo <= 0) {
      p.currentWeapon = 'pistol';
    } else {
      p.shootCooldown = wcfg.cooldown;
      if (!wcfg.infinite) p.weapons[p.currentWeapon] = ammo - 1;
      // disparar llama la atención de la policía (proporcional a la cadencia)
      addCrime(w, Math.max(2, wcfg.cooldown * CRIME_SHOOT_RATE));
      for (let i = 0; i < wcfg.pellets && w.bullets.length < MAX_BULLETS; i++) {
        const a = heading + (Math.random() - 0.5) * 2 * wcfg.spread;
        const fx = Math.sin(a), fz = Math.cos(a);
        w.bullets.push({
          x: originX + fx * 0.5, z: originZ + fz * 0.5, dx: fx, dz: fz,
          life: wcfg.bulletLife, speed: wcfg.bulletSpeed, damage: wcfg.damage,
          fromPlayer: true,
        });
      }
      deps.events.onShoot(originX, originZ, heading);
      alertPeds(w, originX, originZ, 13);
    }
  }
}

// ---------------------------------------------------------------- jugador a pie

function stepOnFoot(w: World, dt: number, deps: StepDeps) {
  const p = w.player;
  let dx = 0, dz = 0;
  if (input.isDown('KeyW', 'ArrowUp')) dz -= 1;
  if (input.isDown('KeyS', 'ArrowDown')) dz += 1;
  if (input.isDown('KeyA', 'ArrowLeft')) dx -= 1;
  if (input.isDown('KeyD', 'ArrowRight')) dx += 1;
  const len = Math.hypot(dx, dz);
  p.moving = len > 0;
  if (len > 0) {
    dx /= len; dz /= len;
    p.x += dx * PLAYER_SPEED * dt;
    p.z += dz * PLAYER_SPEED * dt;
    p.heading = Math.atan2(dx, dz);
  }

  const res = resolveCircleVsMap(w.map, p.x, p.z, PLAYER_RADIUS);
  p.x = res.x; p.z = res.z;
  for (const prop of w.props) {
    if (!prop.alive || prop.radius <= 0) continue;
    const r = pushOutOfCircle(p.x, p.z, prop.x, prop.z, prop.radius + PLAYER_RADIUS);
    p.x = r.x; p.z = r.z;
  }
  for (const car of w.cars) {
    if (!car.active) continue;
    const cfg = deps.getVehicleConfig(car.configId);
    const carSpeed = Math.hypot(car.vx, car.vz);
    for (const [cx, cz] of carCircles(car, cfg)) {
      const r = pushOutOfCircle(p.x, p.z, cx, cz, cfg.colliderRadius + PLAYER_RADIUS);
      if (r.hit && carSpeed > RUNOVER_PLAYER_SPEED && p.hurtCooldown <= 0) {
        p.hurtCooldown = 0.7;
        damagePlayer(w, (carSpeed - RUNOVER_PLAYER_SPEED) * 6 + 10, deps);
      }
      p.x = r.x; p.z = r.z;
    }
  }

  handleWeaponInput(w, dt, deps, p.x, p.z, p.heading);

  // entrar a un coche (robo incluido: expulsa a la IA)
  if (input.justPressed('Enter', 'KeyE')) {
    let best: CarState | null = null;
    let bestD = CAR_ENTER_DIST;
    for (const car of w.cars) {
      if (car.dead || !car.active) continue;
      const d = Math.hypot(car.x - p.x, car.z - p.z);
      if (d < bestD) { best = car; bestD = d; }
    }
    if (best) {
      if (best.ai) {
        best.ai = false;
        best.aiSpeed = 0;
        if (best.kind === 'police') addCrime(w, 60); // robar un coche patrulla llama la atención
        else ejectOccupants(w, best); // el conductor (y a veces un pasajero) sale despedido
        alertPeds(w, best.x, best.z, 8);
      }
      p.carId = best.id;
      deps.events.onVehicleEnter(best.configId);
    }
  }
}

/**
 * Robo de un coche en marcha: el conductor (y a veces un pasajero) sale
 * despedido y queda tumbado en el suelo. Al levantarse, unos huyen y otros
 * vuelven a por ti a puñetazos. Recicla civiles lejanos del pool.
 */
function ejectOccupants(w: World, car: CarState) {
  const count = 1 + (Math.random() < EJECT_PASSENGER_CHANCE ? 1 : 0);
  const sideX = Math.cos(car.heading), sideZ = -Math.sin(car.heading);
  let used = 0;
  for (const ped of w.peds) {
    if (used >= count) break;
    if (ped.kind !== 'civ' || !ped.active || ped.state !== 'walk') continue;
    if (Math.hypot(ped.x - w.player.x, ped.z - w.player.z) < 45) continue;
    const s = used === 0 ? 1 : -1; // conductor por un lado, pasajero por el otro
    const r = resolveCircleVsMap(w.map, car.x + sideX * 1.5 * s, car.z + sideZ * 1.5 * s, PED_RADIUS);
    ped.x = r.x;
    ped.z = r.z;
    ped.state = 'downed';
    ped.timer = EJECT_DOWNED_TIME + Math.random() * 0.5;
    ped.heading = car.heading + (Math.random() - 0.5);
    ped.moving = false;
    ped.angry = 0;
    used++;
  }
}

// ---------------------------------------------------------------- conducción del jugador

function stepDriving(w: World, dt: number, deps: StepDeps) {
  const p = w.player;
  const car = w.cars.find((c) => c.id === p.carId);
  if (!car || car.dead) { p.carId = null; return; }
  const cfg = deps.getVehicleConfig(car.configId);

  const throttle = input.isDown('KeyW', 'ArrowUp') ? 1 : 0;
  const braking = input.isDown('KeyS', 'ArrowDown') ? 1 : 0;
  const steer = (input.isDown('KeyA', 'ArrowLeft') ? -1 : 0) + (input.isDown('KeyD', 'ArrowRight') ? 1 : 0);
  const handbrake = input.isDown('Space');

  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const rx = fz, rz = -fx;
  let vf = car.vx * fx + car.vz * fz;
  let vr = car.vx * rx + car.vz * rz;

  if (throttle) vf += cfg.accel * dt;
  if (braking) {
    if (vf > 0.5) vf -= cfg.brake * dt;
    else vf -= cfg.accel * 0.6 * dt;
  }
  if (handbrake) vf *= Math.max(0, 1 - 2.2 * dt);
  vf *= Math.max(0, 1 - cfg.drag * dt * 0.1);

  // fuera del asfalto (césped, acera, plaza) el coche pierde velocidad
  const surface = tileIdAt(w.map, toTileX(w.map, car.x), toTileZ(w.map, car.z));
  const offroad = surface === 'grass' || surface === 'plaza' || surface === 'sidewalk';
  if (offroad) vf *= Math.max(0, 1 - OFFROAD_DRAG * dt);

  vf = Math.max(-cfg.reverseSpeed, Math.min(cfg.maxSpeed, vf));

  const grip = handbrake ? cfg.driftGrip : cfg.grip;
  vr *= Math.pow(grip, dt * 60);

  const speedRatio = Math.abs(vf) / cfg.maxSpeed;
  const speedFactor = Math.min(1, Math.abs(vf) / (cfg.maxSpeed * 0.35));
  // a tope de velocidad la dirección es algo menos nerviosa (más estable y "pro")
  const stability = 1 - 0.25 * speedRatio;
  car.heading -= steer * cfg.turnRate * speedFactor * stability * Math.sign(vf || 1) * dt;
  car.drift = vr;

  const nfx = Math.sin(car.heading), nfz = Math.cos(car.heading);
  const nrx = nfz, nrz = -nfx;
  car.vx = nfx * vf + nrx * vr;
  car.vz = nfz * vf + nrz * vr;
  const prevSpeed = Math.hypot(car.vx, car.vz);
  car.x += car.vx * dt;
  car.z += car.vz * dt;

  collideCarVsStatic(w, car, cfg, deps, prevSpeed);
  runOverPeds(w, car, cfg, deps);

  p.x = car.x; p.z = car.z; p.heading = car.heading;

  // drive-by: disparar desde el morro del coche
  handleWeaponInput(w, dt, deps, car.x + nfx * (cfg.colliderHalfLength + 0.6), car.z + nfz * (cfg.colliderHalfLength + 0.6), car.heading);

  if (input.justPressed('Enter', 'KeyE')) {
    const sideX = Math.cos(car.heading), sideZ = -Math.sin(car.heading);
    const off = cfg.colliderRadius + PLAYER_RADIUS + 0.5;
    for (const s of [-1, 1]) {
      const ex = car.x + sideX * off * s;
      const ez = car.z + sideZ * off * s;
      const r = resolveCircleVsMap(w.map, ex, ez, PLAYER_RADIUS);
      if (Math.hypot(r.pushX, r.pushZ) < 0.01) {
        p.carId = null;
        p.x = ex; p.z = ez;
        car.vx *= 0.2; car.vz *= 0.2;
        return;
      }
    }
  }
}

// ---------------------------------------------------------------- colisión coche vs estático

function collideCarVsStatic(w: World, car: CarState, cfg: VehicleConfig, deps: StepDeps, prevSpeed: number) {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  let totalPushX = 0, totalPushZ = 0;

  for (const s of [-1, 1]) {
    const cx = car.x + fx * cfg.colliderHalfLength * s;
    const cz = car.z + fz * cfg.colliderHalfLength * s;
    const res = resolveCircleVsMap(w.map, cx, cz, cfg.colliderRadius);
    totalPushX += res.pushX;
    totalPushZ += res.pushZ;
  }
  car.x += totalPushX;
  car.z += totalPushZ;

  for (const prop of w.props) {
    if (!prop.alive || prop.knocked) continue;
    const d = Math.hypot(prop.x - car.x, prop.z - car.z);
    if (d > prop.radius + cfg.colliderRadius + cfg.colliderHalfLength) continue;
    if (prop.explosive) {
      if (Math.hypot(car.vx, car.vz) > BARREL_CAR_EXPLODE_SPEED && prop.fuse <= 0) {
        prop.fuse = 0.001;
        prop.litByPlayer = car.id === w.player.carId;
      }
      continue;
    }
    // volcables: a velocidad suficiente se tumban en la dirección de la marcha
    if (prop.knockable) {
      const speed = Math.hypot(car.vx, car.vz);
      if (speed > PROP_KNOCK_MIN_SPEED) {
        prop.knocked = true;
        prop.knockTime = 0;
        prop.radius = 0; // ya no colisiona ni para balas
        prop.knockDirX = car.vx / speed;
        prop.knockDirZ = car.vz / speed;
        deps.events.onCrash(0.2);
        continue;
      }
    }
    const r = pushOutOfCircle(car.x, car.z, prop.x, prop.z, prop.radius + cfg.colliderRadius);
    if (r.hit) {
      totalPushX += r.x - car.x;
      totalPushZ += r.z - car.z;
      car.x = r.x; car.z = r.z;
    }
  }

  const pushLen = Math.hypot(totalPushX, totalPushZ);
  if (pushLen > 1e-4) {
    const nx = totalPushX / pushLen, nz = totalPushZ / pushLen;
    const into = car.vx * nx + car.vz * nz;
    if (into < 0) {
      car.vx -= nx * into * 1.15;
      car.vz -= nz * into * 1.15;
    }
    const lost = prevSpeed - Math.hypot(car.vx, car.vz);
    if (lost > 6) {
      deps.events.onCrash(Math.min(1, lost / 20));
      damageCar(w, car, Math.max(0, lost - CRASH_DAMAGE_THRESHOLD) * CRASH_DAMAGE_SCALE * 0.5, deps, car.id === w.player.carId);
    }
  }
}

// ---------------------------------------------------------------- colisión coche-coche

function collideCarPairs(w: World, deps: StepDeps) {
  for (let i = 0; i < w.cars.length; i++) {
    const a = w.cars[i];
    if (!a.active) continue;
    const cfgA = deps.getVehicleConfig(a.configId);
    for (let j = i + 1; j < w.cars.length; j++) {
      const b = w.cars[j];
      if (!b.active) continue;
      if (Math.abs(a.x - b.x) > 8 || Math.abs(a.z - b.z) > 8) continue;
      const cfgB = deps.getVehicleConfig(b.configId);

      let depth = 0, nx = 0, nz = 0;
      const minD = cfgA.colliderRadius + cfgB.colliderRadius;
      for (const [ax, az] of carCircles(a, cfgA)) {
        for (const [bx, bz] of carCircles(b, cfgB)) {
          const dx = ax - bx, dz = az - bz;
          const d = Math.hypot(dx, dz);
          if (d < minD && minD - d > depth) {
            depth = minD - d;
            if (d > 1e-6) { nx = dx / d; nz = dz / d; }
            else { nx = 1; nz = 0; }
          }
        }
      }
      if (depth <= 0) continue;

      const ma = carMass(cfgA), mb = carMass(cfgB);
      const total = ma + mb;
      a.x += nx * depth * (mb / total);
      a.z += nz * depth * (mb / total);
      b.x -= nx * depth * (ma / total);
      b.z -= nz * depth * (ma / total);

      const rv = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (rv < 0) {
        const e = 0.25;
        const jImp = (-(1 + e) * rv) / (1 / ma + 1 / mb);
        a.vx += (nx * jImp) / ma;
        a.vz += (nz * jImp) / ma;
        b.vx -= (nx * jImp) / mb;
        b.vz -= (nz * jImp) / mb;

        const impact = -rv;
        if (impact > 3) {
          deps.events.onCrash(Math.min(1, impact / 15));
          const dmg = Math.max(0, impact - CRASH_DAMAGE_THRESHOLD) * CRASH_DAMAGE_SCALE;
          if (dmg > 0) {
            // el crimen es del jugador solo si el OTRO coche es el suyo
            damageCar(w, a, dmg, deps, b.id === w.player.carId);
            damageCar(w, b, dmg, deps, a.id === w.player.carId);
          }
          if (a.ai && impact > 4 && a.kind !== 'police') a.stun = Math.max(a.stun, 1.2);
          if (b.ai && impact > 4 && b.kind !== 'police') b.stun = Math.max(b.stun, 1.2);
        }
      }
    }
  }
}

// ---------------------------------------------------------------- tráfico IA

function trafficDecide(w: World, car: CarState) {
  const map = w.map;
  const tx = toTileX(map, car.x), tz = toTileZ(map, car.z);
  const cur: [number, number] = [Math.round(Math.sin(car.targetHeading)), Math.round(Math.cos(car.targetHeading))];
  const dirs: [number, number][] = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][])
    .filter((d) => !(d[0] === -cur[0] && d[1] === -cur[1]));
  const valid = dirs.filter((d) => isRoadAt(map, tx + d[0] * 2, tz + d[1] * 2));

  // destino de emergencia: la poli persigue al jugador, la ambulancia va al herido
  let goal: [number, number] | null = null;
  if (car.kind === 'police') goal = [w.player.x, w.player.z];
  else if (car.kind === 'ambulance' && w.medicStage === 'driving' && w.medicTargetId) {
    const target = w.peds.find((p) => p.id === w.medicTargetId);
    if (target) goal = [target.x, target.z];
  }

  let dir: [number, number];
  if (valid.length === 0) {
    dir = [-cur[0], -cur[1]];
  } else if (goal) {
    // en cada cruce elige la dirección que acerca al destino
    let best = valid[0];
    let bestDist = Infinity;
    for (const d of valid) {
      const nx = tileToWorld(map, tx + d[0] * 3, 'x');
      const nz = tileToWorld(map, tz + d[1] * 3, 'z');
      const dist = Math.hypot(goal[0] - nx, goal[1] - nz);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    dir = best;
  } else if (valid.some((d) => d[0] === cur[0] && d[1] === cur[1]) && Math.random() < 0.65) {
    dir = cur;
  } else {
    dir = valid[Math.floor(Math.random() * valid.length)];
  }

  car.targetHeading = Math.atan2(dir[0], dir[1]);
  car.laneCoord = laneCoordFor(map, tx, tz, dir[0], dir[1]);
}

function aheadBlocked(w: World, car: CarState, cfg: VehicleConfig, deps: StepDeps): boolean {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const look = cfg.colliderHalfLength + 1.6 + car.aiSpeed * 0.55;
  const ax = car.x + fx * look, az = car.z + fz * look;
  const police = car.kind === 'police';

  for (const other of w.cars) {
    if (other === car || !other.active) continue;
    if (police && other.id === w.player.carId) continue; // a por él: embestir
    const ocfg = deps.getVehicleConfig(other.configId);
    if (Math.hypot(other.x - ax, other.z - az) < ocfg.colliderHalfLength + 1.6) return true;
  }
  if (!police) {
    const p = w.player;
    if (p.carId === null && p.deadTimer <= 0 && Math.hypot(p.x - ax, p.z - az) < 1.9) return true;
    for (const ped of w.peds) {
      if (!ped.active || ped.state === 'dead') continue;
      if (Math.hypot(ped.x - ax, ped.z - az) < 1.6) return true;
    }
  }
  return false;
}

function stepTraffic(w: World, dt: number, deps: StepDeps) {
  for (const car of w.cars) {
    if (!car.ai || car.dead || !car.active) continue;
    if (car.stun > 0) { car.stun -= dt; continue; }
    if (car.id === w.player.carId) continue;
    const cfg = deps.getVehicleConfig(car.configId);
    const police = car.kind === 'police';
    const urgent = police || (car.kind === 'ambulance' && w.medicStage === 'driving');

    const tileIdx = toTileZ(w.map, car.z) * w.map.width + toTileX(w.map, car.x);
    if (tileIdx !== car.lastTile) {
      car.lastTile = tileIdx;
      trafficDecide(w, car);
    }

    const blocked = aheadBlocked(w, car, cfg, deps);
    const cruise = police
      ? Math.min(POLICE_CRUISE, cfg.maxSpeed * 0.6)
      : urgent
        ? Math.min(AMBULANCE_CRUISE, cfg.maxSpeed * 0.6)
        : Math.min(TRAFFIC_CRUISE, cfg.maxSpeed * 0.55);
    const target = blocked ? 0 : cruise;
    const rate = target > car.aiSpeed ? (urgent ? 9 : 5) : 18;
    car.aiSpeed += Math.sign(target - car.aiSpeed) * Math.min(Math.abs(target - car.aiSpeed), rate * dt);

    if (blocked && car.aiSpeed < 1) {
      car.blockedTime += dt;
      if (car.blockedTime > 2.5 + Math.random()) {
        car.blockedTime = 0;
        car.targetHeading += Math.PI;
        const dirX = Math.round(Math.sin(car.targetHeading));
        const dirZ = Math.round(Math.cos(car.targetHeading));
        car.laneCoord = laneCoordFor(w.map, toTileX(w.map, car.x), toTileZ(w.map, car.z), dirX, dirZ);
      }
    } else if (!blocked) {
      car.blockedTime = 0;
    }

    car.heading = angleLerp(car.heading, car.targetHeading, (urgent ? 3.6 : 3.0) * dt * Math.max(0.4, car.aiSpeed / TRAFFIC_CRUISE));

    let dh = car.targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    if (car.laneCoord !== null && Math.abs(dh) < 0.3) {
      const vertical = Math.abs(Math.cos(car.targetHeading)) > 0.5;
      const k = Math.min(1, 2.2 * dt);
      if (vertical) car.x += (car.laneCoord - car.x) * k;
      else car.z += (car.laneCoord - car.z) * k;
    }

    car.vx = Math.sin(car.heading) * car.aiSpeed;
    car.vz = Math.cos(car.heading) * car.aiSpeed;
    car.x += car.vx * dt;
    car.z += car.vz * dt;
    car.drift = 0;

    collideCarVsStatic(w, car, cfg, deps, car.aiSpeed);
    runOverPeds(w, car, cfg, deps);
  }
}

function stepFreeCars(w: World, dt: number, deps: StepDeps) {
  for (const car of w.cars) {
    if (!car.active) continue;
    if (car.id === w.player.carId) continue;
    if (car.ai && !car.dead && car.stun <= 0) continue;
    const speed = Math.hypot(car.vx, car.vz);
    if (speed < 0.05) { car.vx = 0; car.vz = 0; continue; }
    car.x += car.vx * dt;
    car.z += car.vz * dt;
    const damp = Math.max(0, 1 - 2.0 * dt);
    car.vx *= damp; car.vz *= damp;
    collideCarVsStatic(w, car, deps.getVehicleConfig(car.configId), deps, speed);
    runOverPeds(w, car, deps.getVehicleConfig(car.configId), deps);
  }
}

// ---------------------------------------------------------------- daño de coches

function damageCar(w: World, car: CarState, amount: number, deps: StepDeps, byPlayer: boolean) {
  if (car.dead || amount <= 0) return;
  car.health -= amount;
  if (car.health > 0) return;
  car.health = 0;
  car.dead = true;
  car.ai = false;
  car.aiSpeed = 0;
  car.recycle = 10;
  if (byPlayer) {
    addCrime(w, CRIME_CAR_DESTROY);
    w.player.money += MONEY_CAR;
  }
  if (w.player.carId === car.id) {
    w.player.carId = null;
    damagePlayer(w, 200, deps);
  }
  explodeAt(w, car.x, car.z, deps, byPlayer);
}

// ---------------------------------------------------------------- policía: spawns

function findSpawnTile(w: World, tiles: [number, number][], minDist: number, maxDist: number): [number, number] | null {
  for (let tries = 0; tries < 30; tries++) {
    const [tx, tz] = tiles[Math.floor(Math.random() * tiles.length)];
    const x = tileToWorld(w.map, tx, 'x');
    const z = tileToWorld(w.map, tz, 'z');
    const d = Math.hypot(x - w.player.x, z - w.player.z);
    if (d >= minDist && d <= maxDist) return [tx, tz];
  }
  return null;
}

function managePolice(w: World, dt: number, deps: StepDeps) {
  // ---- polis a pie
  const desiredCops = Math.min(MAX_COPS, w.wanted * 2);
  const cops = w.peds.filter((p) => p.kind === 'cop');
  const activeCops = cops.filter((c) => c.active && c.state !== 'dead').length;

  w.copSpawnTimer -= dt;
  if (activeCops < desiredCops && w.copSpawnTimer <= 0) {
    const pool = cops.find((c) => !c.active);
    const spot = findSpawnTile(w, w.walkTiles, 22, 48);
    if (pool && spot) {
      pool.active = true;
      pool.state = 'chase';
      pool.x = tileToWorld(w.map, spot[0], 'x');
      pool.z = tileToWorld(w.map, spot[1], 'z');
      pool.timer = 0;
      pool.shootCooldown = 0.5;
      w.copSpawnTimer = 1.3;
    }
  }
  if (w.wanted === 0) {
    for (const cop of cops) {
      if (cop.active && cop.state !== 'dead') { cop.active = false; cop.z = -9999; }
    }
  }

  // ---- coches patrulla
  const desiredCars = w.wanted >= 2 ? Math.min(MAX_POLICE_CARS, w.wanted - 1) : 0;
  const patrols = w.cars.filter((c) => c.kind === 'police');
  const activePatrols = patrols.filter((c) => c.active && !c.dead && c.ai).length;

  w.policeSpawnTimer -= dt;
  if (activePatrols < desiredCars && w.policeSpawnTimer <= 0) {
    const pool = patrols.find((c) => !c.active);
    const spot = findSpawnTile(w, w.roadTiles, 30, 65);
    if (pool && spot) {
      const cfg = deps.getVehicleConfig(pool.configId);
      pool.active = true;
      pool.dead = false;
      pool.ai = true;
      pool.health = cfg.health ?? 85;
      pool.x = tileToWorld(w.map, spot[0], 'x');
      pool.z = tileToWorld(w.map, spot[1], 'z');
      pool.vx = 0; pool.vz = 0;
      pool.aiSpeed = 0;
      pool.stun = 0;
      pool.lastTile = -1;
      pool.deployed = false;
      pool.blockedTime = 0;
      const vertical = isRoadAt(w.map, spot[0], spot[1] - 1) && isRoadAt(w.map, spot[0], spot[1] + 1);
      pool.heading = pool.targetHeading = vertical ? 0 : Math.PI / 2;
      w.policeSpawnTimer = 2.2;
    }
  }
  if (desiredCars === 0) {
    for (const car of patrols) {
      if (!car.active) continue;
      if (car.id === w.player.carId) continue; // robado por el jugador
      if (!car.ai && !car.dead) continue;      // robado y abandonado: se queda
      if (car.dead) continue;                  // los restos los recicla el timer
      car.deployed = false;
      car.active = false;
      car.z = -9999;
    }
  }
  // reciclar patrullas destruidas
  for (const car of patrols) {
    if (!car.active || !car.dead) continue;
    car.recycle -= dt;
    if (car.recycle <= 0 && car.id !== w.player.carId) {
      car.active = false;
      car.dead = false;
      car.health = 999;
      car.z = -9999;
    }
  }
}

// ---------------------------------------------------------------- sanitarios / ambulancia

/**
 * Misión sanitaria: cuando hay un peatón muerto cerca del jugador, la ambulancia
 * acude con sirena, aparca al lado, bajan dos sanitarios, tardan MEDIC_HEAL_TIME
 * en revivirlo y vuelven al vehículo.
 */
function manageMedics(w: World, dt: number, deps: StepDeps) {
  const amb = w.cars.find((c) => c.kind === 'ambulance');
  if (!amb) return;
  const medics = w.peds.filter((p) => p.kind === 'medic');
  const target = w.medicTargetId ? w.peds.find((p) => p.id === w.medicTargetId) : undefined;
  const ambLost = amb.dead || amb.id === w.player.carId || !amb.active;

  const releaseCorpse = () => {
    if (target && target.state === 'dead') target.timer = Math.min(target.timer, 6);
  };
  const parkAmbulance = () => {
    amb.active = false;
    amb.ai = false;
    amb.aiSpeed = 0;
    amb.vx = 0;
    amb.vz = 0;
    amb.z = -9999;
  };
  const abort = () => {
    releaseCorpse();
    w.medicTargetId = null;
    for (const m of medics) {
      if (m.active && m.state !== 'dead') { m.active = false; m.z = -9999; }
    }
    if (amb.active && !amb.dead && amb.id !== w.player.carId) parkAmbulance();
    w.medicStage = 'idle';
    w.medicTimer = MEDIC_DISPATCH_COOLDOWN;
  };

  switch (w.medicStage) {
    case 'idle': {
      // reciclar restos de misiones anteriores
      if (amb.active && amb.dead) {
        amb.recycle -= dt;
        if (amb.recycle <= 0 && amb.id !== w.player.carId) {
          amb.active = false; amb.dead = false; amb.health = 999; amb.z = -9999;
        }
      } else if (amb.active && amb.ai && Math.hypot(amb.x - w.player.x, amb.z - w.player.z) > TRAFFIC_RECYCLE_DIST) {
        amb.active = false; amb.z = -9999;
      }
      for (const m of medics) {
        if (m.active && m.state !== 'dead' && Math.hypot(m.x - w.player.x, m.z - w.player.z) > PED_RECYCLE_DIST) {
          m.active = false; m.z = -9999;
        }
      }

      w.medicTimer -= dt;
      if (w.medicTimer > 0) return;
      const corpse = w.peds.find((p) =>
        p.active && p.state === 'dead' && (p.kind === 'civ' || p.kind === 'gang') &&
        p.timer > 2 &&
        Math.hypot(p.x - w.player.x, p.z - w.player.z) < MEDIC_DETECT_DIST);
      if (!corpse) { w.medicTimer = 1.5; return; }
      const spot = findSpawnTile(w, w.roadTiles, 35, 70);
      if (!spot) { w.medicTimer = 1.5; return; }
      const cfg = deps.getVehicleConfig(amb.configId);
      amb.active = true;
      amb.dead = false;
      amb.ai = true;
      amb.health = cfg.health ?? 110;
      amb.x = tileToWorld(w.map, spot[0], 'x');
      amb.z = tileToWorld(w.map, spot[1], 'z');
      amb.vx = 0; amb.vz = 0;
      amb.aiSpeed = 0;
      amb.stun = 0;
      amb.blockedTime = 0;
      amb.lastTile = -1;
      const vertical = isRoadAt(w.map, spot[0], spot[1] - 1) && isRoadAt(w.map, spot[0], spot[1] + 1);
      amb.heading = amb.targetHeading = vertical ? 0 : Math.PI / 2;
      corpse.timer = 999; // el cadáver espera a la ambulancia
      w.medicTargetId = corpse.id;
      w.medicStage = 'driving';
      w.medicTimer = 45;
      w.medicArriveStuck = 0;
      return;
    }

    case 'driving': {
      w.medicTimer -= dt;
      if (!target || target.state !== 'dead' || ambLost || w.medicTimer <= 0) { abort(); return; }
      const dist = Math.hypot(amb.x - target.x, amb.z - target.z);
      const closeEnough = dist <= AMBULANCE_ARRIVE_DIST;
      if (!closeEnough) {
        if (dist <= AMBULANCE_STUCK_DIST && amb.aiSpeed < 2) w.medicArriveStuck += dt;
        else w.medicArriveStuck = 0;
        if (w.medicArriveStuck < AMBULANCE_STUCK_TIME) return;
      }
      deployMedicsFromAmbulance(w, amb, medics);
      w.medicArriveStuck = 0;
      return;
    }

    case 'healing': {
      const alive = medics.filter((m) => m.active && m.state !== 'dead');
      if (!target || target.state !== 'dead' || alive.length === 0) { abort(); return; }
      if (amb.id === w.player.carId) { abort(); return; } // les han robado la ambulancia
      // la cura avanza cuando un sanitario está arrodillado junto al herido
      const near = alive.some((m) => Math.hypot(m.x - target.x, m.z - target.z) < 1.3);
      if (!near) return;
      w.medicTimer -= dt;
      if (w.medicTimer > 0) return;
      // ¡revivido!
      target.state = 'flee';
      target.timer = 3 + Math.random() * 2;
      const d = Math.hypot(target.x - w.player.x, target.z - w.player.z) || 1;
      target.dirX = (target.x - w.player.x) / d;
      target.dirZ = (target.z - w.player.z) / d;
      deps.events.onHeal(target.x, target.z);
      w.medicTargetId = null;
      w.medicStage = 'returning';
      w.medicTimer = 14;
      return;
    }

    case 'returning': {
      w.medicTimer -= dt;
      const alive = medics.filter((m) => m.active && m.state !== 'dead');
      if (ambLost) {
        w.medicStage = 'idle';
        w.medicTimer = MEDIC_DISPATCH_COOLDOWN;
        return;
      }
      if (alive.length === 0) {
        parkAmbulance();
        w.medicStage = 'idle';
        w.medicTimer = MEDIC_DISPATCH_COOLDOWN;
        return;
      }
      const allBack = alive.every((m) => Math.hypot(m.x - amb.x, m.z - amb.z) < 2.4);
      if (allBack || w.medicTimer <= 0) {
        for (const m of alive) { m.active = false; m.z = -9999; }
        parkAmbulance();
        w.medicStage = 'idle';
        w.medicTimer = MEDIC_DISPATCH_COOLDOWN;
      }
      return;
    }
  }
}

/** Sanitarios bajan por el lateral de la ambulancia aparcada. */
function deployMedicsFromAmbulance(w: World, amb: CarState, medics: PedState[]) {
  amb.ai = false;
  amb.aiSpeed = 0;
  amb.vx = 0;
  amb.vz = 0;
  const side = amb.heading + Math.PI / 2;
  medics.forEach((m, i) => {
    m.active = true;
    m.state = 'walk';
    m.timer = 0;
    m.provoked = 0;
    m.angry = 0;
    m.x = amb.x + Math.sin(side) * (1.5 + i * 0.7);
    m.z = amb.z + Math.cos(side) * (1.5 + i * 0.7);
    m.heading = amb.heading;
  });
  w.medicStage = 'healing';
  w.medicTimer = MEDIC_HEAL_TIME;
}

/** Patrulla aparcada: los agentes bajan y persiguen a pie. */
function deployPoliceFromCar(w: World, car: CarState) {
  if (car.deployed) return;
  car.deployed = true;
  car.ai = false;
  car.aiSpeed = 0;
  car.vx = 0;
  car.vz = 0;
  const side = car.heading + Math.PI / 2;
  const cops = w.peds.filter((p) => p.kind === 'cop');
  let used = 0;
  for (const cop of cops) {
    if (used >= 2) break;
    if (cop.active && cop.state !== 'dead') continue;
    cop.active = true;
    cop.state = 'chase';
    cop.x = car.x + Math.sin(side) * (1.4 + used * 0.75);
    cop.z = car.z + Math.cos(side) * (1.4 + used * 0.75);
    cop.heading = car.heading;
    cop.timer = 0;
    cop.shootCooldown = 0.4 + used * 0.2;
    used++;
  }
}

function checkPoliceDeploy(w: World) {
  if (w.wanted === 0 || w.player.deadTimer > 0) return;
  for (const car of w.cars) {
    if (!car.active || !car.ai || car.dead || car.kind !== 'police' || car.deployed) continue;
    if (car.id === w.player.carId) continue;
    const d = Math.hypot(car.x - w.player.x, car.z - w.player.z);
    if (d > POLICE_DEPLOY_DIST) continue;
    if (car.aiSpeed > POLICE_DEPLOY_SPEED && car.blockedTime < 1.5) continue;
    deployPoliceFromCar(w, car);
  }
}

/** Movimiento de un sanitario: ir al herido (curando) o volver a la ambulancia. */
function stepMedic(w: World, ped: PedState, dt: number) {
  let gx: number | null = null;
  let gz = 0;
  if (w.medicStage === 'healing' && w.medicTargetId) {
    const target = w.peds.find((p) => p.id === w.medicTargetId);
    if (target) { gx = target.x; gz = target.z; }
  }
  if (gx === null) {
    const amb = w.cars.find((c) => c.kind === 'ambulance');
    if (amb && amb.active && !amb.dead) { gx = amb.x; gz = amb.z; }
  }
  if (gx === null) { ped.moving = false; return; }

  const dx = gx - ped.x, dz = gz - ped.z;
  const d = Math.hypot(dx, dz) || 1;
  ped.heading = Math.atan2(dx / d, dz / d);
  const stopAt = w.medicStage === 'healing' ? 0.9 : 1.6;
  if (d > stopAt) {
    ped.moving = true;
    ped.x += (dx / d) * MEDIC_SPEED * dt;
    ped.z += (dz / d) * MEDIC_SPEED * dt;
  } else {
    ped.moving = false; // atendiendo al herido / esperando junto a la ambulancia
  }
}

// ---------------------------------------------------------------- streaming de población

/**
 * Recicla los NPCs que han quedado lejos del jugador hacia un anillo fuera de
 * cámara a su alrededor. Así la zona visible está siempre densa (peatones y
 * tráfico) sin necesidad de simular miles de entidades.
 */
function managePopulation(w: World, dt: number, deps: StepDeps) {
  w.popTimer -= dt;
  if (w.popTimer > 0) return;
  w.popTimer = 0.5;

  // ---- peatones civiles
  for (const ped of w.peds) {
    if (!ped.active || ped.kind !== 'civ') continue;
    if (ped.state === 'dead' || ped.state === 'downed') continue;
    if (Math.hypot(ped.x - w.player.x, ped.z - w.player.z) <= PED_RECYCLE_DIST) continue;
    const spot = findSpawnTile(w, w.walkTiles, PED_SPAWN_MIN, PED_SPAWN_MAX);
    if (!spot) continue;
    ped.x = tileToWorld(w.map, spot[0], 'x');
    ped.z = tileToWorld(w.map, spot[1], 'z');
    ped.state = 'walk';
    ped.timer = 0;
    ped.provoked = 0;
    ped.angry = 0;
    ped.variant = Math.floor(Math.random() * 5);
  }

  // ---- tráfico civil (los coches robados/abandonados o muertos no se tocan)
  for (const car of w.cars) {
    if (!car.active || !car.ai || car.dead || car.kind !== 'civ') continue;
    if (car.id === w.player.carId) continue;
    if (Math.hypot(car.x - w.player.x, car.z - w.player.z) <= TRAFFIC_RECYCLE_DIST) continue;
    const spot = findSpawnTile(w, w.roadTiles, TRAFFIC_SPAWN_MIN, TRAFFIC_SPAWN_MAX);
    if (!spot) continue;
    const [tx, tz] = spot;
    const x = tileToWorld(w.map, tx, 'x');
    const z = tileToWorld(w.map, tz, 'z');
    // no reaparecer encima de otro coche
    let overlapped = false;
    for (const other of w.cars) {
      if (other === car || !other.active) continue;
      if (Math.hypot(other.x - x, other.z - z) < 4) { overlapped = true; break; }
    }
    if (overlapped) continue;
    const vertical = isRoadAt(w.map, tx, tz - 1) && isRoadAt(w.map, tx, tz + 1);
    const dir: [number, number] = vertical
      ? (Math.random() < 0.5 ? [0, -1] : [0, 1])
      : (Math.random() < 0.5 ? [-1, 0] : [1, 0]);
    car.x = x;
    car.z = z;
    car.heading = car.targetHeading = Math.atan2(dir[0], dir[1]);
    car.laneCoord = laneCoordFor(w.map, tx, tz, dir[0], dir[1]);
    car.vx = 0; car.vz = 0;
    car.aiSpeed = 0;
    car.stun = 0;
    car.blockedTime = 0;
    car.lastTile = -1;
    car.health = deps.getVehicleConfig(car.configId).health ?? 100;
  }
}

// ---------------------------------------------------------------- peatones / combate NPC

function alertPeds(w: World, x: number, z: number, radius: number) {
  for (const ped of w.peds) {
    if (!ped.active || ped.state === 'dead' || ped.state === 'downed') continue;
    const dx = ped.x - x, dz = ped.z - z;
    const d = Math.hypot(dx, dz);
    if (d > radius) continue;
    if (ped.kind === 'cop' || ped.kind === 'medic') continue; // profesionales: no huyen
    if (ped.kind === 'gang') {
      ped.provoked = 9; // los pandilleros no huyen: se encaran
      continue;
    }
    if (ped.angry > 0) continue; // los cabreados no se asustan
    ped.state = 'flee';
    ped.timer = 2.5 + Math.random() * 2;
    if (d > 1e-3) { ped.dirX = dx / d; ped.dirZ = dz / d; }
    else { const a = Math.random() * Math.PI * 2; ped.dirX = Math.sin(a); ped.dirZ = Math.cos(a); }
  }
}

/**
 * Mata a un peatón. `byPlayer` atribuye el crimen: solo entonces sube el
 * wanted, cae el respeto de la banda y se cobra la recompensa.
 */
function killPed(w: World, ped: PedState, deps: StepDeps, byPlayer: boolean) {
  if (ped.state === 'dead') return;
  ped.state = 'dead';
  ped.timer = PED_CORPSE_TIME;
  ped.moving = false;
  deps.events.onPedDeath(ped.x, ped.z);
  alertPeds(w, ped.x, ped.z, 10);

  if (!byPlayer) return;
  if (ped.kind === 'cop') {
    addCrime(w, CRIME_COP_KILL);
    w.player.money += MONEY_COP;
  } else if (ped.kind === 'gang' && ped.gangId) {
    addCrime(w, CRIME_GANG_KILL);
    w.player.money += MONEY_GANG;
    w.gangRespect[ped.gangId] = Math.max(-100, w.gangRespect[ped.gangId] + GANG_KILL_RESPECT);
  } else {
    addCrime(w, CRIME_PED_KILL);
    w.player.money += MONEY_PED;
  }
}

function respawnPed(w: World, ped: PedState) {
  if (ped.kind === 'cop' || ped.kind === 'medic') {
    // los profesionales muertos vuelven a su pool (managePolice/manageMedics los reactivará)
    ped.active = false;
    ped.state = 'walk';
    ped.z = -9999;
    return;
  }
  const tiles = ped.kind === 'gang' && ped.gangId ? w.gangWalkTiles[ped.gangId] : w.walkTiles;
  if (tiles.length === 0) { ped.timer = 5; return; }
  // preferir un anillo cercano fuera de cámara (mantiene la densidad alrededor del jugador)
  const ring = findSpawnTile(w, tiles, PED_SPAWN_MIN, PED_SPAWN_MAX);
  if (ring) {
    ped.x = tileToWorld(w.map, ring[0], 'x');
    ped.z = tileToWorld(w.map, ring[1], 'z');
    ped.state = 'walk';
    ped.timer = 0;
    ped.provoked = 0;
    ped.angry = 0;
    ped.variant = Math.floor(Math.random() * 5);
    return;
  }
  for (let tries = 0; tries < 25; tries++) {
    const [tx, tz] = tiles[Math.floor(Math.random() * tiles.length)];
    const x = tileToWorld(w.map, tx, 'x');
    const z = tileToWorld(w.map, tz, 'z');
    if (Math.hypot(x - w.player.x, z - w.player.z) < 40) continue;
    ped.x = x; ped.z = z;
    ped.state = 'walk';
    ped.timer = 0;
    ped.provoked = 0;
    ped.angry = 0;
    ped.variant = Math.floor(Math.random() * 5);
    return;
  }
  ped.timer = 3;
}

function pickPedDir(w: World, ped: PedState) {
  // pandilleros fuera de su territorio: volver a casa
  if (ped.kind === 'gang' && ped.gangId) {
    const gang = GANGS.find((g) => g.id === ped.gangId);
    if (gang) {
      const t = gang.territory;
      const tx = toTileX(w.map, ped.x), tz = toTileZ(w.map, ped.z);
      if (tx < t.x0 || tx > t.x1 || tz < t.z0 || tz > t.z1) {
        const cx = tileToWorld(w.map, (t.x0 + t.x1) / 2, 'x');
        const cz = tileToWorld(w.map, (t.z0 + t.z1) / 2, 'z');
        const d = Math.hypot(cx - ped.x, cz - ped.z) || 1;
        ped.dirX = (cx - ped.x) / d;
        ped.dirZ = (cz - ped.z) / d;
        return;
      }
    }
  }

  if (steerPedToLegalTile(w, ped)) return;

  const onPath = isPedPathTile(pedTileAt(w, ped));
  const candidates: [number, number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const dx = Math.sin(a), dz = Math.cos(a);
    const id = tileIdAt(w.map, toTileX(w.map, ped.x + dx * 1.6), toTileZ(w.map, ped.z + dz * 1.6));
    if (id === null) continue;
    let weight = 0;
    if (id === 'sidewalk') weight = 5;
    else if (id === 'plaza' || id === 'grass') weight = 3;
    else if (id === 'crosswalk' && onPath && pedCanCrossViaCrosswalk(w, ped, dx, dz)) weight = 2.5;
    else if (id === 'road') weight = 0;
    if (weight > 0) candidates.push([dx, dz, weight]);
  }
  if (candidates.length === 0) {
    if (steerPedToLegalTile(w, ped)) return;
    const a = Math.random() * Math.PI * 2;
    ped.dirX = Math.sin(a); ped.dirZ = Math.cos(a);
    return;
  }
  const total = candidates.reduce((s, c) => s + c[2], 0);
  let r = Math.random() * total;
  for (const [dx, dz, wgt] of candidates) {
    r -= wgt;
    if (r <= 0) { ped.dirX = dx; ped.dirZ = dz; return; }
  }
}

function runOverPeds(w: World, car: CarState, cfg: VehicleConfig, deps: StepDeps) {
  const carSpeed = Math.hypot(car.vx, car.vz);
  const byPlayer = car.id === w.player.carId;
  for (const ped of w.peds) {
    if (!ped.active || ped.state === 'dead') continue;
    if (Math.abs(ped.x - car.x) > 4 || Math.abs(ped.z - car.z) > 4) continue;
    for (const [cx, cz] of carCircles(car, cfg)) {
      const minD = cfg.colliderRadius + PED_RADIUS;
      const dx = ped.x - cx, dz = ped.z - cz;
      if (dx * dx + dz * dz >= minD * minD) continue;
      if (carSpeed > PED_RUNOVER_SPEED) {
        killPed(w, ped, deps, byPlayer);
      } else {
        const r = pushOutOfCircle(ped.x, ped.z, cx, cz, minD);
        ped.x = r.x; ped.z = r.z;
        if (carSpeed > 1 && ped.kind === 'civ' && ped.state !== 'downed' && ped.angry <= 0) {
          ped.state = 'flee';
          ped.timer = 2;
        }
      }
      break;
    }
  }
}

/** Persecución + disparo de NPCs hostiles (polis y pandilleros). */
function stepHostilePed(
  w: World, ped: PedState, dt: number, deps: StepDeps,
  speed: number, range: number, cooldown: number, damage: number,
) {
  const p = w.player;
  const dx = p.x - ped.x, dz = p.z - ped.z;
  const dist = Math.hypot(dx, dz) || 1;
  ped.heading = Math.atan2(dx / dist, dz / dist);
  ped.shootCooldown -= dt;

  if (dist > range) {
    ped.moving = true;
    ped.dirX = dx / dist;
    ped.dirZ = dz / dist;
    ped.x += ped.dirX * speed * dt;
    ped.z += ped.dirZ * speed * dt;
  } else {
    ped.moving = false;
    if (ped.shootCooldown <= 0 && p.deadTimer <= 0 && w.bullets.length < MAX_BULLETS) {
      ped.shootCooldown = cooldown * (0.85 + Math.random() * 0.3);
      const a = ped.heading + (Math.random() - 0.5) * 0.12;
      const fx = Math.sin(a), fz = Math.cos(a);
      w.bullets.push({
        x: ped.x + fx * 0.5, z: ped.z + fz * 0.5, dx: fx, dz: fz,
        life: 0.7, speed: 30, damage,
        fromPlayer: false,
      });
      deps.events.onShoot(ped.x, ped.z, ped.heading);
    }
  }
}

function isGangHostile(w: World, ped: PedState): boolean {
  if (!ped.gangId) return false;
  return w.gangRespect[ped.gangId] < 0 || ped.provoked > 0;
}

/** Civil cabreado (conductor eyectado): persigue al jugador y reparte puñetazos. */
function stepAngryCiv(w: World, ped: PedState, dt: number, deps: StepDeps) {
  const p = w.player;
  ped.angry -= dt;
  const car = p.carId ? w.cars.find((c) => c.id === p.carId) : null;
  const tx = car ? car.x : p.x;
  const tz = car ? car.z : p.z;
  const dx = tx - ped.x, dz = tz - ped.z;
  const dist = Math.hypot(dx, dz) || 1;

  if (ped.angry <= 0 || dist > 35) {
    ped.angry = 0;
    ped.state = 'walk';
    ped.timer = 0;
    return;
  }
  ped.state = 'chase';
  ped.heading = Math.atan2(dx / dist, dz / dist);
  ped.shootCooldown -= dt;
  const reach = car ? PUNCH_REACH + 1.3 : PUNCH_REACH;
  if (dist > reach) {
    ped.moving = true;
    ped.x += (dx / dist) * 5.0 * dt;
    ped.z += (dz / dist) * 5.0 * dt;
  } else {
    ped.moving = false;
    if (ped.shootCooldown <= 0) {
      ped.shootCooldown = PUNCH_COOLDOWN;
      deps.events.onPunch(ped.x, ped.z);
      if (car) damageCar(w, car, 2, deps, false); // aporrea la carrocería
      else damagePlayer(w, PUNCH_DAMAGE, deps);
    }
  }
}

function stepPeds(w: World, dt: number, deps: StepDeps) {
  const p = w.player;
  for (const ped of w.peds) {
    if (!ped.active) continue;

    if (ped.state === 'dead') {
      ped.timer -= dt;
      if (ped.timer <= 0) respawnPed(w, ped);
      continue;
    }

    // tumbado en el suelo tras ser eyectado: al levantarse, huye o ataca
    if (ped.state === 'downed') {
      ped.timer -= dt;
      ped.moving = false;
      if (ped.timer <= 0) {
        if (Math.random() < 0.5 && p.deadTimer <= 0) {
          ped.state = 'chase';
          ped.angry = ANGRY_TIME + Math.random() * 4;
          ped.shootCooldown = 0.4;
        } else {
          ped.state = 'flee';
          ped.timer = 3 + Math.random() * 2;
          const dx = ped.x - p.x, dz = ped.z - p.z;
          const d = Math.hypot(dx, dz) || 1;
          ped.dirX = dx / d;
          ped.dirZ = dz / d;
        }
      }
      continue;
    }

    ped.provoked = Math.max(0, ped.provoked - dt);

    // ---- comportamiento por tipo
    if (ped.kind === 'cop') {
      if (w.wanted > 0 && p.deadTimer <= 0) {
        ped.state = 'chase';
        stepHostilePed(w, ped, dt, deps, COP_SPEED, COP_SHOOT_RANGE, COP_SHOOT_COOLDOWN, COP_BULLET_DAMAGE);
      } else {
        ped.state = 'walk';
        ped.moving = false;
      }
    } else if (ped.kind === 'gang' && isGangHostile(w, ped) && p.deadTimer <= 0
      && Math.hypot(p.x - ped.x, p.z - ped.z) < GANG_AGGRO_DIST) {
      ped.state = 'chase';
      stepHostilePed(w, ped, dt, deps, GANG_SPEED, GANG_SHOOT_RANGE, GANG_SHOOT_COOLDOWN, GANG_BULLET_DAMAGE);
    } else if (ped.kind === 'medic') {
      stepMedic(w, ped, dt);
    } else if (ped.kind === 'civ' && ped.angry > 0 && p.deadTimer <= 0) {
      stepAngryCiv(w, ped, dt, deps);
    } else {
      // paseo / huida (civiles y pandilleros tranquilos)
      if (ped.state !== 'flee' && fleeFromRecklessVehicle(w, ped)) {
        // vehículo imprudente cerca → huyen de la zona
      }
      if (ped.state === 'chase') { ped.state = 'walk'; ped.timer = 0; }
      ped.timer -= dt;
      if (ped.timer <= 0) {
        if (ped.state === 'flee') ped.state = 'walk';
        pickPedDir(w, ped);
        ped.timer = ped.state === 'walk' ? 2 + Math.random() * 4 : 1.5;
      }
      // si acaba en calzada sin paso de cebra, corregir rumbo
      if (pedTileAt(w, ped) === 'road') steerPedToLegalTile(w, ped);
      const speed = ped.state === 'flee' ? PED_FLEE_SPEED : PED_WALK_SPEED;
      ped.moving = true;
      ped.x += ped.dirX * speed * dt;
      ped.z += ped.dirZ * speed * dt;
      ped.heading = Math.atan2(ped.dirX, ped.dirZ);
    }

    // ---- colisiones comunes
    const res = resolveCircleVsMap(w.map, ped.x, ped.z, PED_RADIUS);
    ped.x = res.x; ped.z = res.z;
    if (Math.hypot(res.pushX, res.pushZ) > 0.01 && ped.state !== 'chase') {
      pickPedDir(w, ped);
      ped.timer = 1 + Math.random() * 2;
    }

    if (p.carId === null) {
      const r = pushOutOfCircle(ped.x, ped.z, p.x, p.z, PED_RADIUS + PLAYER_RADIUS);
      ped.x = r.x; ped.z = r.z;
    }
  }
}

// ---------------------------------------------------------------- balas

function stepBullets(w: World, dt: number, deps: StepDeps) {
  for (let i = w.bullets.length - 1; i >= 0; i--) {
    const b = w.bullets[i];
    b.x += b.dx * b.speed * dt;
    b.z += b.dz * b.speed * dt;
    b.life -= dt;
    let dead = b.life <= 0;

    // paredes
    if (!dead) {
      const tx = toTileX(w.map, b.x), tz = toTileZ(w.map, b.z);
      const outside = tx < 0 || tz < 0 || tx >= w.map.width || tz >= w.map.height;
      if (outside || w.map.types[w.map.grid[tz * w.map.width + tx]].blocked) {
        deps.events.onBulletHit(b.x, b.z);
        dead = true;
      }
    }
    // props (bidones detonan)
    if (!dead) {
      for (const prop of w.props) {
        if (!prop.alive || prop.radius <= 0) continue;
        if (Math.hypot(prop.x - b.x, prop.z - b.z) < prop.radius + 0.25) {
          if (prop.explosive && prop.fuse <= 0) {
            prop.fuse = 0.001;
            prop.litByPlayer = b.fromPlayer;
          }
          deps.events.onBulletHit(b.x, b.z);
          dead = true;
          break;
        }
      }
    }
    // peatones (solo balas del jugador: la poli no masacra civiles)
    if (!dead && b.fromPlayer) {
      for (const ped of w.peds) {
        if (!ped.active || ped.state === 'dead') continue;
        if (Math.hypot(ped.x - b.x, ped.z - b.z) < PED_RADIUS + 0.3) {
          killPed(w, ped, deps, true);
          dead = true;
          break;
        }
      }
    }
    // jugador (balas de NPC)
    if (!dead && !b.fromPlayer && w.player.carId === null && w.player.deadTimer <= 0) {
      if (Math.hypot(w.player.x - b.x, w.player.z - b.z) < PLAYER_RADIUS + 0.3) {
        damagePlayer(w, b.damage, deps);
        dead = true;
      }
    }
    // coches
    if (!dead) {
      for (const car of w.cars) {
        if (!car.active) continue;
        if (Math.abs(car.x - b.x) > 4 || Math.abs(car.z - b.z) > 4) continue;
        const cfg = deps.getVehicleConfig(car.configId);
        let hit = false;
        for (const [cx, cz] of carCircles(car, cfg)) {
          if (Math.hypot(cx - b.x, cz - b.z) < cfg.colliderRadius + 0.2) { hit = true; break; }
        }
        if (hit) {
          if (!car.dead) {
            damageCar(w, car, b.damage, deps, b.fromPlayer);
            if (car.ai && car.kind !== 'police') car.stun = Math.max(car.stun, 0.4);
          }
          deps.events.onBulletHit(b.x, b.z);
          dead = true;
          break;
        }
      }
    }
    if (dead) w.bullets.splice(i, 1);
  }
}

// ---------------------------------------------------------------- explosiones

function stepProps(w: World, dt: number, deps: StepDeps) {
  for (const prop of w.props) {
    if (!prop.alive) continue;

    // props volcados: animación de caída + despawn programado
    if (prop.knocked) {
      prop.knockTime += dt;
      const despawn = prop.assetId === 'hydrant' ? HYDRANT_DESPAWN : PROP_KNOCK_DESPAWN;
      if (prop.knockTime >= despawn) prop.alive = false;
      continue;
    }

    if (prop.fuse <= 0) continue;
    prop.fuse -= dt;
    if (prop.fuse > 0) continue;
    prop.alive = false;
    prop.fuse = 0;
    explodeAt(w, prop.x, prop.z, deps, prop.litByPlayer);
  }
}

function explodeAt(w: World, x: number, z: number, deps: StepDeps, byPlayer: boolean) {
  deps.events.onExplosion(x, z);

  const pd = Math.hypot(w.player.x - x, w.player.z - z);
  if (pd < EXPLOSION_DAMAGE_RADIUS) {
    damagePlayer(w, EXPLOSION_DAMAGE * (1 - pd / EXPLOSION_DAMAGE_RADIUS), deps);
  }

  for (const car of w.cars) {
    if (!car.active) continue;
    const dx = car.x - x, dz = car.z - z;
    const d = Math.hypot(dx, dz);
    if (d > EXPLOSION_IMPULSE_RADIUS || d < 1e-6) continue;
    const k = (1 - d / EXPLOSION_IMPULSE_RADIUS) * 14;
    car.vx += (dx / d) * k;
    car.vz += (dz / d) * k;
    if (car.ai && car.kind !== 'police') car.stun = Math.max(car.stun, 1.5);
    if (d < EXPLOSION_DAMAGE_RADIUS + 1.5) {
      damageCar(w, car, EXPLOSION_DAMAGE * (1 - d / (EXPLOSION_DAMAGE_RADIUS + 1.5)) * 0.9, deps, byPlayer);
    }
  }

  for (const ped of w.peds) {
    if (!ped.active || ped.state === 'dead') continue;
    if (Math.hypot(ped.x - x, ped.z - z) < EXPLOSION_DAMAGE_RADIUS + 0.5) killPed(w, ped, deps, byPlayer);
  }

  for (const other of w.props) {
    if (!other.alive || !other.explosive || other.fuse > 0) continue;
    if (Math.hypot(other.x - x, other.z - z) < EXPLOSION_CHAIN_RADIUS) {
      other.fuse = 0.15 + Math.random() * 0.2;
      other.litByPlayer = byPlayer; // la reacción en cadena hereda la atribución
    }
  }

  alertPeds(w, x, z, 24);
}

// ---------------------------------------------------------------- pickups

function stepPickups(w: World, dt: number, deps: StepDeps) {
  const p = w.player;
  for (const pk of w.pickups) {
    if (!pk.active) {
      pk.respawn -= dt;
      if (pk.respawn <= 0) pk.active = true;
      continue;
    }
    if (p.carId !== null || p.deadTimer > 0) continue;
    if (Math.hypot(pk.x - p.x, pk.z - p.z) > PICKUP_RADIUS + PLAYER_RADIUS) continue;

    if (pk.type === 'health') {
      if (p.health >= PLAYER_MAX_HEALTH) continue;
      p.health = Math.min(PLAYER_MAX_HEALTH, p.health + HEALTH_PICKUP_AMOUNT);
    } else {
      const wcfg = deps.getWeaponConfig(pk.type);
      p.weapons[pk.type] = (p.weapons[pk.type] ?? 0) + wcfg.pickupAmmo;
      p.currentWeapon = pk.type;
    }
    pk.active = false;
    pk.respawn = PICKUP_RESPAWN;
    deps.events.onPickup(pk.type);
  }
}
