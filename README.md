# ポケカ山札ドロー確率計算アプリ

モバイル利用を前提にした、ポケモンカード向けの確率計算Webアプリです。依存関係なしの静的HTML/CSS/JavaScriptなので、GitHub Pagesや任意の静的ホスティングにそのままアップできます。

## できること

- 山札枚数 / 引く枚数 / 対象カード枚数から、少なくとも1枚引く確率を計算
- カード効果をタップして、順番に条件付きシナリオへ追加
- 博士の研究、リーリエの決心、スペシャルレッドカード、さかてにとる、お使いダッシュ、みどりのまいに対応
- 手札をトラッシュして引く / 手札を山札に戻して引く / 手札を山札の下に戻して引く / 通常ドローを区別
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

## 画像URLの差し替え

`assets/app.js` の `EFFECTS` にある `imageUrl` を差し替えるだけで、カード画像が表示されます。

例:

```js
midori: {
  label: 'みどりのまい',
  imageUrl: 'https://www.pokemon-card.com/assets/images/card_images/large/MC/048798_P_OGAPONMIDORINOMENEX.jpg',
}
```

`imageUrl` が空欄の場合は、テキストカードとして表示されます。

## ローカルで開く

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
