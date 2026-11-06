import React, { useState, useRef, useEffect } from 'react';
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
  GitBranch,
  Copy,
  Check,
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
    closeOtherTabs,
    closeTabsToTheRight,
    openRepoTab,
    removeSavedRepo,
    cloneRepository,
    requestConfirm,
    showToast,
  } = useGitStore();

  const [repoModalTab, setRepoModalTab] = useState<'open' | 'clone'>('open');
  const [customPath, setCustomPath] = useState('');
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneParentDir, setCloneParentDir] = useState('');
  const [cloneFolderName, setCloneFolderName] = useState('');
  const [tabContextMenu, setTabContextMenu] = useState<{
    tab: (typeof tabs)[0];
    x: number;
    y: number;
  } | null>(null);

  const activeTabRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active tab into view when activeTabId changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeTabId]);

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
        <div
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5"
          role="tablist"
          aria-label="Repository tabs"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => setActiveTab(tab.id)}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeRepoTab(tab.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTabContextMenu({
                    tab,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(tab.id);
                  }
                }}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-all border shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-b from-sky-500/15 via-slate-900/95 to-slate-950 text-white border-sky-400/40 shadow-[0_2px_12px_rgba(2,132,199,0.22)] ring-1 ring-sky-400/20'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:border-white/15 hover:text-slate-200'
                }`}
                title={`${tab.name}\n${tab.path}\nBranch: ${
                  tab.isHeadDetached && tab.headHash
                    ? `HEAD (${tab.headHash.slice(0, 7)})`
                    : tab.currentBranch || 'HEAD'
                }${tab.uncommittedCount ? `\nUncommitted files: ${tab.uncommittedCount}` : ''}${
                  tab.conflictCount ? `\nConflicts: ${tab.conflictCount}` : ''
                }\n\nTip: Middle-click to close, right-click for options`}
              >
                {/* Active Top Accent Line */}
                {isActive && (
                  <div className="absolute -top-[1px] inset-x-2.5 h-[2px] bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.9)] z-10" />
                )}

                {/* Status Dot & Repo Folder Icon */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isActive ? (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                    </span>
                  ) : null}
                  <FolderGit2
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isActive
                        ? 'text-sky-400 drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]'
                        : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                </div>

                {/* Repository Name */}
                <span
                  className={`truncate max-w-[130px] transition-colors ${
                    isActive
                      ? 'font-semibold text-white tracking-tight'
                      : 'font-medium text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {tab.name}
                </span>

                {/* Branch Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] transition-all ${
                    tab.isHeadDetached
                      ? isActive
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 font-medium'
                        : 'bg-amber-500/10 text-amber-300/80 border border-amber-400/20'
                      : isActive
                        ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40 font-medium shadow-xs'
                        : 'bg-white/[0.04] text-slate-400 border border-white/5 group-hover:bg-white/[0.08] group-hover:text-slate-300'
                  }`}
                >
                  <GitBranch
                    className={`w-2.5 h-2.5 shrink-0 ${
                      tab.isHeadDetached
                        ? isActive
                          ? 'text-amber-300'
                          : 'text-amber-400/70'
                        : isActive
                          ? 'text-sky-300'
                          : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <span className="truncate max-w-[90px]">
                    {tab.isHeadDetached && tab.headHash
                      ? `HEAD (${tab.headHash.slice(0, 7)})`
                      : tab.currentBranch || 'HEAD'}
                  </span>
                </span>

                {/* Uncommitted Changes Badge */}
                {tab.uncommittedCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] transition-colors ${
                      isActive
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/35 font-semibold'
                        : 'bg-amber-500/10 text-amber-300/75 border border-amber-400/20 font-normal'
                    }`}
                    title={`${tab.uncommittedCount} uncommitted files`}
                  >
                    *{tab.uncommittedCount}
                  </span>
                )}

                {/* Conflict Badge */}
                {tab.conflictCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40 animate-pulse'
                        : 'bg-rose-500/15 text-rose-300/80 border border-rose-400/20'
                    }`}
                    title={`${tab.conflictCount} merge conflicts`}
                  >
                    !{tab.conflictCount}
                  </span>
                )}

                {/* Close Tab Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeRepoTab(tab.id);
                  }}
                  className={`p-0.5 rounded transition ${
                    isActive
                      ? 'text-slate-400 hover:text-rose-400 hover:bg-white/10'
                      : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 hover:bg-white/10'
                  }`}
                  title="Close repository tab (Middle-click)"
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

      {/* Tab Context Menu (Rendered via Portal to escape backdrop-filter containing block) */}
      {tabContextMenu &&
        createPortal(
          <div
            className="fixed inset-0 z-50 select-none"
            onClick={() => setTabContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setTabContextMenu(null);
            }}
          >
            <div
              style={{
                top: Math.min(tabContextMenu.y, window.innerHeight - 220),
                left: Math.min(tabContextMenu.x, window.innerWidth - 240),
              }}
              onClick={(e) => e.stopPropagation()}
              className="fixed w-56 py-1.5 rounded-xl bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-xl text-xs text-slate-200 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
            >
              {/* Tab Header / Info */}
              <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between gap-2 text-slate-400">
                <span className="font-semibold text-white truncate max-w-[140px]">
                  {tabContextMenu.tab.name}
                </span>
                <span className="font-mono text-[10px] text-sky-400 truncate max-w-[70px]">
                  {tabContextMenu.tab.currentBranch || 'HEAD'}
                </span>
              </div>

              {/* Action: Switch to Tab (if inactive) */}
              {tabContextMenu.tab.id !== activeTabId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(tabContextMenu.tab.id);
                    setTabContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-500/20 hover:text-white flex items-center gap-2 transition"
                >
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                  <span>Switch to Repository</span>
                </button>
              )}

              {/* Action: Copy Repo Path */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(tabContextMenu.tab.path);
                    showToast('Repository path copied to clipboard', 'success');
                  } catch {
                    showToast('Failed to copy repository path', 'error');
                  }
                  setTabContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-white/10 hover:text-white flex items-center gap-2 transition"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Repository Path</span>
              </button>

              <div className="h-px bg-white/10 my-1" />

              {/* Action: Close Tab */}
              <button
                type="button"
                onClick={() => {
                  closeRepoTab(tabContextMenu.tab.id);
                  setTabContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-500/20 hover:text-rose-300 flex items-center gap-2 transition"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Close Tab</span>
              </button>

              {/* Action: Close Other Tabs */}
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    closeOtherTabs(tabContextMenu.tab.id);
                    setTabContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-500/20 hover:text-rose-300 flex items-center gap-2 transition"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  <span>Close Other Tabs</span>
                </button>
              )}

              {/* Action: Close Tabs to the Right */}
              {tabs.findIndex((t) => t.id === tabContextMenu.tab.id) < tabs.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    closeTabsToTheRight(tabContextMenu.tab.id);
                    setTabContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-500/20 hover:text-rose-300 flex items-center gap-2 transition"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  <span>Close Tabs to the Right</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
