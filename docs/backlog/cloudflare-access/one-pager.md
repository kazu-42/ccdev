# Cloudflare Access認証 - One Pager

## 概要

Cloudflare Accessを使ったSSO認証。Google/GitHub/その他IdPでの統合認証を提供。

## 問題

現在の認証はdev-login（開発用）のみで、本番環境での安全な認証がない。APIキーをユーザーが管理する必要があり、セキュリティリスクがある。

## 解決策

Cloudflare Accessを統合し、Access JWT を検証してユーザーを自動認証。既存のJWT認証とフォールバックで共存。

## 主要機能

1. **Access JWT検証**: cf-access-jwt-assertion ヘッダーの検証
2. **自動ユーザー作成**: 初回ログイン時にユーザーレコード作成
3. **SSO連携**: Google, GitHub, Azure AD等
4. **dev-loginフォールバック**: ローカル開発用

## 技術設計

### ミドルウェア

```typescript
// apps/worker/src/middleware/cloudflare-access.ts
import { jwtVerify, createRemoteJWKSet } from "jose";

export async function validateAccessToken(request: Request, env: Env) {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return null;

  const JWKS = createRemoteJWKSet(
    new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`)
  );

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: env.TEAM_DOMAIN,
    audience: env.POLICY_AUD,
  });

  return payload as { email: string; sub: string };
}
```

### 認証フロー

```
User accesses app
    ↓
Cloudflare Access (if configured)
    ↓
Access JWT in header
    ↓
Worker validates JWT
    ↓
Auto-create or fetch user
    ↓
Set session cookie
    ↓
Return authenticated response
```

### 環境変数

```toml
# wrangler.toml
[vars]
TEAM_DOMAIN = "https://your-team.cloudflareaccess.com"
POLICY_AUD = "your-policy-aud-from-dashboard"
```

## Cloudflare Dashboard設定

1. **Access > Applications** で新規アプリ作成
2. **Self-hosted** タイプを選択
3. ドメイン: `ccdev.pages.dev`
4. **Identity providers** でGoogle/GitHub等を設定
5. **Policy AUD** をコピーしてwrangler.tomlに設定

## 成功指標

- ログイン成功率 > 99%
- 認証レスポンス < 200ms
- セキュリティインシデント 0

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 1日 | Cloudflare Access設定 |
| Phase 2 | 1日 | JWT検証ミドルウェア |
| Phase 3 | 1日 | フロントエンド連携 |

## リスク

1. **Access未設定時**: dev-loginにフォールバック
2. **JWT期限切れ**: 自動リフレッシュ対応
3. **IdP障害**: エラーメッセージ表示

## 関連ドキュメント

- 既存認証: `apps/worker/src/middleware/auth.ts`
- 計画書: `.claude/plans/polished-wibbling-hamster.md`
