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

> In an interactive terminal, `git-wt` always launches the full-screen TUI.
> Optional `repo-url` and `branch-name` are used as prefilled values.

### Options

- `-d, --dir <directory>`: Base directory for worktrees (default: current directory)

### Example

```bash
# Launch TUI with empty fields
git-wt

# Launch TUI with prefilled repository and branch
git-wt https://github.com/octocat/Hello-World.git master
```

## Development

```bash
npm install
npm run dev -- <url> <branch>
npm run build
```
