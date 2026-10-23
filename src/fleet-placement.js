import Gameboard, { BOARD_SIZE } from './gameboard.js';

export const FLEET_LENGTHS = Object.freeze([5, 4, 3, 3, 2]);

function shuffledCandidates(length, random) {
  const candidates = [];
  for (const orientation of ['horizontal', 'vertical']) {
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const cells = Array.from({ length }, (_, offset) => [
          x + (orientation === 'horizontal' ? offset : 0),
          y + (orientation === 'vertical' ? offset : 0),
        ]);
        if (cells.every(([cx, cy]) => cx < BOARD_SIZE && cy < BOARD_SIZE)) {
          candidates.push({ start: [x, y], orientation, cells });
        }
      }
    }
  }
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('Random function must return a number in [0, 1).');
    }
    const j = Math.floor(value * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates;
}

export default function createRandomBoard(random = Math.random) {
  const candidates = FLEET_LENGTHS.map((length) => shuffledCandidates(length, random));
  const occupied = new Set();
  const placement = [];
  const key = ([x, y]) => y * BOARD_SIZE + x;

  function search(index) {
    if (index === FLEET_LENGTHS.length) return true;
    for (const candidate of candidates[index]) {
      const keys = candidate.cells.map(key);
      if (keys.some((cell) => occupied.has(cell))) continue;
      keys.forEach((cell) => occupied.add(cell));
      placement.push(candidate);
      if (search(index + 1)) return true;
      placement.pop();
      keys.forEach((cell) => occupied.delete(cell));
    }
    return false;
  }

  if (!search(0)) throw new Error('Unable to place a complete fleet.');
  const board = new Gameboard();
  placement.forEach(({ start, orientation }, index) => {
    board.placeShip(FLEET_LENGTHS[index], start, orientation);
  });
  return board;
}
