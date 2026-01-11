# 共有ワークスペース - One Pager

## 概要

チームでのプロジェクト共有機能。招待ベースでプロジェクトを共有し、リアルタイムでコラボレーション。

## 問題

現在はシングルユーザーのみ。チームでの共同作業やプロジェクト共有ができない。

## 解決策

プロジェクトに他ユーザーを招待し、権限ベースでアクセス制御。将来的にはリアルタイム同期も。

## 主要機能

1. **招待**: メール/リンクでユーザー招待
2. **権限管理**: 閲覧/編集/管理者
3. **アクティビティログ**: 変更履歴表示
4. **通知**: 変更通知
5. **リアルタイム同期**: (Phase 2)

## 技術設計

### DBスキーマ

```sql
CREATE TABLE project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'viewer', -- 'viewer' | 'editor' | 'admin'
  invited_by TEXT REFERENCES users(id),
  invited_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  UNIQUE(project_id, user_id)
);

CREATE TABLE project_invites (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### API

```
POST /api/projects/:id/invite
GET  /api/projects/:id/members
PATCH /api/projects/:id/members/:userId
DELETE /api/projects/:id/members/:userId
POST /api/invites/:token/accept
```

## 成功指標

- 招待承諾率 > 80%
- 権限エラー 0
- コラボレーション満足度向上

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 2日 | 招待・権限API |
| Phase 2 | 2日 | UI実装 |
| Phase 3 | 1日 | 通知・ログ |

## リスク

1. **権限漏れ**: 厳格なRBACチェック
2. **招待スパム**: レート制限
3. **同時編集**: 競合解決ロジック
