# デプロイ手順

## 概要

Claude Code Webは以下の構成でデプロイされます：

- **フロントエンド**: Cloudflare Pages（静的サイト）
- **バックエンド**: Cloudflare Workers
- **データ**: D1 + KV

---

## 前提条件

- Cloudflareアカウント（Free または Paid）
- Anthropic APIキー
- wrangler CLI認証済み

---

## 初回デプロイ

### 1. Cloudflareリソース作成

```bash
cd apps/worker

# KVネームスペース作成
npx wrangler kv:namespace create SESSIONS

# D1データベース作成
npx wrangler d1 create claude-code-db
```

### 2. wrangler.toml設定

```toml
name = "claude-code-web-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "SESSIONS"
id = "<your-kv-id>"

[[d1_databases]]
binding = "DB"
database_name = "claude-code-db"
database_id = "<your-d1-id>"

[sandbox]
binding = "SANDBOX"
```

### 3. Secrets設定

```bash
# Anthropic APIキー
npx wrangler secret put ANTHROPIC_API_KEY
# プロンプトに従ってキーを入力
```

### 4. D1マイグレーション

```bash
npx wrangler d1 execute claude-code-db --file=./migrations/0001_initial.sql
```

### 5. Workersデプロイ

```bash
npx wrangler deploy
```

### 6. フロントエンドデプロイ

```bash
cd ../web
pnpm build

# Cloudflare Pagesに手動アップロード
# または
npx wrangler pages deploy dist
```

---

## カスタムドメイン設定

### Workers

1. Cloudflareダッシュボード → Workers → 設定
2. 「ドメインとルート」→「カスタムドメインを追加」
3. 例: `api.yourdomain.com`

### Pages

1. Cloudflareダッシュボード → Pages → プロジェクト
2. 「カスタムドメイン」→「ドメインを追加」
3. 例: `code.yourdomain.com`

---

## CI/CD設定（GitHub Actions）

### .github/workflows/deploy.yml

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm build

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/worker
          command: deploy

  deploy-pages:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm build

      - name: Deploy Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy apps/web/dist --project-name=claude-code-web
```

### GitHub Secrets設定

1. リポジトリ → Settings → Secrets → Actions
2. `CLOUDFLARE_API_TOKEN` を追加
   - Cloudflareダッシュボードで「API Tokens」からトークン作成
   - 権限: Workers Scripts (Edit), Pages (Edit), D1 (Edit), KV (Edit)

---

## 環境別設定

### 開発環境

```toml
# wrangler.toml
[env.dev]
name = "claude-code-web-api-dev"
```

```bash
npx wrangler deploy --env dev
```

### ステージング環境

```toml
[env.staging]
name = "claude-code-web-api-staging"
```

```bash
npx wrangler deploy --env staging
```

---

## ロールバック

### Workers

```bash
# デプロイ履歴確認
npx wrangler deployments list

# 特定バージョンにロールバック
npx wrangler rollback <deployment-id>
```

### D1

```sql
-- 手動でデータ復元が必要
-- 定期的なバックアップを推奨
```

---

## モニタリング

### Workers Analytics

Cloudflareダッシュボード → Workers → Analytics

確認項目：
- リクエスト数
- レイテンシ（P50, P99）
- エラー率
- CPU時間

### ログ確認

```bash
# リアルタイムログ
npx wrangler tail

# フィルタ付き
npx wrangler tail --format=pretty --search="error"
```

---

## コスト管理

### Free Tier制限

| リソース | 制限 |
|---------|------|
| Workers リクエスト | 100,000/日 |
| KV 読み取り | 100,000/日 |
| D1 読み取り | 5M/日 |

### Paid Plan ($5/月)

| リソース | 制限 |
|---------|------|
| Workers リクエスト | 10M/月 |
| KV 読み取り | 10M/月 |
| D1 読み取り | 25B/月 |

### コスト監視

Cloudflareダッシュボード → 課金 → 使用量

アラート設定推奨。

---

## トラブルシューティング

### デプロイ失敗

```bash
# 詳細ログ確認
npx wrangler deploy --verbose

# 依存関係確認
pnpm install --force
```

### Sandbox起動エラー

初回デプロイ後、Sandboxコンテナのプロビジョニングに2-3分かかります。

### D1接続エラー

```bash
# データベース状態確認
npx wrangler d1 info claude-code-db
```

---

## 関連ドキュメント

- [ローカル開発環境](./local-development.md)
- [APIリファレンス](./api-reference.md)
