import { chromium, request } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const api = await request.newContext({ baseURL: base });
for (const path of ["/manifest.webmanifest", "/sw.js", "/icons/icon-192.png", "/icons/icon-512.png"]) {
  const response = await api.get(path);
  if (response.status() !== 200) throw new Error(`${path} respondeu ${response.status()}`);
  console.log(`OK ${path}`);
}
await api.dispose();

const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: "allow" });
const page = await context.newPage();
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active));
if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
  await page.reload({ waitUntil: "networkidle" });
}
if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) throw new Error("Service worker não assumiu o controle da página.");
console.log("OK service worker ativo");
await context.setOffline(true);
await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
if (!((await page.locator("body").innerText()).includes("offline"))) throw new Error("Fallback offline não foi exibido.");
console.log("OK fallback offline");
await browser.close();
