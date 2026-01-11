# Sandbox CLI Tools 自動インストール - One Pager

## 概要

サンドボックス環境にユーザーが設定したCLIツール（gh, aws, gcloud等）を自動インストールする機能。

## 現状

設定画面のUIは実装済み。ユーザーはチェックボックスでインストールしたいツールを選択でき、カスタムセットアップスクリプトも入力できる。

**未実装:**
- プロジェクト作成時の自動実行
- インストール状態の確認・表示
- 既存サンドボックスへの追加インストール

## 解決策

プロジェクト作成時にセットアップスクリプトを自動実行し、選択されたCLIツールをインストール。サンドボックスの初期化時にスクリプトを実行するDurable Objectフックを追加。

## 主要機能

1. **自動インストール**: プロジェクト作成時に設定されたツールをインストール
2. **状態表示**: インストール済み/未インストールの状態表示
3. **追加インストール**: 既存サンドボックスへのツール追加
4. **カスタムスクリプト**: ユーザー定義のセットアップスクリプト実行

## 技術設計

### プロジェクト作成フロー

```
User clicks "Create Project"
    ↓
API creates project record
    ↓
Get user settings (selectedTools)
    ↓
Generate setup script
    ↓
Create sandbox with setup script
    ↓
Execute setup script in background
    ↓
Update project status
```

### API変更

```typescript
// POST /api/projects
interface CreateProjectRequest {
  name: string;
  description?: string;
  setupScript?: string; // Generated from settings
}

// GET /api/projects/:id/setup-status
interface SetupStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  installedTools: string[];
  logs: string;
}
```

### DBスキーマ追加

```sql
ALTER TABLE projects ADD COLUMN setup_status TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN setup_logs TEXT;
ALTER TABLE projects ADD COLUMN installed_tools TEXT; -- JSON array
```

## 成功指標

- インストール成功率 > 95%
- セットアップ時間 < 2分
- ユーザー満足度向上

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 1日 | API・DB変更 |
| Phase 2 | 1日 | セットアップ実行ロジック |
| Phase 3 | 1日 | UI状態表示 |

## リスク

1. **長時間インストール**: バックグラウンド実行で対応
2. **失敗リカバリー**: 再実行機能を提供
3. **ディスク容量**: ツール選択数に制限

## 関連ドキュメント

- 設定UI: `apps/web/src/stores/settingsStore.ts`
- 設定パネル: `apps/web/src/components/Settings/SettingsPanel.tsx`
