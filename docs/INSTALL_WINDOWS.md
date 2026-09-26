# BOOKORA AI — Windows installation

## Requirements

- Windows 10/11
- Bun 1.3.4+ (recommended) or Node.js 20+
- A configured Supabase project

## Install

From the repository root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install-windows.ps1
```

The script installs dependencies, creates a local `.env` template when needed, and creates a production build.

## Configure

Open `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put service-role keys or other server secrets in the browser-visible `VITE_*` variables.

## Run

```powershell
bun run dev
```

The production build is intended for a TanStack Start-compatible hosting provider. This repository does not bundle provider credentials or a prebuilt Windows executable.

## PWA installation

When deployed over HTTPS, supported browsers can install BOOKORA AI from the browser's install control because the app ships a web manifest and service worker.

## Troubleshooting

If the app reports missing Supabase configuration, fix `.env` and restart the dev server. If a deployment fails, inspect the hosting provider's build/runtime logs rather than assuming the build is live.
