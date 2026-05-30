# Start all Zaavero constellation services for local development.
# Run from Applications/:  .\scripts\start-local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "=== Zaavero constellation — local dev ===" -ForegroundColor Cyan

function Stop-PortListener {
    param([int]$Port)
    $lines = netstat -ano | Select-String "LISTENING" | Select-String ":$Port "
    foreach ($line in $lines) {
        if ($line -match '\s+(\d+)\s*$') {
            $pid = [int]$Matches[1]
            if ($pid -gt 0) {
                Write-Host "Stopping PID $pid on port $Port..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Stale AgentOps API on 8080 causes 404 on login/SSO — stop it.
Stop-PortListener -Port 8080

Write-Host "`n[1/5] Zaavero Postgres (Docker :5433)..." -ForegroundColor Green
Push-Location "$Root\Zaavero\infra"
docker compose up -d
Pop-Location

Write-Host "`n[2/5] Zaavero API (:8000) + Frontend (:3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\Zaavero\backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\Zaavero\frontend'; npm run dev"

Write-Host "`n[3/5] AgentOps API (:8081) + Frontend (:5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\AgentOps_Databricks\backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8081"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\AgentOps_Databricks\frontend'; npm run dev"

Write-Host "`n[4/5] DataWhisper Postgres + API (Docker :8002)..." -ForegroundColor Green
Push-Location "$Root\DataWhisper\infra"
docker compose up -d postgres backend
Pop-Location

Write-Host "`n[5/5] DataWhisper Frontend (:3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\DataWhisper\frontend'; npm run dev"

Write-Host "`n=== Ready ===" -ForegroundColor Cyan
Write-Host "  Zaavero:     http://localhost:3000"
Write-Host "  AgentOps:    http://localhost:5173  (API :8081)"
Write-Host "  DataWhisper: http://localhost:3001  (API :8002)"
Write-Host "`nLaunch products from Zaavero → Products → Launch."
