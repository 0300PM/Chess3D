import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import anime from 'animejs';
import { Button } from '../components/Button';

export type GameMode = 'classic' | 'blitz';

export type MenuSelection = {
  mode: GameMode;
};

export class MainMenu {
  readonly root = new Container();
  private backdrop = new Graphics();
  private panel = new Graphics();
  private title: Text;
  private subtitle: Text;

  private modeClassic = new Button('Mode: Classic');
  private modeBlitz = new Button('Mode: Blitz (3+2)');
  private startBtn = new Button('Start');

  selection: MenuSelection = { mode: 'classic' };
  onStart?: (sel: MenuSelection) => void;

  constructor() {
    this.root.eventMode = 'static';

    const titleStyle = new TextStyle({
      fill: 0xffffff,
      fontFamily: 'ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial',
      fontSize: 46,
      fontWeight: '900',
      letterSpacing: 1.0
    });
    this.title = new Text({ text: 'Chess 3D', style: titleStyle });
    this.title.anchor.set(0.5);

    this.subtitle = new Text({
      text: 'Zawsze vs komputer (grasz białymi)',
      style: new TextStyle({
        fill: 0xbfd6ff,
        fontFamily: 'ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5
      })
    });
    this.subtitle.anchor.set(0.5);

    this.modeClassic.on('pointertap', () => this.setMode('classic'));
    this.modeBlitz.on('pointertap', () => this.setMode('blitz'));
    this.startBtn.on('pointertap', () => this.onStart?.(this.selection));

    this.root.addChild(
      this.backdrop,
      this.panel,
      this.title,
      this.subtitle,
      this.modeClassic,
      this.modeBlitz,
      this.startBtn
    );

    this.applySelectionStyles();
  }

  resize(w: number, h: number) {
    this.backdrop.clear();
    this.backdrop.rect(0, 0, w, h);
    this.backdrop.fill({ color: 0x05060b, alpha: 0.58 });

    const pw = Math.min(520, w - 44);
    const ph = 340;
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;

    this.panel.clear();
    this.panel.roundRect(px, py, pw, ph, 22);
    this.panel.fill({ color: 0x0b0f1a, alpha: 0.75 });
    this.panel.stroke({ color: 0x6ee7ff, alpha: 0x12 / 255, width: 1 });

    this.title.position.set(w / 2, py + 84);
    this.subtitle.position.set(w / 2, py + 118);

    const btnW = Math.min(360, pw - 60);
    const left = w / 2 - btnW / 2;
    const y0 = py + 160;
    const gap = 12;

    for (const b of [this.modeClassic, this.modeBlitz, this.startBtn]) b.setSize(btnW, 46);
    this.modeClassic.position.set(left, y0);
    this.modeBlitz.position.set(left, y0 + (46 + gap) * 1);
    this.startBtn.position.set(left, y0 + (46 + gap) * 2 + 18);
  }

  show() {
    this.root.visible = true;
    this.root.alpha = 0;
    anime({ targets: this.root, alpha: 1, duration: 320, easing: 'easeOutQuad' });
  }

  hide() {
    return new Promise<void>((resolve) => {
      anime({
        targets: this.root,
        alpha: 0,
        duration: 260,
        easing: 'easeInQuad',
        complete: () => {
          this.root.visible = false;
          resolve();
        }
      });
    });
  }

  private setMode(mode: GameMode) {
    this.selection = { ...this.selection, mode };
    this.applySelectionStyles();
  }

  private applySelectionStyles() {
    this.modeClassic.setText(this.selection.mode === 'classic' ? 'Tryb: Classic ✓' : 'Tryb: Classic');
    this.modeBlitz.setText(this.selection.mode === 'blitz' ? 'Tryb: Blitz 3+2 ✓' : 'Tryb: Blitz 3+2');
  }
}

