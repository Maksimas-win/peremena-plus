# Publishes ONLY this new project. Requires Git and GitHub CLI.
# Public repository creation and Pages deployment happen only when you run this file.
[CmdletBinding()]
param(
    [ValidatePattern('^[A-Za-z0-9_.-]+$')][string]$RepoName = 'peremena-plus',
    [string]$ExpectedOwner = 'Maksimas-win'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot
function Invoke-Checked {
    param([string]$Exe, [string[]]$ArgumentList)
    & $Exe @ArgumentList
    if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE. Deployment stopped." }
}
foreach ($Tool in @('git', 'gh')) {
    if (-not (Get-Command $Tool -ErrorAction SilentlyContinue)) {
        throw "Missing $Tool. Install Git and GitHub CLI, restart your terminal and run again."
    }
}
if (-not (Test-Path 'index.html') -or -not (Test-Path 'assets/app.js')) {
    throw 'Wrong folder: expected the complete PEREMENA+ website.'
}
& gh auth status --hostname github.com
if ($LASTEXITCODE -ne 0) {
    Invoke-Checked 'gh' @('auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web')
}
$ProfileJson = & gh api user
if ($LASTEXITCODE -ne 0) { throw 'Cannot read the authenticated GitHub account.' }
$Profile = $ProfileJson | ConvertFrom-Json
$Owner = [string]$Profile.login
if ($Owner -ine $ExpectedOwner) { throw "Authenticated as $Owner, expected $ExpectedOwner. No repository was changed." }
$FullName = "$Owner/$RepoName"
Write-Host "Target: NEW PUBLIC repository $FullName" -ForegroundColor Cyan
& gh repo view $FullName --json name 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { throw "$FullName already exists. Nothing has been overwritten. Ask Codex to inspect it before continuing." }
if (Test-Path '.git') { throw 'A local .git folder already exists. Inspect it before re-running; do not delete it blindly.' }
Invoke-Checked 'gh' @('auth', 'setup-git', '--hostname', 'github.com')
Invoke-Checked 'git' @('init', '-b', 'main')
# Use the account public noreply identity only for this new repository.
Invoke-Checked 'git' @('config', 'user.name', $Owner)
$AuthorEmail = "$($Profile.id)+$Owner@users.noreply.github.com"
Invoke-Checked 'git' @('config', 'user.email', $AuthorEmail)
Invoke-Checked 'git' @('add', '--', 'index.html', 'assets', 'downloads', '.nojekyll', '.gitignore', 'README.md', 'AGENTS.md', 'DEPLOY_CODEX.md', 'publish-github.ps1', 'publish-github.sh', 'tests')
Invoke-Checked 'git' @('commit', '-m', 'Build PEREMENA+ interactive school project')
Invoke-Checked 'gh' @('repo', 'create', $FullName, '--public', '--source', '.', '--remote', 'origin', '--push', '--description', 'PEREMENA+: interactive school project, corridor reveal, 3D pouf and budget calculator')
Invoke-Checked 'gh' @('api', '--method', 'POST', "repos/$FullName/pages", '-f', 'build_type=legacy', '-f', 'source[branch]=main', '-f', 'source[path]=/')
$PagesJson = & gh api "repos/$FullName/pages"
if ($LASTEXITCODE -ne 0) { throw 'Code uploaded, but Pages status is unavailable. Check repository Settings > Pages.' }
$Pages = $PagesJson | ConvertFrom-Json
$SiteUrl = [string]$Pages.html_url
Write-Host "Pages configured: $SiteUrl. Waiting for the first build..." -ForegroundColor Cyan
$Built = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 5
    $State = & gh api "repos/$FullName/pages/builds/latest" --jq '.status' 2>$null
    if ($LASTEXITCODE -eq 0 -and $State -eq 'built') { $Built = $true; break }
    if ($State -eq 'errored') { throw 'GitHub Pages build failed. Inspect the repository Actions / Pages build logs.' }
}
if (-not $Built) {
    Write-Warning 'Files are uploaded and Pages is configured, but a completed build was not confirmed within five minutes.'
    Write-Host $SiteUrl
    exit 2
}
try {
    $Response = Invoke-WebRequest -Uri $SiteUrl -UseBasicParsing -TimeoutSec 30
    if ($Response.StatusCode -ne 200 -or $Response.Content -notmatch 'pouf-canvas') {
        throw 'The published page has not returned the expected website content yet.'
    }
    Write-Host "PUBLISHED AND HTTP-CHECKED: $SiteUrl" -ForegroundColor Green
    Start-Process $SiteUrl
} catch {
    Write-Warning "The build completed, but HTTP verification is still pending: $($_.Exception.Message)"
    Write-Host $SiteUrl
    exit 2
}
