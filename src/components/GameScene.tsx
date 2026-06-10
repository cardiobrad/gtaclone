import { useEffect, useMemo } from 'react';
import { useGameStore, getActiveMap } from '../stores/gameStore';
import { createWorld } from '../engine/world';
import { runtime } from '../engine/runtime';
import { Lighting } from './Lighting';
import { Tiles } from './Tiles';
import { Buildings } from './Buildings';
import { PlayerView, CarsView, PropsView, BulletsView, PedsView, PickupsView, FollowCamera } from './Entities';
import { Particles } from './Particles';
import { Atmosphere } from './Atmosphere';
import { GameSimulation } from './GameSimulation';
import { TILE_SIZE } from '../constants';

/** Escena completa del juego. Se reconstruye cuando cambia worldVersion o el mapa. */
export function GameScene() {
  const worldVersion = useGameStore((s) => s.worldVersion);
  const customMap = useGameStore((s) => s.customMap);

  const { map, placements } = useMemo(() => getActiveMap({ customMap }), [customMap]);
  const world = useMemo(
    () => createWorld(map, placements),
    // worldVersion fuerza reinicio explícito (Reiniciar partida / salir al menú)
    [map, placements, worldVersion],
  );

  useEffect(() => {
    runtime.world = world;
    return () => {
      if (runtime.world === world) runtime.world = null;
    };
  }, [world]);

  const halfW = (map.width * TILE_SIZE) / 2;
  const halfH = (map.height * TILE_SIZE) / 2;

  return (
    <>
      <color attach="background" args={['#10131c']} />
      <fog attach="fog" args={['#10131c', 90, 190]} />
      <Lighting shadowSize={Math.max(halfW, halfH) + 20} />
      <Tiles map={map} />
      <Buildings map={map} />
      <PlayerView world={world} />
      <CarsView world={world} />
      <PedsView world={world} />
      <PickupsView world={world} />
      <PropsView world={world} />
      <BulletsView world={world} />
      <Particles />
      <Atmosphere world={world} />
      <FollowCamera world={world} />
      <GameSimulation world={world} />
    </>
  );
}
