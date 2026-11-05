import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderGit2, Loader2, AlertTriangle, X } from 'lucide-react';
import { TopTabBar } from './components/TopTabBar';
import { LeftSidebar } from './components/LeftSidebar';
import { GitGraphView } from './components/GitGraphView';
import { RightContextPanel } from './components/RightContextPanel';
import { DiffAndConflictModal } from './components/DiffAndConflictModal';
import { CommandLogDrawer } from './components/CommandLogDrawer';
import { GitAccountModal } from './components/GitAccountModal';
import { PublishRepoModal } from './components/PublishRepoModal';
import { useGitStore } from './store/useGitStore';
import { startWatchingRepository } from './services/gitService';

export const App: React.FC = () => {
  const {
    initStore,
    refreshActiveRepo,
    setRepoModalOpen,
    tabs,
    activeTabId,
    runningOpLabel,
    toast,
    confirmDialog,
    closeConfirm,
  } = useGitStore();
  const [isConfirmRunning, setIsConfirmRunning] = useState(false);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (!confirmDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirmRunning) {
        closeConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, isConfirmRunning, closeConfirm]);

  useEffect(() => {
    initStore();
  }, [initStore]);

  useEffect(() => {
    if (!activeTab?.path) return;
    let stopWatcher: (() => void) | null = null;
    startWatchingRepository(activeTab.path, () => {
      refreshActiveRepo();
    }).then((cleanup) => {
      stopWatcher = cleanup;
    });
    return () => {
      if (stopWatcher) stopWatcher();
    };
  }, [activeTab?.path, refreshActiveRepo]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-slate-100">
      {/* Top Multi-Repo Tab Bar & Quick Git Toolbar */}
      <TopTabBar />

      {/* Main 3-Panel IDE Workspace */}
      {tabs.length > 0 ? (
        <main className="flex-1 flex min-h-0 overflow-hidden">
          <LeftSidebar />
          <GitGraphView />
          <RightContextPanel />
        </main>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-400/20 mb-4">
            <FolderGit2 className="w-10 h-10 text-sky-400" />
          </div>
          <h2 className="text-base font-semibold text-white">
            No Repository Opened
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            Open an existing local repository, select from your bookmarks, or clone a remote repository.
          </p>
          <button
            onClick={() => setRepoModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
          >
            Open or Switch Git Repository
          </button>
        </main>
      )}

      {/* Bottom Git Command Log & Output Console */}
      <CommandLogDrawer />

      {/* Monaco Diff & Hunk Staging / Conflict Resolver Modal */}
      <DiffAndConflictModal />

      {/* Git Account & Identity Management Modal */}
      <GitAccountModal />

      {/* Publish Local Repository to Remote Modal */}
      <PublishRepoModal />

      {/* Floating Active Git/Remote Operation Loading Pill */}
      {runningOpLabel && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-sky-400/40 backdrop-blur-xl shadow-2xl text-xs font-medium text-sky-200">
          <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
          <span>{runningOpLabel}...</span>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border backdrop-blur-xl shadow-2xl text-xs font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-slate-900/90 border-sky-500/40 text-sky-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Global Confirmation Modal for Destructive / Dangerous Git Actions */}
      {confirmDialog &&
        createPortal(
          <div
            onClick={() => !isConfirmRunning && closeConfirm()}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3 bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 ${
                      confirmDialog.variant === 'warning'
                        ? 'bg-amber-500/15 border-amber-400/30 text-amber-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {confirmDialog.title}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        confirmDialog.variant === 'warning'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {confirmDialog.variant === 'warning'
                        ? 'Confirmation Required'
                        : 'Destructive Action'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isConfirmRunning}
                  onClick={closeConfirm}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {confirmDialog.description}
                </p>

                {confirmDialog.commandPreview && (
                  <div className="rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      Git Command Preview
                    </div>
                    <code className="text-xs font-mono text-sky-300 break-all">
                      {confirmDialog.commandPreview}
                    </code>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isConfirmRunning}
                    onClick={closeConfirm}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isConfirmRunning}
                    onClick={async () => {
                      setIsConfirmRunning(true);
                      try {
                        await confirmDialog.onConfirm();
                      } finally {
                        setIsConfirmRunning(false);
                        closeConfirm();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition disabled:opacity-50 ${
                      confirmDialog.variant === 'warning'
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                        : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                    }`}
                  >
                    {isConfirmRunning && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>{confirmDialog.confirmLabel || 'Confirm'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default App;
