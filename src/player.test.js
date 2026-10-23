import Player from './player.js';
import Gameboard from './gameboard.js';

test('players have supported types and independent boards', () => {
  const human = new Player('human');
  const computer = new Player('computer');
  expect(human.type).toBe('human');
  expect(computer.type).toBe('computer');
  human.board.placeShip(1, [0, 0], 'horizontal');
  expect(computer.board.getSnapshot().ships).toEqual([]);
  expect(() => new Player('alien')).toThrow(/type/i);
  expect(() => human.chooseAttack(computer.board)).toThrow(/computer/i);
});

test('controlled random selection enumerates only remaining legal squares', () => {
  const board = new Gameboard();
  const computer = new Player('computer', () => 0);
  expect(computer.chooseAttack(board)).toEqual([0, 0]);
  board.receiveAttack([0, 0]);
  expect(computer.chooseAttack(board)).toEqual([1, 0]);
  expect(new Player('computer', () => 0.999).chooseAttack(board)).toEqual([9, 9]);
  expect(new Player('computer', () => 0).chooseAttack(new Gameboard())).toEqual([0, 0]);
});

test('handles one remaining square and no legal moves without retry loops', () => {
  const board = new Gameboard();
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      if (x !== 3 || y !== 7) board.receiveAttack([x, y]);
    }
  }
  const computer = new Player('computer', () => 0.5);
  expect(computer.chooseAttack(board)).toEqual([3, 7]);
  board.receiveAttack([3, 7]);
  expect(computer.chooseAttack(board)).toBeNull();
});

test.each([-0.1, 1, NaN])('rejects invalid injected randomness %p', (value) => {
  expect(() => new Player('computer', () => value).chooseAttack(new Gameboard())).toThrow(/random/i);
});
