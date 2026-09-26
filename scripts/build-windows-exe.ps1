$ErrorActionPreference = "Stop"

Write-Host "BOOKORA AI Windows executable build" -ForegroundColor Cyan
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) { throw "Bun 1.3.4+ is required to build the executable." }
bun install --frozen-lockfile
bun run build
New-Item -ItemType Directory -Force -Path "dist/windows" | Out-Null
bun build scripts/bookora-windows-server.ts --compile --target=bun-windows-x64 --outfile=dist/windows/BOOKORA-AI.exe
Copy-Item -Recurse -Force .output/public dist/windows/client
Write-Host "Built dist/windows/BOOKORA-AI.exe (unsigned)." -ForegroundColor Green