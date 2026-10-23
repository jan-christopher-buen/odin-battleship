export default class Ship {
  #length;
  #hits = 0;

  constructor(length) {
    if (!Number.isInteger(length) || length < 1 || length > 10) {
      throw new RangeError('Ship length must be an integer from 1 through 10.');
    }
    this.#length = length;
  }

  get length() { return this.#length; }
  get hits() { return this.#hits; }

  hit() {
    if (!this.isSunk()) this.#hits += 1;
  }

  isSunk() { return this.#hits === this.#length; }
}
