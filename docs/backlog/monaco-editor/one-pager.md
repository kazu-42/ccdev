# Monaco Editor統合 - One Pager

## 概要

VS Code同等のコードエディタをブラウザ内で提供。IntelliSense、シンタックスハイライト、マルチファイル編集をサポート。

## 問題

現在のコード表示は読み取り専用のコードブロックのみ。本格的なコード編集にはターミナルでvim/nanoを使う必要がある。

## 解決策

Monaco Editor（VS Codeのエディタコア）を統合し、ブラウザ内でリッチなコード編集体験を提供。

## 主要機能

1. **Monaco Editor**: VS Code同等のエディタ
2. **IntelliSense**: TypeScript/JavaScript補完
3. **マルチタブ**: 複数ファイル同時編集
4. **テーマ**: ダーク/ライトテーマ
5. **キーバインド**: VS Code互換

## 技術設計

### 依存関係

```bash
npm install @monaco-editor/react monaco-editor
```

### コンポーネント

```typescript
// src/components/Editor/MonacoEditor.tsx
import Editor from '@monaco-editor/react';

interface EditorProps {
  path: string;
  content: string;
  language: string;
  onChange: (value: string) => void;
}

export function MonacoEditor({ path, content, language, onChange }: EditorProps) {
  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      onChange={(value) => onChange(value || '')}
      theme="vs-dark"
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
}
```

### タブ管理

```typescript
interface EditorTab {
  id: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;
  openFile: (path: string) => void;
  closeTab: (id: string) => void;
  saveFile: (id: string) => Promise<void>;
}
```

## 成功指標

- エディタ初期化 < 1秒
- 入力レイテンシ < 50ms
- IntelliSense応答 < 200ms

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 2日 | Monaco基本統合 |
| Phase 2 | 2日 | タブ・ファイル管理 |
| Phase 3 | 1日 | IntelliSense設定 |
| Phase 4 | 1日 | テスト・最適化 |

## リスク

1. **バンドルサイズ**: 動的インポートで対応
2. **モバイル対応**: タッチ操作の最適化必要
3. **メモリ使用量**: 大ファイルの制限

## 関連ドキュメント

- 仮想ファイルシステム: `virtual-filesystem/`
- [Monaco Editor公式](https://microsoft.github.io/monaco-editor/)
