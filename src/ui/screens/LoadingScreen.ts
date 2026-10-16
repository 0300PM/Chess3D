import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import anime from 'animejs';

export class LoadingScreen {
  readonly root = new Container();
  private backdrop = new Graphics();
  private title: Text;
  private subtitle: Text;
  private barBg = new Graphics();
  private bar = new Graphics();
  private progress = 0;

  constructor() {
    this.root.eventMode = 'static';

    this.title = new Text({
      text: 'Chess 3D',
      style: new TextStyle({
        fill: 0xffffff,
        fontFamily: 'ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 44,
        fontWeight: '800',
        letterSpacing: 1.2
      })
    });
    this.title.anchor.set(0.5);

    this.subtitle = new Text({
      text: 'Wczytywanie modeli i tekstur…',
      style: new TextStyle({
        fill: 0xbfd6ff,
        fontFamily: 'ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 14,
        fontWeight: '500'
      })
    });
    this.subtitle.anchor.set(0.5);

    this.root.addChild(this.backdrop, this.title, this.subtitle, this.barBg, this.bar);
  }

  resize(w: number, h: number) {
    this.backdrop.clear();
    this.backdrop.rect(0, 0, w, h);
    this.backdrop.fill({ color: 0x05060b, alpha: 0.82 });

    this.title.position.set(w / 2, h / 2 - 46);
    this.subtitle.position.set(w / 2, h / 2 + 6);

    this.barBg.clear();
    this.barBg.roundRect(w / 2 - 180, h / 2 + 42, 360, 10, 7);
    this.barBg.fill({ color: 0xffffff, alpha: 0.08 });

    this.drawBar(w, h);
  }

  setProgress(p: number) {
    this.progress = Math.max(0, Math.min(1, p));
  }

  setStatus(text: string) {
    this.subtitle.text = text;
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

  update(w: number, h: number) {
    this.drawBar(w, h);
  }

  private drawBar(w: number, h: number) {
    this.bar.clear();
    const width = 360 * this.progress;
    this.bar.roundRect(w / 2 - 180, h / 2 + 42, width, 10, 7);
    this.bar.fill({ color: 0x6ee7ff, alpha: 0.9 });
  }
}

