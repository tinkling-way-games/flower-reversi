// src/ を dist/ にコピーする(依存ゼロ)。dist/ が GitHub Pages に公開される。
import { cp, rm, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await cp(src, dist, { recursive: true });

// Jekyll 処理を無効化(_ で始まるファイルが消えるのを防ぐ)
await writeFile(join(dist, '.nojekyll'), '');

// 公開中のバージョン確認用
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {
  // git が無い / コミットが無い場合
}
await writeFile(
  join(dist, 'version.json'),
  JSON.stringify({ commit, builtAt: new Date().toISOString() }, null, 2) + '\n',
);

console.log(`build: dist/ を生成 (commit ${commit})`);
