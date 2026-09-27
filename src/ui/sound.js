// @ts-check
/**
 * Web Audio API による効果音の合成。音声ファイルは使わない。
 * AudioContext はユーザー操作の後でないと鳴らないため、最初のタップで unlock() する。
 */

/** @type {AudioContext | null} */
let ctx = null;
let enabled = true;

export function setSoundEnabled(value) {
  enabled = value;
}

export function unlock() {
  try {
    ctx ??= new AudioContext();
    // resume() は Promise を返すので、失敗は catch で握りつぶす(音が鳴らないだけで遊べる)
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

/**
 * @param {{ freq: number, type?: OscillatorType, start?: number, dur?: number, gain?: number }} tone
 */
function play({ freq, type = 'sine', start = 0, dur = 0.4, gain = 0.15 }) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** 花を置く音。赤は厚みのある和音、青は澄んだ単音 @param {'red' | 'blue'} color */
export function placeSound(color) {
  if (color === 'red') {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      play({ freq, type: i === 0 ? 'triangle' : 'sine', start: i * 0.035, dur: 0.9, gain: 0.09 }),
    );
    play({ freq: 2093, start: 0.12, dur: 0.5, gain: 0.03 });
  } else {
    play({ freq: 880, dur: 0.45, gain: 0.14 });
    play({ freq: 1760, start: 0.02, dur: 0.3, gain: 0.04 });
  }
}

/**
 * 裏返る音。n 枚目ほど高くなる
 * @param {'red' | 'blue'} color @param {number} n @param {number} delaySec
 */
export function flipSound(color, n, delaySec) {
  const freq = 587.33 * Math.pow(2, Math.min(n, 14) / 12);
  play({ freq, type: color === 'red' ? 'triangle' : 'sine', start: delaySec, dur: 0.18, gain: 0.08 });
}

/** @param {'win' | 'lose' | 'draw'} result */
export function resultSound(result) {
  const notes =
    result === 'win' ? [523.25, 659.25, 783.99, 1046.5] : result === 'draw' ? [587.33, 587.33] : [392, 349.23, 293.66];
  notes.forEach((freq, i) => play({ freq, type: 'triangle', start: i * 0.14, dur: 0.5, gain: 0.1 }));
}

export function passSound() {
  play({ freq: 440, type: 'sine', dur: 0.2, gain: 0.08 });
  play({ freq: 330, type: 'sine', start: 0.12, dur: 0.3, gain: 0.08 });
}
