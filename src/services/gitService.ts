import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  CommandLogEntry,
  CommitFileChange,
  DiffHunk,
  DiffLine,
  FileDiffData,
  GitAccountProvider,
  GitCommit,
  GitConfigIdentity,
  GitRef,
  GitSubmodule,
  GitWorktree,
  IdeConfig,
  RemoteHostInfo,
  RemoteIssue,
  RemotePullRequest,
  WorkingFileChange,
} from '../types/git';

export interface GitCommandResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  command: string;
}

type LogListener = (entry: CommandLogEntry) => void;
const logListeners = new Set<LogListener>();

export function onGitCommandLog(listener: LogListener): () => void {
  logListeners.add(listener);
  return () => {
    logListeners.delete(listener);
  };
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function execGit(
  repoPath: string,
  args: string[],
  stdin?: string
): Promise<GitCommandResponse> {
  let result: GitCommandResponse;

  if (isTauriRuntime()) {
    result = await invoke<GitCommandResponse>('run_git_command', {
      repoPath,
      args,
      stdin: stdin ?? null,
    });
  } else {
    const res = await fetch('/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, args, stdin }),
    });
    result = await res.json();
  }

  const rawCmd = result.command || `git ${args.join(' ')}`;
  const maskedCmd = rawCmd.replace(
    /http\.extraHeader=Authorization:\s*Basic\s+[^\s]+/gi,
    'http.extraHeader=Authorization: Basic ***'
  );

  const logEntry: CommandLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString(),
    repoPath,
    command: maskedCmd,
    durationMs: Number(result.durationMs || 0),
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
  logListeners.forEach((fn) => fn(logEntry));

  return result;
}

export async function pickRepositoryFolder(): Promise<string | null> {
  if (isTauriRuntime()) {
    return await invoke<string | null>('pick_folder');
  }
  const res = await fetch('/api/git', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'pick_folder' }),
  });
  const data = await res.json();
  return data.path || null;
}

export async function readConflictFileContent(
  repoPath: string,
  filePath: string
): Promise<string> {
  if (isTauriRuntime()) {
    return await invoke<string>('read_conflict_file', { repoPath, filePath });
  }
  const res = await fetch('/api/git', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'read_conflict_file', repoPath, filePath }),
  });
  const data = await res.json();
  return data.content || '';
}

export async function writeConflictFileContent(
  repoPath: string,
  filePath: string,
  content: string
): Promise<void> {
  if (isTauriRuntime()) {
    await invoke('write_conflict_file', { repoPath, filePath, content });
    return;
  }
  await fetch('/api/git', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'write_conflict_file', repoPath, filePath, content }),
  });
}

