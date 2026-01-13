# Browser Automation MCP Servers

Claude Code/Desktop で利用可能なブラウザ自動化 MCP サーバーのドキュメント。

## 概要

| サーバー | 提供元 | 特徴 |
|---------|--------|------|
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | Microsoft | アクセシビリティツリー使用、高速、決定的 |
| [Browser Use](https://docs.browser-use.com/customize/integrations/mcp-server) | Browser Use | クラウド/セルフホスト対応、自然言語操作 |
| [Browser MCP](https://browsermcp.io/) | BrowserMCP | Chrome拡張機能、ローカル実行、プライバシー重視 |
| [Chrome DevTools MCP](https://addyosmani.com/blog/devtools-mcp/) | Google | Chrome DevTools 直接連携 |

---

## 1. Playwright MCP (推奨)

Microsoft 公式の MCP サーバー。アクセシビリティスナップショットを使用してビジョンモデルなしでブラウザ操作。

### インストール

```bash
# Claude Code
claude mcp add playwright -- npx @playwright/mcp@latest

# または設定ファイルに追加
```

**設定ファイル** (`~/.claude.json` または `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 主要オプション

| オプション | 説明 | 例 |
|------------|------|-----|
| `--browser` | ブラウザ選択 | `chromium`, `firefox`, `webkit`, `msedge` |
| `--headless` | ヘッドレスモード | デフォルトはheaded |
| `--viewport-size` | 画面サイズ | `1280x720` |
| `--user-data-dir` | プロファイル保存先 | `/path/to/profile` |
| `--port` | HTTPサーバーポート | `8931` |

### 利用可能なツール

**ナビゲーション:**
- `browser_navigate` - URL移動
- `browser_navigate_back` - 戻る

**インタラクション:**
- `browser_click` - クリック
- `browser_type` - テキスト入力
- `browser_fill_form` - フォーム入力
- `browser_select_option` - セレクトボックス
- `browser_file_upload` - ファイルアップロード

**検査:**
- `browser_snapshot` - アクセシビリティスナップショット取得
- `browser_take_screenshot` - スクリーンショット
- `browser_network_requests` - ネットワークリクエスト一覧
- `browser_console_messages` - コンソールログ

**タブ管理:**
- `browser_tabs` - タブの一覧/作成/閉じる/選択

### 使用例

```
# Claude Code で
"playwright mcp を使って http://localhost:5175 を開いて"
"ログインフォームにメールアドレス test@example.com を入力して"
"スクリーンショットを撮って"
```

---

## 2. Browser Use MCP

AI エージェント向けブラウザ自動化。自然言語でタスク実行。

### クラウド版 (有料)

```bash
# Claude Code
claude mcp add --transport http browser-use https://api.browser-use.com/mcp
```

API キーは [Browser Use Dashboard](https://cloud.browser-use.com) で取得。

### セルフホスト版 (無料)

```bash
# 起動
uvx --from 'browser-use[cli]' browser-use --mcp
```

**設定ファイル:**
```json
{
  "mcpServers": {
    "browser-use": {
      "command": "uvx",
      "args": ["--from", "browser-use[cli]", "browser-use", "--mcp"],
      "env": {
        "OPENAI_API_KEY": "your-key",
        "BROWSER_USE_HEADLESS": "false"
      }
    }
  }
}
```

### 利用可能なツール

- `browser_task` - ブラウザタスク実行
- `list_browser_profiles` - プロファイル一覧
- `monitor_task` - タスク進捗監視

---

## 3. Browser MCP

Chrome 拡張機能 + MCP サーバー。ローカル実行でプライバシー重視。

### 特徴

- ローカル実行（データがリモートに送信されない）
- 既存ブラウザプロファイル使用（ログイン状態維持）
- ボット検出回避（実際のブラウザフィンガープリント使用）

### インストール

1. [browsermcp.io](https://browsermcp.io/) から Chrome 拡張機能インストール
2. MCP サーバー設定追加

---

## 4. Chrome DevTools MCP

Google の Chrome DevTools 直接連携 MCP。

### 特徴

- DevTools Protocol 直接アクセス
- DOM 検査、ネットワーク監視
- パフォーマンス分析

---

## Claude Code での現在の設定

このプロジェクトでは `playwright@claude-plugins-official` プラグインが有効:

```json
// ~/.claude/settings.json
{
  "enabledPlugins": {
    "playwright@claude-plugins-official": true
  }
}
```

プラグインは `npx @playwright/mcp@latest` を使用。

**注意:** プラグインをインストール後は Claude Code の再起動が必要。

---

## トラブルシューティング

### MCP ツールが利用できない

1. Claude Code を再起動
2. プラグインが有効か確認: `/plugin` コマンド
3. 手動でサーバー追加: `claude mcp add playwright -- npx @playwright/mcp@latest`

### ブラウザが起動しない

```bash
# ブラウザインストール
npx playwright install chromium
```

### headless モードで実行したい

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless"]
    }
  }
}
```

---

## 参考リンク

- [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Browser Use Docs](https://docs.browser-use.com/customize/integrations/mcp-server)
- [Browser MCP](https://browsermcp.io/)
- [Chrome DevTools MCP](https://addyosmani.com/blog/devtools-mcp/)
- [Simon Willison's TIL - Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code)
