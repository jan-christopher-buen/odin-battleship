import Gameboard, { BOARD_SIZE } from './gameboard.js';

export default class Player {
  #type;
  #board;
  #random;
  #targets = [];

  constructor(type, random = Math.random, board = new Gameboard()) {
    if (!['human', 'computer'].includes(type)) throw new TypeError('Unsupported player type.');
    this.#type = type;
    this.#random = random;
    this.#board = board;
  }

  get type() { return this.#type; }
  get board() { return this.#board; }

  recordAttack([x, y], outcome) {
    if (outcome === 'sunk') this.#targets = [];
    if (outcome !== 'hit') return;
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
      .filter(([cx, cy]) => cx >= 0 && cx < BOARD_SIZE && cy >= 0 && cy < BOARD_SIZE);
    this.#targets = [...neighbors, ...this.#targets];
  }

  chooseAttack(targetBoard) {
    if (this.#type !== 'computer') throw new Error('Only computer players select automatic attacks.');
    this.#targets = this.#targets.filter((position) => !targetBoard.hasReceivedAttack(position));
    if (this.#targets.length > 0) return [...this.#targets[0]];
    const remaining = [];
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        if (!targetBoard.hasReceivedAttack([x, y])) remaining.push([x, y]);
      }
    }
    if (remaining.length === 0) return null;
    const value = this.#random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('Random function must return a number in [0, 1).');
    }
    return remaining[Math.floor(value * remaining.length)];
  }
}
