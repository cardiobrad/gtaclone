import type { World } from './world';

/**
 * Referencias mutables compartidas entre el Canvas 3D y la UI (HUD/minimapa)
 * sin pasar por React state (se leen a 60 fps).
 */
export interface ParticleApi {
  explosion: (x: number, z: number) => void;
  smoke: (x: number, z: number) => void;
  muzzle: (x: number, z: number, heading: number) => void;
  blood: (x: number, z: number) => void;
  spark: (x: number, z: number) => void;
  /** humo de neumático a ras de suelo (derrapes). */
  skid: (x: number, z: number) => void;
  /** nube de pintura del taller (respray). */
  respray: (x: number, z: number) => void;
  /** geiser de agua de un hidrante roto. */
  water: (x: number, z: number) => void;
}

export const runtime: {
  world: World | null;
  particles: ParticleApi | null;
} = {
  world: null,
  particles: null,
};
