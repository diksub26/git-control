import React, { useState } from 'react';
import { TerminalSquare, Trash2, X, Play } from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { useShallow } from 'zustand/react/shallow';

export const CommandLogDrawer: React.FC = () => {
  const {
  commandLogs,
  isConsoleOpen,
  setConsoleOpen,
  clearCommandLogs,
  runGitOp,
} = useGitStore(
  useShallow((s) => ({ commandLogs: s.commandLogs, isConsoleOpen: s.isConsoleOpen, setConsoleOpen: s.setConsoleOpen, clearCommandLogs: s.clearCommandLogs, runGitOp: s.runGitOp }))
);

  const [customCmd, setCustomCmd] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isConsoleOpen) return null;

  const handleRunCustomGit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = customCmd.trim().replace(/^git\s+/i, '');
    if (!raw) return;
    const args = raw.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((s) => s.replace(/^"|"$/g, '')) || [];
    await runGitOp(`git ${raw}`, args);
    setCustomCmd('');
  };

  return (
    <div className="h-56 shrink-0 bg-slate-950/85 border-t border-white/15 flex flex-col z-20 select-none">
      {/* Header + Quick Command Runner */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-white/10 bg-slate-900/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <TerminalSquare className="w-4 h-4 text-sky-400" />
          <span>Git Command Log & Output Console</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono text-slate-300">
            {commandLogs.length}
          </span>
        </div>

        <form onSubmit={handleRunCustomGit} className="flex items-center gap-1.5 w-96">
          <span className="text-[11px] font-mono text-sky-400">git</span>
          <input
            type="text"
            value={customCmd}
            onChange={(e) => setCustomCmd(e.target.value)}
            placeholder="run custom git subcommand (e.g. status -s)..."
            className="flex-1 px-2.5 py-1 rounded bg-slate-950 border border-white/15 text-[11px] font-mono text-white focus:outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-[11px] text-white flex items-center gap-1"
          >
            <Play className="w-3 h-3" /> Run
          </button>
        </form>

        <div className="flex items-center gap-2">
          <button
            onClick={() => clearCommandLogs()}
            className="p-1 text-slate-400 hover:text-rose-300"
            title="Clear Logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConsoleOpen(false)}
            className="p-1 text-slate-400 hover:text-white"
            title="Close Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Command Log Entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[11px]">
        {commandLogs.map((log) => {
          const isExpanded = expandedId === log.id;
          return (
            <div
              key={log.id}
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              className="rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 px-2.5 py-1.5 cursor-pointer transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      log.exitCode === 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/25 text-rose-300'
                    }`}
                  >
                    exit {log.exitCode}
                  </span>
                  <span className="text-sky-300 truncate">{log.command}</span>
                </div>
                <span className="text-slate-500 text-[10px] shrink-0">
                  {log.durationMs}ms
                </span>
              </div>

              {isExpanded && (log.stdout || log.stderr) && (
                <pre className="mt-2 p-2 rounded bg-slate-950 text-[10px] text-slate-300 overflow-x-auto max-h-32 whitespace-pre-wrap border border-white/10 select-text">
                  {log.stderr ? `STDERR:\n${log.stderr}\n` : ''}
                  {log.stdout ? `STDOUT:\n${log.stdout}` : ''}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
