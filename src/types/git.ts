export type GraphStyle = 'curved' | 'angular';

export interface GitRef {
  name: string;
  fullName: string;
  type: 'head' | 'local-branch' | 'remote-branch' | 'tag' | 'stash';
  remote?: string;
  commitHash: string;
  isCurrentHead?: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
  stashSelector?: string; // e.g., stash@{0}
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  authorDate: number; // unix seconds
  commitDate: number; // unix seconds
  subject: string;
  body?: string;
  refs: GitRef[];
  isUncommitted?: boolean;
  isStash?: boolean;
  stashSelector?: string;
}

export interface GraphLink {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  colorIndex: number;
  isMerge?: boolean;
  isUncommitted?: boolean;
}

export interface GraphNodeLayout {
  commit: GitCommit;
  row: number;
  col: number;
  colorIndex: number;
  maxColumnsInRow: number;
}

export interface WorkingFileChange {
  path: string;
  oldPath?: string;
  indexStatus: string; // 'M', 'A', 'D', 'R', 'U', '?'
  worktreeStatus: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
  conflicted: boolean;
}

export interface CommitFileChange {
  path: string;
  oldPath?: string;
  status: 'M' | 'A' | 'D' | 'R' | 'C' | 'U';
  additions: number;
  deletions: number;
}

export interface DiffLine {
  type: 'context' | 'add' | 'del';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  id: string;
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
  rawPatch: string;
}

export interface FileDiffData {
  filePath: string;
  oldContent: string;
  newContent: string;
  rawDiff: string;
  hunks: DiffHunk[];
  language: string;
}

export interface GitWorktree {
  path: string;
  head: string;
  branch: string;
  isMain: boolean;
}

export interface GitSubmodule {
  name: string;
  path: string;
  commit: string;
  status: 'clean' | 'modified' | 'uninitialized';
}

export interface RemoteHostInfo {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'unknown';
  owner: string;
  repo: string;
  webUrl: string;
  remoteName: string;
}

export interface RemotePullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  authorAvatar?: string;
  sourceBranch: string;
  targetBranch: string;
  updatedAt: string;
  url: string;
  body?: string;
  commentsCount?: number;
}

export interface RemoteIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  labels: string[];
  updatedAt: string;
  url: string;
  body?: string;
}

export interface CommandLogEntry {
  id: string;
  timestamp: string;
  repoPath: string;
  command: string;
  durationMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface RepoTab {
  id: string;
  name: string;
  path: string;
  currentBranch: string;
  uncommittedCount: number;
  conflictCount: number;
  selectedBranches?: string[];
  searchQuery?: string;
  preferredIdeId?: string;
  preferredAiHarnessId?: string;
}

export interface IdeConfig {
  id: string;
  name: string;
  category: 'ide' | 'ai-harness';
  launchMode: 'gui' | 'terminal-cli';
  command: string;
  executablePath: string;
  installed: boolean;
  isCustom?: boolean;
}

export type GitAccountProvider = 'github' | 'gitlab' | 'bitbucket' | 'custom';

export interface GitAccount {
  id: string;
  provider: GitAccountProvider;
  name: string; // git config user.name
  email: string; // git config user.email
  username: string;
  hostUrl?: string;
  avatarUrl?: string;
  token?: string;
  lastUsedAt: number;
}

export interface GitConfigIdentity {
  globalName: string;
  globalEmail: string;
  localName: string;
  localEmail: string;
  effectiveName: string;
  effectiveEmail: string;
}
