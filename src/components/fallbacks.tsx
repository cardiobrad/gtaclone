import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Modelos low-poly procedurales usados cuando el usuario no ha subido un GLB.
 * Convención: pivot en el suelo (Y=0) y mirando hacia +Z.
 */

/** Fuente de movimiento para la animación procedural de humanoides. */
export type MotionSource = () => { moving: boolean; run: boolean };

interface HumanoidPalette {
  shirt: string;
  pants: string;
  skin: string;
  /** gorra/casco opcional. */
  hat?: string;
}

/**
 * Humanoide con rig procedural: piernas y brazos pivotan en cadera/hombro
 * y se balancean según el MotionSource (andar/correr). Sin motion = pose estática.
 */
function HumanoidRig({ palette, motion }: { palette: HumanoidPalette; motion?: MotionSource }) {
  const lLeg = useRef<THREE.Group>(null);
  const rLeg = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((_, dt) => {
    const m = motion ? motion() : { moving: false, run: false };
    const freq = m.run ? 13 : 8;
    const amp = m.moving ? (m.run ? 0.95 : 0.55) : 0;
    if (m.moving) phase.current += dt * freq;
    const swing = Math.sin(phase.current) * amp;
    const k = Math.min(1, dt * 12); // suavizado al parar/arrancar
    if (lLeg.current) lLeg.current.rotation.x += (swing - lLeg.current.rotation.x) * k;
    if (rLeg.current) rLeg.current.rotation.x += (-swing - rLeg.current.rotation.x) * k;
    if (lArm.current) lArm.current.rotation.x += (-swing * 0.8 - lArm.current.rotation.x) * k;
    if (rArm.current) rArm.current.rotation.x += (swing * 0.8 - rArm.current.rotation.x) * k;
  });

  return (
    <group>
      {/* piernas (pivote en la cadera) */}
      <group ref={lLeg} position={[-0.09, 0.45, 0]}>
        <mesh castShadow position={[0, -0.225, 0]}>
          <boxGeometry args={[0.13, 0.45, 0.16]} />
          <meshStandardMaterial color={palette.pants} />
        </mesh>
      </group>
      <group ref={rLeg} position={[0.09, 0.45, 0]}>
        <mesh castShadow position={[0, -0.225, 0]}>
          <boxGeometry args={[0.13, 0.45, 0.16]} />
          <meshStandardMaterial color={palette.pants} />
        </mesh>
      </group>
      {/* torso */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[0.4, 0.55, 0.22]} />
        <meshStandardMaterial color={palette.shirt} />
      </mesh>
      {/* brazos (pivote en el hombro) */}
      <group ref={lArm} position={[-0.26, 0.94, 0]}>
        <mesh castShadow position={[0, -0.24, 0]}>
          <boxGeometry args={[0.09, 0.48, 0.14]} />
          <meshStandardMaterial color={palette.shirt} />
        </mesh>
      </group>
      <group ref={rArm} position={[0.26, 0.94, 0]}>
        <mesh castShadow position={[0, -0.24, 0]}>
          <boxGeometry args={[0.09, 0.48, 0.14]} />
          <meshStandardMaterial color={palette.shirt} />
        </mesh>
      </group>
      {/* cabeza */}
      <mesh castShadow position={[0, 1.14, 0]}>
        <sphereGeometry args={[0.14, 12, 10]} />
        <meshStandardMaterial color={palette.skin} />
      </mesh>
      {palette.hat && (
        <mesh castShadow position={[0, 1.27, 0.02]}>
          <boxGeometry args={[0.26, 0.09, 0.3]} />
          <meshStandardMaterial color={palette.hat} />
        </mesh>
      )}
    </group>
  );
}

export function PlayerModel({ motion }: { motion?: MotionSource }) {
  return <HumanoidRig motion={motion} palette={{ shirt: '#c9a23c', pants: '#2e3138', skin: '#d9a066', hat: '#7a2d2d' }} />;
}

