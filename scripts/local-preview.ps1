[CmdletBinding()]
param(
  [ValidateRange(1, 65535)]
  [int]$Port = 3000,
  [switch]$ChecksOnly
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

function Ensure-Dependencies {
  $lockHash = (Get-FileHash "package-lock.json" -Algorithm SHA256).Hash
  $hashFile = "node_modules\.workatlas-package-lock.sha256"
  $installedHash = if (Test-Path $hashFile) { (Get-Content $hashFile -Raw).Trim() } else { "" }

  if (-not (Test-Path "node_modules") -or $installedHash -ne $lockHash) {
    Write-Host "Installing the exact dependencies from package-lock.json..." -ForegroundColor Cyan
    Invoke-Native "npm.cmd" @("ci", "--include=dev", "--include=optional")
    Set-Content -Path $hashFile -Value $lockHash -NoNewline
  } else {
    Write-Host "Dependencies are already current." -ForegroundColor DarkGray
  }
}

Assert-Command "node" "Install Node.js 22 or newer, then open a new PowerShell window."
Assert-Command "npm.cmd" "Install Node.js 22 or newer, then open a new PowerShell window."
Assert-Command "docker" "Install and start Docker Desktop."

if (-not (Test-Path ".env")) {
  throw "Missing .env. Run 'Copy-Item .env.example .env', set a 32+ character SESSION_SECRET, and run this command again."
}

Ensure-Dependencies

Write-Host "Starting the local PostgreSQL database..." -ForegroundColor Cyan
Invoke-Native "docker" @("compose", "up", "-d", "db")

$databaseReady = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  & docker compose exec -T db pg_isready -U projecthub -d projecthub *> $null
  if ($LASTEXITCODE -eq 0) {
    $databaseReady = $true
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $databaseReady) {
  throw "The local PostgreSQL container did not become healthy. Open Docker Desktop and run 'docker compose logs db'."
}

$localDatabaseUrl = (& node --env-file=.env -p "process.env.DATABASE_URL || ''").Trim()
if ($LASTEXITCODE -ne 0 -or -not $localDatabaseUrl) {
  throw "DATABASE_URL is missing from .env."
}
$env:DATABASE_URL = $localDatabaseUrl
$env:DATABASE_URL_DIRECT = ""
$env:SESSION_COOKIE_SECURE = "false"
$env:NEXT_PUBLIC_APP_URL = "http://localhost:$Port"
$env:WORKATLAS_LOCAL_PREVIEW = "true"

Write-Host "Applying local database migrations..." -ForegroundColor Cyan
Invoke-Native "npm.cmd" @("run", "db:migrate")

Write-Host "Running environment, configuration, type, lint, test, and migration checks..." -ForegroundColor Cyan
Invoke-Native "npm.cmd" @("run", "env:check")
Invoke-Native "npm.cmd" @("run", "config:validate")
Invoke-Native "npm.cmd" @("run", "typecheck")
Invoke-Native "npm.cmd" @("run", "lint")
Invoke-Native "npm.cmd" @("run", "test")
Invoke-Native "npm.cmd" @("run", "db:check")
Invoke-Native "npm.cmd" @("run", "db:migrations:verify")

Write-Host "Creating and verifying the production build..." -ForegroundColor Cyan
Invoke-Native "npm.cmd" @("run", "build")
Invoke-Native "npm.cmd" @("run", "build:verify")

if ($ChecksOnly) {
  Write-Host "All local checks and the production build passed." -ForegroundColor Green
  return
}

Write-Host ""
Write-Host "WorkAtlas is ready at http://localhost:$Port" -ForegroundColor Green
Write-Host "Press Ctrl+C when you are finished testing. PostgreSQL will remain running for next time." -ForegroundColor DarkGray
Invoke-Native "npm.cmd" @("run", "start", "--", "-p", "$Port")
