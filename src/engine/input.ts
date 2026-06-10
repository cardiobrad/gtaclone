/** Estado de teclado global (por code físico, independiente del layout). */
const down = new Set<string>();
const pressedThisFrame = new Set<string>();

let attached = false;

export function attachInput() {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (e) => {
    if (!down.has(e.code)) pressedThisFrame.add(e.code);
    down.add(e.code);
    // evitar scroll con flechas/espacio
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());
}

export const input = {
  isDown: (...codes: string[]) => codes.some((c) => down.has(c)),
  /** true solo el frame en el que se pulsó. Consumir con endFrame(). */
  justPressed: (...codes: string[]) => codes.some((c) => pressedThisFrame.has(c)),
  endFrame: () => pressedThisFrame.clear(),
};
