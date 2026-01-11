# Cloudflare Sandbox / Containers 詳細調査

## 結論: 実現可能

**Cloudflare Sandbox SDKを使えば、Claude Code Webのセルフホスト版は十分実現可能。**

むしろ、Cloudflare公式がまさにこのユースケースを想定しており、`examples/claude-code`というサンプルまで用意している。

---

## 1. イメージサイズ制約

### ディスク制限（インスタンスタイプ別）

| インスタンスタイプ | vCPU | Memory | Disk | イメージ最大サイズ |
|------------------|------|--------|------|------------------|
| **lite** | 1/16 | 256 MiB | **2 GB** | 2 GB |
| **basic** | 1/4 | 1 GiB | **4 GB** | 4 GB |
| **standard-1** | 1/2 | 4 GiB | **8 GB** | 8 GB |
| **standard-2** | 1 | 6 GiB | **12 GB** | 12 GB |
| **standard-3** | 2 | 8 GiB | **16 GB** | 16 GB |
| **standard-4** | 4 | 12 GiB | **20 GB** | 20 GB |

**重要**: イメージサイズはインスタンスのディスクサイズに制限される

### アカウント全体の制限

| 制限項目 | 値 |
|---------|-----|
| 同時実行コンテナの総メモリ | 400 GiB |
| 同時実行コンテナの総vCPU | 100 |
| 同時実行コンテナの総ディスク | 2 TB |
| **アカウントあたりのイメージストレージ** | **50 GB** |

---

## 2. ベースイメージの内容

### 公式Sandbox SDKベースイメージ

```dockerfile
FROM docker.io/cloudflare/sandbox:0.3.3
```

**事前インストール済み:**

| カテゴリ | 内容 |
|---------|------|
| OS | Ubuntu 22.04 LTS |
| Python | 3.11.14 + pip + venv |
| Node.js | 20 LTS + npm |
| Runtime | Bun 1.x |
| Python Packages | matplotlib, numpy, pandas, ipython |
| System Tools | curl, wget, git, jq, zip, unzip, file, procps, ca-certificates |

### ベースイメージサイズの推定

公式ベースイメージは以下を含むため、おおよそ **1.5〜2 GB** と推定される:
- Ubuntu 22.04: ~100 MB
- Python 3.11 + pip: ~200 MB
- Node.js 20: ~100 MB
- Bun: ~50 MB
- Python packages (numpy, pandas, matplotlib等): ~500 MB+
- その他ツール: ~100 MB

→ **basicインスタンス（4GB disk）で十分動作可能**

---

## 3. カスタマイズ可能性

### Dockerfileでの拡張

```dockerfile
FROM docker.io/cloudflare/sandbox:0.3.3

# 追加のPythonパッケージ
RUN pip install --no-cache-dir \
    scikit-learn==1.3.0 \
    tensorflow==2.13.0

# 追加のNode.jsパッケージ
RUN npm install -g typescript ts-node

# システムパッケージ
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
```

### 注意点
- `--no-cache-dir` でpipキャッシュを削除
- `rm -rf /var/lib/apt/lists/*` でaptキャッシュを削除
- レイヤーを最小化してイメージサイズを抑える

---

## 4. 公式のClaude Codeサンプル

Cloudflare公式が `examples/claude-code` を提供:

```
https://github.com/cloudflare/sandbox-sdk/tree/main/examples/claude-code
```

**これはまさに我々が作りたいもの！**

### 公式サンプルの構成

```typescript
import { getSandbox, proxyToSandbox } from '@cloudflare/sandbox';
export { Sandbox } from '@cloudflare/sandbox';

export default {
  async fetch(request: Request, env: Env) {
    const sandbox = getSandbox(env.Sandbox, 'my-sandbox');
    
    // Gitリポジトリをクローン
    await sandbox.gitCheckout("https://github.com/cloudflare/agents");
    
    // テスト実行
    const testResult = await sandbox.exec("npm test");
    
    return Response.json({
      tests: testResult.exitCode === 0 ? "passed" : "failed",
      output: testResult.stdout,
    });
  },
};
```

---

## 5. コスト試算（詳細版）

### 料金体系

| 項目 | 料金 | 無料枠 |
|-----|------|-------|
| Memory | $0.0000025/GiB-second | 25 GiB-hours/月 |
| CPU | $0.000020/vCPU-second | 375 vCPU-minutes/月 |
| Disk | $0.00000007/GB-second | 200 GB-hours/月 |
| Egress (NA/EU) | $0.025/GB | 1 TB/月 |

