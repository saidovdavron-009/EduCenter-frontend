const { chromium } = require('playwright');

const results = [];
function log(p, msg) { const line = `[${p}] ${msg}`; results.push(line); console.log(line); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());
  const netErrors = [];
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) netErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });
  page.on('pageerror', (err) => netErrors.push(`pageerror: ${err.message.split('\n')[0]}`));

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="ID raqami"]', '621929');
  await page.fill('input[placeholder="Parol"]', '096842');
  await page.click('button:has-text("Kirish")');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  const dialogCombo = () => page.locator('div[role="dialog"] button[role="combobox"]');

  // ===== FINANCE =====
  await page.goto('http://localhost:3000/admin/finance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const statCards = await page.locator('[class*="text-2xl"]').allTextContents().catch(() => []);
  log('finance', `dashboard stat values present: ${statCards.length > 0} (${statCards.join(', ')})`);
  await page.click('button:has-text("To\'lov qabul qilish")');
  await page.waitForTimeout(400);
  await dialogCombo().first().click();
  await page.waitForTimeout(300);
  let opt = page.locator('[role="option"]', { hasText: 'Test Talaba2' });
  if (await opt.count()) await opt.click(); else { await page.locator('[role="option"]').first().click(); log('finance', 'WARN Test Talaba2 not in list, used first'); }
  await page.fill('input[placeholder="500000"]', '111000');
  await page.click('div[role="dialog"] button:has-text("Qabul qilish")');
  await page.waitForTimeout(1500);
  log('finance', `create payment -> row visible: ${(await page.locator('td:has-text("111")').count()) > 0}`);

  // ===== EXPENSES =====
  await page.goto('http://localhost:3000/admin/expenses', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('button:has-text("Xarajat qo\'shish")');
  await page.waitForTimeout(300);
  await page.fill('input[placeholder="5000000"]', '222000');
  await page.fill('input[placeholder="Xarajat nomi"]', 'QA test xarajat');
  await page.click('div[role="dialog"] button:has-text("Saqlash")');
  await page.waitForTimeout(1500);
  const expVisible = (await page.locator('text=QA test xarajat').count()) > 0;
  log('expenses', `create expense -> visible: ${expVisible}`);
  if (expVisible) {
    await page.locator('tr', { hasText: 'QA test xarajat' }).locator('button').last().click();
    await page.waitForTimeout(1000);
    const stillThere = (await page.locator('text=QA test xarajat').count()) > 0;
    log('expenses', `delete expense -> removed: ${!stillThere}`);
  }

  // ===== SALARIES =====
  await page.goto('http://localhost:3000/admin/salaries', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('button:has-text("Yozuv qo\'shish")');
  await page.waitForTimeout(400);
  await dialogCombo().first().click();
  await page.waitForTimeout(300);
  opt = page.locator('[role="option"]', { hasText: 'Test Domla' });
  if (await opt.count()) await opt.click(); else { await page.locator('[role="option"]').first().click(); log('salaries', 'WARN Test Domla not in list, used first'); }
  await page.fill('input[placeholder="3000000"]', '1500000');
  await page.click('div[role="dialog"] button:has-text("Saqlash")');
  await page.waitForTimeout(1500);
  const salVisible = (await page.locator('text=Test Domla').count()) > 0;
  log('salaries', `create salary record -> visible: ${salVisible}`);
  const payBtn = page.locator('button:has-text("To\'lash")').first();
  if (await payBtn.count()) {
    await payBtn.click();
    await page.waitForTimeout(400);
    await page.click('div[role="dialog"] button:has-text("To\'lash")');
    await page.waitForTimeout(1200);
    const paidBadge = (await page.locator('text=To\'langan').count()) > 0;
    log('salaries', `pay salary -> shows To'langan badge: ${paidBadge}`);
  } else {
    log('salaries', 'no unpaid "To\'lash" button found to test');
  }

  // ===== DISCOUNTS =====
  await page.goto('http://localhost:3000/admin/discounts', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('button:has-text("Chegirma berish")');
  await page.waitForTimeout(400);
  await dialogCombo().first().click();
  await page.waitForTimeout(300);
  opt = page.locator('[role="option"]', { hasText: 'Test Talaba2' });
  if (await opt.count()) await opt.click(); else { await page.locator('[role="option"]').first().click(); log('discounts', 'WARN Test Talaba2 not in list, used first'); }
  await page.fill('input[placeholder="10"]', '15');
  await page.click('div[role="dialog"] button:has-text("Saqlash")');
  await page.waitForTimeout(1500);
  const discVisible = (await page.locator('text=15%').count()) > 0;
  log('discounts', `create discount -> shows 15%: ${discVisible}`);
  const activeTab = page.locator('button', { hasText: 'Faol' });
  if (await activeTab.count()) { await activeTab.click(); await page.waitForTimeout(600); log('discounts', 'Faol filter tab clicked ok'); }

  // ===== CONTRACTS =====
  await page.goto('http://localhost:3000/admin/contracts', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('button:has-text("Shartnoma")');
  await page.waitForTimeout(400);
  await dialogCombo().first().click();
  await page.waitForTimeout(300);
  opt = page.locator('[role="option"]', { hasText: 'Test Talaba2' });
  if (await opt.count()) await opt.click(); else { await page.locator('[role="option"]').first().click(); log('contracts', 'WARN Test Talaba2 not in list, used first'); }
  await page.fill('input[placeholder="CTR-2026-001"]', 'CTR-QA-0001');
  const dateInputs = page.locator('div[role="dialog"] input[type="date"]');
  await dateInputs.nth(1).fill('2027-01-01');
  await page.click('div[role="dialog"] button:has-text("Saqlash")');
  await page.waitForTimeout(1500);
  const contractVisible = (await page.locator('text=CTR-QA-0001').count()) > 0;
  log('contracts', `create contract -> visible: ${contractVisible}`);
  if (contractVisible) {
    await page.locator('tr', { hasText: 'CTR-QA-0001' }).locator('button', { hasText: 'Bekor' }).click();
    await page.waitForTimeout(1200);
    const cancelledBadge = (await page.locator('tr', { hasText: 'CTR-QA-0001' }).locator('text=Bekor qilindi').count()) > 0;
    log('contracts', `cancel contract -> shows Bekor qilindi: ${cancelledBadge}`);
  }
  const filterExpired = page.locator('button', { hasText: 'Muddati tugadi' });
  if (await filterExpired.count()) { await filterExpired.click(); await page.waitForTimeout(600); log('contracts', 'status filter tab clicked ok'); }

  console.log('\n=== NET/PAGE ERRORS ===');
  console.log(netErrors.length ? netErrors.join('\n') : 'none');

  await browser.close();
})();
