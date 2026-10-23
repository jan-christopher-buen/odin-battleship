import createRandomBoard, { FLEET_LENGTHS } from './fleet-placement.js';
import Game from './game.js';

function expectLegalFleet(board) {
  const { ships, cells } = board.getSnapshot();
  expect(ships.map((ship) => ship.length)).toEqual([5, 4, 3, 3, 2]);
  expect(cells.flat().filter((cell) => cell.ship !== null)).toHaveLength(17);
  const coordinates = ships.flatMap((ship) => ship.cells);
  expect(new Set(coordinates.map((position) => position.join(','))).size).toBe(17);
  coordinates.forEach(([x, y]) => {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(10);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(10);
  });
  ships.forEach((ship) => {
    const horizontal = ship.cells.every((position) => position[1] === ship.cells[0][1]);
    const vertical = ship.cells.every((position) => position[0] === ship.cells[0][0]);
    expect(horizontal || vertical).toBe(true);
    ship.cells.slice(1).forEach((position, index) => {
      const previous = ship.cells[index];
      expect(Math.abs(position[0] - previous[0]) + Math.abs(position[1] - previous[1])).toBe(1);
    });
  });
}

test.each([0, 0.5, 0.999])('constant random %p terminates with a legal fleet', (value) => {
  expectLegalFleet(createRandomBoard(() => value));
});

test('controlled randomness is reproducible, varied, and generations are independent', () => {
  const first = createRandomBoard(() => 0);
  const second = createRandomBoard(() => 0);
  expect(first.getSnapshot()).toEqual(second.getSnapshot());
  expect(createRandomBoard(() => 0.9).getSnapshot()).not.toEqual(first.getSnapshot());
  first.receiveAttack([0, 0]);
  expect(second.hasReceivedAttack([0, 0])).toBe(false);
  for (let i = 0; i < 30; i += 1) expectLegalFleet(createRandomBoard());
  expect(FLEET_LENGTHS).toEqual([5, 4, 3, 3, 2]);
  expect(Object.isFrozen(FLEET_LENGTHS)).toBe(true);
});

test.each([-1, 1, NaN])('invalid randomness fails clearly: %p', (value) => {
  expect(() => createRandomBoard(() => value)).toThrow(/random/i);
});

test('default game integrates deterministic random placement and computer moves', () => {
  const game = new Game({ random: () => 0 });
  const first = game.getSnapshot();
  expect(first.human.ships).toHaveLength(5);
  expect(first.computer.ships).toHaveLength(5);
  expect(first.human).toEqual(createRandomBoard(() => 0).getSnapshot());
  game.start();
  game.humanAttack([9, 9]);
  expect(game.computerTurn().position).toEqual([0, 0]);
  game.prepare();
  expect(game.getSnapshot()).toEqual(first);
});
