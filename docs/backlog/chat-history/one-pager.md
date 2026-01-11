# チャット履歴機能 - One Pager

## 概要

チャットセッションの履歴をD1データベースに永続化し、過去の会話を再開・検索できる機能。

## 問題

現在、チャット履歴はブラウザのメモリ内にのみ存在し、ページリロードやセッション終了で失われる。ユーザーは過去の会話を参照したり、途中から再開することができない。

## 解決策

D1データベースに会話履歴を保存し、UIから過去セッションを一覧表示・検索・再開できるようにする。

## 主要機能

1. **自動保存**: メッセージ送受信時にD1へ自動保存
2. **セッション一覧**: サイドバーに過去セッションを時系列で表示
3. **検索**: キーワードでセッションを検索
4. **再開**: 過去セッションを選択して会話を継続
5. **エクスポート**: Markdown/JSON形式でエクスポート

## 技術設計

### DBスキーマ

```sql
-- 既存sessionsテーブルを活用
ALTER TABLE sessions ADD COLUMN title TEXT;
ALTER TABLE sessions ADD COLUMN message_count INTEGER DEFAULT 0;

-- 新規: messagesテーブル
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  tool_calls TEXT, -- JSON
  tool_results TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session ON messages(session_id);
```

### API エンドポイント

```
GET  /api/projects/:id/sessions/:sid/messages  - メッセージ一覧取得
POST /api/projects/:id/sessions/:sid/messages  - メッセージ追加
GET  /api/projects/:id/sessions/search?q=...   - セッション検索
```

### フロントエンド

- `ChatHistoryStore`: 履歴状態管理
- `SessionList`: セッション一覧コンポーネント
- `SearchModal`: 検索モーダル

## 成功指標

- セッション復元成功率 > 99%
- 検索レスポンス < 500ms
- ユーザー満足度向上

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 2日 | DBスキーマ・API実装 |
| Phase 2 | 2日 | フロントエンドUI |
| Phase 3 | 1日 | 検索・エクスポート |
| Phase 4 | 1日 | テスト・デプロイ |

## リスク

1. **大量データ**: ページネーション必須
2. **同期**: オプティミスティック更新で対応
3. **マイグレーション**: 既存セッションの互換性

## 関連ドキュメント

- `prd.md` - 詳細要件
- `design.md` - 技術設計書
