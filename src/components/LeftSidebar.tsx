import React, { useState } from 'react';
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
  Workflow,
  Settings2,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { openExternalUrl } from '../services/gitService';
import { GitWorkflow, RemoteIssue, RemotePullRequest } from '../types/git';

export const LeftSidebar: React.FC = () => {
  const {
    refs,
    workingFiles,
    worktrees,
    submodules,
    remoteInfo,
    pullRequests,
    issues,
    workflows,
    activeWorkflowRun,
    tabs,
    activeTabId,
    currentBranch,
    activeRemoteOp,
    selectedCommitHash,
    selectCommit,
    runGitOp,
    runWorkflow,
    loadRemotePRsAndIssues,
    setPublishModalOpen,
    setCreatePRModalOpen,
    setWorkflowModalOpen,
    requestConfirm,
  } = useGitStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const availableWorkflows = workflows.filter(
    (wf) =>
      wf.scope === 'global' ||
      (activeTab && wf.repoPath?.toLowerCase() === activeTab.path.toLowerCase())
  );

  const isWorkflowDestructive = (wf: GitWorkflow) => {
    if (wf.confirmBeforeRun) return true;
    return wf.steps.some((s) =>
      /\b(push\s+(-f|--force)|reset\s+--hard|clean\s+-[fd]|branch\s+-D|checkout\s+--)\b/i.test(
        s.command
      )
    );
  };

  const handleQuickRunWorkflow = (wf: GitWorkflow) => {
    const previewSteps = wf.steps
      .map(
        (s, idx) =>
          `${idx + 1}. ${
            s.command.trim().startsWith('git ')
              ? s.command.trim()
              : `git ${s.command.trim()}`
          }`.replace(/\$\{branch\}|\{branch\}/g, currentBranch || 'HEAD')
      )
      .join('\n');

    if (isWorkflowDestructive(wf)) {
      requestConfirm({
        title: `Run Workflow '${wf.name}'`,
        description: `Execute ${wf.steps.length} sequential Git command(s) in '${
          activeTab?.name || 'current repository'
        }' on branch '${currentBranch || 'HEAD'}'?`,
        confirmLabel: 'Run Workflow',
        variant: wf.steps.some((s) =>
          /\b(push\s+(-f|--force)|reset\s+--hard|clean\s+-[fd])\b/i.test(s.command)
        )
          ? 'danger'
          : 'warning',
        commandPreview: previewSteps,
        onConfirm: async () => {
          await runWorkflow(wf.id);
        },
      });
    } else {
      runWorkflow(wf.id);
    }
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workflows: true,
    branches: true,
    remotes: true,
    tags: false,
    stashes: true,
    worktrees: false,
    submodules: false,
    prs: true,
    issues: false,
  });

  const [selectedPR, setSelectedPR] = useState<RemotePullRequest | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<RemoteIssue | null>(null);
  const [showWorktreeModal, setShowWorktreeModal] = useState(false);
  const [wtPath, setWtPath] = useState('');
  const [wtBranch, setWtBranch] = useState('');

  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const localBranches = refs.filter((r) => r.type === 'local-branch');
  const remoteBranches = refs.filter((r) => r.type === 'remote-branch');
  const tags = refs.filter((r) => r.type === 'tag');
  const stashes = refs.filter((r) => r.type === 'stash');
  const conflictCount = workingFiles.filter((f) => f.conflicted).length;

  return (
    <>
      <aside className="w-64 shrink-0 h-full bg-slate-950/45 backdrop-blur-xl border-r border-white/10 flex flex-col select-none overflow-y-auto">
        {/* Working Tree Quick Row */}
        <div className="p-2.5 border-b border-white/10">
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

        {/* Git Workflows (Sequential Macro Runner) */}
        <div className="border-b border-white/5">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => toggle('workflows')}
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
            >
              {openSections.workflows ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <Workflow className="w-3.5 h-3.5 text-amber-400" />
              <span>Workflows</span>
              <span className="text-[10px] font-mono text-slate-500">
                {availableWorkflows.length}
              </span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWorkflowModalOpen(true)}
                className="p-1 text-slate-400 hover:text-amber-300"
                title="Create or Manage Git Workflows"
              >
                <Settings2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setWorkflowModalOpen(true)}
                className="p-1 text-slate-400 hover:text-amber-300"
                title="Add New Workflow"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {openSections.workflows && (
            <div className="px-2 pb-2.5 space-y-1">
              {availableWorkflows.map((wf) => {
                const isRunningThis =
                  activeWorkflowRun?.isRunning &&
                  activeWorkflowRun.workflowId === wf.id;
                return (
                  <div
                    key={wf.id}
                    onClick={() => setWorkflowModalOpen(true)}
                    className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 cursor-pointer transition"
                    title={`${wf.name}\nSteps:\n${wf.steps
                      .map((s, idx) => `${idx + 1}. git ${s.command.replace(/^git\s+/i, '')}`)
                      .join('\n')}`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {wf.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {wf.steps
                          .map((s) => s.command.replace(/^git\s+/i, ''))
                          .join(' → ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(activeWorkflowRun?.isRunning)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickRunWorkflow(wf);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-semibold transition shrink-0 disabled:opacity-50"
                      title={`Run '${wf.name}'`}
                    >
                      {isRunningThis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span>Run</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Local Branches */}
        <div className="border-b border-white/5">
          <button
            onClick={() => toggle('branches')}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
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
            <div className="px-2 pb-2 space-y-0.5">
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
        </div>

        {/* Remote Branches */}
        <div className="border-b border-white/5">
          <button
            onClick={() => toggle('remotes')}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
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
            <div className="px-2 pb-2 space-y-0.5">
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
        </div>

        {/* Stashes */}
        <div className="border-b border-white/5">
          <button
            onClick={() => toggle('stashes')}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
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
            <div className="px-2 pb-2 space-y-0.5">
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
        </div>

        {/* Tags */}
        <div className="border-b border-white/5">
          <button
            onClick={() => toggle('tags')}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
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
            <div className="px-2 pb-2 space-y-0.5">
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
        </div>

        {/* Worktrees & Submodules */}
        <div className="border-b border-white/5">
          <button
            onClick={() => toggle('worktrees')}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
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
            <div className="px-2.5 pb-2.5 space-y-1.5">
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
        </div>

        {/* Pull Requests & Issues (In-App Integration) */}
        <div className="border-b border-white/5">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => toggle('prs')}
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
            >
              {openSections.prs ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <GitPullRequest className="w-3.5 h-3.5 text-pink-400" />
              <span>PRs & Issues</span>
              <span className="text-[10px] font-mono text-slate-500">
                {pullRequests.length + issues.length}
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
            <div className="px-2.5 pb-3 space-y-1">
              {!remoteInfo && (
                <div className="text-[11px] text-slate-500 px-1">
                  No GitHub/GitLab remote configured
                </div>
              )}
              {remoteInfo && pullRequests.length === 0 && issues.length === 0 && (
                <div className="text-[11px] text-slate-500 px-1">
                  {remoteInfo.owner}/{remoteInfo.repo} — No open PRs or Issues found
                </div>
              )}

              {pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => setSelectedPR(pr)}
                  className="px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer transition"
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

              {issues.map((iss) => (
                <div
                  key={iss.id}
                  onClick={() => setSelectedIssue(iss)}
                  className="px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer transition"
                >
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <CircleDot className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="font-mono text-slate-400">#{iss.number}</span>
                    <span className="text-xs text-slate-200 truncate">
                      {iss.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* In-App PR Detail Modal */}
      {selectedPR &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium uppercase">
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
                  <span className="text-xs font-mono text-emerald-400">
                    Issue #{selectedIssue.number} by {selectedIssue.author}
                  </span>
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
