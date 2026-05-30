# Generate a random JWT secret for Render env vars.
# Run twice — use different values for Zaavero, AgentOps, and DataWhisper.

$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
Write-Host "JWT_SECRET=$secret"
Write-Host ""
Write-Host "Copy this into Render dashboard (one unique secret per API service)."
