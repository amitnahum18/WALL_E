# Starts the WALL·E reasoning graph.   .\agent\run.ps1  [-Port 8077]
param([int]$Port = 8077)

$here = $PSScriptRoot

if (-not (Test-Path (Join-Path $here '.env'))) {
    Write-Host "No agent\.env yet. Copy .env.example to .env and put your key in it." -ForegroundColor Yellow
    Write-Host "The graph will start, but every request will fail until then." -ForegroundColor Yellow
}

Write-Host "WALL-E agent on http://127.0.0.1:$Port  (Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host "Health: http://127.0.0.1:$Port/health" -ForegroundColor DarkGray

Set-Location $here
python -m uvicorn server:app --host 127.0.0.1 --port $Port --reload