### シナリオ別コスト

#### シナリオ1: 個人利用（1日30分使用）

```
basicインスタンス (1 GiB, 1/4 vCPU, 4 GB disk)
月間使用: 30min × 30日 = 900分 = 54,000秒

Memory: 1 GiB × 54,000秒 = 54,000 GiB-seconds
       = 15 GiB-hours → 無料枠内 ✓

CPU (20%利用想定): 0.25 vCPU × 54,000秒 × 0.2 = 2,700 vCPU-seconds
                  = 45 vCPU-minutes → 無料枠内 ✓

Disk: 4 GB × 54,000秒 = 216,000 GB-seconds
     = 60 GB-hours → 無料枠内 ✓

Egress: 1 GB/日 × 30日 = 30 GB → 無料枠内 ✓

月額コスト: $5 (Workers Paid) + $0 = $5
```

#### シナリオ2: ヘビーユーザー（1日2時間使用）

```
standard-1インスタンス (4 GiB, 1/2 vCPU, 8 GB disk)
月間使用: 2h × 30日 = 60時間 = 216,000秒

Memory: 4 GiB × 216,000秒 = 864,000 GiB-seconds
       = 240 GiB-hours
       無料枠超過: 240 - 25 = 215 GiB-hours = 774,000 GiB-seconds
       追加料金: 774,000 × $0.0000025 = $1.94

CPU (30%利用想定): 0.5 vCPU × 216,000秒 × 0.3 = 32,400 vCPU-seconds
                  = 540 vCPU-minutes
                  無料枠超過: 540 - 375 = 165 vCPU-minutes = 9,900 vCPU-seconds
                  追加料金: 9,900 × $0.000020 = $0.20

Disk: 8 GB × 216,000秒 = 1,728,000 GB-seconds
     = 480 GB-hours
     無料枠超過: 480 - 200 = 280 GB-hours = 1,008,000 GB-seconds
     追加料金: 1,008,000 × $0.00000007 = $0.07

月額コスト: $5 + $1.94 + $0.20 + $0.07 ≈ $7.20
```

---

## 6. 制約と回避策

### 制約1: コールドスタート

| 問題 | 影響 |
|-----|------|
| コンテナ起動 | 最大30秒（新規プロビジョニング時） |
| SDK Ready | 最大90秒（カスタムDockerfile時） |

**回避策:**
```typescript
// sleepAfterを長めに設定してコンテナを維持
const sandbox = getSandbox(env.Sandbox, id, {
  sleepAfter: '30m', // 30分間アイドルでも維持
});
```

### 制約2: ステートの揮発性

| 状態 | 動作 |
|-----|------|
| アクティブ中 | ファイル、プロセス、環境変数が保持 |
| スリープ後 | **すべてリセット** |

**回避策:**
- R2をFUSEでマウントして永続化
- 重要なファイルはR2/KVに保存

```typescript
// R2マウントの例
await sandbox.mount({
  type: 'r2',
  bucket: 'my-bucket',
  path: '/workspace/persistent'
});
```

### 制約3: linux/amd64のみ

- ARM Macでのローカル開発はエミュレーション経由
- Rosetta/QEMUで自動対応

### 制約4: Preview URLにカスタムドメイン必須

- `*.workers.dev` ではPreview URL不可
- ワイルドカードDNS設定が必要

---

## 7. 推奨アーキテクチャ（更新版）

