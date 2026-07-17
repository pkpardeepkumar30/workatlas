[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path "C:\Program Files\nodejs\node.exe")) {
  $env:Path = "C:\Program Files\nodejs;$env:Path"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22 or newer is required." }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker Desktop must be installed and running." }
if (-not (Test-Path ".env.release.local")) { throw "Missing .env.release.local." }

& node --env-file=.env.release.local scripts/verify-production-env.mjs
if ($LASTEXITCODE -ne 0) { throw "The production release environment is invalid." }

$databaseUrl = (& node --env-file=.env.release.local -p "process.env.DATABASE_URL_DIRECT || ''").Trim()
$databaseHost = (& node --env-file=.env.release.local -e "const u=new URL(process.env.DATABASE_URL_DIRECT); console.log(u.hostname)").Trim()
if (-not $databaseUrl) { throw "DATABASE_URL_DIRECT is missing." }

$backupDirectory = Join-Path $repoRoot "backups"
New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
$timestamp = [DateTime]::UtcNow.ToString("yyyyMMdd-HHmmss")
$filename = "workatlas-neon-$timestamp.dump"
$backupPath = Join-Path $backupDirectory $filename
$temporaryEnvironment = Join-Path ([IO.Path]::GetTempPath()) "workatlas-pg-$([Guid]::NewGuid().ToString('N')).env"

try {
  [IO.File]::WriteAllText($temporaryEnvironment, "PGDATABASE=$databaseUrl`n", (New-Object Text.UTF8Encoding($false)))
  Write-Host "Creating a compressed PostgreSQL backup from $databaseHost..." -ForegroundColor Cyan
  & docker run --rm --env-file $temporaryEnvironment -v "${backupDirectory}:/backups" postgres:17-alpine pg_dump --format=custom --no-owner --no-acl --file="/backups/$filename"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed. No usable backup was created." }
} finally {
  Remove-Item -LiteralPath $temporaryEnvironment -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $backupPath) -or (Get-Item $backupPath).Length -eq 0) { throw "The backup file is missing or empty." }
$hash = (Get-FileHash $backupPath -Algorithm SHA256).Hash.ToLowerInvariant()
$manifestPath = "$backupPath.sha256"
Set-Content -Path $manifestPath -Value "$hash  $filename" -Encoding ascii
Write-Host "Backup ready: $backupPath" -ForegroundColor Green
Write-Host "SHA-256: $hash" -ForegroundColor Green
Write-Host "The backups directory is ignored by Git. Copy this dump to separate secure storage before a risky migration." -ForegroundColor Yellow
