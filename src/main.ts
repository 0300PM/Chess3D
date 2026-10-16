import { Game } from './core/Game';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root element');

const game = new Game(root);
void game.start();

declare global {
  interface Window {
    __game?: Game;
  }
}

window.__game = game;

