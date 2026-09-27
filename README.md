# Flower Reversi

赤と青の花で遊ぶリバーシ。ブラウザだけで遊べる。

- 遊ぶ: https://tinkling-way-games.github.io/flower-reversi/
- 一人用(CPU 対戦・3 段階の難易度)と、1 台の端末を交代で使う二人用がある
- ログイン不要・通信なし。進行状況などはお使いのブラウザの `localStorage` にのみ保存される。

## 開発

Node.js 22 以上があれば、追加のパッケージをインストールせずに開発できる。

```bash
npm run verify   # 静的検査 + テスト + ビルド
npm run dev      # http://127.0.0.1:5173 で src/ を配信
```

| ドキュメント | 内容 |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | 開発ルール・制約・コマンド(AI エージェント向けだが人間にも有用) |
| [docs/game-spec.md](docs/game-spec.md) | ゲーム仕様 |
| [docs/environment.md](docs/environment.md) | 開発環境の制約と、依存ゼロ構成にした理由 |
| [docs/deploy.md](docs/deploy.md) | GitHub Pages への公開手順 |

## このプロジェクトについて

モバイル端末から [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web) を使い、企画・実装・公開までを一気通貫で行う試み。
