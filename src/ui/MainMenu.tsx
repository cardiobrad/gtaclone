import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { sound } from '../engine/sound';

export function MainMenu() {
  const startGame = useGameStore((s) => s.startGame);
  const setConfigOpen = useGameStore((s) => s.setConfigOpen);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b from-[#0c0c14] via-[#141426] to-[#1c0f24]">
      <div className="mb-2 text-sm font-bold uppercase tracking-[0.5em] text-purple-400">Top-down 3D sandbox</div>
      <h1 className="mb-1 text-center text-7xl font-black uppercase italic tracking-tight text-yellow-300 drop-shadow-[0_4px_0_rgba(168,85,247,0.7)]">
        Anywhere City
      </h1>
      <div className="mb-12 text-zinc-400">Drive. Drift. Blow stuff up. Customize everything.</div>

      <div className="flex w-64 flex-col gap-3">
        <button
          className="rounded-lg bg-yellow-400 py-3 text-lg font-black uppercase tracking-widest text-black transition hover:scale-105 hover:bg-yellow-300"
          onClick={() => {
            sound.init();
            startGame();
          }}
        >
          Play
        </button>
        <button
          className="rounded-lg border border-purple-500/50 bg-purple-950/40 py-3 font-bold uppercase tracking-widest text-purple-200 transition hover:bg-purple-900/50"
          onClick={() => setConfigOpen(true)}
        >
          Settings
        </button>
        <button
          className="rounded-lg border border-zinc-700 bg-zinc-900/60 py-3 font-bold uppercase tracking-widest text-zinc-300 transition hover:bg-zinc-800"
          onClick={() => setShowHelp((v) => !v)}
        >
          How to play
        </button>
      </div>

      {showHelp && (
        <div className="mt-8 w-[480px] rounded-lg border border-zinc-700 bg-black/60 p-5 text-sm leading-7 text-zinc-300">
          <div className="mb-2 font-bold uppercase tracking-widest text-yellow-300">Controls</div>
          <ul className="list-inside list-disc">
            <li><b>WASD / arrows</b> — move (on foot and driving)</li>
            <li><b>E / Enter</b> — enter or exit the nearest car</li>
            <li><b>Space</b> — handbrake (drifting)</li>
            <li><b>F / Ctrl</b> — shoot (on foot and drive-by)</li>
            <li><b>Q / 1-3</b> — switch weapon</li>
            <li><b>Esc</b> — pause</li>
          </ul>
          <div className="mt-3 text-zinc-400">
            In <b>Settings</b> you can replace any 3D asset with your own GLB, fine-tune its placement
            with gizmos, upload PNGs for the map textures and import Tiled maps.
          </div>
        </div>
      )}

      <div className="absolute bottom-4 text-xs text-zinc-600">v0.1 — fully data-driven, presets in localStorage</div>
    </div>
  );
}
