// @ts-check
import { getLegalMoves, applyMove, opponent, countDiscs, hasLegalMove, SIZE } from './board.js';

/** @typedef {import('./board.js').Board} Board */
/** @typedef {import('./board.js').Player} Player */
/** @typedef {'easy' | 'normal' | 'hard'} Difficulty */

export const DIFFICULTIES = /** @type {const} */ (['easy', 'normal', 'hard']);

// 位置の価値。角が最も高く、角の隣(X 打ち・C 打ち)は低い。
// prettier-ignore
export const WEIGHTS = [
  120, -20,  20,   5,   5,  20, -20, 120,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
   20,  -5,  15,   3,   3,  15,  -5,  20,
    5,  -5,   3,   3,   3,   3,  -5,   5,
    5,  -5,   3,   3,   3,   3,  -5,   5,
   20,  -5,  15,   3,   3,  15,  -5,  20,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
  120, -20,  20,   5,   5,  20, -20, 120,
];

const HARD_DEPTH = 4;
const EXACT_ENDGAME_EMPTIES = 10;
const WIN_SCORE = 100000;

/**
 * CPU の手を選ぶ。置ける場所が無ければ -1。
 * @param {Board} board @param {Player} player @param {Difficulty} difficulty
 * @param {() => number} [rng] テスト用に差し替え可能な乱数
 * @returns {number}
 */
export function chooseMove(board, player, difficulty, rng = Math.random) {
  const moves = getLegalMoves(board, player);
  if (moves.length === 0) return -1;
  if (difficulty === 'easy') return moves[Math.floor(rng() * moves.length)].index;
  if (difficulty === 'normal') return pickBest(moves.map((m) => [m.index, WEIGHTS[m.index] + m.flips.length]), rng);
  return chooseHard(board, player, rng);
}

/**
 * 最高評価の手を返す。同点ならランダム。
 * @param {Array<[number, number]>} scored @param {() => number} rng
 */
function pickBest(scored, rng) {
  const best = Math.max(...scored.map(([, s]) => s));
  const top = scored.filter(([, s]) => s === best);
  return top[Math.floor(rng() * top.length)][0];
}

/** @param {Board} board @param {Player} player @param {() => number} rng */
function chooseHard(board, player, rng) {
  const empties = countDiscs(board).empty;
  const exact = empties <= EXACT_ENDGAME_EMPTIES;
  const depth = exact ? empties : HARD_DEPTH;
  const scored = getLegalMoves(board, player).map((m) => {
    const next = applyMove(board, m.index, player).board;
    return /** @type {[number, number]} */ ([m.index, -negamax(next, opponent(player), depth - 1, -Infinity, Infinity, exact)]);
  });
  return pickBest(scored, rng);
}

/**
 * @param {Board} board @param {Player} player 手番
 * @param {number} depth @param {number} alpha @param {number} beta @param {boolean} exact
 * @returns {number} player から見た評価値
 */
function negamax(board, player, depth, alpha, beta, exact) {
  const moves = getLegalMoves(board, player);
  if (moves.length === 0) {
    if (!hasLegalMove(board, opponent(player))) return finalScore(board, player);
    return -negamax(board, opponent(player), depth, -beta, -alpha, exact);
  }
  if (depth <= 0) return exact ? finalScore(board, player) : evaluate(board, player, moves.length);

  // 位置の価値が高い手から読むと枝刈りが効きやすい
  moves.sort((a, b) => WEIGHTS[b.index] - WEIGHTS[a.index]);
  let best = -Infinity;
  for (const m of moves) {
    const next = applyMove(board, m.index, player).board;
    const score = -negamax(next, opponent(player), depth - 1, -beta, -alpha, exact);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** @param {Board} board @param {Player} player */
function finalScore(board, player) {
  const { red, blue } = countDiscs(board);
  const diff = player === 1 ? red - blue : blue - red;
  return diff === 0 ? 0 : Math.sign(diff) * WIN_SCORE + diff;
}

/** @param {Board} board @param {Player} player @param {number} myMobility */
function evaluate(board, player, myMobility) {
  let positional = 0;
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (board[i] === player) positional += WEIGHTS[i];
    else if (board[i] !== 0) positional -= WEIGHTS[i];
  }
  const theirMobility = getLegalMoves(board, opponent(player)).length;
  return positional + 8 * (myMobility - theirMobility);
}
