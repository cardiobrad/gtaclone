import { useGameStore } from '../stores/gameStore';

export function PauseMenu() {
  const setPaused = useGameStore((s) => s.setPaused);
  const setConfigOpen = useGameStore((s) => s.setConfigOpen);
  const restartWorld = useGameStore((s) => s.restartWorld);
  const exitToMenu = useGameStore((s) => s.exitToMenu);

  const Btn = ({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) => (
    <button
      className={
        primary
          ? 'rounded-lg bg-yellow-400 py-3 font-black uppercase tracking-widest text-black transition hover:bg-yellow-300'
          : 'rounded-lg border border-zinc-700 bg-zinc-900/80 py-3 font-bold uppercase tracking-widest text-zinc-300 transition hover:bg-zinc-800'
      }
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex w-72 flex-col gap-3">
        <div className="mb-4 text-center text-4xl font-black uppercase italic tracking-widest text-yellow-300">
          Paused
        </div>
        <Btn label="Resume" onClick={() => setPaused(false)} primary />
        <Btn label="Settings" onClick={() => setConfigOpen(true)} />
        <Btn label="Restart game" onClick={restartWorld} />
        <Btn label="Exit to menu" onClick={exitToMenu} />
      </div>
    </div>
  );
}
