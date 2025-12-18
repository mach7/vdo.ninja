# VDO.Ninja Deployment Webhook - Phase Report

## Overview

This phase implements a production-ready GitHub webhook deployment system for the VDO.Ninja repository. The system provides atomic deployments, branch allowlisting, Discord notifications, and comprehensive logging.

## Files Created

### 1. `deploy/deploy-vdo.php`
**Location:** `/var/www/wp.tysonbrooks.net/vdo/deploy/deploy-vdo.php`

**Purpose:** Main deployment webhook handler

**Features:**
- GitHub webhook signature validation (X-Hub-Signature-256)
- Branch allowlist enforcement
- Atomic deployment with symlink swap
- Release history management (keeps last 5 releases)
- Deployment lock file to prevent concurrent deployments
- Discord notifications on success/failure
- Comprehensive logging (no secrets logged)
- .env file parsing without external dependencies
- Git authentication support for private repos

### 2. `deploy/README.md`
**Location:** `/var/www/wp.tysonbrooks.net/vdo/deploy/README.md`

**Purpose:** Complete documentation for setup and usage

**Contents:**
- File placement instructions
- Environment variable configuration
- GitHub webhook setup steps
- Server requirements and permissions
- Testing procedures
- Troubleshooting guide
- Security considerations

### 3. `deploy/PHASE_REPORT.md`
**Location:** `/var/www/wp.tysonbrooks.net/vdo/deploy/PHASE_REPORT.md`

**Purpose:** This document - implementation summary and configuration guide

## File Locations

```
/var/www/wp.tysonbrooks.net/
├── .env                                    # Environment configuration
├── vdo/                                    # Current deployment (symlink)
│   └── deploy/
│       ├── deploy-vdo.php                  # Webhook handler
│       ├── deploy.log                      # Deployment logs (auto-created)
│       ├── deploy.lock                     # Lock file (auto-created)
│       ├── README.md                       # Documentation
│       └── PHASE_REPORT.md                 # This file
└── vdo_releases/                           # Release history
    ├── 20240101120000/                     # Timestamped releases
    └── ...
```

## GitHub Webhook Configuration

### Step 1: Create Webhook in GitHub

1. Navigate to repository: `https://github.com/[username]/[repo]/settings/hooks`
2. Click **"Add webhook"**
3. Configure:
   - **Payload URL:** `https://wp.tysonbrooks.net/vdo/deploy/deploy-vdo.php`
   - **Content type:** `application/json`
   - **Secret:** (Generate a strong random secret, save to `.env` as `FLW_DEPLOY_WEBHOOK_SECRET`)
   - **Events:** Select **"Just the push event"**

### Step 2: Environment Configuration

Edit `/var/www/wp.tysonbrooks.net/.env`:

```bash
# Required
FLW_DEPLOY_WEBHOOK_SECRET=your_strong_random_secret_here
FLW_DEPLOY_GH_TOKEN=ghp_your_github_token_here
FLW_DEPLOY_BRANCHES=main,master,production

# Optional
FLW_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_AVATAR_URL=https://example.com/avatar.png
```

### Step 3: Generate Webhook Secret

```bash
# Generate a secure random secret
openssl rand -hex 32
```

Use this value for both:
- `FLW_DEPLOY_WEBHOOK_SECRET` in `.env`
- Webhook secret in GitHub webhook settings

## Testing

### Manual Test with cURL

```bash
# Set variables
SECRET="your_webhook_secret"
PAYLOAD='{"ref":"refs/heads/main","repository":{"full_name":"user/repo","clone_url":"https://github.com/user/repo.git"},"head_commit":{"id":"abc123","message":"Test commit"}}'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)"

# Send request
curl -X POST https://wp.tysonbrooks.net/vdo/deploy/deploy-vdo.php \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Test from GitHub

1. Make a small commit to an allowed branch
2. Push to GitHub
3. Check webhook delivery in GitHub (Settings → Webhooks → Recent Deliveries)
4. Verify deployment:
   ```bash
   tail -f /var/www/wp.tysonbrooks.net/vdo/deploy/deploy.log
   ls -la /var/www/wp.tysonbrooks.net/vdo
   ```

## Server Setup

### Required Packages

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y php-cli php-curl git apache2

# CentOS/RHEL
sudo yum install -y php-cli php-curl git httpd
```

### Permissions Setup

```bash
# Create directories
sudo mkdir -p /var/www/wp.tysonbrooks.net/vdo/deploy
sudo mkdir -p /var/www/wp.tysonbrooks.net/vdo_releases

# Set ownership (adjust www-data to your web server user)
sudo chown -R www-data:www-data /var/www/wp.tysonbrooks.net/vdo
sudo chown -R www-data:www-data /var/www/wp.tysonbrooks.net/vdo_releases

# Protect .env file
sudo chmod 640 /var/www/wp.tysonbrooks.net/.env
sudo chown root:www-data /var/www/wp.tysonbrooks.net/.env
```

### Web Server User

