import { BOARD_SIZE } from './gameboard.js';

const coordinate = (x, y) => `${String.fromCharCode(65 + x)}${y + 1}`;

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
    // Unattacked enemy ships never contribute attributes, labels or markup.
    const visibleShip = cell.ship !== null && (reveal || sunk);
    const appearance = sunk ? 'sunk' : cell.shot || (visibleShip ? 'ship' : 'water');
    element.className = `cell ${appearance}`;
    element.textContent = appearance === 'sunk' ? '×' : appearance === 'hit' ? '×' : appearance === 'miss' ? '·' : visibleShip ? '■' : '';
    const description = appearance === 'water' ? 'untried' : appearance;
    element.setAttribute('aria-label', `${coordinate(x, y)}: ${description}`);
    if (element.tagName === 'BUTTON') element.disabled = !active || cell.shot !== null;
  });
}

export default function mountGame(game) {
  const humanCells = createBoard(document.querySelector('#human-board'), false);
  const enemyCells = createBoard(document.querySelector('#enemy-board'), true);
  const status = document.querySelector('#status');
  const start = document.querySelector('#start');
  const restart = document.querySelector('#restart');
  const reports = document.querySelector('#reports');

  function render() {
    const state = game.getSnapshot();
    renderBoard(humanCells, state.human, true, false);
    renderBoard(enemyCells, state.computer, state.phase === 'game-over', state.phase === 'human-turn');
    start.disabled = state.phase !== 'setup';
    document.querySelector('#phase').textContent = state.phase.replaceAll('-', ' ');
    document.querySelector('#enemy-note').textContent = state.phase === 'game-over' ? 'Enemy fleet revealed' : 'Enemy fleet concealed';
    status.textContent = state.phase === 'setup' ? 'Your fleet is ready. Start the game to fire first.'
      : state.phase === 'game-over' ? state.winner === 'human' ? 'Victory! You sank the enemy fleet.' : 'Defeat. The computer sank your fleet.'
        : state.phase === 'human-turn' ? 'Your turn. Choose a square in enemy waters.' : 'Computer turn.';
    document.querySelector('#human-fleet').textContent = `${state.human.ships.filter((ship) => !ship.sunk).length} / 5 ships afloat`;
    document.querySelector('#enemy-fleet').textContent = `${state.computer.ships.filter((ship) => !ship.sunk).length} / 5 ships afloat`;
  }

  function recordShot() {
    const { latest } = game.getSnapshot();
    const report = document.createElement('li');
    report.textContent = `${latest.actor === 'human' ? 'You' : 'Computer'} → ${coordinate(...latest.position)}: ${latest.outcome}.`;
    reports.prepend(report);
    while (reports.children.length > 4) reports.lastElementChild.remove();
  }

  start.addEventListener('click', () => { game.start(); render(); });
  restart.addEventListener('click', () => {
    game.prepare();
    reports.replaceChildren();
    render();
  });
  document.querySelector('#enemy-board').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || game.getSnapshot().phase !== 'human-turn') return;
    const result = game.humanAttack([Number(button.dataset.x), Number(button.dataset.y)]);
    if (result.outcome === 'already-attacked') return;
    recordShot();
    render();
    if (game.getSnapshot().phase === 'computer-turn') {
      game.computerTurn();
      recordShot();
      render();
    }
  });
  render();
}
