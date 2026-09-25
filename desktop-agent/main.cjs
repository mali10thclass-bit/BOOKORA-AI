const { app, BrowserWindow, shell, session } = require("electron");
const DEFAULT_URL = "https://bookora-ai.vercel.app";
const target = process.env.BOOKORA_WEB_URL || process.argv.find((v) => /^https?:\/\//i.test(v)) || DEFAULT_URL;
function validUrl(value) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }
if (!validUrl(target)) throw new Error("BOOKORA_WEB_URL must be an http(s) URL");
function createWindow() {
  const win = new BrowserWindow({ width: 1440, height: 920, minWidth: 1000, minHeight: 700, title: "BOOKORA AI", autoHideMenuBar: true, backgroundColor: "#0b1020", webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, webviewTag: false }});
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  win.webContents.setWindowOpenHandler(({ url }) => { if (validUrl(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (event, url) => { if (!url.startsWith(new URL(target).origin)) { event.preventDefault(); if (validUrl(url)) shell.openExternal(url); }});
  win.loadURL(target);
}
app.whenReady().then(() => { createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });