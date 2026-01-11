# Claude Hooks - One Pager

## 概要

AIがコードを生成した後に自動で検証・整形処理を実行するフック機能。

## 問題

AIが生成したコードは型エラーやlintエラーを含む場合がある。手動でチェック・修正が必要。

## 解決策

コード生成後に自動でtypecheck/lint/test等を実行し、エラーがあればAIにフィードバックして修正させる。

## 主要機能

1. **PostToolUse Hook**: ツール実行後のフック
2. **TypeScript型チェック**: tsc --noEmit
3. **ESLint自動修正**: eslint --fix
4. **テスト実行**: npm test
5. **エラーフィードバック**: AIへの自動再送信

## 技術設計

### フック定義

```typescript
interface Hook {
  name: string;
  trigger: 'post_tool_use' | 'pre_send' | 'post_response';
  matcher?: RegExp; // ツール名のマッチャー
  command: string;
  autoFix: boolean; // エラー時にAIに修正を依頼
}

const hooks: Hook[] = [
  {
    name: 'typecheck',
    trigger: 'post_tool_use',
    matcher: /write_file|execute_code/,
    command: 'npx tsc --noEmit',
    autoFix: true,
  },
  {
    name: 'lint',
    trigger: 'post_tool_use',
    matcher: /write_file/,
    command: 'npx eslint --fix',
    autoFix: true,
  },
];
```

### 実行フロー

```
AI generates code via write_file tool
    ↓
Execute write_file in sandbox
    ↓
[Hook: PostToolUse]
    ↓
Run: tsc --noEmit
    ↓
If error:
  - Send error to AI with "Please fix these errors"
  - AI generates fix
  - Loop until success or max retries
    ↓
If success:
  - Continue conversation
```

### 設定UI

```typescript
// Settings > Hooks タブ
interface HookSettings {
  enableTypecheck: boolean;
  enableLint: boolean;
  enableTests: boolean;
  autoFixEnabled: boolean;
  maxRetries: number;
}
```

## 成功指標

- 型エラー自動修正率 > 80%
- Lintエラー自動修正率 > 90%
- ユーザー介入減少

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 1日 | フック基盤 |
| Phase 2 | 1日 | typecheck/lint |
| Phase 3 | 1日 | 自動修正ループ |
| Phase 4 | 1日 | 設定UI |

## リスク

1. **無限ループ**: 最大リトライ数で制限
2. **遅延**: バックグラウンド実行
3. **互換性**: プロジェクト設定依存
