[CmdletBinding()]
param(
  [string]$Message = "",
  [switch]$Yes,
  [switch]$DryRun,
  [ValidateRange(2, 60)]
  [int]$TimeoutMinutes = 12
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path "C:\Program Files\nodejs\node.exe")) {
  $env:Path = "C:\Program Files\nodejs;$env:Path"
}

function Assert-Command {
  param([string]$Name, [string]$InstallHint)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "'$Name' was not found. $InstallHint"
  }
}

function Invoke-Native {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE`: $File $($Arguments -join ' ')"
  }
}

function Clear-ProductionOverrides {
  $names = @("DATABASE_URL", "DATABASE_URL_DIRECT", "NEXT_PUBLIC_APP_URL")
  $saved = @{}
  foreach ($name in $names) {
    $saved[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
  }
  return $saved
}

function Restore-ProductionOverrides {
  param([hashtable]$Saved)
  foreach ($name in $Saved.Keys) {
    if ($null -eq $Saved[$name]) {
      Remove-Item "Env:$name" -ErrorAction SilentlyContinue
    } else {
      [Environment]::SetEnvironmentVariable($name, $Saved[$name], "Process")
    }
  }
}

function Assert-NotBehindOrigin {
  Invoke-Native "git" @("fetch", "origin", "main")
  $behind = (& git rev-list --count HEAD..origin/main).Trim()
  if ($LASTEXITCODE -ne 0) { throw "Could not compare the local branch with origin/main." }
  if ([int]$behind -gt 0) {
    throw "Your local main branch is behind GitHub by $behind commit(s). Run 'git pull --rebase origin main', resolve any conflicts, and retry."
  }
}

function Assert-StagedFilesAreSafe {
  $stagedFiles = @(& git diff --cached --name-only --diff-filter=ACMR)
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect staged files." }
  if ($stagedFiles.Count -eq 0) { throw "There are no changes to release." }

  $allowedEnvironmentExamples = @(".env.example", ".env.release.example")
  foreach ($file in $stagedFiles) {
    $normalized = $file.Replace("\", "/")
    $leaf = Split-Path $normalized -Leaf
    if ($leaf.StartsWith(".env") -and $allowedEnvironmentExamples -notcontains $leaf) {
      throw "Refusing to release because '$normalized' is an environment file. Keep secrets in ignored local files."
    }

    $content = @(& git show ":$normalized" 2>$null) -join "`n"
    if ($content -match "npg_[A-Za-z0-9]{8,}" -or
        $content -match "(?i)postgres(?:ql)?://(?!USER:PASSWORD)[^\s:@/]+:[^\s@/]+@[^\s]*\.neon\.tech") {
      throw "Refusing to release because '$normalized' appears to contain a Neon credential. Remove the secret before committing."
    }
  }
}

Assert-Command "node" "Install Node.js 22 or newer, then open a new PowerShell window."
Assert-Command "npm.cmd" "Install Node.js 22 or newer, then open a new PowerShell window."
Assert-Command "git" "Install Git for Windows."

if ((& git branch --show-current).Trim() -ne "main") {
  throw "Production releases must be run from the main branch."
}
if (-not (& git remote get-url origin 2>$null)) {
  throw "The Git remote named 'origin' is missing."
}
if (-not (& git config user.name) -or -not (& git config user.email)) {
  throw "Git commit identity is missing. Set git user.name and user.email before releasing."
}
if (-not (Test-Path ".env.release.local")) {
  throw "Missing .env.release.local. Run 'Copy-Item .env.release.example .env.release.local', add the Neon direct URL, and retry."
}
Write-Host "Checking GitHub for newer commits..." -ForegroundColor Cyan
Assert-NotBehindOrigin
$hasWorkingChanges = [bool](& git status --porcelain)
$ahead = [int]((& git rev-list --count origin/main..HEAD).Trim())
if (-not $hasWorkingChanges -and $ahead -eq 0) {
  Write-Host "There are no local changes or unpushed commits to release." -ForegroundColor Yellow
  return
}
$resumingCommittedRelease = -not $hasWorkingChanges -and $ahead -gt 0
if ($resumingCommittedRelease) {
  Write-Host "Resuming $ahead committed release commit(s) that have not yet been pushed." -ForegroundColor Yellow
}

