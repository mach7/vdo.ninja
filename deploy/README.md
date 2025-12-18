# VDO.Ninja Deployment Webhook

This directory contains the deployment webhook handler for automatically deploying the VDO.Ninja repository from GitHub.

## File Location

The deployment script should be placed at:
```
/var/www/wp.tysonbrooks.net/vdo/deploy/deploy-vdo.php
```

**Important:** Ensure this file is accessible via web server but consider protecting it with:
- HTTP Basic Auth
- IP allowlist
- Or place it outside the webroot and configure a specific route

## Environment Configuration

The script reads configuration from:
```
/var/www/wp.tysonbrooks.net/.env
```

### Required Environment Variables

Add these to your `.env` file:

```bash
# GitHub Webhook Secret (must match GitHub webhook configuration)
FLW_DEPLOY_WEBHOOK_SECRET=your_webhook_secret_here

# GitHub Personal Access Token (for private repos)
FLW_DEPLOY_GH_TOKEN=ghp_your_token_here

# Comma-separated list of branches allowed to deploy
FLW_DEPLOY_BRANCHES=main,master,production

# Discord Webhook URL (optional, for notifications)
FLW_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url

# Discord Avatar URL (optional)
DISCORD_AVATAR_URL=https://example.com/avatar.png
```

### Environment Variable Format

The `.env` file supports:
- `KEY=VALUE` format
- Comments starting with `#`
- Blank lines (ignored)
- Quoted values (quotes are stripped)

Example:
```bash
# Deployment Configuration
FLW_DEPLOY_WEBHOOK_SECRET=abc123xyz
FLW_DEPLOY_BRANCHES=main,production

# Optional: Discord notifications
FLW_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## GitHub Webhook Setup

### 1. Create Webhook in GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Webhooks**
3. Click **Add webhook**

### 2. Webhook Configuration

- **Payload URL:** `https://wp.tysonbrooks.net/vdo/deploy/deploy-vdo.php`
- **Content type:** `application/json`
- **Secret:** (Use the same value as `FLW_DEPLOY_WEBHOOK_SECRET` in your `.env`)
- **Events:** Select "Just the push event" (or "Let me select individual events" and choose "Pushes")

### 3. Webhook Events

The script currently handles:
- `push` events (deploys on push to allowed branches)

Other events are ignored with HTTP 202 response.

## Server Requirements

### Required Packages

```bash
# PHP with required extensions
php-cli
php-curl
php-json

# Git
git

# Web server (Apache/Nginx)
apache2  # or nginx
```

### Permissions Setup

The web server user (typically `www-data` or `nginx`) needs:

1. **Read access** to the `.env` file:
   ```bash
   sudo chmod 640 /var/www/wp.tysonbrooks.net/.env
   sudo chown root:www-data /var/www/wp.tysonbrooks.net/.env
   ```

2. **Write access** to deployment directories:
   ```bash
   sudo chown -R www-data:www-data /var/www/wp.tysonbrooks.net/vdo
   sudo chown -R www-data:www-data /var/www/wp.tysonbrooks.net/vdo_releases
   sudo chown -R www-data:www-data /var/www/wp.tysonbrooks.net/vdo/deploy
   ```

3. **Git operations** - The web server user should be able to run git commands. If using SSH keys for private repos, ensure the web server user has access to the SSH key.

### Directory Structure

After setup, you should have:
```
/var/www/wp.tysonbrooks.net/
├── .env                          # Configuration
├── vdo/                          # Current deployment (symlink)
│   └── deploy/
│       ├── deploy-vdo.php        # Webhook handler
│       ├── deploy.log            # Deployment logs
│       └── deploy.lock           # Lock file (created during deployment)
└── vdo_releases/                 # Release history
    ├── 20240101120000/          # Timestamped releases
    ├── 20240101130000/
    └── ...
```

## Testing

### 1. Test with cURL

You can test the webhook endpoint with a sample payload:

```bash
# Generate a test signature (replace SECRET with your webhook secret)
SECRET="your_webhook_secret"
PAYLOAD='{"ref":"refs/heads/main","repository":{"full_name":"user/repo","clone_url":"https://github.com/user/repo.git"},"head_commit":{"id":"abc123","message":"Test commit"}}'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)"

# Send test request
curl -X POST https://wp.tysonbrooks.net/vdo/deploy/deploy-vdo.php \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

### 2. Test from GitHub

1. Make a small change to an allowed branch
2. Push to GitHub
3. Check the webhook delivery in GitHub (Settings → Webhooks → Recent Deliveries)
4. Check deployment logs: `tail -f /var/www/wp.tysonbrooks.net/vdo/deploy/deploy.log`

### 3. Verify Deployment

```bash
# Check current deployment
ls -la /var/www/wp.tysonbrooks.net/vdo

