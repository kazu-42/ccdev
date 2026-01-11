# Claude Code Web - セルフホスト版

## 概要

Claude Code Webセルフホスト版は、Cloudflare Sandboxを活用したブラウザベースのAI対話・コード実行環境です。

**主な特徴**:
- Claude AIとのチャットベースのコーディング支援
- Cloudflare Sandbox上での安全なコード実行
- PWA対応によるモバイルファースト体験
- 自分のCloudflareアカウントでセルフホスト

---

## ドキュメント目次

### アーキテクチャ
- [システムアーキテクチャ](./architecture/system-overview.md)
- [データフロー](./architecture/data-flow.md)
- [セキュリティモデル](./architecture/security.md)

### 機能解説
- [チャットインターフェース](./features/chat-interface.md)
- [コード実行環境](./features/sandbox-execution.md)
- [PWA対応](./features/pwa.md)

### 技術決定記録（ADR）
- [ADR-001: Cloudflare Sandbox SDKの採用](./decisions/adr-001-cloudflare-sandbox.md)
- [ADR-002: Pyodideによるクライアントサイドpython実行](./decisions/adr-002-pyodide.md)
- [ADR-003: Honoフレームワークの選定](./decisions/adr-003-hono.md)

### 開発ガイド
- [ローカル開発環境セットアップ](./guides/local-development.md)
- [デプロイ手順](./guides/deployment.md)
- [API リファレンス](./guides/api-reference.md)

---

## クイックリンク

| リソース | 説明 |
|---------|------|
| [REQUIREMENTS.md](/REQUIREMENTS.md) | 詳細な要件定義 |
| [.kiro/specs/claude-code-web/](/.kiro/specs/claude-code-web/) | cc-sdd仕様書 |
| [.kiro/steering/](/.kiro/steering/) | プロジェクトステアリング |

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18, Vite, Tailwind CSS, Zustand |
| バックエンド | Cloudflare Workers, Hono |
| コード実行 | Cloudflare Sandbox SDK, Pyodide |
| ストレージ | D1 (SQLite), Workers KV |
| AI | Anthropic Claude API |

---

*最終更新: 2025-01-11*
