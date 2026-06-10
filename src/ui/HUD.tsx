import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Minimap } from './Minimap';

export function HUD() {
  const hud = useGameStore((s) => s.hud);

  // flash rojo en los bordes al recibir daño
  const [flash, setFlash] = useState(0);
  const prevHealth = useRef(hud.health);
  useEffect(() => {
    if (hud.health < prevHealth.current - 0.5 && !hud.dead) setFlash((f) => f + 1);
    prevHealth.current = hud.health;
  }, [hud.health, hud.dead]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* vignette atmosférico permanente */}
      <div className="ambient-vignette absolute inset-0" />
      {flash > 0 && <div key={flash} className="damage-flash absolute inset-0" />}

      {/* salud + estrellas + dinero */}
      <div className="absolute left-4 top-4 space-y-2">
        <div className="w-52 rounded bg-black/50 p-2 backdrop-blur-sm">
          <div className="mb-1 flex justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-300">
            <span>Health</span>
            <span>{hud.health}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded bg-zinc-800">
            <div
              className={`h-full transition-all duration-200 ${hud.health > 35 ? 'bg-emerald-400' : 'bg-red-500'}`}
              style={{ width: `${hud.health}%` }}
            />
          </div>
        </div>
        <div className="flex gap-1 rounded bg-black/50 px-2 py-1 text-lg">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={
                i < hud.wanted
                  ? 'animate-pulse text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]'
                  : 'text-zinc-700'
              }
            >
              ★
            </span>
          ))}
        </div>
        <div className="w-fit rounded bg-black/50 px-3 py-1 font-mono text-lg font-bold text-emerald-300">
          ${hud.money.toLocaleString()}
        </div>
        {hud.wanted > 0 && (
          <div className="w-52 rounded bg-black/50 px-2 py-1 text-[10px] leading-4 text-zinc-400">
            Find a <span className="font-bold text-emerald-300">spray shop</span> (green pad with chevrons) to
            clear your stars ($50)
          </div>
        )}
      </div>

      {/* minimapa + estado de bandas */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
        <Minimap />
        <div className="flex gap-2">
          {hud.gangs.map((g) => (
            <div
              key={g.id}
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
                g.hostile ? 'bg-red-950/70 text-red-300' : 'bg-black/50 text-zinc-300'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
              {g.name}
              {g.hostile && <span>· hostile</span>}
            </div>
          ))}
        </div>
      </div>

      {/* velocímetro + nombre del vehículo (centrados, banner encima) */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5">
        <VehicleEnterBanner />
        {hud.inCar && (
          <div className="rounded bg-black/60 px-5 py-2 text-center backdrop-blur-sm">
            <div className="text-3xl font-black tabular-nums text-yellow-300">{hud.speedKmh}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-400">km/h</div>
          </div>
        )}
      </div>

      {/* arma actual (también en coche: drive-by) */}
      <div className="absolute bottom-6 right-4 rounded bg-black/60 px-4 py-2 text-right backdrop-blur-sm">
        <div className="text-lg font-black uppercase tracking-widest text-yellow-300">{hud.weapon}</div>
        <div className="text-xs tabular-nums text-zinc-300">
          {hud.ammo === null ? '∞' : `${hud.ammo} rounds`}
          <span className="ml-2 text-zinc-500">Q to switch</span>
        </div>
      </div>

      {/* controles */}
      <div className="absolute bottom-4 left-4 rounded bg-black/40 px-3 py-2 text-[11px] leading-5 text-zinc-400 backdrop-blur-sm">
        <span className="text-zinc-200">WASD / arrows</span> move · <span className="text-zinc-200">E / Enter</span>{' '}
        jack / exit car · <span className="text-zinc-200">Space</span> handbrake ·{' '}
        <span className="text-zinc-200">F</span> shoot (drive-by too) ·{' '}
        <span className="text-zinc-200">Q</span> switch weapon · <span className="text-zinc-200">Esc</span> pause
      </div>

      {/* muerte */}
      {hud.dead && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/40">
          <div className="text-6xl font-black uppercase tracking-[0.3em] text-red-400 drop-shadow-[0_0_25px_rgba(255,0,0,0.6)]">
            Wasted
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleEnterBanner() {
  const banner = useGameStore((s) => s.vehicleBanner);
  if (!banner) return null;
  return (
    <div
      key={banner.token}
      className="vehicle-enter-banner rounded-md border-2 border-pink-500/90 bg-black/80 px-10 py-2 text-center backdrop-blur-md shadow-[0_0_18px_rgba(34,211,238,0.35),0_0_6px_rgba(236,72,153,0.5)]"
    >
      <div className="text-xl font-black uppercase italic tracking-[0.2em] text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.85)]">
        {banner.name}
      </div>
    </div>
  );
}
