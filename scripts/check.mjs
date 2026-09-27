// 構文チェックとプロジェクト制約の静的検査(依存ゼロ)。
// 制約の背景は CLAUDE.md の「絶対に守る制約」を参照。
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map((e) => {
      const p = join(dir, e.name);
      return e.isDirectory() ? walk(p) : [p];
    }),
  );
  return files.flat();
}

const errors = [];
const rel = (p) => relative(root, p);

// 1. JS の構文チェック
const jsFiles = (await Promise.all(['src', 'scripts', 'test'].map((d) => walk(join(root, d)))))
  .flat()
  .filter((p) => ['.js', '.mjs'].includes(extname(p)));

for (const file of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) errors.push(`${rel(file)}: 構文エラー\n${r.stderr.trim()}`);
}

// 2. src/ 配下の制約チェック
const rules = [
  {
    exts: ['.js'],
    pattern: /\b(sessionStorage|indexedDB|document\.cookie|caches\.open)\b/,
    message: 'localStorage 以外のストレージは使用禁止',
  },
  {
    exts: ['.js'],
    pattern: /\blocalStorage\b/,
    message: 'localStorage は src/lib/storage.js 経由でのみ使う',
    allow: ['src/lib/storage.js'],
  },
  {
    exts: ['.html', '.css', '.js'],
    pattern: /(?:src|href|url)\s*[=(]\s*["']?(?:https?:)?\/\/(?!localhost)/i,
    message: '外部リソースの読み込みは禁止(アセットはリポジトリ内に置く)',
  },
  {
    exts: ['.js'],
    pattern: /\bfetch\s*\(\s*["'`]https?:/,
    message: '外部 API への通信は禁止',
  },
  {
    exts: ['.html', '.css'],
    pattern: /(?:src|href)\s*=\s*["']\/(?!\/)|url\(\s*["']?\/(?!\/)/i,
    message: 'ルート絶対パスは GitHub Pages のサブパス配信で壊れる。相対パスにする',
  },
];

for (const file of await walk(join(root, 'src'))) {
  const ext = extname(file);
  const text = await readFile(file, 'utf8').catch(() => null);
  if (text === null) continue;
  const lines = text.split('\n');
  for (const rule of rules) {
    if (!rule.exts.includes(ext) || rule.allow?.includes(rel(file))) continue;
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) return; // コメント行は対象外
      if (rule.pattern.test(line)) errors.push(`${rel(file)}:${i + 1}: ${rule.message}\n  ${line.trim()}`);
    });
  }
}

// 3. 依存パッケージを追加していないか
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
for (const field of ['dependencies', 'devDependencies']) {
  if (pkg[field] && Object.keys(pkg[field]).length > 0) {
    errors.push(`package.json: ${field} は追加しない方針(npm レジストリに到達できない環境のため)`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n\n'));
  console.error(`\ncheck: ${errors.length} 件の問題`);
  process.exit(1);
}
console.log(`check: OK (${jsFiles.length} files)`);
