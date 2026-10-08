# my_home_page

ミテネコラボのポートフォリオサイトです。制作した Web アプリ、プロフィール、スキルを掲載しています。

## PLAYGROUND のアプリ

| アプリ | ショートブリーフ |
| --- | --- |
| [猫と学ぶ](https://cat-fortune.mitenecolab.com/) | 猫と一緒に名言に触れるアプリ。 |
| [ニュースアプリ](https://news-app.mitenecolab.com/) | ニュースを閲覧するアプリ。 |
| [MARKET ヒートマップ](https://heatmap.mitenecolab.com/) | 仮想通貨の時価総額と騰落率をヒートマップで表示するアプリ。 |
| [波を重ねる](https://ripples.mitenecolab.com/) | 波を重ねて変化を楽しむシミュレーション。 |
| [砂でひと息](https://hourglass.mitenecolab.com/) | 砂時計の動きを眺められる物理表現のアプリ。 |
| [スマホQRアンケート](https://web-survey.mitenecolab.com/) | QR コードを使ってスマートフォンから回答するアンケート。 |
| [ToDoアプリ](https://todo.mitenecolab.com/) | 個人のタスクを管理するアプリ。 |
| [チームタスク](https://team-todo.mitenecolab.com/) | チームのタスクを管理するアプリ。 |
| [寄り道検索](https://yorimichi.mitenecolab.com/) | 検索から思いがけない発見につなげるアプリ。 |

## 実装のポイント

- `public/index.html` に PLAYGROUND、PROFILE、SKILLS の各セクションを配置しています。PLAYGROUND のカードから各アプリへ移動できます。
- `public/style.css` でレイアウト、カードの配色、画面幅に応じた表示を管理しています。
- `public/app.js` を入口に、`public/js/` の ES Modules で猫のインタラクション、ナビゲーション、コーヒー、猫のレースを初期化しています。
- ビルド工程のない静的サイトです。Cloudflare の設定 (`wrangler.jsonc`) でも `public/` を配信対象にしています。
- `tests/` に Playwright のモバイル表示、操作、パフォーマンスのテストがあります。

## ローカルで実行

リポジトリのルートで次のコマンドを実行し、ブラウザーで <http://127.0.0.1:4173> を開いてください。Python 3 が必要です。

```bash
python3 -m http.server 4173 --directory public
```

テストを実行する場合は Node.js と npm を用意し、依存パッケージをインストールします。Playwright のブラウザーが未導入なら、初回のみインストールしてください。テスト実行時はローカルサーバーが自動で起動します。

```bash
npm ci
npx playwright install
npm test
```

モバイル表示のテストだけを実行する場合は `npm run test:mobile` を使います。