/** Paletas de ropa para variar los peatones. */
const PED_PALETTES: HumanoidPalette[] = [
  { shirt: '#5b7fb8', pants: '#33363e', skin: '#d9a066' },
  { shirt: '#b85b5b', pants: '#2c2c33', skin: '#c68642' },
  { shirt: '#5bb878', pants: '#4a4136', skin: '#f1c27d' },
  { shirt: '#9d5bb8', pants: '#3a3f4a', skin: '#8d5524' },
  { shirt: '#b8a15b', pants: '#26282e', skin: '#e0ac69' },
];

export function PedModel({ variant = 0, motion }: { variant?: number; motion?: MotionSource }) {
  return <HumanoidRig motion={motion} palette={PED_PALETTES[variant % PED_PALETTES.length]} />;
}

export function CopModel({ motion }: { motion?: MotionSource }) {
  return <HumanoidRig motion={motion} palette={{ shirt: '#2b4a8f', pants: '#1c2433', skin: '#e0ac69', hat: '#1c2433' }} />;
}

export function MedicModel({ motion }: { motion?: MotionSource }) {
  return <HumanoidRig motion={motion} palette={{ shirt: '#f2f5f7', pants: '#c2342e', skin: '#e0ac69', hat: '#f2f5f7' }} />;
}

const GANG_SKINS = ['#d9a066', '#c68642', '#8d5524', '#f1c27d'];

export function GangModel({ color = '#b14ce8', variant = 0, motion }: { color?: string; variant?: number; motion?: MotionSource }) {
  return (
    <group>
      <HumanoidRig motion={motion} palette={{ shirt: color, pants: '#23252b', skin: GANG_SKINS[variant % GANG_SKINS.length], hat: color }} />
    </group>
  );
}

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <mesh castShadow position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.3, 0.3, 0.24, 12]} />
      <meshStandardMaterial color="#1c1c20" />
    </mesh>
  );
}

function Headlights({ width, z }: { width: number; z: number }) {
  return (
    <>
      <mesh position={[-width / 2 + 0.25, 0.55, z]}>
        <boxGeometry args={[0.22, 0.12, 0.06]} />
        <meshStandardMaterial color="#fff6c9" emissive="#fff6c9" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[width / 2 - 0.25, 0.55, z]}>
        <boxGeometry args={[0.22, 0.12, 0.06]} />
        <meshStandardMaterial color="#fff6c9" emissive="#fff6c9" emissiveIntensity={0.9} />
      </mesh>
    </>
  );
}

export function SedanModel({ color = '#b03a3a' }: { color?: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.6, 0.45, 3.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0, 0.88, -0.2]}>
        <boxGeometry args={[1.4, 0.42, 1.7]} />
        <meshStandardMaterial color="#23252e" metalness={0.3} roughness={0.4} />
      </mesh>
      <Wheel x={-0.78} z={1.1} />
      <Wheel x={0.78} z={1.1} />
      <Wheel x={-0.78} z={-1.1} />
      <Wheel x={0.78} z={-1.1} />
      <Headlights width={1.6} z={1.71} />
    </group>
  );
}

