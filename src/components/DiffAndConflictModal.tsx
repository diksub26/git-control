import React, { useEffect, useState } from 'react';
import { DiffEditor, Editor } from '@monaco-editor/react';
import {
  X,
  Columns,
  AlignJustify,
  Plus,
  Minus,
  RotateCcw,
  CheckCircle2,
  Code2,
  Sparkles,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import {
  applyHunkAction,
  detectLanguageFromPath,
  openInExternalEditor,
  readConflictFileContent,
  resolveConflictBlocks,
  writeConflictFileContent,
} from '../services/gitService';
import { DiffHunk } from '../types/git';

export const DiffAndConflictModal: React.FC = () => {
  const {
    tabs,
    activeTabId,
    activeDiffRequest,
    activeDiffData,
    diffViewMode,
    setDiffViewMode,
    openFileDiff,
    refreshActiveRepo,
    stageFile,
    showToast,
  } = useGitStore();

  const [conflictContent, setConflictContent] = useState('');
  const [selectedHunkId, setSelectedHunkId] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (activeDiffRequest?.mode === 'conflict' && activeTab) {
      readConflictFileContent(activeTab.path, activeDiffRequest.filePath).then(
        (c) => setConflictContent(c)
      );
    }
  }, [activeDiffRequest, activeTab]);

  if (!activeDiffRequest || !activeTab) return null;

  const isConflictMode = activeDiffRequest.mode === 'conflict';
  const isWorkingMode =
    activeDiffRequest.mode === 'working-unstaged' ||
    activeDiffRequest.mode === 'working-staged';

  const handleHunkOp = async (
    hunk: DiffHunk,
    action: 'stage' | 'unstage' | 'discard'
  ) => {
    const res = await applyHunkAction(activeTab.path, hunk, action);
    if (res.exitCode === 0) {
      showToast(`Hunk ${action}d successfully`, 'success');
      await refreshActiveRepo();
      await openFileDiff(activeDiffRequest);
    } else {
      showToast(`Hunk ${action} failed: ${res.stderr}`, 'error');
    }
  };

  const handleSaveAndResolveConflict = async () => {
    await writeConflictFileContent(
      activeTab.path,
      activeDiffRequest.filePath,
      conflictContent
    );
    await stageFile(activeDiffRequest.filePath);
    openFileDiff(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
      <div className="w-full h-full max-w-7xl rounded-2xl bg-slate-950/95 border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-12 px-4 flex items-center justify-between bg-slate-900/80 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold uppercase">
              {isConflictMode ? 'Conflict Resolver' : activeDiffRequest.mode}
            </span>
            <span className="font-mono text-xs text-white truncate">
              {activeDiffRequest.filePath}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isConflictMode ? (
              <>
                <button
                  onClick={() =>
                    setConflictContent(
                      resolveConflictBlocks(conflictContent, 'ours')
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-xs text-sky-200"
                >
                  Accept Current (Ours)
                </button>
                <button
                  onClick={() =>
                    setConflictContent(
                      resolveConflictBlocks(conflictContent, 'theirs')
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-xs text-purple-200"
                >
                  Accept Incoming (Theirs)
                </button>
                <button
                  onClick={() =>
                    setConflictContent(
                      resolveConflictBlocks(conflictContent, 'both')
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-xs text-indigo-200"
                >
                  Accept Both
                </button>
                <button
                  onClick={() =>
                    openInExternalEditor(
                      activeTab.path,
                      activeDiffRequest.filePath,
                      'vscode'
                    )
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200"
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open in VS Code</span>
                </button>
                <button
                  onClick={handleSaveAndResolveConflict}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Mark Resolved</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center rounded-lg bg-white/5 p-0.5 border border-white/10 text-xs">
                  <button
                    onClick={() => setDiffViewMode('side-by-side')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                      diffViewMode === 'side-by-side'
                        ? 'bg-sky-500/25 text-sky-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Side-by-Side</span>
                  </button>
                  <button
                    onClick={() => setDiffViewMode('unified')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                      diffViewMode === 'unified'
                        ? 'bg-sky-500/25 text-sky-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                    <span>Unified</span>
                  </button>
                </div>

                <button
                  onClick={() =>
                    openInExternalEditor(
                      activeTab.path,
                      activeDiffRequest.filePath,
                      'vscode'
                    )
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200"
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open in VS Code</span>
                </button>
              </>
            )}

            <button
              onClick={() => openFileDiff(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: Monaco Editor + Optional Hunk Staging Sidebar */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 h-full min-w-0">
            {isConflictMode ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={detectLanguageFromPath(activeDiffRequest.filePath)}
                value={conflictContent}
                onChange={(val) => setConflictContent(val || '')}
                options={{
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <DiffEditor
                height="100%"
                theme="vs-dark"
                language={activeDiffData?.language || 'plaintext'}
                original={activeDiffData?.oldContent || ''}
                modified={activeDiffData?.newContent || ''}
                options={{
                  renderSideBySide: diffViewMode === 'side-by-side',
                  readOnly: true,
                  fontSize: 12.5,
                  fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                }}
              />
            )}
          </div>

          {/* Interactive Hunk Staging Sidebar when viewing Working Changes */}
          {!isConflictMode &&
            isWorkingMode &&
            activeDiffData &&
            activeDiffData.hunks.length > 0 && (
              <div className="w-80 shrink-0 h-full border-l border-white/10 bg-slate-900/70 flex flex-col">
                <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Hunk-Level Staging ({activeDiffData.hunks.length})
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {activeDiffData.hunks.map((hunk, idx) => (
                    <div
                      key={hunk.id}
                      onClick={() => setSelectedHunkId(hunk.id)}
                      className={`rounded-xl border p-2.5 text-xs transition ${
                        selectedHunkId === hunk.id
                          ? 'bg-sky-500/10 border-sky-400/40'
                          : 'bg-slate-950/70 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] text-sky-300">
                          Hunk #{idx + 1} (L{hunk.newStart})
                        </span>

                        <div className="flex items-center gap-1">
                          {activeDiffRequest.mode === 'working-unstaged' ? (
                            <>
                              <button
                                onClick={() => handleHunkOp(hunk, 'stage')}
                                className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-600/80 hover:bg-emerald-500 text-[10px] font-medium text-white"
                              >
                                <Plus className="w-3 h-3" /> Stage Hunk
                              </button>
                              <button
                                onClick={() => handleHunkOp(hunk, 'discard')}
                                className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-600/70 hover:bg-rose-500 text-[10px] font-medium text-white"
                              >
                                <RotateCcw className="w-3 h-3" /> Discard
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleHunkOp(hunk, 'unstage')}
                              className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-600/80 hover:bg-amber-500 text-[10px] font-medium text-white"
                            >
                              <Minus className="w-3 h-3" /> Unstage Hunk
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-32 overflow-auto rounded bg-slate-950 p-1.5 font-mono text-[10px] space-y-0.5">
                        {hunk.lines.slice(0, 12).map((ln, lIdx) => (
                          <div
                            key={lIdx}
                            className={`px-1 rounded truncate ${
                              ln.type === 'add'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : ln.type === 'del'
                                ? 'bg-rose-500/15 text-rose-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {ln.type === 'add'
                              ? '+'
                              : ln.type === 'del'
                              ? '-'
                              : ' '}
                            {ln.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
