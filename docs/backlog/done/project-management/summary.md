# プロジェクト管理 - 完了サマリー

## 概要

プロジェクトのCRUD操作とターミナルセッション管理。

## 実装内容

### バックエンドAPI

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/projects` | GET | プロジェクト一覧 |
| `/api/projects` | POST | プロジェクト作成 |
| `/api/projects/:id` | GET | プロジェクト詳細 |
| `/api/projects/:id` | PATCH | プロジェクト更新 |
| `/api/projects/:id` | DELETE | プロジェクト削除 |
| `/api/projects/:id/sessions` | GET | セッション一覧 |
| `/api/projects/:id/sessions` | POST | セッション作成 |
| `/api/projects/:id/sessions/latest` | GET | 最新セッション |

### フロントエンド

- **projectStore**: プロジェクト状態管理
- **ProjectSelector**: プロジェクト切り替えドロップダウン
- **CreateProjectModal**: 新規プロジェクト作成モーダル

## DBスキーマ

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sandbox_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_accessed_at TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  terminal_session_id TEXT NOT NULL,
  chat_history TEXT,
  created_at TEXT NOT NULL,
  ended_at TEXT
);
```

## 完了日

2026-01-12
