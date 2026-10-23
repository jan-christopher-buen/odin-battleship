import Game from './game.js';
import Gameboard from './gameboard.js';

const fleet = () => {
  const board = new Gameboard();
  [5, 4, 3, 3, 2].forEach((length, y) => board.placeShip(length, [0, y], 'horizontal'));
  return board;
};
const makeGame = () => new Game({ createBoard: fleet, random: () => 0.999 });
const occupied = () => [5, 4, 3, 3, 2].flatMap((length, y) =>
  Array.from({ length }, (_, x) => [x, y]));

test('setup blocks attacks, starts with complete fleets and human first', () => {
  const game = makeGame();
  expect(game.getSnapshot().phase).toBe('setup');
  expect(game.getSnapshot().winner).toBeNull();
  expect(() => game.humanAttack([0, 0])).toThrow(/phase/i);
  expect(() => game.computerTurn()).toThrow(/phase/i);
  game.start();
  expect(game.getSnapshot().phase).toBe('human-turn');
  expect(() => game.start()).toThrow(/phase/i);
  expect(() => game.computerTurn()).toThrow(/phase/i);
});

test('starting rejects incomplete, wrong-length, or already attacked fleets', () => {
  for (const createBoard of [
    () => new Gameboard(),
    () => { const board = new Gameboard(); board.placeShip(1, [0, 0], 'horizontal'); return board; },
    () => { const board = fleet(); board.receiveAttack([9, 9]); return board; },
  ]) {
    const game = new Game({ createBoard });
    expect(() => game.start()).toThrow(/fleet/i);
    expect(game.getSnapshot().phase).toBe('setup');
  }
});

test('valid hits and misses alternate; duplicate and invalid shots preserve state', () => {
  const game = makeGame();
  game.start();
  for (const [position, outcome] of [[[0, 0], 'hit'], [[9, 9], 'miss']]) {
    expect(game.humanAttack(position)).toEqual({ outcome });
    expect(game.getSnapshot().phase).toBe('computer-turn');
    expect(() => game.humanAttack([1, 0])).toThrow(/phase/i);
    const response = game.computerTurn();
    expect(response.outcome).toBe('miss');
    expect(game.getSnapshot().phase).toBe('human-turn');
    const before = game.getSnapshot();
    expect(game.humanAttack(position)).toEqual({ outcome: 'already-attacked' });
    expect(() => game.humanAttack([10, 0])).toThrow();
    expect(game.getSnapshot()).toEqual(before);
  }
  expect(game.getSnapshot().human.cells[9][9].shot).toBe('miss');
  expect(game.getSnapshot().human.cells[9][8].shot).toBe('miss');
});

test('human victory ends immediately and prevents every further attack', () => {
  const game = makeGame();
  game.start();
  const targets = occupied();
  targets.forEach((position, index) => {
    game.humanAttack(position);
    if (index < targets.length - 1) game.computerTurn();
  });
  expect(game.getSnapshot().phase).toBe('game-over');
  expect(game.getSnapshot().winner).toBe('human');
  expect(game.getSnapshot().latest).toEqual({ actor: 'human', position: [1, 4], outcome: 'sunk' });
  const before = game.getSnapshot();
  expect(() => game.computerTurn()).toThrow();
  expect(() => game.humanAttack([9, 8])).toThrow();
  expect(() => game.start()).toThrow();
  expect(game.getSnapshot()).toEqual(before);
});

test('computer victory ends immediately, and restart creates fresh setup state', () => {
  const game = new Game({ createBoard: fleet, random: () => 0 });
  game.start();
  const water = Array.from({ length: 100 }, (_, index) => [index % 10, Math.floor(index / 10)])
    .filter(([x, y]) => y >= 5 || x >= [5, 4, 3, 3, 2][y]);
  for (const position of water) {
    if (game.getSnapshot().phase === 'game-over') break;
    game.humanAttack(position);
    game.computerTurn();
  }
  expect(game.getSnapshot().winner).toBe('computer');
  expect(game.getSnapshot().phase).toBe('game-over');
  expect(() => game.humanAttack([9, 9])).toThrow();
  expect(() => game.computerTurn()).toThrow();
  game.prepare();
  const state = game.getSnapshot();
  expect(state.phase).toBe('setup');
  expect(state.winner).toBeNull();
  expect(state.latest).toBeNull();
  expect(state.human.ships.map((ship) => ship.hits)).toEqual([0, 0, 0, 0, 0]);
  expect(state.human.cells.flat().every((cell) => cell.shot === null)).toBe(true);
  game.start();
  game.humanAttack([9, 9]);
  expect(game.computerTurn().position).toEqual([0, 0]);
});

test('preparing during a turn resets both boards and returns independent snapshots', () => {
  const game = makeGame();
  game.start();
  game.humanAttack([0, 0]);
  game.prepare();
  const state = game.getSnapshot();
  state.human.ships.pop();
  state.computer.cells[0][0].shot = 'hit';
  expect(game.getSnapshot().human.ships).toHaveLength(5);
  expect(game.getSnapshot().computer.cells[0][0].shot).toBeNull();
  expect(game.getSnapshot().phase).toBe('setup');
});

test('controller permits ship repositioning and randomization only during setup', () => {
  const game = makeGame();
  game.moveShip(0, [5, 0], 'vertical');
  expect(game.getSnapshot().human.ships[0].cells).toEqual([[5, 0], [5, 1], [5, 2], [5, 3], [5, 4]]);
  game.randomizeFleet();
  expect(game.getSnapshot().human).toEqual(fleet().getSnapshot());
  game.start();
  const before = game.getSnapshot();
  expect(() => game.moveShip(0, [5, 0], 'vertical')).toThrow(/phase/i);
  expect(() => game.randomizeFleet()).toThrow(/phase/i);
  expect(game.getSnapshot()).toEqual(before);
});

test('computer turn results feed adjacent targeting in the controller', () => {
  const centeredFleet = () => {
    const board = new Gameboard();
    board.placeShip(5, [4, 4], 'horizontal');
    [4, 3, 3, 2].forEach((length, y) => board.placeShip(length, [0, y], 'horizontal'));
    return board;
  };
  const game = new Game({ createBoard: centeredFleet, random: () => 0.44 });
  game.start();
  game.humanAttack([9, 9]);
  expect(game.computerTurn()).toEqual({ position: [4, 4], outcome: 'hit' });
  game.humanAttack([9, 8]);
  expect(game.computerTurn()).toEqual({ position: [5, 4], outcome: 'hit' });
});

test('the single-player view exposes hit and sunk markers without hidden enemy placement', () => {
  const game = makeGame();
  expect(game.getView().enemy.cells.flat().every((cell) => cell.ship === null)).toBe(true);
  game.start();
  game.humanAttack([0, 4]);
  expect(game.getView().enemy.cells[4][0]).toEqual({ ship: null, shot: 'hit' });
  game.computerTurn();
  game.humanAttack([1, 4]);
  expect(game.getView().enemy.cells[4][0]).toEqual({ ship: null, shot: 'sunk' });
  expect(game.getView().enemy.cells[4][1]).toEqual({ ship: null, shot: 'sunk' });
  expect(game.getView().enemy.ships[4]).toEqual({ sunk: true });
  expect(game.getView().enemy.ships[0]).not.toHaveProperty('cells');
});
