import React, { useState } from 'react';
import {
  FileCode2,
  Plus,
  Minus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  ArrowLeftRight,
  Send,
  Wrench,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { getAuthorAvatarUrl } from '../utils/avatar';

export const RightContextPanel: React.FC = () => {
  const {
    commits,
    workingFiles,
    selectedCommitHash,
    compareCommitHash,
    selectedCommitBody,
    selectedCommitFiles,
    remoteInfo,
    currentBranch,
    selectCommit,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    discardFile,
    commitChanges,
    runGitOp,
    openFileDiff,
    showToast,
  } = useGitStore();

  const [commitMessage, setCommitMessage] = useState('');
  const [amend, setAmend] = useState(false);
  const [signoff, setSignoff] = useState(false);

  const selectedCommit = commits.find((c) => c.hash === selectedCommitHash);
  const compareCommit = commits.find((c) => c.hash === compareCommitHash);

  const conflictedFiles = workingFiles.filter((f) => f.conflicted);
  const stagedFiles = workingFiles.filter((f) => f.staged);
  const unstagedFiles = workingFiles.filter((f) => f.unstaged || f.untracked);

  const handleCommitSubmit = async (pushAfter = false) => {
    if (!commitMessage.trim() && !amend) {
      showToast('Please enter a commit message', 'error');
      return;
    }
    const ok = await commitChanges(
      commitMessage.trim() || 'Amend commit',
      amend,
      signoff
    );
    if (ok) {
      setCommitMessage('');
      setAmend(false);
      if (pushAfter) {
        await runGitOp('Push', ['push', '-u', 'origin', currentBranch]);
      }
    }
  };

  // 1. Working Copy & Staging Mode
  if (selectedCommitHash === 'UNCOMMITTED' || !selectedCommit) {
    return (
      <aside className="w-96 shrink-0 h-full bg-slate-950/50 backdrop-blur-xl border-l border-white/10 flex flex-col select-none">
        <div className="h-11 px-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Working Copy & Staging
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {workingFiles.length} file(s)
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Conflicted Files Section */}
          {conflictedFiles.length > 0 && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Merge Conflicts ({conflictedFiles.length})
                </span>
              </div>
              <div className="space-y-1">
                {conflictedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/70 text-xs text-rose-200"
                  >
                    <span className="truncate font-mono text-[11px]">
                      {file.path}
                    </span>
                    <button
                      onClick={() =>
                        openFileDiff({
                          filePath: file.path,
                          mode: 'conflict',
                        })
                      }
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-[10px] font-medium text-white shrink-0"
                    >
                      <Wrench className="w-3 h-3" />
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staged Changes */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Staged Changes ({stagedFiles.length})
              </span>
              {stagedFiles.length > 0 && (
                <button
                  onClick={() => unstageAll()}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <Minus className="w-3 h-3" /> Unstage All
                </button>
              )}
            </div>

            <div className="space-y-1">
              {stagedFiles.length === 0 && (
                <div className="text-[11px] text-slate-500 px-2 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                  No staged files. Stage files or hunks below to commit.
                </div>
              )}
              {stagedFiles.map((file) => (
                <div
                  key={`staged-${file.path}`}
                  onClick={() =>
                    openFileDiff({
                      filePath: file.path,
                      mode: 'working-staged',
                    })
                  }
                  className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/[0.07] hover:bg-emerald-500/15 border border-emerald-500/20 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 w-3">
                      {file.indexStatus}
                    </span>
                    <span className="text-xs text-slate-200 truncate font-mono">
                      {file.path}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      unstageFile(file.path);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-slate-300"
                    title="Unstage file"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Unstaged / Untracked Changes */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Changes ({unstagedFiles.length})
              </span>
              {unstagedFiles.length > 0 && (
                <button
                  onClick={() => stageAll()}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Stage All
                </button>
              )}
            </div>

            <div className="space-y-1">
              {unstagedFiles.length === 0 && (
                <div className="text-[11px] text-slate-500 px-2 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                  Working tree is clean.
                </div>
              )}
              {unstagedFiles.map((file) => (
                <div
                  key={`unstaged-${file.path}`}
                  onClick={() =>
                    openFileDiff({
                      filePath: file.path,
                      mode: file.untracked
                        ? 'working-untracked'
                        : 'working-unstaged',
                    })
                  }
                  className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] font-mono font-bold w-3 ${
                        file.untracked ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {file.untracked ? 'U' : file.worktreeStatus}
                    </span>
                    <span className="text-xs text-slate-200 truncate font-mono">
                      {file.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        discardFile(file.path, file.untracked);
                      }}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                      title="Discard changes"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        stageFile(file.path);
                      }}
                      className="p-1 rounded hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300"
                      title="Stage file"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commit Box Footer */}
        <div className="p-3 border-t border-white/10 bg-slate-950/70 space-y-2.5">
          <textarea
            rows={3}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder={`Commit message on ${currentBranch}...`}
            className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 resize-none"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={amend}
                onChange={(e) => setAmend(e.target.checked)}
                className="rounded border-white/20 bg-slate-900"
              />
              <span>Amend</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={signoff}
                onChange={(e) => setSignoff(e.target.checked)}
                className="rounded border-white/20 bg-slate-900"
              />
              <span>Sign-off</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCommitSubmit(false)}
              className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-sky-600/20 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Commit ({stagedFiles.length})</span>
            </button>
            <button
              onClick={() => handleCommitSubmit(true)}
              className="px-3 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-xs font-medium text-white flex items-center gap-1 transition"
              title="Commit & Push to Remote"
            >
              <Send className="w-3.5 h-3.5" />
              <span>& Push</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 2. Compare 2 Commits Mode (Ctrl/Cmd + Click)
  if (compareCommit) {
    return (
      <aside className="w-96 shrink-0 h-full bg-slate-950/50 backdrop-blur-xl border-l border-white/10 flex flex-col select-none">
        <div className="h-11 px-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
              Compare 2 Commits
            </h2>
          </div>
          <button
            onClick={() => selectCommit(selectedCommit.hash, false)}
            className="text-[11px] text-sky-400 hover:underline"
          >
            Exit Compare
          </button>
        </div>

        <div className="p-3 border-b border-white/10 space-y-2 text-xs">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
            <div className="flex items-center justify-between text-[11px] text-sky-300 font-mono">
              <span>BASE: {selectedCommit.shortHash}</span>
              <span>{selectedCommit.authorName}</span>
            </div>
            <div className="text-slate-200 truncate mt-0.5">
              {selectedCommit.subject}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/25">
            <div className="flex items-center justify-between text-[11px] text-purple-300 font-mono">
              <span>COMPARE: {compareCommit.shortHash}</span>
              <span>{compareCommit.authorName}</span>
            </div>
            <div className="text-slate-200 truncate mt-0.5">
              {compareCommit.subject}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Changed Files ({selectedCommitFiles.length})
          </div>
          <div className="space-y-1">
            {selectedCommitFiles.map((file) => (
              <div
                key={file.path}
                onClick={() =>
                  openFileDiff({
                    filePath: file.path,
                    mode: 'compare',
                    compareFromHash: selectedCommit.hash,
                    compareToHash: compareCommit.hash,
                  })
                }
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 cursor-pointer transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono font-bold text-purple-400">
                    {file.status}
                  </span>
                  <span className="text-xs text-slate-200 truncate font-mono">
                    {file.path}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
                  <span className="text-emerald-400">+{file.additions}</span>
                  <span className="text-rose-400">-{file.deletions}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  // 3. Single Commit Details Mode (vscode-git-graph style)
  return (
    <aside className="w-96 shrink-0 h-full bg-slate-950/50 backdrop-blur-xl border-l border-white/10 flex flex-col select-none">
      <div className="h-11 px-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Commit Details
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-sky-400">
            {selectedCommit.shortHash}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(selectedCommit.hash);
              showToast('Copied full commit SHA', 'info');
            }}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title="Copy full SHA"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {remoteInfo && (
            <a
              href={`${remoteInfo.webUrl}/commit/${selectedCommit.hash}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-sky-300"
              title="Open Commit on Remote"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Commit Metadata & Message */}
      <div className="p-3.5 border-b border-white/10 space-y-3">
        <div className="flex items-center gap-2.5">
          <img
            src={getAuthorAvatarUrl(
              selectedCommit.authorName,
              selectedCommit.authorEmail
            )}
            alt={selectedCommit.authorName}
            className="w-8 h-8 rounded-full border border-white/15"
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {selectedCommit.authorName}
            </div>
            <div className="text-[11px] text-slate-400 truncate font-mono">
              {selectedCommit.authorEmail}
            </div>
          </div>
        </div>

        {/* Parents */}
        {selectedCommit.parents.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-400">Parents:</span>
            {selectedCommit.parents.map((p) => (
              <button
                key={p}
                onClick={() => selectCommit(p)}
                className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-sky-500/20 font-mono text-sky-300 border border-white/10"
              >
                {p.slice(0, 7)}
              </button>
            ))}
          </div>
        )}

        {/* Commit Message */}
        <div className="max-h-36 overflow-y-auto rounded-xl bg-slate-900/75 border border-white/10 p-2.5 text-xs text-slate-200 whitespace-pre-wrap font-sans">
          {selectedCommitBody || selectedCommit.subject}
        </div>
      </div>

      {/* Changed Files List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Changed Files ({selectedCommitFiles.length})
          </span>
          <span className="text-[10px] text-slate-500">Click file for Diff</span>
        </div>

        <div className="space-y-1">
          {selectedCommitFiles.map((file) => (
            <div
              key={file.path}
              onClick={() =>
                openFileDiff({
                  filePath: file.path,
                  mode: 'commit',
                  commitHash: selectedCommit.hash,
                })
              }
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 cursor-pointer transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-[10px] font-mono font-bold w-3 ${
                    file.status === 'A'
                      ? 'text-emerald-400'
                      : file.status === 'D'
                      ? 'text-rose-400'
                      : 'text-sky-400'
                  }`}
                >
                  {file.status}
                </span>
                <span className="text-xs text-slate-200 truncate font-mono">
                  {file.path}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
                <span className="text-emerald-400">+{file.additions}</span>
                <span className="text-rose-400">-{file.deletions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
