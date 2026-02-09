#!/usr/bin/env node
import { Command } from 'commander';
import { simpleGit } from 'simple-git';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import figlet from 'figlet';
import gradient from 'gradient-string';

const program = new Command();

const printBanner = () => {
  const title = figlet.textSync('Git Easy WT', { font: 'Standard' });
  console.log(gradient.pastel.multiline(title));
};

const run = async () => {
  printBanner();

  program
    .name('git-wt')
    .description('A CLI tool to create git worktrees from a repository URL and branch name')
    .version('1.0.0')
    .argument('[url]', 'Git repository URL')
    .argument('[branch]', 'Branch name to checkout')
    .option('-d, --dir <directory>', 'Base directory for worktrees', process.cwd())
    .action(async (urlArg, branchArg, options) => {
      let url = urlArg;
      let branch = branchArg;

      // Interactive Mode if args missing
      if (!url || !branch) {
        console.log(boxen(chalk.cyan('Welcome to Git Easy Worktree! 🚀\nLet\'s set up your workspace.'), { padding: 1, borderStyle: 'round', borderColor: 'cyan' }));
        
        const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Enter Git Repository URL:',
          when: !url,
          validate: (input: string) => input ? true : 'URL is required'
        },
        {
          type: 'input',
          name: 'branch',
          message: 'Enter Branch Name:',
          when: !branch,
          validate: (input: string) => input ? true : 'Branch name is required'
        }
      ]);

        if (!url) url = answers.url;
        if (!branch) branch = answers.branch;
      }

      try {
        // 1. Extract repo name
        const repoNameMatch = url.match(/\/([^\/]+?)(\.git)?$/);
        if (!repoNameMatch) {
          throw new Error('Invalid Git URL. Could not extract repository name.');
        }
        const repoName = repoNameMatch[1];
        const baseDir = path.resolve(options.dir);
        
        const repoDir = path.join(baseDir, repoName);
        const bareRepoPath = path.join(repoDir, '.bare');
        const worktreePath = path.join(repoDir, branch);

        await fs.ensureDir(repoDir);

        const git = simpleGit();
        const spinner = ora();

        // 2. Check/Clone Bare Repo
        if (fs.existsSync(bareRepoPath)) {
          spinner.start(`Checking bare repository at ${chalk.dim(bareRepoPath)}`);
          spinner.succeed('Bare repository found');
          
          spinner.start('Fetching latest updates from remote...');
          await simpleGit(bareRepoPath).fetch('origin');
          spinner.succeed('Repository updated');
        } else {
          spinner.start(`Cloning bare repository to ${chalk.dim(bareRepoPath)}...`);
          await git.clone(url, bareRepoPath, ['--bare']);
          spinner.succeed('Repository cloned successfully');
        }

        // 3. Create Worktree
        if (fs.existsSync(worktreePath)) {
          spinner.fail(`Worktree path ${worktreePath} already exists.`);
          return;
        }

        spinner.start(`Creating worktree for branch ${chalk.green(branch)}...`);
        
        const bareGit = simpleGit(bareRepoPath);
        
        try {
          await bareGit.raw(['worktree', 'add', worktreePath, branch]);
          spinner.succeed('Worktree created successfully!');
        } catch (err: any) {
          if (err.message.includes('invalid reference') || err.message.includes('not a valid object name')) {
               spinner.text = `Branch ${branch} not found. Creating new branch...`;
               await bareGit.raw(['worktree', 'add', '-b', branch, worktreePath]);
               spinner.succeed('New branch worktree created!');
          } else {
              throw err;
          }
        }

        console.log('\n' + boxen(
          chalk.green(`🎉 All done! \n\n`) + 
          `📂 Worktree: ${chalk.cyan(worktreePath)}\n` +
          `🌿 Branch:   ${chalk.cyan(branch)}\n\n` +
          chalk.dim(`cd ${path.relative(process.cwd(), worktreePath)}`),
          { padding: 1, borderStyle: 'round', borderColor: 'green' }
        ));

      } catch (error: any) {
        ora().fail(chalk.red(error.message));
        process.exit(1);
      }
    });

  program.parse(process.argv);
};

run();
