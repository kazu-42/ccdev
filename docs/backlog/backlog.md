# ccdev バックログ

## 概要

未実装機能のバックログ一覧。各機能は独立したディレクトリに PRD、One-Pager、Design Doc を格納。

**完了タスク:** [done/done.md](done/done.md) を参照

---

## バックログ一覧

| # | 機能名 | 優先度 | 状態 | ディレクトリ |
|---|--------|--------|------|--------------|
| 1 | [Sandbox CLI Tools](#1-sandbox-cli-tools) | P1 | 設定UIのみ | `sandbox-cli-tools/` |
| 2 | [Cloudflare Access認証](#2-cloudflare-access認証) | P1 | 未着手 | `cloudflare-access/` |
| 3 | [仮想ファイルシステム](#3-仮想ファイルシステム) | P1 | 未着手 | `virtual-filesystem/` |
| 4 | [Monaco Editor](#4-monaco-editor) | P2 | 未着手 | `monaco-editor/` |
| 5 | [R2ファイルストレージ](#5-r2ファイルストレージ) | P2 | 未着手 | `r2-file-storage/` |
| 6 | [共有ワークスペース](#6-共有ワークスペース) | P2 | 未着手 | `shared-workspace/` |
| 7 | [多言語対応](#7-多言語対応) | P3 | 未着手 | `multi-language/` |
| 8 | [Claude Hooks](#8-claude-hooks) | P3 | 未着手 | `claude-hooks/` |

---

## 詳細

### 1. Sandbox CLI Tools

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

### 2. Cloudflare Access認証

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

### 3. 仮想ファイルシステム

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

### 4. Monaco Editor

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

### 5. R2ファイルストレージ

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

### 6. 共有ワークスペース

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

### 7. 多言語対応

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

### 8. Claude Hooks

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
| 2026-01-12 | AI Tool Use、チャット履歴を完了に移動 |
| 2026-01-12 | バックログ作成、10機能を登録 |