/** Coche patrulla: librea blanca/negra + barra de luces rojo/azul parpadeante. */
export function PoliceCarModel() {
  const redRef = useRef<THREE.MeshStandardMaterial>(null);
  const blueRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const on = Math.floor(clock.elapsedTime * 4) % 2 === 0;
    if (redRef.current) redRef.current.emissiveIntensity = on ? 2.2 : 0.15;
    if (blueRef.current) blueRef.current.emissiveIntensity = on ? 0.15 : 2.2;
  });
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.6, 0.45, 3.4]} />
        <meshStandardMaterial color="#e8e8ea" />
      </mesh>
      {/* franjas negras en las puertas */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.62, 0.18, 1.4]} />
        <meshStandardMaterial color="#15151a" />
      </mesh>
      <mesh castShadow position={[0, 0.88, -0.2]}>
        <boxGeometry args={[1.4, 0.42, 1.7]} />
        <meshStandardMaterial color="#23252e" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* barra de luces */}
      <mesh position={[-0.3, 1.15, -0.2]}>
        <boxGeometry args={[0.5, 0.12, 0.3]} />
        <meshStandardMaterial ref={redRef} color="#ff2222" emissive="#ff2222" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0.3, 1.15, -0.2]}>
        <boxGeometry args={[0.5, 0.12, 0.3]} />
        <meshStandardMaterial ref={blueRef} color="#2266ff" emissive="#2266ff" emissiveIntensity={0.15} toneMapped={false} />
      </mesh>
      <Wheel x={-0.78} z={1.1} />
      <Wheel x={0.78} z={1.1} />
      <Wheel x={-0.78} z={-1.1} />
      <Wheel x={0.78} z={-1.1} />
      <Headlights width={1.6} z={1.71} />
    </group>
  );
}

export function TaxiModel() {
  return (
    <group>
      <SedanModel color="#e0b53a" />
      {/* cartel del techo */}
      <mesh castShadow position={[0, 1.16, -0.2]}>
        <boxGeometry args={[0.7, 0.16, 0.3]} />
        <meshStandardMaterial color="#1c1c20" />
      </mesh>
      <mesh position={[0, 1.16, -0.04]}>
        <boxGeometry args={[0.5, 0.1, 0.02]} />
        <meshStandardMaterial color="#fff6c9" emissive="#fff6c9" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

export function SportModel({ color = '#d8442e' }: { color?: string }) {
  return (
    <group>
      {/* carrocería baja en cuña */}
      <mesh castShadow position={[0, 0.38, 0.2]}>
        <boxGeometry args={[1.55, 0.34, 3.0]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.46, 1.55]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[1.5, 0.22, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.7, -0.25]}>
        <boxGeometry args={[1.25, 0.32, 1.3]} />
        <meshStandardMaterial color="#1a1c24" metalness={0.5} roughness={0.25} />
      </mesh>
      {/* alerón */}
      <mesh castShadow position={[0, 0.72, -1.5]}>
        <boxGeometry args={[1.4, 0.07, 0.32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Wheel x={-0.74} z={1.05} />
      <Wheel x={0.74} z={1.05} />
      <Wheel x={-0.74} z={-1.05} />
      <Wheel x={0.74} z={-1.05} />
      <Headlights width={1.55} z={1.99} />
    </group>
  );
}

export function MuscleModel({ color = '#2e3a4e' }: { color?: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.48, 0]}>
        <boxGeometry args={[1.7, 0.44, 3.6]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* franja central */}
      <mesh position={[0, 0.71, 0]}>
        <boxGeometry args={[0.4, 0.011, 3.62]} />
        <meshStandardMaterial color="#e8e8ea" />
      </mesh>
      <mesh castShadow position={[0, 0.85, -0.5]}>
        <boxGeometry args={[1.45, 0.36, 1.4]} />
        <meshStandardMaterial color="#1f2129" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* toma de aire del capó */}
      <mesh castShadow position={[0, 0.74, 0.9]}>
        <boxGeometry args={[0.5, 0.12, 0.5]} />
        <meshStandardMaterial color="#15161c" />
      </mesh>
      <Wheel x={-0.82} z={1.15} />
      <Wheel x={0.82} z={1.15} />
      <Wheel x={-0.82} z={-1.15} />
      <Wheel x={0.82} z={-1.15} />
      <Headlights width={1.7} z={1.81} />
    </group>
  );
}

