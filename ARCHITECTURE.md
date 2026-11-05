# Git Control — Architecture & Implementation Plan

Aplikasi GUI Git multi-platform (**Windows 11 & macOS**) dengan estetika **Native OS Glassmorphism (Mica/Acrylic & macOS Vibrancy)** serta fitur utama **Git Graph interaktif** yang mengadaptasi arsitektur visual dan fungsionalitas [`vscode-git-graph`](https://github.com/mhutchie/vscode-git-graph/tree/develop/src).

## Tech Stack
- **Desktop Core**: Tauri v2 (Rust Backend)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Lucide Icons + Monaco Editor (`@monaco-editor/react`)
- **Git Execution**: Hybrid System `git` CLI Runner + Rust Real-time File Watcher (`notify`)
- **Window Styling**: Native OS Glassmorphism (`window-vibrancy` / Tauri window effects)
