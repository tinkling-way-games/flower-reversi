# 開発メモ

Flower Reversi を手元で動かす・直す・公開するためのメモ。

## 手元で動かす

Node.js 22 以上があれば、追加のパッケージをインストールせずに開発できる(`npm install` は不要)。

```bash
npm run dev      # src/ をそのまま http://127.0.0.1:5173 で配信(開発用)
npm run build    # src/ を dist/ にコピー(公開物)
npm run serve    # dist/ を http://127.0.0.1:5173 で配信(先に build)
```

ゲーム本体はビルド不要のプレーンな ES Modules なので、`src/` を配信すればそのまま動く。

## コードの構成

| 場所 | 中身 |
| --- | --- |
| `src/index.html` / `style.css` / `main.js` | 公開されるページ本体。`src/` がサイトのルートになる |
| `src/lib/` | DOM に依存しないロジック(盤面とルール・CPU の思考・スコア・設定・花の庭・保存) |
| `src/ui/` | 画面遷移とゲーム進行(`app.js`)、盤面の描画と演出、効果音、デバッグ補助 |
| `test/` | `node --test` のユニットテスト |
| `scripts/` | 依存ゼロの開発スクリプト(静的検査・ビルド・開発サーバー・スモークテスト) |

> [!NOTE]
> 保存はすべて `src/lib/storage.js` を経由する。キーには `flower-reversi:` の接頭辞が付き、値はスキーマバージョン付きで保存される。`localStorage` が使えない環境(プライベートモードなど)でもゲームは起動する。

## 検証

```bash
npm run verify   # 静的検査 → ユニットテスト → ビルド(コミット前に必ず。CI もこれを使う)
npm run smoke    # 任意: Playwright があればスマホ幅で 1 手打ち、screenshots/ にスクリーンショットを保存
```

- `npm run check` は構文チェックに加えて、プロジェクトの制約(外部 URL を読み込まない・ルート絶対パスを使わない・`localStorage` 以外に保存しない)を機械的に検査する
- `src/lib/` は DOM に触らない純粋なロジックなので、Node でそのままテストできる

## 実機での不具合調査

- 予期しないエラーは画面下部に赤い帯で表示される
- URL の末尾に `?debug` を付けると、手番・合法手・処理中フラグなどの内部状態が右上に常時表示される
- ゲーム進行中にエラーが起きても、盤面から手番を立て直して対局を続けられるようにしている

## 公開(GitHub Pages)

`main` にマージすると GitHub Actions がビルドして GitHub Pages に公開する。仕組みと初回設定は [`deploy.md`](deploy.md) を参照。

## 関連ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [`game-spec.md`](game-spec.md) | ゲーム仕様(実装より先に更新する) |
| [`environment.md`](environment.md) | 開発環境の制約と、依存ゼロ構成にした理由 |
| [`deploy.md`](deploy.md) | GitHub Pages への公開手順 |
| [`../CLAUDE.md`](../CLAUDE.md) | 開発ルール・制約・コマンド(AI エージェント向けだが人間にも有用) |
