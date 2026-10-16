import * as THREE from 'three';

export function createGlowTexture(size = 128, falloff = 2.6, peak = 1): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const distance = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const intensity = Math.pow(1 - distance, falloff) * peak;
      const index = (y * size + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(intensity * 255);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createGradientTexture(stops: Array<[number, string]>, resolution = 256): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = resolution;
  const context = canvas.getContext('2d');

  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, resolution);
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, resolution);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createSquareGlowTexture(size = 160, feather = 0.16, corner = 4, innerFade = 0): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs((x - center) / center);
      const dy = Math.abs((y - center) / center);
      const distance = Math.pow(Math.pow(dx, corner) + Math.pow(dy, corner), 1 / corner);
      const edge = THREE.MathUtils.clamp((1 - distance) / feather, 0, 1);
      const band = innerFade > 0 ? THREE.MathUtils.smoothstep(distance, innerFade * 0.55, innerFade) : 1;
      const alpha = edge * band;
      const index = (y * size + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(alpha * alpha * (3 - 2 * alpha) * 255);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
