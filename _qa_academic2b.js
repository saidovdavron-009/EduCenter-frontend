const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const netErrors = [];
  page.on('response', (res) => { if (res.url().includes('/api/') && res.status() >= 400) netErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`); });

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[placeholder="ID raqami"]', '621929');
  await page.fill('input[placeholder="Parol"]', '096842');
  await page.click('button:has-text("Kirish")');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  // ---- schedule: real create test ----
  try {
    await page.goto('http://localhost:3000/admin/schedule', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Dars qo\'shish")', { timeout: 5000 });
    await page.waitForTimeout(500);
    const combos = page.locator('[role="combobox"]');
    const n = await combos.count();
    for (let i = 0; i < n; i++) {
      await combos.nth(i).click({ timeout: 3000 });
      await page.waitForTimeout(300);
      const opts = page.locator('[role="option"]');
      if (await opts.count() > 0) await opts.first().click({ timeout: 3000 });
      else await page.keyboard.press('Escape');
    }
    const timeInputs = page.locator('input[type="time"]');
    const tcount = await timeInputs.count();
    if (tcount > 0) await timeInputs.nth(0).fill('10:00');
    if (tcount > 1) await timeInputs.nth(1).fill('11:00');
    await page.click('button:has-text("Saqlash")', { timeout: 5000 });
    await page.waitForTimeout(1200);
    console.log('[PASS] schedule-create-real, netErrors=', netErrors.length);
  } catch (e) {
    console.log('[FAIL] schedule-create-real:', e.message.slice(0, 300));
  }
  await page.screenshot({ path: 'C:\\Users\\user\\Desktop\\Projects\\markaz\\frontend\\_qa_academic2b_schedule.png' });

  // ---- grades: real create test with correct button text ----
  try {
    await page.goto('http://localhost:3000/admin/grades', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Baho qo\'yish")', { timeout: 5000 });
    await page.waitForTimeout(500);
    const combos = page.locator('[role="combobox"]');
    const n = await combos.count();
    for (let i = 0; i < n; i++) {
      await combos.nth(i).click({ timeout: 3000 });
      await page.waitForTimeout(300);
      const opts = page.locator('[role="option"]');
      if (await opts.count() > 0) await opts.first().click({ timeout: 3000 });
      else await page.keyboard.press('Escape');
    }
    const scoreInput = page.locator('input[type="number"]').first();
    if (await scoreInput.count() > 0) await scoreInput.fill('85');
    await page.click('button:has-text("Saqlash")', { timeout: 5000 });
    await page.waitForTimeout(1200);
    console.log('[PASS] grades-create-real, netErrors=', netErrors.length);
  } catch (e) {
    console.log('[FAIL] grades-create-real:', e.message.slice(0, 300));
  }
  await page.screenshot({ path: 'C:\\Users\\user\\Desktop\\Projects\\markaz\\frontend\\_qa_academic2b_grades.png' });

  console.log('netErrors total:', netErrors.length ? netErrors.join(' | ') : 'none');
  await browser.close();
})();
