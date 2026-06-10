import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { World, StepDeps } from '../engine/world';
import { stepWorld, GANGS } from '../engine/world';
import { runtime } from '../engine/runtime';
import { input } from '../engine/input';
import { sound } from '../engine/sound';
import { useGameStore } from '../stores/gameStore';
import { getVehicleConfig, getWeaponConfig, usePresetStore } from '../stores/presetStore';

/** Bucle de simulación + eventos (sonido, partículas) + actualización del HUD. */
export function GameSimulation({ world }: { world: World }) {
  const hudTimer = useRef(0);
  const hornTimer = useRef(8 + Math.random() * 10);

  const deps = useMemo<StepDeps>(
    () => ({
      getVehicleConfig,
      getWeaponConfig,
      get weaponIds() {
        return Object.keys(usePresetStore.getState().weaponConfigs);
      },
      events: {
        onPunch: () => sound.thud(),
        onExplosion: (x, z) => {
          sound.explosion();
          runtime.particles?.explosion(x, z);
        },
        onShoot: (x, z, heading) => {
          sound.shoot();
          runtime.particles?.muzzle(x, z, heading);
        },
        onCrash: (intensity) => sound.crash(intensity),
        onPlayerDeath: () => sound.explosion(),
        onPedDeath: (x, z) => {
          sound.thud();
          runtime.particles?.blood(x, z);
        },
        onPickup: () => sound.pickup(),
        onBulletHit: (x, z) => {
          sound.ricochet();
          runtime.particles?.spark(x, z);
        },
        onRespray: (x, z) => {
          sound.pickup();
          runtime.particles?.respray(x, z);
        },
        onHeal: (x, z) => {
          sound.pickup();
          runtime.particles?.respray(x, z);
        },
        onVehicleEnter: (configId) => {
          const cfg = getVehicleConfig(configId);
          useGameStore.getState().showVehicleBanner(cfg.name);
        },
      },
    }),
    [world],
  );

  useFrame((_, dt) => {
    const s = useGameStore.getState();
    const halted = s.paused || s.configOpen || s.editorAsset !== null;

    if (!halted) {
      stepWorld(world, dt, deps);
    } else {
      input.endFrame(); // no acumular pulsaciones mientras está en pausa/menús
    }

    // sonido de motor
    const p = world.player;
    const car = p.carId ? world.cars.find((c) => c.id === p.carId) : null;
    if (car && !halted) {
      const cfg = getVehicleConfig(car.configId);
      sound.engine(Math.min(1, Math.hypot(car.vx, car.vz) / cfg.maxSpeed));
      sound.skid(Math.abs(car.drift) > 3 ? Math.min(1, (Math.abs(car.drift) - 3) / 5) : null);
    } else {
      sound.engine(null);
      sound.skid(null);
    }

    // ambiente: rumor de ciudad + claxon lejano ocasional
    sound.hum(!halted);
    if (!halted) {
      hornTimer.current -= dt;
      if (hornTimer.current <= 0) {
        hornTimer.current = 10 + Math.random() * 18;
        sound.distantHorn();
      }
    }

    // sirena si hay patrullas activas cerca o la ambulancia va de camino
    const sirenOn =
      !halted &&
      world.cars.some(
        (c) =>
          (c.kind === 'police' || (c.kind === 'ambulance' && (world.medicStage === 'driving' || world.medicStage === 'healing'))) &&
          c.active && !c.dead && c.ai &&
          Math.hypot(c.x - p.x, c.z - p.z) < 70,
      );
    sound.siren(sirenOn);

    // HUD a ~10 Hz
    hudTimer.current -= dt;
    if (hudTimer.current <= 0) {
      hudTimer.current = 0.1;
      const speed = car ? Math.hypot(car.vx, car.vz) : 0;
      const wcfg = getWeaponConfig(p.currentWeapon);
      s.setHud({
        health: Math.round(p.health),
        speedKmh: Math.round(speed * 3.6),
        inCar: !!car,
        dead: p.deadTimer > 0,
        weapon: wcfg.name,
        ammo: wcfg.infinite ? null : Math.max(0, p.weapons[p.currentWeapon] ?? 0),
        wanted: world.wanted,
        money: p.money,
        gangs: GANGS.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          hostile: world.gangRespect[g.id] < 0,
        })),
      });
    }
  });

  return null;
}
