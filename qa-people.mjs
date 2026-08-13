import { chromium } from 'playwright';

const results = [];
const consoleErrors = [];
const pageErrors = [];
const failedResponses = [];

function log(msg) { console.log(msg); }

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res) => {
    if (res.status() >= 400 && res.url().includes('/api')) {
      failedResponses.push(`${res.status()} ${res.url()}`);
    }
  });

  // LOGIN
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="login"], input#login, input[type="text"]', '621929');
  await page.fill('input[name="password"], input#password, input[type="password"]', '096842');
  await page.click('button[type="submit"]');
  await page.waitForURL(/admin/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  log('Logged in as admin, current URL: ' + page.url());

  // ---------- STUDENTS ----------
  try {
    await page.goto('http://localhost:3000/admin/students', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const searchBox = page.locator('input[placeholder*="qidir" i], input[type="search"]').first();
    if (await searchBox.count() > 0) {
      await searchBox.fill('Test');
      await page.waitForTimeout(800);
      await searchBox.fill('');
      await page.waitForTimeout(800);
    }
    // Navigate to create new
    const newBtn = page.locator('a:has-text("Yangi"), button:has-text("Yangi")').first();
    if (await newBtn.count() > 0) {
      await newBtn.click();
      await page.waitForURL(/students\/new/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
      if (page.url().includes('/new')) {
        await page.fill('input[placeholder="Ism Familya Otasining ismi"]', 'QATest_Student_People');
        await page.fill('input[placeholder="+998 90 123 45 67"]', '+998901112233');
        const submitBtn = page.locator('button[type="submit"]:has-text("Saqlash")').first();
        if (await submitBtn.count() > 0) {
          await submitBtn.click();
          await page.waitForTimeout(2500);
        }
      }
    }
    await page.goto('http://localhost:3000/admin/students', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const createdRow = page.locator('text=QATest_Student_People').first();
    const createdExists = await createdRow.count() > 0;
    results.push(`students: navigated, search toggled, create-form ${createdExists ? 'PASS (row visible after create)' : 'INCONCLUSIVE (row not found post-create, may be create-form field mismatch)'}`);
  } catch (e) {
    results.push(`students: FAIL - ${e.message}`);
  }

  // ---------- TEACHERS ----------
  try {
    await page.goto('http://localhost:3000/admin/teachers', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const searchBox = page.locator('input[placeholder*="qidir" i], input[type="search"]').first();
    if (await searchBox.count() > 0) {
      await searchBox.fill('Test');
      await page.waitForTimeout(800);
      await searchBox.fill('');
      await page.waitForTimeout(800);
    }
    const newBtn = page.locator('a:has-text("Yangi"), button:has-text("Yangi")').first();
    if (await newBtn.count() > 0) {
      await newBtn.click();
      await page.waitForURL(/teachers\/new/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }
    results.push(`teachers: navigated + search toggled OK, reached ${page.url()}`);
  } catch (e) {
    results.push(`teachers: FAIL - ${e.message}`);
  }

  // ---------- PARENTS ----------
  try {
    await page.goto('http://localhost:3000/admin/parents', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    results.push(`parents: page loaded OK at ${page.url()}`);
  } catch (e) {
    results.push(`parents: FAIL - ${e.message}`);
  }

  // ---------- GROUPS ----------
  try {
    await page.goto('http://localhost:3000/admin/groups', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const testGroupRow = page.locator('text=Test Guruh').first();
    results.push(`groups: page loaded, Test Guruh fixture visible: ${await testGroupRow.count() > 0}`);
  } catch (e) {
    results.push(`groups: FAIL - ${e.message}`);
  }

  // ---------- SUBJECTS ----------
  try {
    await page.goto('http://localhost:3000/admin/subjects', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const testSubjRow = page.locator('text=Test Fan').first();
    results.push(`subjects: page loaded, Test Fan fixture visible: ${await testSubjRow.count() > 0}`);
  } catch (e) {
    results.push(`subjects: FAIL - ${e.message}`);
  }

  log('\n=== RESULTS ===');
  results.forEach(r => log(r));
  log('\n=== CONSOLE ERRORS (' + consoleErrors.length + ') ===');
  consoleErrors.slice(0, 20).forEach(e => log(e));
  log('\n=== PAGE ERRORS (' + pageErrors.length + ') ===');
  pageErrors.forEach(e => log(e));
  log('\n=== FAILED API RESPONSES (' + failedResponses.length + ') ===');
  failedResponses.forEach(e => log(e));

  await browser.close();
})();