import React, { useEffect } from 'react';
import { TopTabBar } from './components/TopTabBar';
import { LeftSidebar } from './components/LeftSidebar';
import { GitGraphView } from './components/GitGraphView';
import { RightContextPanel } from './components/RightContextPanel';
import { DiffAndConflictModal } from './components/DiffAndConflictModal';
import { CommandLogDrawer } from './components/CommandLogDrawer';
import { useGitStore } from './store/useGitStore';

export const App: React.FC = () => {
  const { initStore, toast } = useGitStore();

  useEffect(() => {
    initStore();
  }, [initStore]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-slate-100">
      {/* Top Multi-Repo Tab Bar & Quick Git Toolbar */}
      <TopTabBar />

      {/* Main 3-Panel IDE Workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        <LeftSidebar />
        <GitGraphView />
        <RightContextPanel />
      </main>

      {/* Bottom Git Command Log & Output Console */}
      <CommandLogDrawer />

      {/* Monaco Diff & Hunk Staging / Conflict Resolver Modal */}
      <DiffAndConflictModal />

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
    </div>
  );
};

export default App;
