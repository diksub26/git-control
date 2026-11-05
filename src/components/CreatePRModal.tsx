import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  GitPullRequest,
  GitBranch,
  ArrowRight,
  ExternalLink,
  Loader2,
  Send,
  X,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { openExternalUrl } from '../services/gitService';

export const CreatePRModal: React.FC = () => {
  const {
    isCreatePRModalOpen,
    setCreatePRModalOpen,
    remoteInfo,
    currentBranch,
    refs,
    commits,
    createPullRequest,
  } = useGitStore();

  const [headBranch, setHeadBranch] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [draft, setDraft] = useState(false);
  const [pushBranchFirst, setPushBranchFirst] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const localBranches = refs
    .filter((r) => r.type === 'local-branch')
    .map((r) => r.name);
  const remoteBranches = refs
    .filter((r) => r.type === 'remote-branch')
    .map((r) => r.name.replace(/^origin\//, ''))
    .filter((name) => name !== 'HEAD');

  const allBranchNames = Array.from(
    new Set([...localBranches, ...remoteBranches])
  );

  useEffect(() => {
    if (isCreatePRModalOpen) {
      const source = currentBranch || localBranches[0] || 'main';
      setHeadBranch(source);

      const defaultBase =
        allBranchNames.find(
          (b) => (b === 'main' || b === 'master' || b === 'develop') && b !== source
        ) ||
        allBranchNames.find((b) => b !== source) ||
        'main';
      setBaseBranch(defaultBase);

      const latestCommit = commits[0];
      setTitle(latestCommit?.subject || `Merge ${source} into ${defaultBase}`);
      setBody(latestCommit?.body || '');
      setDraft(false);
      setPushBranchFirst(true);
    }
  }, [isCreatePRModalOpen, currentBranch]);

  if (!isCreatePRModalOpen || !remoteInfo) return null;

  const browserCompareUrl =
    remoteInfo.provider === 'github'
      ? `${remoteInfo.webUrl}/compare/${encodeURIComponent(
          baseBranch
        )}...${encodeURIComponent(headBranch)}?expand=1`
      : remoteInfo.provider === 'gitlab'
      ? `${remoteInfo.webUrl}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(
          headBranch
        )}&merge_request[target_branch]=${encodeURIComponent(baseBranch)}`
      : remoteInfo.webUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !headBranch.trim() || !baseBranch.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createPullRequest({
        title: title.trim(),
        body: body.trim(),
        headBranch: headBranch.trim(),
        baseBranch: baseBranch.trim(),
        draft,
        pushBranchFirst,
      });
      if (created) {
        setCreatePRModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={() => !isSubmitting && setCreatePRModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-500/15 border border-pink-400/30">
              <GitPullRequest className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Create {remoteInfo.provider === 'gitlab' ? 'Merge' : 'Pull'} Request
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {remoteInfo.owner}/{remoteInfo.repo} ({remoteInfo.provider.toUpperCase()})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openExternalUrl(browserCompareUrl)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-sky-300 transition"
              title="Open Compare & Pull Request page in web browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Browser</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCreatePRModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Branch Selector Row: Source -> Target */}
          <div className="p-3.5 rounded-xl bg-slate-950/75 border border-white/10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-sky-400 mb-1">
                Source (Head) Branch
              </label>
              <div className="relative flex items-center">
                <GitBranch className="w-3.5 h-3.5 text-sky-400 absolute left-3 pointer-events-none" />
                <select
                  value={headBranch}
                  onChange={(e) => setHeadBranch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                >
                  {allBranchNames.map((b) => (
                    <option key={`head-${b}`} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center pt-4">
              <div className="p-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                Target (Base) Branch
              </label>
              <div className="relative flex items-center">
                <GitBranch className="w-3.5 h-3.5 text-emerald-400 absolute left-3 pointer-events-none" />
                <select
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                >
                  {allBranchNames.map((b) => (
                    <option key={`base-${b}`} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {headBranch === baseBranch && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-400/30 text-xs text-amber-200">
              Source branch and target branch are currently identical (<code>{headBranch}</code>). Select two different branches to compare changes.
            </div>
          )}

          {/* PR Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Pull Request Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. feat: add IDE & AI Harness integration"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* PR Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description (Markdown)
            </label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the changes, motivation, and testing steps..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 resize-none"
            />
          </div>

          {/* Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={pushBranchFirst}
                onChange={(e) => setPushBranchFirst(e.target.checked)}
                className="rounded border-white/20 bg-slate-900 text-sky-500 focus:ring-0"
              />
              <span>
                Push <code className="text-sky-300 font-mono">{headBranch}</code> to{' '}
                <code className="text-slate-300 font-mono">origin</code> first
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                className="rounded border-white/20 bg-slate-900 text-pink-500 focus:ring-0"
              />
              <span>Create as Draft Pull Request</span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCreatePRModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !title.trim() ||
                !headBranch.trim() ||
                !baseBranch.trim() ||
                headBranch === baseBranch
              }
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-pink-600/25 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating PR...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Create Pull Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
