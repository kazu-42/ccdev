# Technology Stack

## Architecture

- **Monorepo構成**: apps/web（フロントエンド）+ apps/worker（バックエンド）
- **Edge-First**: Cloudflare Workersによるエッジデプロイ
- **PWAファースト**: オフライン対応・モバイル最適化

## Core Technologies

### Frontend (apps/web)
- **Language**: TypeScript (strict mode)
- **Framework**: React 18 + Vite
- **Runtime**: Browser + Service Worker

### Backend (apps/worker)
- **Language**: TypeScript
- **Framework**: Hono
- **Runtime**: Cloudflare Workers (workerd)

## Key Libraries

### Frontend
| ライブラリ | 用途 |
|-----------|------|
| Zustand | 状態管理（軽量・シンプル） |
| react-markdown + remark-gfm | Markdownレンダリング |
| Shiki | シンタックスハイライト |
| Tailwind CSS | スタイリング |
| vite-plugin-pwa | PWA対応 |

### Backend
| ライブラリ | 用途 |
|-----------|------|
| Hono | ルーティング・ミドルウェア |
| @anthropic-ai/sdk | Claude API連携 |
| @cloudflare/sandbox-sdk | サンドボックス実行 |

## Development Standards

### Type Safety
- TypeScript strict mode必須
- `any` 禁止、`unknown` 推奨
- 明示的な型定義（推論に頼りすぎない）

### Code Quality
- ESLint + Prettier
- Import順序: 外部 → 内部 → ローカル
- 関数は単一責任

### Testing
- Vitest（フロントエンド）
- Workers Test（バックエンド）
- 重要パスのみE2Eテスト

## Development Environment

### Required Tools
- Node.js 20+
- pnpm 9+
- Docker（ローカルSandbox開発）
- wrangler CLI

### Common Commands
```bash
# Dev: pnpm dev
# Build: pnpm build
# Test: pnpm test
# Deploy: pnpm deploy
# Type Check: pnpm typecheck
```

## Key Technical Decisions

1. **Cloudflare Sandbox SDK**: V8 Isolates + Containersのハイブリッド
2. **Pyodide**: Python実行はクライアントサイドWASM（初回ロード許容）
3. **SSE**: AIストリーミングにはServer-Sent Eventsを使用
4. **D1 + KV**: 会話履歴はD1、セッションはKVに分離
5. **Hono**: Workers最適化された軽量フレームワーク

---
_Document standards and patterns, not every dependency_
