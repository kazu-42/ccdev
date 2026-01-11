# チャットインターフェース

## 概要

Claude Code Webのチャットインターフェースは、AIとの対話を通じてコーディング支援を受けるためのメインUIです。

---

## コンポーネント構成

```
ChatContainer
├── MessageList
│   └── MessageItem (複数)
│       ├── Avatar
│       ├── MessageContent
│       │   └── CodeBlock (複数)
│       └── Timestamp
└── InputArea
    ├── TextInput
    └── SendButton
```

---

## 主要コンポーネント

### ChatContainer

チャット画面全体を管理するコンテナコンポーネント。

**責務**:
- レイアウト管理
- 状態（Zustand）との接続
- エラー表示

**Props**: なし（ストアから状態取得）

### MessageList

メッセージ一覧を表示するコンポーネント。

**責務**:
- メッセージのリスト表示
- 自動スクロール（新メッセージ時）
- 仮想化（長い会話時のパフォーマンス）

**Props**:
```typescript
interface MessageListProps {
  messages: Message[];
}
```

### MessageItem

単一メッセージを表示するコンポーネント。

**責務**:
- ユーザー/アシスタントの区別表示
- Markdownレンダリング
- コードブロックの検出と委譲

**Props**:
```typescript
interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}
```

### CodeBlock

コードブロックの表示と実行機能を提供。

**責務**:
- シンタックスハイライト（Shiki）
- 言語表示
- コピーボタン
- 実行ボタン（対応言語のみ）

**Props**:
```typescript
interface CodeBlockProps {
  code: string;
  language: string;
  onExecute?: (code: string, language: string) => void;
}
```

### InputArea

ユーザー入力を受け付けるコンポーネント。

**責務**:
- テキスト入力
- 送信処理（ボタン/Enterキー）
- ローディング状態表示
- 入力バリデーション

**Props**:
```typescript
interface InputAreaProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}
```

---

## 状態管理

### Zustand Store

```typescript
interface ChatState {
  // State
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentStreamingContent: string;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  appendStreamContent: (content: string) => void;
  finalizeMessage: () => void;
  clearMessages: () => void;
  setError: (error: string | null) => void;
}
```

### Message型

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUse?: {
    name: string;
    input: Record<string, unknown>;
    result?: Record<string, unknown>;
  };
  createdAt: Date;
}
```

---

## Markdownレンダリング

### 使用ライブラリ

- **react-markdown**: Markdownパース・レンダリング
- **remark-gfm**: GitHub Flavored Markdown対応
- **rehype-raw**: HTMLタグのパススルー（必要に応じて）

### カスタムレンダラー

```typescript
const components = {
  code: ({ node, inline, className, children, ...props }) => {
    if (inline) {
      return <code className="inline-code" {...props}>{children}</code>;
    }
    const language = className?.replace('language-', '') || 'text';
    return <CodeBlock code={String(children)} language={language} />;
  },
  // その他のカスタムレンダラー...
};
```

---

## シンタックスハイライト

### Shiki設定

```typescript
// vite.config.ts
import { getHighlighter } from 'shiki';

const highlighter = await getHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['javascript', 'typescript', 'python', 'json', 'bash', 'html', 'css'],
});
```

### 対応言語

| 言語 | シンタックス | 実行可能 |
|-----|------------|---------|
| JavaScript | js, javascript | Yes |
| TypeScript | ts, typescript | Yes |
| Python | py, python | Yes |
| JSON | json | No |
| Bash | bash, sh | No |
| HTML | html | No |
| CSS | css | No |

---

## ストリーミング表示

### SSE受信処理

```typescript
const handleStream = async (response: Response) => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          appendStreamContent(data.content);
        }
      }
    }
  }
};
```

### UI更新

- **タイピングインジケーター**: ストリーミング中は点滅カーソル表示
- **部分レンダリング**: チャンクごとにMarkdownを再パース
- **自動スクロール**: 新しいコンテンツが追加されるたびにスクロール

---

## レスポンシブデザイン

### ブレークポイント

| デバイス | 幅 | レイアウト |
|---------|-----|-----------|
| Mobile | < 640px | フルスクリーンチャット |
| Tablet | 640-1024px | サイドバー非表示 |
| Desktop | > 1024px | サイドバー表示 |

### モバイル最適化

- タッチフレンドリーなボタンサイズ
- 仮想キーボード対応（viewport調整）
- スワイプジェスチャー（サイドバー開閉）

---

## 関連ドキュメント

- [コード実行環境](./sandbox-execution.md)
- [データフロー](../architecture/data-flow.md)