export function PickupTruckModel({ color = '#7a4a2e' }: { color?: string }) {
  return (
    <group>
      {/* cabina */}
      <mesh castShadow position={[0, 0.62, 0.95]}>
        <boxGeometry args={[1.7, 0.7, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0, 1.05, 0.7]}>
        <boxGeometry args={[1.5, 0.4, 0.9]} />
        <meshStandardMaterial color="#23252e" />
      </mesh>
      {/* caja abierta */}
      <mesh castShadow position={[0, 0.55, -0.95]}>
        <boxGeometry args={[1.7, 0.55, 2.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.7, -0.95]}>
        <boxGeometry args={[1.4, 0.3, 1.9]} />
        <meshStandardMaterial color="#1c1c20" />
      </mesh>
      <Wheel x={-0.85} z={1.2} />
      <Wheel x={0.85} z={1.2} />
      <Wheel x={-0.85} z={-1.2} />
      <Wheel x={0.85} z={-1.2} />
      <Headlights width={1.7} z={1.71} />
    </group>
  );
}

export function BusModel({ color = '#3a8a5a' }: { color?: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[1.95, 1.7, 5.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* franja de ventanas */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[1.97, 0.5, 4.9]} />
        <meshStandardMaterial color="#23303a" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* parabrisas */}
      <mesh position={[0, 1.25, 2.79]}>
        <boxGeometry args={[1.7, 0.7, 0.05]} />
        <meshStandardMaterial color="#23303a" metalness={0.4} roughness={0.3} />
      </mesh>
      <Wheel x={-0.95} z={1.9} />
      <Wheel x={0.95} z={1.9} />
      <Wheel x={-0.95} z={-1.9} />
      <Wheel x={0.95} z={-1.9} />
      <Headlights width={1.95} z={2.81} />
    </group>
  );
}

export function TruckModel({ color = '#8a8a92' }: { color?: string }) {
  return (
    <group>
      {/* cabina */}
      <mesh castShadow position={[0, 0.95, 1.7]}>
        <boxGeometry args={[1.85, 1.5, 1.4]} />
        <meshStandardMaterial color="#b03a3a" />
      </mesh>
      <mesh position={[0, 1.25, 2.41]}>
        <boxGeometry args={[1.6, 0.55, 0.05]} />
        <meshStandardMaterial color="#23303a" />
      </mesh>
      {/* caja de carga */}
      <mesh castShadow position={[0, 1.15, -0.8]}>
        <boxGeometry args={[1.95, 1.9, 3.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Wheel x={-0.9} z={1.7} />
      <Wheel x={0.9} z={1.7} />
      <Wheel x={-0.9} z={-0.4} />
      <Wheel x={0.9} z={-0.4} />
      <Wheel x={-0.9} z={-1.6} />
      <Wheel x={0.9} z={-1.6} />
      <Headlights width={1.85} z={2.41} />
    </group>
  );
}

export function VanModel({ color = '#3d6ea5' }: { color?: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.85, -0.35]}>
        <boxGeometry args={[1.8, 1.3, 3.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0, 0.62, 1.55]}>
        <boxGeometry args={[1.8, 0.84, 0.8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.05, 1.55]}>
        <boxGeometry args={[1.6, 0.4, 0.7]} />
        <meshStandardMaterial color="#23252e" />
      </mesh>
      <Wheel x={-0.88} z={1.3} />
      <Wheel x={0.88} z={1.3} />
      <Wheel x={-0.88} z={-1.3} />
      <Wheel x={0.88} z={-1.3} />
      <Headlights width={1.8} z={1.96} />
    </group>
  );
}

