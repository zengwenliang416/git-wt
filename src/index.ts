#!/usr/bin/env node
import { Command } from 'commander';
import { simpleGit } from 'simple-git';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import ora from 'ora';
import boxen from 'boxen';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { createRequire } from 'node:module';

type CliOptions = {
  dir: string;
};

type Spinner = ReturnType<typeof ora>;

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };
const MISSING_BRANCH_PATTERNS = ['invalid reference', 'not a valid object name'];

const program = new Command();

const printBanner = () => {
  const title = figlet.textSync('Git Easy WT', { font: 'Standard' });
  console.log(gradient.pastel.multiline(title));
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const resolveRepoName = (url: string): string => {
  const repoNameMatch = url.match(/\/([^\/]+?)(\.git)?$/);
  const repoName = repoNameMatch?.[1];

  if (!repoName) {
    throw new Error('Invalid Git URL. Could not extract repository name.');
  }

  return repoName;
};

const resolveInputs = (
  urlArg: string | undefined,
  branchArg: string | undefined,
  dirArg: string,
): { url: string; branch: string; dir: string } => {
  const url = urlArg?.trim();
  const branch = branchArg?.trim();
  const dir = dirArg.trim() || process.cwd();

  if (!url || !branch) {
    throw new Error('Usage: git-wt <repo-url> <branch-name> [options]');
  }

  return { url, branch, dir };
};

const ensureBareRepository = async (
  url: string,
  bareRepoPath: string,
  spinner: Spinner,
): Promise<void> => {
  const git = simpleGit();

  if (fs.existsSync(bareRepoPath)) {
    spinner.start(`Checking bare repository at ${chalk.dim(bareRepoPath)}`);
    spinner.succeed('Bare repository found');

    spinner.start('Fetching latest updates from remote...');
    await simpleGit(bareRepoPath)
      .outputHandler((_command, _stdout, stderr) => {
        stderr.on('data', (data) => {
          const line = data.toString().trim();
          if (line) {
            spinner.text = `Fetching: ${line}`;
          }
        });
      })
      .fetch('origin');
    spinner.succeed('Repository updated');
    return;
  }

  spinner.start(`Cloning bare repository to ${chalk.dim(bareRepoPath)}...`);
  await git
    .outputHandler((_command, _stdout, stderr) => {
      stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          spinner.text = `Cloning: ${line}`;
        }
      });
    })
    .clone(url, bareRepoPath, ['--bare', '--progress']);
  spinner.succeed('Repository cloned successfully');
};

const isMissingBranchError = (error: unknown): boolean => {
  const message = toErrorMessage(error).toLowerCase();
  return MISSING_BRANCH_PATTERNS.some((pattern) => message.includes(pattern));
};

const createWorktree = async (
  bareRepoPath: string,
  worktreePath: string,
  branch: string,
  spinner: Spinner,
): Promise<void> => {
  if (fs.existsSync(worktreePath)) {
    throw new Error(`Worktree path ${worktreePath} already exists.`);
  }

  spinner.start(`Creating worktree for branch ${chalk.green(branch)}...`);
  const bareGit = simpleGit(bareRepoPath);

  try {
    await bareGit.raw(['worktree', 'add', worktreePath, branch]);
    spinner.succeed('Worktree created successfully!');
  } catch (error: unknown) {
    if (!isMissingBranchError(error)) {
      throw error;
    }

    spinner.text = `Branch ${branch} not found. Creating new branch...`;
    await bareGit.raw(['worktree', 'add', '-b', branch, worktreePath]);
    spinner.succeed('New branch worktree created!');
  }
};

const run = async () => {
  printBanner();

  program
    .name('git-wt')
    .description('A CLI tool to create git worktrees from a repository URL and branch name')
    .version(version)
    .argument('<url>', 'Git repository URL')
    .argument('<branch>', 'Branch name to checkout')
    .option('-d, --dir <directory>', 'Base directory for worktrees', process.cwd())
    .action(async (urlArg: string, branchArg: string, options: CliOptions) => {
      const spinner = ora();
      try {
        const { url, branch, dir } = resolveInputs(urlArg, branchArg, options.dir);
        const repoName = resolveRepoName(url);
        const baseDir = path.resolve(dir);

        const repoDir = path.join(baseDir, repoName);
        const bareRepoPath = path.join(repoDir, '.bare');
        const worktreePath = path.join(repoDir, branch);

        await fs.ensureDir(repoDir);
        await ensureBareRepository(url, bareRepoPath, spinner);
        await createWorktree(bareRepoPath, worktreePath, branch, spinner);

        const relativeWorktreePath = path.relative(process.cwd(), worktreePath) || '.';
        console.log(
          '\n' +
            boxen(
              chalk.green('🎉 All done! \n\n') +
                `📂 Worktree: ${chalk.cyan(worktreePath)}\n` +
                `🌿 Branch:   ${chalk.cyan(branch)}\n\n` +
                chalk.dim(`cd ${relativeWorktreePath}`),
              { padding: 1, borderStyle: 'round', borderColor: 'green' },
            ),
        );
      } catch (error: unknown) {
        spinner.fail(chalk.red(toErrorMessage(error)));
        process.exitCode = 1;
      }
    });

  await program.parseAsync(process.argv);
};

run().catch((error: unknown) => {
  ora().fail(chalk.red(toErrorMessage(error)));
  process.exitCode = 1;
});
