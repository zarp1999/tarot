# Tarot

3D タロット占い（React + Vite + Three.js）。

## ローカル起動

```bash
npm install
npm run dev
```

## 本番ビルド

```bash
npm run build
npm run preview
```

GitHub Pages 向けビルド:

```bash
VITE_BASE=/tarot/ npm run build
```

## 公開 URL

GitHub Actions で [GitHub Pages](https://pages.github.com/) にデプロイします。

- リポジトリ: https://github.com/zarp1999/tarot
- サイト: https://zarp1999.github.io/tarot/

初回のみ、リポジトリの **Settings → Pages → Source** を **GitHub Actions** にしてください（Actions の初回デプロイ後に自動設定される場合もあります）。
