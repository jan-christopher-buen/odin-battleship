# Battleship

A naval strategy game for one or two players, built with vanilla JavaScript, ES modules, and test-driven development for [The Odin Project's Battleship assignment](https://www.theodinproject.com/lessons/node-path-javascript-battleship). Arrange your fleet, search opposing waters, and sink all five ships before your own fleet is lost.

## Features

- Single-player games against a computer that hunts randomly, then targets untried adjacent squares after a hit.
- Two-player games on one device, with private fleet setup and a pass-device screen between turns.
- Drag-and-drop ship repositioning and rotation, with click/tap and keyboard alternatives.
- Randomized legal fleets with a visible human setup and repeatable “Randomize fleet” control.
- Two boards with coordinate labels, ship counters, recent shots, and distinct ship, hit, miss, and sunk markers.
- Turn and victory announcements through a polite live region.
- Keyboard attacks with one board tab stop, arrow navigation, and visible focus.
- Responsive navy-and-teal interface with stacked boards on narrow screens.
- New-game control that resets either mode and cancels pending computer responses.

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

1. Choose **Vs computer** or **Two players · pass device**. Changing modes starts a fresh setup.
2. Review your five ships. Select **Randomize fleet** for a new layout, or rearrange individual ships.
3. Against the computer, select **Start game**. You fire first; the computer responds after a short delay.
4. In two-player mode, Player 1 selects **Ready**, arranges a fleet, and selects **Confirm fleet**. Pass the device to Player 2 to do the same. Pass it back to Player 1 to begin.
5. Choose a square in opposing waters. In local mode, a valid shot immediately conceals both boards and shows the public shot result. Pass the device before the next player selects **Ready**. The other player should look away during private setup and turns.
6. Sink the opposing fleet to win. The game immediately ends and reveals the remaining opposing ships. Select **New game** at any time to restart the selected mode.

### Arrange ships

Every setup begins with a complete legal fleet. Drag a ship from the dock to its starting square, or drag an existing ship on your board. Grabbing an interior ship square preserves that segment's offset when dropping. **Rotate** changes the selected ship's next placement direction; apply it by placing or dropping that ship. Moving a ship may reuse its current squares, but cannot overlap another ship or cross a board edge. Rejected moves leave the fleet unchanged and announce an error.

For click/tap placement, select a ship in the dock, choose its direction, and select its starting square on your board. For keyboard placement, select a ship, Tab to your board, move with arrow keys, and press Enter/Space to place it. Press **R** on your board to change direction. Native dragging is intended for desktop browsers; click/tap placement is available on touch devices.

### Keyboard attacks

Starting a single-player game or accepting a local turn focuses opposing square A1. Use arrow keys to move, Home/End to reach row edges, and Enter/Space to fire. The attack board has one tab stop. Fired squares remain navigable for inspection but cannot fire again. Focus stays on the same cell during a computer response. Local handoffs focus **Ready**, and restart focuses the appropriate setup control. Tab or Shift+Tab leaves a board normally.

The legend uses shapes as well as color: **■** ship, **×** hit, **•** miss, and **⊗** sunk ship with a dashed border.

## Rules and design decisions

- Boards are 10 × 10. Internal coordinates are `[x, y]`, where x is the column and y the row, both integers from 0 to 9. The interface displays columns A–J and rows 1–10.
- Fleet lengths are `[5, 4, 3, 3, 2]`, occupying 17 squares. Ships are straight and horizontal or vertical. Overlap and off-board placement are rejected; adjacency, including diagonal adjacency, is allowed.
- Every valid shot consumes a turn, including a hit. Invalid or duplicate shots preserve state and turn.
- Sinking the final ship immediately ends the game. No further attacks or computer response are accepted.
- Enemy ships remain concealed until hit/sunk or the game ends. Unrevealed locations never enter DOM classes, data attributes, labels, or hidden markup. This is a local game, so JavaScript memory is inspectable; concealment is a rendering rule.
- The computer targets orthogonal neighbors of recent hits, skips tried squares, and continues exploring those neighbors after misses. Sinking a ship clears the target queue; otherwise it samples remaining squares uniformly. It receives shot results only and never reads hidden ship locations. This is a simple pursuit strategy, not an optimal fleet-solving algorithm.
- Both setup methods preserve complete fleets: randomization replaces the current player's layout, and manual placement repositions existing ships atomically.
- Player 1 always fires first in local mode. Both players receive private setup screens; every valid nonwinning shot requires an explicit pass-device handoff. No automatic computer action runs in this mode.
- Handoff screens have no board data in the rendering view. The DOM clears board markers and labels, hides the board area, and makes it inert. The latest shot outcome remains public. This supports cooperative pass-device play, not protection against someone inspecting application memory or revealing a turn without passing the device.

## Architecture and public interfaces

Domain modules have no DOM, event, or timer dependencies. Private fields hold mutable model state; snapshots contain detached plain data.

| Module | Responsibility and interface |
| --- | --- |
| `src/ship.js` | `Ship(length)` exposes read-only `length` and `hits`, plus `hit()` and `isSunk()`. Length must be an integer from 1 to 10; damage is capped at length. |
| `src/gameboard.js` | `Gameboard` owns ship locations and shot records. `placeShip(length, start, orientation)`, `moveShip(id, start, orientation)`, `receiveAttack(position)`, `hasReceivedAttack(position)`, `allShipsSunk()`, and `getSnapshot()` form its public API. |
| `src/player.js` | `Player(type, random?, board?)` owns an independent board by default. Types are `human` and `computer`; `chooseAttack(targetBoard)` is computer-only and returns an untried coordinate or `null` if exhausted. `recordAttack(position, outcome)` receives completed shot results to maintain a private target queue. |
| `src/fleet-placement.js` | `createRandomBoard(random?)` shuffles bounded horizontal/vertical candidates and searches with backtracking. It returns a fresh complete board, never a partially placed fleet. `FLEET_LENGTHS` is frozen. |
| `src/game.js` | `Game({ random?, createBoard?, mode? })` supports `computer` and `local` modes. `prepare({ mode? })` resets the session; `randomizeFleet()` and `moveShip()` edit the current setup. `start()`, `ready()`, `humanAttack()`, `secondPlayerAttack()`, and `computerTurn()` drive phase transitions. `getSnapshot()` exposes detached model state; `getView()` provides the current rendering view. |
| `src/dom.js` | Creates stable board elements, renders filtered views and handoffs, manages keyboard focus, and schedules computer responses. |
| `src/placement-dom.js` | Handles ship selection, rotation controls, native drag/drop, and click/tap/keyboard placement. Validation stays in the domain modules. |
| `src/index.js` | Connects a new game to the DOM and imports styles. |

### Results, validation, and snapshots

`placeShip` accepts only `horizontal` or `vertical`. Invalid lengths, malformed/out-of-range coordinates, invalid orientations, overlaps, placement after attacks, and wrong-phase controller actions throw descriptive errors. Placements and moves are fully validated before mutation; editing is allowed only during setup. Starting requires both complete fleets with no prior attacks. `allShipsSunk()` is false on an empty board.

`receiveAttack`, `humanAttack`, and `secondPlayerAttack` return `{ outcome }`, where outcome is `miss`, `hit`, `sunk`, or `already-attacked`. A duplicate does not damage a ship or change any state. `computerTurn` returns `{ outcome, position }`. Random functions must return a finite number in `[0, 1)`.

A board snapshot contains `cells[y][x]` with `{ ship, shot }`: ship is a numeric ship index or `null`, and shot is `null`, `hit`, or `miss`. Its `ships` entries contain `{ length, hits, sunk, cells }`. A controller snapshot adds `mode`, `phase`, `viewer`, `pendingPlayer`, `winner`, `latest` (`{ actor, position, outcome }` or `null`), and the `human`/`computer` board snapshots. The seat IDs remain `human` and `computer`; in local mode they correspond to Player 1 and Player 2, and both `Player` instances have type `human`. Returned arrays and objects do not expose internal ships or mutable model storage.

The DOM uses `getView()`, which replaces raw seat boards with `own` and `enemy`. Before game over, enemy cells contain no ship IDs, only observed shot markers (`null`, `hit`, `miss`, or `sunk`), and enemy ship summaries contain only `{ sunk }`. During `handoff`, both boards and `viewer` are `null`. Other phases are `setup`, `human-turn`, `second-player-turn`, `computer-turn`, and `game-over`. `ready()` is accepted only during handoff, and exposes the intended player's view before continuing setup or play.

### One shot through the application

An enemy-cell click calls `Game.humanAttack`, which validates the phase and delegates to the computer's `Gameboard.receiveAttack`. The board records the shot and damages the appropriate ship. The controller checks victory and advances the phase. The DOM reads a filtered view, updates feedback, and immediately locks attacks. If a computer turn remains, it schedules one response, records its outcome for AI targeting, and renders again afterward. In local mode, a shot instead enters handoff; accepting the next turn exposes that player's own board and the concealed opponent board.

The DOM keeps at most one timer. Reset clears it and increments a session token; callbacks verify both the token and current phase. Cell elements and listeners are created once, so rerenders and restarts preserve focus and avoid accumulating event handlers. Board buttons use `aria-disabled` plus event/controller guards to preserve inspection focus while preventing attacks.

## Testing

Tests exercise public domain interfaces in Jest's Node environment. Coverage includes ship validation and capped hits; placement boundaries, overlap, adjacency, and atomic failures; duplicate attacks, misses, correct ship damage, and detached snapshots; computer move exhaustion and adjacent targeting without hidden knowledge; legal randomized fleets and constant randomness; atomic ship movement and rotation; alternating turns, private two-player setup and handoffs, filtered views, both players' victory paths, and fresh restart/mode state. Injected randomness and predetermined board factories make scenarios reproducible.

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

Games remain in memory, so reloading starts a new session. Multiplayer is local pass-device play; there is no online play or saved progress. Native drag-and-drop behavior varies by browser, with click/tap and keyboard alternatives provided. The computer uses basic adjacent pursuit and can abandon unresolved neighboring targets when a ship sinks. More advanced targeting, saved games, and online multiplayer are possible future improvements.

The project practices TDD, class/module boundaries, validation before mutation, deterministic randomness, state-driven rendering, private player views, and timer lifecycle management. It also explores accessible keyboard interaction without coupling game rules to the interface.
