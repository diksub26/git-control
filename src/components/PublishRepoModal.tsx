import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  UploadCloud,
  Globe,
  Lock,
  Link2,
  Sparkles,
  FolderGit2,
  UserCheck,
  KeyRound,
  Check,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { getAuthorAvatarUrl } from '../utils/avatar';

export const PublishRepoModal: React.FC = () => {
  const {
    isPublishModalOpen,
    setPublishModalOpen,
    setAccountModalOpen,
    tabs,
    activeTabId,
    accounts,
    isGitInitialized,
    headHash,
    currentBranch,
    workingFiles,
    remoteInfo,
    runningOpLabel,
    publishLocalRepository,
  } = useGitStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const tokenAccounts = accounts.filter(
    (a) =>
      Boolean(a.token) && (a.provider === 'github' || a.provider === 'gitlab')
  );

  const [mode, setMode] = useState<'create-api' | 'custom-url'>('create-api');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [repoName, setRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [protocol, setProtocol] = useState<'https' | 'ssh'>('https');
  const [customRemoteUrl, setCustomRemoteUrl] = useState('');
  const [remoteName, setRemoteName] = useState('origin');
  const [initialCommitMessage, setInitialCommitMessage] =
    useState('Initial commit');
  const [pushAfterCreate, setPushAfterCreate] = useState(true);

  useEffect(() => {
    if (!isPublishModalOpen || !activeTab) return;
    setRepoName(activeTab.name);
    setDescription('');
    setRemoteName('origin');
    setInitialCommitMessage('Initial commit');
    if (tokenAccounts.length > 0) {
      setSelectedAccountId((prev) =>
        tokenAccounts.some((a) => a.id === prev) ? prev : tokenAccounts[0].id
      );
    } else {
      setSelectedAccountId('');
    }
  }, [isPublishModalOpen, activeTab?.id, accounts.length]);

  if (!isPublishModalOpen || !activeTab) return null;

  const hasNoCommits = !isGitInitialized || !headHash;
  const isSubmitting = Boolean(runningOpLabel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await publishLocalRepository({
      mode,
      accountId: selectedAccountId || undefined,
      repoName: repoName.trim() || activeTab.name,
      description: description.trim(),
      isPrivate,
      protocol,
      customRemoteUrl: customRemoteUrl.trim(),
      remoteName: remoteName.trim() || 'origin',
      initialCommitMessage: initialCommitMessage.trim() || 'Initial commit',
      pushAfterCreate,
    });
    if (ok) {
      setPublishModalOpen(false);
    }
  };

  return createPortal(
    <div
      onClick={() => !isSubmitting && setPublishModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Publish Local Repository
              </h3>
              <p className="text-xs text-slate-400">
                Publish <code className="text-sky-300 font-mono">{activeTab.name}</code> to GitHub, GitLab, or any remote Git server
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setPublishModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-slate-950 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setMode('create-api')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition ${
                mode === 'create-api'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create New Repo on GitHub / GitLab</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('custom-url')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition ${
                mode === 'custom-url'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Publish to Existing Remote URL</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Local Repo Status Notice (if uninitialized or 0 commits) */}
          {(!isGitInitialized || hasNoCommits) && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    {!isGitInitialized
                      ? 'This folder is not initialized as a Git repository yet.'
                      : 'This repository does not have any commits yet.'}
                  </span>{' '}
                  Git Control will automatically run{' '}
                  {!isGitInitialized && (
                    <>
                      <code className="font-mono text-amber-300">git init -b main</code>
                      {' and '}
                    </>
                  )}
                  create an initial commit ({workingFiles.length} file
                  {workingFiles.length === 1 ? '' : 's'}) before publishing.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-amber-200/90 mb-1">
                  Initial Commit Message
                </label>
                <input
                  type="text"
                  value={initialCommitMessage}
                  onChange={(e) => setInitialCommitMessage(e.target.value)}
                  placeholder="Initial commit"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/90 border border-amber-400/30 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {remoteInfo && (
            <div className="rounded-xl bg-sky-500/10 border border-sky-400/25 px-3.5 py-2.5 text-xs text-sky-200 flex items-center justify-between">
              <span>
                Current remote <code className="font-mono">{remoteInfo.remoteName}</code> points to{' '}
                <code className="font-mono text-sky-300">{remoteInfo.webUrl}</code>
              </span>
              <span className="text-[10px] text-slate-400">
                Publishing will update or add remote
              </span>
            </div>
          )}

          {mode === 'create-api' ? (
            <>
              {/* Account Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Publish Using Account (GitHub / GitLab)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPublishModalOpen(false);
                      setAccountModalOpen(true);
                    }}
                    className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Manage / Login Account</span>
                  </button>
                </div>

                {tokenAccounts.length === 0 ? (
                  <div className="rounded-xl bg-slate-950/80 border border-dashed border-white/15 p-4 text-center space-y-2">
                    <p className="text-xs text-slate-300">
                      No GitHub or GitLab account with a Personal Access Token is connected yet.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Connect a token in Account Manager for 1-click repository creation, or switch to the "Publish to Existing Remote URL" tab above.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPublishModalOpen(false);
                        setAccountModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Login with GitHub / GitLab Token</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tokenAccounts.map((acc) => {
                      const isSelected = acc.id === selectedAccountId;
                      const avatar =
                        acc.avatarUrl || getAuthorAvatarUrl(acc.email, acc.name);
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setSelectedAccountId(acc.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-400/50 text-white'
                              : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={avatar}
                              alt={acc.name}
                              className="w-7 h-7 rounded-full border border-white/15 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">
                                @{acc.username}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase">
                                {acc.provider}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Repository Name & Remote Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Remote Repository Name
                  </label>
                  <input
                    type="text"
                    required
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="my-awesome-project"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Remote Alias
                  </label>
                  <input
                    type="text"
                    required
                    value={remoteName}
                    onChange={(e) => setRemoteName(e.target.value)}
                    placeholder="origin"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of this repository..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Visibility & Remote Protocol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Repository Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrivate(true)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                        isPrivate
                          ? 'bg-amber-500/15 border-amber-400/40 text-amber-200 font-semibold'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Private</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrivate(false)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                        !isPrivate
                          ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 font-semibold'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Public</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Remote URL Protocol
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProtocol('https')}
                      className={`p-2.5 rounded-xl border text-xs font-mono transition ${
                        protocol === 'https'
                          ? 'bg-sky-500/20 border-sky-400/40 text-sky-200 font-semibold'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      HTTPS
                    </button>
                    <button
                      type="button"
                      onClick={() => setProtocol('ssh')}
                      className={`p-2.5 rounded-xl border text-xs font-mono transition ${
                        protocol === 'ssh'
                          ? 'bg-sky-500/20 border-sky-400/40 text-sky-200 font-semibold'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      SSH (git@)
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Custom Remote URL Mode */
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Remote Repository URL (HTTPS or SSH)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customRemoteUrl}
                  onChange={(e) => setCustomRemoteUrl(e.target.value)}
                  placeholder="https://github.com/username/repo.git or git@github.com:username/repo.git"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Remote Alias Name
                </label>
                <input
                  type="text"
                  required
                  value={remoteName}
                  onChange={(e) => setRemoteName(e.target.value)}
                  placeholder="origin"
                  className="w-48 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>
            </div>
          )}

          {/* Push Branch Checkbox */}
          <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={pushAfterCreate}
              onChange={(e) => setPushAfterCreate(e.target.checked)}
              className="rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-0"
            />
            <span>
              Push branch{' '}
              <code className="font-mono text-sky-300">
                {currentBranch === 'uninitialized' ? 'main' : currentBranch}
              </code>{' '}
              and set upstream tracking (<code className="font-mono">git push -u {remoteName || 'origin'}</code>)
            </span>
          </label>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setPublishModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (mode === 'create-api' && tokenAccounts.length === 0)
              }
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-emerald-600/25 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{runningOpLabel}...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish Repository</span>
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
