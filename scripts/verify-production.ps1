# Verify production endpoints after DNS propagation.
# Usage: .\scripts\verify-production.ps1
# Optional overrides:
#   $env:ZAAVERO_API = "https://api.zaavero.com"
#   $env:ZAAVERO_WEB = "https://zaavero.com"

$ErrorActionPreference = "Continue"

$endpoints = @{
  "Zaavero web"       = if ($env:ZAAVERO_WEB) { $env:ZAAVERO_WEB } else { "https://zaavero.com" }
  "Zaavero API"       = if ($env:ZAAVERO_API) { "$($env:ZAAVERO_API)/health" } else { "https://api.zaavero.com/health" }
  "AgentOps web"      = if ($env:AGENTOPS_WEB) { $env:AGENTOPS_WEB } else { "https://agentops.zaavero.com" }
  "AgentOps API"      = if ($env:AGENTOPS_API) { "$($env:AGENTOPS_API)/api/health" } else { "https://agentops-api.zaavero.com/api/health" }
  "DataWhisper web"   = if ($env:DATAWHISPER_WEB) { $env:DATAWHISPER_WEB } else { "https://datawhisper.zaavero.com" }
  "DataWhisper API"   = if ($env:DATAWHISPER_API) { "$($env:DATAWHISPER_API)/health" } else { "https://datawhisper-api.onrender.com/health" }
}

Write-Host "=== Zaavero production smoke test ===" -ForegroundColor Cyan
Write-Host ""

$failed = 0
foreach ($name in $endpoints.Keys) {
  $url = $endpoints[$name]
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 120 -MaximumRedirection 5
    $ok = $r.StatusCode -ge 200 -and $r.StatusCode -lt 400
    if ($ok) {
      Write-Host "[OK]   $name ($($r.StatusCode)) $url" -ForegroundColor Green
    } else {
      Write-Host "[FAIL] $name ($($r.StatusCode)) $url" -ForegroundColor Red
      $failed++
    }
  } catch {
    Write-Host "[FAIL] $name $url" -ForegroundColor Red
    Write-Host "       $($_.Exception.Message)" -ForegroundColor DarkRed
    $failed++
  }
}

Write-Host ""
if ($failed -eq 0) {
  Write-Host "All checks passed." -ForegroundColor Green
} else {
  Write-Host "$failed check(s) failed. Common causes:" -ForegroundColor Yellow
  Write-Host "  - DNS not propagated yet (wait 30-60 min)"
  Write-Host "  - Render service sleeping (retry, first hit wakes it)"
  Write-Host "  - Custom domain not attached in Vercel/Render"
  exit 1
}
