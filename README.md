<div align="center">

<img src="./public/icon.svg" alt="Git Control Logo" width="112" height="112" />

# ⚡ Git Control

**A Blazing-Fast, Glassmorphic Multi-Platform Git GUI & Interactive Commit Graph**  
*Built with Tauri v2 (Rust), React 18, TypeScript, and Monaco Editor for Windows 11 & macOS.*

[![License: MIT](https://img.shields.io/badge/License-MIT-38bdf8.svg)](./LICENSE)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-ffc131?logo=tauri&logoColor=white)](https://v2.tauri.app/)
[![Rust](https://img.shields.io/badge/Backend-Rust-dea584?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React 18](https://img.shields.io/badge/Frontend-React_18_%2B_TypeScript-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-10b981.svg)](./CONTRIBUTING.md)

</div>

---

## ✨ Overview

**Git Control** is a modern, lightweight desktop Git client engineered for developers who love the visual clarity of [`vscode-git-graph`](https://github.com/mhutchie/vscode-git-graph) combined with the full power of a standalone Git IDE. Powered by a native **Rust (Tauri v2)** backend and OS-level **Mica / Vibrancy Glassmorphism**, it starts instantaneously with a fraction of the memory footprint of Electron-based Git clients.

---

## 🚀 Key Features

- **🕸️ Interactive Angular Git Graph**
  - Multi-lane topological & date-ordered SVG commit graph with color-coded branches, merge edges, inline `Uncommitted Changes (*)` node, and `Stash` nodes.
  - **Multi-Branch Checklist Filter**: Filter the commit graph by checking `>1` local or remote branches simultaneously, isolated per repository tab.
  - **Commit Comparison (`Ctrl/Cmd + Click`)**: Click any two commits in the graph to inspect the exact file and line diffs between them.
  - **Rich Context Menu**: Right-click any commit, branch pill, tag, or stash to Checkout, Create/Rename/Delete Branch, Tag, Merge, Rebase, Cherry-Pick, Revert, or Reset (`--soft`, `--mixed`, `--hard`).

- **🗂️ Multi-Tab Repository Workspace & Manager**
  - Work across multiple Git repositories simultaneously with instant tab switching and persistent session restoration.
  - **Bookmarked Repositories**: Searchable bookmark manager with `Last opened` timestamps.
  - **Clone & 1-Click Publish**: Clone remote repositories or publish any local folder directly to **GitHub**, **GitLab**, or custom remotes (automatically running `git init`, initial commit, and `git push -u`).

- **👤 Multi-Account & Identity Manager**
  - Auto-discovers existing system `--global` and per-repository `--local` Git identities (`user.name` & `user.email`).
  - Login with **GitHub**, **GitLab**, or **Bitbucket** Personal Access Tokens (PAT) with 1-click profile verification and avatar sync.
  - Switch between **Work** and **Personal** accounts globally (`git config --global`) or per-repository (`git config --local`).

- **📝 Monaco Diff Viewer, Hunk Staging & Conflict Resolver**
  - Powered by **Monaco Editor** with Side-by-Side and Unified diff views.
  - **Interactive Hunk-Level Staging**: Stage, unstage, or discard individual diff hunks (`git apply --cached --unidiff-zero`).
  - **3-Way Merge Conflict Resolver**: Resolve conflict blocks with 1-click *Accept Current (Ours)*, *Accept Incoming (Theirs)*, or *Accept Both*.

- **🛡️ Destructive Action Safeguards & Live Command Console**
  - Confirmation modals with exact Git command previews before executing destructive operations (Delete Branch, Delete Tag, Drop Stash, Hard Reset, Discard Changes/Hunks).
  - Real-time **Git Command Log Console** showing every executed `git` command, exit code, and execution duration in milliseconds.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Desktop Shell & Backend** | [Tauri v2](https://v2.tauri.app/), Rust (`tokio`, `notify`, `window-vibrancy`, `rfd`) |
| **Frontend UI** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Code & Diff Editor** | [`@monaco-editor/react`](https://github.com/suren-atoyan/monaco-react) |

---

## 📦 Getting Started

### Prerequisites
- **Git** (`2.30+`) installed and available in system `PATH`
- **Node.js** (`20.11.1+`, locked via `.nvmrc` and `.node-version`)
- **pnpm** (`9.5.0+`, enforced via `packageManager` and `.npmrc`)
- **Rust** (`1.85+` stable toolchain via [rustup.rs](https://rustup.rs/))

### Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/git-control.git
cd git-control

# 2. Install frontend dependencies with pnpm
pnpm install

# 3. Run in native Tauri desktop mode
pnpm tauri dev
```

### Production Build

```bash
# Build native installer (.msi / .exe on Windows, .dmg / .app on macOS)
pnpm tauri build
```

---

## ⌨️ Useful Shortcuts & Interactions

| Interaction | Action |
| :--- | :--- |
| `Click` on Commit Row | View commit message, metadata, and changed files |
| `Ctrl / Cmd + Click` on Second Commit | Compare diff between two commits |
| `Right-Click` on Commit / Branch Badge | Open contextual Git operations menu |
| `Double-Click` Local Branch in Sidebar | Checkout branch immediately |
| `Esc` | Close active modal, dropdown, or confirmation dialog |

---

## 💖 Support & Donations

**Git Control** is free and open-source software licensed under the [MIT License](./LICENSE).  
*Sponsorship and donation links (GitHub Sponsors, Ko-fi, Saweria) will be available soon.*

---

## 🤝 Contributing & Community

We welcome contributions of all kinds—bug fixes, new Git workflows, performance improvements, and documentation!

- Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a Pull Request.
- All participants are expected to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md).
- For security vulnerabilities, please refer to our [Security Policy](./SECURITY.md).
- AI coding agents working on this repository should follow [AGENTS.md](./AGENTS.md).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for full details.
