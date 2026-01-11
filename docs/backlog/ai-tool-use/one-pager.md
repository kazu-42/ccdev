# AI Tool Use (Function Calling) - One Pager

## 概要

Claude AIがTool Use機能でコード実行・ファイル操作を自律的に行う機能。ユーザーの指示に応じてAIが自動的にサンドボックス内でコードを実行し、結果をフィードバックする。

## 問題

現在、AIチャットはテキストレスポンスのみで、コード実行は手動で行う必要がある。ユーザーはAIの提案コードをコピーして別途実行し、結果を貼り付けて再度AIに質問する必要がある。

## 解決策

Anthropic Tool Use APIを使用し、AIに`execute_code`、`read_file`、`write_file`などのツールを提供。AIが必要に応じてツールを呼び出し、結果を自動的に取得して応答を生成する。

## 主要機能

1. **execute_code**: JavaScript/Python/シェルコマンドの実行
2. **read_file**: サンドボックス内ファイルの読み取り
3. **write_file**: ファイルの作成・更新
4. **list_files**: ディレクトリ内容の一覧
5. **ユーザー確認**: 危険な操作前の確認ダイアログ

## 技術設計

### ツール定義

```typescript
const tools = [
  {
    name: "execute_code",
    description: "Execute code in the sandbox environment",
    input_schema: {
      type: "object",
      properties: {
        language: { type: "string", enum: ["javascript", "python", "bash"] },
        code: { type: "string", description: "The code to execute" }
      },
      required: ["language", "code"]
    }
  },
  {
    name: "read_file",
    description: "Read file contents from the sandbox",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path in sandbox" }
      },
      required: ["path"]
    }
  },
  {
    name: "write_file",
    description: "Write content to a file in the sandbox",
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

### 実行フロー

```
User Message
    ↓
Claude API (with tools)
    ↓
[tool_use block detected]
    ↓
Execute tool on Sandbox
    ↓
Return tool_result to Claude
    ↓
Claude generates final response
    ↓
Display to user
```

### セキュリティ

- 危険なコマンド（rm -rf, curl等）は確認ダイアログ
- 実行時間制限（30秒）
- メモリ制限
- ネットワークアクセス制限

## 成功指標

- ツール実行成功率 > 95%
- ユーザー介入不要なタスク完了率 > 80%
- 平均タスク完了時間の短縮

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 2日 | execute_code実装 |
| Phase 2 | 2日 | read/write_file実装 |
| Phase 3 | 1日 | 確認ダイアログUI |
| Phase 4 | 1日 | テスト・デプロイ |

## リスク

1. **無限ループ**: 再帰的ツール呼び出しの制限
2. **悪意のあるコード**: サンドボックス隔離で対応
3. **コスト**: ツール呼び出しによるトークン増加

## 関連ドキュメント

- `prd.md` - 詳細要件
- `design.md` - 技術設計書
