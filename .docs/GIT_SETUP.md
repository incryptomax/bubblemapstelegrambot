# Git Repository Setup and Configuration

## Repository Information
- Repository Name: bubblemapstelegrambot
- Repository URL (HTTPS): https://github.com/incryptomax/bubblemapstelegrambot.git
- Repository URL (SSH): git@github.com:incryptomax/bubblemapstelegrambot.git
- Owner: incryptomax

## Git Configuration

### Author Information
```bash
# Set your Git username
git config user.name "incryptomax"

# Set your Git email
git config user.email "your.email@example.com"
```

### Repository Setup
```bash
# Clone the repository (HTTPS)
git clone https://github.com/incryptomax/bubblemapstelegrambot.git

# OR Clone with SSH
git clone git@github.com:incryptomax/bubblemapstelegrambot.git
```

### Switching Between HTTPS and SSH

#### To use HTTPS:
```bash
git remote set-url origin https://github.com/incryptomax/bubblemapstelegrambot.git
```

#### To use SSH:
```bash
git remote set-url origin git@github.com:incryptomax/bubblemapstelegrambot.git
```

## Common Git Commands

### Basic Commands
```bash
# Check repository status
git status

# Add files to staging
git add .

# Commit changes
git commit -m "Your commit message"

# Push changes
git push origin main

# Pull latest changes
git pull origin main
```

### Updating Author Information
If you need to update the author information for the last commit:
```bash
git commit --amend --reset-author --no-edit
```

## .gitignore Configuration
The repository includes a `.gitignore` file that excludes:
- Dependencies (node_modules/, etc.)
- Environment files (.env, .env.local, etc.)
- IDE files (.idea/, .vscode/, etc.)
- Logs and temporary files
- Build output
- OS-specific files

## Branch Management
```bash
# Create a new branch
git checkout -b feature/your-feature-name

# Switch branches
git checkout main

# Merge branches
git merge feature/your-feature-name
```

## Best Practices
1. Always pull before starting new work
2. Create feature branches for new development
3. Write clear commit messages
4. Keep commits focused and atomic
5. Don't commit sensitive information
6. Regularly push your changes

## Troubleshooting

### Authentication Issues
If you encounter authentication issues:
1. For HTTPS: Use your GitHub username and personal access token
2. For SSH: Ensure your SSH key is added to GitHub

### Reset Last Commit
If you need to undo the last commit but keep the changes:
```bash
git reset --soft HEAD~1
```

### Discard Changes
To discard all local changes:
```bash
git reset --hard HEAD
``` 