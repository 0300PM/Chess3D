import * as THREE from 'three';
import Stats from 'stats.js';
import anime from 'animejs';
import { SceneManager } from './SceneManager';
import { AnimationManager } from './AnimationManager';
import { CameraController } from './CameraController';
import { ALL_SQUARES, Board, type Square } from '../chess/Board';
import { Piece } from '../chess/Piece';
import { MoveSystem } from '../chess/MoveSystem';
import { GameClock } from '../chess/GameClock';
import { pickBestMove } from '../chess/ChessAI';
import { createMenuDecor } from '../chess/MenuDecor';
import { UIManager } from '../ui/UIManager';
import { LoadingScreen } from '../ui/screens/LoadingScreen';
import { MainMenu, type MenuSelection } from '../ui/screens/MainMenu';
import { PIECE_GLOW, SQUARE_GLOW, type MaterialPack } from '../rendering/Materials';
import { SquareGlow } from '../rendering/SquareGlow';
import { CaptureBurst } from '../effects/CaptureBurst';
import type { ColorCode, PieceKind } from '../assets/AssetCatalog';
import type { AssetBundle } from '../assets/AssetLoader';

type CinematicFlags = {
  enabled: boolean;
  slowMoOnCaptures: boolean;
  cameraShakeOnCapture: boolean;
};

type AppState = 'loading' | 'menu' | 'playing';

const LEGAL_MOVE_INTENSITY = 0.72;
const CAPTURE_INTENSITY = 0.8;
const SELECT_INTENSITY = 0.7;
const HOVER_INTENSITY = 0.24;
const LAST_MOVE_INTENSITY = 0.34;
const CHECK_INTENSITY = 0.75;

export class Game {
  private readonly sceneManager: SceneManager;
  private readonly animations = new AnimationManager();
  private readonly cameraController: CameraController;
  private readonly ui: UIManager;
  private readonly moves = new MoveSystem();

  private board: Board | null = null;
  private glow: SquareGlow | null = null;
  private burst: CaptureBurst | null = null;
  private readonly piecesRoot = new THREE.Group();
  private readonly decorRoot = new THREE.Group();
  private readonly rayHits: THREE.Intersection[] = [];

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();

  private selectedSquare: Square | null = null;
  private hoveredSquare: Square | null = null;
  private legalTargets = new Map<Square, { capture: boolean }>();
  private squareToPiece = new Map<Square, Piece>();
  private lastMove: { from: Square; to: Square } | null = null;
  private checkedKingSquare: Square | null = null;

  private readonly stats = new Stats();
  private readonly statsEl: HTMLDivElement;
  private readonly debugEl: HTMLDivElement;
  private readonly menuBtn: HTMLButtonElement;

  private readonly menu = new MainMenu();
  private readonly loading = new LoadingScreen();

  private readonly time = { scale: 1 };
  private readonly cinematic: CinematicFlags = {
    enabled: true,
    slowMoOnCaptures: true,
    cameraShakeOnCapture: true
  };

  private clock: GameClock = new GameClock({ type: 'classic' });
  private selection: MenuSelection = { mode: 'classic' };
  private appState: AppState = 'loading';
  private loadingProgress = 0;
  private inputLocked = false;
  private aiThinking = false;
  private gameOver = false;
  private running = false;
  private lastTs = 0;
  private isOrbiting = false;
  private isPanning = false;
  private readonly orbitLast = { x: 0, y: 0 };
  private readonly panLast = { x: 0, y: 0 };
  private statusTimer = 0;
  private debugState = '';

