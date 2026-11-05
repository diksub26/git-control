import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderGit2,
  Plus,
  X,
  Search,
  Trash2,
  Clock,
  FolderOpen,
  GitFork,
  Users,
  Loader2,
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
    isLoading,
    activeRemoteOp,
    runningOpLabel,
    setRepoModalOpen,
    setAccountModalOpen,
    setActiveTab,
    closeRepoTab,
    openRepoTab,
    removeSavedRepo,
    cloneRepository,
    requestConfirm,
  } = useGitStore();

  const [repoModalTab, setRepoModalTab] = useState<'open' | 'clone'>('open');
  const [customPath, setCustomPath] = useState('');
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneParentDir, setCloneParentDir] = useState('');
  const [cloneFolderName, setCloneFolderName] = useState('');

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

  return (
    <>
      <header className="relative h-10 px-3 bg-slate-950/70 backdrop-blur-xl border-b border-white/10 flex items-center gap-2 select-none z-20 shrink-0">
        {(isLoading || activeRemoteOp || runningOpLabel) && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 via-indigo-400 to-emerald-400 animate-pulse z-30" />
        )}

        {/* App Brand */}
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

        {/* Static Open Repo Button (Pinned on the Left) */}
        <button
          onClick={() => setRepoModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-white/10 hover:text-white border border-white/10 transition shrink-0 shadow-sm"
          title="Open, Switch, or Clone Repository"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>Open Repo</span>
        </button>

        <div className="h-4 w-px bg-white/10 mx-0.5 shrink-0" />

        {/* Multi-Repo Tabs Container (Takes available width & scrolls horizontally) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1 rounded-lg text-xs cursor-pointer transition-all border shrink-0 ${
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
        </div>

        {/* Git Account & Identity Manager Button (Pinned on the Right) */}
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
            <div className="shrink-0 pl-1">
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
            </div>
          );
        })()}
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
    </>
  );
};
