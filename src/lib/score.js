// @ts-check
/**
 * スコア計算と対戦記録。記録の形は docs/game-spec.md の「スコアとポイント」を参照。
 */

/** @typedef {import('./ai.js').Difficulty} Difficulty */
/** @typedef {'win' | 'lose' | 'draw'} Result */
/** @typedef {{ played: number, wins: number, losses: number, draws: number, best: number }} SoloRecord */
/** @typedef {{ played: number, redWins: number, blueWins: number, draws: number }} DuoRecord */
/** @typedef {{ solo: Record<Difficulty, SoloRecord>, duo: DuoRecord, points: number }} Records */

export const RECORDS_KEY = 'records';

export const RESULT_BONUS = { win: 20, draw: 5, lose: 0 };
export const DIFFICULTY_MULTIPLIER = { easy: 1, normal: 2, hard: 3 };

/**
 * 一人用 1 試合のスコア。
 * @param {{ myDiscs: number, result: Result, difficulty: Difficulty }} args
 */
export function calcScore({ myDiscs, result, difficulty }) {
  return (myDiscs + RESULT_BONUS[result]) * DIFFICULTY_MULTIPLIER[difficulty];
}

/** @returns {SoloRecord} */
const emptySolo = () => ({ played: 0, wins: 0, losses: 0, draws: 0, best: 0 });

/** @returns {Records} */
export function createRecords() {
  return {
    solo: { easy: emptySolo(), normal: emptySolo(), hard: emptySolo() },
    duo: { played: 0, redWins: 0, blueWins: 0, draws: 0 },
    points: 0,
  };
}

/**
 * 一人用の結果を記録した新しい記録を返す。
 * @param {Records} records @param {Difficulty} difficulty
 * @param {{ result: Result, score: number }} game
 * @returns {{ records: Records, newBest: boolean }}
 */
export function recordSolo(records, difficulty, { result, score }) {
  const prev = records.solo[difficulty];
  const newBest = score > prev.best;
  const next = {
    played: prev.played + 1,
    wins: prev.wins + (result === 'win' ? 1 : 0),
    losses: prev.losses + (result === 'lose' ? 1 : 0),
    draws: prev.draws + (result === 'draw' ? 1 : 0),
    best: Math.max(prev.best, score),
  };
  return {
    records: { ...records, solo: { ...records.solo, [difficulty]: next }, points: records.points + score },
    newBest,
  };
}

/**
 * 二人用の結果を記録した新しい記録を返す。
 * @param {Records} records @param {'red' | 'blue' | 'draw'} outcome
 * @returns {Records}
 */
export function recordDuo(records, outcome) {
  const d = records.duo;
  return {
    ...records,
    duo: {
      played: d.played + 1,
      redWins: d.redWins + (outcome === 'red' ? 1 : 0),
      blueWins: d.blueWins + (outcome === 'blue' ? 1 : 0),
      draws: d.draws + (outcome === 'draw' ? 1 : 0),
    },
  };
}

/**
 * 保存データを検証し、欠けている項目は初期値で補う(破損データ対策)。
 * @param {unknown} raw @returns {Records}
 */
export function normalizeRecords(raw) {
  const base = createRecords();
  if (!raw || typeof raw !== 'object') return base;
  const r = /** @type {any} */ (raw);
  const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  for (const d of /** @type {Difficulty[]} */ (['easy', 'normal', 'hard'])) {
    for (const k of /** @type {(keyof SoloRecord)[]} */ (['played', 'wins', 'losses', 'draws', 'best'])) {
      base.solo[d][k] = num(r.solo?.[d]?.[k]);
    }
  }
  for (const k of /** @type {(keyof DuoRecord)[]} */ (['played', 'redWins', 'blueWins', 'draws'])) {
    base.duo[k] = num(r.duo?.[k]);
  }
  base.points = num(r.points);
  return base;
}

/** @param {{ load: (k: string, f: unknown) => unknown }} store */
export const loadRecords = (store) => normalizeRecords(store.load(RECORDS_KEY, null));

/** @param {{ save: (k: string, d: unknown) => boolean }} store @param {Records} records */
export const saveRecords = (store, records) => store.save(RECORDS_KEY, records);
