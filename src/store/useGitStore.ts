import { create } from 'zustand';
import {
  ActiveWorkflowRun,
  CommandLogEntry,
  CommitFileChange,
  FileDiffData,
  GitAccount,
  GitCommit,
  GitConfigIdentity,
  GitRef,
  GitSubmodule,
  GitWorkflow,
  GitWorkflowStep,
  GitWorktree,
  GraphStyle,
  IdeConfig,
  RemoteHostInfo,
  RemoteIssue,
  RemotePullRequest,
  RepoTab,
  WorkflowStepResult,
  WorkingFileChange,
} from '../types/git';
import {
  clearLocalGitConfigIdentity,
  createRemotePullRequest,
  createRemoteRepositoryViaApi,
  deleteSecureToken,
  detectInstalledIdes,
  execGit,
  fetchRemotePullRequestsAndIssues,
  getCommitChangedFiles,
  getCompareCommitsFiles,
  getFileDiff,
  getGitConfigIdentity,
  getSecureToken,
  loadRepositoryState,
  onGitCommandLog,
  openInExternalEditor,
  RemoteApiError,
  resolveGitCredentialToken,
  saveSecureToken,
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

  // Git Account Management & IDE Integration
  accounts: GitAccount[];
  gitIdentity: GitConfigIdentity;
  isAccountModalOpen: boolean;
  isPublishModalOpen: boolean;
  isCreatePRModalOpen: boolean;
  isWorkflowModalOpen: boolean;
  workflows: GitWorkflow[];
  activeWorkflowRun: ActiveWorkflowRun | null;
  isIdeModalOpen: boolean;
  ideModalInitialFilter: 'all' | 'ide' | 'ai-harness';
  detectedIdes: IdeConfig[];
  customIdes: IdeConfig[];
  customIdePaths: Record<string, string>;
  defaultIdeId: string;
  defaultAiHarnessId: string;

  // Current repo data
  isGitInitialized: boolean;
  isLoading: boolean;
  activeRemoteOp: 'fetch' | 'pull' | 'push' | 'submodule' | 'pr-sync' | null;
  runningOpLabel: string | null;
  currentBranch: string;
  headHash: string;
  isHeadDetached: boolean;
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
  dateSince: string;
  dateUntil: string;
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
  setCreatePRModalOpen: (open: boolean) => void;
  setWorkflowModalOpen: (open: boolean) => void;
  saveWorkflow: (
    workflow: Omit<GitWorkflow, 'id' | 'createdAt'> & { id?: string }
  ) => void;
  deleteWorkflow: (workflowId: string) => void;
  clearWorkflowRun: () => void;
  runWorkflow: (workflowId: string) => Promise<boolean>;
  createPullRequest: (params: {
    title: string;
    body?: string;
    headBranch: string;
    baseBranch: string;
    draft?: boolean;
    pushBranchFirst?: boolean;
  }) => Promise<RemotePullRequest | null>;
  setIdeModalOpen: (
    open: boolean,
    initialFilter?: 'all' | 'ide' | 'ai-harness'
  ) => void;
  refreshDetectedIdes: () => Promise<void>;
  setRepoPreferredIde: (ideId: string, scope: 'repo' | 'global') => void;
  setRepoPreferredAiHarness: (
    harnessId: string,
    scope: 'repo' | 'global'
  ) => void;
  updateIdeExecutablePath: (ideId: string, executablePath: string) => void;
  saveCustomIde: (
    ide: {
      id?: string;
      name: string;
      executablePath: string;
      category?: 'ide' | 'ai-harness';
      launchMode?: 'gui' | 'terminal-cli';
    },
    setForCurrentRepo?: boolean
  ) => void;
  removeCustomIde: (ideId: string) => void;
  openActiveRepoInIde: (filePath?: string, overrideIdeId?: string) => Promise<void>;
  openActiveRepoInAiHarness: (overrideHarnessId?: string) => Promise<void>;
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
  hydrateSecureTokens: () => Promise<void>;
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
  selectBranchOnly: (branch: string) => Promise<void>;
  clearBranchSelection: () => Promise<void>;
  setSearchQuery: (q: string) => void;
  setDateRange: (since: string, until: string) => Promise<void>;
  clearDateRange: () => Promise<void>;
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
  loadRemotePRsAndIssues: (opts?: { manual?: boolean }) => Promise<void>;
}

const SESSION_TABS_KEY = 'git-control-session-tabs';
const SESSION_ACTIVE_TAB_KEY = 'git-control-session-active-tab';
const SAVED_REPOS_KEY = 'git-control-saved-repos-v2';
const SAVED_ACCOUNTS_KEY = 'git-control-accounts-v1';
const DEFAULT_IDE_KEY = 'git-control-default-ide-v1';
const DEFAULT_AI_HARNESS_KEY = 'git-control-default-ai-harness-v1';
const CUSTOM_IDES_KEY = 'git-control-custom-ides-v1';
const CUSTOM_IDE_PATHS_KEY = 'git-control-ide-paths-v1';
const SAVED_WORKFLOWS_KEY = 'git-control-workflows-v1';

const DEFAULT_WORKFLOWS: GitWorkflow[] = [
  {
    id: 'wf-sync-main-force-push',
    name: 'Sync Main & Force Push',
    description:
      'Prune remote refs, pull latest changes from origin/main, and force-push current branch.',
    scope: 'global',
    confirmBeforeRun: true,
    createdAt: 1700000000000,
    steps: [
      { id: 'step-1', command: 'git fetch -p' },
      { id: 'step-2', command: 'git pull origin main' },
      { id: 'step-3', command: 'git push -f' },
    ],
  },
  {
    id: 'wf-rebase-main-safe-force',
    name: 'Rebase onto Main & Push (--force-with-lease)',
    description:
      'Fetch pruned refs, rebase current branch onto origin/main, and push safely with --force-with-lease.',
    scope: 'global',
    confirmBeforeRun: true,
    createdAt: 1700000001000,
    steps: [
      { id: 'step-1', command: 'git fetch --all --prune' },
      { id: 'step-2', command: 'git pull --rebase origin main' },
      { id: 'step-3', command: 'git push --force-with-lease origin ${branch}' },
    ],
  },
  {
    id: 'wf-fetch-prune-pull',
    name: 'Fetch Prune & Fast-Forward Pull',
    description:
      'Clean up deleted remote branches and fast-forward pull the current branch.',
    scope: 'global',
    confirmBeforeRun: false,
    createdAt: 1700000002000,
    steps: [
      { id: 'step-1', command: 'git fetch -p' },
      { id: 'step-2', command: 'git pull --ff-only' },
    ],
  },
];

