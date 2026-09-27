import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, defaultSettings } from '../src/lib/settings.js';

test('未保存・壊れた設定は既定値', () => {
  assert.deepEqual(normalizeSettings(null), defaultSettings());
  assert.deepEqual(normalizeSettings('x'), defaultSettings());
});

test('正しい値は保持し、不正な値は既定値に戻す', () => {
  const s = normalizeSettings({ sound: false, mode: 'duo', humanColor: 'green', difficulty: 'hard', handoff: 'yes' });
  assert.equal(s.sound, false);
  assert.equal(s.mode, 'duo');
  assert.equal(s.humanColor, 'red');
  assert.equal(s.difficulty, 'hard');
  assert.equal(s.handoff, true);
});
