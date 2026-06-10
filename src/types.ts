// Tipos compartidos de todo el juego. TODO el contenido es data-driven:
// nada de números mágicos fuera de los JSON de /src/data y de constants.ts.

export interface TileTypeDef {
  id: string;
  char: string;
  name: string;
  color: string;
  walkable?: boolean;
  drivable?: boolean;
  blocked?: boolean;
  building?: boolean;
  elevation: number;
}

/** Mapa ya parseado a estructura interna. */
export interface MapData {
  width: number;
  height: number;
  /** Índice en `types` por celda (z * width + x). */
  grid: Uint8Array;
  types: TileTypeDef[];
}

export type Vec3 = [number, number, number];

/** Transform de posicionamiento de un asset. Se aplica en un group wrapper, nunca al GLTF original. */
export interface AssetPreset {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  notes?: string;
}

export type AssetCategory = 'character' | 'vehicle' | 'prop';

export interface AssetDef {
  id: string;
  name: string;
  category: AssetCategory;
}

export interface VehicleConfig {
  id: string;
  name: string;
  assetId: string;
  maxSpeed: number;
  reverseSpeed: number;
  accel: number;
  brake: number;
  drag: number;
  turnRate: number;
  grip: number;
  driftGrip: number;
  colliderRadius: number;
  colliderHalfLength: number;
  /** Puntos de vida del chasis (opcional para presets antiguos). */
  health?: number;
}

export interface WeaponConfig {
  id: string;
  name: string;
  damage: number;
  cooldown: number;
  bulletSpeed: number;
  bulletLife: number;
  pellets: number;
  spread: number;
  auto: boolean;
  infinite: boolean;
  pickupAmmo: number;
}

export interface GangDef {
  id: string;
  name: string;
  color: string;
  /** Territorio en coordenadas de tile (rectángulo inclusivo). */
  territory: { x0: number; z0: number; x1: number; z1: number };
}

export interface PickupPlacement {
  /** 'health' o id de arma (uzi, shotgun…). */
  type: string;
  tx: number;
  tz: number;
}

export interface Placement {
  asset: string;
  /** Coordenadas en tiles (admite decimales). */
  tx: number;
  tz: number;
  rotY?: number;
  /** Si es un vehículo, id de su config de handling. */
  vehicle?: string;
}

export interface PlacementsData {
  playerStart: { tx: number; tz: number; rotY: number };
  placements: Placement[];
  pickups?: PickupPlacement[];
}

/** Export/import completo de presets del usuario. */
export interface PresetBundle {
  version: 1;
  assetPresets: Record<string, AssetPreset>;
  vehicleConfigs: Record<string, VehicleConfig>;
  weaponConfigs?: Record<string, WeaponConfig>;
  /** Texturas custom como dataURL (opcional, puede pesar). */
  textures?: Record<string, string>;
}
