import { useEffect, useMemo, useRef } from 'react';
import { useGameStore, getActiveMap } from '../stores/gameStore';
import { runtime } from '../engine/runtime';
import { GANGS } from '../engine/world';
import { TILE_SIZE } from '../constants';

const gangColors: Record<string, string> = Object.fromEntries(GANGS.map((g) => [g.id, g.color]));

const SIZE = 168;
/** Tiles visibles en el minimapa (ventana deslizante centrada en el jugador). */
const VIEW_TILES = 44;

/** Minimapa 2D: ventana del mapa que sigue al jugador + puntos dinámicos a 60 fps. */
export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const customMap = useGameStore((s) => s.customMap);
  const { map } = useMemo(() => getActiveMap({ customMap }), [customMap]);

  // fondo estático (1 px por tile)
  const background = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = map.width;
    c.height = map.height;
    const ctx = c.getContext('2d')!;
    for (let z = 0; z < map.height; z++) {
      for (let x = 0; x < map.width; x++) {
        ctx.fillStyle = map.types[map.grid[z * map.width + x]].color;
        ctx.fillRect(x, z, 1, 1);
      }
    }
    return c;
  }, [map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const world = runtime.world;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, SIZE, SIZE);
      if (!world) {
        ctx.drawImage(background, 0, 0, SIZE, SIZE);
        return;
      }

      const W = world.map.width, H = world.map.height;
      const view = Math.min(VIEW_TILES, W, H);
      // posición del jugador en coordenadas de tile (float)
      const ptx = world.player.x / TILE_SIZE + W / 2;
      const ptz = world.player.z / TILE_SIZE + H / 2;
      const sx = Math.max(0, Math.min(W - view, ptx - view / 2));
      const sy = Math.max(0, Math.min(H - view, ptz - view / 2));

      ctx.drawImage(background, sx, sy, view, view, 0, 0, SIZE, SIZE);

      const px = (wx: number) => ((wx / TILE_SIZE + W / 2 - sx) / view) * SIZE;
      const pz = (wz: number) => ((wz / TILE_SIZE + H / 2 - sy) / view) * SIZE;
      const visible = (x: number, y: number) => x >= -4 && y >= -4 && x <= SIZE + 4 && y <= SIZE + 4;

      // pickups activos
      for (const pk of world.pickups) {
        if (!pk.active) continue;
        const x = px(pk.x), y = pz(pk.z);
        if (!visible(x, y)) continue;
        ctx.fillStyle = pk.type === 'health' ? '#3ee86f' : '#3ec5e8';
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      // bidones
      for (const prop of world.props) {
        if (!prop.alive || !prop.explosive) continue;
        const x = px(prop.x), y = pz(prop.z);
        if (!visible(x, y)) continue;
        ctx.fillStyle = '#ef6a3a';
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      // coches
      for (const car of world.cars) {
        if (!car.active) continue;
        const x = px(car.x), y = pz(car.z);
        if (!visible(x, y)) continue;
        ctx.fillStyle = car.dead
          ? '#555'
          : car.id === world.player.carId
            ? '#ffffff'
            : car.kind === 'police'
              ? '#4c9ce8'
              : car.kind === 'ambulance'
                ? '#ff6b6b'
                : car.ai
                  ? '#e7e7e7'
                  : '#e7c544';
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
      // peatones (polis azules, bandas con su color)
      for (const ped of world.peds) {
        if (!ped.active || ped.state === 'dead') continue;
        const x = px(ped.x), y = pz(ped.z);
        if (!visible(x, y)) continue;
        if (ped.kind === 'cop') ctx.fillStyle = '#4c9ce8';
        else if (ped.kind === 'medic') ctx.fillStyle = '#ff6b6b';
        else if (ped.kind === 'gang') ctx.fillStyle = gangColors[ped.gangId ?? ''] ?? '#c9b8ff';
        else ctx.fillStyle = '#c9b8ff';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      // jugador (con dirección)
      if (world.player.carId === null) {
        const x = px(world.player.x), y = pz(world.player.z);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sin(world.player.heading) * 8, y + Math.cos(world.player.heading) * 8);
        ctx.stroke();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [background]);

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="rounded border-2 border-black/60 opacity-90 shadow-lg"
    />
  );
}
