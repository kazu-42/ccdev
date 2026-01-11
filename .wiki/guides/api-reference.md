# API リファレンス

## 概要

Claude Code Web APIは以下のエンドポイントを提供します。

- **Base URL**: `https://api.yourdomain.com` (または `https://your-worker.workers.dev`)

---

## 認証

現在のMVPでは認証は未実装です。将来的にCloudflare Accessまたはカスタム認証を追加予定。

---

## エンドポイント

### POST /api/chat

AIとのチャット対話。Server-Sent Events (SSE) でストリーミングレスポンスを返します。

#### Request

```http
POST /api/chat
Content-Type: application/json
```

```json
{
  "messages": [
    { "role": "user", "content": "Hello, can you help me with Python?" },
    { "role": "assistant", "content": "Of course! What would you like help with?" },
    { "role": "user", "content": "Write a function to calculate factorial" }
  ],
  "model": "claude-sonnet-4-20250514"
}
```

#### Parameters

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| messages | Message[] | Yes | - | 会話履歴 |
| model | string | No | claude-sonnet-4-20250514 | 使用モデル |

#### Message Type

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}
```

#### Response (SSE)

```
event: message
data: {"content": "Here's a "}

event: message
data: {"content": "factorial function"}

event: tool_use
data: {"name": "execute_code", "input": {"language": "python", "code": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(5))"}}

event: tool_result
data: {"result": {"stdout": "120\n", "stderr": "", "exitCode": 0}}

event: message
data: {"content": "The output shows 120, which is 5!"}

event: done
data: {}
```

#### SSE Event Types

| イベント | データ | 説明 |
|---------|--------|------|
| message | `{ content: string }` | テキストチャンク |
| tool_use | `{ name: string, input: object }` | ツール呼び出し |
| tool_result | `{ result: object }` | ツール実行結果 |
| done | `{}` | ストリーム終了 |
| error | `{ message: string }` | エラー発生 |

#### Errors

| Status | 説明 |
|--------|------|
| 400 | 不正なリクエスト形式 |
| 401 | 認証エラー（APIキー未設定） |
| 429 | レートリミット超過 |
| 500 | サーバーエラー |

---

### POST /api/execute

コードを実行し、結果を返します。

#### Request

```http
POST /api/execute
Content-Type: application/json
```

```json
{
  "code": "console.log('Hello, World!');",
  "language": "javascript",
  "timeout": 10000
}
```

#### Parameters

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| code | string | Yes | - | 実行するコード |
| language | string | Yes | - | 言語 (`javascript`, `typescript`) |
| timeout | number | No | 30000 | タイムアウト (ms) |

#### Response

```json
{
  "stdout": "Hello, World!\n",
  "stderr": "",
  "exitCode": 0,
  "executionTime": 15
}
```

#### Response Fields

| フィールド | 型 | 説明 |
|-----------|-----|------|
| stdout | string | 標準出力 |
| stderr | string | 標準エラー出力 |
| exitCode | number | 終了コード (0 = 成功) |
| executionTime | number | 実行時間 (ms) |

#### Errors

| Status | 説明 |
|--------|------|
| 400 | 不正なリクエスト形式 |
| 408 | タイムアウト |
| 500 | 実行エラー |

---

## Tool定義

AIが使用できるツールの定義です。

### execute_code

```json
{
  "name": "execute_code",
  "description": "Execute code in a sandboxed environment. Use this to run and test code.",
  "input_schema": {
    "type": "object",
    "properties": {
      "language": {
        "type": "string",
        "enum": ["javascript", "typescript", "python"],
        "description": "The programming language of the code"
      },
      "code": {
        "type": "string",
        "description": "The code to execute"
      }
    },
    "required": ["language", "code"]
  }
}
```

---

## クライアント実装例

### JavaScript/TypeScript

```typescript
// チャットリクエスト
async function chat(messages: Message[]): Promise<void> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const event = line.slice(7);
        // イベント処理
      }
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        // データ処理
      }
    }
  }
}
```

### cURL

```bash
# チャットリクエスト
curl -X POST https://api.yourdomain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}' \
  --no-buffer

# コード実行
curl -X POST https://api.yourdomain.com/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code":"console.log(1+1)","language":"javascript"}'
```

---

## レートリミット

| エンドポイント | 制限 |
|--------------|------|
| /api/chat | 60リクエスト/分 |
| /api/execute | 30リクエスト/分 |

超過時は `429 Too Many Requests` を返します。

---

## CORS

許可されるオリジン：
- 開発: `http://localhost:5173`
- 本番: カスタムドメイン設定による

---

## 関連ドキュメント

- [ローカル開発環境](./local-development.md)
- [デプロイ手順](./deployment.md)
