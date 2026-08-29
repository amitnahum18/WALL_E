# Local static server for the simulator.  Usage:  .\serve.ps1  [-Port 5173]
param([int]$Port = 5173)

$root = $PSScriptRoot
$url  = "http://localhost:$Port/"

function Test-Cmd($name) {
    $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

if (Test-Cmd 'python') {
    Write-Host "Serving $root on $url  (Ctrl+C to stop)" -ForegroundColor Cyan
    Start-Process $url
    python -m http.server $Port --directory $root
    return
}

if (Test-Cmd 'npx') {
    Write-Host "Serving $root on $url  (Ctrl+C to stop)" -ForegroundColor Cyan
    npx --yes serve -l $Port $root
    return
}

# Fallback: built-in .NET listener, no install required
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try { $listener.Start() }
catch {
    Write-Host "Could not bind port $Port." -ForegroundColor Yellow
    Write-Host "Just open index.html directly in the browser - the simulator works that way too." -ForegroundColor Yellow
    return
}

Write-Host "Serving $root on $url  (Ctrl+C to stop)" -ForegroundColor Cyan
Start-Process $url

$types = @{
    '.html' = 'text/html; charset=utf-8'; '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'; '.png'  = 'image/png'; '.jpg' = 'image/jpeg'
    '.webp' = 'image/webp'; '.ico'  = 'image/x-icon'; '.woff2' = 'font/woff2'
}

while ($listener.IsListening) {
    $ctx  = $listener.GetContext()
    $rel  = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = Join-Path $root ($rel -replace '/', '\')

    if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }

    if (Test-Path $path -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($path).ToLower()
        if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] }
        else { $ctx.Response.ContentType = 'application/octet-stream' }
        $ctx.Response.Headers.Add('Cache-Control', 'no-store')
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $ctx.Response.StatusCode = 404
    }
    $ctx.Response.OutputStream.Close()
}
