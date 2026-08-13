import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push("console: " + msg.text()); });
page.on("pageerror", (err) => errors.push("pageerror: " + err.message));
page.on("response", async (res) => {
  if (res.status() >= 400) {
    let body = ""; try { body = await res.text(); } catch {}
    errors.push(`http ${res.status()}: ${res.url()} body=${body}`);
  }
});

await page.goto("http://localhost:3000/login");
await page.fill('input[type="email"]', "admin@educenter.uz");
await page.fill('input[type="password"]', "Admin123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin/**", { timeout: 30000 });

await page.goto("http://localhost:3000/admin/reports");
await page.waitForTimeout(2000);
await page.screenshot({ path: "verify_reports.png", fullPage: true });

// switch period
await page.click('text=6 oy');
await page.waitForTimeout(300);
await page.click('text=1 yil');
await page.waitForTimeout(1500);
await page.screenshot({ path: "verify_reports_1year.png", fullPage: true });

console.log("ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();