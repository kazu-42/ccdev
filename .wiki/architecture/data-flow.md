# データフロー

## 概要

このドキュメントでは、Claude Code Webの主要なデータフローを解説します。

---

## 1. チャットメッセージフロー

ユーザーがメッセージを送信し、AIがレスポンスを返すまでのフロー。

```
User Input → Chat UI → Workers API → Anthropic API
                ↑                          ↓
                └──── SSE Streaming ←──────┘
```

### シーケンス詳細

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Chat UI
    participant S as Zustand Store
    participant W as Workers API
    participant A as Anthropic API

    U->>UI: メッセージ入力
    UI->>S: sendMessage()
    S->>S: isLoading = true
    S->>W: POST /api/chat
    W->>A: messages.create (stream)

    loop SSE Streaming
        A-->>W: content_block_delta
        W-->>S: SSE event
        S->>S: appendContent()
        S->>UI: 再レンダリング
    end

    A-->>W: message_stop
    W-->>S: done event
    S->>S: isLoading = false
```

### データ構造

```typescript
// Request
{
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi!" }
  ]
}

// SSE Events
{ event: "message", data: { content: "部分的なテキスト" } }
{ event: "done", data: {} }
```

---

## 2. コード実行フロー（JavaScript/TypeScript）

AIがコード実行を要求した場合のフロー。

```
Tool Use → Workers API → Sandbox SDK → V8 Isolate
                ↓                          ↓
          tool_result ←── stdout/stderr ←──┘
```

### シーケンス詳細

```mermaid
sequenceDiagram
    participant A as Anthropic API
    participant W as Workers API
    participant S as SandboxService
    participant V8 as V8 Isolate

    A->>W: tool_use (execute_code)
    W->>S: execute(code, "javascript")
    S->>V8: sandbox.exec()
    V8->>V8: コード実行
    V8-->>S: { stdout, stderr, exitCode }
    S-->>W: ExecutionResult
    W->>A: tool_result
    A-->>W: 続きのレスポンス
```

### データ構造

```typescript
// Tool Use Input
{
  name: "execute_code",
  input: {
    language: "javascript",
    code: "console.log('Hello')"
  }
}

// Execution Result
{
  stdout: "Hello\n",
  stderr: "",
  exitCode: 0,
  executionTime: 15
}
```

---

## 3. コード実行フロー（Python）

Pythonコードはクライアントサイドで実行されます。

```
Code Block → Pyodide Runner → WASM Runtime
                ↓                   ↓
          UI Update ←── stdout ←───┘
```

### シーケンス詳細

```mermaid
sequenceDiagram
    participant UI as Chat UI
    participant H as useCodeExecution
    participant P as PyodideRunner
    participant W as WASM Runtime

    UI->>H: execute(code, "python")
    H->>P: run(code)
    P->>W: pyodide.runPython()
    W->>W: Python実行
    W-->>P: { stdout, result }
    P-->>H: PythonResult
    H-->>UI: ExecutionResult
```

### データ構造

```typescript
// Python Result
{
  stdout: "3.14159...\n",
  stderr: "",
  result: 3.141592653589793
}
```

---

## 4. PWAオフラインフロー

オフライン時のキャッシュ戦略。

```
Request → Service Worker → Cache API
              ↓               ↓
         Network ←─ or ─→ Cached Response
```

### キャッシュ戦略

| リソースタイプ | 戦略 | 理由 |
|--------------|------|------|
| 静的アセット | CacheFirst | 変更頻度低い |
| APIレスポンス | NetworkFirst | 最新データ優先 |
| フォント | CacheFirst | 変更されない |

---

## 5. 状態管理フロー

Zustandによるクライアント状態管理。

```typescript
// Chat Store
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  appendContent: (content: string) => void;
  setError: (error: string) => void;
  clearMessages: () => void;
}
```

### 状態更新フロー

```
User Action → Store Action → State Update → UI Re-render
                  ↓
            Side Effects (API calls)
```

---

## 6. エラーフロー

エラー発生時の伝播経路。

```
Error Source → Service Layer → API Layer → Client
                    ↓              ↓          ↓
              Logging      HTTP Status    UI Display
```

### エラーカテゴリ

| ソース | HTTPコード | クライアント表示 |
|-------|-----------|----------------|
| バリデーション | 400 | フィールドエラー |
| 認証 | 401 | APIキー設定案内 |
| レートリミット | 429 | リトライ時間 |
| Sandbox | 408/500 | 実行エラー詳細 |

---

## 関連ドキュメント

- [システムアーキテクチャ](./system-overview.md)
- [API リファレンス](../guides/api-reference.md)
