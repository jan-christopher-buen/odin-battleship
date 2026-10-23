import Gameboard from './gameboard.js';

const at = (board, x, y) => board.getSnapshot().cells[y][x];

describe('Gameboard placement', () => {
  test('places horizontal and vertical ships at edges, allowing adjacency', () => {
    const board = new Gameboard();
    board.placeShip(3, [7, 9], 'horizontal');
    board.placeShip(2, [9, 7], 'vertical');
    expect(board.getSnapshot().ships.map((ship) => ship.cells)).toEqual([
      [[7, 9], [8, 9], [9, 9]], [[9, 7], [9, 8]],
    ]);
    expect(at(board, 9, 9)).toEqual({ ship: 0, shot: null });
    expect(at(board, 0, 0)).toEqual({ ship: null, shot: null });
  });
  test.each([
    [3, [8, 0], 'horizontal'], [3, [0, 8], 'vertical'],
    [2, [-1, 0], 'horizontal'], [2, [10, 0], 'horizontal'],
    [2, [0.5, 0], 'horizontal'], [2, [0], 'horizontal'],
    [2, [0, 0, 0], 'horizontal'], [2, null, 'horizontal'],
    [2, ['0', 0], 'horizontal'], [2, [0, 0], 'diagonal'],
    [0, [0, 0], 'horizontal'], [11, [0, 0], 'horizontal'],
    [1.5, [0, 0], 'horizontal'],
  ])('rejects invalid placement atomically: %p %p %p', (length, start, orientation) => {
    const board = new Gameboard();
    board.placeShip(2, [3, 3], 'horizontal');
    const before = board.getSnapshot();
    expect(() => board.placeShip(length, start, orientation)).toThrow();
    expect(board.getSnapshot()).toEqual(before);
  });
  test('rejects overlap before changing state', () => {
    const board = new Gameboard();
    board.placeShip(3, [1, 1], 'horizontal');
    const before = board.getSnapshot();
    expect(() => board.placeShip(3, [2, 0], 'vertical')).toThrow(/overlap/i);
    expect(board.getSnapshot()).toEqual(before);
  });
});

describe('Gameboard attacks and snapshots', () => {
  let board;
  beforeEach(() => {
    board = new Gameboard();
    board.placeShip(2, [0, 0], 'horizontal');
    board.placeShip(1, [4, 4], 'vertical');
  });
  test('returns miss, hit, sunk and already-attacked results', () => {
    expect(board.receiveAttack([9, 9])).toEqual({ outcome: 'miss' });
    expect(board.receiveAttack([0, 0])).toEqual({ outcome: 'hit' });
    expect(board.receiveAttack([1, 0])).toEqual({ outcome: 'sunk' });
    const before = board.getSnapshot();
    expect(board.receiveAttack([0, 0])).toEqual({ outcome: 'already-attacked' });
    expect(board.receiveAttack([9, 9])).toEqual({ outcome: 'already-attacked' });
    expect(board.getSnapshot()).toEqual(before);
    expect(board.hasReceivedAttack([9, 9])).toBe(true);
    expect(board.hasReceivedAttack([2, 2])).toBe(false);
    expect(at(board, 9, 9).shot).toBe('miss');
    expect(at(board, 0, 0).shot).toBe('hit');
  });
  test('damages the correct ship and requires every ship to sink', () => {
    expect(new Gameboard().allShipsSunk()).toBe(false);
    board.receiveAttack([4, 4]);
    expect(board.getSnapshot().ships.map((ship) => ship.hits)).toEqual([0, 1]);
    expect(board.allShipsSunk()).toBe(false);
    board.receiveAttack([0, 0]);
    board.receiveAttack([1, 0]);
    expect(board.allShipsSunk()).toBe(true);
  });
  test.each([[10, 0], [-1, 0], [0, 0.5], [NaN, 1], [], null])('invalid attacks preserve state: %p', (position) => {
    const before = board.getSnapshot();
    expect(() => board.receiveAttack(position)).toThrow(/coordinate/i);
    expect(() => board.hasReceivedAttack(position)).toThrow(/coordinate/i);
    expect(board.getSnapshot()).toEqual(before);
  });
  test('blocks placement after the first valid attack', () => {
    board.receiveAttack([9, 9]);
    expect(() => board.placeShip(1, [7, 7], 'vertical')).toThrow(/attack/i);
  });
  test('snapshots and caller-owned coordinates cannot mutate board state', () => {
    const position = [5, 5];
    board.placeShip(1, position, 'vertical');
    position[0] = 8;
    const snapshot = board.getSnapshot();
    snapshot.cells[0][0].ship = null;
    snapshot.ships[0].cells[0][0] = 9;
    snapshot.ships[0].hits = 99;
    snapshot.ships.pop();
    expect(at(board, 0, 0).ship).toBe(0);
    expect(at(board, 5, 5).ship).toBe(2);
    expect(board.getSnapshot().ships[0]).toEqual({ length: 2, hits: 0, sunk: false, cells: [[0, 0], [1, 0]] });
    expect(new Gameboard().getSnapshot().ships).toEqual([]);
  });
});

test('rejects sparse coordinate arrays with a clear error before any mutation', () => {
  const board = new Gameboard();
  const position = Array(2);
  const before = board.getSnapshot();
  expect(() => board.receiveAttack(position)).toThrow(/coordinate/i);
  expect(() => board.hasReceivedAttack(position)).toThrow(/coordinate/i);
  expect(() => board.placeShip(2, position, 'horizontal')).toThrow(/coordinate/i);
  expect(board.getSnapshot()).toEqual(before);
});
