/**
 * Iluminación compartida entre el GameScene y el WorldPreview del editor:
 * si un asset se ve bien en el editor, se verá igual en el juego.
 */
export function Lighting({ shadowSize = 70 }: { shadowSize?: number }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#bdd4ee', '#54483c', 0.5]} />
      <directionalLight
        position={[40, 60, 25]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
      />
    </>
  );
}
