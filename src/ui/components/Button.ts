import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export class Button extends Container {
  private bg = new Graphics();
  private labelText: Text;

  private w = 240;
  private h = 46;

  constructor(text: string) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.labelText = new Text({
      text,
      style: new TextStyle({
        fill: 0xffffff,
        fontFamily: 'ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 15,
        fontWeight: '600'
      })
    });
    this.labelText.anchor.set(0.5);

    this.addChild(this.bg);
    this.addChild(this.labelText);

    this.on('pointerover', () => this.setHover(true));
    this.on('pointerout', () => this.setHover(false));

    this.layout();
    this.setHover(false);
  }

  setSize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.layout();
  }

  setText(text: string) {
    this.labelText.text = text;
    this.layout();
  }

  private layout() {
    this.bg.clear();
    this.bg.roundRect(0, 0, this.w, this.h, 14);
    this.bg.fill({ color: 0x11162a, alpha: 0.74 });
    this.bg.stroke({ color: 0x6ee7ff, alpha: 0.18, width: 1 });
    this.labelText.position.set(this.w / 2, this.h / 2);
  }

  private setHover(on: boolean) {
    this.bg.tint = on ? 0x1b2343 : 0xffffff;
    this.labelText.alpha = on ? 1 : 0.92;
  }
}

