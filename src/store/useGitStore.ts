import { create } from 'zustand';
import {
  CommandLogEntry,
  CommitFileChange,
  FileDiffData,
  GitAccount,
  GitCommit,
  GitConfigIdentity,
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
  clearLocalGitConfigIdentity,
  createRemoteRepositoryViaApi,
  execGit,
  fetchRemotePullRequestsAndIssues,
  getCommitChangedFiles,
  getCompareCommitsFiles,
  getFileDiff,
  getGitConfigIdentity,
  loadRepositoryState,
  onGitCommandLog,
  setGitConfigIdentity,
} from '../services/gitService';

interface ActiveFileDiffRequest {
  filePath: string;
  mode: 'working-unstaged' | 'working-staged' | 'working-untracked' | 'commit' | 'compare' | 'conflict';
  commitHash?: string;
  compareFromHash?: string;
  compareToHash?: string;
}

export interface ConfirmDialogConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  commandPreview?: string;
  onConfirm: () => Promise<void> | void;
}

interface GitStoreState {
  // Multi-tab & saved repos
  tabs: RepoTab[];
  savedRepos: { name: string; path: string; lastOpened: number }[];
  activeTabId: string;
  isRepoModalOpen: boolean;

  // Git Account Management
  accounts: GitAccount[];
  gitIdentity: GitConfigIdentity;
  isAccountModalOpen: boolean;
  isPublishModalOpen: boolean;

  // Current repo data
  isGitInitialized: boolean;
  isLoading: boolean;
  activeRemoteOp: 'fetch' | 'pull' | 'push' | 'submodule' | 'pr-sync' | null;
  runningOpLabel: string | null;
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
  selectedBranches: string[];
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
  confirmDialog: ConfirmDialogConfig | null;

  // Actions
  initStore: () => Promise<void>;
  requestConfirm: (config: ConfirmDialogConfig) => void;
  closeConfirm: () => void;
  setRepoModalOpen: (open: boolean) => void;
  setAccountModalOpen: (open: boolean) => void;
  setPublishModalOpen: (open: boolean) => void;
  initLocalRepository: () => Promise<boolean>;
  publishLocalRepository: (params: {
    mode: 'create-api' | 'custom-url';
    accountId?: string;
    repoName?: string;
    description?: string;
    isPrivate?: boolean;
    protocol?: 'https' | 'ssh';
    customRemoteUrl?: string;
    remoteName?: string;
    initialCommitMessage?: string;
    pushAfterCreate?: boolean;
  }) => Promise<boolean>;
  refreshGitIdentity: () => Promise<void>;
  saveGitAccount: (
    account: Omit<GitAccount, 'id' | 'lastUsedAt'> & { id?: string },
    applyScope?: 'global' | 'local' | 'both' | 'none'
  ) => Promise<void>;
  applyAccountToGitConfig: (
    accountId: string,
    scope: 'global' | 'local'
  ) => Promise<void>;
  clearRepoLocalIdentity: () => Promise<void>;
  removeGitAccount: (accountId: string) => void;
  openRepoTab: (path: string) => Promise<void>;
  closeRepoTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => Promise<void>;
  removeSavedRepo: (path: string) => void;
  cloneRepository: (
    repoUrl: string,
    parentDir: string,
    folderName?: string
  ) => Promise<boolean>;
  refreshActiveRepo: () => Promise<void>;

