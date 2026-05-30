param(
  [ValidateSet("zaavero", "datawhisper", "both")]
  [string]$Target = "both"
)

# Test Neon connection strings and apply Prisma schema.
#
# Setup:
#   1. Copy deploy/neon.secrets.env.example → deploy/neon.secrets.env
#   2. Paste your pooled Neon URLs (with ?sslmode=require)
#   3. Run: .\scripts\test-neon-url.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$SecretsFile = Join-Path $Root "deploy\neon.secrets.env"

if (-not (Test-Path $SecretsFile)) {
  Write-Host "Create deploy/neon.secrets.env from deploy/neon.secrets.env.example first." -ForegroundColor Yellow
  exit 1
}

function Import-SecretsFile {
  param([string]$Path)
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

Import-SecretsFile -Path $SecretsFile

function Test-ZaaveroDb {
  $url = $env:ZAAVERO_DATABASE_URL
  if (-not $url -or $url -match 'USER:PASSWORD|ep-xxxx') {
    Write-Host "[SKIP] ZAAVERO_DATABASE_URL not configured in deploy/neon.secrets.env" -ForegroundColor Yellow
    return $false
  }
  Write-Host "[TEST] Zaavero DB - prisma db push..." -ForegroundColor Cyan
  Push-Location (Join-Path $Root "Zaavero\backend")
  $env:DATABASE_URL = $url
  $env:PYTHONPATH = "."
  & .\.venv\Scripts\python.exe -m prisma db push --skip-generate
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Zaavero schema push failed" }
  & .\.venv\Scripts\python.exe scripts/seed_catalog.py
  Pop-Location
  Write-Host "[OK]   Zaavero database ready - schema and catalog seed" -ForegroundColor Green
  return $true
}

function Test-DataWhisperDb {
  $url = $env:DATAWHISPER_DATABASE_URL
  if (-not $url -or $url -match 'USER:PASSWORD|ep-xxxx') {
    Write-Host "[SKIP] DATAWHISPER_DATABASE_URL not configured in deploy/neon.secrets.env" -ForegroundColor Yellow
    return $false
  }
  Write-Host "[TEST] DataWhisper DB - prisma db push..." -ForegroundColor Cyan
  Push-Location (Join-Path $Root "DataWhisper\backend")
  $env:DATABASE_URL = $url
  $env:MIGRATION_DATABASE_URL = $url
  $py = Join-Path $Root "Zaavero\backend\.venv\Scripts\python.exe"
  if (-not (Test-Path $py)) { $py = "python" }
  & $py -m prisma db push --skip-generate
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "DataWhisper schema push failed" }
  Pop-Location
  Write-Host "[OK]   DataWhisper database ready - schema applied" -ForegroundColor Green
  return $true
}

Write-Host "=== Neon connection test ===" -ForegroundColor Cyan
$ok = $true
if ($Target -in @("zaavero", "both")) { if (-not (Test-ZaaveroDb)) { $ok = $false } }
if ($Target -in @("datawhisper", "both")) { if (-not (Test-DataWhisperDb)) { $ok = $false } }

if ($ok) {
  Write-Host "`nNeon setup verified. Use the same URLs as DATABASE_URL in Render (Step 3)." -ForegroundColor Green
} else {
  Write-Host "`nFix deploy/neon.secrets.env and retry." -ForegroundColor Yellow
  exit 1
}
