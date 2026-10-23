import { BOARD_SIZE } from './gameboard.js';
import mountPlacement from './placement-dom.js';

const coordinate = (x, y) => `${String.fromCharCode(65 + x)}${y + 1}`;
const phaseLabels = {
  setup: '01 / Deploy your fleet',
  'human-turn': '02 / Your move',
  'computer-turn': '02 / Incoming signal',
  'game-over': '03 / Mission complete',
};

function createBoard(container, interactive) {
  const cells = [];
  for (let y = -1; y < BOARD_SIZE; y += 1) {
    for (let x = -1; x < BOARD_SIZE; x += 1) {
      const element = document.createElement(interactive && x >= 0 && y >= 0 ? 'button' : 'span');
      if (x < 0 || y < 0) {
        element.className = 'axis';
        element.textContent = y < 0 && x >= 0 ? String.fromCharCode(65 + x) : x < 0 && y >= 0 ? y + 1 : '';
        element.setAttribute('aria-hidden', 'true');
      } else {
        element.className = 'cell';
        if (interactive) {
          element.type = 'button';
          element.dataset.x = x;
          element.dataset.y = y;
          element.tabIndex = -1;
        } else {
          element.setAttribute('role', 'img');
        }
        cells.push(element);
      }
      container.append(element);
    }
  }
  return cells;
}

function renderBoard(elements, board, reveal, active) {
  elements.forEach((element, index) => {
    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);
    const cell = board.cells[y][x];
    const sunk = cell.ship !== null && board.ships[cell.ship].sunk;
    // Hidden enemy ship data never contributes attributes, labels or markup.
    const visibleShip = cell.ship !== null && (reveal || sunk);
    const appearance = sunk ? 'sunk' : cell.shot || (visibleShip ? 'ship' : 'water');
    element.className = `cell ${appearance}`;
    element.textContent = appearance === 'sunk' ? '⊗' : appearance === 'hit' ? '×'
      : appearance === 'miss' ? '•' : visibleShip ? '■' : '';
    const description = appearance === 'water' ? reveal ? 'water' : 'untried' : appearance;
    element.setAttribute('aria-label', `${coordinate(x, y)}: ${description}`);
    if (element.tagName === 'BUTTON') {
      // Keep the focused square available for inspection while input is locked.
      element.setAttribute('aria-disabled', String(!active || cell.shot !== null));
    }
  });
}

export default function mountGame(game) {
  const enemyBoard = document.querySelector('#enemy-board');
  const humanCells = createBoard(document.querySelector('#human-board'), true);
  const enemyCells = createBoard(enemyBoard, true);
  const status = document.querySelector('#status');
  const start = document.querySelector('#start');
  const restart = document.querySelector('#restart');
  const randomize = document.querySelector('#randomize');
  const reports = document.querySelector('#reports');
  let focusIndex = 0;
  let pendingTurn = null;
  let session = 0;

  function updateTabStop() {
    const inspectable = game.getSnapshot().phase !== 'setup';
    enemyCells.forEach((cell, index) => {
      cell.tabIndex = inspectable && index === focusIndex ? 0 : -1;
    });
  }

  function render() {
    const state = game.getSnapshot();
    renderBoard(humanCells, state.human, true, state.phase === 'setup');
    renderBoard(enemyCells, state.computer, state.phase === 'game-over', state.phase === 'human-turn');
    start.disabled = state.phase !== 'setup';
    randomize.disabled = state.phase !== 'setup';
    document.querySelector('#phase').textContent = phaseLabels[state.phase];
    document.querySelector('#enemy-note').textContent = state.phase === 'game-over'
      ? 'Mission ended · enemy fleet revealed' : 'Uncharted waters · enemy fleet concealed';
    let message = 'Review your ships. Randomize your fleet, or start the game to fire first.';
    if (state.phase === 'game-over') {
      message = state.winner === 'human' ? 'Victory! You sank the enemy fleet. Start a new game to play again.'
        : 'Defeat. The computer sank your fleet. Start a new game to try again.';
    } else if (state.phase === 'human-turn') {
      message = 'Your turn. Choose a square in enemy waters.';
    } else if (state.phase === 'computer-turn') {
      message = 'Computer turn. Awaiting the incoming shot…';
    }
    if (state.latest) {
      message = `${state.latest.actor === 'human' ? 'You' : 'Computer'} fired at ${coordinate(...state.latest.position)}: ${state.latest.outcome}. ${message}`;
    }
    status.textContent = message;
    document.querySelector('#human-fleet').textContent = `${state.human.ships.filter((ship) => !ship.sunk).length} / 5 ships afloat`;
    document.querySelector('#enemy-fleet').textContent = `${state.computer.ships.filter((ship) => !ship.sunk).length} / 5 ships afloat`;
    updateTabStop();
    placement.render({ phase: state.phase, own: state.human });
  }

  function recordShot() {
    const { latest } = game.getSnapshot();
    const report = document.createElement('li');
    report.textContent = `${latest.actor === 'human' ? 'You' : 'Computer'} → ${coordinate(...latest.position)}: ${latest.outcome}.`;
    reports.prepend(report);
    while (reports.children.length > 4) reports.lastElementChild.remove();
  }

  function reset() {
    if (pendingTurn !== null) clearTimeout(pendingTurn);
    pendingTurn = null;
    session += 1;
    game.prepare();
    placement.reset();
    focusIndex = 0;
    reports.replaceChildren();
    render();
  }

  function scheduleComputerTurn() {
    if (pendingTurn !== null || game.getSnapshot().phase !== 'computer-turn') return;
    const scheduledSession = session;
    pendingTurn = setTimeout(() => {
      if (scheduledSession !== session) return;
      pendingTurn = null;
      if (game.getSnapshot().phase !== 'computer-turn') return;
      game.computerTurn();
      recordShot();
      render();
    }, 550);
  }

  const placement = mountPlacement({ game, cells: humanCells, onChange: render, announce: (message) => { status.textContent = message; } });

  randomize.addEventListener('click', () => {
    if (game.getSnapshot().phase !== 'setup') return;
    game.randomizeFleet();
    placement.reset();
    render();
    status.textContent = 'Fleet randomized. Review your ships, then start the game.';
  });
  start.addEventListener('click', () => {
    if (game.getSnapshot().phase !== 'setup') return;
    game.start();
    render();
    enemyCells[focusIndex].focus();
  });
  restart.addEventListener('click', () => {
    reset();
    randomize.focus();
  });
  enemyBoard.addEventListener('focusin', (event) => {
    const index = enemyCells.indexOf(event.target);
    if (index < 0) return;
    focusIndex = index;
    updateTabStop();
  });
  enemyBoard.addEventListener('keydown', (event) => {
    const index = enemyCells.indexOf(event.target);
    if (index < 0 || game.getSnapshot().phase === 'setup') return;
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
    if (!button || button.getAttribute('aria-disabled') === 'true' ||
        game.getSnapshot().phase !== 'human-turn') return;
    const result = game.humanAttack([Number(button.dataset.x), Number(button.dataset.y)]);
    if (result.outcome === 'already-attacked') return;
    recordShot();
    render();
    scheduleComputerTurn();
  });
  render();
}
