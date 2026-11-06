import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  GitBranch,
  Globe,
  Tag,
  Archive,
  FolderTree,
  Boxes,
  GitPullRequest,
  CircleDot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Check,
  GitMerge,
  Trash2,
  Play,
  Plus,
  ExternalLink,
  RefreshCw,
  FileDiff,
  Loader2,
  UploadCloud,
  Radio,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { openExternalUrl } from '../services/gitService';
import { RemoteIssue, RemotePullRequest } from '../types/git';

export const LeftSidebar: React.FC = () => {
  const {
    refs,
    workingFiles,
    worktrees,
    submodules,
    remoteInfo,
    pullRequests,
    issues,
    prFilter,
    setPrFilter,
    tabs,
    activeTabId,
    currentBranch,
    headHash,
    isHeadDetached,
    activeRemoteOp,
    selectedCommitHash,
    selectCommit,
    runGitOp,
    loadRemotePRsAndIssues,
    setPublishModalOpen,
    setCreatePRModalOpen,
    requestConfirm,
  } = useGitStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('git_control_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 600) {
          return parsed;
        }
      }
    } catch {}
    return 260;
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 180), 600);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      setIsResizing(false);
      const deltaX = upEvent.clientX - startX;
      const finalWidth = Math.min(Math.max(startWidth + deltaX, 180), 600);
      setSidebarWidth(finalWidth);
      try {
        localStorage.setItem('git_control_sidebar_width', finalWidth.toString());
      } catch {}
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const SECTION_KEYS = [
    'branches',
    'remotes',
    'stashes',
    'tags',
    'worktrees',
    'prs',
  ] as const;

  type SectionKey = (typeof SECTION_KEYS)[number];

  const DEFAULT_WEIGHTS: Record<SectionKey, number> = {
    branches: 140,
    remotes: 110,
    stashes: 80,
    tags: 70,
    worktrees: 90,
    prs: 120,
  };

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem('git_control_sidebar_open_sections');
      if (saved) {
        return {
          branches: true,
          remotes: true,
          tags: false,
          stashes: true,
          worktrees: false,
          prs: true,
          ...JSON.parse(saved),
        };
      }
    } catch {}
    return {
      branches: true,
      remotes: true,
      tags: false,
      stashes: true,
      worktrees: false,
      prs: true,
    };
  });

  const [sectionWeights, setSectionWeights] = useState<Record<SectionKey, number>>(() => {
    try {
      const saved = localStorage.getItem('git_control_sidebar_section_weights');
      if (saved) {
        return { ...DEFAULT_WEIGHTS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_WEIGHTS;
  });

  const sectionWeightsRef = useRef(sectionWeights);
  useEffect(() => {
    sectionWeightsRef.current = sectionWeights;
  }, [sectionWeights]);

  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    branches: null,
    remotes: null,
    stashes: null,
    tags: null,
    worktrees: null,
    prs: null,
  });

  const activeResizingPairRef = useRef<{
    keyA: SectionKey;
    keyB: SectionKey;
    startY: number;
    startHeightA: number;
    startHeightB: number;
    weightA: number;
    weightB: number;
  } | null>(null);

  const [activeResizingPair, setActiveResizingPair] = useState<{
    keyA: SectionKey;
    keyB: SectionKey;
  } | null>(null);

  const toggle = (key: SectionKey) =>
    setOpenSections((s) => {
      const next = { ...s, [key]: !s[key] };
      try {
        localStorage.setItem(
          'git_control_sidebar_open_sections',
          JSON.stringify(next)
        );
      } catch {}
      return next;
    });

  const openSectionKeys = SECTION_KEYS.filter((k) => openSections[k]);

  const startHeightResizing = (
    e: React.MouseEvent,
    keyA: SectionKey,
    keyB: SectionKey
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const elA = sectionRefs.current[keyA];
    const elB = sectionRefs.current[keyB];
    if (!elA || !elB) return;

    const rectA = elA.getBoundingClientRect();
    const rectB = elB.getBoundingClientRect();

    const startHeightA = rectA.height;
    const startHeightB = rectB.height;
    const totalPairHeight = startHeightA + startHeightB;
    if (totalPairHeight <= 0) return;

    const currentWeights = sectionWeightsRef.current;
    const weightA = currentWeights[keyA] ?? DEFAULT_WEIGHTS[keyA] ?? 100;
    const weightB = currentWeights[keyB] ?? DEFAULT_WEIGHTS[keyB] ?? 100;

    activeResizingPairRef.current = {
      keyA,
      keyB,
      startY: e.clientY,
      startHeightA,
      startHeightB,
      weightA,
      weightB,
    };
    setActiveResizingPair({ keyA, keyB });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const data = activeResizingPairRef.current;
      if (!data) return;

      const deltaY = moveEvent.clientY - data.startY;
      const MIN_HEIGHT = 48;

      const minDelta = MIN_HEIGHT - data.startHeightA;
      const maxDelta = data.startHeightB - MIN_HEIGHT;

      let clampedDelta = deltaY;
      if (minDelta <= maxDelta) {
        clampedDelta = Math.min(Math.max(deltaY, minDelta), maxDelta);
      } else {
        clampedDelta = 0;
      }

      const newHeightA = data.startHeightA + clampedDelta;
      const totalPairHeight = data.startHeightA + data.startHeightB;
      const totalPairWeight = data.weightA + data.weightB;

      const newWeightA = Math.max(
        10,
        Math.round((newHeightA / totalPairHeight) * totalPairWeight)
      );
      const newWeightB = Math.max(10, totalPairWeight - newWeightA);

      setSectionWeights((prev) => {
        const next = { ...prev, [data.keyA]: newWeightA, [data.keyB]: newWeightB };
        sectionWeightsRef.current = next;
        return next;
      });
    };

    const handleMouseUp = () => {
      if (!activeResizingPairRef.current) return;
      const finalWeights = sectionWeightsRef.current;
      try {
        localStorage.setItem(
          'git_control_sidebar_section_weights',
          JSON.stringify(finalWeights)
        );
      } catch {}

      activeResizingPairRef.current = null;
      setActiveResizingPair(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const resetPairWeights = (keyA: SectionKey, keyB: SectionKey) => {
    setSectionWeights((prev) => {
      const defaultA = DEFAULT_WEIGHTS[keyA] ?? 100;
      const defaultB = DEFAULT_WEIGHTS[keyB] ?? 100;
      const next = { ...prev, [keyA]: defaultA, [keyB]: defaultB };
      try {
        localStorage.setItem(
          'git_control_sidebar_section_weights',
          JSON.stringify(next)
        );
      } catch {}
      return next;
    });
  };

  const renderResizeHandle = (key: SectionKey) => {
    const openIndex = openSectionKeys.indexOf(key);
    const isLastOpen = openIndex === openSectionKeys.length - 1;
    const nextOpenKey =
      openIndex >= 0 && !isLastOpen ? openSectionKeys[openIndex + 1] : null;

    if (!openSections[key] || !nextOpenKey) return null;

    const isResizingCurrent = activeResizingPair?.keyA === key;

    return (
      <div
        onMouseDown={(e) => startHeightResizing(e, key, nextOpenKey)}
        onDoubleClick={() => resetPairWeights(key, nextOpenKey)}
        className="shrink-0 h-2.5 relative z-10 cursor-row-resize group/resizer flex items-center justify-center bg-transparent hover:bg-sky-500/10 transition-colors"
        title="Drag to resize height (double-click to reset)"
      >
        <div
          className={`w-full transition-all ${
            isResizingCurrent
              ? 'h-[2px] bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]'
              : 'h-[1px] bg-white/10 group-hover/resizer:bg-sky-400 group-hover/resizer:h-[2px]'
          }`}
        />
        <div
          className={`absolute rounded-full transition-all pointer-events-none ${
            isResizingCurrent
              ? 'h-1 bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)] w-12'
              : 'h-0.5 bg-white/25 group-hover/resizer:bg-sky-400 group-hover/resizer:h-1 w-8 group-hover/resizer:w-12'
          }`}
        />
      </div>
    );
  };

  const [selectedPR, setSelectedPR] = useState<RemotePullRequest | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<RemoteIssue | null>(null);
  const [showWorktreeModal, setShowWorktreeModal] = useState(false);
  const [wtPath, setWtPath] = useState('');
  const [wtBranch, setWtBranch] = useState('');

  const localBranches = refs.filter((r) => r.type === 'local-branch');
  const remoteBranches = refs.filter((r) => r.type === 'remote-branch');
  const tags = refs.filter((r) => r.type === 'tag');
  const stashes = refs.filter((r) => r.type === 'stash');
  const conflictCount = workingFiles.filter((f) => f.conflicted).length;

  const openPrCount = pullRequests.filter((pr) => pr.state === 'open').length;
  const openIssueCount = issues.filter((iss) => iss.state === 'open').length;
  const closedPrCount = pullRequests.filter(
    (pr) => pr.state === 'closed' || pr.state === 'merged'
  ).length;
  const closedIssueCount = issues.filter((iss) => iss.state === 'closed').length;

  const totalOpen = openPrCount + openIssueCount;
  const totalClosed = closedPrCount + closedIssueCount;
  const totalAll = pullRequests.length + issues.length;

  const filteredPullRequests = pullRequests.filter((pr) => {
    if (prFilter === 'open') return pr.state === 'open';
    if (prFilter === 'closed') return pr.state === 'closed' || pr.state === 'merged';
    return true;
  });

  const filteredIssues = issues.filter((iss) => {
    if (prFilter === 'open') return iss.state === 'open';
    if (prFilter === 'closed') return iss.state === 'closed';
    return true;
  });

  const currentFilteredCount = filteredPullRequests.length + filteredIssues.length;

  return (
    <>
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="relative shrink-0 h-full flex select-none"
      >
        <aside className="w-full flex-1 h-full bg-slate-950/45 backdrop-blur-xl border-r border-white/10 flex flex-col select-none overflow-hidden">
          {/* Working Tree Quick Row */}
          <div className="p-2.5 border-b border-white/10 shrink-0">
            <div
              onClick={() => selectCommit('UNCOMMITTED')}
              className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition border ${
                selectedCommitHash === 'UNCOMMITTED'
                  ? 'bg-sky-500/20 border-sky-400/40 text-white'
                  : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileDiff className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium">Working Changes</span>
              </div>
              <div className="flex items-center gap-1">
                {conflictCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/25 text-rose-300 text-[10px] font-semibold">
                    {conflictCount} conflict
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200 text-[10px] font-mono">
                  {workingFiles.length}
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Sections Container */}
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            {/* Local Branches */}
            <div
              ref={(el) => {
                sectionRefs.current.branches = el;
              }}
              style={{
                flex: openSections.branches
                  ? `${sectionWeights.branches || DEFAULT_WEIGHTS.branches} 1 0%`
                  : '0 0 auto',
              }}
              className={`flex flex-col border-b border-white/5 min-h-0 ${
                openSections.branches ? 'overflow-hidden' : 'shrink-0'
              }`}
            >
              <button
                onClick={() => toggle('branches')}
                className="w-full shrink-0 flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {openSections.branches ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                  Local Branches
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {localBranches.length}
                </span>
              </button>

              {openSections.branches && (
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-0.5">
                  {/* Detached HEAD Indicator in Local Branches list */}
                  {isHeadDetached && headHash && (
                    <div
                      onClick={() => selectCommit(headHash)}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs bg-amber-500/15 border border-amber-400/30 text-amber-200 font-medium cursor-pointer transition hover:bg-amber-500/25 mb-1"
                      title={`Detached HEAD at commit ${headHash}. Click to jump to commit.`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                        <span className="truncate font-mono">
                          HEAD ({headHash.slice(0, 7)})
                        </span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono shrink-0">
                        detached
                      </span>
                    </div>
                  )}

                  {localBranches.map((b) => (
                    <div
                      key={b.fullName}
                      onClick={() => selectCommit(b.commitHash)}
                      onDoubleClick={() =>
                        !b.isCurrentHead &&
                        runGitOp(`Checkout ${b.name}`, ['checkout', b.name])
                      }
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                        b.isCurrentHead
                          ? 'bg-sky-500/15 text-sky-200 font-medium'
                          : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                      title="Click to jump in graph, Double-click to Checkout"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {b.isCurrentHead ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{b.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {(b.ahead || 0) > 0 && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            ↑{b.ahead}
                          </span>
                        )}
                        {(b.behind || 0) > 0 && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            ↓{b.behind}
                          </span>
                        )}
                        {!b.isCurrentHead && (
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                runGitOp(`Checkout ${b.name}`, ['checkout', b.name]);
                              }}
                              className="p-0.5 hover:text-sky-300"
                              title={`Checkout ${b.name}`}
                            >
                              <Play className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                runGitOp(`Merge ${b.name}`, ['merge', b.name]);
                              }}
                              className="p-0.5 hover:text-purple-300"
                              title={`Merge ${b.name} into current branch`}
                            >
                              <GitMerge className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestConfirm({
                                  title: `Delete Branch '${b.name}'`,
                                  description: `Are you sure you want to force-delete local branch '${b.name}'? Any unmerged commits on this branch may be lost.`,
                                  confirmLabel: 'Delete Branch',
                                  variant: 'danger',
                                  commandPreview: `git branch -D ${b.name}`,
                                  onConfirm: async () => {
                                    await runGitOp(`Delete branch ${b.name}`, [
                                      'branch',
                                      '-D',
                                      b.name,
                                    ]);
                                  },
                                });
                              }}
                              className="p-0.5 hover:text-rose-400"
                              title={`Delete ${b.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {renderResizeHandle('branches')}
            </div>

            {/* Remote Branches */}
            <div
              ref={(el) => {
                sectionRefs.current.remotes = el;
              }}
              style={{
                flex: openSections.remotes
                  ? `${sectionWeights.remotes || DEFAULT_WEIGHTS.remotes} 1 0%`
                  : '0 0 auto',
              }}
              className={`flex flex-col border-b border-white/5 min-h-0 ${
                openSections.remotes ? 'overflow-hidden' : 'shrink-0'
              }`}
            >
              <button
                onClick={() => toggle('remotes')}
                className="w-full shrink-0 flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {openSections.remotes ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  Remotes
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {remoteBranches.length}
                </span>
              </button>

              {openSections.remotes && (
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-0.5">
                  {remoteBranches.length === 0 && !remoteInfo && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-center space-y-2">
                      <div className="text-[11px] text-slate-300">
                        Local repository not published yet
                      </div>
                      <button
                        onClick={() => setPublishModalOpen(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white transition"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Publish Repository</span>
                      </button>
                    </div>
                  )}
                  {remoteBranches.map((rb) => (
                    <div
                      key={rb.fullName}
                      onClick={() => selectCommit(rb.commitHash)}
                      onDoubleClick={() => {
                        const localName = rb.name.split('/').slice(1).join('/');
                        runGitOp(`Track ${rb.name}`, [
                          'checkout',
                          '-b',
                          localName,
                          rb.name,
                        ]);
                      }}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] cursor-pointer"
                      title="Double-click to checkout remote branch locally"
                    >
                      <span className="truncate font-mono text-[11px]">{rb.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const localName = rb.name.split('/').slice(1).join('/');
                          runGitOp(`Checkout ${localName}`, [
                            'checkout',
                            '-B',
                            localName,
                            rb.name,
                          ]);
                        }}
                        className="hidden group-hover:inline-block text-[10px] text-sky-400 hover:underline"
                      >
                        Checkout
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {renderResizeHandle('remotes')}
            </div>

            {/* Stashes */}
            <div
              ref={(el) => {
                sectionRefs.current.stashes = el;
              }}
              style={{
                flex: openSections.stashes
                  ? `${sectionWeights.stashes || DEFAULT_WEIGHTS.stashes} 1 0%`
                  : '0 0 auto',
              }}
              className={`flex flex-col border-b border-white/5 min-h-0 ${
                openSections.stashes ? 'overflow-hidden' : 'shrink-0'
              }`}
            >
              <button
                onClick={() => toggle('stashes')}
                className="w-full shrink-0 flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {openSections.stashes ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  Stashes
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {stashes.length}
                </span>
              </button>

              {openSections.stashes && (
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-0.5">
                  {stashes.length === 0 && (
                    <div className="px-3 py-1 text-[11px] text-slate-500">No stashes</div>
                  )}
                  {stashes.map((st) => (
                    <div
                      key={st.fullName}
                      onClick={() => selectCommit(st.commitHash)}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] cursor-pointer"
                    >
                      <span className="truncate font-mono text-[11px]">
                        {st.stashSelector}
                      </span>
                      <div className="hidden group-hover:flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runGitOp(`Pop ${st.stashSelector}`, [
                              'stash',
                              'pop',
                              st.stashSelector!,
                            ]);
                          }}
                          className="text-[10px] text-emerald-400 hover:underline"
                        >
                          Pop
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runGitOp(`Apply ${st.stashSelector}`, [
                              'stash',
                              'apply',
                              st.stashSelector!,
                            ]);
                          }}
                          className="text-[10px] text-sky-400 hover:underline"
                        >
                          Apply
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const selector = st.stashSelector!;
                            requestConfirm({
                              title: `Drop Stash '${selector}'`,
                              description: `Are you sure you want to permanently drop '${selector}'? This action cannot be undone.`,
                              confirmLabel: 'Drop Stash',
                              variant: 'danger',
                              commandPreview: `git stash drop ${selector}`,
                              onConfirm: async () => {
                                await runGitOp(`Drop ${selector}`, [
                                  'stash',
                                  'drop',
                                  selector,
                                ]);
                              },
                            });
                          }}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Drop
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {renderResizeHandle('stashes')}
            </div>

            {/* Tags */}
            <div
              ref={(el) => {
                sectionRefs.current.tags = el;
              }}
              style={{
                flex: openSections.tags
                  ? `${sectionWeights.tags || DEFAULT_WEIGHTS.tags} 1 0%`
                  : '0 0 auto',
              }}
              className={`flex flex-col border-b border-white/5 min-h-0 ${
                openSections.tags ? 'overflow-hidden' : 'shrink-0'
              }`}
            >
              <button
                onClick={() => toggle('tags')}
                className="w-full shrink-0 flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {openSections.tags ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  Tags
                </span>
                <span className="text-[10px] font-mono text-slate-500">{tags.length}</span>
              </button>

              {openSections.tags && (
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-0.5">
                  {tags.length === 0 && (
                    <div className="px-3 py-1 text-[11px] text-slate-500">No tags</div>
                  )}
                  {tags.map((t) => (
                    <div
                      key={t.fullName}
                      onClick={() => selectCommit(t.commitHash)}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] cursor-pointer"
                    >
                      <span className="truncate font-mono text-[11px]">{t.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requestConfirm({
                            title: `Delete Tag '${t.name}'`,
                            description: `Are you sure you want to delete local tag '${t.name}'?`,
                            confirmLabel: 'Delete Tag',
                            variant: 'danger',
                            commandPreview: `git tag -d ${t.name}`,
                            onConfirm: async () => {
                              await runGitOp(`Delete tag ${t.name}`, ['tag', '-d', t.name]);
                            },
                          });
                        }}
                        className="hidden group-hover:inline-block text-rose-400 hover:text-rose-300"
                        title={`Delete tag ${t.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {renderResizeHandle('tags')}
            </div>

            {/* Worktrees & Submodules */}
            <div
              ref={(el) => {
                sectionRefs.current.worktrees = el;
              }}
              style={{
                flex: openSections.worktrees
                  ? `${sectionWeights.worktrees || DEFAULT_WEIGHTS.worktrees} 1 0%`
                  : '0 0 auto',
              }}
              className={`flex flex-col border-b border-white/5 min-h-0 ${
                openSections.worktrees ? 'overflow-hidden' : 'shrink-0'
              }`}
            >
              <button
                onClick={() => toggle('worktrees')}
                className="w-full shrink-0 flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {openSections.worktrees ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                  Worktrees & Submodules
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {worktrees.length + submodules.length}
                </span>
              </button>

              {openSections.worktrees && (
                <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>Worktrees ({worktrees.length})</span>
                    <button
                      onClick={() => setShowWorktreeModal(true)}
                      className="text-sky-400 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {worktrees.map((wt) => (
                    <div
                      key={wt.path}
                      className="px-2 py-1.5 rounded-lg bg-white/[0.03] text-[11px] text-slate-300"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-sky-300">{wt.branch}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {wt.head}
                        </span>
                      </div>
                      <div className="truncate text-[10px] text-slate-400 font-mono">
                        {wt.path}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                    <span className="flex items-center gap-1">
                      <Boxes className="w-3 h-3" /> Submodules ({submodules.length})
                    </span>
                    <button
                      disabled={activeRemoteOp === 'submodule'}
                      onClick={() =>
                        runGitOp('Update submodules', [
                          'submodule',
                          'update',
                          '--init',
                          '--recursive',
                        ])
                      }
                      className="text-sky-400 hover:underline text-[10px] flex items-center gap-1 disabled:opacity-50"
                    >
                      {activeRemoteOp === 'submodule' && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      <span>{activeRemoteOp === 'submodule' ? 'Syncing...' : 'Sync'}</span>
                    </button>
                  </div>
                  {submodules.map((sub) => (
                    <div
                      key={sub.path}
                      className="px-2 py-1 rounded bg-white/[0.03] text-[11px] text-slate-300 flex items-center justify-between"
                    >
                      <span className="truncate">{sub.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {sub.commit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {renderResizeHandle('worktrees')}
            </div>

            {/* Pull Requests & Issues (In-App Integration) */}
            <div
              ref={(el) => {
                sectionRefs.current.prs = el;
              }}
              style={{
                flex: openSections.prs
                  ? `${sectionWeights.prs || DEFAULT_WEIGHTS.prs} 1 0%`
                  : '0 0 auto',
              }}
              className={`flex flex-col border-b border-white/5 min-h-0 ${
                openSections.prs ? 'overflow-hidden' : 'shrink-0'
              }`}
            >
              <div className="w-full shrink-0 flex items-center justify-between px-3 py-2">
                <button
                  onClick={() => toggle('prs')}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {openSections.prs ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <GitPullRequest className="w-3.5 h-3.5 text-pink-400" />
                  <span>PRs & Issues</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {currentFilteredCount}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  {remoteInfo && (
                    <button
                      onClick={() => setCreatePRModalOpen(true)}
                      className="p-1 text-slate-400 hover:text-pink-300"
                      title="Create Pull Request"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => loadRemotePRsAndIssues({ manual: true })}
                    disabled={activeRemoteOp === 'pr-sync'}
                    className="p-1 text-slate-400 hover:text-sky-300 disabled:opacity-50"
                    title="Refresh PRs & Issues (uses only the account linked to this repository in Account Manager)"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${
                        activeRemoteOp === 'pr-sync' ? 'animate-spin text-sky-400' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {openSections.prs && (
                <div className="flex-1 min-h-0 flex flex-col">
                  {/* Segmented Filter: Open / Close / All */}
                  {remoteInfo && (
                    <div className="px-2.5 pt-0.5 pb-2 shrink-0">
                      <div className="flex items-center p-0.5 bg-black/40 rounded-lg border border-white/5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setPrFilter('open')}
                          className={`flex-1 py-1 px-1 rounded-md text-center transition-all flex items-center justify-center gap-1 ${
                            prFilter === 'open'
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm border border-emerald-500/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                          }`}
                          title="Show open PRs & Issues"
                        >
                          <span>Open</span>
                          <span className="font-mono text-[9px] opacity-75">
                            ({totalOpen})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrFilter('closed')}
                          className={`flex-1 py-1 px-1 rounded-md text-center transition-all flex items-center justify-center gap-1 ${
                            prFilter === 'closed'
                              ? 'bg-purple-500/20 text-purple-300 font-semibold shadow-sm border border-purple-500/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                          }`}
                          title="Show closed and merged PRs & Issues"
                        >
                          <span>Close</span>
                          <span className="font-mono text-[9px] opacity-75">
                            ({totalClosed})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrFilter('all')}
                          className={`flex-1 py-1 px-1 rounded-md text-center transition-all flex items-center justify-center gap-1 ${
                            prFilter === 'all'
                              ? 'bg-sky-500/20 text-sky-300 font-semibold shadow-sm border border-sky-500/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                          }`}
                          title="Show all PRs & Issues"
                        >
                          <span>All</span>
                          <span className="font-mono text-[9px] opacity-75">
                            ({totalAll})
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-3 space-y-1">
                    {!remoteInfo && (
                      <div className="text-[11px] text-slate-500 px-1 py-1">
                        No GitHub/GitLab remote configured
                      </div>
                    )}
                    {remoteInfo && totalAll === 0 && (
                      <div className="text-[11px] text-slate-500 px-1 py-1">
                        {remoteInfo.owner}/{remoteInfo.repo} — No PRs or Issues found
                      </div>
                    )}
                    {remoteInfo && totalAll > 0 && currentFilteredCount === 0 && (
                      <div className="text-[11px] text-slate-500 px-1 py-3 text-center">
                        No {prFilter === 'closed' ? 'closed' : prFilter} PRs or issues found
                      </div>
                    )}

                    {filteredPullRequests.length > 0 && (
                      <div className="space-y-1">
                        {(filteredIssues.length > 0 || prFilter === 'all') && (
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 pt-1 pb-0.5 flex items-center gap-1.5">
                            <GitPullRequest className="w-3 h-3 text-pink-400" />
                            <span>Pull Requests ({filteredPullRequests.length})</span>
                          </div>
                        )}
                        {filteredPullRequests.map((pr) => (
                          <div
                            key={pr.id}
                            onClick={() => setSelectedPR(pr)}
                            className="px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer transition border border-transparent hover:border-white/5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono text-pink-400">#{pr.number}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                  pr.state === 'open'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : pr.state === 'merged'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-slate-500/20 text-slate-300'
                                }`}
                              >
                                {pr.state}
                              </span>
                            </div>
                            <div className="text-xs text-slate-200 truncate mt-0.5">
                              {pr.title}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredIssues.length > 0 && (
                      <div className={`space-y-1 ${filteredPullRequests.length > 0 ? 'pt-2' : ''}`}>
                        {(filteredPullRequests.length > 0 || prFilter === 'all') && (
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 pt-1 pb-0.5 flex items-center gap-1.5">
                            <CircleDot className="w-3 h-3 text-emerald-400" />
                            <span>Issues ({filteredIssues.length})</span>
                          </div>
                        )}
                        {filteredIssues.map((iss) => (
                          <div
                            key={iss.id}
                            onClick={() => setSelectedIssue(iss)}
                            className="px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer transition border border-transparent hover:border-white/5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {iss.state === 'closed' ? (
                                  <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                                ) : (
                                  <CircleDot className="w-3 h-3 text-emerald-400 shrink-0" />
                                )}
                                <span className="font-mono text-slate-400">#{iss.number}</span>
                              </div>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                  iss.state === 'open'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-slate-500/20 text-slate-300'
                                }`}
                              >
                                {iss.state}
                              </span>
                            </div>
                            <div className="text-xs text-slate-200 truncate mt-0.5">
                              {iss.title}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {renderResizeHandle('prs')}
            </div>
          </div>
        </aside>

        {/* Vertical Resize Handle */}
        <div
          onMouseDown={startResizing}
          className={`absolute top-0 right-[-3px] w-2 h-full cursor-col-resize z-20 group transition-colors ${
            isResizing
              ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]'
              : 'hover:bg-sky-500/50'
          }`}
          title="Drag to resize sidebar width"
        />
      </div>

      {/* Full-screen capture overlay during sidebar width resize */}
      {isResizing &&
        createPortal(
          <div className="fixed inset-0 z-[9999] cursor-col-resize select-none" />,
          document.body
        )}

      {/* Full-screen capture overlay during section height resize */}
      {activeResizingPair &&
        createPortal(
          <div className="fixed inset-0 z-[9999] cursor-row-resize select-none" />,
          document.body
        )}

      {/* In-App PR Detail Modal */}
      {selectedPR &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                        selectedPR.state === 'open'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : selectedPR.state === 'merged'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {selectedPR.state}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      #{selectedPR.number} • {selectedPR.sourceBranch} →{' '}
                      {selectedPR.targetBranch}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-1">
                    {selectedPR.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPR(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl bg-slate-950/80 border border-white/10 p-3 text-xs text-slate-300 whitespace-pre-wrap mb-4">
                {selectedPR.body || 'No description provided.'}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={async () => {
                    await runGitOp(
                      `Checkout PR branch ${selectedPR.sourceBranch}`,
                      ['checkout', selectedPR.sourceBranch]
                    );
                    setSelectedPR(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white"
                >
                  Checkout PR Branch ({selectedPR.sourceBranch})
                </button>
                <button
                  type="button"
                  onClick={() => openExternalUrl(selectedPR.url)}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:underline"
                >
                  <span>Open on Web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* In-App Issue Detail Modal */}
      {selectedIssue &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                        selectedIssue.state === 'open'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}
                    >
                      {selectedIssue.state}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Issue #{selectedIssue.number} by {selectedIssue.author}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-1">
                    {selectedIssue.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-xl bg-slate-950/80 border border-white/10 p-3 text-xs text-slate-300 whitespace-pre-wrap mb-4">
                {selectedIssue.body || 'No description provided.'}
              </div>
              <div className="flex justify-between">
                <button
                  onClick={async () => {
                    const branchSlug = `issue-${selectedIssue.number}`;
                    await runGitOp(`Created branch ${branchSlug}`, [
                      'checkout',
                      '-b',
                      branchSlug,
                    ]);
                    setSelectedIssue(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white"
                >
                  Create Branch for Issue (#{selectedIssue.number})
                </button>
                <button
                  type="button"
                  onClick={() => openExternalUrl(selectedIssue.url)}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:underline"
                >
                  <span>Open on Web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add Worktree Modal */}
      {showWorktreeModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl">
              <h3 className="text-sm font-semibold text-white mb-3">
                Add Git Worktree
              </h3>
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={wtPath}
                  onChange={(e) => setWtPath(e.target.value)}
                  placeholder="Worktree folder path (e.g. ../git-control-wt)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white"
                />
                <input
                  type="text"
                  value={wtBranch}
                  onChange={(e) => setWtBranch(e.target.value)}
                  placeholder="Branch name (e.g. feature-wt)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowWorktreeModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (wtPath.trim() && wtBranch.trim()) {
                      await runGitOp('Added worktree', [
                        'worktree',
                        'add',
                        '-b',
                        wtBranch.trim(),
                        wtPath.trim(),
                      ]);
                      setShowWorktreeModal(false);
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 text-xs font-medium text-white"
                >
                  Add Worktree
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
