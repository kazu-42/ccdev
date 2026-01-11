# Project Structure

## Organization Philosophy

**Feature-First with Layered Architecture**
- 機能ごとにまとまりを持たせつつ、共通層は分離
- Monorepoでフロントエンド・バックエンドを一元管理
- 共有型定義は packages/shared に集約

## Directory Patterns

### Monorepo Root
**Location**: `/`
**Purpose**: ワークスペース設定、CI/CD、ドキュメント
**Files**: `package.json`, `turbo.json`, `README.md`

### Frontend Application
**Location**: `/apps/web/`
**Purpose**: PWAフロントエンド（React + Vite）
**Structure**:
```
apps/web/
├── src/
│   ├── components/     # UIコンポーネント
│   ├── hooks/          # カスタムフック
│   ├── stores/         # Zustandストア
│   ├── lib/            # ユーティリティ
│   ├── App.tsx
│   └── main.tsx
├── public/             # 静的アセット
└── vite.config.ts
```

### Backend Application
**Location**: `/apps/worker/`
**Purpose**: Cloudflare Workers API
**Structure**:
```
apps/worker/
├── src/
│   ├── routes/         # APIルートハンドラ
│   ├── services/       # ビジネスロジック
│   ├── middleware/     # Honoミドルウェア
│   ├── types.ts
│   └── index.ts
└── wrangler.toml
```

### Shared Packages
**Location**: `/packages/shared/`
**Purpose**: フロントエンド・バックエンド共通の型定義・定数
**Example**: `types.ts`, `constants.ts`

### Documentation
**Location**: `/docs/`
**Purpose**: セットアップガイド、アーキテクチャ図
**Example**: `SETUP.md`, `ARCHITECTURE.md`

### Wiki (DeepWiki Style)
**Location**: `/.wiki/`
**Purpose**: 詳細な開発ドキュメント（機能解説、決定記録）
**Structure**:
```
.wiki/
├── index.md            # 目次
├── architecture/       # アーキテクチャ解説
├── features/           # 機能別ドキュメント
├── decisions/          # ADR（アーキテクチャ決定記録）
└── guides/             # 開発ガイド
```

## Naming Conventions

- **Files**: kebab-case（例: `chat-container.tsx`）
- **Components**: PascalCase（例: `ChatContainer`）
- **Functions**: camelCase（例: `sendMessage`）
- **Constants**: UPPER_SNAKE_CASE（例: `MAX_TIMEOUT`）
- **Types/Interfaces**: PascalCase（例: `Message`, `ChatState`）

## Import Organization

```typescript
// 1. 外部ライブラリ
import { useState } from 'react'
import { Hono } from 'hono'

// 2. 内部パッケージ（エイリアス）
import { Message } from '@shared/types'
import { ChatContainer } from '@/components/Chat'

// 3. ローカルモジュール
import { formatMessage } from './utils'
```

**Path Aliases**:
- `@/`: `apps/web/src/`
- `@shared/`: `packages/shared/src/`

## Code Organization Principles

1. **Colocation**: 関連ファイルは近くに配置（コンポーネント+スタイル+テスト）
2. **Barrel Exports**: ディレクトリには `index.ts` でエクスポート
3. **Single Responsibility**: 1ファイル1責務
4. **Dependency Direction**: 内側（lib）から外側（components）への依存のみ

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
