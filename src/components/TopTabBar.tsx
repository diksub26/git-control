import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  X,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  DownloadCloud,
  GitBranchPlus,
  Archive,
  TerminalSquare,
  ExternalLink,
  Code2,
  Loader2,
  Search,
  Trash2,
  Clock,
  FolderOpen,
  GitFork,
  Users,
  UploadCloud,
  ChevronDown,
  Bot,
  GitPullRequest,
  Workflow,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { pickRepositoryFolder } from '../services/gitService';
import { getAuthorAvatarUrl } from '../utils/avatar';

export const TopTabBar: React.FC = () => {
  const {
    tabs,
    savedRepos,
    activeTabId,
    isRepoModalOpen,
    accounts,
    gitIdentity,
    detectedIdes,
    customIdes,
    defaultIdeId,
    defaultAiHarnessId,
    isLoading,
    activeRemoteOp,
    runningOpLabel,
    isConsoleOpen,
    remoteInfo,
    currentBranch,
    setRepoModalOpen,
    setAccountModalOpen,
    setPublishModalOpen,
    setCreatePRModalOpen,
    setWorkflowModalOpen,
    setIdeModalOpen,
    openActiveRepoInIde,
    openActiveRepoInAiHarness,
    setActiveTab,
    closeRepoTab,
    openRepoTab,
    removeSavedRepo,
    cloneRepository,
    refreshActiveRepo,
    runGitOp,
    setConsoleOpen,
    requestConfirm,
  } = useGitStore();

  const [repoModalTab, setRepoModalTab] = useState<'open' | 'clone'>('open');
  const [customPath, setCustomPath] = useState('');
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneParentDir, setCloneParentDir] = useState('');
  const [cloneFolderName, setCloneFolderName] = useState('');
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showStashModal, setShowStashModal] = useState(false);
  const [stashMessage, setStashMessage] = useState('');

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const formatLastOpened = (ts?: number) => {
    if (!ts) return 'Previously opened';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  const filteredBookmarks = savedRepos.filter(
    (r) =>
      r.name.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
      r.path.toLowerCase().includes(bookmarkSearch.toLowerCase())
  );

  const handleBrowseFolder = async () => {
    const picked = await pickRepositoryFolder();
    if (picked) {
      await openRepoTab(picked);
      setRepoModalOpen(false);
    }
  };

  const handleBrowseCloneParent = async () => {
    const picked = await pickRepositoryFolder();
    if (picked) {
      setCloneParentDir(picked);
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneUrl.trim() || !cloneParentDir.trim()) return;
    const ok = await cloneRepository(
      cloneUrl.trim(),
      cloneParentDir.trim(),
      cloneFolderName.trim() || undefined
    );
    if (ok) {
      setCloneUrl('');
      setCloneFolderName('');
      setRepoModalOpen(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    await runGitOp(`Created branch ${newBranchName.trim()}`, [
      'checkout',
      '-b',
      newBranchName.trim(),
    ]);
    setNewBranchName('');
    setShowNewBranchModal(false);
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
      <header className="relative h-12 flex items-center justify-between px-3 bg-slate-950/60 backdrop-blur-xl border-b border-white/10 select-none z-20">
        {(isLoading || activeRemoteOp || runningOpLabel) && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 via-indigo-400 to-emerald-400 animate-pulse" />
        )}
        {/* Left: App Brand & Multi-Repo Tabs */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-400/25 shrink-0">
            <img
              src="/icon.svg"
              alt="Git Control"
              className="w-4 h-4 rounded-sm shrink-0"
            />
            <span className="font-semibold text-xs tracking-wide text-slate-100">
              GIT CONTROL
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-white/12 border-white/20 text-white shadow-sm'
                      : 'bg-white/[0.03] border-transparent text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
                  }`}
                  title={tab.path}
                >
                  <span className="font-medium truncate max-w-[130px]">{tab.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono text-[10px]">
                    {tab.currentBranch}
                  </span>
                  {tab.uncommittedCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                      *{tab.uncommittedCount}
                    </span>
                  )}
                  {tab.conflictCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/25 text-rose-300 text-[10px] font-semibold">
                      !{tab.conflictCount}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeRepoTab(tab.id);
                    }}
                    className="opacity-60 hover:opacity-100 hover:text-rose-400 p-0.5 rounded"
                    title="Close repository tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => setRepoModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
              title="Open, Switch, or Clone Repository"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Open Repo</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Git Operations Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <button
            disabled={Boolean(activeRemoteOp)}
            onClick={() => runGitOp('Fetch all remotes', ['fetch', '--all', '--prune'])}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition ${
              activeRemoteOp === 'fetch'
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                : 'text-slate-200 bg-white/[0.04] hover:bg-white/10 border-white/10 disabled:opacity-50'
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

          <button
            disabled={Boolean(activeRemoteOp)}
            onClick={() => runGitOp('Pull', ['pull'])}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition ${
              activeRemoteOp === 'pull'
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                : 'text-slate-200 bg-white/[0.04] hover:bg-white/10 border-white/10 disabled:opacity-50'
            }`}
            title="git pull"
          >
            {activeRemoteOp === 'pull' ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{activeRemoteOp === 'pull' ? 'Pulling...' : 'Pull'}</span>
          </button>

          <button
            disabled={Boolean(activeRemoteOp)}
            onClick={() => runGitOp('Push', ['push', '-u', 'origin', currentBranch])}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition ${
              activeRemoteOp === 'push'
                ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200'
                : 'text-slate-200 bg-white/[0.04] hover:bg-white/10 border-white/10 disabled:opacity-50'
            }`}
            title={`git push -u origin ${currentBranch}`}
          >
            {activeRemoteOp === 'push' ? (
              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            ) : (
              <ArrowUpFromLine className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{activeRemoteOp === 'push' ? 'Pushing...' : 'Push'}</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          <button
            onClick={() => setShowNewBranchModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
            title="Create New Branch"
          >
            <GitBranchPlus className="w-3.5 h-3.5 text-pink-400" />
            <span>Branch</span>
          </button>

          <button
            onClick={() => setShowStashModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
            title="Stash Working Tree Changes"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>Stash</span>
          </button>

          <button
            onClick={() => setWorkflowModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 transition"
            title="Git Workflows & Sequential Command Macros (e.g. fetch -p → pull origin main → push -f)"
          >
            <Workflow className="w-3.5 h-3.5 text-amber-400" />
            <span>Workflows</span>
          </button>

          {remoteInfo ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCreatePRModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-pink-200 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-400/30 transition"
                title="Create Pull Request / Merge Request"
              >
                <GitPullRequest className="w-3.5 h-3.5 text-pink-400" />
                <span>Create PR</span>
              </button>
              <button
                onClick={() => setPublishModalOpen(true)}
                className="p-1.5 rounded-lg text-slate-300 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
                title="Publish to Another Remote / Change Remote"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          ) : (
            activeTab && (
              <button
                onClick={() => setPublishModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 transition"
                title="Publish this local repository to GitHub, GitLab, or a Remote URL"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Publish Repo</span>
              </button>
            )
          )}

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
              <div className="flex items-center gap-1.5">
                {/* Split Button 1: Open in Code IDE */}
                <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/10 overflow-hidden">
                  <button
                    onClick={() => openActiveRepoInIde()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 transition"
                    title={`Open '${activeTab.name}' in ${activeIde?.name || shortIdeName}`}
                  >
                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="max-w-[85px] truncate">{shortIdeName}</span>
                  </button>
                  <button
                    onClick={() => setIdeModalOpen(true, 'ide')}
                    className="px-1.5 py-1.5 text-slate-400 hover:text-white hover:bg-white/10 border-l border-white/10 transition"
                    title="Select Code IDE for this Repository"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Split Button 2: Open in AI Harness */}
                <div className="flex items-center rounded-lg bg-purple-500/10 border border-purple-400/25 overflow-hidden">
                  <button
                    onClick={() => openActiveRepoInAiHarness()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-purple-200 hover:bg-purple-500/20 transition"
                    title={`Open '${activeTab.name}' in AI Harness: ${activeAi?.name || shortAiName}`}
                  >
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span className="max-w-[90px] truncate">{shortAiName}</span>
                  </button>
                  <button
                    onClick={() => setIdeModalOpen(true, 'ai-harness')}
                    className="px-1.5 py-1.5 text-purple-300 hover:text-white hover:bg-purple-500/20 border-l border-purple-400/25 transition"
                    title="Select AI Harness (Claude Code, Codex, Antigravity, Cursor, Aider) for this Repository"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })()}

          <button
            onClick={() => refreshActiveRepo()}
            className="p-1.5 rounded-lg text-slate-300 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
            title="Refresh Repository Graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={() => setConsoleOpen(!isConsoleOpen)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition ${
              isConsoleOpen
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
            }`}
            title="Toggle Git Command Log Console"
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            <span>Git Log</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Git Account & Identity Manager Button */}
          {(() => {
            const matchedAcc = accounts.find(
              (a) =>
                a.email.toLowerCase() ===
                gitIdentity.effectiveEmail.toLowerCase()
            );
            const avatar =
              matchedAcc?.avatarUrl ||
              (gitIdentity.effectiveEmail
                ? getAuthorAvatarUrl(
                    gitIdentity.effectiveEmail,
                    gitIdentity.effectiveName
                  )
                : null);
            const isLocalOverride = Boolean(gitIdentity.localEmail);

            return (
              <button
                onClick={() => setAccountModalOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs bg-white/[0.05] hover:bg-white/10 border border-white/15 transition"
                title={
                  gitIdentity.effectiveEmail
                    ? `Active Git Account: ${gitIdentity.effectiveName} <${gitIdentity.effectiveEmail}> (${
                        isLocalOverride ? 'Repo Local' : 'Global'
                      }) — Click to manage accounts`
                    : 'Manage Git Accounts & Login'
                }
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={gitIdentity.effectiveName || 'Account'}
                    className="w-4 h-4 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="font-medium text-slate-100 max-w-[100px] truncate">
                  {gitIdentity.effectiveName || 'Accounts'}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                    isLocalOverride
                      ? 'bg-sky-500/25 text-sky-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {isLocalOverride ? 'Repo' : `${accounts.length}`}
                </span>
              </button>
            );
          })()}
        </div>
      </header>

      {/* Modal: Open, Switch, or Clone Git Repository (Expanded Size) */}
      {isRepoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="w-full max-w-4xl min-h-[540px] max-h-[86vh] rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/30">
                  <FolderGit2 className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Open or Switch Git Repository
                  </h3>
                  <p className="text-xs text-slate-400">
                    Open a local Git repository, manage bookmarked repositories, or clone from remote URL
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Mode Tabs */}
                <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setRepoModalTab('open')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                      repoModalTab === 'open'
                        ? 'bg-sky-500/25 text-sky-200 font-medium border border-sky-400/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open & Bookmarks ({savedRepos.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepoModalTab('clone')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                      repoModalTab === 'clone'
                        ? 'bg-sky-500/25 text-sky-200 font-medium border border-sky-400/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    <span>Clone Repository</span>
                  </button>
                </div>

                {tabs.length > 0 && (
                  <button
                    onClick={() => setRepoModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            {repoModalTab === 'open' ? (
              <div className="flex-1 flex flex-col min-h-0 p-6 space-y-5">
                {/* Open Local Folder Bar */}
                <div className="rounded-xl bg-slate-950/60 border border-white/10 p-4">
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Open Repository from Local Path
                  </label>
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      placeholder="Paste local path (e.g. D:\working-tools\my-repo) or click Browse..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseFolder}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-100 border border-white/15 transition shrink-0"
                    >
                      <FolderOpen className="w-4 h-4 text-sky-400" />
                      <span>Browse Folder...</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (customPath.trim()) {
                          await openRepoTab(customPath.trim());
                          setCustomPath('');
                          setRepoModalOpen(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition shrink-0"
                    >
                      Open Repository
                    </button>
                  </div>
                </div>

                {/* Bookmarked / Recent Repositories List with Search & Delete */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Bookmarked & Recent Repositories
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-mono text-slate-300">
                        {filteredBookmarks.length}
                      </span>
                    </div>

                    {/* Bookmark Search Bar */}
                    <div className="relative w-72">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={bookmarkSearch}
                        onChange={(e) => setBookmarkSearch(e.target.value)}
                        placeholder="Search bookmarks by name or path..."
                        className="w-full pl-9 pr-7 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                      {bookmarkSearch && (
                        <button
                          onClick={() => setBookmarkSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredBookmarks.length === 0 ? (
                      <div className="h-48 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6">
                        <FolderGit2 className="w-8 h-8 text-slate-600 mb-2" />
                        <div className="text-xs font-medium text-slate-300">
                          {savedRepos.length === 0
                            ? 'No bookmarked repositories yet'
                            : 'No repositories match your search'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {savedRepos.length === 0
                            ? 'Click "Browse Folder..." above or switch to "Clone Repository" to get started.'
                            : 'Try another keyword or clear the search filter.'}
                        </div>
                      </div>
                    ) : (
                      filteredBookmarks.map((repo) => {
                        const isOpenedInTab = tabs.some(
                          (t) => t.path.toLowerCase() === repo.path.toLowerCase()
                        );
                        return (
                          <div
                            key={repo.path}
                            onClick={async () => {
                              await openRepoTab(repo.path);
                              setRepoModalOpen(false);
                            }}
                            className="group flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 cursor-pointer transition"
                          >
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="flex items-center gap-2.5">
                                <FolderGit2 className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="text-sm font-semibold text-white truncate">
                                  {repo.name}
                                </span>
                                {isOpenedInTab && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-medium">
                                    Active in Tab
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 font-mono truncate mt-1">
                                {repo.path}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span>Last opened: {formatLastOpened(repo.lastOpened)}</span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestConfirm({
                                    title: `Remove '${repo.name}' from Bookmarks`,
                                    description: `Remove '${repo.path}' from your bookmarked repositories list? (Files on disk will not be deleted.)`,
                                    confirmLabel: 'Remove Bookmark',
                                    variant: 'warning',
                                    onConfirm: () => {
                                      removeSavedRepo(repo.path);
                                    },
                                  });
                                }}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition"
                                title="Remove from bookmarks"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <span className="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 group-hover:bg-sky-600 group-hover:text-white text-xs font-medium transition">
                                Open →
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Clone Repository Tab */
              <form
                onSubmit={handleCloneSubmit}
                className="flex-1 flex flex-col justify-between p-6 space-y-5"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Remote Repository URL (HTTPS or SSH)
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={cloneUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCloneUrl(val);
                        const guessed = val
                          .trim()
                          .split('/')
                          .pop()
                          ?.replace(/\.git$/i, '');
                        if (guessed && !cloneFolderName) {
                          setCloneFolderName(guessed);
                        }
                      }}
                      placeholder="https://github.com/username/repository.git or git@github.com:username/repository.git"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Parent Destination Directory
                    </label>
                    <div className="flex gap-2.5">
                      <input
                        type="text"
                        required
                        value={cloneParentDir}
                        onChange={(e) => setCloneParentDir(e.target.value)}
                        placeholder="e.g. D:\working-tools"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleBrowseCloneParent}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-100 border border-white/15 transition shrink-0"
                      >
                        <FolderOpen className="w-4 h-4 text-sky-400" />
                        <span>Browse...</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Target Folder Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={cloneFolderName}
                      onChange={(e) => setCloneFolderName(e.target.value)}
                      placeholder="Auto-detected from repository URL"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                    />
                  </div>

                  {cloneParentDir.trim() && (
                    <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-3.5 text-xs text-sky-200">
                      <span className="text-slate-400">Will be cloned into: </span>
                      <code className="font-mono font-semibold text-sky-300">
                        {cloneParentDir.trim().replace(/[\\/]+$/, '')}
                        {cloneParentDir.includes('\\') ? '\\' : '/'}
                        {cloneFolderName.trim() ||
                          cloneUrl
                            .trim()
                            .split('/')
                            .pop()
                            ?.replace(/\.git$/i, '') ||
                          'repository'}
                      </code>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  {tabs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRepoModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={Boolean(runningOpLabel)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-sky-600/25 transition"
                  >
                    {runningOpLabel ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{runningOpLabel}...</span>
                      </>
                    ) : (
                      <>
                        <GitFork className="w-4 h-4" />
                        <span>Clone & Open Repository</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create New Branch */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreateBranch}
            className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                Create & Checkout New Branch
              </h3>
              <button
                type="button"
                onClick={() => setShowNewBranchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Branching from current HEAD (<code className="text-sky-300">{currentBranch}</code>)
            </p>
            <input
              type="text"
              autoFocus
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="feature/awesome-graph"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white mb-4 focus:outline-none focus:border-sky-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewBranchModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white"
              >
                Create Branch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Stash Changes */}
      {showStashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleStashPush}
            className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Stash Working Changes</h3>
              <button
                type="button"
                onClick={() => setShowStashModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Includes untracked files (<code>git stash push -u</code>)
            </p>
            <input
              type="text"
              autoFocus
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              placeholder="Optional stash message..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white mb-4 focus:outline-none focus:border-sky-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStashModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white"
              >
                Push Stash
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