$savedEnvironment = Clear-ProductionOverrides
try {
  Invoke-Native "node" @("--env-file=.env.release.local", "scripts/verify-production-env.mjs")
  $productionUrl = (& node --env-file=.env.release.local -p "process.env.NEXT_PUBLIC_APP_URL || ''").Trim().TrimEnd("/")
  if ($LASTEXITCODE -ne 0 -or -not $productionUrl) { throw "Could not read NEXT_PUBLIC_APP_URL." }
} finally {
  Restore-ProductionOverrides $savedEnvironment
}

Write-Host "Running the complete local migration, test, and production-build workflow..." -ForegroundColor Cyan
& "$PSScriptRoot\local-preview.ps1" -ChecksOnly
if ($LASTEXITCODE -ne 0) { throw "The local release checks failed." }

if ($DryRun) {
  Write-Host "Dry run passed. No production migration, commit, push, or deployment was performed." -ForegroundColor Green
  return
}

if (-not $Yes) {
  Write-Host ""
  if ($resumingCommittedRelease) {
    Write-Host "Next, this script will apply forward-only Neon migrations and push the existing local release commit(s)." -ForegroundColor Yellow
  } else {
    Write-Host "Next, this script will commit ALL local changes, apply forward-only Neon migrations, and push main to GitHub." -ForegroundColor Yellow
  }
  $confirmation = Read-Host "Type RELEASE to continue"
  if ($confirmation -ne "RELEASE") {
    Write-Host "Release cancelled. No production changes were made." -ForegroundColor Yellow
    return
  }
}

if ($hasWorkingChanges) {
  # Detect environment files or copied database credentials before touching Neon.
  Write-Host "Preflight safety-checking all release files..." -ForegroundColor Cyan
  Invoke-Native "git" @("add", "--all")
  Assert-StagedFilesAreSafe
}

# Check once more because the validation/build phase can take several minutes.
Assert-NotBehindOrigin

$releaseFile = Join-Path $repoRoot "src\generated\release.ts"
if ($resumingCommittedRelease) {
  $releaseSource = Get-Content $releaseFile -Raw
  if ($releaseSource -notmatch 'RELEASE_ID\s*=\s*"([^"]+)"') {
    throw "The unpushed commit does not contain a valid release fingerprint. Add a source change and run the release again."
  }
  $releaseId = $Matches[1]
} else {
  $releaseId = "release-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))-$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
  $releaseSource = "// Updated automatically by scripts/release-production.ps1.`nexport const RELEASE_ID = `"$releaseId`" as const;`n"
  [IO.File]::WriteAllText($releaseFile, $releaseSource, (New-Object Text.UTF8Encoding($false)))

  Write-Host "Staging and safety-checking all changes..." -ForegroundColor Cyan
  Invoke-Native "git" @("add", "--all")
  Assert-StagedFilesAreSafe

  if (-not $Message.Trim()) {
    $Message = "release: WorkAtlas $([DateTime]::UtcNow.ToString('yyyy-MM-dd HH:mm')) UTC"
  }
  Invoke-Native "git" @("commit", "-m", $Message)
}

Write-Host "Applying committed forward-only migrations to Neon..." -ForegroundColor Cyan
$savedEnvironment = Clear-ProductionOverrides
try {
  Invoke-Native "node" @("--env-file=.env.release.local", "--import", "tsx", "scripts/migrate.ts")
} finally {
  Restore-ProductionOverrides $savedEnvironment
}

Invoke-Native "git" @("push", "origin", "main")

Write-Host "GitHub push completed. Waiting for Vercel to serve release $releaseId..." -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$deployed = $false
while ((Get-Date) -lt $deadline) {
  try {
    $cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $version = Invoke-RestMethod -Uri "$productionUrl/api/version?release=$releaseId&t=$cacheBust" -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 20
    if ($version.release -eq $releaseId) {
      $deployed = $true
      break
    }
  } catch {
    # A 404, transient build response, or cold start is normal while Vercel deploys.
  }
  Write-Host "Vercel is still deploying..." -ForegroundColor DarkGray
  Start-Sleep -Seconds 10
}

if (-not $deployed) {
  throw "GitHub was updated, but the matching Vercel release was not visible within $TimeoutMinutes minutes. Check the Vercel deployment log."
}

try {
  $health = Invoke-RestMethod -Uri "$productionUrl/api/health" -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 30
  if ($health.status -ne "ok" -or $health.database -ne "connected") {
    throw "Unexpected health response."
  }
} catch {
  throw "The matching Vercel release is online, but its database health check failed. Check the Vercel function logs and environment variables."
}

Write-Host ""
Write-Host "Production release is ready and healthy: $productionUrl" -ForegroundColor Green
