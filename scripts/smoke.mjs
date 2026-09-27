// 任意のスモークテスト: スマホ幅でページを開き、コンソールエラーの有無を確認してスクリーンショットを撮る。
// Playwright がローカルまたはグローバルに入っている環境でのみ動く。無ければスキップして正常終了する。
// 使い方: node scripts/smoke.mjs [--dir dist] [--out screenshots]
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const dir = opt('dir', 'dist');
const outDir = join(root, opt('out', 'screenshots'));
const port = 5199;

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {}
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return require(join(globalRoot, 'playwright'));
  } catch {}
  return null;
}

const playwright = loadPlaywright();
if (!playwright) {
  console.log('smoke: Playwright が見つからないためスキップ');
  process.exit(0);
}
if (!existsSync(join(root, dir, 'index.html'))) {
  console.error(`smoke: ${dir}/index.html がない。先に npm run build を実行する`);
  process.exit(1);
}

const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), dir, '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((ok) => server.stdout.once('data', ok));

const errors = [];
const launchOptions = {};
if (existsSync('/opt/pw-browsers/chromium')) {
  // Claude Code on the web のコンテナに同梱された Chromium
  launchOptions.executablePath = '/opt/pw-browsers/chromium';
}

let browser;
try {
  browser = await playwright.chromium.launch(launchOptions);
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));

  const base = `http://127.0.0.1:${port}/`;
  await mkdir(outDir, { recursive: true });
  const shot = async (name) => {
    const file = join(outDir, `${name}.png`);
    await page.screenshot({ path: file });
    console.log(`smoke: スクリーンショット -> ${file}`);
  };

  await page.goto(base, { waitUntil: 'networkidle' });
  await shot('01-title');

  // ゲーム画面がある場合は、1 手打って演出と CPU の応手まで確認する
  if (await page.locator('#btn-start').count()) {
    await page.click('#btn-start');
    await page.waitForSelector('.cell.is-hint');
    await shot('02-game-start');
    await page.locator('.cell.is-hint').first().click();
    await page.waitForTimeout(350);
    await shot('03-game-effect');
    await page.waitForSelector('.cell.is-hint', { timeout: 10000 });
    await page.waitForTimeout(300);
    await shot('04-game-after-cpu');
    await page.click('#btn-quit');
    await page.click('#btn-confirm-yes');
    await page.click('#btn-records');
    await shot('05-records');
  }
} finally {
  await browser?.close();
  server.kill();
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('smoke: OK');
