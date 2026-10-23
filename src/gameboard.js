import Ship from './ship.js';

export const BOARD_SIZE = 10;

function validatePosition(position) {
  if (!Array.isArray(position) || position.length !== 2 ||
      !position.every((value) => Number.isInteger(value) && value >= 0 && value < BOARD_SIZE)) {
    throw new RangeError('Coordinates must be [x, y] integers from 0 through 9.');
  }
}

export default class Gameboard {
  #ships = [];
  #cells = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ ship: null, shot: null })));
  #attackCount = 0;

  placeShip(length, start, orientation) {
    if (this.#attackCount > 0) throw new Error('Cannot place ships after attacks begin.');
    validatePosition(start);
    if (!['horizontal', 'vertical'].includes(orientation)) {
      throw new TypeError('Orientation must be horizontal or vertical.');
    }
    const ship = new Ship(length);
    const cells = Array.from({ length }, (_, offset) => [
      start[0] + (orientation === 'horizontal' ? offset : 0),
      start[1] + (orientation === 'vertical' ? offset : 0),
    ]);
    cells.forEach((position) => {
      validatePosition(position);
      if (this.#cells[position[1]][position[0]].ship !== null) {
        throw new Error('Ships cannot overlap.');
      }
    });
    const id = this.#ships.length;
    this.#ships.push({ ship, cells });
    cells.forEach(([x, y]) => { this.#cells[y][x].ship = id; });
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
