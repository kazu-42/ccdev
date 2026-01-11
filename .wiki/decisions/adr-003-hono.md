# ADR-003: Honoフレームワークの選定

## ステータス
承認済み

## 日付
2025-01-11

## コンテキスト

Cloudflare Workers上でAPIを構築するために、軽量で高速なWebフレームワークが必要です。

### 検討した選択肢

#### 選択肢1: Hono
- Cloudflare Workers最適化
- 超軽量（14KB）
- Express風API

#### 選択肢2: itty-router
- 最小サイズ（< 1KB）
- 基本的なルーティングのみ
- ミドルウェアサポートが限定的

#### 選択肢3: Worktop
- Cloudflare公式ライブラリ
- KV統合が良い
- メンテナンス頻度低い

#### 選択肢4: 素のWorkers API
- 依存なし
- 完全なコントロール
- ボイラープレート多い

## 決定

**Hono**をAPIフレームワークとして採用する。

## 理由

1. **Cloudflare最適化**
   - Workers環境を第一クラスサポート
   - エッジランタイム向けに設計

2. **開発体験**
   - Express/Fastify風の馴染みあるAPI
   - TypeScriptファーストの型安全性

3. **パフォーマンス**
   - 超軽量（バンドルサイズ最小）
   - 高速なルーティング

4. **豊富なミドルウェア**
   - CORS, Bearer Auth, Logging
   - カスタムミドルウェア作成容易

5. **活発なコミュニティ**
   - 頻繁なアップデート
   - 良好なドキュメント

## 結果

### ポジティブ
- 開発効率の向上
- 型安全なAPIルーティング
- ミドルウェアによる関心の分離

### ネガティブ
- 外部依存の追加
- Hono固有のパターン学習

## 実装例

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono<{ Bindings: Env }>();

// ミドルウェア
app.use('*', cors());
app.use('*', logger());

// ルート
app.post('/api/chat', async (c) => {
  const { messages } = await c.req.json();
  // SSEストリーミング
  return c.stream(async (stream) => {
    // ...
  });
});

app.post('/api/execute', async (c) => {
  const { code, language } = await c.req.json();
  // ...
});

export default app;
```

## 関連
- [APIリファレンス](../guides/api-reference.md)
- [システムアーキテクチャ](../architecture/system-overview.md)
