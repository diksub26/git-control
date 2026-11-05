import React, { useMemo, useState } from 'react';
import {
  Search,
  GitBranch,
  Tag as TagIcon,
  Archive,
  Globe,
  Spline,
  Waypoints,
  Copy,
  GitMerge,
  GitPullRequestDraft,
  RotateCcw,
  Undo2,
  PlusCircle,
  ExternalLink,
  Check,
  Sparkles,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
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

interface ContextMenuState {
  x: number;
  y: number;
  commit: GitCommit;
  targetRef?: GitRef;
}

export const GitGraphView: React.FC = () => {
  const {
    commits,
    refs,
    currentBranch,
    remoteInfo,
    graphStyle,
    branchFilter,
    searchQuery,
    commitOrdering,
    firstParentOnly,
    showAvatars,
    selectedCommitHash,
    compareCommitHash,
    setGraphStyle,
    setBranchFilter,
    setSearchQuery,
    setCommitOrdering,
    setFirstParentOnly,
    setShowAvatars,
    selectCommit,
    runGitOp,
    showToast,
  } = useGitStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [promptDialog, setPromptDialog] = useState<{
    title: string;
    placeholder: string;
    commitHash: string;
    mode: 'branch' | 'tag';
  } | null>(null);
  const [promptValue, setPromptValue] = useState('');

  // Compute full graph layout from commits
  const graph = useMemo(() => computeGitGraph(commits), [commits]);

  const graphColumnPixelWidth = Math.max(
    graph.maxColumns * COL_WIDTH + PAD_LEFT * 2,
    96
  );

  // Filter matching rows for search query highlight
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

  const handleContextMenu = (
    e: React.MouseEvent,
    commit: GitCommit,
    targetRef?: GitRef
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 260),
      y: Math.min(e.clientY, window.innerHeight - 360),
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
      onClick={() => setContextMenu(null)}
      className="flex-1 h-full flex flex-col min-w-0 bg-slate-950/25 backdrop-blur-md select-none"
    >
      {/* vscode-git-graph Control & Filter Bar */}
      <div className="h-11 px-3 flex items-center justify-between gap-2 bg-slate-950/50 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1 text-xs">
            <GitBranch className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Branches & Remotes
              </option>
              {localBranches.map((b) => (
                <option
                  key={b.fullName}
                  value={b.name}
                  className="bg-slate-900 text-white"
                >
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find commit, hash, author, branch..."
              className="w-full pl-8 pr-6 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            {matchingHashes && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-sky-400">
                {matchingHashes.size}
              </span>
            )}
          </div>
        </div>

        {/* Graph Style & Order Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Curved vs Angular Switcher */}
          <div className="flex items-center rounded-lg bg-white/[0.04] p-0.5 border border-white/10 text-xs">
            <button
              onClick={() => setGraphStyle('curved')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                graphStyle === 'curved'
                  ? 'bg-sky-500/25 text-sky-200 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Curved Bezier Graph Lines"
            >
              <Spline className="w-3.5 h-3.5" />
              <span>Curved</span>
            </button>
            <button
              onClick={() => setGraphStyle('angular')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                graphStyle === 'angular'
                  ? 'bg-sky-500/25 text-sky-200 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Angular Straight Graph Lines"
            >
              <Waypoints className="w-3.5 h-3.5" />
              <span>Angular</span>
            </button>
          </div>

          {/* Commit Ordering */}
          <select
            value={commitOrdering}
            onChange={(e) => setCommitOrdering(e.target.value as any)}
            className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
            title="Commit Ordering"
          >
            <option value="date" className="bg-slate-900">
              Date Order
            </option>
            <option value="topo" className="bg-slate-900">
              Topo Order
            </option>
            <option value="author-date" className="bg-slate-900">
              Author Date
            </option>
          </select>

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
      <div className="flex-1 overflow-auto relative">
        <div
          className="relative min-w-[680px]"
          style={{ height: graph.nodes.length * ROW_HEIGHT }}
        >
          {/* SVG Layer for Graph Paths & Commit Vertices */}
          <svg
            width={graphColumnPixelWidth}
            height={graph.nodes.length * ROW_HEIGHT}
            className="absolute top-0 left-0 pointer-events-none z-10"
          >
            {/* 1. Render all connecting branch/merge paths */}
            {graph.links.map((link, idx) => {
              const strokeColor = link.isUncommitted
                ? '#94a3b8'
                : GRAPH_COLORS[link.colorIndex % GRAPH_COLORS.length];
              const d = buildSvgLinkPath(
                link,
                ROW_HEIGHT,
                COL_WIDTH,
                PAD_LEFT,
                graphStyle
              );
              return (
                <path
                  key={`link-${idx}`}
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

            {/* 2. Render each Commit Vertex Node */}
            {graph.nodes.map((node) => {
              const cx = PAD_LEFT + node.col * COL_WIDTH;
              const cy = node.row * ROW_HEIGHT + ROW_HEIGHT / 2;
              const color = node.commit.isUncommitted
                ? '#fbbf24'
                : GRAPH_COLORS[node.colorIndex % GRAPH_COLORS.length];
              const isSelected =
                selectedCommitHash === node.commit.hash ||
                compareCommitHash === node.commit.hash;
              const isMerge = node.commit.parents.length > 1;

              return (
                <g key={`node-${node.commit.hash}`}>
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8.5}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      opacity={0.85}
                    />
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

          {/* Commit Table Rows */}
          {graph.nodes.map((node) => {
            const { commit, colorIndex } = node;
            const laneColor =
              GRAPH_COLORS[colorIndex % GRAPH_COLORS.length];
            const isPrimarySelected = selectedCommitHash === commit.hash;
            const isCompareSelected = compareCommitHash === commit.hash;
            const isSearchDimmed =
              matchingHashes !== null && !matchingHashes.has(commit.hash);

            return (
              <div
                key={commit.hash}
                style={{ height: ROW_HEIGHT }}
                onClick={(e) =>
                  selectCommit(commit.hash, e.ctrlKey || e.metaKey)
                }
                onContextMenu={(e) => handleContextMenu(e, commit)}
                className={`flex items-center px-2 text-xs cursor-pointer border-b border-white/[0.03] transition-colors ${
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

                  {/* Ref Badges (Branches, Remotes, Tags, Stashes) */}
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
                        ref.type === 'local-branch'
                          ? 'text-white shadow-sm'
                          : ref.type === 'remote-branch'
                          ? 'bg-slate-800/90 border-white/15 text-slate-300'
                          : ref.type === 'tag'
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                          : 'bg-orange-500/20 border-orange-400/40 text-orange-200'
                      }`}
                    >
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
                        {ref.isCurrentHead ? `HEAD → ${ref.name}` : ref.name}
                      </span>
                    </span>
                  ))}

                  {/* Commit Subject */}
                  <span
                    className={`truncate ${
                      commit.isUncommitted
                        ? 'font-semibold italic text-amber-300'
                        : commit.refs.some((r) => r.isCurrentHead)
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
                <div className="w-20 shrink-0 px-2 text-right font-mono text-[11px] text-slate-400">
                  {commit.shortHash}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right-Click Context Menu (vscode-git-graph style) */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-64 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl py-1.5 text-xs text-slate-200"
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
                  runGitOp('Drop stash', [
                    'stash',
                    'drop',
                    contextMenu.commit.stashSelector!,
                  ]);
                  setContextMenu(null);
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
                  runGitOp(`Revert ${contextMenu.commit.shortHash}`, [
                    'revert',
                    '--no-edit',
                    contextMenu.commit.hash,
                  ]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-500/20 flex items-center gap-2"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Revert Commit</span>
              </button>

              <div className="my-1 border-t border-white/10" />

              {/* Reset Options */}
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                Reset '{currentBranch}' to Here:
              </div>
              <div className="flex items-center gap-1 px-2.5 pb-1">
                <button
                  onClick={() => {
                    runGitOp('Reset --soft', [
                      'reset',
                      '--soft',
                      contextMenu.commit.hash,
                    ]);
                    setContextMenu(null);
                  }}
                  className="flex-1 py-1 rounded bg-white/5 hover:bg-sky-500/20 text-[11px] text-sky-300"
                >
                  Soft
                </button>
                <button
                  onClick={() => {
                    runGitOp('Reset --mixed', [
                      'reset',
                      '--mixed',
                      contextMenu.commit.hash,
                    ]);
                    setContextMenu(null);
                  }}
                  className="flex-1 py-1 rounded bg-white/5 hover:bg-amber-500/20 text-[11px] text-amber-300"
                >
                  Mixed
                </button>
                <button
                  onClick={() => {
                    runGitOp('Reset --hard', [
                      'reset',
                      '--hard',
                      contextMenu.commit.hash,
                    ]);
                    setContextMenu(null);
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
        </div>
      )}

      {/* Modal for Create Branch / Create Tag at Specific Commit */}
      {promptDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
        </div>
      )}
    </section>
  );
};