export function AmbulanceModel() {
  const redRef = useRef<THREE.MeshStandardMaterial>(null);
  const blueRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const on = Math.floor(clock.elapsedTime * 4) % 2 === 0;
    if (redRef.current) redRef.current.emissiveIntensity = on ? 2.2 : 0.15;
    if (blueRef.current) blueRef.current.emissiveIntensity = on ? 0.15 : 2.2;
  });
  return (
    <group>
      {/* caja trasera blanca */}
      <mesh castShadow position={[0, 0.92, -0.35]}>
        <boxGeometry args={[1.85, 1.45, 3.0]} />
        <meshStandardMaterial color="#f2f4f6" />
      </mesh>
      {/* franja roja */}
      <mesh position={[0, 0.78, -0.35]}>
        <boxGeometry args={[1.87, 0.24, 3.02]} />
        <meshStandardMaterial color="#d8362f" />
      </mesh>
      {/* cruz en el techo */}
      <mesh position={[0, 1.66, -0.35]}>
        <boxGeometry args={[0.9, 0.04, 0.28]} />
        <meshStandardMaterial color="#d8362f" />
      </mesh>
      <mesh position={[0, 1.66, -0.35]}>
        <boxGeometry args={[0.28, 0.04, 0.9]} />
        <meshStandardMaterial color="#d8362f" />
      </mesh>
      {/* cabina */}
      <mesh castShadow position={[0, 0.62, 1.5]}>
        <boxGeometry args={[1.85, 0.86, 0.85]} />
        <meshStandardMaterial color="#f2f4f6" />
      </mesh>
      <mesh position={[0, 1.06, 1.5]}>
        <boxGeometry args={[1.65, 0.4, 0.75]} />
        <meshStandardMaterial color="#23252e" />
      </mesh>
      {/* barra de luces */}
      <mesh position={[-0.3, 1.74, 0.6]}>
        <boxGeometry args={[0.5, 0.12, 0.3]} />
        <meshStandardMaterial ref={redRef} color="#ff2222" emissive="#ff2222" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0.3, 1.74, 0.6]}>
        <boxGeometry args={[0.5, 0.12, 0.3]} />
        <meshStandardMaterial ref={blueRef} color="#2266ff" emissive="#2266ff" emissiveIntensity={0.15} toneMapped={false} />
      </mesh>
      <Wheel x={-0.9} z={1.3} />
      <Wheel x={0.9} z={1.3} />
      <Wheel x={-0.9} z={-1.25} />
      <Wheel x={0.9} z={-1.25} />
      <Headlights width={1.85} z={1.93} />
    </group>
  );
}

export function BarrelModel() {
  return (
    <group>
      <mesh castShadow position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.9, 14]} />
        <meshStandardMaterial color="#a32626" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.18, 14]} />
        <meshStandardMaterial color="#e0b53a" emissive="#5e4a10" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function TreeModel() {
  return (
    <group>
      <mesh castShadow position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 0.9, 8]} />
        <meshStandardMaterial color="#5e4426" />
      </mesh>
      <mesh castShadow position={[0, 1.35, 0]}>
        <coneGeometry args={[0.75, 1.5, 9]} />
        <meshStandardMaterial color="#3a6e33" />
      </mesh>
      <mesh castShadow position={[0, 2.15, 0]}>
        <coneGeometry args={[0.5, 1.0, 9]} />
        <meshStandardMaterial color="#458040" />
      </mesh>
    </group>
  );
}

export function TrafficLightModel() {
  return (
    <group>
      <mesh castShadow position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 2.6, 8]} />
        <meshStandardMaterial color="#3c3f46" />
      </mesh>
      <mesh castShadow position={[0, 2.45, 0]}>
        <boxGeometry args={[0.26, 0.74, 0.2]} />
        <meshStandardMaterial color="#23252b" />
      </mesh>
      <mesh position={[0, 2.66, 0.1]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 2.45, 0.1]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#665b16" emissive="#665b16" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 2.24, 0.1]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#1c4d22" emissive="#1c4d22" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/** Fuente con agua animada (escala pulsante del chorro). */
