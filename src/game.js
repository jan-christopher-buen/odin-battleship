import createRandomBoard, { FLEET_LENGTHS } from './fleet-placement.js';
import Player from './player.js';

export default class Game {
  #human;
  #computer;
  #phase;
  #winner;
  #latest;
  #random;
  #createBoard;
  #mode = 'computer';
  #viewer;
  #pendingPlayer = null;
  #pendingPhase = null;

  constructor({ random = Math.random, createBoard = createRandomBoard, mode = 'computer' } = {}) {
    this.#random = random;
    this.#createBoard = createBoard;
    this.prepare({ mode });
  }

  prepare({ mode = this.#mode } = {}) {
    if (!['computer', 'local'].includes(mode)) throw new TypeError('Unsupported game mode.');
    // The two seat IDs stay human/computer; in local mode both Player types are human.
    // Construct both complete fleets before replacing the current session.
    const human = new Player('human', this.#random, this.#createBoard(this.#random));
    const computer = new Player(mode === 'local' ? 'human' : 'computer', this.#random, this.#createBoard(this.#random));
    this.#human = human;
    this.#computer = computer;
    this.#mode = mode;
    this.#phase = 'setup';
    this.#viewer = 'human';
    this.#winner = null;
    this.#latest = null;
    this.#pendingPlayer = null;
    this.#pendingPhase = null;
    if (mode === 'local') this.#passDevice('human', 'setup');
  }

  moveShip(id, start, orientation) {
    this.#requirePhase('setup');
    this.#viewingPlayer().board.moveShip(id, start, orientation);
  }

  randomizeFleet() {
    this.#requirePhase('setup');
    const player = new Player('human', this.#random, this.#createBoard(this.#random));
    if (this.#viewer === 'human') this.#human = player;
    else this.#computer = player;
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
    if (this.#mode === 'local') {
      if (this.#viewer === 'human') this.#passDevice('computer', 'setup');
      else this.#passDevice('human', 'human-turn');
    } else {
      this.#phase = 'human-turn';
    }
  }

  ready() {
    this.#requirePhase('handoff');
    this.#viewer = this.#pendingPlayer;
    this.#phase = this.#pendingPhase;
    this.#pendingPlayer = null;
    this.#pendingPhase = null;
  }

  humanAttack(position) {
    this.#requirePhase('human-turn');
    return this.#attack('human', this.#computer.board, position);
  }

  secondPlayerAttack(position) {
    if (this.#mode !== 'local') throw new Error('Second human attacks require local mode.');
    this.#requirePhase('second-player-turn');
    return this.#attack('computer', this.#human.board, position);
  }

  computerTurn() {
    if (this.#mode !== 'computer') throw new Error('Automatic turns require computer mode.');
    this.#requirePhase('computer-turn');
    const position = this.#computer.chooseAttack(this.#human.board);
    if (position === null) throw new Error('No legal computer move remains.');
    const result = this.#attack('computer', this.#human.board, position);
    this.#computer.recordAttack(position, result.outcome);
    return { ...result, position };
  }

  #attack(actor, target, position) {
    const result = target.receiveAttack(position);
    if (result.outcome === 'already-attacked') return result;
    this.#latest = { actor, position: [...position], outcome: result.outcome };
    if (target.allShipsSunk()) {
      this.#winner = actor;
      this.#phase = 'game-over';
    } else if (this.#mode === 'local') {
      const next = actor === 'human' ? 'computer' : 'human';
      this.#passDevice(next, next === 'human' ? 'human-turn' : 'second-player-turn');
    } else {
      this.#phase = actor === 'human' ? 'computer-turn' : 'human-turn';
    }
    return result;
  }

  #viewingPlayer() { return this.#viewer === 'human' ? this.#human : this.#computer; }

  #passDevice(player, phase) {
    this.#viewer = null;
    this.#pendingPlayer = player;
    this.#pendingPhase = phase;
    this.#phase = 'handoff';
  }

  #requirePhase(phase) {
    if (this.#phase !== phase) throw new Error(`Action requires ${phase} phase.`);
  }

  getSnapshot() {
    return {
      mode: this.#mode,
      phase: this.#phase,
      viewer: this.#viewer,
      pendingPlayer: this.#pendingPlayer,
      winner: this.#winner,
      latest: this.#latest ? { ...this.#latest, position: [...this.#latest.position] } : null,
      human: this.#human.board.getSnapshot(),
      computer: this.#computer.board.getSnapshot(),
    };
  }

  getView() {
    const { human, computer, ...state } = this.getSnapshot();
    if (state.viewer === null) return { ...state, own: null, enemy: null };
    const own = state.viewer === 'human' ? human : computer;
    const target = state.viewer === 'human' ? computer : human;
    // Give the DOM only observed enemy shots and public sunk counts until game over.
    const enemy = state.phase === 'game-over' ? target : {
      cells: target.cells.map((row) => row.map(({ ship, shot }) => ({
        ship: null,
        shot: shot === 'hit' && target.ships[ship].sunk ? 'sunk' : shot,
      }))),
      ships: target.ships.map(({ sunk }) => ({ sunk })),
    };
    return { ...state, own, enemy };
  }
}
