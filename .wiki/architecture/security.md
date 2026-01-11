# セキュリティモデル

## 概要

Claude Code Webは、安全なコード実行環境を提供するために多層的なセキュリティ対策を実装しています。

---

## 脅威モデル

### 特定された脅威

| 脅威 | 深刻度 | 発生確率 | 対策 |
|------|-------|---------|------|
| Sandbox Escape | 高 | 低 | V8 Isolates隔離 |
| API Key漏洩 | 高 | 中 | Secrets管理 |
| XSS攻撃 | 中 | 中 | HTMLエスケープ |
| DoS攻撃 | 中 | 高 | レートリミット |
| インジェクション | 高 | 中 | 入力サニタイズ |

---

## セキュリティ境界

```
┌─────────────────────────────────────────────────┐
│                 Trust Boundary 1                 │
│  ┌───────────────────────────────────────────┐  │
│  │            クライアント（PWA）             │  │
│  │  - ユーザー入力                           │  │
│  │  - Pyodide（隔離実行）                    │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                        │
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────┐
│                 Trust Boundary 2                 │
│  ┌───────────────────────────────────────────┐  │
│  │         Cloudflare Workers                 │  │
│  │  - APIゲートウェイ                        │  │
│  │  - 認証・認可                             │  │
│  └───────────────────────────────────────────┘  │
│                        │                         │
│                        ▼                         │
│  ┌───────────────────────────────────────────┐  │
│  │              Trust Boundary 3              │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │        Cloudflare Sandbox            │  │  │
│  │  │  - V8 Isolates                       │  │  │
│  │  │  - ネットワーク隔離                   │  │  │
│  │  │  - メモリ制限                        │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## セキュリティコントロール

### 1. Sandbox隔離

**技術**: Cloudflare Sandbox SDK (V8 Isolates)

**保護内容**:
- プロセス隔離によるホストシステム保護
- ファイルシステムアクセス制限
- ネットワークアクセスのホワイトリスト制御

**実装**:
```typescript
// Sandboxは自動的に隔離される
const sandbox = await getSandbox(env.SANDBOX);
const result = await sandbox.exec('node', ['-e', code], {
  timeout: 30000,
  // ネットワークはデフォルトで制限
});
```

### 2. API Key管理

**技術**: Cloudflare Secrets

**保護内容**:
- APIキーのコード外保管
- 環境変数としての注入
- ログへの出力防止

**実装**:
```bash
# デプロイ時にSecretを設定
wrangler secret put ANTHROPIC_API_KEY
```

```typescript
// コード内での使用
const apiKey = env.ANTHROPIC_API_KEY;
// ログに出力しない
```

### 3. 入力バリデーション

**技術**: Zod / カスタムバリデーション

**保護内容**:
- SQLインジェクション防止
- XSS攻撃防止
- コードインジェクション防止

**実装**:
```typescript
import { z } from 'zod';

const executeSchema = z.object({
  code: z.string().max(100000), // サイズ制限
  language: z.enum(['javascript', 'typescript']),
  timeout: z.number().max(30000).optional(),
});
```

### 4. レートリミット

**技術**: Cloudflare Rate Limiting / カスタム実装

**保護内容**:
- DoS攻撃緩和
- リソース消費制限
- API濫用防止

**実装**:
```typescript
// KVベースのレートリミット
const key = `ratelimit:${clientIP}`;
const count = await env.KV.get(key);
if (count && parseInt(count) > LIMIT) {
  return new Response('Too Many Requests', { status: 429 });
}
```

### 5. HTTPS強制

**技術**: Cloudflare SSL/TLS

**保護内容**:
- 通信の暗号化
- 中間者攻撃防止
- データ整合性保証

**設定**: Cloudflareダッシュボードでの設定（自動）

---

## クライアントサイドセキュリティ

### Pyodide隔離

Pyodideは以下の点で隔離されています：

- **WebAssemblyサンドボックス**: ブラウザのセキュリティモデル内で実行
- **ファイルシステム**: 仮想ファイルシステム（メモリ内）
- **ネットワーク**: デフォルトで無効

### Content Security Policy（推奨）

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'wasm-unsafe-eval';
               style-src 'self' 'unsafe-inline';">
```

---

## 監査ログ

### ログ対象

| イベント | ログ内容 | 保持期間 |
|---------|---------|---------|
| API呼び出し | タイムスタンプ、エンドポイント、IPハッシュ | 7日 |
| コード実行 | 言語、実行時間、結果コード | 7日 |
| エラー | エラー種別、スタックトレース | 30日 |

### ログ出力

```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'code_execution',
  language: 'javascript',
  executionTime: 15,
  exitCode: 0,
  // コード内容はログしない（機密性）
}));
```

---

## セキュリティチェックリスト

### デプロイ前

- [ ] ANTHROPIC_API_KEYがSecretに設定されている
- [ ] CORS設定が本番ドメインに限定されている
- [ ] レートリミットが有効になっている
- [ ] HTTPSが強制されている

### 定期確認

- [ ] 依存パッケージの脆弱性スキャン（npm audit）
- [ ] Cloudflare Analyticsでの異常トラフィック確認
- [ ] エラーログの確認

---

## 関連ドキュメント

- [システムアーキテクチャ](./system-overview.md)
- [ADR-001: Cloudflare Sandbox](../decisions/adr-001-cloudflare-sandbox.md)
