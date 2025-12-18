<?php
/**
 * VDO.Ninja Deployment Webhook Handler
 * 
 * Handles GitHub webhooks to deploy the VDO repository to production.
 * Location: /var/www/wp.tysonbrooks.net/vdo/deploy/deploy-vdo.php
 * 
 * Security:
 * - Validates GitHub webhook signature
 * - Branch allowlist enforcement
 * - Atomic deployment with rollback support
 * - Lock file prevents concurrent deployments
 */

// ============================================================================
// Configuration
// ============================================================================

// Fallback repo URL (used if not in webhook payload)
define('FALLBACK_REPO_URL', 'https://github.com/steveseguin/vdo.ninja.git');

// Paths
define('ENV_FILE', '/var/www/wp.tysonbrooks.net/.env');
define('TARGET_DIR', '/var/www/wp.tysonbrooks.net/vdo');
define('RELEASES_DIR', '/var/www/wp.tysonbrooks.net/vdo_releases');
define('DEPLOY_DIR', dirname(__FILE__));
define('LOG_FILE', DEPLOY_DIR . '/deploy.log');
define('LOCK_FILE', DEPLOY_DIR . '/deploy.lock');

// Deployment settings
define('MAX_RELEASES', 5); // Keep last 5 releases for rollback
define('LOCK_TIMEOUT', 300); // 5 minutes max deployment time

// Optional: Require additional token in query string (default: false)
define('REQUIRE_QUERY_TOKEN', false);
define('QUERY_TOKEN_PARAM', 'token');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load environment variables from .env file
 */
function loadEnv($envFile) {
    if (!file_exists($envFile)) {
        error_log("ENV file not found: $envFile");
        return false;
    }
    
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes if present
            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }
            
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
    return true;
}

/**
 * Log message to file (without secrets)
 */
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message\n";
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
    error_log($logEntry);
}

/**
 * Get environment variable with fallback
 */
function getEnvVar($key, $default = null) {
    return isset($_ENV[$key]) ? $_ENV[$key] : (getenv($key) ?: $default);
}

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature($payload, $secret) {
    $signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
    
    if (empty($signature)) {
        logMessage('Missing X-Hub-Signature-256 header', 'ERROR');
        return false;
    }
    
    // GitHub sends signature as "sha256=<hash>"
    if (strpos($signature, 'sha256=') !== 0) {
        logMessage('Invalid signature format', 'ERROR');
        return false;
    }
    
    $expectedHash = substr($signature, 7);
    $calculatedHash = hash_hmac('sha256', $payload, $secret);
    
    // Use hash_equals for timing-safe comparison
    if (!hash_equals($expectedHash, $calculatedHash)) {
        logMessage('Signature mismatch', 'ERROR');
        return false;
    }
    
    return true;
}

/**
 * Acquire deployment lock
 */
function acquireLock() {
    if (file_exists(LOCK_FILE)) {
        $lockTime = filemtime(LOCK_FILE);
        $elapsed = time() - $lockTime;
        
        if ($elapsed < LOCK_TIMEOUT) {
            logMessage("Deployment already in progress (lock age: {$elapsed}s)", 'WARN');
            return false;
        } else {
            logMessage("Removing stale lock file", 'WARN');
            @unlink(LOCK_FILE);
        }
    }
    
    return touch(LOCK_FILE);
}

/**
 * Release deployment lock
 */
function releaseLock() {
    if (file_exists(LOCK_FILE)) {
        @unlink(LOCK_FILE);
    }
}

/**
 * Send Discord notification
 */
function sendDiscordNotification($status, $repo, $branch, $commitSha, $commitMsg, $duration, $error = null) {
    $webhookUrl = getEnvVar('FLW_DISCORD_WEBHOOK_URL');
    $avatarUrl = getEnvVar('DISCORD_AVATAR_URL');
    
    if (empty($webhookUrl)) {
        logMessage('Discord webhook URL not configured', 'WARN');
        return false;
    }
    
    $color = $status === 'success' ? 0x00ff00 : 0xff0000;
    $emoji = $status === 'success' ? '✅' : '❌';
    
    $embed = [
        'title' => "$emoji Deployment $status",
        'color' => $color,
        'fields' => [
            [
                'name' => 'Repository',
                'value' => $repo,
                'inline' => true
            ],
            [
                'name' => 'Branch',
                'value' => $branch,
                'inline' => true
            ],
            [
                'name' => 'Commit',
                'value' => substr($commitSha, 0, 7),
                'inline' => true
            ],
            [
                'name' => 'Message',
                'value' => substr($commitMsg, 0, 200),
                'inline' => false
            ],
            [
                'name' => 'Duration',
                'value' => number_format($duration, 2) . 's',
                'inline' => true
            ],
            [
                'name' => 'Path',
                'value' => TARGET_DIR,
                'inline' => true
            ]
        ],
        'timestamp' => date('c')
    ];
    
    if ($error) {
        $embed['fields'][] = [
            'name' => 'Error',
            'value' => substr($error, 0, 1000),
            'inline' => false
        ];
    }
    
    $payload = [
        'embeds' => [$embed]
    ];
    
    if ($avatarUrl) {
        $payload['avatar_url'] = $avatarUrl;
    }
    
    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode >= 200 && $httpCode < 300) {
        logMessage("Discord notification sent successfully");
        return true;
    } else {
        logMessage("Discord notification failed: HTTP $httpCode", 'ERROR');
        return false;
    }
}

