# R2ファイルストレージ - One Pager

## 概要

Cloudflare R2を使ったファイル永続化。サンドボックス外でのファイル保存・共有を実現。

## 問題

サンドボックス内のファイルはセッション終了で失われる可能性がある。大容量ファイルの保存や、プロジェクト間でのファイル共有ができない。

## 解決策

Cloudflare R2バケットを使用し、ユーザーファイルを永続化。プロジェクトごとのプレフィックスでアクセス制御。

## 主要機能

1. **ファイルアップロード**: ドラッグ&ドロップ対応
2. **ダウンロード**: 署名付きURL発行
3. **プロジェクト間共有**: ファイルリンク共有
4. **バージョニング**: ファイル履歴管理
5. **クォータ管理**: ユーザーごとの容量制限

## 技術設計

### R2バインディング

```toml
# wrangler.toml
[[r2_buckets]]
binding = "FILES_BUCKET"
bucket_name = "ccdev-files"
```

### API

```typescript
// POST /api/files/upload
// GET /api/files/:key
// DELETE /api/files/:key
// GET /api/files/list?prefix=...

interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  projectId: string;
  userId: string;
}
```

### ストレージ構造

```
ccdev-files/
├── users/{userId}/
│   └── projects/{projectId}/
│       └── files/
│           └── {filename}
└── shared/{shareId}/
    └── {filename}
```

## 成功指標

- アップロード成功率 > 99%
- ダウンロード速度 > 10MB/s
- 可用性 > 99.9%

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 1日 | R2設定・API |
| Phase 2 | 1日 | アップロードUI |
| Phase 3 | 1日 | 共有・権限管理 |

## リスク

1. **コスト**: 使用量モニタリング
2. **セキュリティ**: 署名付きURL有効期限
3. **大容量ファイル**: マルチパートアップロード
