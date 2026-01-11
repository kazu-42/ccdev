# PWA対応

## 概要

Claude Code WebはPWA（Progressive Web App）として実装され、モバイルデバイスでもネイティブアプリのような体験を提供します。

---

## PWA要件

### Core Web Vitals目標

| メトリクス | 目標 | 測定方法 |
|-----------|------|----------|
| LCP | < 2.5秒 | Lighthouse |
| FID | < 100ms | Lighthouse |
| CLS | < 0.1 | Lighthouse |

### インストール要件

- HTTPS接続
- Service Worker登録
- Web App Manifest
- オフライン対応（基本）

---

## Service Worker

### vite-plugin-pwa設定

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Claude Code Web',
        short_name: 'ClaudeCode',
        // ... manifest設定
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/pyodide\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pyodide-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### キャッシュ戦略

| リソース | 戦略 | 理由 |
|---------|------|------|
| 静的アセット | CacheFirst | 変更頻度低い |
| API呼び出し | NetworkOnly | リアルタイム必須 |
| Pyodide | CacheFirst | 大きなファイル |
| フォント | CacheFirst | 変更されない |

### オフライン検出

```typescript
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
```

---

## Web App Manifest

### manifest.json

```json
{
  "name": "Claude Code Web",
  "short_name": "ClaudeCode",
  "description": "AI-powered code execution in browser",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a2e",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "New Chat",
      "short_name": "New",
      "description": "Start a new conversation",
      "url": "/?new=1",
      "icons": [{ "src": "/icons/new-chat.png", "sizes": "96x96" }]
    }
  ],
  "categories": ["developer", "productivity"]
}
```

### アイコン要件

| サイズ | 用途 |
|-------|------|
| 72x72 | Android低解像度 |
| 96x96 | ショートカット |
| 128x128 | Windows |
| 144x144 | タブレット |
| 152x152 | iPad |
| 192x192 | Android標準 |
| 384x384 | スプラッシュ |
| 512x512 | PWAストア |

---

## モバイル最適化

### Viewport設定

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
```

### タッチ操作

```css
/* タッチターゲットサイズ */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* タッチフィードバック */
.button:active {
  transform: scale(0.98);
  opacity: 0.8;
}

/* スクロールの慣性 */
.scrollable {
  -webkit-overflow-scrolling: touch;
}
```

### 仮想キーボード対応

```typescript
useEffect(() => {
  // visualViewportでキーボード検出
  const handleResize = () => {
    const vh = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
  };

  window.visualViewport?.addEventListener('resize', handleResize);
  return () => window.visualViewport?.removeEventListener('resize', handleResize);
}, []);
```

```css
/* CSS変数でviewport高さを使用 */
.chat-container {
  height: calc(var(--vh, 1vh) * 100);
}
```

---

## オフライン体験

### オフライン時のUI

```typescript
const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      <OfflineIcon />
      <span>オフラインです。接続を確認してください。</span>
    </div>
  );
};
```

### オフライン時の機能制限

| 機能 | オフライン時 |
|------|-------------|
| UI表示 | 可能（キャッシュ） |
| 過去の会話閲覧 | 可能（キャッシュ） |
| AI対話 | 不可（ネットワーク必須） |
| Pythonローカル実行 | 可能（Pyodideキャッシュ） |
| JS/TSサーバー実行 | 不可（API必須） |

---

## インストールプロンプト

### カスタムインストールUI

```typescript
const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt">
      <p>アプリとしてインストールしますか？</p>
      <button onClick={handleInstall}>インストール</button>
      <button onClick={() => setShowPrompt(false)}>後で</button>
    </div>
  );
};
```

---

## パフォーマンス最適化

### 初期ロード最適化

1. **コード分割**: 動的import
2. **プリロード**: クリティカルリソース
3. **遅延ロード**: Pyodide, Monaco Editor

```typescript
// 動的import例
const MonacoEditor = lazy(() => import('./components/MonacoEditor'));

// プリロード
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

### バンドルサイズ目標

| パッケージ | 目標サイズ | 現状 |
|-----------|-----------|------|
| メインバンドル | < 100KB (gzip) | - |
| Pyodide | 遅延ロード | ~5MB |
| Shiki | < 50KB (gzip) | - |

---

## 関連ドキュメント

- [チャットインターフェース](./chat-interface.md)
- [デプロイ手順](../guides/deployment.md)