/**
 * Execute shell command and return output
 */
function execCommand($command, &$output = null, &$returnVar = null) {
    logMessage("Executing: $command");
    exec($command . ' 2>&1', $output, $returnVar);
    $outputStr = implode("\n", $output);
    
    if ($returnVar !== 0) {
        logMessage("Command failed (exit $returnVar): $outputStr", 'ERROR');
    }
    
    return $returnVar === 0;
}

/**
 * Clean up old releases (keep only MAX_RELEASES)
 */
function cleanupOldReleases() {
    if (!is_dir(RELEASES_DIR)) {
        return;
    }
    
    $releases = glob(RELEASES_DIR . '/*', GLOB_ONLYDIR);
    
    // Sort by modification time (newest first)
    usort($releases, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    
    // Remove old releases beyond MAX_RELEASES
    if (count($releases) > MAX_RELEASES) {
        $toRemove = array_slice($releases, MAX_RELEASES);
        foreach ($toRemove as $release) {
            logMessage("Removing old release: $release");
            execCommand("rm -rf " . escapeshellarg($release));
        }
    }
}

/**
 * Deploy repository to target directory
 */
function deployRepository($repoUrl, $branch, $targetDir) {
    $startTime = microtime(true);
    
    // Ensure releases directory exists
    if (!is_dir(RELEASES_DIR)) {
        if (!mkdir(RELEASES_DIR, 0755, true)) {
            logMessage("Failed to create releases directory: " . RELEASES_DIR, 'ERROR');
            return ['success' => false, 'error' => 'Failed to create releases directory'];
        }
    }
    
    // Create timestamped release directory
    $timestamp = date('YmdHis');
    $releaseDir = RELEASES_DIR . '/' . $timestamp;
    
    logMessage("Starting deployment to: $releaseDir");
    
    // Clone or update repository
    if (!is_dir($releaseDir)) {
        // Clone repository
        $cloneCmd = sprintf(
            'git clone --depth 1 --branch %s %s %s',
            escapeshellarg($branch),
            escapeshellarg($repoUrl),
            escapeshellarg($releaseDir)
        );
        
        // Add authentication if token provided
        $ghToken = getEnvVar('FLW_DEPLOY_GH_TOKEN');
        if ($ghToken) {
            // Inject token into repo URL
            $repoUrlWithAuth = preg_replace(
                '#(https?://)(.*)#',
                '$1' . urlencode($ghToken) . '@$2',
                $repoUrl
            );
            $cloneCmd = sprintf(
                'git clone --depth 1 --branch %s %s %s',
                escapeshellarg($branch),
                escapeshellarg($repoUrlWithAuth),
                escapeshellarg($releaseDir)
            );
        }
        
        if (!execCommand($cloneCmd)) {
            return ['success' => false, 'error' => 'Git clone failed'];
        }
    } else {
        // Update existing repository
        $fetchCmd = sprintf(
            'cd %s && git fetch origin %s && git reset --hard origin/%s',
            escapeshellarg($releaseDir),
            escapeshellarg($branch),
            escapeshellarg($branch)
        );
        
        if (!execCommand($fetchCmd)) {
            return ['success' => false, 'error' => 'Git fetch/reset failed'];
        }
    }
    
    // Get commit info
    $commitCmd = sprintf(
        'cd %s && git rev-parse HEAD && git log -1 --pretty=format:%%s',
        escapeshellarg($releaseDir)
    );
    exec($commitCmd, $commitOutput, $commitReturn);
    
    $commitSha = trim($commitOutput[0] ?? 'unknown');
    $commitMsg = trim($commitOutput[1] ?? 'No message');
    
    // Set proper permissions (readable by web server)
    $chmodCmd = sprintf('chmod -R u+rX,go-w %s', escapeshellarg($releaseDir));
    execCommand($chmodCmd);
    
    // Atomic swap: create symlink to new release
    $tempLink = $targetDir . '.new';
    if (file_exists($tempLink)) {
        @unlink($tempLink);
    }
    
    if (!symlink($releaseDir, $tempLink)) {
        return ['success' => false, 'error' => 'Failed to create symlink'];
    }
    
    // Atomic swap
    if (!rename($tempLink, $targetDir)) {
        @unlink($tempLink);
        return ['success' => false, 'error' => 'Failed to swap symlink'];
    }
    
    $duration = microtime(true) - $startTime;
    
    // Cleanup old releases
    cleanupOldReleases();
    
    logMessage("Deployment successful in " . number_format($duration, 2) . "s");
    
    return [
        'success' => true,
        'commitSha' => $commitSha,
        'commitMsg' => $commitMsg,
        'duration' => $duration
    ];
}

// ============================================================================
// Main Handler
// ============================================================================

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Optional query token check
if (REQUIRE_QUERY_TOKEN) {
    $queryToken = $_GET[QUERY_TOKEN_PARAM] ?? '';
    $expectedToken = getEnvVar('FLW_DEPLOY_QUERY_TOKEN');
    
    if (empty($queryToken) || $queryToken !== $expectedToken) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }
}

