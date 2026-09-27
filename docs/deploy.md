# GitHub Pages への公開

## 仕組み

```mermaid
flowchart LR
  A[作業ブランチに push] --> B[CI: npm run verify]
  B --> C[PR を main にマージ]
  C --> D[Deploy: verify → dist/ をアップロード]
  D --> E[GitHub Pages で公開]
```

- `.github/workflows/ci.yml`: PR と `main` 以外のブランチへの push で `npm run verify` を実行する。
- `.github/workflows/deploy.yml`: `main` への push(または手動実行)で `dist/` を GitHub Pages に公開する。
- 公開 URL: `https://tinkling-way-games.github.io/flower-reversi/`
- 公開中のビルドは `version.json` でコミットとビルド時刻を確認できる。

## 初回設定(1 回だけ・スマホのブラウザでも可)

1. `main` ブランチを用意する(最初の PR をマージするか、GitHub 上でブランチを作成する)。
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
3. **Actions** タブで「Deploy to GitHub Pages」を実行する(`main` への push でも自動で動く)。

> [!WARNING]
> Pages の公開環境 `github-pages` は、既定でデフォルトブランチからのデプロイだけを許可する。`main` をデフォルトブランチにしておくこと。

## 注意点

- サイトは `/flower-reversi/` というサブパスで配信される。HTML・CSS・JS 内のパスは必ず相対パス(`./style.css`)で書く。`npm run check` がルート絶対パスを検出する。
- `localStorage` はオリジン(`https://tinkling-way-games.github.io`)単位で共有される。同じアカウントの他の Pages サイトと衝突しないよう、キーには必ず `flower-reversi:` の接頭辞を付ける(`src/lib/storage.js` が自動で付ける)。
