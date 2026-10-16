import * as THREE from 'three';
import { ThreeScene } from '../rendering/ThreeScene';

const MAX_FRAME_MS = 1000 / 30;

export class SceneManager {
  readonly three: ThreeScene;

  private renderAccumulator = 0;

  constructor(private readonly root: HTMLElement) {
    this.three = new ThreeScene(root);
  }

  resize(width: number, height: number, dpr: number) {
    this.three.resize(width, height, dpr);
  }

  render(dtMs = MAX_FRAME_MS) {
    this.renderAccumulator += dtMs;
    if (this.renderAccumulator < MAX_FRAME_MS) return;
    this.renderAccumulator = 0;
    this.three.render();
  }

  get domElement() {
    return this.three.renderer.domElement;
  }

  get camera(): THREE.PerspectiveCamera {
    return this.three.camera;
  }

  get scene(): THREE.Scene {
    return this.three.scene;
  }
}

