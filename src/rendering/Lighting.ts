import * as THREE from 'three';
import { createGlowTexture, createGradientTexture } from './ProceduralTextures';

export type LightingRig = {
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  counter: THREE.DirectionalLight;
  lamp: THREE.PointLight;
  accent: THREE.PointLight;
  hemisphere: THREE.HemisphereLight;
};

export const SHADOW_EXTENT = 8.4;

const ENVIRONMENT_GRADIENT: Array<[number, string]> = [
  [0, '#06070c'],
  [0.4, '#12141c'],
  [0.68, '#2a2c34'],
  [1, '#4a4640']
];

export function createEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  scene.environment = buildEnvironmentMap(renderer);
  scene.background = createGradientTexture([
    [0, '#04060c'],
    [0.5, '#090e1b'],
    [0.76, '#121a2e'],
    [1, '#1d2740']
  ]);
  scene.backgroundIntensity = 0.9;
  scene.environmentIntensity = 0.3;
  scene.fog = new THREE.FogExp2(0x05060c, 0.02);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
}

export function createLighting(scene: THREE.Scene): LightingRig {
  const hemisphere = new THREE.HemisphereLight(0xc9bda8, 0x231708, 0.34);

  const key = new THREE.DirectionalLight(0xfff0d6, 2.1);
  key.position.set(6.4, 11.8, 7.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 36;
  key.shadow.camera.left = -SHADOW_EXTENT;
  key.shadow.camera.right = SHADOW_EXTENT;
  key.shadow.camera.top = SHADOW_EXTENT;
  key.shadow.camera.bottom = -SHADOW_EXTENT;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.024;
  key.shadow.radius = 2.6;

  const fill = new THREE.DirectionalLight(0xa9b8dd, 0.42);
  fill.position.set(-8.4, 7.2, -6.8);

  const rim = new THREE.DirectionalLight(0x86c4ff, 0.45);
  rim.position.set(-5.2, 3, -9.4);

  const counter = new THREE.DirectionalLight(0xffd9ad, 0.7);
  counter.position.set(-7.4, 6.2, 8.6);

  const lamp = new THREE.PointLight(0xffb877, 3.4, 18, 2);
  lamp.position.set(3.2, 6.4, 3.6);

  const accent = new THREE.PointLight(0x4a86ff, 2.4, 18, 2);
  accent.position.set(-4.2, 4.6, -3.8);

  scene.add(hemisphere, key, fill, rim, counter, lamp, accent);

  return { key, fill, rim, counter, lamp, accent, hemisphere };
}

export function createGround(scene: THREE.Scene, radius = 34) {
  const floorY = -1.05;

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 96),
    new THREE.MeshStandardMaterial({ color: 0x070910, roughness: 0.82, metalness: 0.08 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = floorY;
  ground.receiveShadow = true;

  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 1.1, radius * 1.1),
    new THREE.MeshBasicMaterial({
      color: 0x1d355e,
      map: createGlowTexture(256, 3.2),
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,

      fog: true
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = floorY + 0.01;

  scene.add(ground, pool);
  return { ground, pool };
}

function buildEnvironmentMap(renderer: THREE.WebGLRenderer) {
  const studio = new THREE.Scene();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(24, 32, 24),
    new THREE.MeshBasicMaterial({ map: createGradientTexture(ENVIRONMENT_GRADIENT, 256), side: THREE.BackSide })
  );
  studio.add(dome);

  const softbox = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  softbox.position.set(4, 9, 3);
  softbox.lookAt(0, 0, 0);

  const bounce = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 6),
    new THREE.MeshBasicMaterial({ color: 0x6f7d99 })
  );
  bounce.position.set(-8, 4, -7);
  bounce.lookAt(0, 0, 0);

  studio.add(softbox, bounce);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(studio, 0.045);
  pmrem.dispose();

  dome.geometry.dispose();
  (dome.material as THREE.Material).dispose();
  softbox.geometry.dispose();
  (softbox.material as THREE.Material).dispose();
  bounce.geometry.dispose();
  (bounce.material as THREE.Material).dispose();

  return target.texture;
}