export async function openInExternalEditor(
  repoPath: string,
  filePath?: string,
  editor: string = 'vscode',
  customExecutable?: string,
  launchMode?: 'gui' | 'terminal-cli'
): Promise<void> {
  if (isTauriRuntime()) {
    await invoke('open_in_external_editor', {
      repoPath,
      filePath: filePath ?? null,
      editor,
      customExecutable: customExecutable ?? null,
      launchMode: launchMode ?? null,
    });
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;
  if (isTauriRuntime()) {
    try {
      await invoke('open_external_url', { url });
      return;
    } catch {
      // Fallback to window.open
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function detectInstalledIdes(): Promise<IdeConfig[]> {
  if (isTauriRuntime()) {
    return await invoke<IdeConfig[]>('detect_installed_ides');
  }
  return [
    {
      id: 'vscode',
      name: 'Visual Studio Code',
      category: 'ide',
      launchMode: 'gui',
      command: 'code',
      executablePath: 'code',
      installed: true,
    },
    {
      id: 'cursor-ide',
      name: 'Cursor (Classic Code IDE)',
      category: 'ide',
      launchMode: 'gui',
      command: 'cursor --classic',
      executablePath: 'cursor',
      installed: false,
    },
    {
      id: 'antigravity',
      name: 'Antigravity (AI Harness)',
      category: 'ai-harness',
      launchMode: 'gui',
      command: 'agy',
      executablePath: 'agy',
      installed: true,
    },
    {
      id: 'cursor',
      name: 'Cursor Agents Window',
      category: 'ai-harness',
      launchMode: 'gui',
      command: 'cursor --glass',
      executablePath: 'cursor',
      installed: false,
    },
    {
      id: 'cursor-agent-cli',
      name: 'Cursor Agent CLI',
      category: 'ai-harness',
      launchMode: 'terminal-cli',
      command: 'cursor agent',
      executablePath: 'cursor agent',
      installed: false,
    },
    {
      id: 'claude-code',
      name: 'Claude Code CLI',
      category: 'ai-harness',
      launchMode: 'terminal-cli',
      command: 'claude',
      executablePath: 'claude',
      installed: false,
    },
  ];
}

export async function pickIdeExecutable(): Promise<string | null> {
  if (isTauriRuntime()) {
    return await invoke<string | null>('pick_executable');
  }
  return null;
}

export async function resolveGitCredentialToken(
  repoPath: string,
  host: string
): Promise<string | null> {
  if (isTauriRuntime()) {
    try {
      return await invoke<string | null>('resolve_git_credential_token', {
        repoPath,
        host,
      });
    } catch {
      return null;
    }
  }
  return null;
}

export async function startWatchingRepository(
  repoPath: string,
  onRepoChanged: () => void
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return () => {};
  }
  try {
    await invoke('watch_repository', { repoPath });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unlisten = await listen<string>('repo-fs-changed', (event) => {
      if (event.payload?.toLowerCase() === repoPath.toLowerCase()) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          onRepoChanged();
        }, 650);
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      unlisten();
    };
  } catch {
    return () => {};
  }
}

export interface FullRepoState {
  isGitInitialized: boolean;
  currentBranch: string;
  headHash: string;
  commits: GitCommit[];
  refs: GitRef[];
  workingFiles: WorkingFileChange[];
  worktrees: GitWorktree[];
  submodules: GitSubmodule[];
  remoteInfo: RemoteHostInfo | null;
}

export interface GraphFetchOptions {
  maxCount?: number;
  selectedBranches?: string[]; // empty array = all branches & remotes
  CommitOrdering?: 'date' | 'topo' | 'author-date';
  firstParentOnly?: boolean;
}

export async function loadRepositoryState(
  repoPath: string,
  options: GraphFetchOptions = {}
): Promise<FullRepoState> {
  const maxCount = options.maxCount || 350;
  const orderFlag =
    options.CommitOrdering === 'topo'
      ? '--topo-order'
      : options.CommitOrdering === 'author-date'
      ? '--author-date-order'
      : '--date-order';

  const firstParentArg = options.firstParentOnly ? ['--first-parent'] : [];

  // 1. Fetch current branch & HEAD hash
  const [headBranchRes, symbolicHeadRes, headHashRes, statusRes, refsRes, stashRes, remoteRes] =
    await Promise.all([
      execGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']),
      execGit(repoPath, ['symbolic-ref', '--short', 'HEAD']),
      execGit(repoPath, ['rev-parse', 'HEAD']),
      execGit(repoPath, ['status', '--porcelain=v1', '-uall']),
      execGit(repoPath, [
        'for-each-ref',
        '--format=%(refname)\x01%(refname:short)\x01%(objectname)\x01%(objecttype)\x01%(*objectname)\x01%(HEAD)\x01%(upstream:short)\x01%(upstream:track)',
        'refs/heads',
        'refs/remotes',
        'refs/tags',
      ]),
      execGit(repoPath, [
        'stash',
        'list',
        '--format=%H\x01%h\x01%P\x01%an\x01%ae\x01%at\x01%ct\x01%gd\x01%gs',
      ]),
      execGit(repoPath, ['remote', '-v']),
    ]);

  const isGitInitialized = !statusRes.stderr
    .toLowerCase()
    .includes('not a git repository');
  const currentBranch =
    (headBranchRes.exitCode === 0 && headBranchRes.stdout.trim()) ||
    (symbolicHeadRes.exitCode === 0 && symbolicHeadRes.stdout.trim()) ||
    (isGitInitialized ? 'main' : 'uninitialized');
  const headHash = headHashRes.exitCode === 0 ? headHashRes.stdout.trim() : '';

  // 2. Parse Refs
  const refs: GitRef[] = [];
  const refsByCommit = new Map<string, GitRef[]>();

  const addRefToCommit = (hash: string, ref: GitRef) => {
    const arr = refsByCommit.get(hash) || [];
    arr.push(ref);
    refsByCommit.set(hash, arr);
  };

  for (const line of refsRes.stdout.split('\n')) {
    if (!line.trim()) continue;
    const [
      fullName,
      shortName,
      objName,
      _objType,
      derefObjName,
      isHeadMarker,
      upstream,
      track,
    ] = line.split('\x01');
    const targetHash = (derefObjName && derefObjName.trim()) || objName.trim();
    if (!targetHash) continue;

    let type: GitRef['type'] = 'local-branch';
    let remote: string | undefined;

    if (fullName.startsWith('refs/heads/')) {
      type = 'local-branch';
    } else if (fullName.startsWith('refs/remotes/')) {
      if (shortName.endsWith('/HEAD')) continue;
      type = 'remote-branch';
      remote = shortName.split('/')[0];
    } else if (fullName.startsWith('refs/tags/')) {
      type = 'tag';
    }

    let ahead = 0;
    let behind = 0;
    if (track) {
      const aheadMatch = track.match(/ahead (\d+)/);
      const behindMatch = track.match(/behind (\d+)/);
      if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
      if (behindMatch) behind = parseInt(behindMatch[1], 10);
    }

    const refObj: GitRef = {
      name: shortName,
      fullName,
      type,
      remote,
      commitHash: targetHash,
      isCurrentHead: isHeadMarker?.trim() === '*',
      upstream: upstream?.trim() || undefined,
      ahead,
      behind,
    };
    refs.push(refObj);
    addRefToCommit(targetHash, refObj);
  }

  // 3. Parse Working Files
  const workingFiles = parseGitStatusPorcelain(statusRes.stdout);

  // 4. Fetch Git Log for Graph (only include selected branches that exist in this repo)
  const validRefNames = new Set(refs.map((r) => r.name));
  const validSelectedBranches = (options.selectedBranches || []).filter((b) =>
    validRefNames.has(b)
  );
  const branchArg =
    validSelectedBranches.length > 0
      ? validSelectedBranches
      : ['--branches', '--tags', '--remotes', 'HEAD'];

  const logFormat = '%H\x01%h\x01%P\x01%an\x01%ae\x01%at\x01%ct\x01%s';
  const logRes = await execGit(repoPath, [
    'log',
    ...branchArg,
    ...firstParentArg,
    orderFlag,
    `-n`,
    String(maxCount),
    `--format=${logFormat}`,
  ]);

  const commits: GitCommit[] = [];
  const seenHashes = new Set<string>();

  for (const line of logRes.stdout.split('\n')) {
    if (!line.trim()) continue;
    const [hash, shortHash, parentsStr, authorName, authorEmail, authorDate, commitDate, subject] =
      line.split('\x01');
    if (!hash || seenHashes.has(hash)) continue;
    seenHashes.add(hash);

    const parents = parentsStr ? parentsStr.trim().split(' ').filter(Boolean) : [];
    const commitRefs = refsByCommit.get(hash) || [];

    commits.push({
      hash,
      shortHash,
      parents,
      authorName: authorName || 'Unknown',
      authorEmail: authorEmail || '',
      authorDate: parseInt(authorDate || '0', 10),
      commitDate: parseInt(commitDate || '0', 10),
      subject: subject || '(no message)',
      refs: commitRefs,
    });
  }

  // 5. Parse Stashes and weave into the commit list above their parent commit
  for (const line of stashRes.stdout.split('\n')) {
    if (!line.trim()) continue;
    const [hash, shortHash, parentsStr, authorName, authorEmail, authorDate, commitDate, selector, subject] =
      line.split('\x01');
    if (!hash) continue;
    const parents = parentsStr ? parentsStr.trim().split(' ').filter(Boolean) : [];
    const baseParent = parents[0]; // First parent is the branch commit where stash was created
    const stashRef: GitRef = {
      name: selector,
      fullName: `refs/stash/${selector}`,
      type: 'stash',
      commitHash: hash,
      stashSelector: selector,
    };
    refs.push(stashRef);

    const stashCommit: GitCommit = {
      hash,
      shortHash,
      parents: baseParent ? [baseParent] : [],
      authorName: authorName || 'Stash',
      authorEmail: authorEmail || '',
      authorDate: parseInt(authorDate || '0', 10),
      commitDate: parseInt(commitDate || '0', 10),
      subject: subject || selector,
      refs: [stashRef],
      isStash: true,
      stashSelector: selector,
    };

    const parentIdx = commits.findIndex((c) => c.hash === baseParent);
    if (parentIdx !== -1) {
      commits.splice(parentIdx, 0, stashCommit);
    } else {
      commits.unshift(stashCommit);
    }
  }

  // 6. Inject "Uncommitted Changes (*)" node at the very top of the graph if working tree is dirty
  if (workingFiles.length > 0 && headHash) {
    const nowSec = Math.floor(Date.now() / 1000);
    commits.unshift({
      hash: 'UNCOMMITTED',
      shortHash: '*',
      parents: [headHash],
      authorName: '*',
      authorEmail: '',
      authorDate: nowSec,
      commitDate: nowSec,
      subject: `Uncommitted Changes (${workingFiles.length})`,
      refs: [],
      isUncommitted: true,
    });
  }

  // 7. Fetch Worktrees & Submodules (fast native git commands without spawning MSYS2 sh.exe)
  const worktreeRes = await execGit(repoPath, ['worktree', 'list', '--porcelain']);
  const worktrees = parseWorktrees(worktreeRes.stdout);
  const submodules: GitSubmodule[] = [];
  const remoteInfo = parseRemoteHostInfo(remoteRes.stdout);

  return {
    isGitInitialized,
    currentBranch,
    headHash,
    commits,
    refs,
    workingFiles,
    worktrees,
    submodules,
    remoteInfo,
  };
}

function parseGitStatusPorcelain(stdout: string): WorkingFileChange[] {
  const files: WorkingFileChange[] = [];
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.length < 3) continue;
    const x = line[0];
    const y = line[1];
    let filePath = line.slice(3);
    let oldPath: string | undefined;

    if (filePath.includes(' -> ')) {
      const parts = filePath.split(' -> ');
      oldPath = parts[0];
      filePath = parts[1];
    }
    // Strip quotes if git quoted the path
    filePath = filePath.replace(/^"|"$/g, '');

    const untracked = x === '?' && y === '?';
    const conflicted =
      x === 'U' ||
      y === 'U' ||
      (x === 'A' && y === 'A') ||
      (x === 'D' && y === 'D');
    const staged = !untracked && !conflicted && x !== ' ';
    const unstaged = !untracked && !conflicted && y !== ' ';

    files.push({
      path: filePath,
      oldPath,
      indexStatus: x,
      worktreeStatus: y,
      staged,
      unstaged,
      untracked,
      conflicted,
    });
  }
  return files;
}