// Load environment variables
if (!loadEnv(ENV_FILE)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Configuration error']);
    exit;
}

// Get webhook secret
$webhookSecret = getEnvVar('FLW_DEPLOY_WEBHOOK_SECRET');
if (empty($webhookSecret)) {
    logMessage('FLW_DEPLOY_WEBHOOK_SECRET not configured', 'ERROR');
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Configuration error']);
    exit;
}

// Get raw payload
$payload = file_get_contents('php://input');

// Verify signature
if (!verifyGitHubSignature($payload, $webhookSecret)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Parse payload
$data = json_decode($payload, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    logMessage('Invalid JSON payload: ' . json_last_error_msg(), 'ERROR');
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Check event type
$eventType = $_SERVER['HTTP_X_GITHUB_EVENT'] ?? '';
logMessage("Received event: $eventType");

// Handle push events
if ($eventType !== 'push') {
    http_response_code(202);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'Event type ignored', 'event' => $eventType]);
    exit;
}

// Extract branch from ref (refs/heads/<branch>)
$ref = $data['ref'] ?? '';
if (empty($ref) || strpos($ref, 'refs/heads/') !== 0) {
    logMessage("Invalid ref: $ref", 'ERROR');
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid ref']);
    exit;
}

$branch = substr($ref, 11); // Remove 'refs/heads/'

// Check branch allowlist
$allowedBranches = getEnvVar('FLW_DEPLOY_BRANCHES', '');
$allowedBranchesList = array_map('trim', explode(',', $allowedBranches));

if (!in_array($branch, $allowedBranchesList)) {
    logMessage("Branch not in allowlist: $branch", 'INFO');
    http_response_code(202);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'Branch ignored', 'branch' => $branch]);
    exit;
}

// Extract repository info
$repo = $data['repository'] ?? [];
$repoUrl = $repo['clone_url'] ?? FALLBACK_REPO_URL;
$repoName = $repo['full_name'] ?? basename($repoUrl, '.git');

// Extract commit info
$headCommit = $data['head_commit'] ?? [];
$commitSha = $headCommit['id'] ?? 'unknown';
$commitMsg = $headCommit['message'] ?? 'No message';

logMessage("Processing deployment: $repoName @ $branch");

// Acquire lock
if (!acquireLock()) {
    http_response_code(409);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Deployment in progress']);
    exit;
}

try {
    // Perform deployment
    $result = deployRepository($repoUrl, $branch, TARGET_DIR);
    
    if ($result['success']) {
        $status = 'success';
        $error = null;
        $finalCommitSha = $result['commitSha'] ?? $commitSha;
        $finalCommitMsg = $result['commitMsg'] ?? $commitMsg;
        $duration = $result['duration'] ?? 0;
        
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'repo' => $repoName,
            'branch' => $branch,
            'commit' => substr($finalCommitSha, 0, 7),
            'duration' => number_format($duration, 2) . 's'
        ]);
    } else {
        $status = 'failure';
        $error = $result['error'] ?? 'Unknown error';
        $duration = $result['duration'] ?? 0;
        $finalCommitSha = $commitSha;
        $finalCommitMsg = $commitMsg;
        
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'error' => $error
        ]);
    }
    
    // Send Discord notification
    sendDiscordNotification(
        $status,
        $repoName,
        $branch,
        $finalCommitSha,
        $finalCommitMsg,
        $duration,
        $error
    );
    
} catch (Exception $e) {
    logMessage("Deployment exception: " . $e->getMessage(), 'ERROR');
    
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Deployment failed']);
    
    sendDiscordNotification(
        'failure',
        $repoName,
        $branch,
        $commitSha,
        $commitMsg,
        0,
        $e->getMessage()
    );
} finally {
    // Release lock
    releaseLock();
}
