import anime, { AnimeInstance, AnimeParams } from 'animejs';

export type EasingName =
  | 'easeInOutQuad'
  | 'easeOutQuad'
  | 'easeInQuad'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeOutExpo'
  | 'easeInOutExpo';

export class AnimationManager {
  private running = new Set<AnimeInstance>();

  animate(params: AnimeParams): AnimeInstance {
    const inst = anime({
      ...params,
      begin: (a: AnimeInstance) => {
        this.running.add(a);
        params.begin?.(a);
      },
      complete: (a: AnimeInstance) => {
        this.running.delete(a);
        params.complete?.(a);
      }
    });
    return inst;
  }

  killAll() {
    for (const inst of this.running) inst.pause();
    this.running.clear();
    anime.remove('*');
  }
}

