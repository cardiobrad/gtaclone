import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { CAMERA_FOV, CAMERA_OFFSET } from './constants';
import { attachInput } from './engine/input';
import { useGameStore } from './stores/gameStore';
import { useAssetStore } from './stores/assetStore';
import { GameScene } from './components/GameScene';
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { PauseMenu } from './ui/PauseMenu';
import { ConfigMenu } from './ui/ConfigMenu';
import { AssetEditor } from './ui/AssetEditor';

function GameView() {
  const paused = useGameStore((s) => s.paused);

  return (
    <>
      <Canvas
        shadows
        camera={{ fov: CAMERA_FOV, position: [CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z], near: 1, far: 300 }}
        dpr={[1, 2]}
      >
        <GameScene />
      </Canvas>
      <HUD />
      {paused && <PauseMenu />}
    </>
  );
}

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const configOpen = useGameStore((s) => s.configOpen);
  const editorAsset = useGameStore((s) => s.editorAsset);

  // Boot: global input + rehydrate custom assets and imported map
  useEffect(() => {
    attachInput();
    void useAssetStore.getState().hydrate();
    void useGameStore.getState().hydrateCustomMap();
  }, []);

  // Esc: cerrar editor > cerrar config > pausa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      const s = useGameStore.getState();
      if (s.editorAsset) s.openEditor(null);
      else if (s.configOpen) s.setConfigOpen(false);
      else if (s.screen === 'game') s.setPaused(!s.paused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative h-full w-full bg-[#0a0a0f]">
      {screen === 'game' ? <GameView /> : <MainMenu />}
      {configOpen && <ConfigMenu />}
      {editorAsset && <AssetEditor key={editorAsset} assetId={editorAsset} />}
    </div>
  );
}
