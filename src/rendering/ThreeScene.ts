import * as THREE from 'three';
import { loadAssets, type AssetBundle, type LoadProgressHandler } from '../assets/AssetLoader';
import { createEnvironment, createGround, createLighting, type LightingRig } from './Lighting';
import { createMaterials, type MaterialPack } from './Materials';
import { createPostProcessing, type PostFX } from './PostProcessing';

export class ThreeScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 160);
  readonly renderer: THREE.WebGLRenderer;

  private readonly size = new THREE.Vector2(1, 1);
  private readonly post: PostFX;
  private bundle: AssetBundle | null = null;
  private materials: MaterialPack | null = null;
  private lighting: LightingRig | null = null;

  constructor(private readonly root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.display = 'block';
    this.root.appendChild(canvas);

    this.scene.fog = new THREE.FogExp2(0x05060c, 0.021);
    this.post = createPostProcessing(this.renderer, this.scene, this.camera, this.size);
  }

  async loadAssets(onProgress?: LoadProgressHandler) {
    if (this.bundle) return this.bundle;

    const bundle = await loadAssets(this.renderer, onProgress);
    createEnvironment(this.renderer, this.scene);
    this.lighting = createLighting(this.scene);
    createGround(this.scene);
    this.materials = createMaterials(bundle.textures);
    this.bundle = bundle;
    return bundle;
  }

  get assets() {
    if (!this.bundle || !this.materials) throw new Error('Assets are not loaded yet');
    return { bundle: this.bundle, materials: this.materials, lighting: this.lighting };
  }

  resize(width: number, height: number, dpr: number) {
    const pixelRatio = Math.min(1.5, Math.max(1, dpr));
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);

    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();

    this.size.set(Math.max(1, width * pixelRatio), Math.max(1, height * pixelRatio));
    this.post.composer.setSize(this.size.x, this.size.y);
  }

  render() {
    this.post.composer.render();
  }
}
