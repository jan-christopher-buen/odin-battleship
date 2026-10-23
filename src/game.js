import Gameboard from './gameboard.js';
import Player from './player.js';

export const FLEET_LENGTHS = Object.freeze([5, 4, 3, 3, 2]);

function createPredeterminedBoard() {
  const board = new Gameboard();
  FLEET_LENGTHS.forEach((length, y) => board.placeShip(length, [0, y], 'horizontal'));
  return board;
}

export default class Game {
  #human;
  #computer;
  #phase;
  #winner;
  #latest;
  #random;
  #createBoard;

  constructor({ random = Math.random, createBoard = createPredeterminedBoard } = {}) {
    this.#random = random;
    this.#createBoard = createBoard;
    this.prepare();
  }

  prepare() {
    // Build both fleets before replacing the current session.
    const human = new Player('human', this.#random, this.#createBoard(this.#random));
    const computer = new Player('computer', this.#random, this.#createBoard(this.#random));
    this.#human = human;
    this.#computer = computer;
    this.#phase = 'setup';
    this.#winner = null;
    this.#latest = null;
  }

  start() {
    this.#requirePhase('setup');
    for (const player of [this.#human, this.#computer]) {
      const { ships, cells } = player.board.getSnapshot();
      const lengths = ships.map((ship) => ship.length).sort((a, b) => b - a);
      if (lengths.join(',') !== FLEET_LENGTHS.join(',') || cells.flat().some((cell) => cell.shot !== null)) {
        throw new Error('Starting requires complete, undamaged fleets.');
      }
    }
    this.#phase = 'human-turn';
  }

  humanAttack(position) {
    this.#requirePhase('human-turn');
    return this.#attack('human', this.#computer.board, position);
  }

  computerTurn() {
    this.#requirePhase('computer-turn');
    const position = this.#computer.chooseAttack(this.#human.board);
    if (position === null) throw new Error('No legal computer move remains.');
    return { ...this.#attack('computer', this.#human.board, position), position };
  }

  #attack(actor, target, position) {
    const result = target.receiveAttack(position);
    if (result.outcome === 'already-attacked') return result;
    this.#latest = { actor, position: [...position], outcome: result.outcome };
    if (target.allShipsSunk()) {
      this.#winner = actor;
      this.#phase = 'game-over';
    } else {
      this.#phase = actor === 'human' ? 'computer-turn' : 'human-turn';
    }
    return result;
  }

  #requirePhase(phase) {
    if (this.#phase !== phase) throw new Error(`Action requires ${phase} phase.`);
  }

  getSnapshot() {
    return {
      phase: this.#phase,
      winner: this.#winner,
      latest: this.#latest ? { ...this.#latest, position: [...this.#latest.position] } : null,
      human: this.#human.board.getSnapshot(),
      computer: this.#computer.board.getSnapshot(),
    };
  }
}