```
┌─────────────────────────────────────────────────────────────┐
│                    PWA Frontend (React)                      │
│         ホスト: Cloudflare Pages or Workers Static          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Worker (API)                    │
│                        Hono Router                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ /api/chat   │  │ /api/exec   │  │ /api/files          │  │
│  │ Anthropic   │  │ Sandbox     │  │ R2 永続化           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Sandbox (Durable Object)            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Ubuntu 22.04 Container                     │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │    │
│  │  │ Python  │  │ Node.js │  │ Git     │             │    │
│  │  │ 3.11    │  │ 20 LTS  │  │         │             │    │
│  │  └─────────┘  └─────────┘  └─────────┘             │    │
│  │                                                      │    │
│  │  /workspace (作業ディレクトリ)                       │    │
│  │  /mnt/r2 (R2マウント - 永続化)                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  インスタンス: basic (1 GiB, 1/4 vCPU, 4 GB disk)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 実装の実現可能性まとめ

| 要件 | 実現可能性 | 備考 |
|-----|----------|------|
| Python実行 | ✅ 完全対応 | 事前インストール済み |
| JavaScript/TypeScript実行 | ✅ 完全対応 | Node.js + Bun |
| Git操作 | ✅ 完全対応 | gitコマンド利用可 |
| ファイル操作 | ✅ 完全対応 | 標準Linuxファイルシステム |
| 永続化 | ✅ R2マウント | FUSE経由 |
| PWA対応 | ✅ 問題なし | フロントエンド側 |
| イメージサイズ | ✅ 問題なし | basic (4GB) で十分 |
| コスト | ✅ 低コスト | 個人利用なら$5/月 |
| コールドスタート | ⚠️ 要対策 | sleepAfter調整 |

---

## 9. 次のステップ

1. **公式サンプルを試す**
   ```bash
   npm create cloudflare@latest -- my-sandbox \
     --template=cloudflare/sandbox-sdk/examples/claude-code
   ```

2. **Dockerfile最適化**
   - 必要最小限のパッケージのみ追加
   - マルチステージビルドの検討

3. **フロントエンド設計**
   - PWA対応のReactアプリ
   - チャットUI + コード実行結果表示

4. **永続化戦略**
   - R2マウントでファイル永続化
   - KVでセッション管理

---

## 10. 参考リンク

- [Cloudflare Sandbox SDK](https://developers.cloudflare.com/sandbox/)
- [Sandbox GitHub](https://github.com/cloudflare/sandbox-sdk)
- [Claude Code Example](https://github.com/cloudflare/sandbox-sdk/tree/main/examples/claude-code)
- [Containers Pricing](https://developers.cloudflare.com/containers/pricing/)
- [Containers Limits](https://developers.cloudflare.com/containers/platform-details/limits/)

---

## 11. 公式チュートリアル「Run Claude Code on a Sandbox」

Cloudflare公式が**まさに我々が作りたいもの**のチュートリアルを提供している！

### クイックスタート（5分で動く）

```bash
# 1. プロジェクト作成
npm create cloudflare@latest -- claude-code-sandbox \
  --template=cloudflare/sandbox-sdk/examples/claude-code

cd claude-code-sandbox

# 2. APIキー設定
echo "ANTHROPIC_API_KEY=your_api_key_here" > .dev.vars

# 3. ローカル開発（初回はDocker build 2-3分）
npm run dev

# 4. テスト
curl -X POST http://localhost:8787/ \
  -d '{
    "repo": "https://github.com/cloudflare/agents",
    "task": "remove the emojis from the readme"
  }'

# 5. デプロイ
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY
```

### 公式サンプルの動作

**入力:**
```json
{
  "repo": "https://github.com/cloudflare/agents",
  "task": "remove the emojis from the readme"
}
```

**出力:**
```json
{
  "logs": "Done! I've removed the brain emoji from the README title...",
  "diff": "diff --git a/README.md b/README.md\n-# 🧠 Cloudflare Agents\n+# Cloudflare Agents"
}
```

### これをベースにWebフロントエンドを追加すればOK

公式サンプルはAPIのみなので、以下を追加：
1. React PWAフロントエンド
2. チャットUI
3. ストリーミング対応
4. ファイルブラウザ

---

## 12. 結論と推奨アプローチ

### ✅ Dockerfileサイズ制約は問題なし

| 項目 | 結果 |
|-----|------|
| ベースイメージ | 約1.5-2 GB（Ubuntu 22.04 + Python + Node.js） |
| basicインスタンス | 4 GB disk → **余裕あり** |
| standard-1 | 8 GB disk → **さらに余裕** |

### ✅ 公式サポートあり

Cloudflareが公式に「Claude Code on Sandbox」チュートリアルを提供しているため、このユースケースは完全にサポートされている。

### 推奨実装アプローチ

```
Phase 1: 公式サンプルをそのままデプロイして動作確認
Phase 2: PWAフロントエンドを追加（React + Vite）
Phase 3: チャットUI + ストリーミング対応
Phase 4: 永続化（R2マウント）+ セッション管理
```

### 想定開発期間

| フェーズ | 期間 | 内容 |
|--------|------|------|
| Phase 1 | 1日 | 公式サンプル動作確認 |
| Phase 2 | 1週間 | PWAフロントエンド |
| Phase 3 | 1週間 | チャット + ストリーミング |
| Phase 4 | 1週間 | 永続化 + 仕上げ |

**合計: 約3-4週間**（フルタイム換算）

---

*調査日: 2025-01-11*
