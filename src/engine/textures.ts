import * as THREE from 'three';

/**
 * Texturas procedurales por defecto (canvas). Cada clave es reemplazable
 * por un PNG del usuario desde el menú de Configuración.
 */

export const TEXTURE_SLOTS: { id: string; name: string; hint: string }[] = [
  { id: 'road', name: 'Road (straight)', hint: 'Dashed center line should run vertically' },
  { id: 'road_x', name: 'Road (intersection)', hint: 'Plain asphalt, no directional markings' },
  { id: 'crosswalk', name: 'Crosswalk (zebra)', hint: 'White stripes perpendicular to the crossing direction' },
  { id: 'sidewalk', name: 'Sidewalk', hint: 'Concrete slabs, tileable' },
  { id: 'grass', name: 'Grass', hint: 'Tileable texture' },
  { id: 'plaza', name: 'Plaza', hint: 'Decorative pavement, tileable' },
  { id: 'facade', name: 'Building facade', hint: 'One floor with windows; repeats vertically' },
  { id: 'shop_facade', name: 'Shop facade', hint: 'Storefront + awning, single floor' },
  { id: 'roof', name: 'Roof', hint: 'Top-down view of the roof' },
  { id: 'garage', name: 'Spray shop pad', hint: 'Floor pad of the spray shop (clears your wanted level)' },
];

function makeCanvas(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, s: number, alpha: number, n = 400) {
  for (let i = 0; i < n; i++) {
    const v = Math.floor(Math.random() * 60);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
}

const makers: Record<string, () => THREE.CanvasTexture> = {
  road: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#34343c';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.25);
      // línea central discontinua (vertical)
      ctx.fillStyle = '#d9c64a';
      for (let y = 8; y < s; y += 32) ctx.fillRect(s / 2 - 2, y, 4, 16);
    }),
  road_x: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#34343c';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.25);
    }),
  crosswalk: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#34343c';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.15);
      // franjas blancas horizontales (se rotan en el tile según orientación)
      ctx.fillStyle = '#f0f0f0';
      for (let y = 6; y < s; y += 14) ctx.fillRect(8, y, s - 16, 7);
    }),
  sidewalk: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#9b9ba2';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.12);
      ctx.strokeStyle = '#7e7e86';
      ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, s - 2, s - 2);
      ctx.beginPath();
      ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s);
      ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2);
      ctx.stroke();
    }),
  grass: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#4a7c3f';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#558a48' : '#3f6e36';
        ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
      }
    }),
  plaza: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#8a8278';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.1);
      ctx.strokeStyle = '#6f685f';
      ctx.lineWidth = 2;
      for (let i = 0; i <= s; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, s);
        ctx.moveTo(0, i); ctx.lineTo(s, i);
        ctx.stroke();
      }
    }),
  facade: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#6d6258';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.12);
      // 4 ventanas por planta
      for (let i = 0; i < 4; i++) {
        const x = 10 + i * 30;
        ctx.fillStyle = Math.random() > 0.35 ? '#ffd97a' : '#2a2f3a';
        ctx.fillRect(x, 34, 18, 44);
        ctx.strokeStyle = '#3c352f';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, 34, 18, 44);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, s - 10, s, 10);
    }),
  shop_facade: () =>
    makeCanvas(128, (ctx, s) => {
      // pared
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.1);
      // toldo a rayas
      const awning = ['#b03a3a', '#3a6ab0', '#3aa05a', '#b08a3a'][Math.floor(Math.random() * 4)];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? awning : '#e8e0d0';
        ctx.fillRect(i * 16, 18, 16, 14);
      }
      // rótulo
      ctx.fillStyle = '#22242b';
      ctx.fillRect(8, 2, s - 16, 13);
      ctx.fillStyle = '#ffd97a';
      for (let i = 0; i < 5; i++) ctx.fillRect(14 + i * 22, 5, 14, 7);
      // escaparate
      ctx.fillStyle = '#9fd2e8';
      ctx.fillRect(8, 38, s - 48, s - 50);
      ctx.strokeStyle = '#3c352f';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 38, s - 48, s - 50);
      // puerta
      ctx.fillStyle = '#4a3a2c';
      ctx.fillRect(s - 32, 38, 24, s - 40);
      ctx.strokeRect(s - 32, 38, 24, s - 40);
    }),
  garage: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#23312b';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.15);
      // borde amarillo de seguridad
      ctx.strokeStyle = '#e0c33a';
      ctx.lineWidth = 6;
      ctx.strokeRect(5, 5, s - 10, s - 10);
      // chevrons
      ctx.strokeStyle = 'rgba(224,195,58,0.55)';
      ctx.lineWidth = 5;
      for (let i = -1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(16, 24 + i * 28);
        ctx.lineTo(s / 2, 44 + i * 28);
        ctx.lineTo(s - 16, 24 + i * 28);
        ctx.stroke();
      }
    }),
  roof: () =>
    makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#4f4a45';
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 0.2);
      ctx.strokeStyle = '#403c38';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, s - 8, s - 8);
      ctx.fillStyle = '#5d5852';
      ctx.fillRect(s * 0.6, s * 0.6, s * 0.22, s * 0.22);
    }),
};

const cache = new Map<string, THREE.CanvasTexture>();

export function defaultTexture(slot: string): THREE.Texture {
  let tex = cache.get(slot);
  if (!tex) {
    tex = (makers[slot] ?? makers.road_x)();
    cache.set(slot, tex);
  }
  return tex;
}
