# Slots Game (PixiJS + TypeScript)

A TypeScript slot machine built on PixiJS with Spine animations, sound, and a small win-detection engine. This README covers how the app works, the types of wins it can detect, what each UI button does, the tech stack, and how to run/debug the project locally (including WebStorm debugger setup).


## Overview
- Rendered with PixiJS 7; animated frame and effects via pixi-spine.
- Core game grid is 4 rows × 6 columns (REEL_COUNT × SYMBOLS_PER_REEL), with symbol size and spacing defined in a central constants class.
- A background image is fitted inside the Spine frame behind the reels (with masking to prevent bleed).
- Sounds (spin loop, win, button) are played via Howler.js.
- Win detection supports three categories: straight lines, diagonals, and adjacency paths.
- Includes unit tests for win logic and SlotMachine life cycle.


## Win types detected
Win detection resides in `src/core/GameCoreLogic.ts`. All wins return paths as arrays of `{ r, c }` coordinates (r = row, c = column) referring to the 4×6 grid.

1) Straight
- Horizontal: all symbols in a given row match.
- Vertical: all symbols in a given column match.
- In code, `findHorizontalWins` and `findVerticalWins` identify these and `computeWins` combines them into the `straight` category.

2) Diagonal
- Lines that run from the top row to the bottom row with a constant column delta of +1 (down-right) or −1 (down-left).
- Found by `findDiagonalWins` and returned under `diagonal`.

3) Adjacency (non‑straight connecting paths)
- Any top-to-bottom path of the same symbol using only the next row and stepping columns by −1, 0, or +1 each step (down-left, down, down-right).
- Implemented via a BFS in `findAdjacencyWins`.
- Paths that are actually straight or perfect diagonals are filtered out so `adjacency` only contains the non‑straight zig‑zag connections.

Helper: `GameCoreLogic.checkWin(grid)` returns both the categorized wins and a combined `allPaths` array.


## UI and buttons
UI is built in `src/ui/UI.ts` and layered above the slot machine.

- Spin button
  - Texture: `button_spin.png`.
  - Has a simple shadow effect that follows hover and press.
  - Click behavior: plays the "Spin button" sound, briefly scales down (with shadow), triggers `SlotMachine.spin()`.
  - While spinning: the button is disabled and a spin sound loops; it is re-enabled when spinning finishes.

- Win: Straight (LR/TB)
  - Triggers `SlotMachine.forceStraightWinInAnyColumn()`.
  - Forces a winnable grid for either a horizontal (left-to-right) or vertical (top-to-bottom) straight line on the next spin (toggles orientation internally between spins).

- Win: Diagonal
  - Triggers `SlotMachine.forceRandomDiagonalWin()`.
  - Forces a diagonal win (+1 or −1 slope) for the next spin.

- Win: Any Line
  - Triggers `SlotMachine.forceRandomStraightConnectingLineWin()`.
  - Forces a connecting path (adjacency-style top-to-bottom path) on the next spin.


## Technologies and libraries
- TypeScript 5
- PixiJS 7 (`pixi.js`): 2D rendering
- pixi-spine: Spine runtime to render the frame/effects animations
- Howler.js: audio playback (`src/utils/Sound.ts` wrapper)
- Webpack 5 + webpack-dev-server: build and serve (dev)
- Jest + ts-jest: unit testing
- ESLint + @typescript-eslint: linting


## Source highlights
- `src/consts/GameConstants.ts` — central constants (REEL_COUNT = 4, SYMBOLS_PER_REEL = 6, SYMBOL_SIZE = 150, REEL_HEIGHT = SYMBOL_SIZE, REEL_SPACING = 10).
- `src/Game.ts` — initializes Pixi application, loads assets, adds `SlotMachine` and `UI`, handles window resize.
- `src/utils/AssetLoader.ts` — packages and loads images/spines/sounds via Pixi Assets, exposes `getTexture`/`getSpine`.
- `src/utils/Sound.ts` — small Howler registry with safe play/stop/loop operations.
- `src/slots/SlotMachine.ts` — core reels view, background fitted into Spine frame, spin lifecycle, win-path drawing, and force-win helpers.
- `src/core/GameCoreLogic.ts` — win detection (straight, diagonal, adjacency) and aggregator.
- `tests/*.test.ts` — unit tests for game logic and SlotMachine.

Assets (copied to `dist/assets` during build):
- Images: `src/assets/images/`
- Spines: `src/assets/spines/`
- Sounds: `src/assets/sounds/`


## Getting started
Prerequisites
- Node.js 18+ (recommended) and npm.

Install dependencies
```
npm install
```

Start the dev server
```
npm start
```
By default, webpack-dev-server serves on http://localhost:9000 (see `webpack.config.js`).

Build a production bundle
```
npm run build
```
The bundle is output to `dist/`.

Run tests
```
npm test
```
Optionally watch:
```
npm run test:watch
```


## Running the app locally
1) `npm install`
2) `npm start`
3) Open your browser at http://localhost:9000
4) You should see the slot machine with the base feature frame, background, and UI buttons.

If assets don’t appear, ensure the `src/assets` folder is present (webpack copies it to `dist/assets`). Check DevTools console for 404s.


## Debugging with WebStorm
Webpack is configured with `devtool: 'inline-source-map'`, so TypeScript sources are mapped in the browser.

1) In WebStorm, create a new Run/Debug Configuration:
   - Type: JavaScript Debug
   - URL: `http://localhost:9000`
   - Browser: Chrome (or your preferred Chromium-based browser)
2) Start the dev server: `npm start` (or use a dedicated NPM run configuration in WebStorm).
3) Click Debug on the JavaScript Debug configuration. WebStorm will open the URL and attach the debugger.
4) Set breakpoints directly in your `.ts` files (e.g., `src/slots/SlotMachine.ts`, `src/core/GameCoreLogic.ts`). They should bind thanks to source maps.

Tip: You can also start `npm start` from a WebStorm NPM configuration and check the "Before launch" steps to ensure the dev server starts before attaching.

## Troubleshooting
- Port already in use: change `devServer.port` in `webpack.config.js` or stop the process using 9000.
- Assets 404 in the browser: ensure `src/assets` exists and webpack copy plugin maps `src/assets/**` to `dist/assets/**`.
- Breakpoints not hitting: confirm source maps are enabled (`devtool: 'inline-source-map'`) and that you’re debugging the correct URL. Try clearing cache/hard refresh.
- Jest tests cannot find non-code assets: Jest maps image/sound files to a stub via `jest.config.ts` (`tests/stubs/fileStub.js`).
