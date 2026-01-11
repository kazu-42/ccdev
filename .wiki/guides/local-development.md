# ローカル開発環境セットアップ

## 前提条件

- Node.js 20+
- pnpm 9+
- Cloudflareアカウント（デプロイ時のみ）

> **Note**: ローカル開発では Docker は不要です。コード実行はクライアントサイド（JavaScript: eval、Python: Pyodide）で行われます。

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
# apps/worker/.dev.varsを作成（ローカルSecrets）
echo "ANTHROPIC_API_KEY=your-api-key-here" > apps/worker/.dev.vars
```

> **重要**: Anthropic APIキーが必要です。https://console.anthropic.com/ で取得できます。

### 4. 開発サーバー起動

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

## コード実行について

### 現在の実装

- **JavaScript**: クライアントサイドで実行（console.logをキャプチャ）
- **Python**: Pyodide（WebAssembly）でブラウザ内実行
- **TypeScript**: 将来的にサーバーサイドでコンパイル＆実行予定

### 本番環境（将来）

Cloudflare Sandbox SDKを使用したサーバーサイド実行を計画中。

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

---

## 次のステップ

- [デプロイ手順](./deployment.md)
- [APIリファレンス](./api-reference.md)
