# 多言語対応 - One Pager

## 概要

JavaScript/Python以外のプログラミング言語をサンドボックスで実行可能にする。

## 現状

- JavaScript/TypeScript: Cloudflare Sandbox (V8)
- Python: Pyodide (WASM)

## 追加予定言語

1. **Go**: TinyGo → WASM
2. **Rust**: wasm-pack
3. **Ruby**: ruby.wasm
4. **PHP**: php-wasm
5. **C/C++**: Emscripten

## 技術設計

### 言語ランタイム管理

```typescript
interface LanguageRuntime {
  id: string;
  name: string;
  extensions: string[];
  execute: (code: string) => Promise<ExecutionResult>;
  isLoaded: () => boolean;
  load: () => Promise<void>;
}

const runtimes: Record<string, LanguageRuntime> = {
  javascript: new V8Runtime(),
  python: new PyodideRuntime(),
  go: new TinyGoRuntime(),
  rust: new RustWasmRuntime(),
};
```

### 遅延ロード

```typescript
// 必要になった時点でランタイムをロード
async function executeCode(language: string, code: string) {
  const runtime = runtimes[language];
  if (!runtime) throw new Error(`Unsupported language: ${language}`);

  if (!runtime.isLoaded()) {
    await runtime.load();
  }

  return runtime.execute(code);
}
```

## 言語別実装詳細

### Go (TinyGo)
```bash
tinygo build -o main.wasm -target wasm main.go
```

### Rust
```bash
wasm-pack build --target web
```

### Ruby
```typescript
import { DefaultRubyVM } from '@aspect/webassembly-ruby';
```

## 成功指標

- 実行成功率 > 95%
- コールドスタート < 3秒
- メモリ使用量 < 256MB/言語

## スケジュール

| フェーズ | 期間 | 内容 |
|---------|------|------|
| Phase 1 | 2日 | Go (TinyGo) |
| Phase 2 | 2日 | Rust |
| Phase 3 | 2日 | Ruby |
| Phase 4 | 2日 | その他 |

## リスク

1. **WASMサイズ**: 遅延ロード必須
2. **互換性**: 標準ライブラリ制限
3. **パフォーマンス**: ネイティブより遅い
