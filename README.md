# Chess 3D (Cinematic)

Browser 3D chess built around the **assets shipped in `Public/`**: a hand-modelled wooden chess set (FBX) with PBR texture sets, rendered with cinematic camera work and warm studio lighting.

## Tech

- Three.js — rendering, PBR materials, shadows, post-processing (bloom + filmic grade)
- PixiJS — HUD overlay and the 2D board widget
- Anime.js — camera beats, piece motion, UI transitions
- chess.js — rules, legality, turn handling
- Vite + TypeScript

## Assets used

| Asset | Source | Usage |
| --- | --- | --- |
| `Public/Models/SM_*.fbx` (14 files) | `src/assets/AssetCatalog.ts` | board + white/black pieces |
| `Public/Models/SM_*CheckerPiece.fbx` | `src/assets/AssetCatalog.ts` | decorative checkers in the main menu |
| `Public/Textures/**/Mat_*_{BaseColor,Normal,Roughness}.png` | `src/assets/AssetCatalog.ts` | albedo, normal and roughness maps (metallic is unused — the workflow is fully metallic-free wood) |
| `Public/Promotional Files/*` | reference art | parity, scale and material tuning reference |

Model quirks handled in code:

- the board model spans `91.8` units including the `9.2`-unit frame (playfield `73.44`), so `BOARD_MODEL_SCALE` normalises it to exactly **8 × 8 squares**;
- every piece model is anchored by its bounding box so the base sits on the board surface;
- the checked square colours follow the official sheet: light squares `b1`… and `h1` dark (a1 is light), which matches `(file + rank) % 2 === 1`;
- each 3D piece mesh is merged into a single geometry with **one material per colour**, so a full game costs 33 draw calls instead of 200+.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Game flow

- **Main menu** — pick **Classic** (no clock limit) or **Blitz 3+2**, then **Start**.
- **Loading** screen reports real asset progress (25 files: models + textures).
- You always play **White** vs the computer (**Black**, minimax depth 2).

## Controls

- **Left click** — select a piece, click a highlighted square to move (click the same piece again to deselect).
- **Escape** — clear selection.
- **Camera orbit** — right-drag, middle-drag, `Shift`+left-drag or `Alt`+left-drag.
- **Pan** — `Ctrl`+left-drag.
- **Zoom** — mouse wheel.
- **C** — toggle cinematic camera beats.
- **R** — rebuild 3D pieces from the current chess state.

## Lighting & glow

- Gradient studio environment (PMREM) + warm key light with soft shadows, warm counter light, cool fill and rim, plus two practical point lights.
- Square feedback uses two GPU-instanced layers over the 64 squares: an additive tile highlight (selection, legal moves, last move) and a soft ring (captures, checks, illegal moves) with a faded square-glow texture.
- Piece feedback uses emissive glow driven per material clone (hover, selection, check).
- Captures spawn a pooled additive particle burst, plus camera shake and a short slow-motion beat.

## Performance notes

- Rendering is capped at 30 FPS while simulation keeps running; pixel ratio is limited to 1.5.
- Instanced meshes with a shared pool for all highlights and particles; no per-frame allocations in the hot loop.
- MSAA targets use `HalfFloatType` with 4 samples, bloom threshold `0.86` so the HUD stays crisp.
