# ccdev バックログ

## 概要

未実装機能のバックログ一覧。各機能は独立したディレクトリに PRD、One-Pager、Design Doc を格納。

---

## バックログ一覧

| # | 機能名 | 優先度 | 状態 | ディレクトリ |
|---|--------|--------|------|--------------|
| 1 | [チャット履歴](#1-チャット履歴) | P0 | 未着手 | `chat-history/` |
| 2 | [AI Tool Use](#2-ai-tool-use) | P0 | 未着手 | `ai-tool-use/` |
| 3 | [Sandbox CLI Tools](#3-sandbox-cli-tools) | P1 | 設定UIのみ | `sandbox-cli-tools/` |
| 4 | [Cloudflare Access認証](#4-cloudflare-access認証) | P1 | 未着手 | `cloudflare-access/` |
| 5 | [仮想ファイルシステム](#5-仮想ファイルシステム) | P1 | 未着手 | `virtual-filesystem/` |
| 6 | [Monaco Editor](#6-monaco-editor) | P2 | 未着手 | `monaco-editor/` |
| 7 | [R2ファイルストレージ](#7-r2ファイルストレージ) | P2 | 未着手 | `r2-file-storage/` |
| 8 | [共有ワークスペース](#8-共有ワークスペース) | P2 | 未着手 | `shared-workspace/` |
| 9 | [多言語対応](#9-多言語対応) | P3 | 未着手 | `multi-language/` |
| 10 | [Claude Hooks](#10-claude-hooks) | P3 | 未着手 | `claude-hooks/` |

---

## 詳細

### 1. チャット履歴

**優先度:** P0 (最優先)
**状態:** 未着手
**ディレクトリ:** `chat-history/`

チャットセッションの履歴をD1データベースに永続化し、過去の会話を再開できるようにする。

**主要機能:**
- 会話履歴のD1保存
- セッション一覧表示
- 過去セッションの読み込み
- セッション検索
- エクスポート機能

---

### 2. AI Tool Use

**優先度:** P0 (最優先)
**状態:** 未着手
**ディレクトリ:** `ai-tool-use/`

Claude AIがFunction Calling (Tool Use) でコード実行・ファイル操作を自動的に行う機能。

**主要機能:**
- execute_code ツール定義
- read_file / write_file ツール
- 実行結果のAIへのフィードバック
- ユーザー確認フロー

---

### 3. Sandbox CLI Tools

**優先度:** P1
**状態:** 設定UIのみ実装済み
**ディレクトリ:** `sandbox-cli-tools/`

サンドボックス環境にCLIツールを自動インストールする機能。設定画面のUIは実装済み、バックエンドの自動インストール処理が未実装。

**主要機能:**
- 設定に基づくセットアップスクリプト生成
- プロジェクト作成時の自動実行
- インストール状態の表示
- カスタムスクリプト対応

---

### 4. Cloudflare Access認証

**優先度:** P1
**状態:** 未着手
**ディレクトリ:** `cloudflare-access/`

Cloudflare AccessによるSSO認証。Google/GitHub OAuthを使った統合認証。

**主要機能:**
- Access JWT検証ミドルウェア
- 自動ユーザー作成
- セッション管理
- 既存dev-loginとの併用

---

### 5. 仮想ファイルシステム

**優先度:** P1
**状態:** 未着手
**ディレクトリ:** `virtual-filesystem/`

サンドボックス内のファイルをブラウザ上で閲覧・編集できる機能。

**主要機能:**
- ファイルツリー表示
- ファイル内容の読み込み
- インライン編集
- ファイルの新規作成・削除
- ディレクトリ操作

---

### 6. Monaco Editor

**優先度:** P2
**状態:** 未着手
**ディレクトリ:** `monaco-editor/`

VS Code同等のコードエディタをブラウザ内で提供。

**主要機能:**
- Monaco Editorの統合
- 言語サポート（TypeScript, Python等）
- IntelliSense
- ファイルタブ管理
- テーマ対応

---

### 7. R2ファイルストレージ

**優先度:** P2
**状態:** 未着手
**ディレクトリ:** `r2-file-storage/`

Cloudflare R2を使ったファイル永続化。

**主要機能:**
- ファイルアップロード
- プロジェクト間でのファイル共有
- 大容量ファイル対応
- アクセス制御

---

### 8. 共有ワークスペース

**優先度:** P2
**状態:** 未着手
**ディレクトリ:** `shared-workspace/`

チームでのプロジェクト共有機能。

**主要機能:**
- プロジェクト招待
- 権限管理（閲覧/編集）
- リアルタイムコラボレーション
- アクティビティログ

---

### 9. 多言語対応

**優先度:** P3
**状態:** 未着手
**ディレクトリ:** `multi-language/`

JavaScript/Python以外の言語サポート。

**主要機能:**
- Go (TinyGo → WASM)
- Rust (WASM)
- Ruby (ruby.wasm)
- 言語自動検出

---

### 10. Claude Hooks

**優先度:** P3
**状態:** 未着手
**ディレクトリ:** `claude-hooks/`

AIコード生成後の自動検証・整形フック。

**主要機能:**
- PostToolUse hook
- TypeScript型チェック
- ESLint自動修正
- テスト自動実行

---

## 更新履歴

| 日付 | 更新内容 |
|------|----------|
| 2026-01-12 | バックログ作成、10機能を登録 |