function parseWorktrees(stdout: string): GitWorktree[] {
  const list: GitWorktree[] = [];
  const blocks = stdout.trim().split(/\n\s*\n/);
  blocks.forEach((block, idx) => {
    if (!block.trim()) return;
    let wtPath = '';
    let head = '';
    let branch = 'detached';
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) wtPath = line.slice(9).trim();
      else if (line.startsWith('HEAD ')) head = line.slice(5).trim().slice(0, 7);
      else if (line.startsWith('branch '))
        branch = line.slice(7).trim().replace('refs/heads/', '');
    }
    if (wtPath) {
      list.push({ path: wtPath, head, branch, isMain: idx === 0 });
    }
  });
  return list;
}

function parseSubmodules(stdout: string): GitSubmodule[] {
  const list: GitSubmodule[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    const statusChar = line[0];
    const rest = line.slice(1).trim().split(/\s+/);
    const commit = rest[0]?.slice(0, 7) || '';
    const subPath = rest[1] || '';
    if (!subPath) continue;
    const status: GitSubmodule['status'] =
      statusChar === '+'
        ? 'modified'
        : statusChar === '-'
        ? 'uninitialized'
        : 'clean';
    list.push({
      name: subPath.split('/').pop() || subPath,
      path: subPath,
      commit,
      status,
    });
  }
  return list;
}

