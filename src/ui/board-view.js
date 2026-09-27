// @ts-check
/**
 * 盤面の描画と演出。ゲームの進行は app.js が持ち、ここは見た目だけを担当する。
 */
import { SIZE, RED, BLUE, EMPTY, toCoord } from '../lib/board.js';

/** @typedef {import('../lib/board.js').Board} Board */
/** @typedef {import('../lib/board.js').Player} Player */

export const FLIP_STAGGER_MS = 90;
export const FLIP_MS = 520;
export const PLACE_MS = 650;
/** 同時に飛ばす粒子の上限。多すぎると iPhone で重くなり発熱する */
const MAX_PARTICLES = 48;

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** @param {Player} p */
const colorName = (p) => (p === RED ? 'red' : 'blue');

/**
 * @param {HTMLElement} boardEl
 * @param {HTMLElement} fxEl
 * @param {(index: number) => void} onTap
 */
export function createBoardView(boardEl, fxEl, onTap) {
  /** @type {HTMLButtonElement[]} */
  const cells = [];
  /** 花吹雪などで粒子の量を増やす倍率 */
  let fxScale = 1;
  /** 予約中の裏返し演出。盤面を描き直すときに取り消す @type {Set<ReturnType<typeof setTimeout>>} */
  const timers = new Set();

  /** @param {() => void} fn @param {number} ms */
  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  function cancelPending() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
    fxEl.textContent = '';
  }
  boardEl.textContent = '';
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    const { row, col } = toCoord(i);
    cell.setAttribute('aria-label', `${'abcdefgh'[col]}${row + 1}`);
    boardEl.append(cell);
    cells.push(cell);
  }

  // タップは盤面全体で 1 か所で受け、座標からマスを求める。
  // iPhone の Safari では、3D 回転する花の影響でタップの当たり先がずれ、
  // マスのボタンに届かなくなることがあるため、要素の当たり判定に頼らない。
  boardEl.addEventListener('click', (e) => {
    const index = e.detail === 0 ? indexFromTarget(e.target) : indexFromPoint(e.clientX, e.clientY);
    if (index >= 0) onTap(index);
  });

  /** キーボード操作(座標なし)のとき @param {EventTarget | null} target */
  function indexFromTarget(target) {
    const cell = target instanceof Element ? target.closest('.cell') : null;
    return cells.indexOf(/** @type {HTMLButtonElement} */ (cell));
  }

  /** @param {number} x @param {number} y */
  function indexFromPoint(x, y) {
    for (let i = 0; i < cells.length; i++) {
      const r = cells[i].getBoundingClientRect();
      if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return i;
    }
    return -1;
  }

  /** @param {number} index */
  const discOf = (index) => /** @type {HTMLElement | null} */ (cells[index].querySelector('.disc'));

  /** @param {Player} player */
  function createDisc(player) {
    const pop = document.createElement('div');
    pop.className = 'disc-pop';
    const disc = document.createElement('div');
    disc.className = 'disc' + (player === BLUE ? ' is-blue' : '');
    disc.innerHTML =
      '<div class="face face-front"><svg><use href="#flower-red"/></svg></div>' +
      '<div class="face face-back"><svg><use href="#flower-blue"/></svg></div>';
    pop.append(disc);
    return pop;
  }

  /** 盤面全体を演出なしで描き直す。予約中の演出は取り消す @param {Board} board */
  function renderAll(board) {
    cancelPending();
    board.forEach((cell, i) => {
      cells[i].textContent = '';
      cells[i].classList.remove('is-last', 'is-hint');
      if (cell !== EMPTY) cells[i].append(createDisc(/** @type {Player} */ (cell)));
      updateLabel(i, cell);
    });
  }

  /** @param {number} i @param {number} cell */
  function updateLabel(i, cell) {
    const { row, col } = toCoord(i);
    const name = `${'abcdefgh'[col]}${row + 1}`;
    cells[i].setAttribute('aria-label', cell === RED ? `${name} 赤` : cell === BLUE ? `${name} 青` : name);
  }

  /** @param {number[]} indices */
  function setHints(indices) {
    const set = new Set(indices);
    cells.forEach((c, i) => c.classList.toggle('is-hint', set.has(i)));
  }

  /** @param {number} index マスの中心(fx レイヤー基準の px) */
  function centerOf(index) {
    const cell = cells[index].getBoundingClientRect();
    const layer = fxEl.getBoundingClientRect();
    return { x: cell.left - layer.left + cell.width / 2, y: cell.top - layer.top + cell.height / 2, size: cell.width };
  }

  /**
   * 花びらなどの粒子を飛ばす
   * @param {number} index @param {string} kind @param {number} count
   * @param {{ spread?: number, delay?: number, size?: number }} [opt]
   */
  function burst(index, kind, count, { spread = 1, delay = 0, size = 10 } = {}) {
    if (reducedMotion()) return;
    const c = centerOf(index);
    count = Math.min(Math.round(count * fxScale), MAX_PARTICLES * Math.max(1, fxScale / 1.5) - fxEl.childElementCount);
    spread *= fxScale > 1 ? 1.35 : 1;
    for (let n = 0; n < count; n++) {
      const p = document.createElement('div');
      p.className = `particle ${kind}`;
      const angle = (Math.PI * 2 * n) / count + Math.random() * 0.8;
      const dist = c.size * (0.6 + Math.random() * 0.9) * spread;
      const s = size * (0.6 + Math.random() * 0.8);
      p.style.setProperty('--size', `${s}px`);
      p.style.setProperty('--x0', `${c.x}px`);
      p.style.setProperty('--y0', `${c.y}px`);
      p.style.setProperty('--x1', `${c.x + Math.cos(angle) * dist}px`);
      p.style.setProperty('--y1', `${c.y + Math.sin(angle) * dist + c.size * 0.3}px`);
      p.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
      const dur = 700 + Math.random() * 500;
      p.style.setProperty('--dur', `${dur}ms`);
      p.style.animationDelay = `${delay}ms`;
      p.addEventListener('animationend', () => p.remove());
      // animationend が来ない場合(バックグラウンド移行など)でも残さない
      setTimeout(() => p.remove(), delay + dur + 300);
      fxEl.append(p);
    }
  }

  /** @param {number} index @param {string} color */
  function ripple(index, color) {
    if (reducedMotion()) return;
    const c = centerOf(index);
    const r = document.createElement('div');
    r.className = 'ripple';
    r.style.setProperty('--size', `${c.size * 3.2}px`);
    r.style.setProperty('--x0', `${c.x}px`);
    r.style.setProperty('--y0', `${c.y}px`);
    r.style.setProperty('--ripple-color', color);
    r.addEventListener('animationend', () => r.remove());
    fxEl.append(r);
  }

  /** 花を置く演出 @param {number} index @param {Player} player */
  function place(index, player) {
    cells.forEach((c) => c.classList.remove('is-last'));
    cells[index].classList.add('is-last');
    const pop = createDisc(player);
    pop.classList.add(player === RED ? 'bloom-red' : 'bloom-blue');
    cells[index].textContent = '';
    cells[index].append(pop);
    updateLabel(index, player);
    if (player === RED) {
      ripple(index, 'rgba(255, 209, 102, 0.9)');
      burst(index, 'petal-red', 14, { spread: 1.3, size: 12 });
      burst(index, 'sparkle', 10, { spread: 1.6, delay: 120, size: 16 });
    } else {
      ripple(index, 'rgba(214, 236, 255, 0.95)');
      burst(index, 'petal-blue', 12, { spread: 1.1, size: 9 });
    }
  }

  /**
   * 裏返す演出。置いた場所から近い順に時間差で回転させる
   * @param {number} origin @param {number[]} flips @param {Player} player
   * @returns {Array<{ index: number, delay: number }>} 各マスの開始時刻(ms)
   */
  function flip(origin, flips, player) {
    const o = toCoord(origin);
    const schedule = flips
      .map((index) => {
        const c = toCoord(index);
        return { index, dist: Math.max(Math.abs(c.row - o.row), Math.abs(c.col - o.col)) };
      })
      .sort((a, b) => a.dist - b.dist)
      .map(({ index, dist }) => ({ index, delay: 180 + (dist - 1) * FLIP_STAGGER_MS }));

    for (const { index, delay } of schedule) {
      const pop = /** @type {HTMLElement | null} */ (cells[index].querySelector('.disc-pop'));
      const disc = discOf(index);
      if (!pop || !disc) continue;
      later(() => {
        pop.classList.remove('is-flipping', 'bloom-red', 'bloom-blue');
        void pop.offsetWidth; // アニメーションを再始動させる
        pop.classList.add('is-flipping');
        disc.classList.toggle('is-blue', player === BLUE);
        updateLabel(index, player);
        burst(index, player === RED ? 'petal-red' : 'petal-blue', player === RED ? 6 : 5, { spread: 0.8, delay: FLIP_MS * 0.4, size: 8 });
        if (player === RED) burst(index, 'sparkle', 3, { spread: 0.9, delay: FLIP_MS * 0.4, size: 12 });
      }, reducedMotion() ? 0 : delay);
    }
    return schedule;
  }

  /** 置けない場所をタップしたとき */
  function shake() {
    const wrap = boardEl.parentElement;
    if (!wrap) return;
    wrap.classList.remove('is-shake');
    void wrap.offsetWidth;
    wrap.classList.add('is-shake');
  }

  /** 1 手の演出にかかる時間(ms) @param {Array<{ delay: number }>} schedule */
  function durationOf(schedule) {
    if (reducedMotion()) return 150;
    const lastFlip = schedule.length ? Math.max(...schedule.map((s) => s.delay)) + FLIP_MS : 0;
    return Math.max(PLACE_MS, lastFlip) + 60;
  }

  /** @param {number} scale */
  const setFxScale = (scale) => {
    fxScale = scale;
  };

  return { renderAll, setHints, place, flip, shake, durationOf, colorName, setFxScale };
}
