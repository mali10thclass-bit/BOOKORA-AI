$ErrorActionPreference = "Stop"

Write-Host "BOOKORA AI Windows installer" -ForegroundColor Cyan
Write-Host "This installer prepares a local production build; it does not embed secrets." -ForegroundColor Yellow

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command bun -ErrorAction SilentlyContinue) -and -not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Bun or Node.js is required. Install Bun 1.3.4+ or Node.js 20+ and run this installer again."
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example. Add your Supabase values before using the app." -ForegroundColor Yellow
}

if (Get-Command node -ErrorAction SilentlyContinue) { node scripts/check-env.mjs } else { bun run env:check }
if ($LASTEXITCODE -ne 0) { throw "Environment validation failed. Configure .env before building BOOKORA AI." }

if (Get-Command bun -ErrorAction SilentlyContinue) {
  bun install --frozen-lockfile
  bun run build
} else {
  npm install
  npm run build
}

Write-Host "Production build completed and environment validation passed." -ForegroundColor Green
Write-Host "Run 'bun run dev' for development or deploy the generated TanStack Start output using your hosting provider." -ForegroundColor Cyan
