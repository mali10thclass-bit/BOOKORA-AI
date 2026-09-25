# BOOKORA AI Portable Windows App

This folder builds BOOKORA AI as a portable Windows x64 EXE using Electron.

Build on Windows:
npm install
npm run build:portable

The generated executable is placed in the dist folder.

The shell loads the deployed BOOKORA web application. It does not embed Supabase service credentials or run a local privileged backend.

Custom URL:
$env:BOOKORA_WEB_URL="https://your-bookora-domain.example"
npm run start

For production, use an HTTPS deployment URL.