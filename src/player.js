import Gameboard, { BOARD_SIZE } from './gameboard.js';

export default class Player {
  #type;
  #board;
  #random;

  constructor(type, random = Math.random, board = new Gameboard()) {
    if (!['human', 'computer'].includes(type)) throw new TypeError('Unsupported player type.');
    this.#type = type;
    this.#random = random;
    this.#board = board;
  }

  get type() { return this.#type; }
  get board() { return this.#board; }

  chooseAttack(targetBoard) {
    if (this.#type !== 'computer') throw new Error('Only computer players select automatic attacks.');
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
