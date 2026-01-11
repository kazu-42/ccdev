# ローカル開発環境セットアップ

## 前提条件

- Node.js 20+
- pnpm 9+
- Docker（Sandbox開発用）
- Cloudflareアカウント

---

## クイックスタート

### 1. リポジトリクローン

```bash
git clone https://github.com/your-username/claude-code-web.git
cd claude-code-web
```

### 2. 依存関係インストール

```bash
pnpm install
```

### 3. 環境変数設定

```bash
# ルートに.envを作成
cp .env.example .env

# apps/worker/.dev.varsを作成（ローカルSecrets）
echo "ANTHROPIC_API_KEY=sk-ant-your-key" > apps/worker/.dev.vars
```

### 4. Cloudflare認証

```bash
npx wrangler login
```

### 5. KV/D1作成（初回のみ）

```bash
# KVネームスペース作成
cd apps/worker
npx wrangler kv:namespace create SESSIONS
npx wrangler kv:namespace create SESSIONS --preview

# D1データベース作成
npx wrangler d1 create claude-code-db
cd ../..
```

`wrangler.toml`に出力されたIDを設定：

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-id"
preview_id = "your-preview-id"

[[d1_databases]]
binding = "DB"
database_name = "claude-code-db"
database_id = "your-d1-id"
```

### 6. D1マイグレーション

```bash
cd apps/worker
npx wrangler d1 execute claude-code-db --local --file=./migrations/0001_initial.sql
cd ../..
```

### 7. 開発サーバー起動

```bash
pnpm dev
```

- フロントエンド: http://localhost:5173
- Workers API: http://localhost:8787

---

## プロジェクト構成

```
claude-code-web/
├── apps/
│   ├── web/          # フロントエンド (React + Vite)
│   └── worker/       # バックエンド (Cloudflare Workers)
├── packages/
│   └── shared/       # 共通型定義
├── package.json      # Monorepo設定
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 開発コマンド

### Turborepo

```bash
# 全パッケージの開発サーバー
pnpm dev

# 全パッケージのビルド
pnpm build

# 全パッケージのテスト
pnpm test

# 型チェック
pnpm typecheck

# リント
pnpm lint
```

### フロントエンド単体

```bash
cd apps/web
pnpm dev        # 開発サーバー
pnpm build      # 本番ビルド
pnpm preview    # ビルドプレビュー
```

### バックエンド単体

```bash
cd apps/worker
pnpm dev        # ローカルWorkers
pnpm deploy     # Cloudflareデプロイ
npx wrangler tail  # ログ監視
```

---

## Sandboxローカル開発

Cloudflare Sandbox SDKはローカルでDockerを使用します。

### Docker起動確認

```bash
docker --version
docker ps
```

### 初回実行

初回の`pnpm dev`実行時、Sandboxコンテナのビルドに2-3分かかります。

### トラブルシューティング

```bash
# Dockerデーモン起動確認
docker info

# コンテナリセット
docker system prune -f
```

---

## VSCode推奨設定

### 拡張機能

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

### settings.json

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

---

## よくある問題

### pnpm installが失敗する

```bash
# pnpmキャッシュクリア
pnpm store prune

# node_modules削除
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Workers開発サーバーが起動しない

```bash
# wranglerバージョン確認
npx wrangler --version

# 最新版に更新
pnpm add -D wrangler@latest -w
```

### D1接続エラー

```bash
# ローカルD1リセット
rm -rf apps/worker/.wrangler/state
```

---

## 次のステップ

- [デプロイ手順](./deployment.md)
- [APIリファレンス](./api-reference.md)
