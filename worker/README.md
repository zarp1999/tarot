# Tarot Reading API (Cloudflare Worker)

カード情報を受け取り、DeepSeek で解説 JSON を返す Worker です。

## ダッシュボードへの貼り付け

1. Cloudflare → 作成済み Worker を開く
2. **Edit code** を開く
3. 既存コードをすべて消す
4. [`reading-api.js`](./reading-api.js) の内容をすべて貼る
5. **Deploy**

Secret はすでに設定済みならそのままでOKです。

- Name: `DEEPSEEK_API_KEY`
- Type: Secret

## 動作確認

### ヘルスチェック

ブラウザで:

`https://<your-worker>.workers.dev/health`

期待レスポンス:

```json
{ "ok": true, "service": "tarot-reading-api" }
```

### 解説生成

```bash
curl -X POST "https://<your-worker>.workers.dev/api/reading" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 0,
    "name": "愚者",
    "nameEn": "The Fool",
    "reversed": false,
    "language": "ja",
    "question": "転職すべきか迷っています"
  }'
```

成功時の例（質問あり）:

```json
{
  "id": 0,
  "name": "愚者",
  "language": "ja",
  "question": "転職すべきか迷っています",
  "orientation": "upright",
  "orientationLabel": "正位置",
  "topics": {
    "answer": "...",
    "advice": "...",
    "caution": "..."
  },
  "source": "deepseek"
}
```

質問が空のときは `topics` が `{ "general", "advice", "caution" }` になります（恋愛・仕事の別欄は出しません）。

## CORS

許可オリジン:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://zarp1999.github.io`

別ドメインから呼ぶ場合は `reading-api.js` の `ALLOWED_ORIGINS` に追加してください。