function loadInitialWorkflows(): GitWorkflow[] {
  try {
    const raw = localStorage.getItem(SAVED_WORKFLOWS_KEY);
    if (!raw) return DEFAULT_WORKFLOWS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_WORKFLOWS;
  } catch {
    return DEFAULT_WORKFLOWS;
  }
}

export function parseGitCommandArgs(
  rawCommand: string,
  currentBranch: string
): string[] {
  const expanded = rawCommand
    .trim()
    .replace(/\$\{branch\}|\{branch\}/gi, currentBranch || 'main');
  const tokens: string[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;

  for (let i = 0; i < expanded.length; i++) {
    const ch = expanded[i];
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }

  if (tokens.length > 0 && tokens[0].toLowerCase() === 'git') {
    tokens.shift();
  }
  return tokens;
}

// Last PR/Issue auth error shown, so background auto-refreshes do not spam the same toast
let lastPrAuthErrorKey = '';

function loadInitialCustomIdes(): IdeConfig[] {
  try {
    const raw = localStorage.getItem(CUSTOM_IDES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadInitialIdePaths(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_IDE_PATHS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

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

function saveAccountsToStorage(accounts: GitAccount[]) {
  // Strip tokens before saving to localStorage to ensure zero plaintext secrets on disk
  const sanitized = accounts.map(({ token, ...rest }) => rest);
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(sanitized));
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
    isCreatePRModalOpen: false,
    isWorkflowModalOpen: false,
    workflows: loadInitialWorkflows(),
    activeWorkflowRun: null,
    isIdeModalOpen: false,
    ideModalInitialFilter: 'all',
    detectedIdes: [],
    customIdes: loadInitialCustomIdes(),
    customIdePaths: loadInitialIdePaths(),
    defaultIdeId: localStorage.getItem(DEFAULT_IDE_KEY) || 'vscode',
    defaultAiHarnessId:
      localStorage.getItem(DEFAULT_AI_HARNESS_KEY) || 'antigravity',

    isGitInitialized: true,
    isLoading: false,
    activeRemoteOp: null,
    runningOpLabel: null,
    currentBranch: 'main',
    headHash: '',
    isHeadDetached: false,
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
    dateSince: initialActiveTab?.dateSince || '',
    dateUntil: initialActiveTab?.dateUntil || '',
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
      get().refreshDetectedIdes();
      await get().hydrateSecureTokens();
      await get().refreshGitIdentity();
      const { tabs } = get();
      if (tabs.length === 0) {
        set({ isRepoModalOpen: true });
        return;
      }
      await get().refreshActiveRepo();
    },

    setRepoModalOpen: (isRepoModalOpen: boolean) => set({ isRepoModalOpen }),

    setIdeModalOpen: (isIdeModalOpen: boolean, initialFilter = 'all') => {
      set({ isIdeModalOpen, ideModalInitialFilter: initialFilter });
      if (isIdeModalOpen) {
        get().refreshDetectedIdes();
      }
    },

    refreshDetectedIdes: async () => {
      try {
        const list = await detectInstalledIdes();
        set({ detectedIdes: list });
      } catch {
        // Ignore detection errors
      }
    },

    setRepoPreferredIde: (ideId: string, scope: 'repo' | 'global') => {
      const { tabs, activeTabId, detectedIdes, customIdes } = get();
      const allIdes = [...detectedIdes, ...customIdes];
      const ideLabel = allIdes.find((i) => i.id === ideId)?.name || ideId;

      if (scope === 'global') {
        localStorage.setItem(DEFAULT_IDE_KEY, ideId);
        set({ defaultIdeId: ideId });
        get().showToast(`Set '${ideLabel}' as Global Default IDE`, 'success');
        return;
      }

      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, preferredIdeId: ideId || undefined }
          : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ tabs: updatedTabs });
      const activeTab = tabs.find((t) => t.id === activeTabId);
      get().showToast(
        ideId
          ? `Set '${ideLabel}' as integrated IDE for '${activeTab?.name || 'repository'}'`
          : `Reset '${activeTab?.name || 'repository'}' to use Global Default IDE`,
        'success'
      );
    },

    setRepoPreferredAiHarness: (
      harnessId: string,
      scope: 'repo' | 'global'
    ) => {
      const { tabs, activeTabId, detectedIdes, customIdes } = get();
      const allIdes = [...detectedIdes, ...customIdes];
      const harnessLabel =
        allIdes.find((i) => i.id === harnessId)?.name || harnessId;

      if (scope === 'global') {
        localStorage.setItem(DEFAULT_AI_HARNESS_KEY, harnessId);
        set({ defaultAiHarnessId: harnessId });
        get().showToast(
          `Set '${harnessLabel}' as Global Default AI Harness`,
          'success'
        );
        return;
      }

      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, preferredAiHarnessId: harnessId || undefined }
          : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ tabs: updatedTabs });
      const activeTab = tabs.find((t) => t.id === activeTabId);
      get().showToast(
        harnessId
          ? `Set '${harnessLabel}' as integrated AI Harness for '${activeTab?.name || 'repository'}'`
          : `Reset '${activeTab?.name || 'repository'}' to use Global Default AI Harness`,
        'success'
      );
    },

    updateIdeExecutablePath: (ideId: string, executablePath: string) => {
      const nextPaths = {
        ...get().customIdePaths,
        [ideId]: executablePath.trim(),
      };
      if (!executablePath.trim()) {
        delete nextPaths[ideId];
      }
      localStorage.setItem(CUSTOM_IDE_PATHS_KEY, JSON.stringify(nextPaths));
      set({ customIdePaths: nextPaths });
      get().showToast('Updated executable path', 'success');
    },

    saveCustomIde: (ideInput, setForCurrentRepo = true) => {
      const { customIdes, tabs, activeTabId } = get();
      const id =
        ideInput.id ||
        `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const category = ideInput.category || 'ide';
      const launchMode = ideInput.launchMode || 'gui';
      const entry: IdeConfig = {
        id,
        name: ideInput.name.trim(),
        category,
        launchMode,
        command: ideInput.executablePath.trim(),
        executablePath: ideInput.executablePath.trim(),
        installed: true,
        isCustom: true,
      };
      const existsIdx = customIdes.findIndex((c) => c.id === id);
      const nextCustom =
        existsIdx >= 0
          ? customIdes.map((c, idx) => (idx === existsIdx ? entry : c))
          : [...customIdes, entry];
      localStorage.setItem(CUSTOM_IDES_KEY, JSON.stringify(nextCustom));

      if (setForCurrentRepo && activeTabId) {
        const updatedTabs = tabs.map((t) =>
          t.id === activeTabId
            ? category === 'ai-harness'
              ? { ...t, preferredAiHarnessId: id }
              : { ...t, preferredIdeId: id }
            : t
        );
        localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
        set({ customIdes: nextCustom, tabs: updatedTabs });
      } else {
        set({ customIdes: nextCustom });
      }
      get().showToast(`Saved custom ${category === 'ai-harness' ? 'AI Harness' : 'IDE'} '${entry.name}'`, 'success');
    },

    removeCustomIde: (ideId: string) => {
      const { customIdes, tabs, defaultIdeId, defaultAiHarnessId } = get();
      const nextCustom = customIdes.filter((c) => c.id !== ideId);
      localStorage.setItem(CUSTOM_IDES_KEY, JSON.stringify(nextCustom));

      const updatedTabs = tabs.map((t) => ({
        ...t,
        preferredIdeId:
          t.preferredIdeId === ideId ? undefined : t.preferredIdeId,
        preferredAiHarnessId:
          t.preferredAiHarnessId === ideId ? undefined : t.preferredAiHarnessId,
      }));
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));

      const nextDefault = defaultIdeId === ideId ? 'vscode' : defaultIdeId;
      const nextDefaultAi =
        defaultAiHarnessId === ideId ? 'antigravity' : defaultAiHarnessId;
      localStorage.setItem(DEFAULT_IDE_KEY, nextDefault);
      localStorage.setItem(DEFAULT_AI_HARNESS_KEY, nextDefaultAi);

      set({
        customIdes: nextCustom,
        tabs: updatedTabs,
        defaultIdeId: nextDefault,
        defaultAiHarnessId: nextDefaultAi,
      });
      get().showToast('Removed custom integration', 'info');
    },

    openActiveRepoInIde: async (filePath?: string, overrideIdeId?: string) => {
      const {
        tabs,
        activeTabId,
        defaultIdeId,
        detectedIdes,
        customIdes,
        customIdePaths,
      } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      const targetIdeId =
        overrideIdeId || activeTab.preferredIdeId || defaultIdeId || 'vscode';
      const allIdes = [...detectedIdes, ...customIdes];
      const ideObj = allIdes.find((i) => i.id === targetIdeId);
      const customExec =
        customIdePaths[targetIdeId] ||
        (ideObj?.isCustom ? ideObj.executablePath : ideObj?.executablePath || undefined);

      try {
        await openInExternalEditor(
          activeTab.path,
          filePath,
          targetIdeId,
          customExec,
          ideObj?.launchMode
        );
        get().showToast(
          `Opened ${filePath || activeTab.name} in ${ideObj?.name || targetIdeId}`,
          'info'
        );
      } catch (err: any) {
        get().showToast(
          `Failed to open ${ideObj?.name || targetIdeId}: ${
            err?.message || err
          }. Click the dropdown arrow to configure its path.`,
          'error'
        );
      }
    },

    openActiveRepoInAiHarness: async (overrideHarnessId?: string) => {
      const {
        tabs,
        activeTabId,
        defaultAiHarnessId,
        detectedIdes,
        customIdes,
        customIdePaths,
      } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      const targetId =
        overrideHarnessId ||
        activeTab.preferredAiHarnessId ||
        defaultAiHarnessId ||
        'antigravity';
      const allIdes = [...detectedIdes, ...customIdes];
      const harnessObj = allIdes.find((i) => i.id === targetId);
      const customExec =
        customIdePaths[targetId] ||
        (harnessObj?.isCustom
          ? harnessObj.executablePath
          : harnessObj?.executablePath || undefined);

      try {
        await openInExternalEditor(
          activeTab.path,
          undefined,
          targetId,
          customExec,
          harnessObj?.launchMode
        );
        get().showToast(
          `Launched ${harnessObj?.name || targetId} for '${activeTab.name}'`,
          'info'
        );
      } catch (err: any) {
        get().showToast(
          `Failed to launch AI Harness (${harnessObj?.name || targetId}): ${
            err?.message || err
          }. Click the AI Harness dropdown arrow to configure its command/path.`,
          'error'
        );
      }
    },

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

    setCreatePRModalOpen: (isCreatePRModalOpen: boolean) => {
      set({ isCreatePRModalOpen });
    },

    setWorkflowModalOpen: (isWorkflowModalOpen: boolean) => {
      set({ isWorkflowModalOpen });
    },

    saveWorkflow: (workflowInput) => {
      const { workflows, tabs, activeTabId } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      const now = Date.now();
      const id =
        workflowInput.id ||
        `wf-${now}-${Math.random().toString(36).slice(2, 6)}`;

      const cleanedSteps: GitWorkflowStep[] = workflowInput.steps
        .map((s, idx) => ({
          id: s.id || `step-${idx + 1}-${now}`,
          command: s.command.trim(),
          continueOnError: Boolean(s.continueOnError),
        }))
        .filter((s) => s.command.length > 0);

      if (!workflowInput.name.trim() || cleanedSteps.length === 0) {
        get().showToast(
          'Workflow requires a name and at least one command step',
          'error'
        );
        return;
      }

      const entry: GitWorkflow = {
        id,
        name: workflowInput.name.trim(),
        description: workflowInput.description?.trim() || undefined,
        scope: workflowInput.scope,
        repoPath:
          workflowInput.scope === 'repo'
            ? workflowInput.repoPath || activeTab?.path
            : undefined,
        steps: cleanedSteps,
        confirmBeforeRun: Boolean(workflowInput.confirmBeforeRun),
        createdAt: now,
      };

      const existsIdx = workflows.findIndex((w) => w.id === id);
      const nextWorkflows =
        existsIdx >= 0
          ? workflows.map((w, idx) => (idx === existsIdx ? entry : w))
          : [entry, ...workflows];

      localStorage.setItem(SAVED_WORKFLOWS_KEY, JSON.stringify(nextWorkflows));
      set({ workflows: nextWorkflows });
      get().showToast(`Saved workflow '${entry.name}'`, 'success');
    },

    deleteWorkflow: (workflowId: string) => {
      const { workflows } = get();
      const target = workflows.find((w) => w.id === workflowId);
      const next = workflows.filter((w) => w.id !== workflowId);
      localStorage.setItem(SAVED_WORKFLOWS_KEY, JSON.stringify(next));
      set({ workflows: next });
      get().showToast(
        `Deleted workflow '${target?.name || workflowId}'`,
        'info'
      );
    },

    clearWorkflowRun: () => {
      set({ activeWorkflowRun: null });
    },

    runWorkflow: async (workflowId: string) => {
      const {
        workflows,
        tabs,
        activeTabId,
        currentBranch,
        accounts,
        remoteInfo,
        gitIdentity,
      } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      const wf = workflows.find((w) => w.id === workflowId);
      if (!activeTab || !wf) return false;

      const initialResults: WorkflowStepResult[] = wf.steps.map((s) => ({
        stepId: s.id,
        command: s.command.replace(
          /\$\{branch\}|\{branch\}/gi,
          currentBranch || 'main'
        ),
        status: 'pending',
        stdout: '',
        stderr: '',
        durationMs: 0,
        exitCode: null,
      }));

      set({
        activeWorkflowRun: {
          workflowId: wf.id,
          workflowName: wf.name,
          isRunning: true,
          currentStepIndex: 0,
          stepResults: initialResults,
        },
        runningOpLabel: `Running workflow '${wf.name}' (1/${wf.steps.length})`,
      });

      const effectiveEmail = gitIdentity.effectiveEmail?.toLowerCase().trim();
      const repoOwner = remoteInfo?.owner?.toLowerCase().trim();

      const matchedAccount =
        (effectiveEmail
          ? accounts.find(
              (a) =>
                a.token &&
                a.email.toLowerCase().trim() === effectiveEmail
            )
          : null) ||
        (repoOwner
          ? accounts.find(
              (a) =>
                a.token &&
                a.username.toLowerCase().trim() === repoOwner
            )
          : null);

      let allSucceeded = true;

      try {
        for (let idx = 0; idx < wf.steps.length; idx++) {
          const step = wf.steps[idx];
          const parsedArgs = parseGitCommandArgs(step.command, currentBranch);
          if (parsedArgs.length === 0) continue;

          const sub = parsedArgs[0]?.toLowerCase();
          const isRemoteStep =
            sub === 'fetch' || sub === 'pull' || sub === 'push';

          let finalArgs = parsedArgs;
          if (isRemoteStep && matchedAccount?.token) {
            const authUser = matchedAccount.username || 'x-access-token';
            const basicToken = btoa(`${authUser}:${matchedAccount.token}`);
            finalArgs = [
              '-c',
              'credential.helper=',
              '-c',
              `http.extraHeader=Authorization: Basic ${basicToken}`,
              ...parsedArgs,
            ];
          }

          set((s) => {
            if (!s.activeWorkflowRun) return {};
            const updatedResults = s.activeWorkflowRun.stepResults.map(
              (r, rIdx) => (rIdx === idx ? { ...r, status: 'running' as const } : r)
            );
            return {
              runningOpLabel: `Workflow '${wf.name}' (${idx + 1}/${
                wf.steps.length
              }): git ${parsedArgs.join(' ')}`,
              activeRemoteOp:
                sub === 'fetch'
                  ? 'fetch'
                  : sub === 'pull'
                  ? 'pull'
                  : sub === 'push'
                  ? 'push'
                  : null,
              activeWorkflowRun: {
                ...s.activeWorkflowRun,
                currentStepIndex: idx,
                stepResults: updatedResults,
              },
            };
          });

          const res = await execGit(activeTab.path, finalArgs);
          const stepOk = res.exitCode === 0;

          set((s) => {
            if (!s.activeWorkflowRun) return {};
            const updatedResults = s.activeWorkflowRun.stepResults.map(
              (r, rIdx) => {
                if (rIdx === idx) {
                  return {
                    ...r,
                    status: stepOk ? ('success' as const) : ('error' as const),
                    stdout: res.stdout,
                    stderr: res.stderr,
                    durationMs: res.durationMs,
                    exitCode: res.exitCode,
                  };
                }
                if (!stepOk && !step.continueOnError && rIdx > idx) {
                  return { ...r, status: 'skipped' as const };
                }
                return r;
              }
            );
            return {
              activeWorkflowRun: {
                ...s.activeWorkflowRun,
                stepResults: updatedResults,
              },
            };
          });

          if (!stepOk) {
            allSucceeded = false;
            if (!step.continueOnError) {
              get().showToast(
                `Workflow '${wf.name}' stopped at step ${idx + 1} (${
                  step.command
                }): ${res.stderr.trim() || res.stdout.trim()}`,
                'error'
              );
              break;
            }
          }
        }

        if (allSucceeded) {
          get().showToast(
            `Workflow '${wf.name}' completed all ${wf.steps.length} steps!`,
            'success'
          );
        }
        await get().refreshActiveRepo();
        return allSucceeded;
      } finally {
        set((s) => ({
          runningOpLabel: null,
          activeRemoteOp: null,
          activeWorkflowRun: s.activeWorkflowRun
            ? { ...s.activeWorkflowRun, isRunning: false }
            : null,
        }));
      }
    },

    createPullRequest: async (params) => {
      const {
        tabs,
        activeTabId,
        remoteInfo,
        accounts,
        gitIdentity,
        githubToken,
      } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab || !remoteInfo) {
        get().showToast(
          'No GitHub or GitLab remote configured for this repository',
          'error'
        );
        return null;
      }

      set({
        runningOpLabel: `Creating Pull Request (${params.headBranch} → ${params.baseBranch})`,
        activeRemoteOp: 'pr-sync',
      });

      try {
        const effectiveEmail = gitIdentity.effectiveEmail?.toLowerCase().trim();
        const repoOwner = remoteInfo?.owner?.toLowerCase().trim();

        const matchedAccount =
          (effectiveEmail
            ? accounts.find(
                (a) =>
                  a.token &&
                  a.email.toLowerCase().trim() === effectiveEmail
              )
            : null) ||
          (repoOwner
            ? accounts.find(
                (a) =>
                  a.token &&
                  a.username.toLowerCase().trim() === repoOwner
              )
            : null);

        let tokenToUse = matchedAccount?.token || githubToken;
        if (!tokenToUse) {
          const host =
            remoteInfo.provider === 'gitlab' ? 'gitlab.com' : 'github.com';
          const sysToken = await resolveGitCredentialToken(
            activeTab.path,
            host
          );
          if (sysToken) {
            tokenToUse = sysToken;
            set({ githubToken: sysToken });
          }
        }

        if (!tokenToUse) {
          get().showToast(
            'Authentication token required. Please login via Git Account Manager or GitHub CLI.',
            'error'
          );
          return null;
        }

        // Push headBranch to origin first if requested
        if (params.pushBranchFirst) {
          set({
            runningOpLabel: `Pushing branch '${params.headBranch}' to origin`,
          });
          const pushArgs = ['push', '-u', 'origin', params.headBranch];
          let pushRes;
          if (matchedAccount?.token) {
            const authUser = matchedAccount.username || 'x-access-token';
            const basicToken = btoa(`${authUser}:${matchedAccount.token}`);
            pushRes = await execGit(activeTab.path, [
              '-c',
              'credential.helper=',
              '-c',
              `http.extraHeader=Authorization: Basic ${basicToken}`,
              ...pushArgs,
            ]);
          } else {
            pushRes = await execGit(activeTab.path, pushArgs);
          }
          if (pushRes.exitCode !== 0) {
            get().showToast(
              `Failed to push '${params.headBranch}' before creating PR: ${
                pushRes.stderr.trim() || pushRes.stdout.trim()
              }`,
              'error'
            );
            return null;
          }
        }

        set({
          runningOpLabel: `Creating Pull Request #... on ${remoteInfo.owner}/${remoteInfo.repo}`,
        });

        const createdPR = await createRemotePullRequest({
          remoteInfo,
          token: tokenToUse,
          title: params.title,
          body: params.body,
          headBranch: params.headBranch,
          baseBranch: params.baseBranch,
          draft: params.draft,
        });

        get().showToast(
          `Created Pull Request #${createdPR.number}: ${createdPR.title}`,
          'success'
        );
        await get().loadRemotePRsAndIssues();
        await get().refreshActiveRepo();
        return createdPR;
      } catch (err: any) {
        get().showToast(
          `Failed to create Pull Request: ${err?.message || err}`,
          'error'
        );
        return null;
      } finally {
        set({ runningOpLabel: null, activeRemoteOp: null });
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
          const providerToUse = selectedAccount?.provider || 'github';
          const defaultHost =
            selectedAccount?.hostUrl ||
            (providerToUse === 'gitlab' ? 'gitlab.com' : 'github.com');
          let tokenToUse = selectedAccount?.token || githubToken;
          if (!tokenToUse) {
            const sysToken = await resolveGitCredentialToken(
              activeTab.path,
              defaultHost
            );
            if (sysToken) {
              tokenToUse = sysToken;
            }
          }
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

    hydrateSecureTokens: async () => {
      const { accounts } = get();
      const hydrated = await Promise.all(
        accounts.map(async (acc) => {
          // 1. Try to load token from OS native keyring (macOS Keychain / Windows Credential Manager)
          const osToken = await getSecureToken(acc.id);
          if (osToken) {
            return { ...acc, token: osToken };
          }
          // 2. If OS keyring doesn't have it, but legacy localStorage still has it, migrate it!
          if (acc.token) {
            try {
              await saveSecureToken(acc.id, acc.token);
            } catch (err) {
              console.error('Failed to migrate legacy token to OS keyring:', err);
            }
            return acc;
          }
          return acc;
        })
      );

      // Clean legacy tokens from localStorage permanently
      saveAccountsToStorage(hydrated);
      localStorage.removeItem('git-control-gh-token');

      set({ accounts: hydrated });
    },

    refreshGitIdentity: async () => {
      const { tabs, activeTabId, accounts, remoteInfo } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab?.path) return;
      const identity = await getGitConfigIdentity(activeTab.path);

      // Guard: Abort if user switched tabs while querying git config
      if (get().activeTabId !== activeTabId) return;

      // Auto-import existing Global or Local Git Config identity into accounts list if not already saved
      const nextAccounts = [...accounts];
      let changed = false;

      const ensureIdentityInAccounts = (name: string, email: string) => {
        if (!name || !email) return;
        const cleanName = name.trim();
        const cleanEmail = email.trim();
        const lowerEmail = cleanEmail.toLowerCase();

        const isGithubEmail = lowerEmail.includes('github.com');
        const isGitlabEmail = lowerEmail.includes('gitlab.com');
        const inferredProvider = isGithubEmail
          ? 'github'
          : isGitlabEmail
          ? 'gitlab'
          : (remoteInfo?.provider && remoteInfo.provider !== 'unknown'
              ? remoteInfo.provider
              : 'github');

        const inferredUsername =
          cleanName && !cleanName.includes(' ')
            ? cleanName
            : cleanEmail.split('@')[0].replace(/^\d+\+/, '');

        const existingAcc = nextAccounts.find(
          (a) => a.email.toLowerCase() === lowerEmail
        );

        if (!existingAcc) {
          nextAccounts.push({
            id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            provider: inferredProvider,
            name: cleanName,
            email: cleanEmail,
            username: inferredUsername,
            lastUsedAt: Date.now(),
          });
          changed = true;
        } else {
          // If auto-imported account previously defaulted to 'custom', upgrade to inferred provider
          if (existingAcc.provider === 'custom') {
            existingAcc.provider = inferredProvider;
            changed = true;
          }
          // If username was naively set to email prefix while name is a clean username
          if (
            cleanName &&
            !cleanName.includes(' ') &&
            (existingAcc.username.includes('@') ||
              existingAcc.username === cleanEmail.split('@')[0].replace(/^\d+\+/, ''))
          ) {
            existingAcc.username = cleanName;
            changed = true;
          }
        }
      };

      ensureIdentityInAccounts(identity.globalName, identity.globalEmail);
      ensureIdentityInAccounts(identity.localName, identity.localEmail);

      if (changed) {
        saveAccountsToStorage(nextAccounts);
      }

      // Sync active account token for PR/Issue fetching if available (ONLY for the active identity)
      const effectiveEmail = identity.effectiveEmail?.toLowerCase().trim();
      const matchedAccount = effectiveEmail
        ? nextAccounts.find(
            (a) =>
              a.email.toLowerCase().trim() === effectiveEmail &&
              a.token
          )
        : null;

      // Guard: Abort if user switched tabs
      if (get().activeTabId !== activeTabId) return;

      if (matchedAccount?.token) {
        if (matchedAccount.token !== get().githubToken) {
          localStorage.setItem('git-control-gh-token', matchedAccount.token);
          set({
            gitIdentity: identity,
            accounts: nextAccounts,
            githubToken: matchedAccount.token,
          });
        } else {
          set({ gitIdentity: identity, accounts: nextAccounts });
        }
      } else {
        localStorage.removeItem('git-control-gh-token');
        set({ gitIdentity: identity, accounts: nextAccounts, githubToken: '' });
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

      const accountId =
        existingIdx >= 0
          ? accounts[existingIdx].id
          : `acc-${now}-${Math.random().toString(36).slice(2, 6)}`;

      // Securely store token in OS native keyring (macOS Keychain / Windows Credential Manager)
      if (accountInput.token && accountInput.token.trim()) {
        try {
          await saveSecureToken(accountId, accountInput.token.trim());
        } catch (err) {
          console.error('Failed to save secret to OS keyring:', err);
        }
      } else if (accountInput.token === '') {
        try {
          await deleteSecureToken(accountId);
        } catch (err) {
          console.error('Failed to remove secret from OS keyring:', err);
        }
      }

      const savedAccount: GitAccount = {
        id: accountId,
        provider: accountInput.provider,
        name: accountInput.name.trim(),
        email: accountInput.email.trim(),
        username:
          accountInput.username.trim() ||
          accountInput.email.trim().split('@')[0],
        hostUrl: accountInput.hostUrl?.trim() || undefined,
        avatarUrl: accountInput.avatarUrl || undefined,
        token:
          accountInput.token && accountInput.token.trim()
            ? accountInput.token.trim()
            : accountInput.token === ''
            ? undefined
            : existingIdx >= 0
            ? accounts[existingIdx].token
            : undefined,
        lastUsedAt: now,
      };

      const nextAccounts =
        existingIdx >= 0
          ? accounts.map((a, idx) => (idx === existingIdx ? savedAccount : a))
          : [savedAccount, ...accounts];

      saveAccountsToStorage(nextAccounts);
      localStorage.removeItem('git-control-gh-token');

      if (savedAccount.token) {
        set({ accounts: nextAccounts, githubToken: savedAccount.token });
      } else {
        set({ accounts: nextAccounts, githubToken: '' });
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
        saveAccountsToStorage(updatedAccounts);
        localStorage.removeItem('git-control-gh-token');
        if (account.token) {
          set({ accounts: updatedAccounts, githubToken: account.token });
        } else {
          set({ accounts: updatedAccounts, githubToken: '' });
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
      deleteSecureToken(accountId).catch(() => {});
      const updated = get().accounts.filter((a) => a.id !== accountId);
      saveAccountsToStorage(updated);
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
        dateSince: '',
        dateUntil: '',
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
        dateSince: '',
        dateUntil: '',
        selectedCommitHash: null,
        compareCommitHash: null,
        activeDiffRequest: null,
        activeDiffData: null,
        pullRequests: [],
        issues: [],
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
          dateSince: '',
          dateUntil: '',
          selectedCommitHash: null,
          compareCommitHash: null,
          isRepoModalOpen: true,
          pullRequests: [],
          issues: [],
          remoteInfo: null,
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
              dateSince: nextActiveTab.dateSince || '',
              dateUntil: nextActiveTab.dateUntil || '',
              selectedCommitHash: null,
              compareCommitHash: null,
              activeDiffRequest: null,
              activeDiffData: null,
              pullRequests: [],
              issues: [],
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
        dateSince: targetTab?.dateSince || '',
        dateUntil: targetTab?.dateUntil || '',
        selectedCommitHash: null,
        compareCommitHash: null,
        activeDiffRequest: null,
        activeDiffData: null,
        pullRequests: [],
        issues: [],
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
      const { tabs, activeTabId, selectedBranches, commitOrdering, firstParentOnly, dateSince, dateUntil, currentBranch: prevBranch } = get();
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) return;

      set({ isLoading: true });
      try {
        let targetSelectedBranches = selectedBranches;
        // Optimization: Pre-populate target branch from activeTab if available to avoid duplicate loadRepositoryState
        if (
          (targetSelectedBranches.length === 0 ||
            (targetSelectedBranches.length === 1 && targetSelectedBranches[0] === '...')) &&
          activeTab.currentBranch &&
          activeTab.currentBranch !== '...'
        ) {
          targetSelectedBranches = [activeTab.currentBranch];
        }

        const state = await loadRepositoryState(activeTab.path, {
          selectedBranches: targetSelectedBranches,
          CommitOrdering: commitOrdering,
          firstParentOnly,
          dateSince,
          dateUntil,
        });

        // Guard: Abort if user switched tabs while loading repository state
        if (get().activeTabId !== activeTabId) return;

        // Auto-filter to active branch by default, and auto-filter to new branch on branch switch
        const isBranchSwitched = Boolean(
          prevBranch &&
          prevBranch !== '...' &&
          state.currentBranch &&
          state.currentBranch !== prevBranch
        );
        const isInitialEmpty = Boolean(
          (targetSelectedBranches.length === 0 || (targetSelectedBranches.length === 1 && targetSelectedBranches[0] === '...')) &&
          state.currentBranch
        );

        if (isBranchSwitched || isInitialEmpty) {
          targetSelectedBranches = [state.currentBranch];
          // Re-fetch commits specifically for the new active branch
          const refilteredState = await loadRepositoryState(activeTab.path, {
            selectedBranches: targetSelectedBranches,
            CommitOrdering: commitOrdering,
            firstParentOnly,
            dateSince,
            dateUntil,
          });
          state.commits = refilteredState.commits;
          state.headHash = refilteredState.headHash;
        }

        const validRefSet = new Set(state.refs.map((r) => r.name));
        validRefSet.add('HEAD');
        validRefSet.add('HEAD (detached)');
        const sanitizedSelectedBranches = targetSelectedBranches.filter((b) =>
          b === '__ALL__' || validRefSet.has(b)
        );

        const conflictCount = state.workingFiles.filter((f) => f.conflicted).length;
        const updatedTabs = get().tabs.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                currentBranch: state.currentBranch,
                headHash: state.headHash,
                isHeadDetached: state.isHeadDetached,
                uncommittedCount: state.workingFiles.length,
                conflictCount,
                selectedBranches: sanitizedSelectedBranches,
                dateSince,
                dateUntil,
              }
            : t
        );
        localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));

        let selectedHash = get().selectedCommitHash;
        const hashExists = state.commits.some((c) => c.hash === selectedHash);
        if (!hashExists) {
          selectedHash = state.commits.length > 0 ? state.commits[0].hash : null;
        }

        set({
          tabs: updatedTabs,
          selectedBranches: sanitizedSelectedBranches,
          isGitInitialized: state.isGitInitialized,
          currentBranch: state.currentBranch,
          headHash: state.headHash,
          isHeadDetached: state.isHeadDetached,
          commits: state.commits,
          refs: state.refs,
          workingFiles: state.workingFiles,
          worktrees: state.worktrees,
          submodules: state.submodules,
          remoteInfo: state.remoteInfo,
          selectedCommitHash: selectedHash,
          ...(selectedHash ? {} : { selectedCommitFiles: [], selectedCommitBody: '' }),
          isLoading: false,
        });

        if (selectedHash) {
          await get().selectCommit(selectedHash, false);
        }

        // CRITICAL FIX: Await git identity refresh before calling loadRemotePRsAndIssues,
        // so that gitIdentity in store is guaranteed accurate for this active repo
        await get().refreshGitIdentity();
        if (get().activeTabId !== activeTabId) return;

        if (state.remoteInfo) {
          get().loadRemotePRsAndIssues();
        }
      } catch (err: any) {
        if (get().activeTabId === activeTabId) {
          set({ isLoading: false });
          get().showToast(`Failed to load repository: ${err?.message || err}`, 'error');
        }
      }
    },

    setGraphStyle: (graphStyle) => set({ graphStyle }),

    toggleBranchSelection: async (branch: string) => {
      const { selectedBranches, tabs, activeTabId } = get();
      const cleanList = selectedBranches.filter((b) => b !== '__ALL__');
      const exists = cleanList.includes(branch);
      const next = exists
        ? cleanList.filter((b) => b !== branch)
        : [...cleanList, branch];
      const finalNext = next.length === 0 ? ['__ALL__'] : next;
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, selectedBranches: finalNext } : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ selectedBranches: finalNext, tabs: updatedTabs });
      await get().refreshActiveRepo();
    },

    selectBranchOnly: async (branch: string) => {
      const { tabs, activeTabId } = get();
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, selectedBranches: [branch] } : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ selectedBranches: [branch], tabs: updatedTabs });
      await get().refreshActiveRepo();
    },

    clearBranchSelection: async () => {
      const { tabs, activeTabId } = get();
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, selectedBranches: ['__ALL__'] } : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ selectedBranches: ['__ALL__'], tabs: updatedTabs });
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

    setDateRange: async (dateSince: string, dateUntil: string) => {
      const { tabs, activeTabId } = get();
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, dateSince, dateUntil } : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ dateSince, dateUntil, tabs: updatedTabs });
      await get().refreshActiveRepo();
    },

    clearDateRange: async () => {
      const { tabs, activeTabId } = get();
      const updatedTabs = tabs.map((t) =>
        t.id === activeTabId ? { ...t, dateSince: '', dateUntil: '' } : t
      );
      localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(updatedTabs));
      set({ dateSince: '', dateUntil: '', tabs: updatedTabs });
      await get().refreshActiveRepo();
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
      const { tabs, activeTabId, accounts, remoteInfo, gitIdentity } = get();
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
        let finalArgs = args;
        if (remoteOp === 'fetch' || remoteOp === 'pull' || remoteOp === 'push') {
          // STRICT account matching: only inject token if an account matching the active repository
          // identity (effectiveEmail) or repo owner specifically has a token configured.
          // NEVER fallback to another account's token (e.g. personal account token for work repo),
          // which causes authentication failures and wipes the system credential.helper.
          const effectiveEmail = gitIdentity.effectiveEmail?.toLowerCase().trim();
          const repoOwner = remoteInfo?.owner?.toLowerCase().trim();

          const matchedAccount =
            (effectiveEmail
              ? accounts.find(
                  (a) =>
                    a.token &&
                    a.email.toLowerCase().trim() === effectiveEmail
                )
              : null) ||
            (repoOwner
              ? accounts.find(
                  (a) =>
                    a.token &&
                    a.username.toLowerCase().trim() === repoOwner
                )
              : null);

          if (matchedAccount?.token) {
            const authUser = matchedAccount.username || 'x-access-token';
            const basicToken = btoa(`${authUser}:${matchedAccount.token}`);
            finalArgs = [
              '-c',
              'credential.helper=',
              '-c',
              `http.extraHeader=Authorization: Basic ${basicToken}`,
              ...args,
            ];
          }
        }

        const res = await execGit(activeTab.path, finalArgs);
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

    loadRemotePRsAndIssues: async (opts) => {
      const { remoteInfo, accounts, gitIdentity, tabs, activeTabId } = get();
      if (!remoteInfo || remoteInfo.provider === 'unknown') return;
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab?.path) return;
      const isManual = Boolean(opts?.manual);

      // Guard: Abort if active tab changed
      if (get().activeTabId !== activeTabId) return;

      // STRICT: only the account linked to this repository is used.
      // Linked = account whose email matches the repo's effective git user.email,
      // otherwise username equals the remote owner.
      // No fallback to other saved accounts with different identities.
      const effectiveEmail = gitIdentity.effectiveEmail?.toLowerCase().trim();
      const repoOwner = remoteInfo.owner?.toLowerCase().trim();

      const linkedAccount =
        (effectiveEmail
          ? accounts.find(
              (a) =>
                a.email.toLowerCase().trim() === effectiveEmail &&
                (a.provider === remoteInfo.provider || a.provider === 'custom')
            )
          : null) ||
        (repoOwner
          ? accounts.find(
              (a) =>
                a.username.toLowerCase().trim() === repoOwner &&
                (a.provider === remoteInfo.provider || a.provider === 'custom')
            )
          : null);

      let linkedToken = linkedAccount?.token?.trim() || '';

      // If active account has no token in Git Control, try resolving system credential token (e.g. GitHub CLI `gh auth token` or Git Credential Manager)
      if (!linkedToken && activeTab?.path) {
        const host =
          remoteInfo.provider === 'gitlab'
            ? 'gitlab.com'
            : 'github.com';
        try {
          const sysToken = await resolveGitCredentialToken(activeTab.path, host);
          if (sysToken) {
            linkedToken = sysToken;
          }
        } catch {
          // Ignore resolution failure
        }
      }

      // Guard: Abort if user switched tabs while resolving system token
      if (get().activeTabId !== activeTabId) return;

      const accountLabel = linkedAccount
        ? linkedAccount.username || linkedAccount.email
        : gitIdentity.effectiveName || gitIdentity.effectiveEmail || '';

      const notify = (key: string, message: string) => {
        // Only show notifications if the user manually requested a refresh (clicked the refresh button in UI).
        // Background sync on tab switch or repo load should NEVER show intrusive error toasts!
        if (!isManual) return;
        const fullKey = `${activeTab?.path || ''}|${key}`;
        if (fullKey !== lastPrAuthErrorKey) {
          lastPrAuthErrorKey = fullKey;
          get().showToast(message, 'error');
        }
      };

      set((s) => ({
        activeRemoteOp: s.activeRemoteOp || 'pr-sync',
      }));

      try {
        let result: { pullRequests: RemotePullRequest[]; issues: RemoteIssue[] } | null =
          null;

        if (linkedToken) {
          try {
            result = await fetchRemotePullRequestsAndIssues(remoteInfo, linkedToken);
          } catch (err: any) {
            const status = err instanceof RemoteApiError ? err.status : 0;
            notify(
              `token:${accountLabel}:${status}`,
              status
                ? `Token akun ${accountLabel} ditolak (${status}${
                    err?.message ? `: ${err.message}` : ''
                  }), perbarui di Account Manager`
                : `Gagal memuat PRs & Issues dengan akun ${accountLabel}: ${
                    err?.message || err
                  }`
            );
          }
        }

        // Anonymous access (no identity attached) only for public repositories
        if (!result) {
          try {
            result = await fetchRemotePullRequestsAndIssues(remoteInfo);
            if (!linkedToken) lastPrAuthErrorKey = '';
          } catch (err: any) {
            if (!linkedToken && isManual) {
              const status = err instanceof RemoteApiError ? err.status : 0;
              notify(
                `noaccount:${status}`,
                linkedAccount
                  ? `Akun ${accountLabel} belum punya token untuk ${remoteInfo.owner}/${remoteInfo.repo}${
                      status ? ` (${status})` : ''
                    }, tambahkan token di Account Manager`
                  : `Tidak ada akun yang terhubung ke ${remoteInfo.owner}/${remoteInfo.repo}${
                      status ? ` (${status})` : ''
                    }, tambahkan akun di Account Manager`
              );
            }
          }
        } else {
          lastPrAuthErrorKey = '';
        }

        // Ignore stale responses if the user switched repository tabs meanwhile
        if (get().activeTabId !== activeTabId) return;
        set({
          pullRequests: result?.pullRequests || [],
          issues: result?.issues || [],
        });
      } finally {
        set((s) => ({
          activeRemoteOp: s.activeRemoteOp === 'pr-sync' ? null : s.activeRemoteOp,
        }));
      }
    },
  };
});
