import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
function log(page_, msg) { results.push(`[${page_}] ${msg}`); console.log(`[${page_}] ${msg}`); }

const errors = [];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`PAGE ERROR: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      errors.push(`HTTP ${res.status()}: ${res.url()}`);
    }
  });

  // LOGIN
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  log('login', `landed on ${page.url()}`);

  // Try to find login/id and password fields generically
  const loginInput = page.locator('input').first();
  await loginInput.fill('621929');
  const passInput = page.locator('input[type="password"]');
  await passInput.fill('096842');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/admin/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  log('login', `after submit, url=${page.url()}`);
  if (!page.url().includes('/admin')) {
    log('login', 'FAIL - did not reach admin area');
    await page.screenshot({ path: 'qa_login_fail.png' });
  } else {
    log('login', 'PASS - admin login works');
  }

  // ================= SUBJECTS =================
  try {
    await page.goto(`${BASE}/admin/subjects`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const beforeCount = await page.locator('table tbody tr, [class*="card"]').count();
    log('subjects', `list loaded, rows/cards ~${beforeCount}`);

    // create
    const addBtn = page.getByRole('button', { name: /qo'sh|yarat|new|add/i }).first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(800);
      const nameInput = page.locator('input[name="name"], input[placeholder*="nom" i]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('QATest_Subject1');
        const submitBtn = page.locator('button[type="submit"]').last();
        await submitBtn.click();
        await page.waitForTimeout(1500);
        const created = await page.getByText('QATest_Subject1').count();
        log('subjects', created > 0 ? 'CREATE PASS - QATest_Subject1 visible' : 'CREATE FAIL - not visible after submit');
      } else {
        log('subjects', 'CREATE FAIL - no name input found in modal/form');
      }
    } else {
      log('subjects', 'no add button found');
    }

    // delete the test subject if present
    const row = page.locator('tr', { hasText: 'QATest_Subject1' }).first();
    if (await row.count() > 0) {
      const delBtn = row.getByRole('button', { name: /o'chir|delete|trash/i }).first();
      if (await delBtn.count() > 0) {
        await delBtn.click();
        await page.waitForTimeout(500);
        // confirm dialog if present
        const confirmBtn = page.getByRole('button', { name: /ha|tasdiqla|confirm|o'chir/i }).last();
        if (await confirmBtn.count() > 0) await confirmBtn.click();
        await page.waitForTimeout(1000);
        const stillThere = await page.getByText('QATest_Subject1').count();
        log('subjects', stillThere === 0 ? 'DELETE PASS' : 'DELETE FAIL - still visible');
      }
    }
  } catch (e) {
    log('subjects', `EXCEPTION: ${e.message}`);
  }

  await browser.close();

  console.log('\n===== ERRORS CAPTURED =====');
  errors.forEach(e => console.log(e));
  console.log('\n===== RESULTS =====');
  results.forEach(r => console.log(r));
})();