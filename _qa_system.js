const { chromium } = require('playwright');

const results = [];
function log(section, msg) { results.push(`[${section}] ${msg}`); console.log(`[${section}] ${msg}`); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const apiErrors = [];
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      apiErrors.push(`${res.request().method()} ${res.url()} -> ${res.status()}`);
    }
  });
  page.on('pageerror', (err) => apiErrors.push(`[pageerror] ${err.message.slice(0,200)}`));

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="ID raqami"]', '621929');
  await page.fill('input[placeholder="Parol"]', '096842');
  await page.click('button:has-text("Kirish")');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  // ============ BRANCHES ============
  try {
    await page.goto('http://localhost:3000/admin/branches', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Filial qo\'shish")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Chilonzor filiali"]', 'QATest_Branch');
    await page.fill('input[placeholder="Toshkent, Chilonzor tumani"]', 'QATest Address');
    await page.fill('input[placeholder="+998901234567"]', '+998900000001');
    // manager select
    const managerTrigger = page.locator('button[role="combobox"]').first();
    await managerTrigger.click();
    await page.waitForTimeout(300);
    const options = page.locator('[role="option"]');
    const optCount = await options.count();
    if (optCount > 1) {
      await options.nth(1).click(); // pick a real manager, not "Tanlanmagan"
    } else {
      await page.keyboard.press('Escape');
    }
    await page.click('button:has-text("Saqlash")');
    await page.waitForTimeout(1200);
    const created = await page.locator('text=QATest_Branch').count();
    log('branches', `create: ${created > 0 ? 'PASS' : 'FAIL - not found after create'}`);

    // check active badge
    const card = page.locator('div', { hasText: 'QATest_Branch' }).first();
    const activeBadge = await page.locator('text=Faol').count();
    log('branches', `active badge present count=${activeBadge}`);

    // edit: change phone
    await page.locator('button:has(svg)').first(); // noop placeholder
    const editBtn = page.locator('div:has-text("QATest_Branch") >> button').first();
    // find pencil button near the branch card
    const branchCard = page.locator('div.rounded-xl', { hasText: 'QATest_Branch' }).first();
    await branchCard.locator('button').first().click(); // pencil (edit)
    await page.waitForTimeout(300);
    const phoneInput = page.locator('input[placeholder="+998901234567"]');
    await phoneInput.fill('');
    await phoneInput.fill('+998900000099');
    await page.click('button:has-text("Saqlash")');
    await page.waitForTimeout(1200);
    const editedPhoneVisible = await page.locator('text=+998900000099').count();
    log('branches', `edit phone persisted: ${editedPhoneVisible > 0 ? 'PASS' : 'FAIL'}`);

    // delete
    const branchCard2 = page.locator('div.rounded-xl', { hasText: 'QATest_Branch' }).first();
    const buttons = branchCard2.locator('button');
    await buttons.nth(1).click(); // trash icon (second button)
    await page.waitForTimeout(200);
    page.once('dialog', (d) => d.accept());
    await page.waitForTimeout(1000);
    const stillThere = await page.locator('text=QATest_Branch').count();
    log('branches', `delete: ${stillThere === 0 ? 'PASS' : 'FAIL - still present'}`);
  } catch (e) {
    log('branches', `EXCEPTION: ${e.message.slice(0,300)}`);
  }

  await browser.close();
  console.log('\n=== API/PAGE ERRORS ===');
  console.log(apiErrors.length ? apiErrors.join('\n') : 'none');
})();
