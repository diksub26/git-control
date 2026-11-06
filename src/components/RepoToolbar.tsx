import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderGit2,
  GitBranch,
  ChevronDown,
  Check,
  Search,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  DownloadCloud,
  GitBranchPlus,
  Archive,
  TerminalSquare,
  Code2,
  Loader2,
  Bot,
  GitPullRequest,
  Workflow,
  UploadCloud,
  ExternalLink,
  Radio,
  X,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { useShallow } from 'zustand/react/shallow';
import { openExternalUrl } from '../services/gitService';

export const RepoToolbar: React.FC = () => {
  const {
  tabs,
  activeTabId,
  refs,
  currentBranch,
  headHash,
  isHeadDetached,
  selectedBranches,
  activeRemoteOp,
  runningOpLabel,
  isLoading,
  isConsoleOpen,
  remoteInfo,
  detectedIdes,
  customIdes,
  defaultIdeId,
  defaultAiHarnessId,
  setWorkflowModalOpen,
  setCreatePRModalOpen,
  setPublishModalOpen,
  setIdeModalOpen,
  openActiveRepoInIde,
  openActiveRepoInAiHarness,
  runGitOp,
  refreshActiveRepo,
  setConsoleOpen,
  toggleBranchSelection,
  clearBranchSelection,
  selectCommit,
  showToast,
} = useGitStore(
  useShallow((s) => ({ tabs: s.tabs, activeTabId: s.activeTabId, refs: s.refs, currentBranch: s.currentBranch, headHash: s.headHash, isHeadDetached: s.isHeadDetached, selectedBranches: s.selectedBranches, activeRemoteOp: s.activeRemoteOp, runningOpLabel: s.runningOpLabel, isLoading: s.isLoading, isConsoleOpen: s.isConsoleOpen, remoteInfo: s.remoteInfo, detectedIdes: s.detectedIdes, customIdes: s.customIdes, defaultIdeId: s.defaultIdeId, defaultAiHarnessId: s.defaultAiHarnessId, setWorkflowModalOpen: s.setWorkflowModalOpen, setCreatePRModalOpen: s.setCreatePRModalOpen, setPublishModalOpen: s.setPublishModalOpen, setIdeModalOpen: s.setIdeModalOpen, openActiveRepoInIde: s.openActiveRepoInIde, openActiveRepoInAiHarness: s.openActiveRepoInAiHarness, runGitOp: s.runGitOp, refreshActiveRepo: s.refreshActiveRepo, setConsoleOpen: s.setConsoleOpen, toggleBranchSelection: s.toggleBranchSelection, clearBranchSelection: s.clearBranchSelection, selectCommit: s.selectCommit, showToast: s.showToast }))
);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Modal: New Branch (with Create Branch From option)
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchFromSource, setBranchFromSource] = useState('');
  const [shouldCheckoutBranch, setShouldCheckoutBranch] = useState(true);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState('');

  // Dropdown: Branch Operations split menu (HEAD or specific source)
  const [showBranchOpMenu, setShowBranchOpMenu] = useState(false);
  const [branchOpMenuPos, setBranchOpMenuPos] = useState({ top: 0, left: 0 });
  const branchOpBtnRef = useRef<HTMLButtonElement>(null);

  // Dropdown: Pull split menu & Modal: Pull From
  const [showPullMenu, setShowPullMenu] = useState(false);
  const [pullMenuPos, setPullMenuPos] = useState({ top: 0, left: 0 });
  const pullBtnRef = useRef<HTMLButtonElement>(null);

  const [showPullFromModal, setShowPullFromModal] = useState(false);
  const [selectedPullRemote, setSelectedPullRemote] = useState('origin');
  const [selectedPullBranch, setSelectedPullBranch] = useState('');
  const [pullRebase, setPullRebase] = useState(false);
  const [pullAutostash, setPullAutostash] = useState(false);
  const [pullBranchDropdownOpen, setPullBranchDropdownOpen] = useState(false);
  const [pullBranchSearchQuery, setPullBranchSearchQuery] = useState('');

  // Modal: Stash
  const [showStashModal, setShowStashModal] = useState(false);
  const [stashMessage, setStashMessage] = useState('');

  // Dropdown: Branch Filter & Switcher
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [branchMenuPos, setBranchMenuPos] = useState({ top: 0, left: 0 });
  const branchBtnRef = useRef<HTMLButtonElement>(null);

  const localBranches = refs.filter((r) => r.type === 'local-branch');
  const remoteBranches = refs.filter((r) => r.type === 'remote-branch');
  const isAllSelected = selectedBranches.length === 0 || selectedBranches.includes('__ALL__');

  // Active branch ref & commit counters for Pull (behind) and Push (ahead)
  const currentBranchRef = refs.find(
    (r) => r.type === 'local-branch' && (r.isCurrentHead || r.name === currentBranch)
  );
  const behindCount = currentBranchRef?.behind || 0;
  const aheadCount = currentBranchRef?.ahead || 0;

  // Remotes list for Pull From
  const availableRemotes = Array.from(
    new Set(
      refs
        .filter((r) => r.type === 'remote-branch' && r.remote)
        .map((r) => r.remote as string)
    )
  );
  if (availableRemotes.length === 0 && remoteInfo?.remoteName) {
    availableRemotes.push(remoteInfo.remoteName);
  }
  if (availableRemotes.length === 0) {
    availableRemotes.push('origin');
  }

  const effectivePullRemote = selectedPullRemote || availableRemotes[0] || 'origin';
  const remoteBranchesForSelectedRemote = refs
    .filter((r) => r.type === 'remote-branch' && (!r.remote || r.remote === effectivePullRemote))
    .map((r) => {
      const prefix = `${effectivePullRemote}/`;
      return r.name.startsWith(prefix) ? r.name.slice(prefix.length) : r.name;
    });

  const filteredLocalBranches = localBranches.filter((b) =>
    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
  );
  const filteredRemoteBranches = remoteBranches.filter((b) =>
    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
  );
  const filteredPullRemoteBranches = remoteBranchesForSelectedRemote.filter((b) =>
    b.toLowerCase().includes(pullBranchSearchQuery.toLowerCase())
  );

  const handleToggleBranchMenu = () => {
    if (!activeTab) return;
    if (showBranchMenu) {
      setShowBranchMenu(false);
      return;
    }
    if (branchBtnRef.current) {
      const rect = branchBtnRef.current.getBoundingClientRect();
      setBranchMenuPos({ top: rect.bottom + 6, left: rect.left });
    }
    setBranchFilter('');
    setShowBranchMenu(true);
  };

  const handleTogglePullMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTab) return;
    if (showPullMenu) {
      setShowPullMenu(false);
      return;
    }
    if (pullBtnRef.current) {
      const rect = pullBtnRef.current.getBoundingClientRect();
      setPullMenuPos({ top: rect.bottom + 6, left: rect.left });
    }
    setShowPullMenu(true);
  };

  const handleToggleBranchOpMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTab) return;
    if (showBranchOpMenu) {
      setShowBranchOpMenu(false);
      return;
    }
    if (branchOpBtnRef.current) {
      const rect = branchOpBtnRef.current.getBoundingClientRect();
      setBranchOpMenuPos({ top: rect.bottom + 6, left: rect.left });
    }
    setShowBranchOpMenu(true);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const bName = newBranchName.trim();
    const source = branchFromSource.trim();
    const hasCustomSource = Boolean(source && source !== currentBranch && source !== 'HEAD');

    const args = shouldCheckoutBranch
      ? hasCustomSource
        ? ['checkout', '-b', bName, source]
        : ['checkout', '-b', bName]
      : hasCustomSource
      ? ['branch', bName, source]
      : ['branch', bName];

    const label = shouldCheckoutBranch
      ? `Created & checked out branch ${bName}${hasCustomSource ? ` from ${source}` : ''}`
      : `Created branch ${bName}${hasCustomSource ? ` from ${source}` : ''}`;

    await runGitOp(label, args);
    setNewBranchName('');
    setShowNewBranchModal(false);
  };

  const handlePullFromSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePullRemote || !selectedPullBranch.trim()) return;
    const remote = effectivePullRemote;
    const branch = selectedPullBranch.trim();
    const args = ['pull'];
    if (pullRebase) args.push('--rebase');
    if (pullAutostash) args.push('--autostash');
    args.push(remote, branch);

    setShowPullFromModal(false);
    await runGitOp(`Pull from ${remote}/${branch}`, args);
  };

  const handleStashPush = async (e: React.FormEvent) => {
    e.preventDefault();
    const args = stashMessage.trim()
      ? ['stash', 'push', '-u', '-m', stashMessage.trim()]
      : ['stash', 'push', '-u'];
    await runGitOp('Stashed working changes', args);
    setStashMessage('');
    setShowStashModal(false);
  };

  return (
    <>
      <div className="h-10 px-3 bg-slate-950/40 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 select-none overflow-x-auto no-scrollbar">
        {/* Left: Folder name (branch active) [shortcut icon] + Dropdown Branch */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 shrink-0">
            <FolderGit2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="max-w-[150px] truncate" title={activeTab?.path || activeTab?.name}>
              {activeTab?.name || 'Repository'}
            </span>
            {isHeadDetached && headHash ? (
              <span
                className="text-amber-300 bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5 rounded font-mono text-[11px] font-medium truncate max-w-[170px] inline-flex items-center gap-1"
                title={`Detached HEAD at commit ${headHash}`}
              >
                <Radio className="w-2.5 h-2.5 text-amber-400 animate-pulse shrink-0" />
                HEAD ({headHash.slice(0, 7)})
              </span>
            ) : (
              <span className="text-sky-300 font-mono text-[11px] font-normal truncate max-w-[140px]">
                ({currentBranch || 'HEAD'})
              </span>
            )}
            {remoteInfo?.webUrl ? (
              <button
                type="button"
                onClick={() => openExternalUrl(remoteInfo.webUrl)}
                className="p-0.5 rounded text-slate-400 hover:text-sky-300 hover:bg-white/10 transition shrink-0 ml-0.5"
                title={`Open repository page on ${remoteInfo.provider} (${remoteInfo.webUrl})`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => showToast('No remote repository URL configured for this repository', 'info')}
                className="p-0.5 rounded text-slate-600 hover:text-slate-400 transition shrink-0 ml-0.5"
                title="No remote repository URL configured"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-white/10 shrink-0" />

          {/* Dropdown Branch (Filter Git Graph & Checkout) */}
          <button
            ref={branchBtnRef}
            disabled={!activeTab}
            onClick={handleToggleBranchMenu}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition shrink-0 ${
              showBranchMenu
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title={`Filter & Switch Branch (Current Active: ${
              isHeadDetached && headHash
                ? `HEAD detached at ${headHash.slice(0, 7)}`
                : currentBranch || 'HEAD'
            })`}
          >
            <GitBranch className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono text-xs max-w-[160px] truncate text-slate-100 font-semibold">
              {isAllSelected
                ? 'All Branches & Remotes'
                : selectedBranches.length === 1
                ? selectedBranches[0]
                : `${selectedBranches.length} Branches Selected`}
            </span>
            {selectedBranches.length > 1 && !isAllSelected && (
              <span className="px-1.5 py-0.2 rounded-full bg-sky-500/25 text-sky-300 text-[10px] font-mono">
                {selectedBranches.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* --- SPACE BETWEEN (flex-1) --- */}

        {/* Right: Toolbar Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Segment 1: Sync Cluster (Fetch, Pull [Split with Pull from], Push) */}
          <div className="flex items-center rounded-lg bg-white/[0.04] p-0.5 border border-white/10 shrink-0">
            <button
              disabled={!activeTab || Boolean(activeRemoteOp)}
              onClick={() => runGitOp('Fetch all remotes', ['fetch', '--all', '--prune'])}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition shrink-0 ${
                activeRemoteOp === 'fetch'
                  ? 'bg-sky-500/25 text-sky-200 font-medium'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title="git fetch --all --prune"
            >
              {activeRemoteOp === 'fetch' ? (
                <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              ) : (
                <DownloadCloud className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{activeRemoteOp === 'fetch' ? 'Fetching...' : 'Fetch'}</span>
            </button>

            <div className="h-3.5 w-px bg-white/10 my-auto" />

            {/* Split Button: Pull & Pull From */}
            <div className="flex items-center">
              <button
                disabled={!activeTab || Boolean(activeRemoteOp)}
                onClick={() => runGitOp('Pull', ['pull'])}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-l-md text-xs transition shrink-0 ${
                  activeRemoteOp === 'pull'
                    ? 'bg-emerald-500/25 text-emerald-200 font-medium'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title={
                  behindCount > 0
                    ? `git pull (${behindCount} incoming commit${behindCount > 1 ? 's' : ''})`
                    : 'git pull (Fast-forward / Merge default upstream)'
                }
              >
                {activeRemoteOp === 'pull' ? (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                ) : (
                  <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{activeRemoteOp === 'pull' ? 'Pulling...' : 'Pull'}</span>
                {activeRemoteOp !== 'pull' && behindCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-semibold leading-none shrink-0"
                    title={`${behindCount} incoming commit${behindCount > 1 ? 's' : ''}`}
                  >
                    {behindCount > 999 ? '999+' : behindCount}
                  </span>
                )}
              </button>

              <button
                ref={pullBtnRef}
                disabled={!activeTab || Boolean(activeRemoteOp)}
                onClick={handleTogglePullMenu}
                className="p-1 rounded-r-md text-slate-400 hover:text-white hover:bg-white/10 border-l border-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Pull options: Pull with Rebase, Pull from..."
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="h-3.5 w-px bg-white/10 my-auto" />

            <button
              disabled={!activeTab || Boolean(activeRemoteOp)}
              onClick={() => runGitOp('Push', ['push', '-u', 'origin', currentBranch])}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition shrink-0 ${
                activeRemoteOp === 'push'
                  ? 'bg-indigo-500/25 text-indigo-200 font-medium'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={
                aheadCount > 0
                  ? `git push -u origin ${currentBranch} (${aheadCount} unpushed commit${aheadCount > 1 ? 's' : ''})`
                  : `git push -u origin ${currentBranch}`
              }
            >
              {activeRemoteOp === 'push' ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              ) : (
                <ArrowUpFromLine className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>{activeRemoteOp === 'push' ? 'Pushing...' : 'Push'}</span>
              {activeRemoteOp !== 'push' && aheadCount > 0 && (
                <span
                  className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-mono font-semibold leading-none shrink-0"
                  title={`${aheadCount} unpushed commit${aheadCount > 1 ? 's' : ''}`}
                >
                  {aheadCount > 999 ? '999+' : aheadCount}
                </span>
              )}
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-0.5 shrink-0" />

          {/* Segment 2: Operations Cluster (Branch [Split], Stash) */}
          <div className="flex items-center rounded-lg bg-white/[0.04] p-0.5 border border-white/10 shrink-0">
            {/* Split Button: Branch & Create Branch From */}
            <div className="flex items-center">
              <button
                disabled={!activeTab}
                onClick={() => {
                  setBranchFromSource(currentBranch || 'HEAD');
                  setShowNewBranchModal(true);
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-l-md text-xs text-slate-200 hover:bg-white/10 hover:text-white transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Create New Branch"
              >
                <GitBranchPlus className="w-3.5 h-3.5 text-pink-400" />
                <span>Branch</span>
              </button>

              <button
                ref={branchOpBtnRef}
                disabled={!activeTab}
                onClick={handleToggleBranchOpMenu}
                className="p-1 rounded-r-md text-slate-400 hover:text-white hover:bg-white/10 border-l border-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Create Branch options: From HEAD, From Specific Branch/Commit"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="h-3.5 w-px bg-white/10 my-auto" />

            <button
              disabled={!activeTab}
              onClick={() => setShowStashModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-200 hover:bg-white/10 hover:text-white transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Stash Working Tree Changes"
            >
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span>Stash</span>
            </button>
          </div>

          {/* Segment 3: Workflows Button */}
          <button
            disabled={!activeTab}
            onClick={() => setWorkflowModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Git Workflows & Sequential Command Macros (e.g. fetch -p → pull origin main → push -f)"
          >
            <Workflow className="w-3.5 h-3.5 text-amber-400" />
            <span>Workflows</span>
          </button>

          {/* Segment 4: Remote Cluster (Create PR / Publish) */}
          {remoteInfo && (
            <button
              type="button"
              disabled={!activeTab}
              onClick={() => setCreatePRModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-pink-200 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-400/30 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Create Pull Request / Merge Request on GitHub / GitLab"
            >
              <GitPullRequest className="w-3.5 h-3.5 text-pink-400" />
              <span>Create PR</span>
            </button>
          )}

          {activeTab && (
            <button
              disabled={!activeTab}
              onClick={() => setPublishModalOpen(true)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                remoteInfo
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/25 text-emerald-300'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40 text-emerald-200'
              }`}
              title={
                remoteInfo
                  ? 'Publish to Another Remote / Change Remote'
                  : 'Publish this local repository to GitHub, GitLab, or a Remote URL'
              }
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
              {!remoteInfo && <span>Publish Repo</span>}
            </button>
          )}

          {/* Tools: IDE Split, AI Split, Refresh, Git Log */}
          {activeTab && (() => {
            const targetIdeId =
              activeTab.preferredIdeId || defaultIdeId || 'vscode';
            const targetAiId =
              activeTab.preferredAiHarnessId ||
              defaultAiHarnessId ||
              'antigravity';
            const allIdes = [...detectedIdes, ...customIdes];
            const activeIde = allIdes.find((i) => i.id === targetIdeId);
            const activeAi = allIdes.find((i) => i.id === targetAiId);

            const shortIdeName =
              targetIdeId === 'vscode'
                ? 'VS Code'
                : targetIdeId === 'intellij'
                ? 'IntelliJ'
                : targetIdeId === 'webstorm'
                ? 'WebStorm'
                : targetIdeId === 'explorer'
                ? 'Explorer'
                : activeIde?.name?.replace(/\s*\(.*\)$/, '') || targetIdeId;

            const shortAiName =
              targetAiId === 'antigravity'
                ? 'Antigravity'
                : targetAiId === 'claude-code'
                ? 'Claude Code'
                : targetAiId === 'codex'
                ? 'Codex CLI'
                : targetAiId === 'gemini-cli'
                ? 'Gemini CLI'
                : targetAiId === 'opencode'
                ? 'OpenCode'
                : targetAiId === 'aider'
                ? 'Aider'
                : targetAiId === 'cursor'
                ? 'Cursor'
                : targetAiId === 'windsurf'
                ? 'Windsurf'
                : activeAi?.name?.replace(/\s*\(.*\)$/, '') || targetAiId;

            return (
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Split Button 1: Open in Code IDE */}
                <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden shrink-0">
                  <button
                    onClick={() => openActiveRepoInIde()}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10 transition"
                    title={`Open '${activeTab.name}' in ${activeIde?.name || shortIdeName}`}
                  >
                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="max-w-[85px] truncate">{shortIdeName}</span>
                  </button>
                  <button
                    onClick={() => setIdeModalOpen(true, 'ide')}
                    className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-white/10 border-l border-white/10 transition"
                    title="Select Code IDE for this Repository"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Split Button 2: Open in AI Harness */}
                <div className="flex items-center rounded-lg bg-purple-500/10 border border-purple-400/25 overflow-hidden shrink-0">
                  <button
                    onClick={() => openActiveRepoInAiHarness()}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-purple-200 hover:bg-purple-500/20 transition"
                    title={`Open '${activeTab.name}' in AI Harness: ${activeAi?.name || shortAiName}`}
                  >
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span className="max-w-[90px] truncate">{shortAiName}</span>
                  </button>
                  <button
                    onClick={() => setIdeModalOpen(true, 'ai-harness')}
                    className="px-1.5 py-1 text-purple-300 hover:text-white hover:bg-purple-500/20 border-l border-purple-400/25 transition"
                    title="Select AI Harness (Claude Code, Codex, Antigravity, Cursor, Aider) for this Repository"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })()}

          <button
            disabled={!activeTab}
            onClick={() => refreshActiveRepo()}
            className="p-1.5 rounded-lg text-slate-300 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Refresh Repository Graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={() => setConsoleOpen(!isConsoleOpen)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition shrink-0 ${
              isConsoleOpen
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
            }`}
            title="Toggle Git Command Log Console"
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            <span>Git Log</span>
          </button>
        </div>
      </div>

      {/* Quick Branch Switcher & Filter Dropdown (Portal) */}
      {showBranchMenu &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowBranchMenu(false)}
            />
            <div
              style={{ top: `${branchMenuPos.top}px`, left: `${branchMenuPos.left}px` }}
              className="fixed z-50 w-72 rounded-xl bg-slate-900/95 border border-white/15 p-2 shadow-2xl flex flex-col gap-1 select-none"
            >
              {/* Header without New Branch shortcut */}
              <div className="px-2 py-1 border-b border-white/10 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Branches & Filter
                </span>
              </div>

              {/* Filter search input */}
              <div className="px-1.5 pb-1">
                <input
                  type="text"
                  autoFocus
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  placeholder="Search branches..."
                  className="w-full px-2.5 py-1 rounded-md bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-0.5 no-scrollbar">
                {/* Option: All Branches & Remotes */}
                <button
                  type="button"
                  onClick={() => {
                    clearBranchSelection();
                    setShowBranchMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                    isAllSelected
                      ? 'bg-sky-500/20 text-sky-200 font-medium'
                      : 'hover:bg-white/[0.07] text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        isAllSelected
                          ? 'bg-sky-500 border-sky-400 text-white'
                          : 'border-white/25 bg-slate-950'
                      }`}
                    >
                      {isAllSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs">All Branches & Remotes</span>
                  </span>
                </button>

                {/* Detached HEAD Status Card */}
                {isHeadDetached && headHash && (
                  <div className="mx-1 my-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-400/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                          <span>Detached HEAD</span>
                          <span className="px-1 py-0.2 rounded text-[9px] bg-amber-500/25 text-amber-300 font-mono">
                            active
                          </span>
                        </div>
                        <div
                          className="text-[11px] font-mono text-slate-300 truncate"
                          title={headHash}
                        >
                          at {headHash.slice(0, 7)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBranchMenu(false);
                        selectCommit(headHash);
                      }}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 transition shrink-0"
                      title="Jump to this commit in Graph"
                    >
                      Jump
                    </button>
                  </div>
                )}

                {/* Local Branches Header */}
                <div className="px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Local Branches ({localBranches.length})</span>
                  <span className="text-[9px] text-slate-500">Click to filter</span>
                </div>

                {localBranches
                  .filter((b) =>
                    b.name.toLowerCase().includes(branchFilter.toLowerCase())
                  )
                  .map((b) => {
                    const isChecked = !isAllSelected && selectedBranches.includes(b.name);
                    const isCurrent = b.name === currentBranch;
                    return (
                      <div
                        key={b.fullName}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                          isChecked
                            ? 'bg-sky-500/20 text-sky-200 font-medium'
                            : 'hover:bg-white/[0.07] text-slate-300'
                        }`}
                      >
                        {/* Checkbox & Name */}
                        <div
                          onClick={() => toggleBranchSelection(b.name)}
                          className="flex items-center gap-2 truncate cursor-pointer flex-1"
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                              isChecked
                                ? 'bg-sky-500 border-sky-400 text-white'
                                : 'border-white/25 bg-slate-950'
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span className="truncate text-xs">{b.name}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-200 shrink-0 font-mono">
                              active
                            </span>
                          )}
                        </div>

                        {/* Quick Checkout button (if not already current) */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setShowBranchMenu(false);
                              await runGitOp(`Checkout branch ${b.name}`, [
                                'checkout',
                                b.name,
                              ]);
                            }}
                            className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded text-[10px] bg-sky-600/60 hover:bg-sky-500 text-white transition ml-1 shrink-0"
                            title={`Checkout '${b.name}'`}
                          >
                            Checkout
                          </button>
                        )}
                      </div>
                    );
                  })}

                {/* Remote Branches */}
                {remoteBranches.length > 0 && (
                  <>
                    <div className="px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Remote Branches ({remoteBranches.length})
                    </div>
                    {remoteBranches
                      .filter((b) =>
                        b.name.toLowerCase().includes(branchFilter.toLowerCase())
                      )
                      .map((b) => {
                        const isChecked =
                          !isAllSelected && selectedBranches.includes(b.name);
                        return (
                          <div
                            key={b.fullName}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                              isChecked
                                ? 'bg-sky-500/20 text-sky-200 font-medium'
                                : 'hover:bg-white/[0.07] text-slate-300'
                            }`}
                          >
                            <div
                              onClick={() => toggleBranchSelection(b.name)}
                              className="flex items-center gap-2 truncate cursor-pointer flex-1"
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                                  isChecked
                                    ? 'bg-sky-500 border-sky-400 text-white'
                                    : 'border-white/25 bg-slate-950'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                              <span className="truncate text-xs font-mono text-[11px] text-slate-400">
                                {b.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Dropdown Menu: Pull Split (Default, Rebase, Pull from...) */}
      {showPullMenu &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPullMenu(false)}
            />
            <div
              style={{ top: `${pullMenuPos.top}px`, left: `${pullMenuPos.left}px` }}
              className="fixed z-50 w-56 rounded-xl bg-slate-900/95 border border-white/15 p-1.5 shadow-2xl flex flex-col gap-0.5 select-none text-xs"
            >
              <button
                type="button"
                onClick={() => {
                  setShowPullMenu(false);
                  runGitOp('Pull', ['pull']);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 text-left transition"
              >
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <div className="font-medium">Pull (Default)</div>
                    <div className="text-[10px] text-slate-400 font-mono">git pull</div>
                  </div>
                </div>
                {behindCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-semibold">
                    {behindCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPullMenu(false);
                  runGitOp('Pull with rebase', ['pull', '--rebase']);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 text-left transition"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div className="font-medium">Pull with Rebase</div>
                  <div className="text-[10px] text-slate-400 font-mono">git pull --rebase</div>
                </div>
              </button>

              <div className="h-px bg-white/10 my-1" />

              <button
                type="button"
                onClick={() => {
                  setShowPullMenu(false);
                  const defaultBranch =
                    remoteBranchesForSelectedRemote.find((b) => b === currentBranch) ||
                    remoteBranchesForSelectedRemote[0] ||
                    currentBranch ||
                    '';
                  setSelectedPullBranch(defaultBranch);
                  setShowPullFromModal(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-300 text-left transition font-medium"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div>Pull from...</div>
                  <div className="text-[10px] text-emerald-400/70">Select remote & branch</div>
                </div>
              </button>
            </div>
          </>,
          document.body
        )}

      {/* Modal: Pull From Specific Remote & Branch */}
      {showPullFromModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/25">
                    <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Pull From Remote</h3>
                    <p className="text-[11px] text-slate-400">Fetch and merge or rebase from a specific remote branch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPullFromModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePullFromSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Remote
                    </label>
                    <select
                      value={effectivePullRemote}
                      onChange={(e) => {
                        setSelectedPullRemote(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      {availableRemotes.map((rem) => (
                        <option key={rem} value={rem}>
                          {rem}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Remote Branch
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPullBranchSearchQuery('');
                        setPullBranchDropdownOpen(!pullBranchDropdownOpen);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border transition text-xs ${
                        pullBranchDropdownOpen
                          ? 'border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                          : 'border-white/15 text-slate-200 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DownloadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-mono text-xs truncate">
                          {selectedPullBranch || 'Select remote branch...'}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          pullBranchDropdownOpen ? 'rotate-180 text-emerald-400' : ''
                        }`}
                      />
                    </button>

                    {pullBranchDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setPullBranchDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl bg-slate-900 border border-white/20 p-2 shadow-2xl flex flex-col gap-1 max-h-56 overflow-y-auto no-scrollbar">
                          {/* Search Input */}
                          <div className="relative mb-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              autoFocus
                              value={pullBranchSearchQuery}
                              onChange={(e) => setPullBranchSearchQuery(e.target.value)}
                              placeholder="Search or enter remote branch..."
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>

                          {/* Custom branch input option */}
                          {pullBranchSearchQuery.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPullBranch(pullBranchSearchQuery.trim());
                                setPullBranchDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 text-left transition"
                            >
                              <DownloadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <div className="truncate text-xs">
                                <span className="text-emerald-300">Use: </span>
                                <span className="font-mono font-semibold text-white">
                                  "{pullBranchSearchQuery.trim()}"
                                </span>
                              </div>
                            </button>
                          )}

                          {filteredPullRemoteBranches.map((b) => {
                            const isSelected = selectedPullBranch === b;
                            return (
                              <button
                                key={b}
                                type="button"
                                onClick={() => {
                                  setSelectedPullBranch(b);
                                  setPullBranchDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                                  isSelected
                                    ? 'bg-emerald-500/20 text-emerald-200 font-medium'
                                    : 'hover:bg-white/[0.07] text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <DownloadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="font-mono text-xs truncate">{b}</span>
                                  {b === currentBranch && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-mono shrink-0">
                                      current
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}

                          {filteredPullRemoteBranches.length === 0 && !pullBranchSearchQuery && (
                            <div className="px-3 py-2 text-xs text-slate-500 text-center">
                              No remote branches found
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={pullRebase}
                      onChange={(e) => setPullRebase(e.target.checked)}
                      className="rounded bg-slate-950 border-white/20 text-emerald-500 focus:ring-0"
                    />
                    <span>Rebase local commits onto pulled branch (<code className="text-emerald-400">--rebase</code>)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={pullAutostash}
                      onChange={(e) => setPullAutostash(e.target.checked)}
                      className="rounded bg-slate-950 border-white/20 text-emerald-500 focus:ring-0"
                    />
                    <span>Autostash uncommitted changes before pull (<code className="text-emerald-400">--autostash</code>)</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowPullFromModal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedPullBranch.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-40"
                  >
                    Pull from {effectivePullRemote}/{selectedPullBranch || '...'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Dropdown Menu: Branch Operations Split (From HEAD, From Specific Branch/Commit) */}
      {showBranchOpMenu &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowBranchOpMenu(false)}
            />
            <div
              style={{ top: `${branchOpMenuPos.top}px`, left: `${branchOpMenuPos.left}px` }}
              className="fixed z-50 w-60 rounded-xl bg-slate-900/95 border border-white/15 p-1.5 shadow-2xl flex flex-col gap-0.5 select-none text-xs"
            >
              <button
                type="button"
                onClick={() => {
                  setShowBranchOpMenu(false);
                  setBranchFromSource(currentBranch || 'HEAD');
                  setShowNewBranchModal(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-slate-200 text-left transition"
              >
                <GitBranchPlus className="w-3.5 h-3.5 text-pink-400" />
                <div>
                  <div className="font-medium">Branch from HEAD</div>
                  <div className="text-[10px] text-slate-400 font-mono">active: {currentBranch || 'HEAD'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBranchOpMenu(false);
                  setBranchFromSource('');
                  setShowNewBranchModal(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-pink-500/20 text-pink-300 text-left transition font-medium"
              >
                <GitBranchPlus className="w-3.5 h-3.5 text-pink-400" />
                <div>
                  <div>Create branch from...</div>
                  <div className="text-[10px] text-pink-400/70">Pick branch, tag, or commit</div>
                </div>
              </button>
            </div>
          </>,
          document.body
        )}

      {/* Modal: Create New Branch (with Create Branch From Option) */}
      {showNewBranchModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-pink-500/15 border border-pink-400/25">
                    <GitBranchPlus className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Create New Branch</h3>
                    <p className="text-[11px] text-slate-400">Create a new local branch from a starting point</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    New Branch Name
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g. feature/auth-redesign"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50 font-mono"
                  />
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      Create branch from
                    </label>
                    <span className="text-[10px] text-slate-500">
                      HEAD, branch, tag, or commit hash
                    </span>
                  </div>

                  {/* Custom Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setBranchSearchQuery('');
                      setBranchDropdownOpen(!branchDropdownOpen);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border transition text-xs ${
                      branchDropdownOpen
                        ? 'border-pink-500 ring-1 ring-pink-500/40 text-white'
                        : 'border-white/15 text-slate-200 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span className="font-mono text-xs truncate">
                        {branchFromSource || `Current HEAD (${currentBranch || 'HEAD'})`}
                      </span>
                      {(!branchFromSource || branchFromSource === currentBranch || branchFromSource === 'HEAD') && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/25 text-pink-300 font-mono shrink-0">
                          active
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        branchDropdownOpen ? 'rotate-180 text-pink-400' : ''
                      }`}
                    />
                  </button>

                  {/* Custom Dropdown Menu */}
                  {branchDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setBranchDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl bg-slate-900 border border-white/20 p-2 shadow-2xl flex flex-col gap-1 max-h-60 overflow-y-auto no-scrollbar">
                        {/* Search Input */}
                        <div className="relative mb-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            autoFocus
                            value={branchSearchQuery}
                            onChange={(e) => setBranchSearchQuery(e.target.value)}
                            placeholder="Filter branches or enter commit/tag..."
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50"
                          />
                        </div>

                        {/* Custom ref option if search doesn't match an exact branch */}
                        {branchSearchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setBranchFromSource(branchSearchQuery.trim());
                              setBranchDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/20 text-left transition"
                          >
                            <GitBranch className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                            <div className="truncate text-xs">
                              <span className="text-pink-300">Use custom ref: </span>
                              <span className="font-mono font-semibold text-white">"{branchSearchQuery.trim()}"</span>
                            </div>
                          </button>
                        )}

                        {/* Option: Current HEAD */}
                        {(!branchSearchQuery || 'head'.includes(branchSearchQuery.toLowerCase()) || (currentBranch && currentBranch.toLowerCase().includes(branchSearchQuery.toLowerCase()))) && (
                          <button
                            type="button"
                            onClick={() => {
                              setBranchFromSource(currentBranch || 'HEAD');
                              setBranchDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                              (!branchFromSource || branchFromSource === currentBranch || branchFromSource === 'HEAD')
                                ? 'bg-pink-500/20 text-pink-200 font-medium'
                                : 'hover:bg-white/[0.07] text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GitBranch className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                              <span className="font-mono text-xs truncate">Current HEAD ({currentBranch || 'HEAD'})</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/30 text-pink-200 font-mono shrink-0">
                                active
                              </span>
                            </div>
                            {(!branchFromSource || branchFromSource === currentBranch || branchFromSource === 'HEAD') && (
                              <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                            )}
                          </button>
                        )}

                        {/* Local Branches Header & Items */}
                        {filteredLocalBranches.length > 0 && (
                          <>
                            <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Local Branches ({filteredLocalBranches.length})
                            </div>
                            {filteredLocalBranches.map((b) => {
                              const isSelected = branchFromSource === b.name;
                              return (
                                <button
                                  key={b.fullName}
                                  type="button"
                                  onClick={() => {
                                    setBranchFromSource(b.name);
                                    setBranchDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                                    isSelected
                                      ? 'bg-pink-500/20 text-pink-200 font-medium'
                                      : 'hover:bg-white/[0.07] text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono text-xs truncate">{b.name}</span>
                                    {b.name === currentBranch && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-200 font-mono shrink-0">
                                        current
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </>
                        )}

                        {/* Remote Branches Header & Items */}
                        {filteredRemoteBranches.length > 0 && (
                          <>
                            <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Remote Branches ({filteredRemoteBranches.length})
                            </div>
                            {filteredRemoteBranches.map((b) => {
                              const isSelected = branchFromSource === b.name;
                              return (
                                <button
                                  key={b.fullName}
                                  type="button"
                                  onClick={() => {
                                    setBranchFromSource(b.name);
                                    setBranchDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                                    isSelected
                                      ? 'bg-pink-500/20 text-pink-200 font-medium'
                                      : 'hover:bg-white/[0.07] text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <DownloadCloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                    <span className="font-mono text-xs truncate text-slate-300">{b.name}</span>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </>
                  )}

                  <p className="text-[10px] text-slate-500 mt-1">
                    Starting point for the branch. Leave empty to branch from current HEAD (<code className="text-pink-300">{currentBranch || 'HEAD'}</code>).
                  </p>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={shouldCheckoutBranch}
                      onChange={(e) => setShouldCheckoutBranch(e.target.checked)}
                      className="rounded bg-slate-950 border-white/20 text-pink-500 focus:ring-0"
                    />
                    <span>Checkout new branch immediately</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowNewBranchModal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newBranchName.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-pink-600 hover:bg-pink-500 text-white transition disabled:opacity-40"
                  >
                    {shouldCheckoutBranch ? 'Create & Checkout' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Stash Working Changes */}
      {showStashModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-400/25">
                    <Archive className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Stash Changes</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStashModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleStashPush} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Stash Message (Optional)
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={stashMessage}
                    onChange={(e) => setStashMessage(e.target.value)}
                    placeholder="e.g. WIP navbar changes"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Saves modified and untracked files into the stash list and resets working tree.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowStashModal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition"
                  >
                    Stash Changes
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