  // Graph UI setters
  setGraphStyle: (style: GraphStyle) => void;
  toggleBranchSelection: (branch: string) => Promise<void>;
  clearBranchSelection: () => Promise<void>;
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

const SESSION_TABS_KEY = 'git-control-session-tabs';
const SESSION_ACTIVE_TAB_KEY = 'git-control-session-active-tab';
const SAVED_REPOS_KEY = 'git-control-saved-repos-v2';
const SAVED_ACCOUNTS_KEY = 'git-control-accounts-v1';

function loadInitialAccounts(): GitAccount[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadInitialTabs(): RepoTab[] {
  try {
    const raw = localStorage.getItem(SESSION_TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadInitialSavedRepos(): { name: string; path: string; lastOpened: number }[] {
  try {
    const raw = localStorage.getItem(SAVED_REPOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const useGitStore = create<GitStoreState>((set, get) => {
  onGitCommandLog((entry) => {
    set((s) => ({
      commandLogs: [entry, ...s.commandLogs].slice(0, 200),
    }));
  });

  const initialTabs = loadInitialTabs();
  const savedActiveId = localStorage.getItem(SESSION_ACTIVE_TAB_KEY) || '';
  const initialActiveTab =
    initialTabs.find((t) => t.id === savedActiveId) || initialTabs[0];
  const initialActiveId = initialActiveTab?.id || '';

  return {
    tabs: initialTabs,
    savedRepos: loadInitialSavedRepos(),
    activeTabId: initialActiveId,
    isRepoModalOpen: initialTabs.length === 0,

    accounts: loadInitialAccounts(),
    gitIdentity: {
      globalName: '',
      globalEmail: '',
      localName: '',
      localEmail: '',
      effectiveName: '',
      effectiveEmail: '',
    },
    isAccountModalOpen: false,
    isPublishModalOpen: false,

    isGitInitialized: true,
    isLoading: false,
    activeRemoteOp: null,
    runningOpLabel: null,
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

    graphStyle: 'angular',
    selectedBranches: initialActiveTab?.selectedBranches || [],
    searchQuery: initialActiveTab?.searchQuery || '',
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
    confirmDialog: null,

    requestConfirm: (confirmDialog) => set({ confirmDialog }),
    closeConfirm: () => set({ confirmDialog: null }),

    showToast: (message, type = 'info') => {
      set({ toast: { message, type } });
      setTimeout(() => {
        set((s) => (s.toast?.message === message ? { toast: null } : s));
      }, 3800);
    },

    initStore: async () => {
      await get().refreshGitIdentity();
      const { tabs } = get();
      if (tabs.length === 0) {
        set({ isRepoModalOpen: true });
        return;
      }
      await get().refreshActiveRepo();
    },

    setRepoModalOpen: (isRepoModalOpen: boolean) => set({ isRepoModalOpen }),

    setAccountModalOpen: (isAccountModalOpen: boolean) => {
      set({ isAccountModalOpen });
      if (isAccountModalOpen) {
        get().refreshGitIdentity();
      }
    },

    setPublishModalOpen: (isPublishModalOpen: boolean) => {
      set({ isPublishModalOpen });
      if (isPublishModalOpen) {
        get().refreshGitIdentity();
      }
    },

    initLocalRepository: async () => {
      const { tabs, activeTabId } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return false;

      let initRes = await execGit(activeTab.path, ['init', '-b', 'main']);
      if (initRes.exitCode !== 0) {
        initRes = await execGit(activeTab.path, ['init']);
      }
      if (initRes.exitCode === 0) {
        get().showToast(`Initialized Git repository in ${activeTab.name}`, 'success');
        await get().refreshActiveRepo();
        return true;
      }
      get().showToast(
        `Failed to initialize Git repository: ${initRes.stderr || initRes.stdout}`,
        'error'
      );
      return false;
    },

    publishLocalRepository: async (params) => {
      const { tabs, activeTabId, accounts, githubToken } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return false;

      const remoteName = (params.remoteName || 'origin').trim() || 'origin';
      const pushAfterCreate = params.pushAfterCreate ?? true;

      set({
        runningOpLabel: `Publishing ${params.repoName || activeTab.name}`,
        activeRemoteOp: 'push',
      });

      try {
        // 1. Check if folder is initialized as a Git repository; if not, run `git init -b main`
        const insideRes = await execGit(activeTab.path, [
          'rev-parse',
          '--is-inside-work-tree',
        ]);
        if (insideRes.exitCode !== 0) {
          set({ runningOpLabel: 'Initializing local Git repository' });
          const initRes = await execGit(activeTab.path, ['init', '-b', 'main']);
          if (initRes.exitCode !== 0) {
            await execGit(activeTab.path, ['init']);
          }
        }

        // 2. Ensure there is at least one commit if we are going to push
        const headVerify = await execGit(activeTab.path, [
          'rev-parse',
          '--verify',
          'HEAD',
        ]);
        if (headVerify.exitCode !== 0 && pushAfterCreate) {
          set({ runningOpLabel: 'Creating initial commit' });
          await execGit(activeTab.path, ['add', '-A']);
          const commitMsg = params.initialCommitMessage?.trim() || 'Initial commit';
          let commitRes = await execGit(activeTab.path, [
            'commit',
            '-m',
            commitMsg,
          ]);
          if (commitRes.exitCode !== 0) {
            commitRes = await execGit(activeTab.path, [
              'commit',
              '--allow-empty',
              '-m',
              commitMsg,
            ]);
          }
          if (commitRes.exitCode !== 0) {
            get().showToast(
              `Cannot create initial commit: ${commitRes.stderr.trim() || commitRes.stdout.trim()}`,
              'error'
            );
            return false;
          }
        }

        // 3. Resolve target Remote URL (either create on GitHub/GitLab via API or use custom URL)
        let targetRemoteUrl = '';
        const selectedAccount = params.accountId
          ? accounts.find((a) => a.id === params.accountId)
          : accounts.find((a) => Boolean(a.token));

        if (params.mode === 'create-api') {
          const tokenToUse = selectedAccount?.token || githubToken;
          const providerToUse = selectedAccount?.provider || 'github';
          if (!tokenToUse) {
            get().showToast(
              'Please login with a GitHub or GitLab Personal Access Token first',
              'error'
            );
            return false;
          }
          set({
            runningOpLabel: `Creating remote repository on ${providerToUse.toUpperCase()}`,
          });
          const created = await createRemoteRepositoryViaApi({
            provider: providerToUse,
            token: tokenToUse,
            hostUrl: selectedAccount?.hostUrl,
            repoName: params.repoName?.trim() || activeTab.name,
            description: params.description,
            isPrivate: params.isPrivate ?? true,
            protocol: params.protocol || 'https',
          });
          targetRemoteUrl = created.remoteUrl;
        } else {
          targetRemoteUrl = (params.customRemoteUrl || '').trim();
          if (!targetRemoteUrl) {
            get().showToast('Please enter a valid Remote Repository URL', 'error');
            return false;
          }
        }

        // 4. Add or update the Git remote (`origin` by default)
        set({ runningOpLabel: `Configuring remote '${remoteName}'` });
        const existingRemote = await execGit(activeTab.path, [
          'remote',
          'get-url',
          remoteName,
        ]);
        const remoteRes =
          existingRemote.exitCode === 0
            ? await execGit(activeTab.path, [
                'remote',
                'set-url',
                remoteName,
                targetRemoteUrl,
              ])
            : await execGit(activeTab.path, [
                'remote',
                'add',
                remoteName,
                targetRemoteUrl,
              ]);

        if (remoteRes.exitCode !== 0) {
          get().showToast(
            `Failed to configure remote '${remoteName}': ${remoteRes.stderr.trim()}`,
            'error'
          );
          return false;
        }

        // 5. Push current branch to the new remote and set upstream tracking
        if (pushAfterCreate) {
          const branchRes = await execGit(activeTab.path, [
            'symbolic-ref',
            '--short',
            'HEAD',
          ]);
          const branchToPush =
            (branchRes.exitCode === 0 && branchRes.stdout.trim()) ||
            get().currentBranch ||
            'main';

          set({
            runningOpLabel: `Pushing '${branchToPush}' to ${remoteName}`,
          });

          const tokenForPush = selectedAccount?.token || githubToken;
          let pushRes;
          if (
            tokenForPush &&
            targetRemoteUrl.startsWith('https://')
          ) {
            const authUser =
              selectedAccount?.username || 'x-access-token';
            const basicToken = btoa(`${authUser}:${tokenForPush}`);
            pushRes = await execGit(activeTab.path, [
              '-c',
              `http.extraHeader=Authorization: Basic ${basicToken}`,
              'push',
              '-u',
              remoteName,
              branchToPush,
            ]);
          } else {
            pushRes = await execGit(activeTab.path, [
              'push',
              '-u',
              remoteName,
              branchToPush,
            ]);
          }

          if (pushRes.exitCode !== 0) {
            get().showToast(
              `Remote added, but push failed: ${pushRes.stderr.trim() || pushRes.stdout.trim()}`,
              'error'
            );
            await get().refreshActiveRepo();
            return false;
          }
        }

        get().showToast(
          `Published '${params.repoName || activeTab.name}' to ${remoteName} successfully!`,
          'success'
        );
        await get().refreshActiveRepo();
        return true;
      } catch (err: any) {
        get().showToast(
          `Publish failed: ${err?.message || err}`,
          'error'
        );
        return false;
      } finally {
        set({ runningOpLabel: null, activeRemoteOp: null });
      }
    },

    refreshGitIdentity: async () => {
      const { tabs, activeTabId, accounts } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      const identity = await getGitConfigIdentity(activeTab?.path);

      // Auto-import existing Global or Local Git Config identity into accounts list if not already saved
      const nextAccounts = [...accounts];
      let changed = false;

      const ensureIdentityInAccounts = (name: string, email: string) => {
        if (!name || !email) return;
        const exists = nextAccounts.some(
          (a) => a.email.toLowerCase() === email.toLowerCase()
        );
        if (!exists) {
          const isGithubEmail = email.toLowerCase().includes('github.com');
          const isGitlabEmail = email.toLowerCase().includes('gitlab.com');
          nextAccounts.push({
            id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            provider: isGithubEmail
              ? 'github'
              : isGitlabEmail
              ? 'gitlab'
              : 'custom',
            name,
            email,
            username: email.split('@')[0].replace(/^\d+\+/, ''),
            lastUsedAt: Date.now(),
          });
          changed = true;
        }
      };

      ensureIdentityInAccounts(identity.globalName, identity.globalEmail);
      ensureIdentityInAccounts(identity.localName, identity.localEmail);

      if (changed) {
        localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
      }

      // Sync active account token for PR/Issue fetching if available
      const matchedAccount = nextAccounts.find(
        (a) =>
          a.email.toLowerCase() === identity.effectiveEmail.toLowerCase() &&
          a.token
      );
      if (matchedAccount?.token && matchedAccount.token !== get().githubToken) {
        localStorage.setItem('git-control-gh-token', matchedAccount.token);
        set({
          gitIdentity: identity,
          accounts: nextAccounts,
          githubToken: matchedAccount.token,
        });
      } else {
        set({ gitIdentity: identity, accounts: nextAccounts });
      }
    },

    saveGitAccount: async (accountInput, applyScope = 'global') => {
      const now = Date.now();
      const { accounts, tabs, activeTabId } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);

      const existingIdx = accounts.findIndex(
        (a) =>
          (accountInput.id && a.id === accountInput.id) ||
          a.email.toLowerCase() === accountInput.email.trim().toLowerCase()
      );

      const savedAccount: GitAccount = {
        id:
          existingIdx >= 0
            ? accounts[existingIdx].id
            : `acc-${now}-${Math.random().toString(36).slice(2, 6)}`,
        provider: accountInput.provider,
        name: accountInput.name.trim(),
        email: accountInput.email.trim(),
        username:
          accountInput.username.trim() ||
          accountInput.email.trim().split('@')[0],
        hostUrl: accountInput.hostUrl?.trim() || undefined,
        avatarUrl: accountInput.avatarUrl || undefined,
        token: accountInput.token?.trim() || undefined,
        lastUsedAt: now,
      };

      const nextAccounts =
        existingIdx >= 0
          ? accounts.map((a, idx) => (idx === existingIdx ? savedAccount : a))
          : [savedAccount, ...accounts];

      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(nextAccounts));

      if (savedAccount.token) {
        localStorage.setItem('git-control-gh-token', savedAccount.token);
        set({ accounts: nextAccounts, githubToken: savedAccount.token });
      } else {
        set({ accounts: nextAccounts });
      }

      if (applyScope === 'global' || applyScope === 'both') {
        await setGitConfigIdentity(
          'global',
          savedAccount.name,
          savedAccount.email,
          activeTab?.path
        );
      }
      if ((applyScope === 'local' || applyScope === 'both') && activeTab?.path) {
        await setGitConfigIdentity(
          'local',
          savedAccount.name,
          savedAccount.email,
          activeTab.path
        );
      }

      await get().refreshGitIdentity();
      get().showToast(
        `Saved account '${savedAccount.name} <${savedAccount.email}>'`,
        'success'
      );
    },

    applyAccountToGitConfig: async (accountId, scope) => {
      const { accounts, tabs, activeTabId } = get();
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;
      const activeTab = tabs.find((t) => t.id === activeTabId);

      if (scope === 'local' && !activeTab?.path) {
        get().showToast('Open a repository tab first to set local config', 'error');
        return;
      }

      const ok = await setGitConfigIdentity(
        scope,
        account.name,
        account.email,
        activeTab?.path
      );

      if (ok) {
        const now = Date.now();
        const updatedAccounts = accounts.map((a) =>
          a.id === account.id ? { ...a, lastUsedAt: now } : a
        );
        localStorage.setItem(
          SAVED_ACCOUNTS_KEY,
          JSON.stringify(updatedAccounts)
        );
        if (account.token) {
          localStorage.setItem('git-control-gh-token', account.token);
          set({ accounts: updatedAccounts, githubToken: account.token });
        } else {
          set({ accounts: updatedAccounts });
        }
        await get().refreshGitIdentity();
        get().showToast(
          `Switched ${scope === 'global' ? 'Global' : `Repo (${activeTab?.name})`} Git account to ${account.name} <${account.email}>`,
          'success'
        );
        if (get().remoteInfo) {
          get().loadRemotePRsAndIssues();
        }
      } else {
        get().showToast(`Failed to update ${scope} Git config`, 'error');
      }
    },

    clearRepoLocalIdentity: async () => {
      const { tabs, activeTabId } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab?.path) return;
      await clearLocalGitConfigIdentity(activeTab.path);
      await get().refreshGitIdentity();
      get().showToast(
        `Cleared local Git identity for ${activeTab.name} (now using Global config)`,
        'info'
      );
    },

    removeGitAccount: (accountId) => {
      const updated = get().accounts.filter((a) => a.id !== accountId);
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
      set({ accounts: updated });
      get().showToast('Removed Git account from saved list', 'info');
    },

    openRepoTab: async (rawPath: string) => {
      const cleanPath = rawPath.trim();
      if (!cleanPath) return;

      const now = Date.now();
      const name = cleanPath.split(/[\\/]/).filter(Boolean).pop() || cleanPath;

      const existingSaved = get().savedRepos.filter(
        (r) => r.path.toLowerCase() !== cleanPath.toLowerCase()
      );
      const updatedSaved = [
        { name, path: cleanPath, lastOpened: now },
        ...existingSaved,
      ];
      localStorage.setItem(SAVED_REPOS_KEY, JSON.stringify(updatedSaved));

      const existingTab = get().tabs.find(
        (t) => t.path.toLowerCase() === cleanPath.toLowerCase()
      );
      if (existingTab) {
        set({ savedRepos: updatedSaved, isRepoModalOpen: false });
        await get().setActiveTab(existingTab.id);
        return;
      }

      const newTab: RepoTab = {
        id: `tab-${now}`,
        name,
        path: cleanPath,
        currentBranch: '...',
        uncommittedCount: 0,
        conflictCount: 0,
        selectedBranches: [],
        searchQuery: '',
      };

      const nextTabs = [...get().tabs, newTab];
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(nextTabs));
      localStorage.setItem(SESSION_ACTIVE_TAB_KEY, newTab.id);

      set({
        tabs: nextTabs,
        savedRepos: updatedSaved,
        activeTabId: newTab.id,
        isRepoModalOpen: false,
        selectedBranches: [],
        searchQuery: '',
        selectedCommitHash: null,
        compareCommitHash: null,
        activeDiffRequest: null,
        activeDiffData: null,
      });

      await get().refreshActiveRepo();
    },

    closeRepoTab: (tabId: string) => {
      const { tabs, activeTabId } = get();
      const filtered = tabs.filter((t) => t.id !== tabId);
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(filtered));

      if (filtered.length === 0) {
        localStorage.setItem(SESSION_ACTIVE_TAB_KEY, '');
        set({
          tabs: [],
          activeTabId: '',
          commits: [],
          refs: [],
          workingFiles: [],
          selectedBranches: [],
          searchQuery: '',
          selectedCommitHash: null,
          compareCommitHash: null,
          isRepoModalOpen: true,
        });
        return;
      }

      const nextActiveTab =
        activeTabId === tabId
          ? filtered[filtered.length - 1]
          : filtered.find((t) => t.id === activeTabId) || filtered[0];
      const nextActive = nextActiveTab.id;
      localStorage.setItem(SESSION_ACTIVE_TAB_KEY, nextActive);
      set({
        tabs: filtered,
        activeTabId: nextActive,
        ...(activeTabId === tabId
          ? {
              selectedBranches: nextActiveTab.selectedBranches || [],
              searchQuery: nextActiveTab.searchQuery || '',
              selectedCommitHash: null,
              compareCommitHash: null,
              activeDiffRequest: null,
              activeDiffData: null,
            }
          : {}),
      });
      if (activeTabId === tabId) {
        get().refreshActiveRepo();
      }
    },

    setActiveTab: async (tabId: string) => {
      const targetTab = get().tabs.find((t) => t.id === tabId);
      if (targetTab) {
        const now = Date.now();
        const updatedSaved = get()
          .savedRepos.map((r) =>
            r.path.toLowerCase() === targetTab.path.toLowerCase()
              ? { ...r, lastOpened: now }
              : r
          )
          .sort((a, b) => b.lastOpened - a.lastOpened);
        localStorage.setItem(SAVED_REPOS_KEY, JSON.stringify(updatedSaved));
        set({ savedRepos: updatedSaved });
      }

      localStorage.setItem(SESSION_ACTIVE_TAB_KEY, tabId);
      set({
        activeTabId: tabId,
        selectedBranches: targetTab?.selectedBranches || [],
        searchQuery: targetTab?.searchQuery || '',
        selectedCommitHash: null,
        compareCommitHash: null,
        activeDiffRequest: null,
        activeDiffData: null,
      });
      await get().refreshActiveRepo();
    },

    removeSavedRepo: (targetPath: string) => {
      const updated = get().savedRepos.filter(
        (r) => r.path.toLowerCase() !== targetPath.toLowerCase()
      );
      localStorage.setItem(SAVED_REPOS_KEY, JSON.stringify(updated));
      set({ savedRepos: updated });
      get().showToast('Removed repository from bookmarks', 'info');
    },

    cloneRepository: async (
      repoUrl: string,
      parentDir: string,
      folderName?: string
    ) => {
      const urlClean = repoUrl.trim();
      const parentClean = parentDir.trim().replace(/[\\/]+$/, '');
      if (!urlClean || !parentClean) return false;

      const inferredName =
        folderName?.trim() ||
        urlClean
          .split('/')
          .pop()
          ?.replace(/\.git$/i, '') ||
        'cloned-repo';

      const sep = parentClean.includes('\\') ? '\\' : '/';
      const targetPath = `${parentClean}${sep}${inferredName}`;

      set({
        runningOpLabel: `Cloning ${inferredName}`,
        activeRemoteOp: 'fetch',
      });

      try {
        const res = await execGit(parentClean, ['clone', urlClean, targetPath]);
        if (res.exitCode === 0) {
          get().showToast(`Cloned ${inferredName} successfully`, 'success');
          await get().openRepoTab(targetPath);
          return true;
        } else {
          get().showToast(
            `Clone failed: ${res.stderr.trim() || res.stdout.trim()}`,
            'error'
          );
          return false;
        }
      } finally {
        set({ runningOpLabel: null, activeRemoteOp: null });
      }
    },

    refreshActiveRepo: async () => {
      const { tabs, activeTabId, selectedBranches, commitOrdering, firstParentOnly } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      set({ isLoading: true });
      try {
        const state = await loadRepositoryState(activeTab.path, {
          selectedBranches,
          CommitOrdering: commitOrdering,
          firstParentOnly,
        });

        const validRefSet = new Set(state.refs.map((r) => r.name));
        const sanitizedSelectedBranches = get().selectedBranches.filter((b) =>
          validRefSet.has(b)
        );

        const conflictCount = state.workingFiles.filter((f) => f.conflicted).length;
        const updatedTabs = get().tabs.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                currentBranch: state.currentBranch,
                uncommittedCount: state.workingFiles.length,
                conflictCount,
                selectedBranches: sanitizedSelectedBranches,
              }
            : t
        );
        localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));

        let selectedHash = get().selectedCommitHash;
        if (!selectedHash && state.commits.length > 0) {
          selectedHash = state.commits[0].hash;
        }

        set({
          tabs: updatedTabs,
          selectedBranches: sanitizedSelectedBranches,
          isGitInitialized: state.isGitInitialized,
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
        get().refreshGitIdentity();
        if (state.remoteInfo) {
          get().loadRemotePRsAndIssues();
        }
      } catch (err: any) {
        set({ isLoading: false });
        get().showToast(`Failed to load repository: ${err?.message || err}`, 'error');
      }
    },

    setGraphStyle: (graphStyle) => set({ graphStyle }),

    toggleBranchSelection: async (branch: string) => {
      const { selectedBranches, tabs, activeTabId } = get();
      const exists = selectedBranches.includes(branch);
      const next = exists
        ? selectedBranches.filter((b) => b !== branch)
        : [...selectedBranches, branch];
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, selectedBranches: next } : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ selectedBranches: next, tabs: updatedTabs });
      await get().refreshActiveRepo();
    },

