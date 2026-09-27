# 開発環境と制約

## 前提

このプロジェクトは、スマートフォンから Claude Code on the web を操作して開発している。エージェントが動くクラウド上のコンテナには次の制約がある。

| 項目 | 状況 | 影響 |
| --- | --- | --- |
| npm レジストリ | ネットワークポリシーで遮断(HTTP 403) | `npm install` できない |
| GitHub | git の clone / push は可能 | 通常どおり開発・公開できる |
| 公開サイト(`*.github.io`) | ネットワークポリシーで遮断 | 公開後の確認は GitHub Actions の結果と、人間のブラウザで行う |
| Node.js | v22 系が利用可能 | 標準機能だけでツールを組める |
| ブラウザ | Chromium と Playwright がコンテナに導入済み | スクリーンショットによる確認が可能 |
| 人間側の画面 | スマホのみ | エージェントの自動検証とスクリーンショット共有で補う |

> [!NOTE]
> コンテナの構成はセッションや設定によって変わりうる。npm レジストリへのアクセスは、環境設定のネットワークアクセスで許可できる場合がある。

## 依存ゼロ構成にした理由

npm パッケージを一切使わず、Node.js 標準機能だけでツールチェーンを構成している。

- **どこでも同じように動く**: `npm install` が不要なので、制限付きコンテナでも GitHub Actions でも、手元の PC でも同じコマンドで動く。
- **ビルド不要**: ゲーム本体はプレーンな ES Modules。`src/` をそのまま配信すれば動くため、ビルドツールの不具合で詰まらない。
- **供給網リスクが小さい**: 依存が無いので、脆弱性対応や更新作業が発生しない。

| 用途 | 採用したもの | 置き換えたもの |
| --- | --- | --- |
| テスト | `node --test` | Vitest / Jest |
| 開発サーバー | `scripts/serve.mjs` | Vite |
| ビルド | `scripts/build.mjs`(コピーのみ) | Vite / webpack |
| 静的検査 | `scripts/check.mjs`(`node --check` + 独自ルール) | ESLint |
| 型 | JSDoc + `// @ts-check` | TypeScript |
| 見た目の確認 | `scripts/smoke.mjs`(Playwright があれば) | — |

## 任意のツール

コンテナにグローバル導入されているツールは、あれば使ってよい。ただし必須にはしない。

- Playwright: `npm run smoke` でスマホ幅のスクリーンショットを `screenshots/` に保存する。無ければスキップする。
- TypeScript: `tsc --noEmit --allowJs --checkJs` などで JSDoc の型チェックができる。
