import Ship from './ship.js';

export const BOARD_SIZE = 10;

function validatePosition(position) {
  if (!Array.isArray(position) || position.length !== 2 ||
      ![position[0], position[1]].every((value) => Number.isInteger(value) && value >= 0 && value < BOARD_SIZE)) {
    throw new RangeError('Coordinates must be [x, y] integers from 0 through 9.');
  }
}

export default class Gameboard {
  #ships = [];
  #cells = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ ship: null, shot: null })));
  #attackCount = 0;

  placeShip(length, start, orientation) {
    this.#requireSetup();
    const ship = new Ship(length);
    const cells = this.#placementCells(length, start, orientation);
    const id = this.#ships.length;
    this.#ships.push({ ship, cells });
    cells.forEach(([x, y]) => { this.#cells[y][x].ship = id; });
  }

  moveShip(id, start, orientation) {
    this.#requireSetup();
    if (!Number.isInteger(id) || id < 0 || id >= this.#ships.length) {
      throw new RangeError('Ship index must identify a placed ship.');
    }
    const entry = this.#ships[id];
    const cells = this.#placementCells(entry.ship.length, start, orientation, id);
    // Validate the complete move first, including overlap with other ships.
    entry.cells.forEach(([x, y]) => { this.#cells[y][x].ship = null; });
    entry.cells = cells;
    cells.forEach(([x, y]) => { this.#cells[y][x].ship = id; });
  }

  #requireSetup() {
    if (this.#attackCount > 0) throw new Error('Cannot place or move ships after attacks begin.');
  }

  #placementCells(length, start, orientation, ignoredShip = null) {
    validatePosition(start);
    if (!['horizontal', 'vertical'].includes(orientation)) {
      throw new TypeError('Orientation must be horizontal or vertical.');
    }
    const cells = Array.from({ length }, (_, offset) => [
      start[0] + (orientation === 'horizontal' ? offset : 0),
      start[1] + (orientation === 'vertical' ? offset : 0),
    ]);
    cells.forEach((position) => {
      validatePosition(position);
      const occupant = this.#cells[position[1]][position[0]].ship;
      if (occupant !== null && occupant !== ignoredShip) throw new Error('Ships cannot overlap.');
    });
    return cells;
  }

  receiveAttack(position) {
    validatePosition(position);
    const [x, y] = position;
    const cell = this.#cells[y][x];
    if (cell.shot !== null) return { outcome: 'already-attacked' };
    this.#attackCount += 1;
    if (cell.ship === null) {
      cell.shot = 'miss';
      return { outcome: 'miss' };
    }
    const { ship } = this.#ships[cell.ship];
    ship.hit();
    cell.shot = 'hit';
    return { outcome: ship.isSunk() ? 'sunk' : 'hit' };
  }

  hasReceivedAttack(position) {
    validatePosition(position);
    return this.#cells[position[1]][position[0]].shot !== null;
  }

  allShipsSunk() {
    return this.#ships.length > 0 && this.#ships.every(({ ship }) => ship.isSunk());
  }

  getSnapshot() {
    return {
      cells: this.#cells.map((row) => row.map((cell) => ({ ...cell }))),
      ships: this.#ships.map(({ ship, cells }) => ({
        length: ship.length,
        hits: ship.hits,
        sunk: ship.isSunk(),
        cells: cells.map((position) => [...position]),
      })),
    };
  }
}
