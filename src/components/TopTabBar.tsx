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
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { openInExternalEditor, pickRepositoryFolder } from '../services/gitService';

export const TopTabBar: React.FC = () => {
  const {
    tabs,
    savedRepos,
    activeTabId,
    isLoading,
    isConsoleOpen,
    remoteInfo,
    currentBranch,
    setActiveTab,
    closeRepoTab,
    openRepoTab,
    refreshActiveRepo,
    runGitOp,
    setConsoleOpen,
  } = useGitStore();

  const [showRepoModal, setShowRepoModal] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showStashModal, setShowStashModal] = useState(false);
  const [stashMessage, setStashMessage] = useState('');

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleBrowseFolder = async () => {
    const picked = await pickRepositoryFolder();
    if (picked) {
      await openRepoTab(picked);
      setShowRepoModal(false);
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
      <header className="h-12 flex items-center justify-between px-3 bg-slate-950/60 backdrop-blur-xl border-b border-white/10 select-none z-20">
        {/* Left: App Brand & Multi-Repo Tabs */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-400/25 shrink-0">
            <FolderGit2 className="w-4 h-4 text-sky-400" />
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
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeRepoTab(tab.id);
                      }}
                      className="opacity-60 hover:opacity-100 hover:text-rose-400 p-0.5 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => setShowRepoModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
              title="Open or Switch Repository"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Open Repo</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Git Operations Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <button
            onClick={() => runGitOp('Fetch all remotes', ['fetch', '--all', '--prune'])}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
            title="git fetch --all --prune"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Fetch</span>
          </button>

          <button
            onClick={() => runGitOp('Pull', ['pull'])}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
            title="git pull"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pull</span>
          </button>

          <button
            onClick={() => runGitOp('Push', ['push', '-u', 'origin', currentBranch])}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
            title={`git push -u origin ${currentBranch}`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 text-indigo-400" />
            <span>Push</span>
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

          {remoteInfo && (
            <a
              href={
                remoteInfo.provider === 'github'
                  ? `${remoteInfo.webUrl}/compare/${currentBranch}?expand=1`
                  : `${remoteInfo.webUrl}`
              }
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 transition"
              title="Create Pull Request / Open Remote"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Create PR</span>
            </a>
          )}

          {activeTab && (
            <button
              onClick={() => openInExternalEditor(activeTab.path, undefined, 'vscode')}
              className="p-1.5 rounded-lg text-slate-300 bg-white/[0.04] hover:bg-white/10 border border-white/10 transition"
              title="Open Repository in VS Code"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
            </button>
          )}

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
        </div>
      </header>

      {/* Modal: Open Repository */}
      {showRepoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                Open or Switch Git Repository
              </h3>
              <button
                onClick={() => setShowRepoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Repository Local Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="e.g. D:\working-tools\my-project"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950/90 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={handleBrowseFolder}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 border border-white/15"
                  >
                    Browse...
                  </button>
                  <button
                    onClick={async () => {
                      if (customPath.trim()) {
                        await openRepoTab(customPath.trim());
                        setCustomPath('');
                        setShowRepoModal(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white"
                  >
                    Open
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">
                  Bookmarked / Recent Repositories
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {savedRepos.map((repo) => (
                    <div
                      key={repo.path}
                      onClick={async () => {
                        await openRepoTab(repo.path);
                        setShowRepoModal(false);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/10 border border-white/5 cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-200">
                          {repo.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {repo.path}
                        </div>
                      </div>
                      <span className="text-[11px] text-sky-400">Open →</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
