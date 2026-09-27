// @ts-check
/**
 * 画面遷移とゲーム進行。ルールは lib/、見た目は board-view.js に任せる。
 */
import { createInitialBoard, getLegalMoves, applyMove, nextTurn, countDiscs, opponent, hasLegalMove, RED, BLUE } from '../lib/board.js';
import { chooseMove } from '../lib/ai.js';
import { calcScore, recordSolo, recordDuo, loadRecords, saveRecords, createRecords } from '../lib/score.js';
import { SETTINGS_KEY, normalizeSettings } from '../lib/settings.js';
import { GARDEN_KEY, CATEGORIES, ITEMS, normalizeGarden, unlockItem, selectItem, isOwned, findItem } from '../lib/garden.js';
import { createBoardView } from './board-view.js';
import * as sound from './sound.js';
import { reportError, isDebug, startDebugPanel } from './debug.js';

/** @typedef {import('../lib/board.js').Player} Player */
/** @typedef {import('../lib/board.js').Cell} Cell */

const DIFFICULTY_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };
const CPU_THINK_MS = 550;
const PASS_MS = 1300;
/** 初期配置の花の数(何手目かの計算用) */
const INITIAL_DISCS = 4;

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** @param {{ load: Function, save: Function, available: boolean }} store */
export function startApp(store) {
  let settings = normalizeSettings(store.load(SETTINGS_KEY, null));
  let records = loadRecords(store);
  let garden = normalizeGarden(store.load(GARDEN_KEY, null));
  sound.setSoundEnabled(settings.sound);

  const persistSettings = () => store.save(SETTINGS_KEY, settings);

  /** 対局の状態。session が変わると古い非同期処理は捨てられる */
  const game = {
    session: 0,
    /** @type {Cell[]} */ board: createInitialBoard(),
    /** @type {Player} */ turn: RED,
    /** @type {Player | null} */ cpu: null,
    busy: false,
    /** 盤面を更新したが、まだ手番を進めていない打ち手(エラーからの復帰用) @type {Player | null} */
    lastMover: /** @type {Player | null} */ (null),
    mode: settings.mode,
    difficulty: settings.difficulty,
  };

  const view = createBoardView($('board'), $('fx-layer'), onCellTap);
  applyGarden();

  // ---------- 画面切り替え ----------

  /** @param {'title' | 'game' | 'records' | 'garden'} name */
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((s) => s.toggleAttribute('data-active', s.id === `screen-${name}`));
    window.scrollTo(0, 0);
  }

  // 最初のタップで音を有効化
  document.addEventListener('pointerdown', () => sound.unlock(), { once: true });

  // ---------- タイトル ----------

  function renderTitle() {
    document.querySelectorAll('.segmented').forEach((seg) => {
      const key = /** @type {HTMLElement} */ (seg).dataset.setting;
      seg.querySelectorAll('button').forEach((b) => {
        b.setAttribute('aria-pressed', String(String(settings[key]) === b.dataset.value));
      });
    });
    document.querySelectorAll('[data-show-when]').forEach((el) => {
      /** @type {HTMLElement} */ (el).hidden = /** @type {HTMLElement} */ (el).dataset.showWhen !== settings.mode;
    });
    const btn = $('btn-sound');
    btn.textContent = settings.sound ? '音: オン' : '音: オフ';
    btn.setAttribute('aria-pressed', String(settings.sound));
    $('title-points').textContent = String(records.points);
    $('storage-note').hidden = store.available;
  }

  document.querySelectorAll('.segmented').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const button = /** @type {HTMLElement} */ (e.target).closest('button');
      if (!button) return;
      const key = /** @type {HTMLElement} */ (seg).dataset.setting;
      const raw = button.dataset.value;
      settings = normalizeSettings({ ...settings, [key]: raw === 'true' ? true : raw === 'false' ? false : raw });
      persistSettings();
      renderTitle();
    });
  });

  $('btn-sound').addEventListener('click', () => {
    settings = { ...settings, sound: !settings.sound };
    sound.setSoundEnabled(settings.sound);
    persistSettings();
    renderTitle();
  });

  $('btn-start').addEventListener('click', startGame);
  $('btn-records').addEventListener('click', () => {
    renderRecords();
    showScreen('records');
  });
  $('btn-garden').addEventListener('click', () => {
    renderGarden();
    showScreen('garden');
  });

  // ---------- 対局 ----------

  function startGame() {
    game.session++;
    game.board = createInitialBoard();
    game.turn = RED;
    game.busy = false;
    game.lastMover = null;
    game.mode = settings.mode;
    game.difficulty = settings.difficulty;
    game.cpu = game.mode === 'solo' ? (settings.humanColor === 'red' ? BLUE : RED) : null;

    if (game.mode === 'solo') {
      $('name-red').textContent = game.cpu === RED ? `CPU(${DIFFICULTY_LABEL[game.difficulty]})` : 'あなた';
      $('name-blue').textContent = game.cpu === BLUE ? `CPU(${DIFFICULTY_LABEL[game.difficulty]})` : 'あなた';
    } else {
      $('name-red').textContent = '赤';
      $('name-blue').textContent = '青';
    }

    view.renderAll(game.board);
    updateScoreboard(false);
    showScreen('game');
    beginTurn(game.session);
  }

  /** @param {boolean} bump */
  function updateScoreboard(bump) {
    const { red, blue } = countDiscs(game.board);
    for (const [id, value] of /** @type {const} */ ([['count-red', red], ['count-blue', blue]])) {
      const el = $(id);
      if (el.textContent !== String(value) && bump) {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      }
      el.textContent = String(value);
    }
    document.querySelectorAll('.player').forEach((p) => {
      p.classList.toggle('is-turn', Number(/** @type {HTMLElement} */ (p).dataset.player) === game.turn);
    });
  }

  /** @param {Player} p */
  const nameOf = (p) => {
    if (game.mode === 'solo') return p === game.cpu ? 'CPU' : 'あなた';
    return p === RED ? '赤' : '青';
  };

  /** @param {number} session */
  function beginTurn(session) {
    if (session !== game.session) return;
    updateScoreboard(false);
    if (game.turn === game.cpu) {
      view.setHints([]);
      setStatus('CPU が考え中…');
      setTimeout(() => {
        if (session !== game.session) return;
        try {
          const move = chooseMove(game.board, game.turn, game.difficulty);
          playMove(move, session);
        } catch (e) {
          reportError(e, 'CPU');
          recover(session);
        }
      }, CPU_THINK_MS);
    } else {
      view.setHints(getLegalMoves(game.board, game.turn).map((m) => m.index));
      setStatus(game.mode === 'solo' ? 'あなたの番です' : `${nameOf(game.turn)}の番です`);
    }
  }

  /** @param {number} index */
  function onCellTap(index) {
    if (game.busy || game.turn === game.cpu) {
      logTap(index, game.busy ? 'busy' : 'cpu');
      return;
    }
    const legal = getLegalMoves(game.board, game.turn).some((m) => m.index === index);
    if (!legal) {
      logTap(index, 'illegal');
      view.shake();
      return;
    }
    logTap(index, 'ok');
    playMove(index, game.session);
  }

  /** デバッグ表示用のタップ記録(直近 4 件)。?debug のときだけ記録する @type {string[]} */
  const tapLog = [];
  const debug = isDebug();
  /** @param {number} index @param {string} result */
  function logTap(index, result) {
    if (!debug) return;
    tapLog.unshift(`${index}:${result}`);
    tapLog.length = Math.min(tapLog.length, 4);
  }

  /** @param {number} index @param {number} session */
  async function playMove(index, session) {
    try {
      await playMoveSteps(index, session);
    } catch (e) {
      reportError(e, 'playMove');
      recover(session);
    }
  }

  /**
   * 予期しないエラーの後、盤面の状態から手番を立て直して対局を続けられるようにする。
   * @param {number} session
   */
  function recover(session) {
    if (session !== game.session) return;
    $('overlay-handoff').hidden = true;
    $('toast').hidden = true;
    view.renderAll(game.board);
    if (game.lastMover !== null) {
      const next = nextTurn(game.board, game.lastMover);
      game.lastMover = null;
      if (!next) {
        finishGame();
        return;
      }
      game.turn = next.player;
    } else if (!hasLegalMove(game.board, game.turn)) {
      const next = nextTurn(game.board, opponent(game.turn));
      if (!next) {
        finishGame();
        return;
      }
      game.turn = next.player;
    }
    game.busy = false;
    beginTurn(session);
  }

  /** @param {number} index @param {number} session */
  async function playMoveSteps(index, session) {
    game.busy = true;
    view.setHints([]);
    setStatus('');
    const player = game.turn;
    const color = view.colorName(player);
    const { board, flips } = applyMove(game.board, index, player);
    game.board = board;
    game.lastMover = player;

    view.place(index, player);
    sound.placeSound(color);
    const schedule = view.flip(index, flips, player);
    schedule.forEach(({ delay }, n) => sound.flipSound(color, n, delay / 1000));

    await wait(view.durationOf(schedule));
    if (session !== game.session) return;
    updateScoreboard(true);

    const next = nextTurn(game.board, player);
    game.lastMover = null;
    if (!next) {
      await wait(400);
      if (session === game.session) finishGame();
      return;
    }
    if (next.passed) {
      sound.passSound();
      await toast(`${nameOf(opponent(player))}は置ける場所がないのでパス`);
      if (session !== game.session) return;
    }
    game.turn = next.player;
    if (game.mode === 'duo' && settings.handoff && !next.passed) {
      updateScoreboard(false);
      await handoff(game.turn);
      if (session !== game.session) return;
    }
    game.busy = false;
    beginTurn(session);
  }

  /** @param {string} text */
  function setStatus(text) {
    $('status').textContent = text;
  }

  /** @param {string} text */
  async function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.hidden = false;
    await wait(PASS_MS);
    el.hidden = true;
  }

  /** @param {Player} player */
  function handoff(player) {
    const overlay = $('overlay-handoff');
    overlay.dataset.player = String(player);
    $('handoff-use').setAttribute('href', player === RED ? '#flower-red' : '#flower-blue');
    $('handoff-title').textContent = `${nameOf(player)}の番です`;
    overlay.hidden = false;
    return new Promise((resolve) => {
      $('btn-handoff').addEventListener(
        'click',
        () => {
          overlay.hidden = true;
          resolve(undefined);
        },
        { once: true },
      );
    });
  }

  function finishGame() {
    const { red, blue } = countDiscs(game.board);
    view.setHints([]);
    setStatus('');
    game.turn = /** @type {Player} */ (0);
    updateScoreboard(false);

    const title = $('result-title');
    const scoreEl = $('result-score');
    scoreEl.textContent = '';
    $('result-count').textContent = `赤 ${red} - ${blue} 青`;

    if (game.mode === 'solo') {
      const human = /** @type {Player} */ (opponent(/** @type {Player} */ (game.cpu)));
      const mine = human === RED ? red : blue;
      const theirs = human === RED ? blue : red;
      const result = mine > theirs ? 'win' : mine < theirs ? 'lose' : 'draw';
      const score = calcScore({ myDiscs: mine, result, difficulty: game.difficulty });
      const out = recordSolo(records, game.difficulty, { result, score });
      records = out.records;
      saveRecords(store, records);

      title.textContent = result === 'win' ? '勝ち！' : result === 'lose' ? '負け…' : '引き分け';
      $('result-use').setAttribute('href', human === RED ? '#flower-red' : '#flower-blue');
      scoreEl.innerHTML = '';
      scoreEl.append(`スコア ${score}(${DIFFICULTY_LABEL[game.difficulty]})`, document.createElement('br'));
      scoreEl.append(`花ポイント 合計 ${records.points}`);
      if (out.newBest) {
        const badge = document.createElement('span');
        badge.className = 'new-best';
        badge.textContent = '最高スコア更新！';
        scoreEl.append(document.createElement('br'), badge);
      }
      sound.resultSound(result);
    } else {
      const outcome = red > blue ? 'red' : blue > red ? 'blue' : 'draw';
      records = recordDuo(records, outcome);
      saveRecords(store, records);
      title.textContent = outcome === 'draw' ? '引き分け' : `${outcome === 'red' ? '赤' : '青'}の勝ち！`;
      $('result-use').setAttribute('href', outcome === 'blue' ? '#flower-blue' : '#flower-red');
      sound.resultSound(outcome === 'draw' ? 'draw' : 'win');
    }
    $('overlay-result').hidden = false;
  }

  $('btn-result-again').addEventListener('click', () => {
    $('overlay-result').hidden = true;
    startGame();
  });
  $('btn-result-title').addEventListener('click', () => {
    $('overlay-result').hidden = true;
    renderTitle();
    showScreen('title');
  });

  $('btn-quit').addEventListener('click', async () => {
    if (!(await confirmDialog('対局をやめてタイトルに戻りますか？\n(この対局は記録されません)', 'やめる'))) return;
    game.session++;
    $('overlay-handoff').hidden = true;
    $('toast').hidden = true;
    renderTitle();
    showScreen('title');
  });

  // ---------- 記録 ----------

  function renderRecords() {
    $('records-points').textContent = String(records.points);
    const solo = $('records-solo');
    solo.textContent = '';
    for (const d of /** @type {const} */ (['easy', 'normal', 'hard'])) {
      const r = records.solo[d];
      const tr = document.createElement('tr');
      for (const v of [DIFFICULTY_LABEL[d], r.played, r.wins, r.losses, r.draws, r.best]) {
        const td = document.createElement('td');
        td.textContent = String(v);
        tr.append(td);
      }
      solo.append(tr);
    }
    const duo = $('records-duo');
    duo.textContent = '';
    const tr = document.createElement('tr');
    for (const v of [records.duo.played, records.duo.redWins, records.duo.blueWins, records.duo.draws]) {
      const td = document.createElement('td');
      td.textContent = String(v);
      tr.append(td);
    }
    duo.append(tr);
  }

  $('btn-reset').addEventListener('click', async () => {
    if (!(await confirmDialog('対戦記録と花ポイントをすべて消します。\n元に戻せません。よろしいですか？', 'リセット'))) return;
    records = createRecords();
    saveRecords(store, records);
    renderRecords();
  });

  $('btn-records-back').addEventListener('click', () => {
    renderTitle();
    showScreen('title');
  });

  // ---------- 花の庭 ----------

  /** 選択中の見た目を画面に反映する */
  function applyGarden() {
    const sel = garden.selected;
    $('use-flower-red').setAttribute('href', `#flower-${sel.red}`);
    $('use-flower-blue').setAttribute('href', `#flower-${sel.blue}`);
    document.body.dataset.board = sel.board;
    view.setFxScale(sel.effect === 'effect-fubuki' ? 2.2 : 1);
  }

  /** @param {import('../lib/garden.js').Item} item */
  function previewOf(item) {
    const box = document.createElement('div');
    box.className = 'garden-preview';
    if (item.category === 'red' || item.category === 'blue') {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      const use = document.createElementNS(svgNS, 'use');
      use.setAttribute('href', `#flower-${item.id}`);
      svg.append(use);
      box.append(svg);
    } else if (item.category === 'board') {
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.dataset.id = item.id;
      box.append(sw);
    } else {
      const icon = document.createElement('span');
      icon.className = 'fx-icon';
      icon.textContent = item.id === 'effect-fubuki' ? '🌸' : '✨';
      box.append(icon);
    }
    return box;
  }

  function renderGarden() {
    $('garden-points').textContent = String(records.points);
    const list = $('garden-list');
    list.textContent = '';
    for (const cat of CATEGORIES) {
      const section = document.createElement('section');
      section.className = 'garden-category';
      const h = document.createElement('h3');
      h.textContent = cat.name;
      const grid = document.createElement('div');
      grid.className = 'garden-items';
      for (const item of ITEMS.filter((i) => i.category === cat.id)) {
        const owned = isOwned(garden, item.id);
        const selected = garden.selected[cat.id] === item.id;
        const card = document.createElement('div');
        card.className = 'garden-item' + (selected ? ' is-selected' : '') + (owned ? '' : ' is-locked');
        const name = document.createElement('span');
        name.className = 'garden-name';
        name.textContent = item.name;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.id = item.id;
        if (selected) {
          btn.className = 'btn btn-selected';
          btn.textContent = '使用中';
          btn.disabled = true;
        } else if (owned) {
          btn.className = 'btn btn-ghost';
          btn.textContent = '使う';
          btn.dataset.action = 'select';
        } else {
          btn.className = 'btn btn-unlock';
          btn.textContent = `解放 ${item.price}`;
          btn.dataset.action = 'unlock';
          btn.disabled = records.points < item.price;
        }
        card.append(previewOf(item), name, btn);
        grid.append(card);
      }
      section.append(h, grid);
      list.append(section);
    }
  }

  $('garden-list').addEventListener('click', async (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('button');
    if (!btn?.dataset.id || !btn.dataset.action) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'unlock') {
      const item = findItem(id);
      if (!item) return;
      const ok = await confirmDialog(`花ポイント ${item.price} で「${item.name}」を解放しますか？`, '解放する');
      if (!ok) return;
      const out = unlockItem(garden, records.points, id);
      if (!out.ok) return;
      garden = out.garden;
      records = { ...records, points: out.points };
      saveRecords(store, records);
      sound.placeSound(item.category === 'blue' ? 'blue' : 'red');
    } else {
      garden = selectItem(garden, id);
    }
    store.save(GARDEN_KEY, garden);
    applyGarden();
    renderGarden();
  });

  $('btn-garden-back').addEventListener('click', () => {
    renderTitle();
    showScreen('title');
  });

  // ---------- 確認ダイアログ ----------

  /** @param {string} message @param {string} okLabel @returns {Promise<boolean>} */
  function confirmDialog(message, okLabel) {
    const overlay = $('overlay-confirm');
    $('confirm-message').innerText = message;
    $('btn-confirm-yes').textContent = okLabel;
    overlay.hidden = false;
    return new Promise((resolve) => {
      const done = (value) => {
        overlay.hidden = true;
        $('btn-confirm-yes').removeEventListener('click', yes);
        $('btn-confirm-no').removeEventListener('click', no);
        resolve(value);
      };
      const yes = () => done(true);
      const no = () => done(false);
      $('btn-confirm-yes').addEventListener('click', yes);
      $('btn-confirm-no').addEventListener('click', no);
    });
  }

  if (debug) {
    // 指が最初に触れた要素。盤面の上に見えない要素が被っていないかを確かめる
    let lastPointer = '';
    document.addEventListener(
      'pointerdown',
      (e) => {
        const t = /** @type {Element} */ (e.target);
        const cls = typeof t.className === 'string' ? t.className : '';
        lastPointer = `${t.tagName.toLowerCase()}${t.id ? '#' + t.id : ''}${cls ? '.' + cls.split(' ').join('.') : ''}`;
      },
      { capture: true },
    );
    let version = '?';
    fetch('./version.json')
      .then((r) => r.json())
      .then((v) => {
        version = v.commit;
      })
      .catch(() => {});
    startDebugPanel(() => ({
      version,
      taps: tapLog.join(' '),
      pointer: lastPointer,
      moves: game.board.length - INITIAL_DISCS - countDiscs(game.board).empty,
      screen: document.querySelector('.screen[data-active]')?.id,
      mode: game.mode,
      turn: game.turn,
      cpu: game.cpu,
      busy: game.busy,
      lastMover: game.lastMover,
      legal: game.turn ? getLegalMoves(game.board, game.turn).map((m) => m.index) : [],
      discs: countDiscs(game.board),
      session: game.session,
    }));
  }

  renderTitle();
  showScreen('title');
}