export function parseRemoteHostInfo(stdout: string): RemoteHostInfo | null {
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const remoteName = parts[0];
    const rawUrl = parts[1];

    // Match SSH or HTTPS GitHub/GitLab/Bitbucket URLs
    const match = rawUrl.match(
      /(?:git@|https?:\/\/)([\w.-]+)[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i
    );
    if (match) {
      const host = match[1].toLowerCase();
      const owner = match[2];
      const repo = match[3];
      const provider: RemoteHostInfo['provider'] = host.includes('github')
        ? 'github'
        : host.includes('gitlab')
        ? 'gitlab'
        : host.includes('bitbucket')
        ? 'bitbucket'
        : 'unknown';

      return {
        provider,
        owner,
        repo,
        remoteName,
        webUrl: `https://${host}/${owner}/${repo}`,
      };
    }
  }
  return null;
}

export async function getCommitChangedFiles(
  repoPath: string,
  commitHash: string
): Promise<{ body: string; files: CommitFileChange[] }> {
  const [bodyRes, numstatRes, statusRes] = await Promise.all([
    execGit(repoPath, [' show', '-s', '--format=%B', commitHash].map((s) => s.trim())),
    execGit(repoPath, ['show', '--numstat', '--format=', commitHash]),
    execGit(repoPath, ['show', '--name-status', '--format=', commitHash]),
  ]);

  const statusMap = new Map<string, CommitFileChange['status']>();
  for (const line of statusRes.stdout.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const st = (parts[0]?.[0] || 'M') as CommitFileChange['status'];
    const p = parts[parts.length - 1];
    if (p) statusMap.set(p.trim(), st);
  }

  const files: CommitFileChange[] = [];
  for (const line of numstatRes.stdout.split('\n')) {
    if (!line.trim()) continue;
    const [addStr, delStr, ...pathParts] = line.split('\t');
    const filePath = pathParts.join('\t').trim();
    if (!filePath) continue;
    files.push({
      path: filePath,
      status: statusMap.get(filePath) || 'M',
      additions: parseInt(addStr, 10) || 0,
      deletions: parseInt(delStr, 10) || 0,
    });
  }

  return {
    body: bodyRes.stdout.trim(),
    files,
  };
}

export async function getCompareCommitsFiles(
  repoPath: string,
  fromHash: string,
  toHash: string
): Promise<CommitFileChange[]> {
  const [numstatRes, statusRes] = await Promise.all([
    execGit(repoPath, ['diff', '--numstat', fromHash, toHash]),
    execGit(repoPath, ['diff', '--name-status', fromHash, toHash]),
  ]);

  const statusMap = new Map<string, CommitFileChange['status']>();
  for (const line of statusRes.stdout.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const st = (parts[0]?.[0] || 'M') as CommitFileChange['status'];
    const p = parts[parts.length - 1];
    if (p) statusMap.set(p.trim(), st);
  }

  const files: CommitFileChange[] = [];
  for (const line of numstatRes.stdout.split('\n')) {
    if (!line.trim()) continue;
    const [addStr, delStr, ...pathParts] = line.split('\t');
    const filePath = pathParts.join('\t').trim();
    if (!filePath) continue;
    files.push({
      path: filePath,
      status: statusMap.get(filePath) || 'M',
      additions: parseInt(addStr, 10) || 0,
      deletions: parseInt(delStr, 10) || 0,
    });
  }
  return files;
}

export function detectLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    rs: 'rust',
    py: 'python',
    go: 'go',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'ini',
    sh: 'shell',
  };
  return map[ext] || 'plaintext';
}

