export type ClockConfig = { type: 'classic' } | { type: 'blitz'; mainMs: number; incrementMs: number };

export class GameClock {
  whiteMs = 0;
  blackMs = 0;
  readonly config: ClockConfig;

  constructor(config: ClockConfig) {
    this.config = config;
    if (config.type === 'blitz') {
      this.whiteMs = config.mainMs;
      this.blackMs = config.mainMs;
    } else {
      this.whiteMs = Number.POSITIVE_INFINITY;
      this.blackMs = Number.POSITIVE_INFINITY;
    }
  }

  get isBlitz() {
    return this.config.type === 'blitz';
  }

  tick(activeColor: 'w' | 'b', dtMs: number) {
    if (this.config.type !== 'blitz') return;
    if (activeColor === 'w') this.whiteMs -= dtMs;
    else this.blackMs -= dtMs;
  }

  addIncrementFor(color: 'w' | 'b') {
    if (this.config.type !== 'blitz') return;
    if (color === 'w') this.whiteMs += this.config.incrementMs;
    else this.blackMs += this.config.incrementMs;
  }

  onMoveCompleted(previousTurn: 'w' | 'b') {
    this.addIncrementFor(previousTurn);
  }

  flaggedColor(): 'w' | 'b' | null {
    if (this.config.type !== 'blitz') return null;
    if (this.whiteMs <= 0) return 'w';
    if (this.blackMs <= 0) return 'b';
    return null;
  }
}