# Check deployment logs
tail -n 50 /var/www/wp.tysonbrooks.net/vdo/deploy/deploy.log

# Check release history
ls -la /var/www/wp.tysonbrooks.net/vdo_releases/
```

## Deployment Process

The script uses an **atomic deployment** strategy:

1. **Lock acquisition** - Prevents concurrent deployments
2. **Clone/Update** - Creates or updates repository in timestamped release directory
3. **Permission setup** - Sets proper file permissions
4. **Atomic swap** - Creates symlink to new release, then swaps it atomically
5. **Cleanup** - Removes old releases (keeps last 5 by default)
6. **Notification** - Sends Discord notification (if configured)

### Rollback

To rollback to a previous release:

```bash
# List available releases
ls -la /var/www/wp.tysonbrooks.net/vdo_releases/

# Manually symlink to previous release
cd /var/www/wp.tysonbrooks.net
rm vdo
ln -s vdo_releases/20240101120000 vdo
```

## Troubleshooting

### Issue: "Invalid signature" (401)

**Cause:** Webhook secret mismatch

**Solution:**
- Verify `FLW_DEPLOY_WEBHOOK_SECRET` in `.env` matches GitHub webhook secret
- Check GitHub webhook configuration

### Issue: "Branch ignored" (202)

**Cause:** Branch not in allowlist

**Solution:**
- Add branch to `FLW_DEPLOY_BRANCHES` in `.env`
- Format: `FLW_DEPLOY_BRANCHES=main,production,develop`

### Issue: "Deployment in progress" (409)

**Cause:** Previous deployment still running or lock file not cleaned up

**Solution:**
```bash
# Check if deployment is actually running
ps aux | grep git

# Remove stale lock file (if safe)
rm /var/www/wp.tysonbrooks.net/vdo/deploy/deploy.lock
```

### Issue: "Git clone failed"

**Cause:** Authentication or network issues

**Solution:**
- For private repos: Ensure `FLW_DEPLOY_GH_TOKEN` is set
- Check network connectivity
- Verify repository URL is correct
- Check git is installed: `which git`

### Issue: "Permission denied"

**Cause:** Web server user lacks permissions

**Solution:**
```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/wp.tysonbrooks.net/vdo
sudo chown -R www-data:www-data /var/www/wp.tysonbrooks.net/vdo_releases

# Ensure web server can read .env
sudo chmod 640 /var/www/wp.tysonbrooks.net/.env
sudo chown root:www-data /var/www/wp.tysonbrooks.net/.env
```

### Issue: Discord notifications not working

**Cause:** Webhook URL not configured or invalid

**Solution:**
- Verify `FLW_DISCORD_WEBHOOK_URL` in `.env`
- Test webhook URL manually with curl
- Check deployment logs for Discord errors

### Issue: Deployment succeeds but site broken

**Cause:** File permissions or symlink issues

**Solution:**
```bash
# Verify symlink
ls -la /var/www/wp.tysonbrooks.net/vdo

# Check permissions
ls -la /var/www/wp.tysonbrooks.net/vdo_releases/

# Ensure web server can read files
sudo chmod -R u+rX /var/www/wp.tysonbrooks.net/vdo_releases/*
```

## Security Considerations

1. **Webhook Secret:** Use a strong, random secret (at least 32 characters)
2. **File Permissions:** Never use `chmod 777`. Use proper ownership instead.
3. **.env Protection:** Keep `.env` file outside webroot or restrict access
4. **HTTPS:** Always use HTTPS for webhook endpoint
5. **IP Allowlist:** Consider restricting webhook endpoint to GitHub IPs
6. **Query Token:** Enable `REQUIRE_QUERY_TOKEN` for additional security (requires updating webhook URL)

## Logs

Deployment logs are written to:
```
/var/www/wp.tysonbrooks.net/vdo/deploy/deploy.log
```

Log format:
```
[YYYY-MM-DD HH:MM:SS] [LEVEL] Message
```

Example:
```
[2024-01-01 12:00:00] [INFO] Received event: push
[2024-01-01 12:00:01] [INFO] Processing deployment: user/repo @ main
[2024-01-01 12:00:05] [INFO] Deployment successful in 4.23s
```

## Support

For issues or questions:
1. Check deployment logs
2. Verify environment configuration
3. Test webhook manually with cURL
4. Check GitHub webhook delivery logs