    clearBranchSelection: async () => {
      const { tabs, activeTabId } = get();
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, selectedBranches: [] } : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ selectedBranches: [], tabs: updatedTabs });
      await get().refreshActiveRepo();
    },

    setSearchQuery: (searchQuery) => {
      const { tabs, activeTabId } = get();
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, searchQuery } : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ searchQuery, tabs: updatedTabs });
    },

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

      const sub = args[0]?.toLowerCase();
      const remoteOp: GitStoreState['activeRemoteOp'] =
        sub === 'fetch'
          ? 'fetch'
          : sub === 'pull'
          ? 'pull'
          : sub === 'push'
          ? 'push'
          : sub === 'submodule'
          ? 'submodule'
          : null;

      set({
        runningOpLabel: label,
        ...(remoteOp ? { activeRemoteOp: remoteOp } : {}),
      });

      try {
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
      } finally {
        set({ runningOpLabel: null, activeRemoteOp: null });
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
      get().requestConfirm({
        title: isUntracked
          ? `Delete Untracked File '${filePath}'?`
          : `Discard Changes in '${filePath}'?`,
        description: isUntracked
          ? `This will permanently delete the untracked file '${filePath}' from your working directory. This action cannot be undone.`
          : `All uncommitted modifications in '${filePath}' will be permanently lost and reverted to HEAD.`,
        confirmLabel: isUntracked ? 'Delete File' : 'Discard Changes',
        variant: 'danger',
        commandPreview: isUntracked
          ? `git clean -f -- "${filePath}"`
          : `git checkout -- "${filePath}"`,
        onConfirm: async () => {
          if (isUntracked) {
            await get().runGitOp(`Removed untracked ${filePath}`, [
              'clean',
              '-f',
              '--',
              filePath,
            ]);
          } else {
            await get().runGitOp(`Discarded changes in ${filePath}`, [
              'checkout',
              '--',
              filePath,
            ]);
          }
        },
      });
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
      set((s) => ({
        activeRemoteOp: s.activeRemoteOp || 'pr-sync',
      }));
      try {
        const { pullRequests, issues } = await fetchRemotePullRequestsAndIssues(
          remoteInfo,
          githubToken
        );
        set({ pullRequests, issues });
      } catch {
        // Ignore network errors silently
      } finally {
        set((s) => ({
          activeRemoteOp: s.activeRemoteOp === 'pr-sync' ? null : s.activeRemoteOp,
        }));
      }
    },
  };
});
