# Battleship

A single-player naval strategy game built with vanilla JavaScript, ES modules, and test-driven development for [The Odin Project's Battleship assignment](https://www.theodinproject.com/lessons/node-path-javascript-battleship). Arrange your fleet, search enemy waters, and sink all five opposing ships before the computer sinks yours.

## Features

- Complete games against a computer that selects random, untried coordinates.
- Randomized legal fleets with a visible human setup and repeatable “Randomize fleet” control.
- Two boards with coordinate labels, ship counters, recent shots, and distinct ship, hit, miss, and sunk markers.
- Turn and victory announcements through a polite live region.
- Keyboard attacks with one board tab stop, arrow navigation, and visible focus.
- Responsive navy-and-teal interface with stacked boards on narrow screens.
- New-game control that clears shots and cancels pending computer responses.

## Run locally

Use Node.js 24 and npm. No backend, API keys, or runtime services are needed.

```sh
npm ci
npm start
```

Open `http://localhost:8080`. Other commands:

```sh
npm test             # Run domain tests once
npm run test:watch   # Watch tests during development
npm run build       # Create production assets in dist/
```

Webpack handles HTML, JavaScript, and CSS. Jest uses `babel-jest` and Babel's environment preset to transform ES module imports for the current Node runtime. Browser source remains ES modules; there is no separate native-ESM Jest setup.

## How to play

1. Review your five ships in **Your fleet**. Select **Randomize fleet** until you like the arrangement.
2. Select **Start game** to confirm it. You fire first.
3. Select a square in **Enemy waters**. The computer responds after a short delay; then you can fire again.
4. Sink the enemy fleet to win. After either player wins, the remaining enemy ships are revealed and labeled.
5. Select **New game** at any time to return to a fresh setup.

For keyboard play, starting the game focuses enemy square A1. Use the arrow keys to move, Home/End to reach the current row's edges, and Enter/Space to fire. The attack board has one tab stop. Fired squares remain navigable for inspection but cannot fire again. Focus stays on the same cell during the computer response. Tab or Shift+Tab leaves the board normally.

The legend uses shapes as well as color: **■** ship, **×** hit, **•** miss, and **⊗** sunk ship with a dashed border.

## Rules and design decisions

- Boards are 10 × 10. Internal coordinates are `[x, y]`, where x is the column and y the row, both integers from 0 to 9. The interface displays columns A–J and rows 1–10.
- Fleet lengths are `[5, 4, 3, 3, 2]`, occupying 17 squares. Ships are straight and horizontal or vertical. Overlap and off-board placement are rejected; adjacency, including diagonal adjacency, is allowed.
- Every valid shot consumes a turn, including a hit. Invalid or duplicate shots preserve state and turn.
- Sinking the final ship immediately ends the game. No further attacks or computer response are accepted.
- Enemy ships remain concealed until hit/sunk or the game ends. Unrevealed locations never enter DOM classes, data attributes, labels, or hidden markup. This is a local game, so JavaScript memory is inspectable; concealment is a rendering rule.
- The computer samples uniformly from remaining legal squares. It has no targeting strategy or knowledge-based advantage.
- Setup cycles complete random layouts rather than supporting manual placement.

## Architecture and public interfaces

Domain modules have no DOM, event, or timer dependencies. Private fields hold mutable model state; snapshots contain detached plain data.

| Module | Responsibility and interface |
| --- | --- |
| `src/ship.js` | `Ship(length)` exposes read-only `length` and `hits`, plus `hit()` and `isSunk()`. Length must be an integer from 1 to 10; damage is capped at length. |
| `src/gameboard.js` | `Gameboard` owns ship locations and shot records. `placeShip(length, start, orientation)`, `receiveAttack(position)`, `hasReceivedAttack(position)`, `allShipsSunk()`, and `getSnapshot()` form its public API. |
| `src/player.js` | `Player(type, random?, board?)` owns an independent board by default. Types are `human` and `computer`; `chooseAttack(targetBoard)` is computer-only and returns an untried coordinate or `null` if exhausted. |
| `src/fleet-placement.js` | `createRandomBoard(random?)` shuffles bounded horizontal/vertical candidates and searches with backtracking. It returns a fresh complete board, never a partially placed fleet. `FLEET_LENGTHS` is frozen. |
| `src/game.js` | `Game({ random?, createBoard? })` owns both players and the `setup`, `human-turn`, `computer-turn`, and `game-over` phases. `prepare()` resets both players; `start()`, `humanAttack(position)`, `computerTurn()`, and `getSnapshot()` drive play. |
| `src/dom.js` | Creates stable board elements, delegates events, renders snapshots, manages keyboard focus, and schedules computer responses. |
| `src/index.js` | Connects a new game to the DOM and imports styles. |

### Results, validation, and snapshots

`placeShip` accepts only `horizontal` or `vertical`. Invalid lengths, malformed/out-of-range coordinates, invalid orientations, overlaps, placement after attacks, and wrong-phase controller actions throw descriptive errors. Placements are fully validated before mutation. Starting requires both complete fleets with no prior attacks. `allShipsSunk()` is false on an empty board.

`receiveAttack` and `humanAttack` return `{ outcome }`, where outcome is `miss`, `hit`, `sunk`, or `already-attacked`. A duplicate does not damage a ship or change any state. `computerTurn` returns `{ outcome, position }`. Random functions must return a finite number in `[0, 1)`.

A board snapshot contains `cells[y][x]` with `{ ship, shot }`: ship is a numeric ship index or `null`, and shot is `null`, `hit`, or `miss`. Its `ships` entries contain `{ length, hits, sunk, cells }`. A controller snapshot adds `phase`, `winner`, `latest` (`{ actor, position, outcome }` or `null`), and the `human`/`computer` board snapshots. Returned arrays and objects do not expose internal ships or mutable model storage. The renderer filters enemy data before updating markup.

### One shot through the application

An enemy-cell click calls `Game.humanAttack`, which validates the phase and delegates to the computer's `Gameboard.receiveAttack`. The board records the shot and damages the appropriate ship. The controller checks victory and advances the phase. The DOM reads a new snapshot, updates feedback, and immediately locks attacks. If a computer turn remains, it schedules one response and renders again afterward.

The DOM keeps at most one timer. Reset clears it and increments a session token; callbacks verify both the token and current phase. Cell elements and listeners are created once, so rerenders and restarts preserve focus and avoid accumulating event handlers. Board buttons use `aria-disabled` plus event/controller guards to preserve inspection focus while preventing attacks.

## Testing

Tests exercise public domain interfaces in Jest's Node environment. Coverage includes ship validation and capped hits; placement boundaries, overlap, adjacency, and atomic failures; duplicate attacks, misses, correct ship damage, and detached snapshots; computer move exhaustion; legal randomized fleets and constant randomness; alternating turns, both victory paths, and fresh restart state. Injected randomness and predetermined board factories make scenarios reproducible.

Tests are written before their corresponding implementation and run through failing/passing cycles. No DOM tests, jsdom, snapshots, or automated browser tests are included, following the assignment. See the [manual browser review checklist](docs/manual-qa.md) for interaction, accessibility, mobile layout, and production-path checks.

## Deployment

A manual GitHub Pages workflow is prepared in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Hosting has not been verified; there is no live-demo link yet.

When ready to publish:

1. Push the source to GitHub.
2. In repository **Settings → Pages**, select **GitHub Actions** as the build source.
3. Open **Actions → Deploy Battleship to GitHub Pages → Run workflow** and select the intended branch.
4. Check the test/build and deployment jobs, then open the URL reported by the deployment environment.
5. Run the production/browser checklist before adding a verified demo URL here.

The workflow uses `npm ci`, runs tests, builds, uploads `dist/`, and deploys through the official Pages actions. It runs only through `workflow_dispatch`, with read access for the build and Pages/OIDC write permissions scoped to deployment. No project secrets are required. Relative Webpack asset paths support hosting under `/odin-battleship/`. Generated files and dependencies are ignored by Git.

The workflow follows [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Limitations and learning outcomes

This version has random fleet setup, a random computer opponent, and in-memory game state. Reloading starts a new session. Drag-and-drop placement, pass-device multiplayer, and smarter targeting are possible future improvements.

The project practices TDD, class/module boundaries, validation before mutation, deterministic randomness, state-driven rendering, and timer lifecycle management. It also explores accessible keyboard interaction without coupling game rules to the interface.
