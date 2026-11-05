import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  UserCheck,
  UserPlus,
  Users,
  KeyRound,
  Globe,
  FolderGit2,
  Check,
  Trash2,
  Sparkles,
  ExternalLink,
  Loader2,
  Search,
  X,
  ShieldCheck,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { useGitStore } from '../store/useGitStore';
import { GitAccount, GitAccountProvider } from '../types/git';
import { verifyProviderToken } from '../services/gitService';
import { getAuthorAvatarUrl } from '../utils/avatar';

export const GitAccountModal: React.FC = () => {
  const {
    isAccountModalOpen,
    setAccountModalOpen,
    accounts,
    gitIdentity,
    tabs,
    activeTabId,
    saveGitAccount,
    applyAccountToGitConfig,
    clearRepoLocalIdentity,
    removeGitAccount,
    requestConfirm,
    showToast,
  } = useGitStore();

  const [activeTab, setActiveTab] = useState<'list' | 'login'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Login / Add / Edit form state
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [provider, setProvider] = useState<GitAccountProvider>('github');
  const [token, setToken] = useState('');
  const [hostUrl, setHostUrl] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [applyScope, setApplyScope] = useState<'global' | 'local' | 'both' | 'none'>('global');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isAccountModalOpen) return null;

  const currentRepoTab = tabs.find((t) => t.id === activeTabId);

  const resetForm = () => {
    setEditingId(undefined);
    setProvider('github');
    setToken('');
    setHostUrl('');
    setName('');
    setEmail('');
    setUsername('');
    setAvatarUrl(undefined);
    setApplyScope('global');
  };

  const handleStartEdit = (acc: GitAccount) => {
    setEditingId(acc.id);
    setProvider(acc.provider);
    setToken(acc.token || '');
    setHostUrl(acc.hostUrl || '');
    setName(acc.name);
    setEmail(acc.email);
    setUsername(acc.username);
    setAvatarUrl(acc.avatarUrl);
    setApplyScope('global');
    setActiveTab('login');
  };

  const handleVerifyToken = async () => {
    if (!token.trim()) {
      showToast('Please enter a Personal Access Token first', 'error');
      return;
    }
    setIsVerifying(true);
    try {
      const profile = await verifyProviderToken(provider, token, hostUrl);
      setUsername(profile.username);
      if (profile.name) setName(profile.name);
      if (profile.email) setEmail(profile.email);
      if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
      showToast(
        `Verified @${profile.username} (${profile.name}) via ${provider.toUpperCase()}`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Token verification failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = name.trim();
    let finalEmail = email.trim();
    let finalUsername = username.trim();
    let finalAvatar = avatarUrl;

    // If user entered a token for GitHub/GitLab but hasn't clicked Verify yet, auto-fetch profile
    if (
      token.trim() &&
      (!finalName || !finalEmail) &&
      (provider === 'github' || provider === 'gitlab' || provider === 'bitbucket')
    ) {
      setIsVerifying(true);
      try {
        const profile = await verifyProviderToken(provider, token, hostUrl);
        finalUsername = finalUsername || profile.username;
        finalName = finalName || profile.name;
        finalEmail = finalEmail || profile.email;
        finalAvatar = finalAvatar || profile.avatarUrl;
      } catch (err: any) {
        setIsVerifying(false);
        showToast(err?.message || 'Token verification failed', 'error');
        return;
      }
      setIsVerifying(false);
    }

    if (!finalName || !finalEmail) {
      showToast('Git Commit Name (user.name) and Email (user.email) are required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveGitAccount(
        {
          id: editingId,
          provider,
          name: finalName,
          email: finalEmail,
          username: finalUsername || finalEmail.split('@')[0],
          hostUrl: hostUrl.trim() || undefined,
          avatarUrl: finalAvatar,
          token: token.trim() || undefined,
        },
        applyScope
      );
      resetForm();
      setActiveTab('list');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const providerBadgeStyle = (p: GitAccountProvider) => {
    switch (p) {
      case 'github':
        return 'bg-slate-800 border-white/15 text-white';
      case 'gitlab':
        return 'bg-orange-500/20 border-orange-400/30 text-orange-300';
      case 'bitbucket':
        return 'bg-blue-500/20 border-blue-400/30 text-blue-300';
      default:
        return 'bg-purple-500/20 border-purple-400/30 text-purple-300';
    }
  };

  const providerLabel = (p: GitAccountProvider) => {
    switch (p) {
      case 'github':
        return 'GitHub';
      case 'gitlab':
        return 'GitLab';
      case 'bitbucket':
        return 'Bitbucket';
      default:
        return 'Git Identity';
    }
  };

  return createPortal(
    <div
      onClick={() => setAccountModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl min-h-[560px] max-h-[88vh] rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/30">
              <Users className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Git Account & Identity Manager
              </h3>
              <p className="text-xs text-slate-400">
                Manage logged-in Git accounts, switch Global or Per-Repository identity, and configure Personal Access Tokens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                  activeTab === 'list'
                    ? 'bg-sky-500/25 text-sky-200 font-medium border border-sky-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Accounts ({accounts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                  activeTab === 'login'
                    ? 'bg-sky-500/25 text-sky-200 font-medium border border-sky-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{editingId ? 'Edit Account' : 'Login / Add Account'}</span>
              </button>
            </div>

            <button
              onClick={() => setAccountModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'list' ? (
          <div className="flex-1 flex flex-col min-h-0 p-6 space-y-5 overflow-hidden">
            {/* Active Git Identity Status Cards (Global vs Local Repo) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 shrink-0">
              {/* Global Git Config Card */}
              <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3.5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Active Global Identity (--global)</span>
                  </div>
                  {gitIdentity.globalEmail ? (
                    <div className="mt-1.5">
                      <div className="text-xs font-semibold text-white truncate">
                        {gitIdentity.globalName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        &lt;{gitIdentity.globalEmail}&gt;
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-xs text-slate-500">
                      No global Git identity configured
                    </div>
                  )}
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-semibold text-emerald-300 shrink-0">
                  System Default
                </span>
              </div>

              {/* Current Repository Local Git Config Card */}
              <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3.5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span className="truncate">
                      Repo Identity ({currentRepoTab ? currentRepoTab.name : 'No Repo Open'})
                    </span>
                  </div>
                  {!currentRepoTab ? (
                    <div className="mt-1.5 text-xs text-slate-500">
                      Open a repository to view or override its local identity
                    </div>
                  ) : gitIdentity.localEmail ? (
                    <div className="mt-1.5">
                      <div className="text-xs font-semibold text-white truncate">
                        {gitIdentity.localName}
                      </div>
                      <div className="text-[11px] font-mono text-sky-300 truncate">
                        &lt;{gitIdentity.localEmail}&gt; (Local Override)
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <div className="text-xs font-medium text-slate-300 truncate">
                        Inheriting Global ({gitIdentity.effectiveName || 'Unset'})
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {gitIdentity.effectiveEmail
                          ? `<${gitIdentity.effectiveEmail}>`
                          : 'No identity set'}
                      </div>
                    </div>
                  )}
                </div>

                {currentRepoTab && gitIdentity.localEmail && (
                  <button
                    type="button"
                    onClick={clearRepoLocalIdentity}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 shrink-0 transition"
                    title="Unset local user.name & user.email so this repository uses Global config"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>Use Global</span>
                  </button>
                )}
              </div>
            </div>

            {/* Accounts List Header & Search */}
            <div className="flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Saved & Logged-In Accounts
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-mono text-slate-300">
                  {filteredAccounts.length}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search accounts..."
                    className="w-full pl-9 pr-7 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('login');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Account</span>
                </button>
              </div>
            </div>

            {/* Accounts List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredAccounts.length === 0 ? (
                <div className="h-48 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6">
                  <Users className="w-8 h-8 text-slate-600 mb-2" />
                  <div className="text-xs font-medium text-slate-300">
                    {accounts.length === 0
                      ? 'No Git accounts saved yet'
                      : 'No accounts match your search'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 mb-3">
                    Login with a GitHub/GitLab Personal Access Token or add a Git author identity.
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
                  >
                    Login / Add Git Account
                  </button>
                </div>
              ) : (
                filteredAccounts.map((acc) => {
                  const isGlobalActive =
                    gitIdentity.globalEmail.toLowerCase() === acc.email.toLowerCase() &&
                    gitIdentity.globalName.toLowerCase() === acc.name.toLowerCase();
                  const isLocalActive =
                    Boolean(currentRepoTab) &&
                    gitIdentity.localEmail.toLowerCase() === acc.email.toLowerCase() &&
                    gitIdentity.localName.toLowerCase() === acc.name.toLowerCase();

                  const avatar =
                    acc.avatarUrl || getAuthorAvatarUrl(acc.email, acc.name);

                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition ${
                        isGlobalActive || isLocalActive
                          ? 'bg-sky-500/[0.07] border-sky-400/30'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-4">
                        <img
                          src={avatar}
                          alt={acc.name}
                          className="w-10 h-10 rounded-full border border-white/15 shrink-0 bg-slate-800 object-cover"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate">
                              {acc.name}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              @{acc.username}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${providerBadgeStyle(
                                acc.provider
                              )}`}
                            >
                              {providerLabel(acc.provider)}
                            </span>
                            {acc.token && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-medium">
                                <ShieldCheck className="w-3 h-3" />
                                Token Connected
                              </span>
                            )}
                            {isGlobalActive && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold">
                                <Check className="w-3 h-3" />
                                Active Global
                              </span>
                            )}
                            {isLocalActive && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-semibold">
                                <Check className="w-3 h-3" />
                                Active in Repo
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-400 truncate mt-1">
                            {acc.email}
                            {acc.hostUrl ? ` • ${acc.hostUrl}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => applyAccountToGitConfig(acc.id, 'global')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            isGlobalActive
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                              : 'bg-white/5 hover:bg-emerald-500/20 border-white/10 hover:border-emerald-400/30 text-slate-200'
                          }`}
                          title="Set as system-wide Global Git config (git config --global)"
                        >
                          {isGlobalActive ? 'Global Active' : 'Use Global'}
                        </button>

                        {currentRepoTab && (
                          <button
                            type="button"
                            onClick={() => applyAccountToGitConfig(acc.id, 'local')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                              isLocalActive
                                ? 'bg-sky-500/25 border-sky-400/40 text-sky-200'
                                : 'bg-white/5 hover:bg-sky-500/20 border-white/10 hover:border-sky-400/30 text-slate-200'
                            }`}
                            title={`Set only for repository '${currentRepoTab.name}' (git config --local)`}
                          >
                            {isLocalActive ? 'Repo Active' : 'Use in Repo'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(acc)}
                          className="p-2 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/10 transition"
                          title="Edit account or update token"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            requestConfirm({
                              title: `Remove Account '${acc.name}'`,
                              description: `Remove '${acc.name} <${acc.email}>' from your saved accounts list in Git Control?`,
                              confirmLabel: 'Remove Account',
                              variant: 'danger',
                              onConfirm: () => {
                                removeGitAccount(acc.id);
                              },
                            });
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition"
                          title="Remove account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Login / Add / Edit Account Form */
          <form
            onSubmit={handleSaveSubmit}
            className="flex-1 flex flex-col justify-between p-6 space-y-5 overflow-y-auto"
          >
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Git Provider
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {(
                    [
                      { id: 'github', label: 'GitHub', desc: 'github.com / Enterprise' },
                      { id: 'gitlab', label: 'GitLab', desc: 'gitlab.com / Self-Hosted' },
                      { id: 'bitbucket', label: 'Bitbucket', desc: 'bitbucket.org' },
                      { id: 'custom', label: 'Custom / SSH', desc: 'Any Git Server' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProvider(item.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        provider === item.id
                          ? 'bg-sky-500/20 border-sky-400/50 text-white'
                          : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Token Authentication Box (for GitHub, GitLab, Bitbucket, or Custom HTTPS) */}
              {provider !== 'custom' && (
                <div className="rounded-xl bg-slate-950/80 border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>
                        Login with {providerLabel(provider)} Personal Access Token (PAT)
                      </span>
                    </label>
                    {provider === 'github' && (
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=Git+Control+Desktop"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span>Generate GitHub Token</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {provider === 'gitlab' && (
                      <a
                        href="https://gitlab.com/-/user_settings/personal_access_tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span>Generate GitLab Token</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2.5">
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={
                        provider === 'github'
                          ? 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                          : provider === 'gitlab'
                          ? 'glpat-xxxxxxxxxxxxxxxxxxxx'
                          : 'Paste Personal Access Token...'
                      }
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                    />
                    <button
                      type="button"
                      disabled={isVerifying || !token.trim()}
                      onClick={handleVerifyToken}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 border border-sky-400/30 text-xs font-semibold text-sky-200 transition shrink-0"
                    >
                      {isVerifying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      )}
                      <span>Verify & Auto-Fill Profile</span>
                    </button>
                  </div>

                  {(provider === 'gitlab' || provider === 'github') && (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Custom / Enterprise Host URL (Optional, leave blank for default)
                      </label>
                      <input
                        type="text"
                        value={hostUrl}
                        onChange={(e) => setHostUrl(e.target.value)}
                        placeholder={
                          provider === 'github'
                            ? 'https://github.com'
                            : 'https://gitlab.com'
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Author Identity Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Commit Author Name (<code className="text-sky-300">user.name</code>)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Diki"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Commit Author Email (<code className="text-sky-300">user.email</code>)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. diki@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. dikidev"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>
              </div>

              {/* Scope Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Apply Account to Git Configuration
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setApplyScope('global')}
                    className={`p-3 rounded-xl border text-left transition ${
                      applyScope === 'global'
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Set as Global Default</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Runs <code>git config --global</code>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!currentRepoTab}
                    onClick={() => setApplyScope('local')}
                    className={`p-3 rounded-xl border text-left transition disabled:opacity-40 ${
                      applyScope === 'local'
                        ? 'bg-sky-500/15 border-sky-400/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        Set for Current Repo ({currentRepoTab?.name || 'None'})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Runs <code>git config --local</code>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyScope('none')}
                    className={`p-3 rounded-xl border text-left transition ${
                      applyScope === 'none'
                        ? 'bg-purple-500/15 border-purple-400/40 text-white'
                        : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>Save to Account List Only</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Switch anytime from the list
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className="px-4 py-2.5 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isVerifying}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-sky-600/25 transition"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                <span>{editingId ? 'Update Account' : 'Login & Save Account'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
