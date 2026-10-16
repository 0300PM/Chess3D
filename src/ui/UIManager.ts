import { Application, Container } from 'pixi.js';
import { HUD } from './HUD';

export class UIManager {
  readonly app: Application;
  readonly hud: HUD;
  readonly screens = new Container();
  readonly overlay = new Container();

  private ready = false;

  constructor(private readonly root: HTMLElement) {
    this.app = new Application();
    this.hud = new HUD();
  }

  async init() {
    if (this.ready) return;
    await this.app.init({
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true
    });

    this.app.canvas.style.position = 'absolute';
    this.app.canvas.style.inset = '0';
    this.app.canvas.style.pointerEvents = 'none';

    this.root.appendChild(this.app.canvas);

    this.overlay.addChild(this.hud.root);

    this.app.stage.addChild(this.screens);
    this.app.stage.addChild(this.overlay);
    this.ready = true;
  }

  resize(width: number, height: number, dpr: number) {
    if (!this.ready) return;
    this.app.renderer.resolution = Math.min(2, Math.max(1, dpr));
    this.app.renderer.resize(width, height);
    this.hud.resize(width, height);
  }

  setScreenInteraction(enabled: boolean) {
    if (!this.ready) return;
    this.app.canvas.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}

