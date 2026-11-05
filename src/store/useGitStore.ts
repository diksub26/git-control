import { create } from 'zustand';
import {
  CommandLogEntry,
  CommitFileChange,
  FileDiffData,
  GitCommit,
  GitRef,
  GitSubmodule,
  GitWorktree,
  GraphStyle,
  RemoteHostInfo,
  RemoteIssue,
  RemotePullRequest,
  RepoTab,
  WorkingFileChange,
} from '../types/git';
import {
  execGit,
  fetchRemotePullRequestsAndIssues,
  getCommitChangedFiles,
  getCompareCommitsFiles,
  getFileDiff,
  loadRepositoryState,
  onGitCommandLog,
} from '../services/gitService';

interface ActiveFileDiffRequest {
  filePath: string;
  mode: 'working-unstaged' | 'working-staged' | 'working-untracked' | 'commit' | 'compare' | 'conflict';
  commitHash?: string;
  compareFromHash?: string;
  compareToHash?: string;
}

interface GitStoreState {
  // Multi-tab & saved repos
  tabs: RepoTab[];
  savedRepos: { name: string; path: string }[];
  activeTabId: string;

  // Current repo data
  isLoading: boolean;
  currentBranch: string;
  headHash: string;
  commits: GitCommit[];
  refs: GitRef[];
  workingFiles: WorkingFileChange[];
  worktrees: GitWorktree[];
  submodules: GitSubmodule[];
  remoteInfo: RemoteHostInfo | null;
  pullRequests: RemotePullRequest[];
  issues: RemoteIssue[];
  githubToken: string;

  // Graph settings (vscode-git-graph toolbar)
  graphStyle: GraphStyle;
  branchFilter: string;
  searchQuery: string;
  commitOrdering: 'date' | 'topo' | 'author-date';
  firstParentOnly: boolean;
  showAvatars: boolean;

  // Selection & contextual panel state
  selectedCommitHash: string | null;
  compareCommitHash: string | null; // Second commit when Ctrl/Cmd + Click
  selectedCommitBody: string;
  selectedCommitFiles: CommitFileChange[];
  activeDiffRequest: ActiveFileDiffRequest | null;
  activeDiffData: FileDiffData | null;
  diffViewMode: 'side-by-side' | 'unified';

  // Command log console & notifications
  commandLogs: CommandLogEntry[];
  isConsoleOpen: boolean;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;

  // Actions
  initStore: () => Promise<void>;
  openRepoTab: (path: string) => Promise<void>;
  closeRepoTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => Promise<void>;
  refreshActiveRepo: () => Promise<void>;

