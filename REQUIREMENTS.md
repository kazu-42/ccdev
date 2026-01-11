# Claude Code Web セルフホスト版 - 要件定義 & プランニング

## 1. プロジェクト概要

### 1.1 目的
Claude Code Webのようなブラウザベースのコード実行・AI対話環境をセルフホストで構築する。Cloudflare Sandbox（Workers + Browser Rendering/Containers）を活用し、安全なコード実行環境を提供する。

### 1.2 ターゲットユーザー
- 個人開発者
- チーム開発での共有ツールとして
- モバイルからも軽量にコード実行したい人

### 1.3 コアバリュー
- **セルフホスト**: 自分のCloudflareアカウントで完結
- **セキュア**: サンドボックス環境でのコード実行
- **どこでも**: PWA対応でスマホからも快適に利用

---

## 2. 機能要件

### 2.1 Must Have（MVP）

#### チャットインターフェース
- [ ] Markdownレンダリング（コードブロック対応）
- [ ] ストリーミングレスポンス表示
- [ ] 会話履歴の保持（セッション中）
- [ ] コード実行結果のインライン表示

#### コード実行環境（Sandbox）
- [ ] JavaScript/TypeScript実行
- [ ] Python実行（Pyodide経由）
- [ ] 実行タイムアウト設定（30秒）
- [ ] メモリ制限
- [ ] stdout/stderr のキャプチャ

#### AI連携
- [ ] Anthropic API連携（Claude 3.5/4）
- [ ] Tool Use（Function Calling）対応
- [ ] 自動コード実行判定

#### PWA対応
- [ ] Service Worker
- [ ] マニフェスト
- [ ] オフライン時の基本UI表示
- [ ] ホーム画面追加対応

### 2.2 Should Have（v1.1）

- [ ] ファイルシステム（仮想）
- [ ] 複数言語対応拡張（Go, Rust via WASM）
- [ ] 会話履歴のKV永続化
- [ ] シンタックスハイライト（Monaco Editor）
- [ ] コード編集モード

### 2.3 Could Have（v2.0）

- [ ] マルチユーザー認証（Cloudflare Access）
- [ ] 共有ワークスペース
- [ ] R2へのファイル保存
- [ ] 画像生成・表示対応
- [ ] Webスクレイピング（Browser Rendering）

---

## 3. 非機能要件

### 3.1 パフォーマンス
- 初期ロード: < 3秒（3G回線）
- コード実行開始: < 500ms（コールドスタート含む）
- レスポンス開始: < 1秒（AIストリーミング）

### 3.2 セキュリティ
- サンドボックス環境での隔離実行
- ネットワークアクセス制限（ホワイトリスト方式）
- 入力サニタイズ
- APIキーのSecrets管理

### 3.3 可用性
- Cloudflare Workersのグローバルエッジデプロイ
- 99.9%�kind可用性目標

### 3.4 スケーラビリティ
- Cloudflare Workers: 自動スケール
- 同時接続: 制限なし（Workersの制約に依存）

---

## 4. 技術アーキテクチャ

### 4.1 システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         クライアント                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              PWA (React + Vite)                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ Chat UI     │  │ Code Editor │  │ Output Display  │   │  │
│  │  │ (Markdown)  │  │ (Monaco)    │  │ (Terminal-like) │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (WebSocket for streaming)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Cloudflare Workers (API Gateway)             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ /api/chat   │  │ /api/exec   │  │ /api/files      │   │  │
│  │  │ (AI対話)    │  │ (コード実行)│  │ (ファイル管理)   │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │ Anthropic   │      │ Cloudflare  │      │ Cloudflare  │     │
│  │ API         │      │ Sandbox     │      │ KV/R2       │     │
│  │ (外部)      │      │ (コード実行)│      │ (永続化)    │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 技術スタック

#### フロントエンド
| レイヤー | 技術 | 理由 |
|---------|------|------|
| フレームワーク | React 18 + Vite | 高速ビルド、PWA対応容易 |
| スタイリング | Tailwind CSS | 迅速なUI構築 |
| 状態管理 | Zustand | シンプル、軽量 |
| Markdown | react-markdown + remark-gfm | コードブロック対応 |
| コードハイライト | Shiki | 高品質シンタックスハイライト |
| エディタ | Monaco Editor (optional) | VSCode互換 |

