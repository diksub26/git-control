import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Workflow,
  Play,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Search,
  X,
  Terminal,
  Copy,
  Globe,
  FolderGit2,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { GitWorkflow, GitWorkflowStep } from '../types/git';

const QUICK_COMMAND_PRESETS = [
  'git fetch -p',
  'git fetch --all --prune',
  'git pull origin main',
  'git pull --rebase origin main',
  'git pull --ff-only',
  'git push -f',
  'git push --force-with-lease',
  'git push -u origin ${branch}',
  'git stash',
  'git stash pop',
];

export function isWorkflowDestructive(wf: GitWorkflow): boolean {
  if (wf.confirmBeforeRun) return true;
  return wf.steps.some((s) =>
    /(?:^|\s)(-f|--force|--force-with-lease|--hard|-D|clean\b)/i.test(s.command)
  );
}

export const GitWorkflowModal: React.FC = () => {
  const {
    isWorkflowModalOpen,
    setWorkflowModalOpen,
    workflows,
    activeWorkflowRun,
    clearWorkflowRun,
    saveWorkflow,
    deleteWorkflow,
    runWorkflow,
    tabs,
    activeTabId,
    currentBranch,
    requestConfirm,
  } = useGitStore();

  const [modalTab, setModalTab] = useState<'list' | 'editor'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'global' | 'repo'>('global');
  const [confirmBeforeRun, setConfirmBeforeRun] = useState(true);
  const [steps, setSteps] = useState<GitWorkflowStep[]>([
    { id: 'step-1', command: 'git fetch -p' },
    { id: 'step-2', command: 'git pull origin main' },
    { id: 'step-3', command: 'git push -f' },
  ]);

  if (!isWorkflowModalOpen) return null;

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const visibleWorkflows = workflows.filter((wf) => {
    if (
      wf.scope === 'repo' &&
      wf.repoPath &&
      activeTab?.path &&
      wf.repoPath.toLowerCase() !== activeTab.path.toLowerCase()
    ) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      wf.name.toLowerCase().includes(q) ||
      (wf.description && wf.description.toLowerCase().includes(q)) ||
      wf.steps.some((s) => s.command.toLowerCase().includes(q))
    );
  });

  const handleOpenCreateNew = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setScope('global');
    setConfirmBeforeRun(true);
    setSteps([
      { id: `step-1-${Date.now()}`, command: 'git fetch -p' },
      { id: `step-2-${Date.now()}`, command: 'git pull origin main' },
      { id: `step-3-${Date.now()}`, command: 'git push -f' },
    ]);
    setModalTab('editor');
  };

  const handleOpenEdit = (wf: GitWorkflow) => {
    setEditingId(wf.id);
    setName(wf.name);
    setDescription(wf.description || '');
    setScope(wf.scope);
    setConfirmBeforeRun(Boolean(wf.confirmBeforeRun));
    setSteps(
      wf.steps.map((s) => ({
        id: s.id,
        command: s.command,
        continueOnError: Boolean(s.continueOnError),
      }))
    );
    setModalTab('editor');
  };

  const handleDuplicate = (wf: GitWorkflow) => {
    setEditingId(null);
    setName(`${wf.name} (Copy)`);
    setDescription(wf.description || '');
    setScope(wf.scope);
    setConfirmBeforeRun(Boolean(wf.confirmBeforeRun));
    setSteps(
      wf.steps.map((s, idx) => ({
        id: `step-${idx + 1}-${Date.now()}`,
        command: s.command,
        continueOnError: Boolean(s.continueOnError),
      }))
    );
    setModalTab('editor');
  };

  const handleAddStep = (presetCommand = '') => {
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${prev.length + 1}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 5)}`,
        command: presetCommand,
        continueOnError: false,
      },
    ]);
  };

  const handleUpdateStep = (
    index: number,
    patch: Partial<GitWorkflowStep>
  ) => {
    setSteps((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, ...patch } : s))
    );
  };

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const next = [...steps];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setSteps(next);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveWorkflow({
      id: editingId || undefined,
      name,
      description,
      scope,
      repoPath: scope === 'repo' ? activeTab?.path : undefined,
      confirmBeforeRun,
      steps,
    });
    setModalTab('list');
  };

  const handleTriggerRun = (wf: GitWorkflow) => {
    const needsConfirm = isWorkflowDestructive(wf);
    const expandedPreview = wf.steps
      .map(
        (s, idx) =>
          `${idx + 1}. ${s.command.replace(
            /\$\{branch\}|\{branch\}/gi,
            currentBranch || 'main'
          )}`
      )
      .join('\n');

    if (needsConfirm) {
      requestConfirm({
        title: `Run Workflow '${wf.name}'?`,
        description: `This workflow will execute ${wf.steps.length} sequential Git commands in '${
          activeTab?.name || 'repository'
        }' (branch: ${currentBranch}):`,
        confirmLabel: 'Run Workflow',
        variant: wf.steps.some((s) =>
          /(?:^|\s)(-f|--force|--hard|-D|clean\b)/i.test(s.command)
        )
          ? 'danger'
          : 'warning',
        commandPreview: expandedPreview,
        onConfirm: async () => {
          await runWorkflow(wf.id);
        },
      });
    } else {
      runWorkflow(wf.id);
    }
  };

  return createPortal(
    <div
      onClick={() => !activeWorkflowRun?.isRunning && setWorkflowModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl min-h-[580px] max-h-[88vh] rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/30">
              <Workflow className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Git Workflow Automation & Macros
              </h3>
              <p className="text-xs text-slate-400">
                Build multi-step Git command pipelines (e.g.{' '}
                <code className="text-amber-300 font-mono">git fetch -p</code> →{' '}
                <code className="text-amber-300 font-mono">git pull origin main</code>{' '}
                → <code className="text-amber-300 font-mono">git push -f</code>) and run them in 1 click
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setModalTab('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                  modalTab === 'list'
                    ? 'bg-amber-500/25 text-amber-200 font-medium border border-amber-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Workflows ({visibleWorkflows.length})</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateNew}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                  modalTab === 'editor'
                    ? 'bg-amber-500/25 text-amber-200 font-medium border border-amber-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingId ? 'Edit Workflow' : 'New Workflow'}</span>
              </button>
            </div>

            <button
              onClick={() => setWorkflowModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {modalTab === 'list' ? (
          <div className="flex-1 flex flex-col min-h-0 p-6 space-y-4 overflow-hidden">
            {/* Live Workflow Execution Output Banner (when running or recently executed) */}
            {activeWorkflowRun && (
              <div className="rounded-xl bg-slate-950/90 border border-amber-400/35 p-4 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeWorkflowRun.isRunning ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : activeWorkflowRun.stepResults.every(
                        (r) => r.status === 'success'
                      ) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-xs font-semibold text-white">
                      {activeWorkflowRun.isRunning
                        ? `Running Workflow: ${activeWorkflowRun.workflowName}...`
                        : `Execution Report: ${activeWorkflowRun.workflowName}`}
                    </span>
                  </div>
                  {!activeWorkflowRun.isRunning && (
                    <button
                      type="button"
                      onClick={() => clearWorkflowRun()}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Dismiss
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {activeWorkflowRun.stepResults.map((res, idx) => (
                    <div
                      key={res.stepId}
                      className="px-3 py-2 rounded-lg bg-slate-900/90 border border-white/10 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[10px] text-slate-500">
                            #{idx + 1}
                          </span>
                          {res.status === 'running' && (
                            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          )}
                          {res.status === 'success' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {res.status === 'error' && (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          {res.status === 'pending' && (
                            <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                          )}
                          {res.status === 'skipped' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              Skipped
                            </span>
                          )}
                          <span
                            className={
                              res.status === 'error'
                                ? 'text-rose-300'
                                : res.status === 'success'
                                ? 'text-emerald-200'
                                : 'text-slate-200'
                            }
                          >
                            {res.command}
                          </span>
                        </div>
                        {res.durationMs > 0 && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {res.durationMs}ms
                          </span>
                        )}
                      </div>
                      {(res.stderr.trim() || res.stdout.trim()) && (
                        <div className="mt-1.5 text-[11px] font-mono text-slate-400 bg-black/40 rounded p-2 whitespace-pre-wrap max-h-20 overflow-y-auto">
                          {res.stderr.trim() || res.stdout.trim()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search & Create Bar */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workflows or git commands (e.g. fetch, rebase, push -f)..."
                  className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenCreateNew}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Workflow</span>
              </button>
            </div>

            {/* Workflow Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {visibleWorkflows.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-slate-950/40">
                  <Workflow className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-300">
                    No Git workflows found
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click &ldquo;Create New Workflow&rdquo; to build a custom multi-step Git sequence.
                  </p>
                </div>
              ) : null}

              {visibleWorkflows.map((wf) => {
                const destructive = isWorkflowDestructive(wf);
                return (
                  <div
                    key={wf.id}
                    className="rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 p-4 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {wf.name}
                          </span>
                          {wf.scope === 'repo' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-medium">
                              <FolderGit2 className="w-3 h-3" />
                              Repo Only
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-slate-300 text-[10px]">
                              <Globe className="w-3 h-3" />
                              Global
                            </span>
                          )}
                          {destructive && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              Confirmation Enabled
                            </span>
                          )}
                        </div>
                        {wf.description && (
                          <p className="text-xs text-slate-400 mt-1">
                            {wf.description}
                          </p>
                        )}

                        {/* Visual Command Steps Pipeline */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {wf.steps.map((step, idx) => (
                            <React.Fragment key={step.id}>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-white/10 font-mono text-xs text-amber-200">
                                <span className="text-[10px] text-slate-500 font-sans font-bold">
                                  {idx + 1}.
                                </span>
                                <span>{step.command}</span>
                              </div>
                              {idx < wf.steps.length - 1 && (
                                <span className="text-slate-500 text-xs font-bold">
                                  →
                                </span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={Boolean(activeWorkflowRun?.isRunning) || !activeTab}
                          onClick={() => handleTriggerRun(wf)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition"
                          title={`Run '${wf.name}' in ${activeTab?.name || 'repository'}`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Run</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(wf)}
                          className="p-2 rounded-lg text-slate-300 hover:text-sky-300 hover:bg-white/10 border border-white/10 transition"
                          title="Edit workflow"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(wf)}
                          className="p-2 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-white/10 border border-white/10 transition"
                          title="Duplicate workflow"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            requestConfirm({
                              title: `Delete Workflow '${wf.name}'?`,
                              description: `Are you sure you want to delete the workflow '${wf.name}'?`,
                              confirmLabel: 'Delete Workflow',
                              variant: 'danger',
                              onConfirm: () => {
                                deleteWorkflow(wf.id);
                              },
                            });
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-white/10 transition"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Workflow Step Builder / Editor Form */
          <form
            onSubmit={handleSaveSubmit}
            className="flex-1 flex flex-col justify-between min-h-0 p-6 space-y-4 overflow-y-auto"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sync Main & Force Push"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Availability Scope
                  </label>
                  <select
                    value={scope}
                    onChange={(e) =>
                      setScope(e.target.value as 'global' | 'repo')
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="global">Global (All Repositories)</option>
                    {activeTab && (
                      <option value="repo">
                        Current Repo Only ({activeTab.name})
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this workflow automates..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Quick Command Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Quick-Add Command Step (Click to append)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Tip: Use <code className="text-amber-300 font-mono">{'${branch}'}</code> for active branch name
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_COMMAND_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddStep(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-[11px] font-mono text-slate-300 hover:text-amber-200 transition"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ordered Steps List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Sequential Git Commands ({steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddStep('')}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Empty Step</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-white/10"
                    >
                      <span className="w-6 text-center text-xs font-mono font-bold text-amber-400 shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="relative flex-1">
                        <Terminal className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={step.command}
                          onChange={(e) =>
                            handleUpdateStep(idx, { command: e.target.value })
                          }
                          placeholder="e.g. git fetch -p, git pull origin main, git push -f"
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <label
                        className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0 cursor-pointer px-1"
                        title="Continue to next step even if this command exits with an error"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(step.continueOnError)}
                          onChange={(e) =>
                            handleUpdateStep(idx, {
                              continueOnError: e.target.checked,
                            })
                          }
                          className="rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-0"
                        />
                        <span>Ignore Fail</span>
                      </label>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStep(idx, -1)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
                          title="Move step up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === steps.length - 1}
                          onClick={() => handleMoveStep(idx, 1)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
                          title="Move step down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={steps.length <= 1}
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 disabled:opacity-30"
                          title="Remove step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmBeforeRun}
                  onChange={(e) => setConfirmBeforeRun(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <span>
                  Show confirmation dialog with full command preview before running this workflow
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalTab('list')}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-lg shadow-amber-600/25 transition"
              >
                <Workflow className="w-4 h-4" />
                <span>{editingId ? 'Update Workflow' : 'Save Workflow'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
