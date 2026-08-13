import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  page.on('console', m => console.log('CONSOLE:', m.type(), m.text()));
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('response', r => { if (r.status() >= 400) console.log('BADRESP:', r.status(), r.url()); });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="ID raqami"]', '621929');
  await page.fill('input[placeholder="Parol"]', '096842');
  await page.click('button[type="submit"]');
  await page.waitForURL(/admin/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);

  await page.goto('http://localhost:3000/admin/students/new', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  console.log('URL:', page.url());
  console.log('TITLE TEXT:', await page.locator('h1').first().textContent().catch(()=>'N/A'));
  const bodyText = await page.locator('body').innerText();
  console.log('BODY SNIPPET:', bodyText.slice(0, 500));
  await page.screenshot({ path: 'qa-debug-students-new.png', fullPage: true });
  await browser.close();
})();
