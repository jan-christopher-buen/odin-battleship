import Game from './game.js';
import Gameboard from './gameboard.js';

function fleet() {
  const board = new Gameboard();
  [5, 4, 3, 3, 2].forEach((length, y) => board.placeShip(length, [0, y], 'horizontal'));
  return board;
}
const localGame = () => new Game({ mode: 'local', createBoard: fleet });
function startBoth(game) {
  game.ready();
  game.start();
  game.ready();
  game.start();
  game.ready();
}

test('local setup requires handoffs before each player can privately arrange a fleet', () => {
  const game = localGame();
  expect(game.getView()).toMatchObject({ phase: 'handoff', pendingPlayer: 'human', own: null, enemy: null });
  expect(() => game.start()).toThrow(/phase/i);
  expect(() => game.moveShip(0, [5, 0], 'vertical')).toThrow(/phase/i);
  game.ready();
  expect(game.getView()).toMatchObject({ phase: 'setup', viewer: 'human' });
  game.moveShip(0, [5, 0], 'vertical');
  const firstFleet = game.getSnapshot().human;
  game.start();
  expect(game.getView()).toMatchObject({ phase: 'handoff', pendingPlayer: 'computer', own: null, enemy: null });
  expect(() => game.humanAttack([0, 0])).toThrow(/phase/i);
  game.ready();
  expect(game.getView().own).toEqual(fleet().getSnapshot());
  game.moveShip(0, [6, 0], 'vertical');
  expect(game.getSnapshot().human).toEqual(firstFleet);
  expect(game.getSnapshot().computer.ships[0].cells[0]).toEqual([6, 0]);
  game.randomizeFleet();
  expect(game.getSnapshot().human).toEqual(firstFleet);
  expect(game.getSnapshot().computer).toEqual(fleet().getSnapshot());
  game.start();
  expect(game.getView()).toMatchObject({ phase: 'handoff', pendingPlayer: 'human' });
  game.ready();
  expect(game.getView()).toMatchObject({ phase: 'human-turn', viewer: 'human' });
  expect(() => game.ready()).toThrow(/phase/i);
  expect(() => game.computerTurn()).toThrow(/phase|mode/i);
});

test('valid local shots force a pass-device screen; duplicates and invalid shots preserve the turn', () => {
  const game = localGame();
  startBoth(game);
  expect(game.humanAttack([0, 0])).toEqual({ outcome: 'hit' });
  expect(game.getView()).toMatchObject({ phase: 'handoff', pendingPlayer: 'computer', own: null, enemy: null });
  expect(() => game.secondPlayerAttack([0, 0])).toThrow(/phase/i);
  expect(() => game.computerTurn()).toThrow();
  game.ready();
  expect(game.getView()).toMatchObject({ phase: 'second-player-turn', viewer: 'computer' });
  expect(game.getView().own.cells[0][0].shot).toBe('hit');
  expect(() => game.humanAttack([9, 9])).toThrow(/phase/i);
  expect(game.secondPlayerAttack([9, 9])).toEqual({ outcome: 'miss' });
  game.ready();
  const before = game.getSnapshot();
  expect(game.humanAttack([0, 0])).toEqual({ outcome: 'already-attacked' });
  expect(() => game.humanAttack([10, 0])).toThrow();
  expect(game.getSnapshot()).toEqual(before);
});

test.each(['human', 'computer'])('either local player can win without another handoff: %s', (winner) => {
  const game = localGame();
  startBoth(game);
  const targets = [5, 4, 3, 3, 2].flatMap((length, y) => Array.from({ length }, (_, x) => [x, y]));
  targets.forEach((target, turn) => {
    game.humanAttack(winner === 'human' ? target : [turn % 10, 7 + Math.floor(turn / 10)]);
    if (game.getSnapshot().phase === 'game-over') return;
    game.ready();
    game.secondPlayerAttack(winner === 'computer' ? target : [turn % 10, 7 + Math.floor(turn / 10)]);
    if (game.getSnapshot().phase !== 'game-over') game.ready();
  });
  expect(game.getView()).toMatchObject({ phase: 'game-over', winner });
  expect(game.getView().enemy.ships[0].cells.length).toBe(5);
  expect(() => game.humanAttack([9, 9])).toThrow();
  expect(() => game.secondPlayerAttack([9, 9])).toThrow();
  expect(() => game.ready()).toThrow();
});

test('a view contains no unobserved enemy locations or board data during a handoff', () => {
  const game = localGame();
  game.ready();
  const view = game.getView();
  expect(view.enemy.cells.flat().every((cell) => cell.ship === null)).toBe(true);
  expect(view.enemy.ships).toEqual(Array.from({ length: 5 }, () => ({ sunk: false })));
  expect(view).not.toHaveProperty('human');
  expect(view).not.toHaveProperty('computer');
  view.own.cells[0][0].ship = null;
  expect(game.getView().own.cells[0][0].ship).toBe(0);
  game.start();
  expect(game.getView().own).toBeNull();
  expect(game.getView().enemy).toBeNull();
  expect(game.getView().viewer).toBeNull();
});

test('restart resets both players and handoff state; mode changes start a fresh game', () => {
  const game = localGame();
  startBoth(game);
  game.humanAttack([0, 0]);
  game.prepare();
  expect(game.getView()).toMatchObject({ mode: 'local', phase: 'handoff', pendingPlayer: 'human', winner: null });
  expect(game.getSnapshot().computer.cells[0][0].shot).toBeNull();
  game.prepare({ mode: 'computer' });
  expect(game.getView()).toMatchObject({ mode: 'computer', phase: 'setup', viewer: 'human', pendingPlayer: null });
  expect(() => game.secondPlayerAttack([0, 0])).toThrow();
  expect(() => game.ready()).toThrow();
  const before = game.getSnapshot();
  expect(() => game.prepare({ mode: 'online' })).toThrow(/mode/i);
  expect(game.getSnapshot()).toEqual(before);
});

test('duplicate and malformed second-player attacks never trigger a handoff', () => {
  const game = localGame();
  startBoth(game);
  game.humanAttack([9, 9]);
  game.ready();
  game.secondPlayerAttack([0, 0]);
  game.ready();
  game.humanAttack([9, 8]);
  game.ready();
  const before = game.getSnapshot();
  expect(game.secondPlayerAttack([0, 0])).toEqual({ outcome: 'already-attacked' });
  expect(() => game.secondPlayerAttack([-1, 0])).toThrow(/coordinate/i);
  expect(game.getSnapshot()).toEqual(before);
});