#### バックエンド（Cloudflare）
| レイヤー | 技術 | 理由 |
|---------|------|------|
| API | Cloudflare Workers | エッジ実行、低レイテンシ |
| ルーティング | Hono | 軽量、Workers最適化 |
| Sandbox | workerd isolates / Containers | 安全なコード実行 |
| DB | D1 (SQLite) | 会話履歴保存 |
| KV | Workers KV | セッション管理 |
| ストレージ | R2 | ファイル保存 |
| 認証 | Cloudflare Access (optional) | 認証・認可 |

### 4.3 Sandbox実装方式の比較

| 方式 | メリット | デメリット | 推奨用途 |
|-----|---------|-----------|---------|
| **V8 Isolates (Workers)** | 超低レイテンシ、無料枠大 | JS/WASM限定 | JS/TS実行 |
| **Browser Rendering** | ブラウザAPI利用可 | 比較的遅い、コスト高 | Webスクレイピング |
| **Containers (Beta)** | 任意言語、フル環境 | コールドスタート遅い | Python, Go等 |
| **Pyodide (WASM)** | Python完全互換 | 初期ロード重い | Python実行 |

**MVP推奨**: V8 Isolates + Pyodide (クライアントサイド)

---

## 5. API設計

### 5.1 エンドポイント一覧

```yaml
# チャット
POST /api/chat
  Request:
    messages: Message[]
    model?: string
  Response: SSE (streaming)
    event: message | tool_use | tool_result | done
    data: { content: string, ... }

# コード実行
POST /api/execute
  Request:
    code: string
    language: "javascript" | "typescript" | "python"
    timeout?: number (ms, default: 30000)
  Response:
    stdout: string
    stderr: string
    exitCode: number
    executionTime: number

# ファイル操作（v1.1）
GET    /api/files           # 一覧
POST   /api/files           # 作成
GET    /api/files/:path     # 読み取り
PUT    /api/files/:path     # 更新
DELETE /api/files/:path     # 削除
```

### 5.2 Tool定義（Claude用）

```typescript
const tools = [
  {
    name: "execute_code",
    description: "Execute code in a sandboxed environment",
    input_schema: {
      type: "object",
      properties: {
        language: {
          type: "string",
          enum: ["javascript", "typescript", "python"],
          description: "Programming language"
        },
        code: {
          type: "string",
          description: "Code to execute"
        }
      },
      required: ["language", "code"]
    }
  },
  {
    name: "read_file",
    description: "Read a file from the virtual filesystem",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"]
    }
  },
  {
    name: "write_file",
    description: "Write content to a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" }
      },
      required: ["path", "content"]
    }
  }
];
```

---

## 6. ディレクトリ構成

```
claude-code-web-selfhost/
├── apps/
│   ├── web/                      # フロントエンド (PWA)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Chat/
│   │   │   │   │   ├── ChatContainer.tsx
│   │   │   │   │   ├── MessageList.tsx
│   │   │   │   │   ├── MessageItem.tsx
│   │   │   │   │   ├── InputArea.tsx
│   │   │   │   │   └── CodeBlock.tsx
│   │   │   │   ├── Output/
│   │   │   │   │   ├── OutputPanel.tsx
│   │   │   │   │   └── Terminal.tsx
│   │   │   │   └── Layout/
│   │   │   │       ├── Header.tsx
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       └── MobileNav.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useChat.ts
│   │   │   │   ├── useCodeExecution.ts
│   │   │   │   └── useVirtualFS.ts
│   │   │   ├── stores/
│   │   │   │   ├── chatStore.ts
│   │   │   │   └── settingsStore.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts
│   │   │   │   ├── pyodide.ts
│   │   │   │   └── markdown.ts
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── sw.ts              # Service Worker
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── icons/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── worker/                    # バックエンド (Cloudflare Workers)
│       ├── src/
│       │   ├── index.ts           # エントリポイント (Hono)
│       │   ├── routes/
│       │   │   ├── chat.ts        # /api/chat
│       │   │   ├── execute.ts     # /api/execute
│       │   │   └── files.ts       # /api/files
│       │   ├── services/
│       │   │   ├── anthropic.ts   # Anthropic API
│       │   │   ├── sandbox.ts     # コード実行
│       │   │   └── storage.ts     # KV/R2操作
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   └── cors.ts
│       │   └── types.ts
│       ├── wrangler.toml
│       └── package.json
│
├── packages/
│   └── shared/                    # 共通型定義等
│       ├── src/
│       │   ├── types.ts
│       │   └── constants.ts
│       └── package.json
│
├── docs/
│   ├── SETUP.md                   # セットアップガイド
│   └── ARCHITECTURE.md            # アーキテクチャ詳細
│
├── package.json                   # monorepo設定
├── turbo.json                     # Turborepo設定
└── README.md
```

