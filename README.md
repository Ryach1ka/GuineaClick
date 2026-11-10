# GuineaClick

モルモットをなでてハートを集めるクリッカーゲーム。

## 使い方

最初に1回だけ、必要なパッケージを入れる：

```bash
npm install
```

| コマンド | すること |
|---|---|
| `npm run dev` | 開発用サーバーを起動（http://localhost:5173）。保存すると自動で画面が更新される |
| `npm test` | ゲームの計算のテストを実行 |
| `npm run test:watch` | ファイルを保存するたびにテストを実行 |
| `npm run build` | 配布用のファイルを `dist/` に作る |
| `npm run preview` | `dist/` の中身を確認用に表示 |

`index.html` をダブルクリックしても動かない（`npm run dev` を使う）。

## ファイル構成

```
index.html        画面の骨組み（モルモットの絵もここ）
src/
  main.js         入口。部品を組み立てて開始する
  data.js         品物・実績・数値などのデータ（バランス調整はここ）
  game.js         ゲームの状態と計算（画面には触らない）
  save.js         セーブデータの保存と読み込み
  ui.js           画面の表示とイベント
  format.js       「12.3万」のような数の表示
  sound.js        効果音
  style.css       見た目
tests/            Vitest のテスト
```

## 開発中の小技

`npm run dev` で開いたページのコンソールで：

```js
guinea.ui.spawnGolden()     // きんのにんじんをすぐ出す
guinea.game.state.count = 1e6  // ハートを増やす
```

## ライセンス

[MIT License](LICENSE)。文字のフォント「Zen Maru Gothic」は Google Fonts から読み込んでいます（SIL Open Font License）。
