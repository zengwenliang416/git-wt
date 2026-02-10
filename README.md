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
git-wt [repo-url] [branch-name ...] [options]
```

If `repo-url` or branch names are missing, the CLI will prompt you to enter them interactively.

You can provide multiple branch names in either of these formats:

- Space-separated: `git-wt <repo-url> dev test release`
- Comma-separated: `git-wt <repo-url> "dev,test,release"`

### Options

- `-d, --dir <directory>`: Base directory for worktrees (default: current directory)

### Input modes

- Full args: `git-wt <repo-url> <branch...>`
- Partial args: `git-wt <repo-url>` (CLI prompts for branches)
- No args: `git-wt` (CLI prompts for repo URL and branches)

> In non-interactive mode (for example CI), you must pass both repo URL and branch names in arguments.

### Branch parsing rules

- Supports both separators: spaces and commas
- Trims spaces automatically
- De-duplicates repeated branch names
- Keeps the input order for creation

Example:

```bash
git-wt <repo-url> "dev, test dev release"
# => creates: dev, test, release
```

### What the command does

1. Resolves repo directory name from URL
2. Creates/updates a local bare repository at `<base-dir>/<repo>/.bare`
3. Creates one worktree directory per branch at `<base-dir>/<repo>/<branch>`
4. If a branch does not exist in remote, creates a new local branch automatically

### Example

```bash
# Create a worktree for the 'master' branch of Hello-World
git-wt https://github.com/octocat/Hello-World.git master

# Create worktrees for multiple branches
git-wt https://github.com/octocat/Hello-World.git dev test release

# Create worktrees using comma-separated branches
git-wt https://github.com/octocat/Hello-World.git "feature/a,feature/b"

# Provide URL only, then input branches interactively
git-wt https://github.com/octocat/Hello-World.git

# Start interactive input mode
git-wt

# Resulting structure:
# ./Hello-World/
#   .bare/    (Bare repository)
#   master/   (Worktree)
#   dev/      (Worktree, if requested)
```

## Troubleshooting

- `Missing required arguments in non-interactive mode`  
  Pass both URL and branch names directly, for example:  
  `git-wt https://github.com/octocat/Hello-World.git main`

- `Worktree path ... already exists`  
  The target branch folder already exists in base dir. Use a different branch name or remove the existing folder first.

## Development

```bash
npm install
npm run dev -- <url> <branch...>
npm run build
```
