import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Code2,
  Bot,
  Terminal,
  Check,
  FolderGit2,
  FolderOpen,
  Play,
  Plus,
  Trash2,
  RefreshCw,
  Settings2,
  Search,
  X,
  RotateCcw,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { useShallow } from 'zustand/react/shallow';
import { pickIdeExecutable } from '../services/gitService';
import { IdeConfig } from '../types/git';

export const IdeIntegrationModal: React.FC = () => {
  const {
  isIdeModalOpen,
  ideModalInitialFilter,
  setIdeModalOpen,
  tabs,
  activeTabId,
  detectedIdes,
  customIdes,
  customIdePaths,
  defaultIdeId,
  defaultAiHarnessId,
  refreshDetectedIdes,
  setRepoPreferredIde,
  setRepoPreferredAiHarness,
  updateIdeExecutablePath,
  saveCustomIde,
  removeCustomIde,
  openActiveRepoInIde,
  openActiveRepoInAiHarness,
  requestConfirm,
} = useGitStore(
  useShallow((s) => ({ isIdeModalOpen: s.isIdeModalOpen, ideModalInitialFilter: s.ideModalInitialFilter, setIdeModalOpen: s.setIdeModalOpen, tabs: s.tabs, activeTabId: s.activeTabId, detectedIdes: s.detectedIdes, customIdes: s.customIdes, customIdePaths: s.customIdePaths, defaultIdeId: s.defaultIdeId, defaultAiHarnessId: s.defaultAiHarnessId, refreshDetectedIdes: s.refreshDetectedIdes, setRepoPreferredIde: s.setRepoPreferredIde, setRepoPreferredAiHarness: s.setRepoPreferredAiHarness, updateIdeExecutablePath: s.updateIdeExecutablePath, saveCustomIde: s.saveCustomIde, removeCustomIde: s.removeCustomIde, openActiveRepoInIde: s.openActiveRepoInIde, openActiveRepoInAiHarness: s.openActiveRepoInAiHarness, requestConfirm: s.requestConfirm }))
);

  const [modalTab, setModalTab] = useState<'list' | 'custom'>('list');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'ide' | 'ai-harness'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPathIdeId, setEditingPathIdeId] = useState<string | null>(null);
  const [pathDraft, setPathDraft] = useState('');

  // Custom IDE / AI Harness form state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<'ide' | 'ai-harness'>(
    'ai-harness'
  );
  const [customLaunchMode, setCustomLaunchMode] = useState<
    'gui' | 'terminal-cli'
  >('terminal-cli');
  const [customExecPath, setCustomExecPath] = useState('');
  const [setCustomForRepo, setSetCustomForRepo] = useState(true);

  useEffect(() => {
    if (isIdeModalOpen) {
      setCategoryFilter(ideModalInitialFilter || 'all');
      setSearchQuery('');
      setModalTab('list');
    }
  }, [isIdeModalOpen, ideModalInitialFilter]);

  if (!isIdeModalOpen) return null;

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const allIdes: IdeConfig[] = [
    ...detectedIdes.map((d) => ({
      ...d,
      executablePath: customIdePaths[d.id] || d.executablePath,
      installed: Boolean(customIdePaths[d.id]) || d.installed,
    })),
    ...customIdes,
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredList = allIdes.filter((item) => {
    const matchesCategory =
      categoryFilter === 'all' ? true : item.category === categoryFilter;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;
    return (
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.command.toLowerCase().includes(normalizedQuery) ||
      item.id.toLowerCase().includes(normalizedQuery) ||
      (item.executablePath &&
        item.executablePath.toLowerCase().includes(normalizedQuery))
    );
  });

  const effectiveRepoIdeId =
    activeTab?.preferredIdeId || defaultIdeId || 'vscode';
  const effectiveRepoIde = allIdes.find((i) => i.id === effectiveRepoIdeId);

  const effectiveRepoAiId =
    activeTab?.preferredAiHarnessId || defaultAiHarnessId || 'antigravity';
  const effectiveRepoAi = allIdes.find((i) => i.id === effectiveRepoAiId);

  const handleBrowsePathForIde = async (ideId: string) => {
    const picked = await pickIdeExecutable();
    if (picked) {
      updateIdeExecutablePath(ideId, picked);
      setEditingPathIdeId(null);
    }
  };

  const handleBrowseCustomIdeExec = async () => {
    const picked = await pickIdeExecutable();
    if (picked) {
      setCustomExecPath(picked);
      if (!customName.trim()) {
        const base =
          picked
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.(exe|cmd|bat|app)$/i, '') || '';
        if (base) setCustomName(base);
      }
    }
  };

  const handleSaveCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customExecPath.trim()) return;
    saveCustomIde(
      {
        name: customName.trim(),
        executablePath: customExecPath.trim(),
        category: customCategory,
        launchMode: customLaunchMode,
      },
      setCustomForRepo
    );
    setCustomName('');
    setCustomExecPath('');
    setModalTab('list');
  };

  return createPortal(
    <div
      onClick={() => setIdeModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl min-h-[560px] max-h-[88vh] rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-400/30">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Manage IDE & AI Harness Integration
              </h3>
              <p className="text-xs text-slate-400">
                Bind your favorite Code IDE and AI Coding Harness (Antigravity, Claude Code, Codex, Cursor, Aider) per repository
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
                    ? 'bg-sky-500/25 text-sky-200 font-medium border border-sky-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>IDEs & AI Harnesses ({allIdes.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('custom')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                  modalTab === 'custom'
                    ? 'bg-sky-500/25 text-sky-200 font-medium border border-sky-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Tool</span>
              </button>
            </div>

            <button
              onClick={() => setIdeModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {modalTab === 'list' ? (
          <div className="flex-1 flex flex-col min-h-0 p-6 space-y-4 overflow-hidden">
            {/* Active Binding Cards: Current Repo Code IDE vs Current Repo AI Harness */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 shrink-0">
              {/* Current Repository Code IDE Card */}
              <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3.5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                    <Code2 className="w-3.5 h-3.5" />
                    <span className="truncate">
                      Code IDE ({activeTab ? activeTab.name : 'Default'})
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-2">
                      <span>{effectiveRepoIde?.name || effectiveRepoIdeId}</span>
                      {activeTab?.preferredIdeId ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-[10px] text-sky-300">
                          Repo Specific
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-slate-300">
                          Global Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {effectiveRepoIde?.executablePath ||
                        effectiveRepoIde?.command ||
                        'code'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeTab?.preferredIdeId && (
                    <button
                      type="button"
                      onClick={() => setRepoPreferredIde('', 'repo')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-400 transition"
                      title="Reset to Global Default IDE"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {activeTab && (
                    <button
                      type="button"
                      onClick={() => openActiveRepoInIde()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>Open IDE</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Current Repository AI Harness Card */}
              <div className="rounded-xl bg-slate-950/70 border border-purple-400/20 p-3.5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                    <Bot className="w-3.5 h-3.5" />
                    <span className="truncate">
                      AI Harness ({activeTab ? activeTab.name : 'Default'})
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-2">
                      <span>{effectiveRepoAi?.name || effectiveRepoAiId}</span>
                      {activeTab?.preferredAiHarnessId ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] text-purple-300">
                          Repo Specific
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-slate-300">
                          Global Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {effectiveRepoAi?.executablePath ||
                        effectiveRepoAi?.command ||
                        'agy'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeTab?.preferredAiHarnessId && (
                    <button
                      type="button"
                      onClick={() => setRepoPreferredAiHarness('', 'repo')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-400 transition"
                      title="Reset to Global Default AI Harness"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {activeTab && (
                    <button
                      type="button"
                      onClick={() => openActiveRepoInAiHarness()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>Open AI Harness</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Bar + Search + Re-scan */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${
                    categoryFilter === 'all'
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({allIdes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ide')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                    categoryFilter === 'ide'
                      ? 'bg-sky-500/25 text-sky-200 font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    Code IDEs ({allIdes.filter((i) => i.category === 'ide').length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ai-harness')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                    categoryFilter === 'ai-harness'
                      ? 'bg-purple-500/25 text-purple-200 font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    AI Harnesses (
                    {allIdes.filter((i) => i.category === 'ai-harness').length})
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search IDE or AI Harness (e.g. Antigravity, Claude, VS Code)..."
                    className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400/60 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => refreshDetectedIdes()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Re-Scan System</span>
                </button>
              </div>
            </div>

            {/* List of IDEs & AI Harnesses */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredList.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-slate-950/40">
                  <Search className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-300">
                    No IDE or AI Harness found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Try another keyword or add a custom tool via the &ldquo;Add Custom Tool&rdquo; tab.
                  </p>
                </div>
              ) : null}
              {filteredList.map((item) => {
                const isAi = item.category === 'ai-harness';
                const isRepoSelected = Boolean(activeTab) && (
                  isAi
                    ? activeTab?.preferredAiHarnessId === item.id
                    : activeTab?.preferredIdeId === item.id
                );
                const isEffectiveForRepo = Boolean(activeTab) && (
                  isAi
                    ? effectiveRepoAiId === item.id
                    : effectiveRepoIdeId === item.id
                );
                const isGlobalDefault = isAi
                  ? defaultAiHarnessId === item.id
                  : defaultIdeId === item.id;
                const isEditingPath = editingPathIdeId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3.5 transition ${
                      isEffectiveForRepo
                        ? isAi
                          ? 'bg-purple-500/[0.08] border-purple-400/35'
                          : 'bg-sky-500/[0.08] border-sky-400/35'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isAi ? (
                            <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                          ) : (
                            <Code2 className="w-4 h-4 text-sky-400 shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-white">
                            {item.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase ${
                              isAi
                                ? 'bg-purple-500/15 border-purple-400/30 text-purple-300'
                                : 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                            }`}
                          >
                            {isAi ? 'AI Harness' : 'Code IDE'}
                          </span>
                          {item.launchMode === 'terminal-cli' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-mono">
                              <Terminal className="w-3 h-3" />
                              Terminal CLI
                            </span>
                          )}
                          {item.installed ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-medium">
                              Detected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-white/10 text-slate-400 text-[10px]">
                              CLI / Custom Path
                            </span>
                          )}
                          {isRepoSelected && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-semibold">
                              <Check className="w-3 h-3" />
                              Repo Active
                            </span>
                          )}
                          {isGlobalDefault && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold">
                              <Check className="w-3 h-3" />
                              Global Default
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-mono text-slate-400 truncate mt-1">
                          {item.executablePath
                            ? item.executablePath
                            : `Command: ${item.command} (Click gear icon to customize path/arguments)`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {activeTab && (
                          <button
                            type="button"
                            onClick={() =>
                              isAi
                                ? setRepoPreferredAiHarness(item.id, 'repo')
                                : setRepoPreferredIde(item.id, 'repo')
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                              isRepoSelected
                                ? isAi
                                  ? 'bg-purple-500/25 border-purple-400/50 text-purple-200'
                                  : 'bg-sky-500/25 border-sky-400/50 text-sky-200'
                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                            }`}
                            title={`Bind ${item.name} to repository '${activeTab.name}'`}
                          >
                            {isRepoSelected ? 'Repo Active' : 'Use for Repo'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            isAi
                              ? setRepoPreferredAiHarness(item.id, 'global')
                              : setRepoPreferredIde(item.id, 'global')
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            isGlobalDefault
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                              : 'bg-white/5 hover:bg-emerald-500/20 border-white/10 hover:border-emerald-400/30 text-slate-200'
                          }`}
                          title={`Set ${item.name} as Global Default`}
                        >
                          {isGlobalDefault ? 'Global Active' : 'Set Global'}
                        </button>

                        {activeTab && (
                          <button
                            type="button"
                            onClick={() =>
                              isAi
                                ? openActiveRepoInAiHarness(item.id)
                                : openActiveRepoInIde(undefined, item.id)
                            }
                            className="p-2 rounded-lg text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/15 border border-white/10 transition"
                            title={`Launch '${activeTab.name}' in ${item.name} now`}
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingPath) {
                              setEditingPathIdeId(null);
                            } else {
                              setEditingPathIdeId(item.id);
                              setPathDraft(
                                item.executablePath || item.command || ''
                              );
                            }
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/10 transition"
                          title="Configure executable path or CLI command"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>

                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              requestConfirm({
                                title: `Remove '${item.name}'`,
                                description: `Are you sure you want to remove '${item.name}' from your integration list?`,
                                confirmLabel: 'Remove',
                                variant: 'danger',
                                onConfirm: () => {
                                  removeCustomIde(item.id);
                                },
                              });
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition"
                            title="Remove custom integration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Executable / CLI Command Override Editor */}
                    {isEditingPath && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                        <input
                          type="text"
                          value={pathDraft}
                          onChange={(e) => setPathDraft(e.target.value)}
                          placeholder={
                            item.launchMode === 'terminal-cli'
                              ? 'CLI command to run in repo directory (e.g. claude, codex, aider --model sonnet)'
                              : 'Full path to executable (e.g. C:\\Users\\...\\Code.exe)'
                          }
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleBrowsePathForIde(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 border border-white/10 transition"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                          <span>Browse...</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateIdeExecutablePath(item.id, pathDraft);
                            setEditingPathIdeId(null);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Add Custom IDE or AI Harness Tab */
          <form
            onSubmit={handleSaveCustomSubmit}
            className="flex-1 flex flex-col justify-between p-6 space-y-5"
          >
            <div className="space-y-4">
              {/* Category & Launch Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Integration Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomCategory('ai-harness')}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                        customCategory === 'ai-harness'
                          ? 'bg-purple-500/20 border-purple-400/50 text-purple-200 font-semibold'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Bot className="w-4 h-4 text-purple-400" />
                      <span>AI Harness</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomCategory('ide');
                        setCustomLaunchMode('gui');
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                        customCategory === 'ide'
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-200 font-semibold'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-4 h-4 text-sky-400" />
                      <span>Code IDE / Editor</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Launch Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomLaunchMode('terminal-cli')}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                        customLaunchMode === 'terminal-cli'
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 font-semibold'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Terminal className="w-4 h-4 text-amber-400" />
                      <span>Terminal CLI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomLaunchMode('gui')}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                        customLaunchMode === 'gui'
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 font-semibold'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      <span>GUI App (.exe / .app)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={
                    customCategory === 'ai-harness'
                      ? 'e.g. Claude Code (Auto-Approve), Aider Sonnet, Amp CLI...'
                      : 'e.g. JetBrains RustRover, PhpStorm, Android Studio...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {customLaunchMode === 'terminal-cli'
                    ? 'Terminal CLI Command (Executed inside repository root)'
                    : 'Executable Path or CLI Command'}
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    required
                    value={customExecPath}
                    onChange={(e) => setCustomExecPath(e.target.value)}
                    placeholder={
                      customLaunchMode === 'terminal-cli'
                        ? 'e.g. claude, codex, gemini, opencode, aider --model sonnet'
                        : 'e.g. C:\\Program Files\\JetBrains\\RustRover\\bin\\rustrover64.exe'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseCustomIdeExec}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-100 border border-white/15 transition shrink-0"
                  >
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                    <span>Browse...</span>
                  </button>
                </div>
              </div>

              {activeTab && (
                <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setCustomForRepo}
                    onChange={(e) => setSetCustomForRepo(e.target.checked)}
                    className="rounded border-white/20 bg-slate-900 text-sky-500 focus:ring-0"
                  />
                  <span>
                    Immediately bind this {customCategory === 'ai-harness' ? 'AI Harness' : 'IDE'} to current repository (
                    <code className="text-sky-300 font-mono">{activeTab.name}</code>)
                  </span>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalTab('list')}
                className="px-4 py-2.5 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/25 transition"
              >
                <Plus className="w-4 h-4" />
                <span>
                  Save Custom {customCategory === 'ai-harness' ? 'AI Harness' : 'IDE'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
