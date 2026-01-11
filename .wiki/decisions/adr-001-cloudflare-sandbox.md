# ADR-001: Cloudflare Sandbox SDKの採用

## ステータス
承認済み

## 日付
2025-01-11

## コンテキスト

Claude Code Webでは、ユーザーが入力したコードを安全に実行する必要があります。コード実行環境には以下の要件があります：

1. **セキュリティ**: 悪意のあるコードからホストシステムを保護
2. **パフォーマンス**: 低レイテンシでのコード実行
3. **スケーラビリティ**: 同時多数の実行リクエストに対応
4. **コスト効率**: セルフホストで現実的なコスト

### 検討した選択肢

#### 選択肢1: Cloudflare Sandbox SDK
- V8 Isolatesベースの隔離実行
- Cloudflare Workersと統合
- エッジでのグローバル実行

#### 選択肢2: AWS Lambda + Firecracker
- マイクロVMベースの完全隔離
- 任意言語のサポート
- コールドスタートが課題

#### 選択肢3: Docker Containers (自前ホスト)
- 完全なコントロール
- インフラ管理コストが高い
- スケーリングが複雑

#### 選択肢4: E2B (サードパーティ)
- フルマネージドサービス
- 高機能だが従量課金
- ベンダーロックイン

## 決定

**Cloudflare Sandbox SDK**を採用する。

## 理由

1. **Cloudflareエコシステムとの統合**
   - Workers、KV、D1との seamless な連携
   - 単一プラットフォームでの管理

2. **パフォーマンス**
   - V8 Isolatesによる<5msのコールドスタート
   - グローバルエッジでの低レイテンシ

3. **セキュリティ**
   - Cloudflareによる実績あるサンドボックス技術
   - ネットワーク隔離がデフォルト

4. **コスト**
   - Workers Paid Plan ($5/月) に含まれる
   - 追加のインフラ不要

5. **セルフホスト適合性**
   - ユーザー自身のCloudflareアカウントで動作
   - 設定が簡潔（wrangler.toml）

## 結果

### ポジティブ
- インフラ管理の大幅な簡素化
- 低コストでの運用開始
- 高いセキュリティレベル

### ネガティブ
- JavaScript/TypeScriptに限定（サーバーサイド）
- Pythonは別方式（Pyodide）が必要
- Cloudflareプラットフォームへの依存

### リスク
- Sandbox SDK がBeta版（API変更の可能性）
- Cloudflareの価格改定リスク

## 関連
- [ADR-002: Pyodide](./adr-002-pyodide.md)
- [セキュリティモデル](../architecture/security.md)
