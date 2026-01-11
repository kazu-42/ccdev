# 仮想ファイルシステム - One Pager

## 概要

サンドボックス内のファイルをブラウザ上でツリー表示し、閲覧・編集できる機能。

## 問題

現在のファイルツリーはプレースホルダーのみ。ユーザーはターミナルでls/cat/vimを使う必要があり、ファイル操作が煩雑。

## 解決策

WebSocket経由でサンドボックスのファイルシステムにアクセスし、VS Codeライクなファイルツリーとエディタを提供。

## 主要機能

1. **ファイルツリー**: ディレクトリ構造のツリー表示
2. **ファイルプレビュー**: テキスト/画像/JSONの表示
3. **インライン編集**: 簡易エディタでの編集
4. **ファイル操作**: 作成/削除/リネーム/移動
5. **ドラッグ&ドロップ**: ファイルアップロード

## 技術設計

### WebSocket API

```typescript
// Client → Server
interface FSRequest {
  type: 'list' | 'read' | 'write' | 'delete' | 'rename' | 'mkdir';
  path: string;
  content?: string;
  newPath?: string;
}

// Server → Client
interface FSResponse {
  type: 'list' | 'read' | 'write' | 'delete' | 'rename' | 'mkdir' | 'error';
  path: string;
  data?: FSEntry[] | string;
  error?: string;
}

interface FSEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}
```

### コンポーネント構成

```
src/components/FileSystem/
├── FileTree.tsx          - ツリー表示（既存を拡張）
├── FileTreeNode.tsx      - ツリーノード
├── FilePreview.tsx       - ファイルプレビュー
├── FileEditor.tsx        - 簡易エディタ
├── FileContextMenu.tsx   - 右クリックメニュー
└── useFileSystem.ts      - WebSocket hook
```

### サンドボックス側

```typescript
// Durable Object内でファイル操作を処理
async handleFileSystemRequest(req: FSRequest): Promise<FSResponse> {
  switch (req.type) {
    case 'list':
      return { type: 'list', path: req.path, data: await this.listDir(req.path) };
    case 'read':
      return { type: 'read', path: req.path, data: await this.readFile(req.path) };
    // ...
  }
}
```

## 成功指標

- ファイル読み込み < 500ms
- ツリー展開 < 200ms
- 編集保存成功率 > 99%

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 2日 | WebSocket API実装 |
| Phase 2 | 2日 | ファイルツリーUI |
| Phase 3 | 2日 | 編集・操作機能 |
| Phase 4 | 1日 | テスト・デプロイ |

## リスク

1. **大量ファイル**: 遅延読み込みで対応
2. **バイナリファイル**: プレビュー非対応表示
3. **同時編集**: 楽観的ロックで対応
