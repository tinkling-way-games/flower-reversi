// @ts-check
/**
 * 花の庭(パワーアップ)。花ポイントで見た目を解放する。仕様は docs/game-spec.md。
 */

/** @typedef {'red' | 'blue' | 'board' | 'effect'} Category */
/** @typedef {{ id: string, category: Category, name: string, price: number }} Item */
/** @typedef {{ owned: string[], selected: Record<Category, string> }} Garden */

export const GARDEN_KEY = 'garden';

export const CATEGORIES = /** @type {const} */ ([
  { id: 'red', name: '赤の花' },
  { id: 'blue', name: '青の花' },
  { id: 'board', name: '盤面' },
  { id: 'effect', name: '演出' },
]);

/** 値段 0 は最初から持っているもの @type {readonly Item[]} */
export const ITEMS = [
  { id: 'red-dahlia', category: 'red', name: 'ダリア', price: 0 },
  { id: 'red-camellia', category: 'red', name: '椿', price: 200 },
  { id: 'red-peony', category: 'red', name: '牡丹', price: 600 },
  { id: 'blue-nemophila', category: 'blue', name: 'ネモフィラ', price: 0 },
  { id: 'blue-bellflower', category: 'blue', name: '桔梗', price: 200 },
  { id: 'blue-hydrangea', category: 'blue', name: '紫陽花', price: 600 },
  { id: 'board-lawn', category: 'board', name: '芝生', price: 0 },
  { id: 'board-night', category: 'board', name: '夜の庭', price: 300 },
  { id: 'board-sakura', category: 'board', name: '桜の庭', price: 300 },
  { id: 'effect-standard', category: 'effect', name: '標準', price: 0 },
  { id: 'effect-fubuki', category: 'effect', name: '花吹雪', price: 500 },
];

/** @param {string} id */
export const findItem = (id) => ITEMS.find((i) => i.id === id);

/** @returns {Garden} */
export function createGarden() {
  return {
    owned: ITEMS.filter((i) => i.price === 0).map((i) => i.id),
    selected: { red: 'red-dahlia', blue: 'blue-nemophila', board: 'board-lawn', effect: 'effect-standard' },
  };
}

/** @param {Garden} garden @param {string} id */
export const isOwned = (garden, id) => garden.owned.includes(id);

/**
 * 解放する。ポイント不足・所持済み・存在しない品は失敗(ok: false)で、状態は変えない。
 * 解放したものはそのまま選択中にする。
 * @param {Garden} garden @param {number} points @param {string} id
 * @returns {{ ok: boolean, garden: Garden, points: number }}
 */
export function unlockItem(garden, points, id) {
  const item = findItem(id);
  if (!item || isOwned(garden, id) || points < item.price) return { ok: false, garden, points };
  return {
    ok: true,
    garden: { owned: [...garden.owned, id], selected: { ...garden.selected, [item.category]: id } },
    points: points - item.price,
  };
}

/**
 * 選択を切り替える。持っていないものは選べない。
 * @param {Garden} garden @param {string} id @returns {Garden}
 */
export function selectItem(garden, id) {
  const item = findItem(id);
  if (!item || !isOwned(garden, id)) return garden;
  return { ...garden, selected: { ...garden.selected, [item.category]: id } };
}

/**
 * 保存データを検証する。知らない品・持っていない品の選択は取り除く。
 * @param {unknown} raw @returns {Garden}
 */
export function normalizeGarden(raw) {
  let garden = createGarden();
  if (!raw || typeof raw !== 'object') return garden;
  const r = /** @type {any} */ (raw);
  if (Array.isArray(r.owned)) {
    const owned = new Set(garden.owned);
    for (const id of r.owned) if (typeof id === 'string' && findItem(id)) owned.add(id);
    garden = { ...garden, owned: [...owned] };
  }
  if (r.selected && typeof r.selected === 'object') {
    for (const id of Object.values(r.selected)) {
      if (typeof id === 'string') garden = selectItem(garden, id);
    }
  }
  return garden;
}
