import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { World, CarState, PropState, PedState, PickupState } from '../engine/world';
import { GANGS } from '../engine/world';
import { runtime } from '../engine/runtime';
import { AssetModel } from './AssetModel';
import { PickupModel } from './fallbacks';
import {
  MAX_BULLETS, CAMERA_OFFSET, CAMERA_LERP, CAMERA_SPEED_ZOOM,
  HYDRANT_WATER_TIME, HYDRANT_DESPAWN, PROP_KNOCK_DESPAWN,
} from '../constants';

/** Insignia flotante sobre policías/ambulancias para identificarlos de un vistazo. */
function RoleMarker({ variant, size }: { variant: 'police' | 'medic'; size: 'vehicle' | 'ped' }) {
  const ref = useRef<THREE.Group>(null);
  const s = size === 'vehicle' ? 1 : 0.42;
  const baseY = size === 'vehicle' ? 4.3 : 2.1;

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y = clock.elapsedTime * 0.9;
    g.position.y = baseY + Math.sin(clock.elapsedTime * 2.2) * 0.07 * s;
  });

  if (variant === 'police') {
    return (
      <group ref={ref}>
        {/* placa dorada hexagonal */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.38 * s, 0.38 * s, 0.05 * s, 6]} />
          <meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={0.55} metalness={0.85} roughness={0.25} />
        </mesh>
        {/* estrella central */}
        <mesh position={[0, 0.04 * s, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14 * s, 0.14 * s, 0.04 * s, 5]} />
          <meshStandardMaterial color="#fff3b0" emissive="#ffe566" emissiveIntensity={0.7} metalness={0.6} />
        </mesh>
        {/* halo suave */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42 * s, 0.52 * s, 24]} />
          <meshBasicMaterial color="#ffd54a" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={ref}>
      {/* cruz roja */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.52 * s, 0.13 * s, 0.13 * s]} />
        <meshStandardMaterial color="#e83030" emissive="#ff2222" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.13 * s, 0.52 * s, 0.13 * s]} />
        <meshStandardMaterial color="#e83030" emissive="#ff2222" emissiveIntensity={0.45} />
      </mesh>
      {/* halo suave */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34 * s, 0.44 * s, 16]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- jugador

export function PlayerView({ world }: { world: World }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const p = world.player;
    g.visible = p.carId === null && p.deadTimer <= 0;
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.heading;
    // bob sutil al correr
    g.position.y = p.moving ? Math.abs(Math.sin(world.time * 13)) * 0.04 : 0;
  });
  return (
    <group ref={ref}>
      <AssetModel
        assetId="player"
        fallbackProps={{
          motion: () => ({ moving: world.player.moving && world.player.carId === null, run: true }),
        }}
      />
    </group>
  );
}

// ---------------------------------------------------------------- coches

function CarView({ world, car }: { world: World; car: CarState }) {
  const ref = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const wreckRef = useRef<THREE.Mesh>(null);
  const smokeTimer = useRef(0);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.visible = car.active;
    if (!car.active) return;
    g.position.set(car.x, 0, car.z);
    g.rotation.y = car.heading;
    // balanceo de carrocería con el derrape
    if (bodyRef.current) {
      bodyRef.current.rotation.z = THREE.MathUtils.clamp(car.drift * 0.018, -0.12, 0.12);
    }
    if (wreckRef.current) wreckRef.current.visible = car.dead;

    if (car.dead) {
      // humo del coche destrozado
      smokeTimer.current -= dt;
      if (smokeTimer.current <= 0) {
        smokeTimer.current = 0.12;
        runtime.particles?.smoke(car.x, car.z);
      }
    } else if (world.player.carId === car.id && Math.abs(car.drift) > 3) {
      // humo de neumático en las dos ruedas traseras
      smokeTimer.current -= dt;
      if (smokeTimer.current <= 0) {
        smokeTimer.current = 0.025;
        const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
        const rx = fz, rz = -fx;
        const bx = car.x - fx * 1.1;
        const bz = car.z - fz * 1.1;
        runtime.particles?.skid(bx + rx * 0.7, bz + rz * 0.7);
        runtime.particles?.skid(bx - rx * 0.7, bz - rz * 0.7);
        // derrape extremo: chispas ocasionales
        if (Math.abs(car.drift) > 6.5 && Math.random() < 0.3) {
          runtime.particles?.spark(bx, bz);
        }
      }
    }
  });

  return (
    <group ref={ref}>
      <group ref={bodyRef}>
        <AssetModel assetId={car.assetId} />
      </group>
      {/* carcasa carbonizada cuando el coche está destruido */}
      <mesh ref={wreckRef} visible={false} position={[0, 0.55, 0]}>
        <boxGeometry args={[1.75, 1.0, 3.6]} />
        <meshStandardMaterial color="#15110e" transparent opacity={0.92} roughness={1} />
      </mesh>
      {!car.dead && (car.kind === 'police' || car.kind === 'ambulance') && (
        <RoleMarker variant={car.kind === 'police' ? 'police' : 'medic'} size="vehicle" />
      )}
    </group>
  );
}

