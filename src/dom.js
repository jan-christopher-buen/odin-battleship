import { BOARD_SIZE } from './gameboard.js';
import mountPlacement from './placement-dom.js';

const coordinate = (x, y) => `${String.fromCharCode(65 + x)}${y + 1}`;
const phaseLabels = {
  setup: '01 / Deploy your fleet',
  handoff: 'Pass device / fleets concealed',
  'human-turn': '02 / Your move',
  'second-player-turn': '02 / Your move',
  'computer-turn': '02 / Incoming signal',
  'game-over': '03 / Mission complete',
};
const playerName = (mode, seat) => mode === 'local'
  ? seat === 'human' ? 'Player 1' : 'Player 2'
  : seat === 'human' ? 'You' : 'Computer';

function createBoard(container) {
  const cells = [];
  for (let y = -1; y < BOARD_SIZE; y += 1) {
    for (let x = -1; x < BOARD_SIZE; x += 1) {
      const element = document.createElement(x >= 0 && y >= 0 ? 'button' : 'span');
      if (x < 0 || y < 0) {
        element.className = 'axis';
        element.textContent = y < 0 && x >= 0 ? String.fromCharCode(65 + x) : x < 0 && y >= 0 ? y + 1 : '';
        element.setAttribute('aria-hidden', 'true');
      } else {
        element.className = 'cell';
        element.type = 'button';
        element.dataset.x = x;
        element.dataset.y = y;
        element.tabIndex = -1;
        cells.push(element);
      }
      container.append(element);
    }
  }
  return cells;
}

function renderBoard(elements, board, active) {
  elements.forEach((element, index) => {
    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);
    const cell = board?.cells[y][x];
    const visibleShip = cell != null && cell.ship !== null;
    const sunk = visibleShip && board.ships[cell.ship].sunk;
    const appearance = sunk ? 'sunk' : cell?.shot || (visibleShip ? 'ship' : 'water');
    element.className = `cell ${appearance}`;
    element.textContent = appearance === 'sunk' ? '⊗' : appearance === 'hit' ? '×'
      : appearance === 'miss' ? '•' : visibleShip ? '■' : '';
    const description = board === null ? 'concealed' : appearance === 'water' ? 'untried' : appearance;
    element.setAttribute('aria-label', `${coordinate(x, y)}: ${description}`);
    // aria-disabled keeps inspection focus stable while event/controller guards lock shots.
    element.setAttribute('aria-disabled', String(!active || cell?.shot != null));
    if (board === null) {
      element.tabIndex = -1;
      element.draggable = false;
    }
  });
}