  // Graph UI setters
  setGraphStyle: (style: GraphStyle) => void;
  setBranchFilter: (branch: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setCommitOrdering: (order: 'date' | 'topo' | 'author-date') => Promise<void>;
  setFirstParentOnly: (val: boolean) => Promise<void>;
  setShowAvatars: (val: boolean) => void;
  setDiffViewMode: (mode: 'side-by-side' | 'unified') => void;
  setGithubToken: (token: string) => void;

  // Commit & Diff selection
  selectCommit: (hash: string, isCtrlOrCmdKey?: boolean) => Promise<void>;
  openFileDiff: (req: ActiveFileDiffRequest | null) => Promise<void>;
  setConsoleOpen: (open: boolean) => void;
  clearCommandLogs: () => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;

  // Git Management Operations
  runGitOp: (label: string, args: string[]) => Promise<boolean>;
  stageFile: (filePath: string) => Promise<void>;
  unstageFile: (filePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  discardFile: (filePath: string, isUntracked?: boolean) => Promise<void>;
  commitChanges: (message: string, amend?: boolean, signoff?: boolean) => Promise<boolean>;
  loadRemotePRsAndIssues: () => Promise<void>;
}

const DEFAULT_REPO_PATH = 'd:\\working-tools\\git-control';

export const useGitStore = create<GitStoreState>((set, get) => {
  onGitCommandLog((entry) => {
    set((s) => ({
      commandLogs: [entry, ...s.commandLogs].slice(0, 200),
    }));
  });

  return {
    tabs: [
      {
        id: 'tab-default',
        name: 'git-control',
        path: DEFAULT_REPO_PATH,
        currentBranch: 'main',
        uncommittedCount: 0,
        conflictCount: 0,
      },
    ],
    savedRepos: JSON.parse(
      localStorage.getItem('git-control-saved-repos') ||
        JSON.stringify([{ name: 'git-control', path: DEFAULT_REPO_PATH }])
    ),
    activeTabId: 'tab-default',

    isLoading: false,
    currentBranch: 'main',
    headHash: '',
    commits: [],
    refs: [],
    workingFiles: [],
    worktrees: [],
    submodules: [],
    remoteInfo: null,
    pullRequests: [],
    issues: [],
    githubToken: localStorage.getItem('git-control-gh-token') || '',

    graphStyle: 'curved',
    branchFilter: 'all',
    searchQuery: '',
    commitOrdering: 'date',
    firstParentOnly: false,
    showAvatars: true,

    selectedCommitHash: null,
    compareCommitHash: null,
    selectedCommitBody: '',
    selectedCommitFiles: [],
    activeDiffRequest: null,
    activeDiffData: null,
    diffViewMode: 'side-by-side',

    commandLogs: [],
    isConsoleOpen: false,
    toast: null,

    showToast: (message, type = 'info') => {
      set({ toast: { message, type } });
      setTimeout(() => {
        set((s) => (s.toast?.message === message ? { toast: null } : s));
      }, 3800);
    },

    initStore: async () => {
      await get().refreshActiveRepo();
    },

    openRepoTab: async (rawPath: string) => {
      const cleanPath = rawPath.trim();
      if (!cleanPath) return;
      const existing = get().tabs.find(
        (t) => t.path.toLowerCase() === cleanPath.toLowerCase()
      );
      if (existing) {
        await get().setActiveTab(existing.id);
        return;
      }

      const name = cleanPath.split(/[\\/]/).filter(Boolean).pop() || cleanPath;
      const newTab: RepoTab = {
        id: `tab-${Date.now()}`,
        name,
        path: cleanPath,
        currentBranch: '...',
        uncommittedCount: 0,
        conflictCount: 0,
      };

      const saved = get().savedRepos.some(
        (r) => r.path.toLowerCase() === cleanPath.toLowerCase()
      )
        ? get().savedRepos
        : [...get().savedRepos, { name, path: cleanPath }];

      localStorage.setItem('git-control-saved-repos', JSON.stringify(saved));

      set((s) => ({
        tabs: [...s.tabs, newTab],
        savedRepos: saved,
        activeTabId: newTab.id,
        selectedCommitHash: null,
        compareCommitHash: null,
        activeDiffRequest: null,
        activeDiffData: null,
      }));

      await get().refreshActiveRepo();
    },

    closeRepoTab: (tabId: string) => {
      const { tabs, activeTabId } = get();
      if (tabs.length <= 1) return;
      const filtered = tabs.filter((t) => t.id !== tabId);
      const nextActive =
        activeTabId === tabId ? filtered[filtered.length - 1].id : activeTabId;
      set({ tabs: filtered, activeTabId: nextActive });
      if (activeTabId === tabId) {
        get().refreshActiveRepo();
      }
    },

    setActiveTab: async (tabId: string) => {
      set({
        activeTabId: tabId,
        selectedCommitHash: null,
        compareCommitHash: null,
        activeDiffRequest: null,
        activeDiffData: null,
      });
      await get().refreshActiveRepo();
    },

    refreshActiveRepo: async () => {
      const { tabs, activeTabId, branchFilter, commitOrdering, firstParentOnly } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      set({ isLoading: true });
      try {
        const state = await loadRepositoryState(activeTab.path, {
          branchFilter,
          CommitOrdering: commitOrdering,
          firstParentOnly,
        });

        const conflictCount = state.workingFiles.filter((f) => f.conflicted).length;
        const updatedTabs = get().tabs.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                currentBranch: state.currentBranch,
                uncommittedCount: state.workingFiles.length,
                conflictCount,
              }
            : t
        );

        let selectedHash = get().selectedCommitHash;
        if (!selectedHash && state.commits.length > 0) {
          selectedHash = state.commits[0].hash;
        }

        set({
          tabs: updatedTabs,
          currentBranch: state.currentBranch,
          headHash: state.headHash,
          commits: state.commits,
          refs: state.refs,
          workingFiles: state.workingFiles,
          worktrees: state.worktrees,
          submodules: state.submodules,
          remoteInfo: state.remoteInfo,
          isLoading: false,
        });

        if (selectedHash) {
          await get().selectCommit(selectedHash, false);
        }
        if (state.remoteInfo) {
          get().loadRemotePRsAndIssues();
        }
      } catch (err: any) {
        set({ isLoading: false });
        get().showToast(`Failed to load repository: ${err?.message || err}`, 'error');
      }
    },

    setGraphStyle: (graphStyle) => set({ graphStyle }),

    setBranchFilter: async (branchFilter) => {
      set({ branchFilter });
      await get().refreshActiveRepo();
    },

    setSearchQuery: (searchQuery) => set({ searchQuery }),

    setCommitOrdering: async (commitOrdering) => {
      set({ commitOrdering });
      await get().refreshActiveRepo();
    },

    setFirstParentOnly: async (firstParentOnly) => {
      set({ firstParentOnly });
      await get().refreshActiveRepo();
    },

    setShowAvatars: (showAvatars) => set({ showAvatars }),
    setDiffViewMode: (diffViewMode) => set({ diffViewMode }),

    setGithubToken: (githubToken) => {
      localStorage.setItem('git-control-gh-token', githubToken);
      set({ githubToken });
      get().loadRemotePRsAndIssues();
    },

    selectCommit: async (hash: string, isCtrlOrCmdKey = false) => {
      const { tabs, activeTabId, selectedCommitHash } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      // Handle Ctrl/Cmd + Click to compare 2 commits (vscode-git-graph feature)
      if (
        isCtrlOrCmdKey &&
        selectedCommitHash &&
        selectedCommitHash !== 'UNCOMMITTED' &&
        hash !== 'UNCOMMITTED' &&
        selectedCommitHash !== hash
      ) {
        const files = await getCompareCommitsFiles(
          activeTab.path,
          selectedCommitHash,
          hash
        );
        set({
          compareCommitHash: hash,
          selectedCommitFiles: files,
          selectedCommitBody: `Comparing ${selectedCommitHash.slice(0, 7)} ↔ ${hash.slice(0, 7)}`,
          activeDiffRequest: null,
          activeDiffData: null,
        });
        return;
      }

      if (hash === 'UNCOMMITTED') {
        set({
          selectedCommitHash: 'UNCOMMITTED',
          compareCommitHash: null,
          selectedCommitBody: '',
          selectedCommitFiles: [],
        });
        return;
      }

      const details = await getCommitChangedFiles(activeTab.path, hash);
      set({
        selectedCommitHash: hash,
        compareCommitHash: null,
        selectedCommitBody: details.body,
        selectedCommitFiles: details.files,
      });
    },

    openFileDiff: async (req) => {
      if (!req) {
        set({ activeDiffRequest: null, activeDiffData: null });
        return;
      }
      const { tabs, activeTabId } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      set({ activeDiffRequest: req });
      if (req.mode === 'conflict') {
        return;
      }
      const diffData = await getFileDiff(activeTab.path, req.filePath, {
        mode: req.mode,
        commitHash: req.commitHash,
        compareFromHash: req.compareFromHash,
        compareToHash: req.compareToHash,
      });
      set({ activeDiffData: diffData });
    },

    setConsoleOpen: (isConsoleOpen) => set({ isConsoleOpen }),
    clearCommandLogs: () => set({ commandLogs: [] }),

    runGitOp: async (label: string, args: string[]) => {
      const { tabs, activeTabId } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return false;

      const res = await execGit(activeTab.path, args);
      if (res.exitCode === 0) {
        get().showToast(`${label} succeeded`, 'success');
        await get().refreshActiveRepo();
        return true;
      } else {
        get().showToast(
          `${label} failed: ${res.stderr.trim() || res.stdout.trim()}`,
          'error'
        );
        await get().refreshActiveRepo();
        return false;
      }
    },

    stageFile: async (filePath: string) => {
      await get().runGitOp(`Staged ${filePath}`, ['add', '--', filePath]);
    },

    unstageFile: async (filePath: string) => {
      await get().runGitOp(`Unstaged ${filePath}`, ['restore', '--staged', '--', filePath]);
    },

    stageAll: async () => {
      await get().runGitOp('Staged all files', ['add', '-A']);
    },

    unstageAll: async () => {
      await get().runGitOp('Unstaged all files', ['reset']);
    },

    discardFile: async (filePath: string, isUntracked = false) => {
      if (isUntracked) {
        await get().runGitOp(`Removed untracked ${filePath}`, ['clean', '-f', '--', filePath]);
      } else {
        await get().runGitOp(`Discarded changes in ${filePath}`, [
          'checkout',
          '--',
          filePath,
        ]);
      }
    },

    commitChanges: async (message: string, amend = false, signoff = false) => {
      const args = ['commit', '-m', message];
      if (amend) args.push('--amend');
      if (signoff) args.push('--signoff');
      return await get().runGitOp('Commit', args);
    },

    loadRemotePRsAndIssues: async () => {
      const { remoteInfo, githubToken } = get();
      if (!remoteInfo || remoteInfo.provider === 'unknown') return;
      try {
        const { pullRequests, issues } = await fetchRemotePullRequestsAndIssues(
          remoteInfo,
          githubToken
        );
        set({ pullRequests, issues });
      } catch {
        // Ignore network errors silently
      }
    },
  };
});