export function CarsView({ world }: { world: World }) {
  return (
    <>
      {world.cars.map((car) => (
        <CarView key={car.id} world={world} car={car} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- peatones

function PedView({ ped, gangColor }: { ped: PedState; gangColor?: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.visible = ped.active;
    g.position.set(ped.x, 0, ped.z);
    if (ped.state === 'dead' || ped.state === 'downed') {
      g.rotation.set(0, ped.heading, 0);
      g.rotateX(-Math.PI / 2); // tumbado en el suelo
      g.position.y = 0.12;
    } else {
      g.rotation.set(0, ped.heading, 0);
      const rate = ped.state === 'flee' || ped.state === 'chase' ? 16 : 9;
      g.position.y = ped.moving ? Math.abs(Math.sin(clock.elapsedTime * rate + ped.variant)) * 0.04 : 0;
    }
  });
  const assetId = ped.kind === 'cop' ? 'cop' : ped.kind === 'gang' ? 'gang' : ped.kind === 'medic' ? 'medic' : 'ped';
  return (
    <group ref={ref}>
      <AssetModel
        assetId={assetId}
        fallbackProps={{
          variant: ped.variant,
          color: gangColor,
          motion: () => ({
            moving: ped.moving && ped.state !== 'dead',
            run: ped.state === 'flee' || ped.state === 'chase',
          }),
        }}
      />
      {(ped.kind === 'cop' || ped.kind === 'medic') && ped.state !== 'dead' && ped.state !== 'downed' && (
        <RoleMarker variant={ped.kind === 'cop' ? 'police' : 'medic'} size="ped" />
      )}
    </group>
  );
}

export function PedsView({ world }: { world: World }) {
  return (
    <>
      {world.peds.map((ped) => (
        <PedView
          key={ped.id}
          ped={ped}
          gangColor={ped.gangId ? GANGS.find((g) => g.id === ped.gangId)?.color : undefined}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- pickups

function PickupView({ pickup }: { pickup: PickupState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.visible = pickup.active;
    g.rotation.y = clock.elapsedTime * 2;
    g.position.y = 0.7 + Math.sin(clock.elapsedTime * 3) * 0.12;
  });
  return (
    <group position={[pickup.x, 0.7, pickup.z]} ref={ref}>
      <PickupModel type={pickup.type} />
    </group>
  );
}

export function PickupsView({ world }: { world: World }) {
  return (
    <>
      {world.pickups.map((pk) => (
        <PickupView key={pk.id} pickup={pk} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- props

const _tipAxis = new THREE.Vector3();
const _qTip = new THREE.Quaternion();
const _qYaw = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

function PropView({ prop }: { prop: PropState }) {
  const ref = useRef<THREE.Group>(null);
  const waterTimer = useRef(0);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.visible = prop.alive;
    if (!prop.alive) return;

    // parpadeo de mecha antes de explotar
    if (prop.fuse > 0) {
      const s = 1 + Math.sin(prop.fuse * 60) * 0.06;
      g.scale.setScalar(s);
    }

    if (prop.knocked) {
      // caída: rota ~90° alrededor del eje perpendicular a la dirección del golpe
      const t = Math.min(1, prop.knockTime / 0.45);
      const ease = 1 - (1 - t) * (1 - t);
      _tipAxis.set(prop.knockDirZ, 0, -prop.knockDirX).normalize();
      _qTip.setFromAxisAngle(_tipAxis, ease * Math.PI * 0.48);
      _qYaw.setFromAxisAngle(UP, prop.rotY);
      g.quaternion.multiplyQuaternions(_qTip, _qYaw);
      g.position.y = 0.06;

      // hidrante roto: geiser de agua mientras dura
      if (prop.assetId === 'hydrant' && prop.knockTime < HYDRANT_WATER_TIME) {
        waterTimer.current -= dt;
        if (waterTimer.current <= 0) {
          waterTimer.current = 0.03;
          runtime.particles?.water(prop.x, prop.z);
        }
      }

      // encogerse justo antes de desaparecer
      const despawn = prop.assetId === 'hydrant' ? HYDRANT_DESPAWN : PROP_KNOCK_DESPAWN;
      const left = despawn - prop.knockTime;
      if (left < 0.8) g.scale.setScalar(Math.max(0.01, left / 0.8));
    }
  });
  return (
    <group ref={ref} position={[prop.x, 0, prop.z]} rotation={[0, prop.rotY, 0]}>
      <AssetModel assetId={prop.assetId} />
    </group>
  );
}

export function PropsView({ world }: { world: World }) {
  return (
    <>
      {world.props.map((prop) => (
        <PropView key={prop.id} prop={prop} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- balas

export function BulletsView({ world }: { world: World }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = dummy.current;
    world.bullets.forEach((b, i) => {
      d.position.set(b.x, 1.0, b.z);
      d.rotation.y = Math.atan2(b.dx, b.dz);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.count = world.bullets.length;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_BULLETS]} frustumCulled={false}>
      <boxGeometry args={[0.07, 0.07, 0.5]} />
      <meshBasicMaterial color="#ffe18a" toneMapped={false} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------- cámara

export function FollowCamera({ world }: { world: World }) {
  const target = useRef(new THREE.Vector3(world.player.x, 0, world.player.z));
  const zoom = useRef(0);
  useFrame(({ camera }, dt) => {
    const p = world.player;
    // look-ahead: la cámara se adelanta en la dirección de la marcha
    const car = p.carId ? world.cars.find((c) => c.id === p.carId) : null;
    const aheadX = car ? car.vx * 0.45 : 0;
    const aheadZ = car ? car.vz * 0.45 : 0;
    target.current.lerp(new THREE.Vector3(p.x + aheadX, 0, p.z + aheadZ), Math.min(1, CAMERA_LERP * dt));

    // la cámara se aleja con la velocidad (estilo GTA 2)
    const speedRatio = car ? Math.min(1, Math.hypot(car.vx, car.vz) / 28) : 0;
    zoom.current += (speedRatio * CAMERA_SPEED_ZOOM - zoom.current) * Math.min(1, 1.5 * dt);

    camera.position.set(
      target.current.x + CAMERA_OFFSET.x,
      CAMERA_OFFSET.y + zoom.current,
      target.current.z + CAMERA_OFFSET.z + zoom.current * 0.3,
    );
    camera.lookAt(target.current.x, 0, target.current.z);
  });
  return null;
}
