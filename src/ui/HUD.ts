import { Container, Graphics, Text, TextStyle } from 'pixi.js';

type Color = { fill: string; text: string };

const LIGHT: Color[] = [
  { fill: '#e3b979', text: '#3a2a14' },
  { fill: '#d9ab6a', text: '#3a2a14' }
];

const DARK: Color[] = [
  { fill: '#3f2b1b', text: '#f4e2c4' },
  { fill: '#573a24', text: '#f4e2c4' }
];

const PIECE_GLYPH: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
const FILES = 'abcdefgh';
const RANKS = '87654321';

export class BoardGrid {
  readonly root = new Container();

  private readonly background = new Graphics();
  private readonly highlight = new Graphics();
  private readonly grid = new Graphics();
  private readonly labels: Text[] = [];
  private readonly marks = new Map<string, Text>();
  private size = 0;
  private cell = 0;

  constructor() {
    this.root.addChild(this.background, this.highlight, this.grid);
    for (let index = 0; index < 32; index++) {
      const label = new Text({ text: '', style: labelStyle() });
      label.visible = false;
      this.labels.push(label);
      this.root.addChild(label);
    }
  }

  resize(screenWidth: number, screenHeight: number) {
    this.size = Math.min(212, screenWidth - 40, screenHeight - 140);
    this.cell = this.size / 8;

    const x = screenWidth - this.size - 16;
    const y = screenHeight - this.size - 16;
    this.root.position.set(x, y);
    this.layoutLabels();
    this.drawBase();
  }

  clearHighlights() {
    this.highlight.clear();
    this.marks.forEach((mark) => mark.destroy());
    this.marks.clear();
  }

  highlightSquare(square: string, color: string, alpha: number) {
    const [col, row] = squareToCell(square);
    this.highlight.rect(col * this.cell, row * this.cell, this.cell, this.cell);
    this.highlight.fill({ color, alpha });
  }

  highlightMove(from: string, to: string) {
    this.highlightSquare(from, '#8fb0ff', 0.28);
    const [col, row] = squareToCell(to);
    this.highlight.circle((col + 0.5) * this.cell, (row + 0.5) * this.cell, this.cell * 0.34);
    this.highlight.stroke({ color: '#cfe0ff', alpha: 0.85, width: 2 });
  }

  setPieces(pieces: Array<{ square: string; color: 'w' | 'b'; type: string }>) {
    this.marks.forEach((mark) => mark.destroy());
    this.marks.clear();

    pieces.forEach(({ square, color, type }) => {
      const [col, row] = squareToCell(square);
      const glyph = new Text({
        text: PIECE_GLYPH[type] ?? '',
        style: new TextStyle({
          fill: color === 'w' ? '#fdf6ea' : '#1b2233',
          fontFamily: 'Segoe UI Symbol, Apple Symbols, Noto Sans Symbols2, serif',
          fontSize: this.cell * 0.78,
          fontWeight: '700',
          stroke: { color: color === 'w' ? '#3a2a14' : '#d9cdb6', width: 1.2 }
        })
      });
      glyph.anchor.set(0.5);
      glyph.position.set((col + 0.5) * this.cell, (row + 0.42) * this.cell);
      this.marks.set(square, glyph);
      this.root.addChild(glyph);
    });
  }

  private layoutLabels() {
    const fontSize = Math.max(8, this.cell * 0.26);
    const files = FILES.split('');
    const ranks = RANKS.split('');

    files.forEach((file, index) => {
      const bottom = this.labels[index];
      bottom.text = file;
      bottom.style.fontSize = fontSize;
      bottom.anchor.set(0.5);
      bottom.position.set((index + 0.5) * this.cell, this.size - fontSize * 0.72);
      bottom.visible = true;

      const top = this.labels[index + 8];
      top.text = file;
      top.style.fontSize = fontSize;
      top.anchor.set(0.5);
      top.position.set((index + 0.5) * this.cell, fontSize * 0.72);
      top.visible = true;
    });

    ranks.forEach((rank, index) => {
      const left = this.labels[index + 16];
      left.text = rank;
      left.style.fontSize = fontSize;
      left.anchor.set(0.5);
      left.position.set(fontSize * 0.78, (index + 0.5) * this.cell);
      left.visible = true;

      const right = this.labels[index + 24];
      right.text = rank;
      right.style.fontSize = fontSize;
      right.anchor.set(0.5);
      right.position.set(this.size - fontSize * 0.78, (index + 0.5) * this.cell);
      right.visible = true;
    });
  }

  private drawBase() {
    this.background.clear();
    this.background.roundRect(-6, -6, this.size + 12, this.size + 12, 12);
    this.background.fill({ color: 0x0b0f1a, alpha: 0.62 });
    this.background.stroke({ color: 0x6ee7ff, alpha: 0.12, width: 1 });

    this.grid.clear();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const palette = (col + row) % 2 === 0 ? DARK : LIGHT;
        this.grid.rect(col * this.cell, row * this.cell, this.cell, this.cell);
        this.grid.fill({ color: palette[(col * 3 + row * 5) % 2].fill, alpha: 1 });
      }
    }
  }
}

export class HUD {
  readonly root = new Container();

  readonly board = new BoardGrid();