**Assumptions:**
- Web server runs as `www-data` (Apache) or `nginx` (Nginx)
- Web server user has write access to deployment directories
- Web server user can execute `git` commands
- For private repos: Web server user has access to GitHub token or SSH keys

**Verify web server user:**
```bash
# Apache
ps aux | grep apache2 | head -1

# Nginx
ps aux | grep nginx | head -1
```

## Deployment Flow

1. **Webhook Received**
   - GitHub sends POST request with push event
   - Script validates signature using `FLW_DEPLOY_WEBHOOK_SECRET`

2. **Event Processing**
   - Extracts branch from `refs/heads/<branch>`
   - Checks branch against `FLW_DEPLOY_BRANCHES` allowlist
   - Ignores non-allowed branches (HTTP 202)

3. **Lock Acquisition**
   - Creates lock file to prevent concurrent deployments
   - Checks for stale locks (older than 5 minutes)

4. **Repository Deployment**
   - Creates timestamped release directory: `vdo_releases/YYYYMMDDHHMMSS/`
   - Clones or updates repository to release directory
   - Sets proper file permissions
   - Creates symlink to new release
   - Atomically swaps symlink: `/var/www/wp.tysonbrooks.net/vdo` → new release

5. **Cleanup**
   - Removes old releases (keeps last 5)
   - Releases lock file

6. **Notification**
   - Sends Discord notification with deployment status
   - Logs all events to `deploy.log`

## Security Features

1. **Signature Validation**
   - Uses HMAC-SHA256 with webhook secret
   - Timing-safe comparison with `hash_equals()`

2. **Branch Allowlist**
   - Only deploys branches in `FLW_DEPLOY_BRANCHES`
   - Prevents accidental deployments from feature branches

3. **Lock File**
   - Prevents concurrent deployments
   - Auto-cleans stale locks

4. **No Secret Logging**
   - Secrets never appear in logs
   - Environment variables sanitized

5. **Optional Query Token**
   - Can enable additional token check via query parameter
   - Disabled by default (set `REQUIRE_QUERY_TOKEN = true`)

## Message Protocol

### GitHub Webhook Payload

The script expects standard GitHub push event payload:
```json
{
  "ref": "refs/heads/main",
  "repository": {
    "full_name": "user/repo",
    "clone_url": "https://github.com/user/repo.git"
  },
  "head_commit": {
    "id": "abc123...",
    "message": "Commit message"
  }
}
```

### Response Codes

- **200:** Deployment successful
- **202:** Event ignored (wrong branch, wrong event type)
- **400:** Invalid payload
- **401:** Invalid signature or token
- **405:** Wrong HTTP method
- **409:** Deployment in progress
- **500:** Deployment failed

## Discord Notifications

Discord notifications include:
- Repository name
- Branch
- Short commit SHA (7 chars)
- Commit message (truncated to 200 chars)
- Deployment duration
- Target path
- Error message (if failed)
- Custom avatar (if configured)

## Limitations & Assumptions

1. **Git Operations**
   - Assumes `git` is installed and accessible
   - For private repos, requires `FLW_DEPLOY_GH_TOKEN` or SSH keys

2. **File System**
   - Requires symlink support
   - Requires write access to releases directory
   - Assumes sufficient disk space for multiple releases

3. **Network**
   - Requires internet access to GitHub
   - No explicit timeout handling (relies on git defaults)

4. **Concurrent Deployments**
   - Lock file prevents concurrent deployments
   - Stale locks auto-cleaned after 5 minutes

5. **Rollback**
   - Manual rollback supported via symlink manipulation
   - No automatic rollback on failure

## Future Enhancements

Potential improvements:
- [ ] Automatic rollback on deployment failure
- [ ] Health check after deployment
- [ ] Slack/Email notifications (in addition to Discord)
- [ ] Deployment preview/staging environment
- [ ] Database migration support
- [ ] Pre/post deployment hooks
- [ ] Deployment status API endpoint
- [ ] Web UI for deployment management

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| 401 Invalid signature | Check `FLW_DEPLOY_WEBHOOK_SECRET` matches GitHub |
| 202 Branch ignored | Add branch to `FLW_DEPLOY_BRANCHES` |
| 409 Deployment in progress | Wait or remove stale lock file |
| Git clone failed | Check `FLW_DEPLOY_GH_TOKEN` for private repos |
| Permission denied | Fix ownership: `chown -R www-data:www-data /var/www/...` |
| Discord not working | Verify `FLW_DISCORD_WEBHOOK_URL` is correct |

## Status

✅ **Complete and Ready for Deployment**

All requirements met:
- ✅ GitHub webhook signature validation
- ✅ Branch allowlist enforcement
- ✅ Atomic deployment with symlink swap
- ✅ Release history management
- ✅ Discord notifications
- ✅ Comprehensive logging
- ✅ Security hardening
- ✅ Complete documentation

---

**Version:** 1.0  
**Date:** 2024  
**Status:** Production Ready