export default function mountGame(game) {
  const enemyBoard = document.querySelector('#enemy-board');
  const humanCells = createBoard(document.querySelector('#human-board'));
  const enemyCells = createBoard(enemyBoard);
  const status = document.querySelector('#status');
  const start = document.querySelector('#start');
  const restart = document.querySelector('#restart');
  const randomize = document.querySelector('#randomize');
  const reports = document.querySelector('#reports');
  const mode = document.querySelector('#mode');
  const ready = document.querySelector('#ready');
  let focusIndex = 0;
  let pendingTurn = null;
  let session = 0;

  function updateTabStop() {
    const { phase } = game.getView();
    const inspectable = phase !== 'setup' && phase !== 'handoff';
    enemyCells.forEach((cell, index) => {
      cell.tabIndex = inspectable && index === focusIndex ? 0 : -1;
    });
  }

  function render() {
    const state = game.getView();
    const handoff = state.phase === 'handoff';
    const local = state.mode === 'local';
    renderBoard(humanCells, state.own, state.phase === 'setup');
    renderBoard(enemyCells, state.enemy, ['human-turn', 'second-player-turn'].includes(state.phase));
    start.disabled = state.phase !== 'setup';
    randomize.disabled = state.phase !== 'setup';
    start.textContent = local ? 'Confirm fleet' : 'Start game';
    mode.value = state.mode;
    mode.disabled = !['setup', 'game-over'].includes(state.phase) && !(handoff && state.latest === null);
    document.querySelector('#phase').textContent = phaseLabels[state.phase];
    document.querySelector('#commander-count').textContent = local ? 'Two commanders' : 'One commander';
    document.querySelector('#handoff').hidden = !handoff;
    const playArea = document.querySelector('#play-area');
    playArea.hidden = handoff;
    playArea.inert = handoff;
    document.querySelector('#human-title').textContent = local && state.viewer
      ? `${playerName(state.mode, state.viewer)} · your fleet` : 'Your fleet';
    document.querySelector('#enemy-title').textContent = local ? 'Opponent waters' : 'Enemy waters';
    document.querySelector('#enemy-note').textContent = state.phase === 'game-over'
      ? 'Mission ended · opposing fleet revealed' : 'Uncharted waters · opposing fleet concealed';
    let message = `${local ? playerName(state.mode, state.viewer) + ': ' : ''}Review your ships. Drag, select a starting square, or randomize your fleet.`;
    if (handoff) {
      const name = playerName(state.mode, state.pendingPlayer);
      message = `Pass the device to ${name}. Both fleets are concealed. Only ${name} should select Ready.`;
      document.querySelector('#handoff-title').textContent = `Pass to ${name}`;
      ready.textContent = `Ready · I am ${name}`;
      reports.replaceChildren();
    } else if (state.phase === 'game-over') {
      message = local ? `${playerName(state.mode, state.winner)} wins! The opposing fleet is sunk. Start a new game to play again.`
        : state.winner === 'human' ? 'Victory! You sank the enemy fleet. Start a new game to play again.'
          : 'Defeat. The computer sank your fleet. Start a new game to try again.';
    } else if (['human-turn', 'second-player-turn'].includes(state.phase)) {
      message = `${local ? playerName(state.mode, state.viewer) : 'Your'} turn. Choose a square in opposing waters.`;
    } else if (state.phase === 'computer-turn') {
      message = 'Computer turn. Awaiting the incoming shot…';
    }
    if (state.latest) {
      message = `${playerName(state.mode, state.latest.actor)} fired at ${coordinate(...state.latest.position)}: ${state.latest.outcome}. ${message}`;
    }
    status.textContent = message;
    document.querySelector('#human-fleet').textContent = state.own
      ? `${state.own.ships.filter((ship) => !ship.sunk).length} / 5 ships afloat` : '';
    document.querySelector('#enemy-fleet').textContent = state.enemy
      ? `${state.enemy.ships.filter((ship) => !ship.sunk).length} / 5 ships afloat` : '';
    updateTabStop();
    placement.render(state);
  }

  function recordShot() {
    const state = game.getView();
    const report = document.createElement('li');
    report.textContent = `${playerName(state.mode, state.latest.actor)} → ${coordinate(...state.latest.position)}: ${state.latest.outcome}.`;
    reports.prepend(report);
    while (reports.children.length > 4) reports.lastElementChild.remove();
  }

  function focusCurrentPhase() {
    const { phase } = game.getView();
    if (phase === 'handoff') ready.focus();
    else if (phase === 'setup') randomize.focus();
    else enemyCells[focusIndex].focus();
  }

  function reset(selectedMode = game.getView().mode) {
    if (pendingTurn !== null) clearTimeout(pendingTurn);
    pendingTurn = null;
    session += 1;
    game.prepare({ mode: selectedMode });
    placement.reset();
    focusIndex = 0;
    reports.replaceChildren();
    render();
    focusCurrentPhase();
  }

  function scheduleComputerTurn() {
    if (pendingTurn !== null || game.getView().phase !== 'computer-turn') return;
    const scheduledSession = session;
    pendingTurn = setTimeout(() => {
      if (scheduledSession !== session) return;
      pendingTurn = null;
      if (game.getView().phase !== 'computer-turn') return;
      game.computerTurn();
      recordShot();
      render();
    }, 550);
  }

  const placement = mountPlacement({
    game, cells: humanCells, onChange: render,
    announce: (message) => { status.textContent = message; },
  });
  randomize.addEventListener('click', () => {
    if (game.getView().phase !== 'setup') return;
    game.randomizeFleet();
    placement.reset();
    render();
    status.textContent = 'Fleet randomized. Review your ships, then confirm your fleet.';
  });
  start.addEventListener('click', () => {
    if (game.getView().phase !== 'setup') return;
    game.start();
    render();
    focusCurrentPhase();
  });
  ready.addEventListener('click', () => {
    if (game.getView().phase !== 'handoff') return;
    game.ready();
    placement.reset();
    focusIndex = 0;
    render();
    focusCurrentPhase();
  });
  mode.addEventListener('change', () => { reset(mode.value); });
  restart.addEventListener('click', () => { reset(); });
  enemyBoard.addEventListener('focusin', (event) => {
    const index = enemyCells.indexOf(event.target);
    if (index < 0) return;
    focusIndex = index;
    updateTabStop();
  });
  enemyBoard.addEventListener('keydown', (event) => {
    const index = enemyCells.indexOf(event.target);
    if (index < 0 || ['setup', 'handoff'].includes(game.getView().phase)) return;
    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);
    const destinations = {
      ArrowLeft: y * BOARD_SIZE + Math.max(0, x - 1),
      ArrowRight: y * BOARD_SIZE + Math.min(BOARD_SIZE - 1, x + 1),
      ArrowUp: Math.max(0, y - 1) * BOARD_SIZE + x,
      ArrowDown: Math.min(BOARD_SIZE - 1, y + 1) * BOARD_SIZE + x,
      Home: y * BOARD_SIZE,
      End: y * BOARD_SIZE + BOARD_SIZE - 1,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    focusIndex = destinations[event.key];
    updateTabStop();
    enemyCells[focusIndex].focus();
  });
  enemyBoard.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const { phase } = game.getView();
    if (!button || button.getAttribute('aria-disabled') === 'true' ||
        !['human-turn', 'second-player-turn'].includes(phase)) return;
    const position = [Number(button.dataset.x), Number(button.dataset.y)];
    const result = phase === 'human-turn' ? game.humanAttack(position) : game.secondPlayerAttack(position);
    if (result.outcome === 'already-attacked') return;
    recordShot();
    render();
    if (game.getView().phase === 'handoff') ready.focus();
    scheduleComputerTurn();
  });
  render();
}
