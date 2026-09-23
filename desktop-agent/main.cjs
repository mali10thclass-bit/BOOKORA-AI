const { app, BrowserWindow, shell, dialog } = require("electron");
const DEFAULT_URL = process.env.BOOKORA_WEB_URL || "http://localhost:8080";
let win;
function normalizeUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported protocol");
    return url.toString();
  } catch { return DEFAULT_URL; }
}
async function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1100, minHeight: 700,
    title: "BOOKORA AI Agent", autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  await win.loadURL(normalizeUrl(process.argv[2] || DEFAULT_URL));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.on("closed", () => { win = null; });
}
app.whenReady().then(createWindow).catch(error => {
  dialog.showErrorBox("BOOKORA AI Agent", String(error?.message || error)); app.quit();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
