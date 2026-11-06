import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  GitBranch,
  Tag as TagIcon,
  Archive,
  Globe,
  Copy,
  GitMerge,
  GitPullRequestDraft,
  RotateCcw,
  Undo2,
  PlusCircle,
  ExternalLink,
  Check,
  Sparkles,
  ChevronDown,
  Radio,
  Calendar,
  X,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { useShallow } from 'zustand/react/shallow';
import {
  buildSvgLinkPath,
  computeGitGraph,
  GRAPH_COLORS,
} from '../utils/graphLayout';
import { getAuthorAvatarUrl } from '../utils/avatar';
import { GitCommit, GitRef } from '../types/git';

const ROW_HEIGHT = 34;
const COL_WIDTH = 18;
const PAD_LEFT = 18;

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface ContextMenuState {
  x: number;
  y: number;
  commit: GitCommit;
  targetRef?: GitRef;
}

export const GitGraphView: React.FC = () => {
  const {
  activeTabId,
  commits,
  refs,
  currentBranch,
  headHash,
  isHeadDetached,
  remoteInfo,
  selectedBranches,
  searchQuery,
  dateSince,
  dateUntil,
  commitOrdering,
  firstParentOnly,
  showAvatars,
  selectedCommitHash,
  compareCommitHash,
  toggleBranchSelection,
  clearBranchSelection,
  setSearchQuery,
  setDateRange,
  clearDateRange,
  setCommitOrdering,
  setFirstParentOnly,
  setShowAvatars,
  selectCommit,
  runGitOp,
  showToast,
  requestConfirm,
} = useGitStore(
  useShallow((s) => ({ activeTabId: s.activeTabId, commits: s.commits, refs: s.refs, currentBranch: s.currentBranch, headHash: s.headHash, isHeadDetached: s.isHeadDetached, remoteInfo: s.remoteInfo, selectedBranches: s.selectedBranches, searchQuery: s.searchQuery, dateSince: s.dateSince, dateUntil: s.dateUntil, commitOrdering: s.commitOrdering, firstParentOnly: s.firstParentOnly, showAvatars: s.showAvatars, selectedCommitHash: s.selectedCommitHash, compareCommitHash: s.compareCommitHash, toggleBranchSelection: s.toggleBranchSelection, clearBranchSelection: s.clearBranchSelection, setSearchQuery: s.setSearchQuery, setDateRange: s.setDateRange, clearDateRange: s.clearDateRange, setCommitOrdering: s.setCommitOrdering, setFirstParentOnly: s.setFirstParentOnly, setShowAvatars: s.setShowAvatars, selectCommit: s.selectCommit, runGitOp: s.runGitOp, showToast: s.showToast, requestConfirm: s.requestConfirm }))
);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [promptDialog, setPromptDialog] = useState<{
    title: string;
    placeholder: string;
    commitHash: string;
    oldBranchName?: string;
    mode: 'branch' | 'tag' | 'rename-branch';
  } | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [orderDropdownRect, setOrderDropdownRect] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [dateDropdownRect, setDateDropdownRect] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [tempSince, setTempSince] = useState(dateSince);
  const [tempUntil, setTempUntil] = useState(dateUntil);
  const dateBtnRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    if (!contextMenu) return;
    const el = menuRef.current;
    const menuWidth = el?.offsetWidth || 256;
    const menuHeight = el?.offsetHeight || 340;
    const pad = 8;

    let left = contextMenu.x;
    let top = contextMenu.y;

    if (left + menuWidth > window.innerWidth - pad) {
      left = Math.max(pad, contextMenu.x - menuWidth);
    }
    if (top + menuHeight > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - menuHeight - pad);
    }

    setMenuPos({ left, top });
  }, [contextMenu]);

  useEffect(() => {
    setContextMenu(null);
    setOrderDropdownRect(null);
    setDateDropdownRect(null);
  }, [activeTabId]);

  useEffect(() => {
    if (!contextMenu && !orderDropdownRect && !dateDropdownRect) return;
    const closeAll = () => {
      setContextMenu(null);
      setOrderDropdownRect(null);
      setDateDropdownRect(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    window.addEventListener('click', closeAll);
    window.addEventListener('resize', closeAll);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', closeAll);
      window.removeEventListener('resize', closeAll);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu, orderDropdownRect, dateDropdownRect]);

  // Compute full graph layout from commits
  const graph = useMemo(() => computeGitGraph(commits), [commits]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setViewportHeight(entry.contentRect.height);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalNodes = graph.nodes.length;
  const totalHeight = totalNodes * ROW_HEIGHT;
  const OVERSCAN = 15;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalNodes - 1,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
  );

  const visibleNodes = useMemo(() => {
    if (totalNodes === 0) return [];
    return graph.nodes.slice(startIndex, endIndex + 1);
  }, [graph.nodes, startIndex, endIndex, totalNodes]);

  const visibleLinks = useMemo(() => {
    if (graph.links.length === 0) return [];
    return graph.links.filter(
      (link) =>
        Math.min(link.fromRow, link.toRow) <= endIndex &&
        Math.max(link.fromRow, link.toRow) >= startIndex
    );
  }, [graph.links, startIndex, endIndex]);

  // Smoothly scroll to selected commit if outside viewport
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedCommitHash || selectedCommitHash === prevSelectedRef.current) return;
    prevSelectedRef.current = selectedCommitHash;
    const targetIdx = graph.nodes.findIndex((n) => n.commit.hash === selectedCommitHash);
    if (targetIdx !== -1 && scrollContainerRef.current) {
      const targetTop = targetIdx * ROW_HEIGHT;
      const currentScroll = scrollContainerRef.current.scrollTop;
      if (
        targetTop < currentScroll ||
        targetTop > currentScroll + viewportHeight - ROW_HEIGHT * 2
      ) {
        scrollContainerRef.current.scrollTo({
          top: Math.max(0, targetTop - viewportHeight / 3),
          behavior: 'smooth',
        });
      }
    }
  }, [selectedCommitHash, graph.nodes, viewportHeight]);

  const graphColumnPixelWidth = Math.max(
    graph.maxColumns * COL_WIDTH + PAD_LEFT * 2,
    96
  );

  // Filter matching rows for search query highlight
  const isDateFiltered = Boolean(dateSince || dateUntil);
  const dateFilterLabel = useMemo(() => {
    if (!dateSince && !dateUntil) return 'Date Range';
    const today = toLocalDateString(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDateString(yesterdayDate);

    const d7 = new Date();
    d7.setDate(d7.getDate() - 6);
    const last7 = toLocalDateString(d7);

    const d30 = new Date();
    d30.setDate(d30.getDate() - 29);
    const last30 = toLocalDateString(d30);

    const now = new Date();
    const monthStart = toLocalDateString(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );

    if (dateSince === today && dateUntil === today) return 'Today';
    if (dateSince === yesterday && dateUntil === yesterday) return 'Yesterday';
    if (dateSince === last7 && dateUntil === today) return 'Last 7 Days';
    if (dateSince === last30 && dateUntil === today) return 'Last 30 Days';
    if (dateSince === monthStart && dateUntil === today) return 'This Month';
    if (dateSince && dateUntil) return `${dateSince} – ${dateUntil}`;
    if (dateSince) return `From ${dateSince}`;
    if (dateUntil) return `Until ${dateUntil}`;
    return 'Date Filtered';
  }, [dateSince, dateUntil]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchingHashes = useMemo(() => {
    if (!normalizedQuery) return null;
    const set = new Set<string>();
    for (const c of commits) {
      if (
        c.subject.toLowerCase().includes(normalizedQuery) ||
        c.hash.toLowerCase().includes(normalizedQuery) ||
        c.authorName.toLowerCase().includes(normalizedQuery) ||
        c.refs.some((r) => r.name.toLowerCase().includes(normalizedQuery))
      ) {
        set.add(c.hash);
      }
    }
    return set;
  }, [commits, normalizedQuery]);

  const formatCommitDate = (unixSec: number) => {
    if (!unixSec) return '';
    const d = new Date(unixSec * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  const localBranches = refs.filter((r) => r.type === 'local-branch');
  const remoteBranches = refs.filter((r) => r.type === 'remote-branch');

  const handleContextMenu = (
    e: React.MouseEvent,
    commit: GitCommit,
    targetRef?: GitRef
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ left: e.clientX, top: e.clientY });
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      commit,
      targetRef,
    });
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptDialog || !promptValue.trim()) return;
    if (promptDialog.mode === 'branch') {
      await runGitOp(`Created branch ${promptValue.trim()}`, [
        'checkout',
        '-b',
        promptValue.trim(),
        promptDialog.commitHash,
      ]);
    } else if (promptDialog.mode === 'rename-branch' && promptDialog.oldBranchName) {
      await runGitOp(
        `Renamed branch ${promptDialog.oldBranchName} → ${promptValue.trim()}`,
        ['branch', '-m', promptDialog.oldBranchName, promptValue.trim()]
      );
    } else {
      await runGitOp(`Created tag ${promptValue.trim()}`, [
        'tag',
        promptValue.trim(),
        promptDialog.commitHash,
      ]);
    }
    setPromptValue('');
    setPromptDialog(null);
  };

  return (
    <section
      onClick={() => {
        setContextMenu(null);
        setOrderDropdownRect(null);
      }}
      className="flex-1 h-full flex flex-col min-w-0 bg-slate-950/25 select-none"
    >
      {/* vscode-git-graph Control & Filter Bar */}
      <div className="h-9 px-3 flex items-center justify-between gap-2 bg-slate-950/50 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find commit, hash, author, message..."
              className="w-full pl-8 pr-6 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            {matchingHashes && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-sky-400">
                {matchingHashes.size}
              </span>
            )}
          </div>

          {/* Date Range Filter Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              ref={dateBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                if (dateDropdownRect) {
                  setDateDropdownRect(null);
                } else {
                  setOrderDropdownRect(null);
                  setTempSince(dateSince);
                  setTempUntil(dateUntil);
                  const r = e.currentTarget.getBoundingClientRect();
                  const popoverWidth = 288;
                  let left = r.left;
                  if (left + popoverWidth > window.innerWidth - 12) {
                    left = Math.max(12, window.innerWidth - popoverWidth - 12);
                  }
                  setDateDropdownRect({ left, top: r.bottom + 6 });
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition border cursor-pointer ${
                isDateFiltered
                  ? 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-400/40 text-sky-200 font-medium shadow-sm shadow-sky-500/10'
                  : 'bg-white/[0.05] hover:bg-white/10 border-white/10 text-slate-300'
              }`}
              title="Filter commits by date range"
            >
              <Calendar
                className={`w-3.5 h-3.5 ${
                  isDateFiltered ? 'text-sky-400' : 'text-slate-400'
                }`}
              />
              <span className="whitespace-nowrap">{dateFilterLabel}</span>
              {isDateFiltered ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await clearDateRange();
                  }}
                  className="ml-0.5 p-0.5 rounded hover:bg-sky-500/30 text-sky-300 hover:text-white cursor-pointer"
                  title="Clear date filter"
                >
                  <X className="w-3 h-3" />
                </span>
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Order & View Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Commit Ordering Custom Dropdown */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (orderDropdownRect) {
                setOrderDropdownRect(null);
              } else {
                const r = e.currentTarget.getBoundingClientRect();
                setOrderDropdownRect({ left: r.left, top: r.bottom + 6 });
              }
            }}
            className="flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 transition"
            title="Commit Ordering"
          >
            <span>
              {commitOrdering === 'topo'
                ? 'Topo Order'
                : commitOrdering === 'author-date'
                ? 'Author Date'
                : 'Date Order'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* First-Parent Toggle */}
          <button
            onClick={() => setFirstParentOnly(!firstParentOnly)}
            className={`px-2 py-1 rounded-lg text-xs border transition ${
              firstParentOnly
                ? 'bg-indigo-500/25 border-indigo-400/40 text-indigo-200'
                : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Show only first-parent commits"
          >
            1st Parent
          </button>

          {/* Avatars Toggle */}
          <button
            onClick={() => setShowAvatars(!showAvatars)}
            className={`px-2 py-1 rounded-lg text-xs border transition ${
              showAvatars
                ? 'bg-emerald-500/20 border-emerald-400/35 text-emerald-200'
                : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Author Avatars in Graph"
          >
            Avatars
          </button>
        </div>
      </div>

      {/* Table Column Header */}
      <div className="h-7 px-2 flex items-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-white/10 shrink-0">
        <div style={{ width: graphColumnPixelWidth }} className="shrink-0 pl-2">
          Graph
        </div>
        <div className="flex-1 min-w-0 px-2 flex items-center justify-between">
          <span>Description</span>
          <span className="text-[10px] font-normal normal-case text-slate-500 hidden xl:inline">
            Tip: Right-click any commit/branch for actions • Ctrl+Click to compare 2 commits
          </span>
        </div>
        <div className="w-36 shrink-0 px-2">Date</div>
        <div className="w-40 shrink-0 px-2">Author</div>
        <div className="w-20 shrink-0 px-2 text-right">Commit</div>
      </div>

      {/* Scrollable Graph Canvas + Commit Rows */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => {
          if (contextMenu) setContextMenu(null);
          setScrollTop(e.currentTarget.scrollTop);
        }}
        className="flex-1 overflow-auto relative"
      >
        {totalNodes === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-slate-400 select-none">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3 text-slate-500">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="text-sm font-medium text-slate-200">
              {isDateFiltered
                ? 'No commits found in this date range'
                : 'No commits found'}
            </div>
            <div className="text-xs text-slate-500 mt-1 max-w-sm">
              {isDateFiltered ? (
                <span>
                  No commits match the selected date window ({dateFilterLabel}). Try adjusting the dates or{' '}
                  <button
                    type="button"
                    onClick={() => clearDateRange()}
                    className="text-sky-400 underline hover:text-sky-300 inline font-medium cursor-pointer"
                  >
                    reset date filter
                  </button>
                  .
                </span>
              ) : (
                'There are no commits to display for the current branch filter.'
              )}
            </div>
          </div>
        ) : (
        <div
          className="relative min-w-[680px]"
          style={{ height: totalHeight }}
        >
          {/* SVG Layer for Graph Paths & Commit Vertices */}
          <svg
            width={graphColumnPixelWidth}
            height={totalHeight}
            className="absolute top-0 left-0 pointer-events-none z-10"
          >
            {/* 1. Render connecting branch/merge paths within visible range */}
            {visibleLinks.map((link, idx) => {
              const strokeColor = link.isUncommitted
                ? '#94a3b8'
                : GRAPH_COLORS[link.colorIndex % GRAPH_COLORS.length];
              const d = buildSvgLinkPath(
                link,
                ROW_HEIGHT,
                COL_WIDTH,
                PAD_LEFT,
                'angular'
              );
              return (
                <path
                  key={`link-${link.fromRow}-${link.fromCol}-${link.toRow}-${link.toCol}-${idx}`}
                  d={d}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={link.isUncommitted ? '4 3' : undefined}
                />
              );
            })}

            {/* 2. Render Commit Vertex Nodes within visible range */}
            {visibleNodes.map((node) => {
              const cx = PAD_LEFT + node.col * COL_WIDTH;
              const cy = node.row * ROW_HEIGHT + ROW_HEIGHT / 2;
              const color = node.commit.isUncommitted
                ? '#fbbf24'
                : GRAPH_COLORS[node.colorIndex % GRAPH_COLORS.length];
              const isSelected =
                selectedCommitHash === node.commit.hash ||
                compareCommitHash === node.commit.hash;
              const isHeadCommit = Boolean(headHash && node.commit.hash === headHash);
              const isMerge = node.commit.parents.length > 1;

              return (
                <g key={`node-${node.commit.hash}`}>
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHeadCommit ? 11 : 8.5}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      opacity={0.85}
                    />
                  )}
                  {/* Current Active HEAD Marker (Pulsing Halo & Center Bullseye) */}
                  {isHeadCommit && (
                    <>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={8}
                        fill="none"
                        stroke={isHeadDetached ? '#f59e0b' : '#38bdf8'}
                        strokeWidth={2}
                        strokeDasharray={isHeadDetached ? '3 2' : undefined}
                        opacity={0.95}
                        className="animate-pulse"
                      />
                      {!node.commit.isUncommitted && (
                        <circle cx={cx} cy={cy} r={1.6} fill="#ffffff" />
                      )}
                    </>
                  )}
                  {node.commit.isUncommitted ? (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#0f172a"
                      stroke="#fbbf24"
                      strokeWidth={2.4}
                      strokeDasharray="2 1"
                    />
                  ) : node.commit.isStash ? (
                    <rect
                      x={cx - 4.5}
                      y={cy - 4.5}
                      width={9}
                      height={9}
                      rx={2}
                      fill="#0f172a"
                      stroke="#f59e0b"
                      strokeWidth={2.2}
                    />
                  ) : isMerge ? (
                    <>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5.2}
                        fill="#0f172a"
                        stroke={color}
                        strokeWidth={2.2}
                      />
                      <circle cx={cx} cy={cy} r={2.3} fill={color} />
                    </>
                  ) : (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4.4}
                      fill={color}
                      stroke="#090d16"
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Virtualized Commit Table Rows */}
          {visibleNodes.map((node) => {
            const { commit, colorIndex, row } = node;
            const laneColor =
              GRAPH_COLORS[colorIndex % GRAPH_COLORS.length];
            const isPrimarySelected = selectedCommitHash === commit.hash;
            const isCompareSelected = compareCommitHash === commit.hash;
            const isHeadCommit = Boolean(headHash && commit.hash === headHash);
            const isSearchDimmed =
              matchingHashes !== null && !matchingHashes.has(commit.hash);

            return (
              <div
                key={commit.hash}
                style={{
                  height: ROW_HEIGHT,
                  position: 'absolute',
                  top: row * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                }}
                onClick={(e) =>
                  selectCommit(commit.hash, e.ctrlKey || e.metaKey)
                }
                onContextMenu={(e) => handleContextMenu(e, commit)}
                className={`flex items-center px-2 text-xs cursor-pointer border-b border-white/[0.03] transition-colors ${
                  isHeadCommit
                    ? isHeadDetached
                      ? 'border-l-2 border-l-amber-400 bg-amber-500/[0.06]'
                      : 'border-l-2 border-l-sky-400 bg-sky-500/[0.04]'
                    : 'border-l-2 border-l-transparent'
                } ${
                  isPrimarySelected
                    ? 'bg-sky-500/20 text-white'
                    : isCompareSelected
                    ? 'bg-purple-500/20 text-white'
                    : commit.isUncommitted
                    ? 'bg-amber-500/[0.07] hover:bg-amber-500/15 text-amber-100'
                    : 'hover:bg-white/[0.06] text-slate-200'
                } ${isSearchDimmed ? 'opacity-30' : 'opacity-100'}`}
              >
                {/* Spacer matching SVG Graph Column Width */}
                <div
                  style={{ width: graphColumnPixelWidth }}
                  className="shrink-0 h-full"
                />

                {/* Description + Inline Branch/Tag/Remote Badges */}
                <div className="flex-1 min-w-0 px-2 flex items-center gap-1.5 overflow-hidden">
                  {/* Compare Badge */}
                  {isPrimarySelected && compareCommitHash && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/30 border border-sky-400/50 text-[10px] font-semibold text-sky-200 shrink-0">
                      BASE
                    </span>
                  )}
                  {isCompareSelected && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/30 border border-purple-400/50 text-[10px] font-semibold text-purple-200 shrink-0">
                      COMPARE
                    </span>
                  )}

                  {/* Ref Badges (Branches, Remotes, Tags, Stashes, HEAD) */}
                  {commit.refs.map((ref) => (
                    <span
                      key={ref.fullName}
                      onContextMenu={(e) => handleContextMenu(e, commit, ref)}
                      style={
                        ref.type === 'local-branch'
                          ? {
                              borderColor: laneColor,
                              backgroundColor: `${laneColor}28`,
                            }
                          : undefined
                      }
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0 border ${
                        ref.type === 'head'
                          ? 'bg-amber-500/25 border-amber-400/50 text-amber-200 shadow-sm shadow-amber-500/10 font-semibold'
                          : ref.type === 'local-branch'
                          ? 'text-white shadow-sm'
                          : ref.type === 'remote-branch'
                          ? 'bg-slate-800/90 border-white/15 text-slate-300'
                          : ref.type === 'tag'
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                          : 'bg-orange-500/20 border-orange-400/40 text-orange-200'
                      }`}
                    >
                      {ref.type === 'head' && (
                        <Radio className="w-3 h-3 shrink-0 text-amber-300 animate-pulse" />
                      )}
                      {ref.type === 'local-branch' && (
                        <GitBranch className="w-3 h-3 shrink-0" />
                      )}
                      {ref.type === 'remote-branch' && (
                        <Globe className="w-3 h-3 shrink-0 text-indigo-300" />
                      )}
                      {ref.type === 'tag' && (
                        <TagIcon className="w-3 h-3 shrink-0 text-amber-300" />
                      )}
                      {ref.type === 'stash' && (
                        <Archive className="w-3 h-3 shrink-0 text-orange-300" />
                      )}
                      <span>
                        {ref.type === 'head'
                          ? ref.name
                          : ref.isCurrentHead
                          ? `HEAD → ${ref.name}`
                          : ref.name}
                      </span>
                    </span>
                  ))}

                  {/* Commit Subject */}
                  <span
                    className={`truncate ${
                      commit.isUncommitted
                        ? 'font-semibold italic text-amber-300'
                        : isHeadCommit || commit.refs.some((r) => r.isCurrentHead)
                        ? 'font-semibold text-white'
                        : ''
                    }`}
                  >
                    {commit.subject}
                  </span>
                </div>

                {/* Date */}
                <div className="w-36 shrink-0 px-2 font-mono text-[11px] text-slate-400">
                  {commit.isUncommitted
                    ? 'Pending'
                    : formatCommitDate(commit.commitDate)}
                </div>

                {/* Author + Avatar */}
                <div className="w-40 shrink-0 px-2 flex items-center gap-2 min-w-0">
                  {!commit.isUncommitted && showAvatars && (
                    <img
                      src={getAuthorAvatarUrl(
                        commit.authorName,
                        commit.authorEmail
                      )}
                      alt={commit.authorName}
                      className="w-4 h-4 rounded-full shrink-0 object-cover border border-white/15"
                    />
                  )}
                  <span className="truncate text-slate-300 text-[11px]">
                    {commit.authorName}
                  </span>
                </div>

                {/* Short Hash */}
                <div className="w-24 shrink-0 px-2 text-right font-mono text-[11px]">
                  {isHeadCommit ? (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold ${
                        isHeadDetached
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                      }`}
                      title={`Active HEAD (${isHeadDetached ? 'Detached at ' + commit.shortHash : currentBranch})`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {commit.shortHash}
                    </span>
                  ) : (
                    <span className="text-slate-400">{commit.shortHash}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Right-Click Context Menu rendered via Portal to document.body so backdrop-blur does not offset fixed coordinates */}
      {contextMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed z-[9999] w-64 rounded-xl bg-slate-900/95 border border-white/15 shadow-2xl py-1.5 text-xs text-slate-200 select-none"
          >
          <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between">
            <span className="font-mono text-[11px] text-sky-400">
              {contextMenu.targetRef
                ? contextMenu.targetRef.name
                : contextMenu.commit.shortHash}
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
              {contextMenu.commit.subject}
            </span>
          </div>

          {contextMenu.commit.isStash ? (
            <>
              <button
                onClick={() => {
                  runGitOp('Pop stash', [
                    'stash',
                    'pop',
                    contextMenu.commit.stashSelector!,
                  ]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pop Stash ({contextMenu.commit.stashSelector})</span>
              </button>
              <button
                onClick={() => {
                  runGitOp('Apply stash', [
                    'stash',
                    'apply',
                    contextMenu.commit.stashSelector!,
                  ]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <Check className="w-3.5 h-3.5 text-sky-400" />
                <span>Apply Stash</span>
              </button>
              <button
                onClick={() => {
                  const selector = contextMenu.commit.stashSelector!;
                  const subject = contextMenu.commit.subject;
                  setContextMenu(null);
                  requestConfirm({
                    title: `Drop Stash '${selector}'`,
                    description: `Are you sure you want to permanently drop stash '${selector}' (${subject})? This action cannot be undone.`,
                    confirmLabel: 'Drop Stash',
                    variant: 'danger',
                    commandPreview: `git stash drop ${selector}`,
                    onConfirm: async () => {
                      await runGitOp('Drop stash', ['stash', 'drop', selector]);
                    },
                  });
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-rose-500/20 text-rose-300 flex items-center gap-2"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Drop Stash</span>
              </button>
            </>
          ) : !contextMenu.commit.isUncommitted ? (
            <>
              {/* Checkout Branch or Commit */}
              {(() => {
                const isCurrentTarget =
                  (contextMenu.targetRef?.type === 'local-branch' &&
                    contextMenu.targetRef.name === currentBranch) ||
                  contextMenu.targetRef?.type === 'head' ||
                  (!contextMenu.targetRef && contextMenu.commit.hash === headHash);

                return isCurrentTarget ? (
                  <div className="w-full px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 flex items-center gap-2 select-none border-b border-white/5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-medium">
                      Currently Checked Out (
                      {isHeadDetached
                        ? `HEAD @ ${contextMenu.commit.shortHash}`
                        : currentBranch}
                      )
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const target =
                        contextMenu.targetRef?.type === 'local-branch'
                          ? contextMenu.targetRef.name
                          : contextMenu.commit.hash;
                      runGitOp(`Checkout ${target}`, ['checkout', target]);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Checkout{' '}
                      {contextMenu.targetRef?.type === 'local-branch'
                        ? `Branch '${contextMenu.targetRef.name}'`
                        : `Commit (${contextMenu.commit.shortHash})`}
                    </span>
                  </button>
                );
              })()}

              {/* Create Branch Here */}
              <button
                onClick={() => {
                  setPromptDialog({
                    title: `Create Branch at ${contextMenu.commit.shortHash}`,
                    placeholder: 'feature/new-branch',
                    commitHash: contextMenu.commit.hash,
                    mode: 'branch',
                  });
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>Create Branch Here...</span>
              </button>

              {/* Create Tag Here */}
              <button
                onClick={() => {
                  setPromptDialog({
                    title: `Create Tag at ${contextMenu.commit.shortHash}`,
                    placeholder: 'v1.0.0',
                    commitHash: contextMenu.commit.hash,
                    mode: 'tag',
                  });
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <TagIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Create Tag Here...</span>
              </button>

              {contextMenu.targetRef?.type === 'local-branch' && (
                <>
                  <button
                    onClick={() => {
                      setPromptValue(contextMenu.targetRef!.name);
                      setPromptDialog({
                        title: `Rename Branch '${contextMenu.targetRef!.name}'`,
                        placeholder: 'new-branch-name',
                        commitHash: contextMenu.commit.hash,
                        oldBranchName: contextMenu.targetRef!.name,
                        mode: 'rename-branch',
                      });
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                    <span>Rename Branch '{contextMenu.targetRef.name}'...</span>
                  </button>
                  {!contextMenu.targetRef.isCurrentHead && (
                    <button
                      onClick={() => {
                        const branchName = contextMenu.targetRef!.name;
                        setContextMenu(null);
                        requestConfirm({
                          title: `Delete Branch '${branchName}'`,
                          description: `Are you sure you want to force-delete local branch '${branchName}'? Unmerged commits on this branch may become unreachable.`,
                          confirmLabel: 'Delete Branch',
                          variant: 'danger',
                          commandPreview: `git branch -D ${branchName}`,
                          onConfirm: async () => {
                            await runGitOp(`Delete branch ${branchName}`, [
                              'branch',
                              '-D',
                              branchName,
                            ]);
                          },
                        });
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-rose-500/20 text-rose-300 flex items-center gap-2"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Delete Branch '{contextMenu.targetRef.name}'</span>
                    </button>
                  )}
                </>
              )}

              {contextMenu.targetRef?.type === 'tag' && (
                <>
                  <button
                    onClick={() => {
                      runGitOp(`Push tag ${contextMenu.targetRef!.name}`, [
                        'push',
                        'origin',
                        contextMenu.targetRef!.name,
                      ]);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Push Tag '{contextMenu.targetRef.name}' to Origin</span>
                  </button>
                  <button
                    onClick={() => {
                      const tagName = contextMenu.targetRef!.name;
                      setContextMenu(null);
                      requestConfirm({
                        title: `Delete Tag '${tagName}'`,
                        description: `Are you sure you want to delete local tag '${tagName}'?`,
                        confirmLabel: 'Delete Tag',
                        variant: 'danger',
                        commandPreview: `git tag -d ${tagName}`,
                        onConfirm: async () => {
                          await runGitOp(`Delete tag ${tagName}`, [
                            'tag',
                            '-d',
                            tagName,
                          ]);
                        },
                      });
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-rose-500/20 text-rose-300 flex items-center gap-2"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Delete Tag '{contextMenu.targetRef.name}'</span>
                  </button>
                </>
              )}

              <div className="my-1 border-t border-white/10" />

              {/* Merge into Current Branch */}
              <button
                onClick={() => {
                  const target =
                    contextMenu.targetRef?.name || contextMenu.commit.hash;
                  runGitOp(`Merge ${target} into ${currentBranch}`, [
                    'merge',
                    target,
                  ]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <GitMerge className="w-3.5 h-3.5 text-purple-400" />
                <span>Merge into '{currentBranch}'</span>
              </button>

              {/* Rebase Current Branch onto Here */}
              <button
                onClick={() => {
                  const target =
                    contextMenu.targetRef?.name || contextMenu.commit.hash;
                  runGitOp(`Rebase ${currentBranch} onto ${target}`, [
                    'rebase',
                    target,
                  ]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <GitPullRequestDraft className="w-3.5 h-3.5 text-indigo-400" />
                <span>Rebase '{currentBranch}' onto Here</span>
              </button>

              {/* Cherry-pick Commit */}
              <button
                onClick={() => {
                  runGitOp(`Cherry-pick ${contextMenu.commit.shortHash}`, [
                    'cherry-pick',
                    contextMenu.commit.hash,
                  ]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Cherry-pick Commit</span>
              </button>

              {/* Revert Commit */}
              <button
                onClick={() => {
                  const commit = contextMenu.commit;
                  const activeLabel = isHeadDetached
                    ? `HEAD (${commit.shortHash})`
                    : currentBranch;
                  setContextMenu(null);
                  requestConfirm({
                    title: `Revert Commit ${commit.shortHash}`,
                    description: `Create a new commit on '${activeLabel}' that reverses the changes introduced by ${commit.shortHash} ("${commit.subject}")?`,
                    confirmLabel: 'Revert Commit',
                    variant: 'warning',
                    commandPreview: `git revert --no-edit ${commit.shortHash}`,
                    onConfirm: async () => {
                      await runGitOp(`Revert ${commit.shortHash}`, [
                        'revert',
                        '--no-edit',
                        commit.hash,
                      ]);
                    },
                  });
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Revert Commit</span>
              </button>

              <div className="my-1 border-t border-white/10" />

              {/* Reset Options */}
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                Reset '{isHeadDetached ? 'HEAD' : currentBranch}' to Here:
              </div>
              <div className="flex items-center gap-1 px-2.5 pb-1">
                <button
                  onClick={() => {
                    const commit = contextMenu.commit;
                    const activeLabel = isHeadDetached
                      ? 'HEAD'
                      : currentBranch;
                    setContextMenu(null);
                    requestConfirm({
                      title: `Soft Reset '${activeLabel}' to ${commit.shortHash}`,
                      description: `Move HEAD of '${activeLabel}' to ${commit.shortHash} ("${commit.subject}"). All changes since that commit will be kept staged.`,
                      confirmLabel: 'Reset --soft',
                      variant: 'warning',
                      commandPreview: `git reset --soft ${commit.shortHash}`,
                      onConfirm: async () => {
                        await runGitOp('Reset --soft', [
                          'reset',
                          '--soft',
                          commit.hash,
                        ]);
                      },
                    });
                  }}
                  className="flex-1 py-1 rounded bg-white/5 hover:bg-sky-500/20 text-[11px] text-sky-300"
                >
                  Soft
                </button>
                <button
                  onClick={() => {
                    const commit = contextMenu.commit;
                    const activeLabel = isHeadDetached
                      ? 'HEAD'
                      : currentBranch;
                    setContextMenu(null);
                    requestConfirm({
                      title: `Mixed Reset '${activeLabel}' to ${commit.shortHash}`,
                      description: `Move HEAD of '${activeLabel}' to ${commit.shortHash} ("${commit.subject}") and unstage changes. Working directory files will be preserved.`,
                      confirmLabel: 'Reset --mixed',
                      variant: 'warning',
                      commandPreview: `git reset --mixed ${commit.shortHash}`,
                      onConfirm: async () => {
                        await runGitOp('Reset --mixed', [
                          'reset',
                          '--mixed',
                          commit.hash,
                        ]);
                      },
                    });
                  }}
                  className="flex-1 py-1 rounded bg-white/5 hover:bg-amber-500/20 text-[11px] text-amber-300"
                >
                  Mixed
                </button>
                <button
                  onClick={() => {
                    const commit = contextMenu.commit;
                    const activeLabel = isHeadDetached
                      ? 'HEAD'
                      : currentBranch;
                    setContextMenu(null);
                    requestConfirm({
                      title: `Hard Reset '${activeLabel}' to ${commit.shortHash}`,
                      description: `DANGER: Move '${activeLabel}' to ${commit.shortHash} ("${commit.subject}") and permanently destroy all uncommitted staged & working directory changes!`,
                      confirmLabel: 'Hard Reset',
                      variant: 'danger',
                      commandPreview: `git reset --hard ${commit.shortHash}`,
                      onConfirm: async () => {
                        await runGitOp('Reset --hard', [
                          'reset',
                          '--hard',
                          commit.hash,
                        ]);
                      },
                    });
                  }}
                  className="flex-1 py-1 rounded bg-white/5 hover:bg-rose-500/25 text-[11px] text-rose-300"
                >
                  Hard
                </button>
              </div>

              <div className="my-1 border-t border-white/10" />

              {/* Copy & Remote Links */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.commit.hash);
                  showToast('Copied commit hash to clipboard', 'info');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Commit Hash</span>
              </button>

              {remoteInfo && (
                <a
                  href={`${remoteInfo.webUrl}/commit/${contextMenu.commit.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setContextMenu(null)}
                  className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2 text-sky-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Commit on Remote</span>
                </a>
              )}
            </>
          ) : (
            <button
              onClick={() => {
                selectCommit('UNCOMMITTED');
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Inspect & Stage Working Changes</span>
            </button>
          )}
          </div>,
          document.body
        )}

      {/* Dropdown Popover for Date Range Filter */}
      {dateDropdownRect &&
        createPortal(
          <div
            style={{ top: dateDropdownRect.top, left: dateDropdownRect.left }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] w-72 rounded-xl bg-slate-900/95 border border-white/15 shadow-2xl p-3 text-xs text-slate-200 select-none animate-in fade-in-0 zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5 font-medium text-white">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Filter by Date Range</span>
              </div>
              {isDateFiltered && (
                <button
                  type="button"
                  onClick={async () => {
                    await clearDateRange();
                    setDateDropdownRect(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
              Quick Presets
            </div>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {[
                {
                  id: 'all',
                  label: 'All Time',
                  action: () => clearDateRange(),
                  active: !isDateFiltered,
                },
                {
                  id: 'today',
                  label: 'Today',
                  action: () => {
                    const today = toLocalDateString(new Date());
                    return setDateRange(today, today);
                  },
                  active:
                    dateSince === toLocalDateString(new Date()) &&
                    dateUntil === toLocalDateString(new Date()),
                },
                {
                  id: 'yesterday',
                  label: 'Yesterday',
                  action: () => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    const yStr = toLocalDateString(y);
                    return setDateRange(yStr, yStr);
                  },
                  active: (() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    const yStr = toLocalDateString(y);
                    return dateSince === yStr && dateUntil === yStr;
                  })(),
                },
                {
                  id: '7days',
                  label: 'Last 7 Days',
                  action: () => {
                    const d = new Date();
                    d.setDate(d.getDate() - 6);
                    return setDateRange(
                      toLocalDateString(d),
                      toLocalDateString(new Date())
                    );
                  },
                  active: (() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 6);
                    return (
                      dateSince === toLocalDateString(d) &&
                      dateUntil === toLocalDateString(new Date())
                    );
                  })(),
                },
                {
                  id: '30days',
                  label: 'Last 30 Days',
                  action: () => {
                    const d = new Date();
                    d.setDate(d.getDate() - 29);
                    return setDateRange(
                      toLocalDateString(d),
                      toLocalDateString(new Date())
                    );
                  },
                  active: (() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 29);
                    return (
                      dateSince === toLocalDateString(d) &&
                      dateUntil === toLocalDateString(new Date())
                    );
                  })(),
                },
                {
                  id: 'month',
                  label: 'This Month',
                  action: () => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    return setDateRange(
                      toLocalDateString(start),
                      toLocalDateString(now)
                    );
                  },
                  active: (() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    return (
                      dateSince === toLocalDateString(start) &&
                      dateUntil === toLocalDateString(now)
                    );
                  })(),
                },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={async () => {
                    await preset.action();
                    setDateDropdownRect(null);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-left text-xs transition border cursor-pointer ${
                    preset.active
                      ? 'bg-sky-500/20 border-sky-400/40 text-sky-200 font-medium'
                      : 'bg-white/[0.04] border-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Range */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] uppercase font-semibold text-slate-400 mb-2 tracking-wider">
                Custom Range
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    From (Since)
                  </label>
                  <input
                    type="date"
                    value={tempSince}
                    max={tempUntil || undefined}
                    onChange={(e) => setTempSince(e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    To (Until)
                  </label>
                  <input
                    type="date"
                    value={tempUntil}
                    min={tempSince || undefined}
                    onChange={(e) => setTempUntil(e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400 [color-scheme:dark]"
                  />
                </div>
              </div>

              {tempSince && tempUntil && tempSince > tempUntil && (
                <p className="text-[11px] text-rose-400 mt-1.5">
                  Start date cannot be after end date.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDateDropdownRect(null)}
                  className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(
                    tempSince && tempUntil && tempSince > tempUntil
                  )}
                  onClick={async () => {
                    await setDateRange(tempSince, tempUntil);
                    setDateDropdownRect(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-medium text-white transition shadow-sm cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Custom Commit Ordering Dropdown Portal */}
      {orderDropdownRect &&
        createPortal(
          <div
            style={{ top: orderDropdownRect.top, left: orderDropdownRect.left }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] w-44 rounded-xl bg-slate-900/95 border border-white/15 shadow-2xl p-1.5 text-xs text-slate-200 select-none"
          >
            {(
              [
                { id: 'date', label: 'Date Order' },
                { id: 'topo', label: 'Topo Order' },
                { id: 'author-date', label: 'Author Date' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setCommitOrdering(opt.id);
                  setOrderDropdownRect(null);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                  commitOrdering === opt.id
                    ? 'bg-sky-500/20 text-sky-200 font-medium'
                    : 'hover:bg-white/[0.07] text-slate-300'
                }`}
              >
                <span>{opt.label}</span>
                {commitOrdering === opt.id && (
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}

      {/* Modal for Create Branch / Create Tag at Specific Commit */}
      {promptDialog &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75">
            <form
              onSubmit={handlePromptSubmit}
              className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl"
            >
              <h3 className="text-sm font-semibold text-white mb-3">
                {promptDialog.title}
              </h3>
              <input
                type="text"
                autoFocus
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={promptDialog.placeholder}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white mb-4 focus:outline-none focus:border-sky-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPromptDialog(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white"
                >
                  Create
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </section>
  );
};
