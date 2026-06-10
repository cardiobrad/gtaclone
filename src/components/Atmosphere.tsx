import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { World } from '../engine/world';

/**
 * Efectos atmosféricos sutiles:
 * - sombras de nubes que derivan lentamente sobre la ciudad
 * - motas de polvo/polen flotando cerca del jugador
 * Todo barato: planos transparentes + un THREE.Points pequeño.
 */

const CLOUD_COUNT = 8;
const CLOUD_RANGE = 120;
const WIND = { x: 0.85, z: 0.35 };

const MOTE_COUNT = 60;
const MOTE_RANGE = 26;

function cloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  // varios blobs solapados con gradiente radial → forma irregular y bordes suaves
  for (let i = 0; i < 5; i++) {
    const cx = 38 + Math.random() * 52;
    const cy = 38 + Math.random() * 52;
    const r = 22 + Math.random() * 26;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Cloud { x: number; z: number; scale: number; speed: number; opacity: number; rot: number }

export function Atmosphere({ world }: { world: World }) {
  const tex = useMemo(cloudTexture, []);

  const clouds = useMemo<Cloud[]>(
    () =>
      Array.from({ length: CLOUD_COUNT }, () => ({
        x: world.player.x + (Math.random() - 0.5) * CLOUD_RANGE * 2,
        z: world.player.z + (Math.random() - 0.5) * CLOUD_RANGE * 2,
        scale: 16 + Math.random() * 22,
        speed: 0.7 + Math.random() * 0.7,
        opacity: 0.05 + Math.random() * 0.05,
        rot: Math.random() * Math.PI * 2,
      })),
    [world],
  );
  const cloudRefs = useRef<(THREE.Mesh | null)[]>([]);

  // motas de polvo: posiciones relativas al jugador, con fase para el vaivén
  const motes = useMemo(() => {
    const positions = new Float32Array(MOTE_COUNT * 3);
    const seed = Array.from({ length: MOTE_COUNT }, () => ({
      ox: (Math.random() - 0.5) * MOTE_RANGE * 2,
      oz: (Math.random() - 0.5) * MOTE_RANGE * 2,
      y: 0.4 + Math.random() * 3.2,
      phase: Math.random() * Math.PI * 2,
      drift: 0.3 + Math.random() * 0.5,
    }));
    return { positions, seed };
  }, []);
  const motesRef = useRef<THREE.Points>(null);

  useFrame(({ clock }, dt) => {
    const px = world.player.x;
    const pz = world.player.z;

    // nubes: deriva con el viento + wrap alrededor del jugador
    clouds.forEach((c, i) => {
      c.x += WIND.x * c.speed * dt;
      c.z += WIND.z * c.speed * dt;
      if (c.x - px > CLOUD_RANGE) c.x -= CLOUD_RANGE * 2;
      if (c.x - px < -CLOUD_RANGE) c.x += CLOUD_RANGE * 2;
      if (c.z - pz > CLOUD_RANGE) c.z -= CLOUD_RANGE * 2;
      if (c.z - pz < -CLOUD_RANGE) c.z += CLOUD_RANGE * 2;
      const m = cloudRefs.current[i];
      if (m) m.position.set(c.x, 0.22, c.z);
    });

    // motas: vaivén suave, ancladas alrededor del jugador (wrap)
    const t = clock.elapsedTime;
    const { positions, seed } = motes;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const s = seed[i];
      s.ox += WIND.x * s.drift * dt * 0.6;
      s.oz += WIND.z * s.drift * dt * 0.6;
      if (s.ox > MOTE_RANGE) s.ox -= MOTE_RANGE * 2;
      if (s.ox < -MOTE_RANGE) s.ox += MOTE_RANGE * 2;
      if (s.oz > MOTE_RANGE) s.oz -= MOTE_RANGE * 2;
      if (s.oz < -MOTE_RANGE) s.oz += MOTE_RANGE * 2;
      positions[i * 3] = px + s.ox + Math.sin(t * 0.5 + s.phase) * 0.6;
      positions[i * 3 + 1] = s.y + Math.sin(t * 0.8 + s.phase * 2) * 0.25;
      positions[i * 3 + 2] = pz + s.oz + Math.cos(t * 0.4 + s.phase) * 0.6;
    }
    if (motesRef.current) {
      motesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {clouds.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => { cloudRefs.current[i] = m; }}
          rotation={[-Math.PI / 2, 0, c.rot]}
          scale={c.scale}
          renderOrder={2}
        >
          <planeGeometry />
          <meshBasicMaterial
            map={tex}
            color="#000000"
            transparent
            opacity={c.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
      <points ref={motesRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[motes.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.07}
          sizeAttenuation
          color="#ffeec0"
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
