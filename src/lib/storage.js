// @ts-check
/**
 * localStorage への唯一の窓口。
 *
 * - キーは名前空間 `flower-reversi:` で区切る
 * - 値は JSON で保存し、スキーマバージョンを付ける
 * - localStorage が使えない・壊れている・容量超過でも例外を外に出さない
 */

export const NAMESPACE = 'flower-reversi:';

/**
 * @typedef {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>} StorageLike
 */

/** @returns {StorageLike | null} */
function defaultBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Safari のプライベートモード等ではアクセスだけで例外になる
    return null;
  }
}

/**
 * @param {{ backend?: StorageLike | null, version?: number }} [options]
 */
export function createStore({ backend = defaultBackend(), version = 1 } = {}) {
  /** @param {string} key */
  const fullKey = (key) => NAMESPACE + key;

  return {
    /** localStorage が使えるかどうか */
    get available() {
      return backend !== null;
    },

    /**
     * @template T
     * @param {string} key
     * @param {T} fallback 未保存・破損・バージョン不一致のときに返す値
     * @returns {T}
     */
    load(key, fallback) {
      if (!backend) return fallback;
      try {
        const raw = backend.getItem(fullKey(key));
        if (raw === null) return fallback;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.v !== version) return fallback;
        return parsed.data;
      } catch {
        return fallback;
      }
    },

    /**
     * @param {string} key
     * @param {unknown} data
     * @returns {boolean} 保存できたかどうか
     */
    save(key, data) {
      if (!backend) return false;
      try {
        backend.setItem(fullKey(key), JSON.stringify({ v: version, data }));
        return true;
      } catch {
        // QuotaExceededError など
        return false;
      }
    },

    /** @param {string} key */
    remove(key) {
      if (!backend) return;
      try {
        backend.removeItem(fullKey(key));
      } catch {
        // 無視
      }
    },
  };
}
