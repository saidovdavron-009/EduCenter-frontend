const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const apiIssues = [];
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(`[pageerror] ${err.message}`));
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      apiIssues.push(`[http ${res.status()}] ${res.request().method()} ${res.url()}`);
    }
  });
  page.on('dialog', (d) => d.accept());

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="ID raqami"]', '621929');
  await page.fill('input[placeholder="Parol"]', '096842');
  await page.click('button:has-text("Kirish")');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  const results = {};

  // ===== HOMEWORK =====
  await page.goto('http://localhost:3000/admin/homework', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Yangi vazifa")');
  await page.waitForTimeout(400);
  const hwDialog = page.locator('[role="dialog"]');
  await hwDialog.locator('input').first().fill('QATest_HW1');
  await hwDialog.locator('button[role="combobox"]').click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]', { hasText: 'Test Guruh' }).click();
  await hwDialog.locator('input[type="date"]').fill('2026-09-01');
  await hwDialog.locator('textarea').fill('QA test description');
  await hwDialog.locator('button:has-text("Yaratish")').click();
  await page.waitForTimeout(1200);
  results.homework_create = (await page.locator('text=QATest_HW1').count()) > 0 ? 'PASS' : 'FAIL';

  await page.locator('text=QATest_HW1').first().click();
  await page.waitForURL('**/admin/homework/**', { timeout: 15000 });
  await page.waitForTimeout(800);
  const hwTitle = await page.locator('h1').first().textContent();
  const hwDescFound = await page.locator('text=QA test description').count();
  results.homework_detail = (hwTitle?.includes('QATest_HW1') && hwDescFound > 0) ? 'PASS' : `FAIL title=${hwTitle} desc=${hwDescFound}`;

  await page.goBack({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const hwCard = page.locator('div.cursor-pointer', { hasText: 'QATest_HW1' }).first();
  await hwCard.locator('button:has-text("")').last(); // noop
  await hwCard.getByRole('button').last().click(); // trash button is last button in card
  await page.waitForTimeout(1000);
  results.homework_delete = (await page.locator('text=QATest_HW1').count()) === 0 ? 'PASS' : 'FAIL (still listed)';

  // ===== MATERIALS =====
  await page.goto('http://localhost:3000/admin/materials', { waitUntil: 'networkidle' });
  // test group filter dropdown
  const groupFilterBtn = page.locator('button[role="combobox"]').first();
  await groupFilterBtn.click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]', { hasText: 'Test Guruh' }).click();
  await page.waitForTimeout(500);
  results.materials_group_filter = 'clicked-no-crash';

  // reset filter back to all
  await groupFilterBtn.click();
  await page.waitForTimeout(200);
  await page.locator('[role="option"]', { hasText: 'Barcha guruhlar' }).click();
  await page.waitForTimeout(500);

  await page.click('button:has-text("Material qo\'shish")');
  await page.waitForTimeout(400);
  const matDialog = page.locator('[role="dialog"]');
  await matDialog.locator('input').first().fill('QATest_Material1');
  // type select is 2nd combobox in dialog, leave default PDF
  await matDialog.locator('input').nth(1).fill('https://example.com/test.pdf');
  // group select (3rd combobox overall in dialog, since type select is 1st)
  const dialogCombos = matDialog.locator('button[role="combobox"]');
  await dialogCombos.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]', { hasText: 'Test Guruh' }).click();
  await matDialog.locator('button:has-text("Saqlash")').click();
  await page.waitForTimeout(1200);
  results.materials_create = (await page.locator('text=QATest_Material1').count()) > 0 ? 'PASS' : 'FAIL';

  const matCard = page.locator('div', { hasText: 'QATest_Material1' }).last();
  const openLink = page.locator('a[href="https://example.com/test.pdf"]');
  results.materials_open_link_href = (await openLink.count()) > 0 ? 'PASS' : 'FAIL (href not found)';

  const matCardBlock = page.locator('.rounded-xl.border', { hasText: 'QATest_Material1' }).last();
  await matCardBlock.getByRole('button').last().click();
  await page.waitForTimeout(1000);
  results.materials_delete = (await page.locator('text=QATest_Material1').count()) === 0 ? 'PASS' : 'FAIL (still listed)';

  console.log(JSON.stringify(results, null, 2));
  console.log('API ISSUES:', apiIssues.length ? apiIssues.join('\n') : 'none');
  console.log('PAGE ERRORS:', pageErrors.length ? pageErrors.join('\n') : 'none');

  await browser.close();
})();
