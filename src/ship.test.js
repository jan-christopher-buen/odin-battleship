import Ship from './ship.js';

describe('Ship', () => {
  test.each([1, 5, 10])('starts undamaged at length %i', (length) => {
    const ship = new Ship(length);
    expect(ship.length).toBe(length);
    expect(ship.hits).toBe(0);
    expect(ship.isSunk()).toBe(false);
  });
  test.each([0, 11, -1, 1.5, '3', null, undefined, NaN])('rejects invalid length %p', (length) => {
    expect(() => new Ship(length)).toThrow(/length/i);
  });
  test('tracks damage, derives sinking, and caps excess hits', () => {
    const ship = new Ship(2);
    ship.hit();
    expect(ship.hits).toBe(1);
    expect(ship.isSunk()).toBe(false);
    ship.hit();
    expect(ship.isSunk()).toBe(true);
    ship.hit();
    expect(ship.hits).toBe(2);
  });
  test('exposes read-only length and hits', () => {
    const ship = new Ship(2);
    expect(() => { ship.length = 5; }).toThrow();
    expect(() => { ship.hits = 5; }).toThrow();
  });
});
