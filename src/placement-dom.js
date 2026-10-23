import { BOARD_SIZE } from './gameboard.js';
import { FLEET_LENGTHS } from './fleet-placement.js';

const names = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];

export default function mountPlacement({ game, cells, onChange, announce }) {
  const board = document.querySelector('#human-board');
  const dock = document.querySelector('#ship-dock');
  const rotate = document.querySelector('#rotate');
  const selection = document.querySelector('#placement-selection');
  let selected = 0;
  let orientation = 'horizontal';
  let focusIndex = 0;
  let dragging = null;
  let currentBoard;
  let enabled = false;
  const buttons = FLEET_LENGTHS.map((length, id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.ship = id;
    button.textContent = `${names[id]} · ${length}`;
    dock.append(button);
    return button;
  });

  function clearDropTarget() {
    cells.forEach((cell) => cell.classList.remove('drop-target'));
  }

  function render({ phase, own }) {
    enabled = phase === 'setup';
    currentBoard = own;
    document.querySelector('#placement').hidden = !enabled;
    buttons.forEach((button, id) => {
      button.disabled = !enabled;
      button.draggable = enabled;
      button.setAttribute('aria-pressed', String(id === selected));
    });
    rotate.disabled = !enabled;
    rotate.textContent = `Rotate: ${orientation}`;
    selection.textContent = `${names[selected]} (${FLEET_LENGTHS[selected]} squares) · next placement: ${orientation}`;
    cells.forEach((cell, index) => {
      cell.tabIndex = enabled && index === focusIndex ? 0 : -1;
      cell.draggable = enabled && own.cells[Math.floor(index / BOARD_SIZE)][index % BOARD_SIZE].ship !== null;
    });
    if (!enabled) dragging = null;
  }

  function changeOrientation() {
    if (!enabled) return;
    orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
    onChange();
    announce(`${names[selected]} will be placed ${orientation}. Choose its starting square.`);
  }

  function move(position) {
    if (!enabled) return;
    try {
      game.moveShip(selected, position, orientation);
      onChange();
      announce(`${names[selected]} placed at ${String.fromCharCode(65 + position[0])}${position[1] + 1}, ${orientation}.`);
    } catch (error) {
      announce(`Placement unchanged. ${error.message}`);
    }
  }

  dock.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !enabled) return;
    selected = Number(button.dataset.ship);
    onChange();
    announce(`${names[selected]} selected. Drag it, or choose a starting square on your board.`);
  });
  rotate.addEventListener('click', changeOrientation);
  board.addEventListener('click', (event) => {
    const index = cells.indexOf(event.target);
    if (index < 0) return;
    move([index % BOARD_SIZE, Math.floor(index / BOARD_SIZE)]);
  });
  board.addEventListener('focusin', (event) => {
    const index = cells.indexOf(event.target);
    if (index < 0 || !enabled) return;
    focusIndex = index;
    cells.forEach((cell, cellIndex) => { cell.tabIndex = cellIndex === index ? 0 : -1; });
  });
  board.addEventListener('keydown', (event) => {
    const index = cells.indexOf(event.target);
    if (index < 0 || !enabled) return;
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      changeOrientation();
      return;
    }
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
    cells[destinations[event.key]].focus();
  });

  function beginDrag(event, id, offset) {
    if (!enabled) { event.preventDefault(); return; }
    selected = id;
    dragging = { offset };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', names[id]);
    // Update only selection controls: rendering the dragged cell can cancel native dragging.
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
    selection.textContent = `Dragging ${names[selected]} · ${orientation}`;
  }
  dock.addEventListener('dragstart', (event) => {
    const button = event.target.closest('button');
    if (button) beginDrag(event, Number(button.dataset.ship), 0);
  });
  board.addEventListener('dragstart', (event) => {
    const index = cells.indexOf(event.target);
    if (index < 0 || !enabled) { event.preventDefault(); return; }
    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);
    const id = currentBoard.cells[y][x].ship;
    if (id === null) { event.preventDefault(); return; }
    const ship = currentBoard.ships[id];
    orientation = ship.cells[0][1] === ship.cells[1][1] ? 'horizontal' : 'vertical';
    const offset = ship.cells.findIndex(([cx, cy]) => cx === x && cy === y);
    beginDrag(event, id, offset);
    rotate.textContent = `Rotate: ${orientation}`;
  });
  board.addEventListener('dragover', (event) => {
    if (!enabled || dragging === null || !cells.includes(event.target)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearDropTarget();
    event.target.classList.add('drop-target');
  });
  board.addEventListener('drop', (event) => {
    if (!enabled || dragging === null) return;
    event.preventDefault();
    const index = cells.indexOf(event.target);
    if (index >= 0) {
      const x = index % BOARD_SIZE - (orientation === 'horizontal' ? dragging.offset : 0);
      const y = Math.floor(index / BOARD_SIZE) - (orientation === 'vertical' ? dragging.offset : 0);
      move([x, y]);
    }
    dragging = null;
    clearDropTarget();
  });
  function endDrag() { dragging = null; clearDropTarget(); }
  board.addEventListener('dragend', endDrag);
  dock.addEventListener('dragend', endDrag);

  return {
    render,
    reset() { selected = 0; orientation = 'horizontal'; focusIndex = 0; endDrag(); },
  };
}