export function FountainModel() {
  const jetRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!jetRef.current) return;
    const t = clock.elapsedTime;
    jetRef.current.scale.y = 1 + Math.sin(t * 5) * 0.15;
    jetRef.current.scale.x = jetRef.current.scale.z = 1 + Math.sin(t * 5 + 1.3) * 0.08;
  });
  return (
    <group>
      {/* pilón */}
      <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1.25, 1.35, 0.5, 18]} />
        <meshStandardMaterial color="#8d8d95" roughness={0.8} />
      </mesh>
      {/* lámina de agua */}
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 0.06, 18]} />
        <meshStandardMaterial color="#3e7fb8" transparent opacity={0.85} roughness={0.15} metalness={0.3} />
      </mesh>
      {/* columna central */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.7, 10]} />
        <meshStandardMaterial color="#7e7e86" roughness={0.85} />
      </mesh>
      {/* chorro animado */}
      <mesh ref={jetRef} position={[0, 1.35, 0]}>
        <coneGeometry args={[0.3, 0.85, 10]} />
        <meshStandardMaterial color="#9fd2e8" transparent opacity={0.7} emissive="#3e7fb8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function LampModel() {
  return (
    <group>
      <mesh castShadow position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 3.2, 8]} />
        <meshStandardMaterial color="#2e3138" />
      </mesh>
      <mesh castShadow position={[0, 3.18, 0.3]}>
        <boxGeometry args={[0.08, 0.08, 0.7]} />
        <meshStandardMaterial color="#2e3138" />
      </mesh>
      <mesh position={[0, 3.1, 0.6]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#ffe8b0" emissive="#ffd97a" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

export function BenchModel() {
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.45]} />
        <meshStandardMaterial color="#7a5a38" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.62, -0.2]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[1.5, 0.42, 0.07]} />
        <meshStandardMaterial color="#7a5a38" roughness={0.85} />
      </mesh>
      <mesh position={[-0.6, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.4]} />
        <meshStandardMaterial color="#2e3138" />
      </mesh>
      <mesh position={[0.6, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.4]} />
        <meshStandardMaterial color="#2e3138" />
      </mesh>
    </group>
  );
}

export function HydrantModel() {
  return (
    <group>
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.56, 10]} />
        <meshStandardMaterial color="#c23a2a" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.58, 0]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#c23a2a" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
        <meshStandardMaterial color="#a32f22" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function UnknownModel() {
  return (
    <mesh castShadow position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#c054c0" wireframe />
    </mesh>
  );
}

/** Visual de los pickups (flotan y giran en PickupsView). */
const PICKUP_COLORS: Record<string, string> = {
  uzi: '#3ec5e8',
  shotgun: '#e8923e',
  health: '#3ee86f',
};

export function PickupModel({ type }: { type: string }) {
  const color = PICKUP_COLORS[type] ?? '#e8e83e';
  if (type === 'health') {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.18, 0.18]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.55, 0.18]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.22, 0.18]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh castShadow position={[0.12, -0.18, 0]}>
        <boxGeometry args={[0.14, 0.3, 0.14]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} />
      </mesh>
    </group>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FALLBACK_MODELS: Record<string, (props?: any) => ReactNode> = {
  player: (props) => <PlayerModel motion={props?.motion} />,
  ped: (props) => <PedModel variant={props?.variant ?? 0} motion={props?.motion} />,
  cop: (props) => <CopModel motion={props?.motion} />,
  medic: (props) => <MedicModel motion={props?.motion} />,
  gang: (props) => <GangModel color={props?.color} variant={props?.variant ?? 0} motion={props?.motion} />,
  sedan: () => <SedanModel />,
  police: () => <PoliceCarModel />,
  ambulance: () => <AmbulanceModel />,
  taxi: () => <TaxiModel />,
  sport: () => <SportModel />,
  muscle: () => <MuscleModel />,
  pickup: () => <PickupTruckModel />,
  bus: () => <BusModel />,
  truck: () => <TruckModel />,
  van: () => <VanModel />,
  barrel: () => <BarrelModel />,
  tree: () => <TreeModel />,
  trafficlight: () => <TrafficLightModel />,
  fountain: () => <FountainModel />,
  lamp: () => <LampModel />,
  bench: () => <BenchModel />,
  hydrant: () => <HydrantModel />,
};
