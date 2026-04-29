# ポケカ山札ドロー確率計算アプリ

モバイル利用を前提にした、ポケモンカード向けの確率計算Webアプリです。依存関係なしの静的HTML/CSS/JavaScriptなので、GitHub Pagesや任意の静的ホスティングにそのままアップできます。

## できること

- 山札枚数 / 引く枚数 / 対象カード枚数から、少なくとも1枚引く確率を計算
- 縦引きの確率を計算
- 手札を山札に混ぜて引き直す動きを、戻す枚数・対象枚数を指定して計算
- 条件付き確率をステップ形式で計算
- AまたはB、BまたはC、A/B/Cいずれか、AとBを両方などを計算
- 条件を満たした後の山札状態を分布として更新し、次ステップに反映

## ファイル構成

```text
.
├── index.html
├── assets
│   ├── app.js
│   └── styles.css
└── README.md
```

## ローカルで開く

`index.html` をブラウザで開くだけで動きます。

簡易サーバーで確認する場合:

```bash
python3 -m http.server 5173
```

その後、ブラウザで `http://localhost:5173` を開いてください。

## GitHub Pagesへのアップロード

```bash
git init
git add .
git commit -m "Initial probability app"
git branch -M main
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```

GitHubのRepository Settingsから Pages を開き、`main` branch / root を指定すると公開できます。

## 入力例

「3枚引いて山に3枚あるカードAを引いた上で、その後Aの効果で追加ドローし、山札に2枚あるB、または5枚あるCを引く」場合:

1. 初期状態で A=3、B=2、C=5 を入力
2. STEP1: 縦引き / 3枚引く / Aのどれか1種
3. STEP2: 縦引き / 追加で引く枚数を入力 / BとCを選択 / どれか1種
4. 最下部に「全ステップを順番に満たす確率」が表示されます

## 注意

このアプリは、山札内の対象カード枚数をもとにした数学的な厳密計算を行います。実際のプレイでは、サイド落ち・手札・トラッシュ・公開情報・サーチカードの制約などもあるため、必要に応じて初期山札枚数や対象枚数を調整してください。
