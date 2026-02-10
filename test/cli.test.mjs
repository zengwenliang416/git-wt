import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'dist', 'index.js');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const { version } = packageJson;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const runCli = (args) =>
  spawnSync('node', [cliPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

const git = (args, options = {}) =>
  execFileSync('git', args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });

const createRemoteRepo = (workspaceDir) => {
  const sourcePath = path.join(workspaceDir, 'source');
  const remotePath = path.join(workspaceDir, 'remote.git');

  git(['init', sourcePath]);
  git(['-C', sourcePath, 'config', 'user.email', 'test@example.com']);
  git(['-C', sourcePath, 'config', 'user.name', 'Test User']);

  writeFileSync(path.join(sourcePath, 'README.md'), 'hello\n');
  git(['-C', sourcePath, 'add', 'README.md']);
  git(['-C', sourcePath, 'commit', '-m', 'init']);

  const defaultBranch = git(['-C', sourcePath, 'branch', '--show-current']).trim();
  git(['clone', '--bare', sourcePath, remotePath]);

  return {
    remotePath,
    defaultBranch,
  };
};

test('uses package.json version in --version output', () => {
  const result = runCli(['--version']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`\\b${escapeRegExp(version)}\\b`));
});

test('shows CLI error when required arguments are missing', () => {
  const result = runCli([]);
  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /Missing required arguments in non-interactive mode/i,
  );
});

test('creates worktree for an existing branch', () => {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'git-wt-test-'));

  try {
    const { remotePath, defaultBranch } = createRemoteRepo(workspaceDir);
    const baseDir = path.join(workspaceDir, 'worktrees');
    const repoName = 'remote';

    const result = runCli([remotePath, defaultBranch, '--dir', baseDir]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(path.join(baseDir, repoName, '.bare')), true);
    assert.equal(existsSync(path.join(baseDir, repoName, defaultBranch)), true);
  } finally {
    rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test('returns non-zero when worktree path already exists', () => {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'git-wt-test-'));

  try {
    const { remotePath, defaultBranch } = createRemoteRepo(workspaceDir);
    const baseDir = path.join(workspaceDir, 'worktrees');
    const firstRun = runCli([remotePath, defaultBranch, '--dir', baseDir]);
    assert.equal(firstRun.status, 0, firstRun.stderr || firstRun.stdout);

    const secondRun = runCli([remotePath, defaultBranch, '--dir', baseDir]);
    assert.notEqual(secondRun.status, 0, secondRun.stderr || secondRun.stdout);
    assert.match(`${secondRun.stdout}\n${secondRun.stderr}`, /already exists/i);
  } finally {
    rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test('creates new branch when requested branch does not exist in remote', () => {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'git-wt-test-'));

  try {
    const { remotePath } = createRemoteRepo(workspaceDir);
    const baseDir = path.join(workspaceDir, 'worktrees');
    const repoName = 'remote';
    const newBranch = 'feature-new-branch';

    const result = runCli([remotePath, newBranch, '--dir', baseDir]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(path.join(baseDir, repoName, newBranch)), true);
  } finally {
    rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test('creates worktrees for multiple branches passed as separate arguments', () => {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'git-wt-test-'));

  try {
    const { remotePath } = createRemoteRepo(workspaceDir);
    const baseDir = path.join(workspaceDir, 'worktrees');
    const repoName = 'remote';
    const branches = ['feature-a', 'feature-b'];

    const result = runCli([remotePath, ...branches, '--dir', baseDir]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    for (const branch of branches) {
      assert.equal(existsSync(path.join(baseDir, repoName, branch)), true);
    }
  } finally {
    rmSync(workspaceDir, { recursive: true, force: true });
  }
});

test('creates worktrees for comma-separated branch input', () => {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'git-wt-test-'));

  try {
    const { remotePath } = createRemoteRepo(workspaceDir);
    const baseDir = path.join(workspaceDir, 'worktrees');
    const repoName = 'remote';

    const result = runCli([remotePath, 'feature-c,feature-d', '--dir', baseDir]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(path.join(baseDir, repoName, 'feature-c')), true);
    assert.equal(existsSync(path.join(baseDir, repoName, 'feature-d')), true);
  } finally {
    rmSync(workspaceDir, { recursive: true, force: true });
  }
});