  private panel = new Graphics();
  private header = new Text({ text: 'Chess 3D', style: labelStyle() });
  private blackLabel = new Text({ text: 'Komputer (czarne)', style: labelStyle() });
  private blackClock = new Text({ text: '∞', style: clockStyle() });
  private turnBadge = new Text({ text: 'White to move', style: badgeStyle() });
  private statusLine = new Text({ text: '', style: statusStyle() });
  private movesTitle = new Text({ text: 'Moves', style: titleStyle() });
  private movesText = new Text({ text: '', style: movesStyle() });
  private whiteLabel = new Text({ text: 'Ty (białe)', style: labelStyle() });
  private whiteClock = new Text({ text: '∞', style: clockStyle() });

  constructor() {
    this.header.style = new TextStyle({
      fill: 0xffffff,
      fontFamily: FONT,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.4,
      dropShadow: { color: 0x000000, alpha: 0.4, blur: 6, distance: 2 }
    });

    this.root.addChild(
      this.panel,
      this.board.root,
      this.header,
      this.blackLabel,
      this.blackClock,
      this.turnBadge,
      this.statusLine,
      this.movesTitle,
      this.movesText,
      this.whiteLabel,
      this.whiteClock
    );
  }

  setTurn(turn: 'w' | 'b') {
    this.turnBadge.text = turn === 'w' ? 'Ruch: białe' : 'Ruch: czarne';
    this.turnBadge.style.fill = turn === 'w' ? 0xf5ead6 : 0xa9c6ff;
  }

  setMovesSAN(moves: string[]) {
    const lines: string[] = [];
    for (let index = 0; index < moves.length; index += 2) {
      const number = Math.floor(index / 2) + 1;
      lines.push(`${number}. ${moves[index] ?? ''} ${moves[index + 1] ?? ''}`.trimEnd());
    }
    this.movesText.text = lines.slice(-6).join('\n');
  }

  setClocks(msWhite: number, msBlack: number) {
    this.whiteClock.text = Number.isFinite(msWhite) ? formatClock(msWhite) : '∞';
    this.blackClock.text = Number.isFinite(msBlack) ? formatClock(msBlack) : '∞';
  }

  setClockLabels(white: string, black: string) {
    this.whiteLabel.text = white;
    this.blackLabel.text = black;
  }

  setActiveClock(active: 'w' | 'b' | null) {
    const activeColor = 0xffffff;
    const idleColor = 0x8892a8;
    this.whiteClock.style.fill = active === 'w' ? activeColor : idleColor;
    this.blackClock.style.fill = active === 'b' ? activeColor : idleColor;
    this.whiteLabel.style.fill = active === 'w' ? 0xe8eeff : idleColor;
    this.blackLabel.style.fill = active === 'b' ? 0xe8eeff : idleColor;
  }

  setStatus(text: string) {
    this.statusLine.text = text;
  }

  setModeLabel(mode: string) {
    this.header.text = `Chess 3D · ${mode}`;
  }

  resize(width: number, height: number) {
    void height;
    const panelWidth = 232;
    const pad = 12;
    const x = width - panelWidth - 14;
    const y = 12;
    const panelHeight = 268;

    this.panel.clear();
    this.panel.roundRect(x, y, panelWidth, panelHeight, 14);
    this.panel.fill({ color: 0x0b0f1a, alpha: 0.44 });
    this.panel.stroke({ color: 0x6ee7ff, alpha: 0.1, width: 1 });

    const wrap = panelWidth - pad * 2;
    let cursor = y + pad;
    const place = (text: Text, gap: number) => {
      text.position.set(x + pad, cursor);
      cursor += gap;
    };

    this.statusLine.style.wordWrapWidth = wrap;
    this.movesText.style.wordWrapWidth = wrap;

    place(this.header, 24);
    place(this.blackLabel, 14);
    place(this.blackClock, 28);
    place(this.turnBadge, 20);
    place(this.statusLine, 22);
    place(this.movesTitle, 16);
    place(this.movesText, 108);
    place(this.whiteLabel, 14);
    place(this.whiteClock, 0);

    this.board.resize(width, height);
  }
}

const FONT = 'ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial';

function squareToCell(square: string) {
  const col = FILES.indexOf(square[0]);
  const row = RANKS.indexOf(square[1]);
  return [col < 0 ? 0 : col, row < 0 ? 0 : row] as const;
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

function clockStyle() {
  return new TextStyle({
    fill: 0xffffff,
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '800',
    dropShadow: { color: 0x000000, alpha: 0.35, blur: 6, distance: 2 }
  });
}

function badgeStyle() {
  return new TextStyle({
    fill: 0xf5ead6,
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    dropShadow: { color: 0x000000, alpha: 0.35, blur: 6, distance: 2 }
  });
}

function titleStyle() {
  return new TextStyle({
    fill: 0xffffff,
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    dropShadow: { color: 0x000000, alpha: 0.25, blur: 6, distance: 1 }
  });
}

function labelStyle() {
  return new TextStyle({
    fill: 0x8892a8,
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3
  });
}

function movesStyle() {
  return new TextStyle({
    fill: 0xd6ddff,
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: '500',
    wordWrap: true,
    wordWrapWidth: 208,
    lineHeight: 16
  });
}

function statusStyle() {
  return new TextStyle({
    fill: 0xffd56a,
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: '700',
    wordWrap: true,
    lineHeight: 15
  });
}
