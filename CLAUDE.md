# CLAUDE.md

このファイルは、このリポジトリで作業するエージェント(Claude Code)向けの作業指示書。
人間向けの概要は `README.md`、詳細は `docs/` を参照。

## プロジェクト概要

- **Flower Reversi**: ブラウザだけで遊べるリバーシ系のゲーム。ゲーム仕様は `docs/game-spec.md` に書き、実装より先に更新する。
- 公開先は **GitHub Pages**(`https://tinkling-way-games.github.io/flower-reversi/`)。
- 開発はモバイル端末から Claude Code on the web を使い、一気通貫で行う想定。人間は画面を直接確認しにくいので、エージェント側での自動検証を重視する。

## 絶対に守る制約

1. **ブラウザのみで動作する静的サイト**。サーバーサイド処理・API・外部バックエンドは使わない。
2. **ログイン・アカウント・オンライン対戦・複数人同時プレイは実装しない**(同一端末での交代プレイ/CPU対戦は可)。
3. **永続化は `localStorage` のみ**。`sessionStorage` / IndexedDB / Cookie / Cache Storage は使わない。アクセスは必ず `src/lib/storage.js` 経由にする。
4. **外部ネットワークに依存しない**。CDN・外部フォント・解析タグ・外部APIを読み込まない。アセットはリポジトリ内に置く。
5. **パスは相対パスで書く**。Pages はサブパス(`/flower-reversi/`)で配信されるため、`src="/..."` のようなルート絶対パスは壊れる。
6. **npm 依存パッケージを追加しない**(ランタイム・開発用とも)。理由は下記「実行環境の制約」。追加が必要だと判断したら、実装前にユーザーに相談する。`.claude/settings.json` で `npm install` 系は拒否設定にしてある。

制約 3〜5 は `npm run check` で機械的に検査している(`scripts/check.mjs`)。

## 実行環境の制約(重要)

作業コンテナはサンドボックスに近い制限がある。詳細は `docs/environment.md`。

- **npm レジストリに到達できない**(ネットワークポリシーで 403)。`npm install` は失敗する前提で動くこと。
- **公開サイト(`*.github.io`)にも到達できない**。デプロイの成否は GitHub Actions の実行結果で確認し、実画面の確認はユーザーに依頼する。
- そのため、ツールチェーンは **Node.js(v22 以上)の標準機能だけ**で構成している:
  - テスト: `node --test`(組み込みテストランナー)
  - 開発サーバー / ビルド / 静的検査: `scripts/*.mjs`(依存ゼロ)
- ゲーム本体は **ビルド不要のプレーンな ES Modules(JavaScript)**。TypeScript やバンドラは使わない。型は JSDoc コメントで書いてよい。
- コンテナにグローバル導入済みのツール(`playwright`, `typescript`, `prettier` 等)があれば **任意で** 使ってよいが、それらが無くても `check` / `test` / `build` が通る状態を保つ。

## コマンド

```bash
npm run check    # 構文チェック + プロジェクト制約の静的検査
npm test         # ユニットテスト (node --test)
npm run build    # src/ を dist/ にコピー(公開物)
npm run serve    # dist/ を http://127.0.0.1:5173 で配信(先に build)
npm run dev      # src/ を直接配信(開発用)
npm run smoke    # 任意: Playwright があればスマホ幅で 1 手打ってスクリーンショットを撮る
npm run verify   # check + test + build をまとめて実行(コミット前に必ず)
```

## ディレクトリ構成

```
src/               公開されるゲーム本体(このディレクトリがサイトのルート)
  index.html
  style.css
  main.js          エントリポイント(起動のみ)
  ui/              DOM・演出・音(画面遷移とゲーム進行は app.js、デバッグ補助は debug.js)
  lib/             DOM に依存しないロジック(テスト対象)
    board.js       盤面とルール
    ai.js          CPU の思考(難易度別)
    score.js       スコア計算と対戦記録
    settings.js    設定の既定値と検証
    garden.js      花の庭(ポイントで見た目を解放)
    storage.js     localStorage ラッパー(唯一の永続化窓口)
test/              node --test 用テスト(*.test.js)
scripts/           依存ゼロの開発スクリプト
docs/              設計・仕様・運用ドキュメント(公開前提)
.github/workflows/ CI と GitHub Pages デプロイ
```

## 実装方針

- **ロジックと描画を分ける**。盤面・合法手・勝敗判定・CPU思考などは `src/lib/` に純粋関数として置き、DOM を触らない。`src/ui/` はそれらを呼び出して描画するだけにする。
- `src/lib/` の変更には必ず `test/` のテストを追加・更新する。
- **モバイルファースト**: タッチ操作前提、縦画面・幅 360px 程度で破綻しないこと。ホバー依存の UI にしない。
- 保存データにはスキーマバージョンを持たせ、読み込み失敗・破損・容量超過・プライベートモード(`localStorage` が例外を投げる)でもゲームが起動するようにする。
- 追加のページやアセットも `src/` 配下に置き、相対パスで参照する。
- **発熱・電池に配慮する**(iPhone で実際に熱くなった経緯がある):
  - `infinite` のアニメーションを使わない。待機中も画面が描き直され続ける。
  - 盤上の要素に `filter` や `clip-path` を使わない。影などは SVG に描き込む。
  - 演出の粒子は同時数に上限を設ける(`MAX_PARTICLES`)。

## 作業の進め方

1. 仕様に関わる変更は、先に `docs/game-spec.md` を更新する。
2. 実装 → `npm run verify` が通ることを確認。
3. 見た目に関わる変更は、可能なら `npm run smoke` でスクリーンショットを撮り、ユーザーに共有する(モバイルからは画面確認が難しいため)。
4. コミットして指定ブランチに push する。

## 実機での不具合調査

人間はスマホでしか確認できないので、不具合報告を受けたら次を使う。

- 予期しないエラーは画面下部に赤い帯で表示される(`src/ui/debug.js`)。スクリーンショットを送ってもらう。
- 公開 URL の末尾に `?debug` を付けると、手番・合法手・処理中フラグなどの内部状態が右上に常時表示される。
- ゲーム進行中のエラーは `recover()` で盤面から手番を立て直し、対局を続けられるようにしている。
- 再現はまず Playwright でスマホ幅の自動対局を回して試す(`npm run smoke` の書き方が参考になる)。

## デプロイ

- `main` ブランチへの push で `.github/workflows/deploy.yml` が走り、`npm run build` の成果物 `dist/` を GitHub Pages に公開する。
- PR と各ブランチへの push では `.github/workflows/ci.yml` が `verify` を実行する。
- 初回のみ、リポジトリ設定で Pages のソースを「GitHub Actions」にする必要がある。手順は `docs/deploy.md`。

## 公開リポジトリとしての注意

このリポジトリは公開される。コード・ドキュメント・コミットメッセージに以下を書かない:

- 個人のメールアドレス・本名・居住地などの個人情報
- トークン・APIキー・内部 URL・社内事情などの機密
- 作業中の個人的なメモ(必要なら Issue に書く)

ドキュメントは第三者が読んでも意味が通るように、背景と理由を添えて書く。