  constructor(private readonly root: HTMLElement) {
    this.root.style.position ||= 'relative';

    this.sceneManager = new SceneManager(root);
    this.cameraController = new CameraController(this.sceneManager.camera, this.animations);
    this.ui = new UIManager(root);

    this.piecesRoot.name = 'Pieces';
    this.piecesRoot.visible = false;
    this.decorRoot.name = 'Decor';
    this.sceneManager.scene.add(this.piecesRoot, this.decorRoot);

    this.stats.showPanel(0);
    this.statsEl = document.createElement('div');
    this.statsEl.className = 'statsBadge';
    this.statsEl.append('FPS ', this.stats.dom);
    this.root.appendChild(this.statsEl);

    this.debugEl = document.createElement('div');
    this.debugEl.className = 'debugOverlay';
    this.debugEl.style.pointerEvents = 'none';
    this.debugEl.innerHTML = [
      '<div><b>Cinematic</b>: ON (C)</div>',
      '<div><b>Ruch</b>: białe</div>',
      '<div class="hint">LPM: wybór / ruch · PPM lub Shift+LPM: obrót · Ctrl+LPM: przesuwanie · kółko: zoom · Esc: odznacz</div>'
    ].join('');
    this.root.appendChild(this.debugEl);

    this.menuBtn = document.createElement('button');
    this.menuBtn.type = 'button';
    this.menuBtn.textContent = 'Menu';
    this.menuBtn.style.cssText = [
      'position:absolute',
      'left:14px',
      'top:14px',
      'z-index:20',
      'padding:8px 14px',
      'border-radius:10px',
      'border:1px solid rgba(110,231,255,0.25)',
      'background:rgba(11,15,26,0.75)',
      'color:rgba(255,255,255,0.92)',
      'font:600 13px ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial',
      'cursor:pointer',
      'backdrop-filter:blur(8px)',
      'display:none'
    ].join(';');
    this.menuBtn.addEventListener('click', () => this.returnToMenu());
    this.root.appendChild(this.menuBtn);

    this.bindEvents();
  }

  async start() {
    if (this.running) return;
    await this.ui.init();
    this.ui.screens.addChild(this.menu.root, this.loading.root);
    this.loading.root.visible = false;

    this.menu.onStart = (selection) => {
      this.selection = selection;
      void this.startGameFlow();
    };

    this.running = true;
    this.resize();
    this.loading.show();
    this.appState = 'loading';
    requestAnimationFrame((ts) => this.frame(ts));

    try {
      await this.sceneManager.three.loadAssets((ratio) => {
        this.loadingProgress = ratio;
      });
      this.buildScene();
      await this.loading.hide();
      this.showMenu();
    } catch (error) {
      this.loading.setStatus('Nie udało się wczytać assetów');
      throw error;
    }
  }

  stop() {
    this.running = false;
  }