export async function getFileDiff(
  repoPath: string,
  filePath: string,
  options: {
    mode: 'working-unstaged' | 'working-staged' | 'working-untracked' | 'commit' | 'compare';
    commitHash?: string;
    compareFromHash?: string;
    compareToHash?: string;
  }
): Promise<FileDiffData> {
  let rawDiff = '';
  let oldContent = '';
  let newContent = '';

  if (options.mode === 'working-staged') {
    const [diffRes, oldRes, newRes] = await Promise.all([
      execGit(repoPath, ['diff', '--cached', '--unified=3', '--', filePath]),
      execGit(repoPath, ['show', `HEAD:${filePath}`]),
      execGit(repoPath, ['show', `:${filePath}`]),
    ]);
    rawDiff = diffRes.stdout;
    oldContent = oldRes.exitCode === 0 ? oldRes.stdout : '';
    newContent = newRes.exitCode === 0 ? newRes.stdout : '';
  } else if (options.mode === 'working-unstaged') {
    const [diffRes, oldRes, newContentStr] = await Promise.all([
      execGit(repoPath, ['diff', '--unified=3', '--', filePath]),
      execGit(repoPath, ['show', `:${filePath}`]),
      readConflictFileContent(repoPath, filePath).catch(() => ''),
    ]);
    rawDiff = diffRes.stdout;
    oldContent = oldRes.exitCode === 0 ? oldRes.stdout : '';
    newContent = newContentStr;
  } else if (options.mode === 'working-untracked') {
    newContent = await readConflictFileContent(repoPath, filePath).catch(() => '');
    oldContent = '';
  } else if (options.mode === 'commit' && options.commitHash) {
    const hash = options.commitHash;
    const [diffRes, oldRes, newRes] = await Promise.all([
      execGit(repoPath, ['show', '--unified=3', '--format=', hash, '--', filePath]),
      execGit(repoPath, ['show', `${hash}^:${filePath}`]),
      execGit(repoPath, ['show', `${hash}:${filePath}`]),
    ]);
    rawDiff = diffRes.stdout;
    oldContent = oldRes.exitCode === 0 ? oldRes.stdout : '';
    newContent = newRes.exitCode === 0 ? newRes.stdout : '';
  } else if (
    options.mode === 'compare' &&
    options.compareFromHash &&
    options.compareToHash
  ) {
    const [diffRes, oldRes, newRes] = await Promise.all([
      execGit(repoPath, [
        'diff',
        '--unified=3',
        options.compareFromHash,
        options.compareToHash,
        '--',
        filePath,
      ]),
      execGit(repoPath, ['show', `${options.compareFromHash}:${filePath}`]),
      execGit(repoPath, ['show', `${options.compareToHash}:${filePath}`]),
    ]);
    rawDiff = diffRes.stdout;
    oldContent = oldRes.exitCode === 0 ? oldRes.stdout : '';
    newContent = newRes.exitCode === 0 ? newRes.stdout : '';
  }

  const hunks = parseUnifiedDiffHunks(rawDiff, filePath);

  return {
    filePath,
    oldContent,
    newContent,
    rawDiff,
    hunks,
    language: detectLanguageFromPath(filePath),
  };
}

export function parseUnifiedDiffHunks(rawDiff: string, filePath: string): DiffHunk[] {
  const lines = rawDiff.split('\n');
  const hunks: DiffHunk[] = [];
  let fileHeaderLines: string[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ')
    ) {
      if (!currentHunk) {
        fileHeaderLines.push(line);
      }
      continue;
    }

    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      oldLine = parseInt(hunkMatch[1], 10);
      const oldLines = parseInt(hunkMatch[2] ?? '1', 10);
      newLine = parseInt(hunkMatch[3], 10);
      const newLines = parseInt(hunkMatch[4] ?? '1', 10);

      currentHunk = {
        id: `hunk-${hunks.length + 1}-${oldLine}-${newLine}`,
        header: line,
        oldStart: oldLine,
        oldLines,
        newStart: newLine,
        newLines,
        lines: [],
        rawPatch: [...fileHeaderLines, line].join('\n') + '\n',
      };
      continue;
    }

    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLine++,
        });
        currentHunk.rawPatch += line + '\n';
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'del',
          content: line.slice(1),
          oldLineNumber: oldLine++,
        });
        currentHunk.rawPatch += line + '\n';
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
        currentHunk.rawPatch += line + '\n';
      } else if (line.startsWith('\\ No newline')) {
        currentHunk.rawPatch += line + '\n';
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  if (fileHeaderLines.length === 0 && hunks.length > 0) {
    const defaultHeader = `--- a/${filePath}\n+++ b/${filePath}\n`;
    hunks.forEach((h) => {
      h.rawPatch = defaultHeader + h.rawPatch;
    });
  }

  return hunks;
}

/**
 * Stages, unstages, or discards a specific hunk using `git apply`
 */
export async function applyHunkAction(
  repoPath: string,
  hunk: DiffHunk,
  action: 'stage' | 'unstage' | 'discard'
): Promise<GitCommandResponse> {
  if (action === 'stage') {
    return await execGit(
      repoPath,
      ['apply', '--cached', '--unidiff-zero', '-'],
      hunk.rawPatch
    );
  } else if (action === 'unstage') {
    return await execGit(
      repoPath,
      ['apply', '--cached', '-R', '--unidiff-zero', '-'],
      hunk.rawPatch
    );
  } else {
    return await execGit(
      repoPath,
      ['apply', '-R', '--unidiff-zero', '-'],
      hunk.rawPatch
    );
  }
}

