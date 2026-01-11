# ADR-002: Pyodideによるクライアントサイドpython実行

## ステータス
承認済み

## 日付
2025-01-11

## コンテキスト

Claude Code WebでPythonコードを実行する必要があります。サーバーサイドのCloudflare Sandboxでは現時点でPythonのネイティブサポートが限定的です。

### 検討した選択肢

#### 選択肢1: Pyodide（クライアントサイドWASM）
- CPythonをWebAssemblyにコンパイル
- ブラウザ内で完全なPython環境
- 科学計算ライブラリ（numpy, pandas）を含む

#### 選択肢2: Cloudflare Containers（Python）
- サーバーサイドでのPython実行
- フル機能のPython環境
- コールドスタートが長い

#### 選択肢3: Brython（JavaScript変換）
- PythonをJavaScriptに変換
- 軽量だが互換性に制限
- 科学計算ライブラリ非対応

#### 選択肢4: Skulpt
- ブラウザ内Pythonインタプリタ
- 軽量だが機能制限
- Python 2ベース（古い）

## 決定

**Pyodide**をクライアントサイドPython実行環境として採用する。

## 理由

1. **完全なPython互換性**
   - CPython 3.11ベース
   - 標準ライブラリの大部分が利用可能

2. **科学計算サポート**
   - numpy, pandas, matplotlib, scipy, scikit-learn
   - データサイエンス用途に最適

3. **オフライン対応**
   - キャッシュ後はネットワーク不要
   - PWAのオフライン機能と整合

4. **セキュリティ**
   - WebAssemblyサンドボックス
   - ブラウザのセキュリティモデル内で動作

5. **サーバーコスト削減**
   - クライアントリソースを活用
   - Workers実行時間を消費しない

## 結果

### ポジティブ
- 豊富なPythonライブラリへのアクセス
- サーバー負荷の軽減
- オフライン実行可能

### ネガティブ
- 初期ロードが大きい（約5MB）
- メインスレッドブロックのリスク
- 一部のC拡張が非対応

### 対策
- バックグラウンドでのプリロード
- Web Workerでの実行検討
- 初回ロード時の進捗表示

## 実装ノート

```typescript
// プリロード戦略
const preloadPyodide = () => {
  // ユーザーの最初のインタラクション後にロード開始
  window.addEventListener('click', () => {
    pyodideRunner.load();
  }, { once: true });
};

// Web Worker使用例（将来）
const worker = new Worker('pyodide-worker.js');
worker.postMessage({ code: 'print("Hello")' });
```

## 関連
- [ADR-001: Cloudflare Sandbox](./adr-001-cloudflare-sandbox.md)
- [コード実行環境](../features/sandbox-execution.md)
