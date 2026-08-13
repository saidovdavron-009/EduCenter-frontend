const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="ID raqami"]', '621929');
  await page.fill('input[placeholder="Parol"]', '096842');
  await page.click('button:has-text("Kirish")');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  await page.goto('http://localhost:3000/admin/materials', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const combos = page.locator('button[role="combobox"]');
  console.log('num comboboxes on materials page:', await combos.count());
  await combos.first().click();
  await page.waitForTimeout(300);
  const options = await page.locator('[role="option"]').allTextContents();
  console.log('options in first combobox:', options);

  await page.screenshot({ path: 'C:\\Users\\user\\Desktop\\Projects\\markaz\\frontend\\_qa_debug1.png' });

  await browser.close();
})();