---

## 7. 開発フェーズ

### Phase 1: 基盤構築（Week 1）
- [ ] Monorepo セットアップ（pnpm + Turborepo）
- [ ] Cloudflare Workers プロジェクト作成
- [ ] React + Vite セットアップ
- [ ] 基本的なUI骨格

### Phase 2: コア機能（Week 2-3）
- [ ] チャットUI実装
- [ ] Anthropic API連携
- [ ] ストリーミングレスポンス
- [ ] JavaScript Sandbox実行

### Phase 3: Sandbox拡張（Week 4）
- [ ] Pyodide統合（Python実行）
- [ ] タイムアウト・メモリ制限
- [ ] エラーハンドリング強化

### Phase 4: PWA化（Week 5）
- [ ] Service Worker実装
- [ ] マニフェスト設定
- [ ] オフライン対応
- [ ] モバイルUI最適化

### Phase 5: 品質向上（Week 6）
- [ ] テスト追加
- [ ] パフォーマンス最適化
- [ ] ドキュメント整備
- [ ] デプロイ自動化

---

## 8. セットアップ手順（予定）

```bash
# 1. リポジトリクローン
git clone https://github.com/xxx/claude-code-web-selfhost.git
cd claude-code-web-selfhost

# 2. 依存関係インストール
pnpm install

# 3. 環境変数設定
cp .env.example .env
# ANTHROPIC_API_KEY=sk-ant-xxx を設定

# 4. Cloudflare認証
npx wrangler login

# 5. KV/D1作成
npx wrangler kv:namespace create SESSIONS
npx wrangler d1 create claude-code-db

# 6. ローカル開発
pnpm dev

# 7. デプロイ
pnpm deploy
```

---

## 9. コスト試算

### Cloudflare Workers（Free Tier）
- リクエスト: 100,000/日
- CPU時間: 10ms/リクエスト

### Cloudflare Workers（Paid $5/月）
- リクエスト: 10M/月
- CPU時間: 30秒/リクエスト

### Anthropic API
- Claude 3.5 Sonnet: $3/1M input, $15/1M output
- 月1000回の対話（平均2000トークン）: 約$30-50/月

**推定月額コスト**: $5（Cloudflare）+ $30-50（Anthropic）= **$35-55/月**

---

## 10. リスクと対策

| リスク | 影響度 | 対策 |
|-------|-------|------|
| Sandbox escape | 高 | V8 isolates の厳格な制限、ネットワーク制限 |
| API key漏洩 | 高 | Secrets管理、環境変数 |
| 無限ループ | 中 | タイムアウト強制終了 |
| コスト超過 | 中 | レートリミット、アラート設定 |
| Pyodideロード時間 | 低 | プリロード、キャッシュ |

---

## 11. 参考リソース

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Anthropic API Reference](https://docs.anthropic.com/)
- [Pyodide](https://pyodide.org/)
- [Hono - Web Framework](https://hono.dev/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

---

## 12. 次のアクション

1. **今すぐ**: このドキュメントのレビュー・フィードバック
2. **決定事項**: 
   - プロジェクト名の決定
   - Python対応を MVP に含めるか
   - 認証機能の優先度
3. **開発開始**: Phase 1 の基盤構築から着手

---

*最終更新: 2025-01-11*
