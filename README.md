# Git Easy Worktree

A Node.js CLI tool to easily create git worktrees from a repository URL.

## Installation

```bash
# Install globally from npm
npm install -g git-easy-worktree

# Or install from source
git clone https://github.com/your-username/git-easy-worktree.git
cd git-easy-worktree
npm install
npm link
```

## Usage

```bash
git-wt [repo-url] [branch-name] [options]
```

If `repo-url` or `branch-name` is missing, the CLI will prompt you to enter it interactively.

### Options

- `-d, --dir <directory>`: Base directory for worktrees (default: current directory)

### Example

```bash
# Create a worktree for the 'master' branch of Hello-World
git-wt https://github.com/octocat/Hello-World.git master

# Start interactive input mode
git-wt

# Resulting structure:
# ./Hello-World/
#   .bare/    (Bare repository)
#   master/   (Worktree)
```

## Development

```bash
npm install
npm run dev -- <url> <branch>
npm run build
```