/**
 * Resolves conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in a file
 */
export function resolveConflictBlocks(
  rawContent: string,
  strategy: 'ours' | 'theirs' | 'both'
): string {
  const conflictRegex =
    /<<<<<<<[^\n]*\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>>[^\n]*(?:\r?\n|$)/g;
  return rawContent.replace(conflictRegex, (_match, ours, theirs) => {
    if (strategy === 'ours') return ours;
    if (strategy === 'theirs') return theirs;
    return `${ours}${theirs}`;
  });
}

/**
 * Fetches Pull Requests & Issues directly from GitHub or GitLab REST API
 */
export async function fetchRemotePullRequestsAndIssues(
  remoteInfo: RemoteHostInfo,
  token?: string
): Promise<{ pullRequests: RemotePullRequest[]; issues: RemoteIssue[] }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  if (remoteInfo.provider === 'github') {
    const base = `https://api.github.com/repos/${remoteInfo.owner}/${remoteInfo.repo}`;
    const [prRes, issueRes] = await Promise.all([
      fetch(`${base}/pulls?state=all&per_page=20`, { headers }),
      fetch(`${base}/issues?state=open&per_page=20`, { headers }),
    ]);

    const prData = prRes.ok ? await prRes.json() : [];
    const issueData = issueRes.ok ? await issueRes.json() : [];

    const pullRequests: RemotePullRequest[] = Array.isArray(prData)
      ? prData.map((pr: any) => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.merged_at ? 'merged' : pr.state,
          author: pr.user?.login || 'user',
          authorAvatar: pr.user?.avatar_url,
          sourceBranch: pr.head?.ref || '',
          targetBranch: pr.base?.ref || '',
          updatedAt: new Date(pr.updated_at).toLocaleDateString(),
          url: pr.html_url,
          body: pr.body || '',
          commentsCount: pr.comments || 0,
        }))
      : [];

    const issues: RemoteIssue[] = Array.isArray(issueData)
      ? issueData
          .filter((item: any) => !item.pull_request)
          .map((iss: any) => ({
            id: iss.id,
            number: iss.number,
            title: iss.title,
            state: iss.state,
            author: iss.user?.login || 'user',
            labels: (iss.labels || []).map((l: any) => l.name),
            updatedAt: new Date(iss.updated_at).toLocaleDateString(),
            url: iss.html_url,
            body: iss.body || '',
          }))
      : [];

    return { pullRequests, issues };
  }

  if (remoteInfo.provider === 'gitlab') {
    const projectPath = encodeURIComponent(`${remoteInfo.owner}/${remoteInfo.repo}`);
    const base = `https://gitlab.com/api/v4/projects/${projectPath}`;
    const [mrRes, issueRes] = await Promise.all([
      fetch(`${base}/merge_requests?per_page=20`, { headers }),
      fetch(`${base}/issues?state=opened&per_page=20`, { headers }),
    ]);

    const mrData = mrRes.ok ? await mrRes.json() : [];
    const issueData = issueRes.ok ? await issueRes.json() : [];

    const pullRequests: RemotePullRequest[] = Array.isArray(mrData)
      ? mrData.map((mr: any) => ({
          id: mr.id,
          number: mr.iid,
          title: mr.title,
          state: mr.state === 'merged' ? 'merged' : mr.state === 'opened' ? 'open' : 'closed',
          author: mr.author?.username || 'user',
          authorAvatar: mr.author?.avatar_url,
          sourceBranch: mr.source_branch || '',
          targetBranch: mr.target_branch || '',
          updatedAt: new Date(mr.updated_at).toLocaleDateString(),
          url: mr.web_url,
          body: mr.description || '',
          commentsCount: mr.user_notes_count || 0,
        }))
      : [];

    const issues: RemoteIssue[] = Array.isArray(issueData)
      ? issueData.map((iss: any) => ({
          id: iss.id,
          number: iss.iid,
          title: iss.title,
          state: iss.state === 'opened' ? 'open' : 'closed',
          author: iss.author?.username || 'user',
          labels: iss.labels || [],
          updatedAt: new Date(iss.updated_at).toLocaleDateString(),
          url: iss.web_url,
          body: iss.description || '',
        }))
      : [];

    return { pullRequests, issues };
  }

  return { pullRequests: [], issues: [] };
}

/**
 * Creates a Pull Request (GitHub) or Merge Request (GitLab) directly via REST API
 */
