import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

/**
 * Bundle Monaco locally instead of letting @monaco-editor/react fetch it from
 * the jsdelivr CDN. Only the core editor worker and lightweight basic-language
 * tokenizers are included (no TS/JSON/CSS language-service workers), which keeps
 * RAM low and makes the diff viewer work offline.
 */
let configured = false;

export function setupMonaco(): void {
  if (configured) return;
  configured = true;

  (self as unknown as { MonacoEnvironment: { getWorker: () => Worker } }).MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
  };
  loader.config({ monaco });
}

setupMonaco();
