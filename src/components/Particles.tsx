import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { runtime } from '../engine/runtime';

const MAX = 800;

interface Particle {
  life: number;
  maxLife: number;
  vx: number; vy: number; vz: number;
  r: number; g: number; b: number;
  gravity: number;
}

/** Pool de partículas con THREE.Points y blending aditivo (fade vía color → negro). */
export function Particles() {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, particles } = useMemo(() => {
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    const particles: Particle[] = Array.from({ length: MAX }, () => ({
      life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, r: 0, g: 0, b: 0, gravity: 0,
    }));
    // fuera de cámara hasta que se usen
    for (let i = 0; i < MAX; i++) positions[i * 3 + 1] = -1000;
    return { positions, colors, particles };
  }, []);

  const cursor = useRef(0);

  useEffect(() => {
    const spawn = (
      x: number, y: number, z: number,
      vx: number, vy: number, vz: number,
      life: number, color: THREE.Color, gravity = 0,
    ) => {
      const i = cursor.current;
      cursor.current = (cursor.current + 1) % MAX;
      const p = particles[i];
      p.life = p.maxLife = life;
      p.vx = vx; p.vy = vy; p.vz = vz;
      p.r = color.r; p.g = color.g; p.b = color.b;
      p.gravity = gravity;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    };

    const c = new THREE.Color();
    runtime.particles = {
      explosion: (x, z) => {
        for (let i = 0; i < 70; i++) {
          const a = Math.random() * Math.PI * 2;
          const up = Math.random();
          const speed = 3 + Math.random() * 9;
          c.setHSL(0.06 + Math.random() * 0.06, 1, 0.5 + Math.random() * 0.25);
          spawn(x, 0.6, z, Math.cos(a) * speed, up * 7, Math.sin(a) * speed, 0.5 + Math.random() * 0.6, c, 9);
        }
        for (let i = 0; i < 25; i++) {
          const a = Math.random() * Math.PI * 2;
          c.setScalar(0.25 + Math.random() * 0.2);
          spawn(x, 0.8, z, Math.cos(a) * 1.5, 2 + Math.random() * 2.5, Math.sin(a) * 1.5, 1 + Math.random(), c, -1);
        }
      },
      smoke: (x, z) => {
        c.setScalar(0.3 + Math.random() * 0.2);
        spawn(
          x + (Math.random() - 0.5) * 0.4, 0.25, z + (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.6, 0.8 + Math.random(), (Math.random() - 0.5) * 0.6,
          0.45 + Math.random() * 0.3, c, -0.6,
        );
      },
      muzzle: (x, z, heading) => {
        const fx = Math.sin(heading), fz = Math.cos(heading);
        c.set('#ffd766');
        for (let i = 0; i < 4; i++) {
          spawn(
            x + fx * 0.6, 1.0, z + fz * 0.6,
            fx * (3 + Math.random() * 3) + (Math.random() - 0.5), Math.random(),
            fz * (3 + Math.random() * 3) + (Math.random() - 0.5),
            0.12, c, 0,
          );
        }
      },
      blood: (x, z) => {
        for (let i = 0; i < 22; i++) {
          const a = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 3;
          c.setHSL(0, 0.9, 0.2 + Math.random() * 0.2);
          spawn(x, 0.7, z, Math.cos(a) * speed, 1 + Math.random() * 3, Math.sin(a) * speed, 0.4 + Math.random() * 0.4, c, 10);
        }
      },
      spark: (x, z) => {
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 4;
          c.setHSL(0.12, 1, 0.6 + Math.random() * 0.3);
          spawn(x, 0.8, z, Math.cos(a) * speed, 1 + Math.random() * 2, Math.sin(a) * speed, 0.18 + Math.random() * 0.15, c, 12);
        }
      },
      skid: (x, z) => {
        // humo de neumático: bajo, denso y que se disipa rápido
        for (let i = 0; i < 2; i++) {
          c.setScalar(0.45 + Math.random() * 0.25);
          spawn(
            x + (Math.random() - 0.5) * 0.3, 0.12, z + (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.8, (Math.random() - 0.5) * 1.2,
            0.3 + Math.random() * 0.25, c, -0.8,
          );
        }
      },
      water: (x, z) => {
        // geiser: chorro vertical con algo de dispersión
        for (let i = 0; i < 3; i++) {
          c.setRGB(0.5 + Math.random() * 0.3, 0.7 + Math.random() * 0.2, 1.0);
          spawn(
            x + (Math.random() - 0.5) * 0.25, 0.3, z + (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 1.6, 6 + Math.random() * 4, (Math.random() - 0.5) * 1.6,
            0.6 + Math.random() * 0.4, c, 11,
          );
        }
      },
      respray: (x, z) => {
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 3;
          c.setHSL(Math.random(), 0.85, 0.6);
          spawn(x, 0.4 + Math.random() * 1.2, z, Math.cos(a) * speed, 1 + Math.random() * 2, Math.sin(a) * speed, 0.5 + Math.random() * 0.5, c, 2);
        }
      },
    };
    return () => { runtime.particles = null; };
  }, [particles, positions]);

  useFrame((_, dt) => {
    const points = pointsRef.current;
    if (!points) return;
    const geo = points.geometry;
    for (let i = 0; i < MAX; i++) {
      const p = particles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        positions[i * 3 + 1] = -1000;
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        continue;
      }
      p.vy -= p.gravity * dt;
      positions[i * 3] += p.vx * dt;
      positions[i * 3 + 1] += p.vy * dt;
      positions[i * 3 + 2] += p.vz * dt;
      if (positions[i * 3 + 1] < 0.05) positions[i * 3 + 1] = 0.05;
      const k = p.life / p.maxLife;
      colors[i * 3] = p.r * k;
      colors[i * 3 + 1] = p.g * k;
      colors[i * 3 + 2] = p.b * k;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.45}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