  private buildScene() {
    const { bundle, materials, lighting } = this.sceneManager.three.assets;

    this.board = new Board(bundle.board);
    bundle.board.material = materials.board;
    this.sceneManager.scene.add(this.board.group);

    const centers = ALL_SQUARES.map((square) => this.board!.squareCenter(square));
    this.glow = new SquareGlow(ALL_SQUARES, centers);
    this.sceneManager.scene.add(this.glow.group);

    this.burst = new CaptureBurst(this.sceneManager.camera);
    this.sceneManager.scene.add(this.burst.group);
    this.decorRoot.add(createMenuDecor(this.board, bundle, materials));

    if (lighting) {
      lighting.key.target.position.set(0, 0, 0);
      this.sceneManager.scene.add(lighting.key.target);
    }
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.resize());
    this.root.addEventListener('pointermove', (event) => this.onPointerMove(event));
    this.root.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    this.root.addEventListener('pointerup', (event) => this.onPointerUp(event));
    this.root.addEventListener('pointercancel', (event) => this.onPointerUp(event));
    this.root.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    this.root.addEventListener('contextmenu', (event) => event.preventDefault());

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'c') this.cinematic.enabled = !this.cinematic.enabled;
      if (key === 'r' && this.appState === 'playing') this.setupPositionFromChess();
      if (event.key === 'Escape' && this.appState === 'playing') this.clearSelection();
    });
  }

  private resize() {
    const rect = this.root.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.sceneManager.resize(rect.width, rect.height, dpr);
    this.ui.resize(rect.width, rect.height, dpr);
    this.menu.resize(rect.width, rect.height);
    this.loading.resize(rect.width, rect.height);
  }

  private frame(ts: number) {
    if (!this.running) return;

    const rawMs = this.lastTs ? ts - this.lastTs : 16.666;
    this.lastTs = ts;
    const dtMs = rawMs * this.time.scale;

    this.stats.begin();
    this.cameraController.update(dtMs);
    this.glow?.tick(dtMs);
    this.burst?.tick(dtMs);
    this.updateDebugOverlay();

    if (this.appState === 'loading') {
      const rect = this.root.getBoundingClientRect();
      this.loading.setProgress(this.loadingProgress);
      this.loading.update(rect.width, rect.height);
    }

    if (this.appState === 'playing' && !this.gameOver && this.clock.isBlitz && !this.inputLocked && !this.aiThinking) {
      this.clock.tick(this.moves.turn, dtMs);
      if (this.clock.flaggedColor()) this.endGameByTime();
      this.syncClockHud();
    }

    this.sceneManager.render(rawMs);
    this.stats.end();
    requestAnimationFrame((next) => this.frame(next));
  }

  private onPointerMove(event: PointerEvent) {
    if (this.appState !== 'playing') return;

    if (this.isPanning) {
      this.cameraController.panBoard(event.clientX - this.panLast.x, event.clientY - this.panLast.y);
      this.panLast.x = event.clientX;
      this.panLast.y = event.clientY;
      return;
    }

    if (this.isOrbiting) {
      this.cameraController.orbitBy(event.clientX - this.orbitLast.x, event.clientY - this.orbitLast.y);
      this.orbitLast.x = event.clientX;
      this.orbitLast.y = event.clientY;
      return;
    }

    if (this.gameOver || this.inputLocked || this.aiThinking) return;

    this.updatePointerNdc(event);
    const hit = this.pick();
    const square = hit?.square ?? null;
    if (square === this.hoveredSquare) return;

    this.hoveredSquare = square;
    this.refreshGlow();
  }

  private onPointerDown(event: PointerEvent) {
    if (this.appState !== 'playing') return;

    if (event.button === 0 && event.ctrlKey) {
      this.isPanning = true;
      this.panLast.x = event.clientX;
      this.panLast.y = event.clientY;
      this.root.setPointerCapture(event.pointerId);
      return;
    }

    if (this.shouldStartOrbit(event)) {
      this.isOrbiting = true;
      this.orbitLast.x = event.clientX;
      this.orbitLast.y = event.clientY;
      this.cameraController.beginManualOrbit();
      this.root.setPointerCapture(event.pointerId);
      return;
    }

    if (this.gameOver || this.inputLocked || this.aiThinking) return;

    this.updatePointerNdc(event);
    const hit = this.pick();
    if (!hit) {
      this.clearSelection();
      return;
    }

    const { square, pieceSquare } = hit;
    if (pieceSquare && this.canHumanMovePiece()) {
      if (this.selectedSquare && this.legalTargets.has(pieceSquare)) {
        void this.commitMove(this.selectedSquare, pieceSquare);
        return;
      }

      const piece = this.squareToPiece.get(pieceSquare);
      if (piece?.color === this.moves.turn) {
        if (this.selectedSquare === pieceSquare) this.clearSelection();
        else this.selectSquare(pieceSquare);
        return;
      }

      if (this.selectedSquare && piece) {
        this.illegalMoveFeedback(pieceSquare);
        return;
      }
    }

    if (square && this.selectedSquare && this.canHumanMovePiece()) {
      if (this.legalTargets.has(square)) void this.commitMove(this.selectedSquare, square);
      else this.illegalMoveFeedback(square);
    }
  }

  private onPointerUp(event: PointerEvent) {
    if (this.isOrbiting) {
      this.isOrbiting = false;
      this.cameraController.endManualOrbit();
    }
    if (this.isPanning) this.isPanning = false;
    if (this.root.hasPointerCapture(event.pointerId)) this.root.releasePointerCapture(event.pointerId);
  }

  private onWheel(event: WheelEvent) {
    if (this.appState !== 'playing') return;
    event.preventDefault();
    this.cameraController.zoomBy(Math.sign(event.deltaY) * 18);
  }

  private shouldStartOrbit(event: PointerEvent) {
    if (event.button === 2 || event.button === 1) return true;
    return event.button === 0 && (event.shiftKey || event.altKey);
  }

  private selectSquare(square: Square) {
    this.selectedSquare = square;
    this.legalTargets.clear();

    this.moves.legalMoves(square).forEach((move) => {
      this.legalTargets.set(move.to as Square, { capture: Boolean(move.captured) });
    });

    if (this.cinematic.enabled) {
      const focus = this.board!.squareCenter(square).add(new THREE.Vector3(0, 0.25, 0));
      this.cameraController.playShot({ type: 'select', focus });
    }

    this.clearIllegalStatus();
    this.refreshGlow();
  }

  private clearSelection() {
    this.selectedSquare = null;
    this.legalTargets.clear();
    this.clearIllegalStatus();
    this.refreshGlow();
    if (this.cinematic.enabled) this.cameraController.playShot({ type: 'default' });
  }

  private canHumanMovePiece() {
    return this.moves.turn === 'w';
  }

  private illegalMoveFeedback(square: Square) {
    this.glow?.flash(square, SQUARE_GLOW.illegal);
    if (this.aiThinking) return;

    this.ui.hud.setStatus('Niedozwolony ruch');
    window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => {
      if (!this.gameOver && !this.aiThinking && this.appState === 'playing') this.ui.hud.setStatus('');
    }, 1400);
  }

  private clearIllegalStatus() {
    window.clearTimeout(this.statusTimer);
    this.statusTimer = 0;
  }

  private async commitMove(from: Square, to: Square) {
    const moving = this.squareToPiece.get(from);
    if (!moving) return;

    this.inputLocked = true;
    const previousTurn = this.moves.turn;
    const captured = this.squareToPiece.get(to) ?? null;
    const toPosition = this.board!.squareCenter(to);

    if (this.cinematic.enabled) {
      this.cameraController.playShot({ type: 'moveFollow', from: this.board!.squareCenter(from), to: toPosition });
    }

    const result = this.moves.tryMove(from, to);
    if (!result.ok) {
      this.inputLocked = false;
      return;
    }

    if (this.clock.isBlitz) this.clock.onMoveCompleted(previousTurn);

    this.clearSelection();
    this.hoveredSquare = null;

    if (captured) {
      this.burst?.burst(toPosition, SQUARE_GLOW.capture);
      await this.playCaptureBeat(toPosition, captured);
      this.squareToPiece.delete(to);
      this.piecesRoot.remove(captured.group);
      captured.dispose();
    }

    this.squareToPiece.delete(from);
    this.squareToPiece.set(to, moving);
    moving.group.userData.square = to;

    await this.animatePieceMove(moving, toPosition, 620);
    moving.group.position.copy(toPosition);
    moving.group.position.y = this.board!.surfaceY;

    this.lastMove = { from, to };
    this.ui.hud.setTurn(this.moves.turn);
    this.ui.hud.setMovesSAN(this.moves.historySAN());
    this.syncClockHud();
    this.refreshGameStatus();

    if (this.cinematic.enabled && result.check) {
      const focus = toPosition.clone().add(new THREE.Vector3(0, 0.25, 0));
      this.cameraController.playShot({ type: 'check', focus });
    } else if (this.cinematic.enabled) {
      this.cameraController.playShot({ type: 'default' });
    }

    this.inputLocked = false;
    this.maybeScheduleAiMove();
  }

  private async playCaptureBeat(focus: THREE.Vector3, captured: Piece) {
    if (this.cinematic.enabled) {
      const target = focus.clone().add(new THREE.Vector3(0, 0.25, 0));
      this.cameraController.playShot({ type: 'capture', focus: target });
      if (this.cinematic.cameraShakeOnCapture) this.cameraController.shake(0.16, 240);

      if (this.cinematic.slowMoOnCaptures) {
        anime({
          targets: this.time,
          scale: 0.24,
          duration: 90,
          easing: 'linear',
          complete: () => {
            anime({ targets: this.time, scale: 1, duration: 420, easing: 'easeOutQuad' });
          }
        });
      }
    }

    await new Promise<void>((resolve) => {
      this.animations.animate({
        targets: captured.group.scale,
        x: 0.68,
        y: 0.28,
        z: 0.68,
        duration: 360,
        easing: 'easeInOutQuad'
      });
      this.animations.animate({
        targets: captured.material,
        opacity: 0,
        duration: 320,
        easing: 'easeInOutQuad',
        update: () => captured.setOpacity(captured.material.opacity),
        complete: () => resolve()
      });
    });
  }

  private animatePieceMove(piece: Piece, to: THREE.Vector3, durationMs: number) {
    const start = piece.group.position.clone();
    const proxy = { x: start.x, y: start.y, z: start.z, hop: 0 };

    return new Promise<void>((resolve) => {
      this.animations.animate({
        targets: proxy,
        x: to.x,
        z: to.z,
        hop: 1,
        duration: durationMs,
        easing: 'easeInOutQuad',
        update: () => {
          const t = proxy.hop;
          const y = THREE.MathUtils.lerp(start.y, to.y, t) + Math.sin(t * Math.PI) * 0.34;
          piece.group.position.set(proxy.x, y, proxy.z);
        },
        complete: () => resolve()
      });
    });
  }

  private updatePointerNdc(event: PointerEvent) {
    const canvas = this.sceneManager.domElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    this.pointerNdc.set(THREE.MathUtils.clamp(x * 2 - 1, -1, 1), THREE.MathUtils.clamp(-(y * 2 - 1), -1, 1));
  }

  private pick() {
    if (!this.board) return null;
    this.raycaster.setFromCamera(this.pointerNdc, this.sceneManager.camera);

    const hits = this.raycaster.intersectObjects([this.board.group, this.piecesRoot], true);
    let square: Square | null = null;
    let pieceSquare: Square | null = null;

    for (const hit of hits) {
      if (!pieceSquare) pieceSquare = this.findPieceSquare(hit.object);
      if (!square && this.board.contains(hit.object)) square = this.board.squareFromWorld(hit.point);
      if (square && pieceSquare) break;
    }

    return { square: square ?? pieceSquare, pieceSquare };
  }

  private findPieceSquare(object: THREE.Object3D): Square | null {
    let current: THREE.Object3D | null = object;
    while (current && current !== this.piecesRoot) {
      const square = current.userData?.square as Square | undefined;
      if (square) return square;
      current = current.parent;
    }
    return null;
  }

  private refreshGlow() {
    this.refreshBoardGrid();
    const glow = this.glow;
    if (!glow) return;
    glow.reset();

    if (this.lastMove) {
      glow.set(this.lastMove.from, { color: SQUARE_GLOW.lastMove, mode: 'tile', intensity: LAST_MOVE_INTENSITY });
      glow.set(this.lastMove.to, { color: SQUARE_GLOW.lastMove, mode: 'tile', intensity: LAST_MOVE_INTENSITY + 0.06 });
    }

    this.legalTargets.forEach((meta, square) => {
      glow.set(square, {
        color: meta.capture ? SQUARE_GLOW.capture : SQUARE_GLOW.move,
        mode: meta.capture ? 'ring' : 'tile',
        intensity: meta.capture ? CAPTURE_INTENSITY : LEGAL_MOVE_INTENSITY
      });
    });

    if (this.selectedSquare) {
      glow.set(this.selectedSquare, { color: SQUARE_GLOW.select, mode: 'tile', intensity: SELECT_INTENSITY, pulse: true });
    } else if (this.hoveredSquare && this.squareToPiece.has(this.hoveredSquare)) {
      glow.set(this.hoveredSquare, { color: SQUARE_GLOW.hover, mode: 'tile', intensity: HOVER_INTENSITY });
    }

    if (this.checkedKingSquare) {
      glow.set(this.checkedKingSquare, { color: SQUARE_GLOW.check, mode: 'ring', intensity: CHECK_INTENSITY, pulse: true });
    }

    this.refreshPieceGlow();
  }

  private refreshBoardGrid() {
    const board = this.ui.hud.board;
    board.clearHighlights();

    if (this.lastMove) board.highlightMove(this.lastMove.from, this.lastMove.to);
    if (this.selectedSquare) board.highlightSquare(this.selectedSquare, '#ffd27f', 0.34);
    this.legalTargets.forEach((meta, square) => {
      board.highlightSquare(square, meta.capture ? '#ff8551' : '#63dcff', meta.capture ? 0.4 : 0.26);
    });
    if (this.checkedKingSquare) board.highlightSquare(this.checkedKingSquare, '#ff5745', 0.45);

    board.setPieces(
      Array.from(this.squareToPiece.entries()).map(([square, piece]) => ({ square, color: piece.color, type: piece.kind }))
    );
  }

  private refreshPieceGlow() {
    this.squareToPiece.forEach((piece, square) => {
      const isSelected = square === this.selectedSquare;
      if (isSelected) piece.setGlow(PIECE_GLOW.select, 0.18);
      else if (square === this.hoveredSquare) piece.setGlow(PIECE_GLOW.hover, 0.11);
      else if (square === this.checkedKingSquare) piece.setGlow(PIECE_GLOW.check, 0.22);
      else piece.clearGlow();
    });
  }

  private updateDebugOverlay() {
    const state = `${this.cinematic.enabled ? 'ON' : 'OFF'} (C)|${this.moves.turn === 'w' ? 'białe' : 'czarne'}`;
    if (state === this.debugState) return;
    this.debugState = state;
    const [cinematic, turn] = state.split('|');
    const rows = this.debugEl.children;
    rows[0].innerHTML = `<b>Cinematic</b>: ${cinematic}`;
    rows[1].innerHTML = `<b>Ruch</b>: ${turn}`;
  }

  private showMenu() {
    this.appState = 'menu';
    this.ui.overlay.visible = false;
    this.ui.setScreenInteraction(true);
    this.menuBtn.style.display = 'none';
    this.piecesRoot.visible = false;
    this.decorRoot.visible = true;
    this.glow?.reset();
    this.cameraController.setDefaultImmediate();
    this.cameraController.idleOrbit(0.00055);
    this.menu.show();
  }

  private returnToMenu() {
    if (!this.running || this.appState === 'menu') return;
    this.time.scale = 1;
    this.clearSelection();
    this.showMenu();
  }

  private async startGameFlow() {
    this.ui.setScreenInteraction(true);
    await this.menu.hide();

    this.loading.show();
    this.appState = 'loading';
    this.loadingProgress = 0;
    await nextFrame(160);
    this.loadingProgress = 0.45;
    await nextFrame(180);
    this.loadingProgress = 1;

    this.resetGame();
    this.ui.overlay.visible = true;
    this.appState = 'playing';
    this.ui.setScreenInteraction(false);
    this.menuBtn.style.display = 'block';
    this.decorRoot.visible = false;
    this.piecesRoot.visible = true;
    await this.loading.hide();
    if (this.cinematic.enabled) this.cameraController.playShot({ type: 'default' });
  }

  private resetGame() {
    this.moves.reset();
    this.selectedSquare = null;
    this.hoveredSquare = null;
    this.legalTargets.clear();
    this.lastMove = null;
    this.checkedKingSquare = null;
    this.inputLocked = false;
    this.aiThinking = false;
    this.gameOver = false;
    this.time.scale = 1;

    this.clock =
      this.selection.mode === 'blitz'
        ? new GameClock({ type: 'blitz', mainMs: 3 * 60_000, incrementMs: 2000 })
        : new GameClock({ type: 'classic' });

    this.squareToPiece.forEach((piece) => {
      this.piecesRoot.remove(piece.group);
      piece.dispose();
    });
    this.squareToPiece.clear();

    this.setupPositionFromChess();
    this.ui.hud.setTurn(this.moves.turn);
    this.ui.hud.setMovesSAN(this.moves.historySAN());
    this.ui.hud.setModeLabel(this.selection.mode === 'blitz' ? 'Blitz 3+2' : 'Classic');
    this.ui.hud.setClockLabels('Ty (białe)', 'Komputer (czarne)');
    this.ui.hud.setStatus('');
    this.ui.hud.setActiveClock(this.moves.turn);
    this.syncClockHud();
    this.refreshGlow();

    this.cameraController.idleOrbit(0);
    this.cameraController.setDefaultImmediate();
    this.refreshGlow();
    this.refreshGameStatus();
    this.maybeScheduleAiMove();
  }

  private setupPositionFromChess() {
    const { bundle, materials } = this.sceneManager.three.assets;

    this.squareToPiece.forEach((piece) => {
      this.piecesRoot.remove(piece.group);
      piece.dispose();
    });
    this.squareToPiece.clear();

    const rows = this.moves.rules.board();
    for (let row = 0; row < 8; row++) {
      const rank = 8 - row;
      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        const cell = rows[row][fileIndex];
        if (!cell) continue;
        const square = `${'abcdefgh'[fileIndex]}${rank}` as Square;
        this.addPiece(cell.color as ColorCode, cell.type as PieceKind, square, bundle, materials);
      }
    }

    this.refreshGlow();
  }

  private refreshGameStatus() {
    const reason = this.moves.gameOverReason();
    this.checkedKingSquare = this.moves.inCheck() ? this.moves.kingSquare(this.moves.turn) : null;

    if (!reason) {
      this.ui.hud.setStatus('');
      this.refreshGlow();
      return;
    }

    this.gameOver = true;
    const winner = this.moves.turn === 'w' ? 'Black' : 'White';

    if (reason === 'checkmate') this.ui.hud.setStatus(`Szach mat! Wygrywa: ${winner}`);
    else if (reason === 'stalemate') this.ui.hud.setStatus('Pat — remis.');
    else this.ui.hud.setStatus('Remis.');

    this.ui.hud.setActiveClock(null);
    this.refreshGlow();
    if (this.cinematic.enabled) this.cameraController.playShot({ type: 'finale' });
  }

  private endGameByTime() {
    if (this.gameOver) return;
    this.gameOver = true;
    const winner = this.clock.flaggedColor() === 'w' ? 'Black' : 'White';
    this.ui.hud.setStatus(`Koniec czasu! Wygrywa: ${winner}`);
    this.ui.hud.setActiveClock(null);
    if (this.cinematic.enabled) this.cameraController.playShot({ type: 'finale' });
  }

  private maybeScheduleAiMove() {
    if (this.gameOver || this.moves.turn !== 'b' || this.aiThinking || this.inputLocked) return;

    this.aiThinking = true;
    this.ui.hud.setStatus('Komputer myśli…');
    const fen = this.moves.fen();

    window.setTimeout(() => {
      const pick = pickBestMove(fen, 2);
      this.aiThinking = false;

      if (this.gameOver || this.appState !== 'playing') {
        this.ui.hud.setStatus('');
        return;
      }

      this.ui.hud.setStatus('');
      if (!pick) {
        this.refreshGameStatus();
        return;
      }
      void this.commitMove(pick.from as Square, pick.to as Square);
    }, 40);
  }

  private syncClockHud() {
    this.ui.hud.setClocks(this.clock.whiteMs, this.clock.blackMs);
    this.ui.hud.setActiveClock(this.gameOver ? null : this.moves.turn);
  }

  private addPiece(color: ColorCode, kind: PieceKind, square: Square, bundle: AssetBundle, materials: MaterialPack) {
    const prototype = bundle.pieces[color][kind];
    const material = color === 'w' ? materials.pieceWhite : materials.pieceBlack;
    const piece = new Piece(`${color}${kind}${square}`, kind, color, prototype, material);
    piece.group.position.copy(this.board!.squareCenter(square));
    piece.group.userData.square = square;
    this.piecesRoot.add(piece.group);
    this.squareToPiece.set(square, piece);
  }
}

function nextFrame(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}
