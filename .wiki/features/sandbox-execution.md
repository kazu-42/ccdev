# コード実行環境（Sandbox）

## 概要

Claude Code Webは、2つの方式でコードを実行します：

1. **Cloudflare Sandbox**: サーバーサイドでのJS/TS実行
2. **Pyodide**: クライアントサイドでのPython実行

---

## Cloudflare Sandbox（JS/TS）

### アーキテクチャ

```
Workers API → Sandbox SDK → V8 Isolate
     ↓              ↓            ↓
  Request    Container     Execution
     ↓              ↓            ↓
  Response  ←  Result  ←   stdout/err
```

### Sandbox SDK使用方法

```typescript
import { getSandbox } from '@cloudflare/sandbox-sdk';

export class SandboxService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async execute(code: string, language: 'javascript' | 'typescript'): Promise<ExecutionResult> {
    const sandbox = await getSandbox(this.env.SANDBOX);

    const command = language === 'typescript'
      ? ['npx', 'tsx', '-e', code]
      : ['node', '-e', code];

    const result = await sandbox.exec(command[0], command.slice(1), {
      timeout: 30000,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionTime: result.executionTime,
    };
  }
}
```

### セキュリティ制約

| 制約 | 設定 | 理由 |
|-----|------|------|
| タイムアウト | 30秒 | 無限ループ防止 |
| メモリ | 128MB | リソース保護 |
| ネットワーク | 制限付き | 外部攻撃防止 |
| ファイルシステム | 仮想化 | 隔離 |

### エラーハンドリング

```typescript
try {
  const result = await sandbox.exec(...);
  return result;
} catch (error) {
  if (error.code === 'TIMEOUT') {
    throw new SandboxError('timeout', 'Execution timed out after 30 seconds');
  }
  if (error.code === 'OOM') {
    throw new SandboxError('memory', 'Memory limit exceeded');
  }
  throw new SandboxError('runtime', error.message);
}
```

---

## Pyodide（Python）

### アーキテクチャ

```
Browser → Web Worker → Pyodide WASM → Python Runtime
    ↓           ↓             ↓              ↓
  Code    Isolation      CPython       Execution
    ↓           ↓             ↓              ↓
  Result ←  Transfer  ←   Output  ←    stdout
```

### 初期化

```typescript
class PyodideRunner {
  private pyodide: Pyodide | null = null;
  private loading: Promise<void> | null = null;

  async load(): Promise<void> {
    if (this.pyodide) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.0/full/',
      });
      this.pyodide = pyodide;
    })();

    return this.loading;
  }

  get isReady(): boolean {
    return this.pyodide !== null;
  }
}
```

### コード実行

```typescript
async run(code: string): Promise<PythonResult> {
  if (!this.pyodide) {
    await this.load();
  }

  // stdout/stderrのキャプチャ設定
  this.pyodide.runPython(`
    import sys
    from io import StringIO
    sys.stdout = StringIO()
    sys.stderr = StringIO()
  `);

  let result: any;
  try {
    result = this.pyodide.runPython(code);
  } catch (error) {
    const stderr = this.pyodide.runPython('sys.stderr.getvalue()');
    return { stdout: '', stderr, result: null };
  }

  const stdout = this.pyodide.runPython('sys.stdout.getvalue()');
  const stderr = this.pyodide.runPython('sys.stderr.getvalue()');

  return { stdout, stderr, result };
}
```

### プリロード戦略

```typescript
// App起動時にバックグラウンドでロード開始
useEffect(() => {
  // ユーザーインタラクション後にロード（パフォーマンス）
  const handleFirstInteraction = () => {
    pyodideRunner.load();
    window.removeEventListener('click', handleFirstInteraction);
  };
  window.addEventListener('click', handleFirstInteraction);
}, []);
```

### サポートライブラリ

Pyodideに含まれる主要ライブラリ：

| ライブラリ | 用途 |
|-----------|------|
| numpy | 数値計算 |
| pandas | データ分析 |
| matplotlib | グラフ描画 |
| scipy | 科学計算 |
| scikit-learn | 機械学習 |

---

## 実行結果表示

### OutputPanelコンポーネント

```typescript
interface OutputPanelProps {
  result: ExecutionResult | null;
  isExecuting: boolean;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ result, isExecuting }) => {
  return (
    <div className="output-panel">
      {isExecuting && <Spinner />}
      {result && (
        <>
          {result.stdout && (
            <pre className="stdout">{result.stdout}</pre>
          )}
          {result.stderr && (
            <pre className="stderr">{result.stderr}</pre>
          )}
          <div className="metadata">
            Exit code: {result.exitCode}
            Time: {result.executionTime}ms
          </div>
        </>
      )}
    </div>
  );
};
```

### 表示形式

| 出力タイプ | スタイル | アイコン |
|-----------|---------|---------|
| stdout | 通常テキスト | なし |
| stderr | 赤色テキスト | 警告 |
| エラー | 赤背景 | エラー |
| 成功 | 緑ボーダー | チェック |

---

## Tool Use統合

### ツール定義

```typescript
const execute_code_tool = {
  name: 'execute_code',
  description: 'Execute code in a sandboxed environment',
  input_schema: {
    type: 'object',
    properties: {
      language: {
        type: 'string',
        enum: ['javascript', 'typescript', 'python'],
      },
      code: {
        type: 'string',
      },
    },
    required: ['language', 'code'],
  },
};
```

### 実行フロー

1. AIがtool_useイベントを送信
2. Workers APIがツール名を判定
3. 言語に応じてSandboxまたはクライアントに委譲
4. 結果をtool_resultとして返却
5. AIが結果を解釈して続きを生成

---

## パフォーマンス最適化

### JS/TS実行

| 最適化 | 効果 |
|-------|------|
| ウォームスタート | 2回目以降の実行が高速 |
| コード最小化 | 転送時間短縮 |
| 結果ストリーミング | 大きな出力の段階表示 |

### Python実行

| 最適化 | 効果 |
|-------|------|
| プリロード | 初回実行待ち時間削減 |
| キャッシュ | 再訪問時のロード省略 |
| Web Worker | メインスレッドブロック回避 |

---

## 関連ドキュメント

- [チャットインターフェース](./chat-interface.md)
- [セキュリティモデル](../architecture/security.md)
- [ADR-001: Cloudflare Sandbox](../decisions/adr-001-cloudflare-sandbox.md)
