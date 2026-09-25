# BOOKORA AI Windows Desktop

BOOKORA AI remains a web-first SaaS/PWA. This desktop package provides two Windows x64 distributions of the same application:

- **Portable EXE** — run without installation.
- **NSIS Installer** — normal Windows installation with Start Menu/Desktop shortcuts.

## Build locally

PowerShell:

```powershell
npm install
npm run build:windows
```

Artifacts are written to `dist/`.

## Run against a deployment

Set the web URL before starting:

```powershell
$env:BOOKORA_WEB_URL="https://your-bookora-domain.example"
npm start
```

The desktop shell never contains Supabase service-role credentials. Authentication, tenant isolation, business data, AI tools, and permissions remain controlled by the BOOKORA web application and backend.

## Security

The Electron window uses sandboxing, context isolation, disabled Node integration, disabled webviews, blocked permission requests, and controlled external navigation.

## Important

The repository does not claim a built/released EXE until the Windows GitHub Actions build has actually completed successfully.