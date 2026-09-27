// @ts-check
/**
 * 盤面とルール。DOM に依存しない純粋関数だけを置く。
 *
 * 盤面は長さ 64 の配列(行優先、index = row * 8 + col)。
 * 値は EMPTY / RED / BLUE。赤が先手。
 */

export const SIZE = 8;
export const EMPTY = 0;
export const RED = 1;
export const BLUE = 2;

/** @typedef {typeof EMPTY | typeof RED | typeof BLUE} Cell */
/** @typedef {typeof RED | typeof BLUE} Player */
/** @typedef {readonly Cell[]} Board */
/** @typedef {{ index: number, flips: number[] }} Move */

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], /*   */ [0, 1],
  [1, -1], [1, 0], [1, 1],
];

/** @param {Player} player @returns {Player} */
export const opponent = (player) => (player === RED ? BLUE : RED);

/** @returns {Cell[]} */
export function createInitialBoard() {
  /** @type {Cell[]} */
  const board = new Array(SIZE * SIZE).fill(EMPTY);
  board[3 * SIZE + 3] = BLUE; // d4
  board[3 * SIZE + 4] = RED; // e4
  board[4 * SIZE + 3] = RED; // d5
  board[4 * SIZE + 4] = BLUE; // e5
  return board;
}

/**
 * index に player が置いたときに裏返る位置の一覧。置けない場合は空配列。
 * @param {Board} board @param {number} index @param {Player} player
 * @returns {number[]}
 */
export function getFlips(board, index, player) {
  if (board[index] !== EMPTY) return [];
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const enemy = opponent(player);
  /** @type {number[]} */
  const flips = [];
  for (const [dr, dc] of DIRECTIONS) {
    /** @type {number[]} */
    const line = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === enemy) {
      line.push(r * SIZE + c);
      r += dr;
      c += dc;
    }
    if (line.length > 0 && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

/** @param {Board} board @param {Player} player @returns {Move[]} */
export function getLegalMoves(board, player) {
  /** @type {Move[]} */
  const moves = [];
  for (let i = 0; i < board.length; i++) {
    const flips = getFlips(board, i, player);
    if (flips.length > 0) moves.push({ index: i, flips });
  }
  return moves;
}

/** @param {Board} board @param {Player} player */
export const hasLegalMove = (board, player) => {
  for (let i = 0; i < board.length; i++) if (getFlips(board, i, player).length > 0) return true;
  return false;
};

/**
 * 手を適用した新しい盤面を返す。元の盤面は変更しない。
 * @param {Board} board @param {number} index @param {Player} player
 * @returns {{ board: Cell[], flips: number[] }}
 */
export function applyMove(board, index, player) {
  const flips = getFlips(board, index, player);
  if (flips.length === 0) throw new Error(`illegal move: ${index}`);
  const next = board.slice();
  next[index] = player;
  for (const f of flips) next[f] = player;
  return { board: next, flips };
}

/** @param {Board} board */
export function countDiscs(board) {
  let red = 0;
  let blue = 0;
  for (const cell of board) {
    if (cell === RED) red++;
    else if (cell === BLUE) blue++;
  }
  return { red, blue, empty: board.length - red - blue };
}

/**
 * 直前に current が打った後、次に打つのは誰か。
 * 相手が置けなければパスして current が続ける。両者置けなければ終局(null)。
 * @param {Board} board @param {Player} current
 * @returns {{ player: Player, passed: boolean } | null}
 */
export function nextTurn(board, current) {
  const other = opponent(current);
  if (hasLegalMove(board, other)) return { player: other, passed: false };
  if (hasLegalMove(board, current)) return { player: current, passed: true };
  return null;
}

/** @param {Board} board @returns {Player | 0} 勝者。引き分けは 0 */
export function winner(board) {
  const { red, blue } = countDiscs(board);
  if (red > blue) return RED;
  if (blue > red) return BLUE;
  return 0;
}

/** @param {number} index */
export const toCoord = (index) => ({ row: Math.floor(index / SIZE), col: index % SIZE });
