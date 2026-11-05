# AGENTS.md

## Project Overview
**Git Control** is a cross-platform desktop Git GUI and interactive commit graph built with **Tauri v2 (Rust)**, **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **Zustand**, and **Monaco Editor** (`@monaco-editor/react`). Detailed architecture documentation is available in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Setup & Commands
- **Runtime & Package Manager**: Node.js `20.11.1` (locked in `.nvmrc` & `.node-version`) and `pnpm@9.5.0` (enforced via `.npmrc`). Always use `pnpm`; never use `npm` or `yarn`.
- **Install dependencies**: `pnpm install`
- **Verify TypeScript & frontend production build**: `pnpm build` (runs `tsc && vite build`).
- **Verify Rust backend compilation**: `cargo check --manifest-path src-tauri/Cargo.toml`
- **Run desktop app (Tauri + Vite)**: `pnpm tauri dev` (run in an external terminal on Windows; do not spawn duplicate `tauri dev` instances if port `1420` or `EBWebView` is already in use).
- **Run web-only dev mode (with `/api/git` Vite middleware fallback)**: `pnpm dev`

## Architecture & Code Style Constraints
- **State Management (`src/store/useGitStore.ts`)**:
  - Per-repository filter state (`selectedBranches`, `searchQuery`) is stored on each `RepoTab` in `tabs` and restored on `setActiveTab`, `openRepoTab`, and `closeRepoTab`. Never let branch filters leak between tabs.
  - All destructive Git actions (`branch -D`, `tag -d`, `stash drop`, `reset --soft/--mixed/--hard`, `revert`, `checkout --`, `clean -f`, hunk discard, bookmark/account deletion) must invoke `requestConfirm({...})` before executing.
- **Git Execution (`src/services/gitService.ts` & `src-tauri/src/lib.rs`)**:
  - Always use `execGit(repoPath, args, stdin)` for Git CLI operations.
  - All `#[tauri::command]` functions in `src-tauri/src/lib.rs` must be `async fn` and offload blocking I/O or process spawning to `tauri::async_runtime::spawn_blocking`.
  - In `git for-each-ref` format strings, never insert spaces inside field placeholders (use `%(objecttype)`, never `%( objecttype )`).
  - Mask any `http.extraHeader=Authorization: Basic ...` credentials in `execGit` before emitting command log entries.
- **UI & Glassmorphism (`src/components/`)**:
  - Ancestor containers use Tailwind `backdrop-blur-*` (`backdrop-filter`), which creates a new containing block for `position: fixed` elements. Any floating context menu, custom dropdown, or modal that relies on viewport coordinates (`clientX`/`clientY` or full-screen overlay) **must** be rendered via `createPortal(..., document.body)`.
  - The Git Graph style (`src/utils/graphLayout.ts`) is permanently locked to `angular`. Do not re-introduce a Curved/Angular style switcher.
- **Filesystem Watcher (`watch_repository` in `src-tauri/src/lib.rs`)**:
  - Watch only `.git/refs` (never watch the entire working tree recursively) and ignore `.lock`, `node_modules`, `target`, and `.git/objects` with a `>=1500ms` debounce to prevent WebView freeze loops.

## Safety & Boundaries
- Never commit or log plaintext Personal Access Tokens (PAT) or `.env` secrets.
- Do not set `"transparent": true` alongside `apply_mica` in `src-tauri/tauri.conf.json` on Windows 11 (`"transparent": false` and `"visible": true` are required for reliable DWM rendering).
- Always verify changes with `pnpm build` before finishing a task.