export async function createRemotePullRequest(params: {
  remoteInfo: RemoteHostInfo;
  token: string;
  title: string;
  body?: string;
  headBranch: string;
  baseBranch: string;
  draft?: boolean;
}): Promise<RemotePullRequest> {
  const { remoteInfo, token, title, body, headBranch, baseBranch, draft } = params;
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Authentication token is required to create a Pull Request.');
  }

  if (remoteInfo.provider === 'github') {
    const res = await fetch(
      `https://api.github.com/repos/${remoteInfo.owner}/${remoteInfo.repo}/pulls`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: (body || '').trim(),
          head: headBranch.trim(),
          base: baseBranch.trim(),
          draft: Boolean(draft),
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errDetail =
        Array.isArray(data.errors) && data.errors[0]?.message
          ? ` (${data.errors[0].message})`
          : '';
      throw new Error(
        data.message
          ? `${data.message}${errDetail}`
          : `GitHub API returned HTTP ${res.status}`
      );
    }

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      state: data.merged_at ? 'merged' : data.state || 'open',
      author: data.user?.login || 'user',
      authorAvatar: data.user?.avatar_url,
      sourceBranch: data.head?.ref || headBranch,
      targetBranch: data.base?.ref || baseBranch,
      updatedAt: new Date(data.updated_at || Date.now()).toLocaleDateString(),
      url: data.html_url,
      body: data.body || '',
      commentsCount: data.comments || 0,
    };
  }

  if (remoteInfo.provider === 'gitlab') {
    const projectPath = encodeURIComponent(
      `${remoteInfo.owner}/${remoteInfo.repo}`
    );
    const res = await fetch(
      `https://gitlab.com/api/v4/projects/${projectPath}/merge_requests`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}`,
        },
        body: JSON.stringify({
          source_branch: headBranch.trim(),
          target_branch: baseBranch.trim(),
          title: draft ? `Draft: ${title.trim()}` : title.trim(),
          description: (body || '').trim(),
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data.message || data.error || `GitLab API returned HTTP ${res.status}`
      );
    }

    return {
      id: data.id,
      number: data.iid,
      title: data.title,
      state:
        data.state === 'merged'
          ? 'merged'
          : data.state === 'opened'
          ? 'open'
          : 'closed',
      author: data.author?.username || 'user',
      authorAvatar: data.author?.avatar_url,
      sourceBranch: data.source_branch || headBranch,
      targetBranch: data.target_branch || baseBranch,
      updatedAt: new Date(data.updated_at || Date.now()).toLocaleDateString(),
      url: data.web_url,
      body: data.description || '',
      commentsCount: data.user_notes_count || 0,
    };
  }

  throw new Error(
    'In-app PR creation is supported for GitHub and GitLab repositories.'
  );
}

/**
 * Reads both Global and Local (per-repo) Git user.name & user.email
 */
export async function getGitConfigIdentity(
  repoPath?: string
): Promise<GitConfigIdentity> {
  const cwd = repoPath?.trim() || '';
  const [gNameRes, gEmailRes, lNameRes, lEmailRes] = await Promise.all([
    execGit(cwd, ['config', '--global', '--get', 'user.name']),
    execGit(cwd, ['config', '--global', '--get', 'user.email']),
    cwd
      ? execGit(cwd, ['config', '--local', '--get', 'user.name'])
      : Promise.resolve({ stdout: '', stderr: '', exitCode: 1, durationMs: 0, command: '' }),
    cwd
      ? execGit(cwd, ['config', '--local', '--get', 'user.email'])
      : Promise.resolve({ stdout: '', stderr: '', exitCode: 1, durationMs: 0, command: '' }),
  ]);

  const globalName = gNameRes.exitCode === 0 ? gNameRes.stdout.trim() : '';
  const globalEmail = gEmailRes.exitCode === 0 ? gEmailRes.stdout.trim() : '';
  const localName = lNameRes.exitCode === 0 ? lNameRes.stdout.trim() : '';
  const localEmail = lEmailRes.exitCode === 0 ? lEmailRes.stdout.trim() : '';

  return {
    globalName,
    globalEmail,
    localName,
    localEmail,
    effectiveName: localName || globalName,
    effectiveEmail: localEmail || globalEmail,
  };
}

/**
 * Sets Git user.name & user.email at either --global or --local scope
 */
export async function setGitConfigIdentity(
  scope: 'global' | 'local',
  name: string,
  email: string,
  repoPath?: string
): Promise<boolean> {
  const flag = scope === 'global' ? '--global' : '--local';
  const cwd = repoPath?.trim() || '';
  if (scope === 'local' && !cwd) return false;

  const [r1, r2] = await Promise.all([
    execGit(cwd, ['config', flag, 'user.name', name.trim()]),
    execGit(cwd, ['config', flag, 'user.email', email.trim()]),
  ]);

  return r1.exitCode === 0 && r2.exitCode === 0;
}

/**
 * Clears --local user.name & user.email on a repository so it inherits --global
 */
export async function clearLocalGitConfigIdentity(
  repoPath: string
): Promise<void> {
  if (!repoPath.trim()) return;
  await Promise.all([
    execGit(repoPath, ['config', '--local', '--unset', 'user.name']),
    execGit(repoPath, ['config', '--local', '--unset', 'user.email']),
  ]);
}

/**
 * Verifies a Personal Access Token (PAT) with GitHub, GitLab, or Bitbucket API
 * and returns the authenticated user profile.
 */
export async function verifyProviderToken(
  provider: GitAccountProvider,
  token: string,
  hostUrl?: string
): Promise<{
  username: string;
  name: string;
  email: string;
  avatarUrl?: string;
}> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Personal Access Token is required');
  }

  if (provider === 'github') {
    const apiBase =
      hostUrl &&
      !hostUrl.includes('github.com') &&
      hostUrl.startsWith('http')
        ? `${hostUrl.replace(/\/+$/, '')}/api/v3`
        : 'https://api.github.com';

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cleanToken}`,
    };

    const res = await fetch(`${apiBase}/user`, { headers });
    if (!res.ok) {
      throw new Error(`GitHub authentication failed (${res.status} ${res.statusText})`);
    }
    const profile = await res.json();
    let email: string = profile.email || '';

    if (!email) {
      try {
        const emailRes = await fetch(`${apiBase}/user/emails`, { headers });
        if (emailRes.ok) {
          const emails = await emailRes.json();
          if (Array.isArray(emails)) {
            const primary =
              emails.find((e: any) => e.primary && e.verified) ||
              emails.find((e: any) => e.primary) ||
              emails[0];
            if (primary?.email) email = primary.email;
          }
        }
      } catch {
        // Fallback to noreply github email
      }
    }

    if (!email && profile.login) {
      email = `${profile.id ? `${profile.id}+` : ''}${profile.login}@users.noreply.github.com`;
    }

    return {
      username: profile.login || '',
      name: profile.name || profile.login || '',
      email,
      avatarUrl: profile.avatar_url || undefined,
    };
  }

  if (provider === 'gitlab') {
    const baseHost = (hostUrl?.trim() || 'https://gitlab.com').replace(/\/+$/, '');
    const res = await fetch(`${baseHost}/api/v4/user`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${cleanToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`GitLab authentication failed (${res.status} ${res.statusText})`);
    }
    const profile = await res.json();
    return {
      username: profile.username || '',
      name: profile.name || profile.username || '',
      email: profile.email || profile.public_email || `${profile.username}@users.noreply.gitlab.com`,
      avatarUrl: profile.avatar_url || undefined,
    };
  }

  if (provider === 'bitbucket') {
    const res = await fetch('https://api.bitbucket.org/2.0/user', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${cleanToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Bitbucket authentication failed (${res.status} ${res.statusText})`);
    }
    const profile = await res.json();
    return {
      username: profile.username || profile.nickname || '',
      name: profile.display_name || profile.username || '',
      email: '',
      avatarUrl: profile.links?.avatar?.href || undefined,
    };
  }

  throw new Error('Automatic token verification is supported for GitHub, GitLab, and Bitbucket.');
}

/**
 * Creates a new remote repository on GitHub or GitLab via REST API
 * and returns its clone/push URL and web URL.
 */
export async function createRemoteRepositoryViaApi(options: {
  provider: GitAccountProvider;
  token: string;
  hostUrl?: string;
  repoName: string;
  description?: string;
  isPrivate: boolean;
  protocol: 'https' | 'ssh';
}): Promise<{ remoteUrl: string; webUrl: string; fullName: string }> {
  const cleanToken = options.token.trim();
  const cleanName = options.repoName.trim();
  if (!cleanToken) {
    throw new Error('A Personal Access Token is required to create a remote repository via API.');
  }
  if (!cleanName) {
    throw new Error('Repository name is required.');
  }

  if (options.provider === 'github') {
    const apiBase =
      options.hostUrl &&
      !options.hostUrl.includes('github.com') &&
      options.hostUrl.startsWith('http')
        ? `${options.hostUrl.replace(/\/+$/, '')}/api/v3`
        : 'https://api.github.com';

    const res = await fetch(`${apiBase}/user/repos`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: cleanName,
        description: options.description?.trim() || '',
        private: options.isPrivate,
        auto_init: false,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        data?.errors?.[0]?.message || data?.message || res.statusText;
      throw new Error(`GitHub repository creation failed: ${detail}`);
    }

    return {
      remoteUrl:
        options.protocol === 'ssh' ? data.ssh_url : data.clone_url,
      webUrl: data.html_url,
      fullName: data.full_name || cleanName,
    };
  }

  if (options.provider === 'gitlab') {
    const baseHost = (options.hostUrl?.trim() || 'https://gitlab.com').replace(
      /\/+$/,
      ''
    );
    const res = await fetch(`${baseHost}/api/v4/projects`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: cleanName,
        path: cleanName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'),
        description: options.description?.trim() || '',
        visibility: options.isPrivate ? 'private' : 'public',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        typeof data?.message === 'string'
          ? data.message
          : JSON.stringify(data?.message || res.statusText);
      throw new Error(`GitLab project creation failed: ${detail}`);
    }

    return {
      remoteUrl:
        options.protocol === 'ssh'
          ? data.ssh_url_to_repo
          : data.http_url_to_repo,
      webUrl: data.web_url,
      fullName: data.path_with_namespace || cleanName,
    };
  }

  throw new Error(
    'Automatic remote repository creation is supported for GitHub and GitLab accounts. Use "Publish to Custom Remote URL" for other providers.'
  );
}
