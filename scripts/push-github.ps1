param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl
)

# Push local monorepo to GitHub.
# Example: .\scripts\push-github.ps1 -RemoteUrl https://github.com/YOUR_USER/zaavero-constellation.git

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Push-Location $Root

if (-not (Test-Path .git)) {
  Write-Error "No git repo. Run from Applications/ after git init."
}

git branch -M main

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $RemoteUrl
} else {
  git remote add origin $RemoteUrl
}

Write-Host "Pushing to $RemoteUrl ..." -ForegroundColor Cyan
git push -u origin main

Pop-Location
Write-Host "Done. Connect Render Blueprint and Vercel to this repo." -ForegroundColor Green
