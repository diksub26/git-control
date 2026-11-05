# Contributing to Git Control

Thank you for your interest in contributing to **Git Control**! Whether you are reporting a bug, proposing a new feature, or submitting code, your help is greatly appreciated.

---

## 🛠️ Development Environment Setup

1. **Prerequisites**:
   - **Git** `2.30+`
   - **Node.js** `20.11.1+` (locked in `.nvmrc` / `.node-version`)
   - **pnpm** `9.5.0+`
   - **Rust** `1.85+` (via `rustup`)
2. **Fork & Clone**:
   ```bash
   git clone https://github.com/<your-username>/git-control.git
   cd git-control
   pnpm install
   ```
3. **Run in Development**:
   ```bash
   pnpm tauri dev
   ```
4. **Typecheck & Build**:
   ```bash
   pnpm build
   ```

---

## 🧭 Architecture & Coding Guidelines

- **Git Execution**: All Git commands are executed asynchronously via `execGit` (`src/services/gitService.ts`) backed by `run_git_command` in `src-tauri/src/lib.rs` using `tokio::task::spawn_blocking`. Never block the main Tauri UI thread.
- **Destructive Operations**: Any action that mutates history or discards uncommitted work (`branch -D`, `tag -d`, `stash drop`, `reset --hard`, `checkout --`, `clean -f`) **must** be wrapped in `requestConfirm({...})` from `useGitStore`.
- **Floating Menus & Modals**: Because panels use CSS `backdrop-blur-*`, any floating menu, dropdown, or modal positioned relative to the viewport (`position: fixed`) **must** be rendered using `createPortal(..., document.body)` to avoid coordinate offsets.
- **Per-Tab State Isolation**: Filter states such as `selectedBranches` and `searchQuery` belong to each `RepoTab` and must not leak across tabs.

---

## 🚀 Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and verify that `pnpm build` and `cargo check --manifest-path src-tauri/Cargo.toml` pass with zero errors.
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`).
4. Open a Pull Request describing the motivation, changes, and screenshots if UI elements were updated.

---

## 📜 License

By contributing to Git Control, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
