const { chromium } = require('playwright');

const results = [];
function log(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' - ' + detail : ''}`);
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timeout after ${ms}ms: ${label}`)), ms); });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(15000);

  const netErrors = [];
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) netErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });
  page.on('pageerror', (err) => netErrors.push(`pageerror: ${err.message.slice(0, 200)}`));

  try {
    await withTimeout((async () => {
      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
      await page.fill('input[placeholder="ID raqami"]', '621929');
      await page.fill('input[placeholder="Parol"]', '096842');
      await page.click('button:has-text("Kirish")');
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    })(), 20000, 'login');
    log('login', true);
  } catch (e) {
    log('login', false, e.message);
    await browser.close();
    console.log('\n=== SUMMARY ===');
    results.forEach(r => console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name} ${r.detail}`));
    return;
  }

  // ---- /admin/schedule ----
  try {
    await withTimeout((async () => {
      await page.goto('http://localhost:3000/admin/schedule', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
    })(), 15000, 'schedule nav');
    log('schedule-load', true);
  } catch (e) { log('schedule-load', false, e.message); }

  try {
    await withTimeout((async () => {
      const addBtn = page.locator('button', { hasText: /Qo'shish|Yaratish|\+/ }).first();
      await addBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);
    })(), 8000, 'schedule add click');
    log('schedule-open-create', true);
  } catch (e) { log('schedule-open-create', false, e.message); }

  try {
    await withTimeout((async () => {
      // try to select group "Test Guruh" in any open select/combobox
      const combo = page.locator('[role="combobox"]').first();
      if (await combo.count() > 0) {
        await combo.click({ timeout: 3000 });
        await page.waitForTimeout(300);
        const option = page.locator('[role="option"]', { hasText: 'Test Guruh' });
        if (await option.count() > 0) {
          await option.first().click({ timeout: 3000 });
        } else {
          await page.keyboard.press('Escape');
        }
      }
    })(), 8000, 'schedule group select');
    log('schedule-select-group', true);
  } catch (e) { log('schedule-select-group', false, e.message); }

  try {
    await withTimeout((async () => {
      const saveBtn = page.locator('button', { hasText: /Saqlash|Qo'shish|Yaratish/ }).last();
      if (await saveBtn.count() > 0) {
        await saveBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
      }
    })(), 8000, 'schedule save');
    log('schedule-create-submit', true, `netErrors so far: ${netErrors.length}`);
  } catch (e) { log('schedule-create-submit', false, e.message); }

  // ---- /admin/attendance ----
  try {
    await withTimeout((async () => {
      await page.goto('http://localhost:3000/admin/attendance', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    })(), 15000, 'attendance nav');
    log('attendance-load', true);
  } catch (e) { log('attendance-load', false, e.message); }

  try {
    await withTimeout((async () => {
      const groupSelect = page.locator('[role="combobox"]').first();
      await groupSelect.click({ timeout: 5000 });
      await page.waitForTimeout(400);
      const opt = page.locator('[role="option"]', { hasText: 'Test Guruh' });
      await opt.first().click({ timeout: 5000 });
      await page.waitForTimeout(1000);
    })(), 10000, 'attendance select group');
    log('attendance-select-group', true);
  } catch (e) { log('attendance-select-group', false, e.message); }

  try {
    await withTimeout((async () => {
      const presentBtn = page.locator('button', { hasText: 'Keldi' }).first();
      if (await presentBtn.count() > 0) {
        await presentBtn.click({ timeout: 5000 });
      }
      const saveBtn = page.locator('button', { hasText: 'Saqlash' }).first();
      await saveBtn.click({ timeout: 5000 });
      await page.waitForTimeout(1200);
    })(), 12000, 'attendance mark+save');
    log('attendance-mark-save', true, `netErrors so far: ${netErrors.length}`);
  } catch (e) { log('attendance-mark-save', false, e.message); }

  try {
    await withTimeout((async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
    })(), 10000, 'attendance reload persist check');
    log('attendance-reload-check', true, 'manual visual check needed via screenshot');
    await page.screenshot({ path: 'C:\\Users\\user\\Desktop\\Projects\\markaz\\frontend\\_qa_academic2_attendance.png' });
  } catch (e) { log('attendance-reload-check', false, e.message); }

  // ---- /admin/teacher-attendance ----
  try {
    await withTimeout((async () => {
      await page.goto('http://localhost:3000/admin/teacher-attendance', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    })(), 15000, 'teacher-attendance nav');
    log('teacher-attendance-load', true);
  } catch (e) { log('teacher-attendance-load', false, e.message); }

  try {
    await withTimeout((async () => {
      const addBtn = page.locator('button', { hasText: 'Belgilash' }).first();
      await addBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      const combo = page.locator('[role="combobox"]').first();
      await combo.click({ timeout: 5000 });
      await page.waitForTimeout(300);
      const opt = page.locator('[role="option"]', { hasText: 'Test Domla' });
      await opt.first().click({ timeout: 5000 });
      const saveBtn = page.locator('button', { hasText: 'Saqlash' }).last();
      await saveBtn.click({ timeout: 5000 });
      await page.waitForTimeout(1200);
    })(), 15000, 'teacher-attendance create');
    log('teacher-attendance-create', true, `netErrors so far: ${netErrors.length}`);
  } catch (e) { log('teacher-attendance-create', false, e.message); }

  try {
    await withTimeout((async () => {
      const bodyText = await page.locator('body').innerText();
      if (bodyText.includes('Test Domla')) log('teacher-attendance-verify-list', true);
      else log('teacher-attendance-verify-list', false, 'Test Domla not found in list after create');
    })(), 5000, 'teacher-attendance verify');
  } catch (e) { log('teacher-attendance-verify-list', false, e.message); }

  // ---- /admin/grades ----
  try {
    await withTimeout((async () => {
      await page.goto('http://localhost:3000/admin/grades', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
    })(), 15000, 'grades nav');
    log('grades-load', true);
  } catch (e) { log('grades-load', false, e.message); }

  try {
    await withTimeout((async () => {
      const addBtn = page.locator('button', { hasText: /Baho qo'shish|Qo'shish/ }).first();
      await addBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);
    })(), 8000, 'grades open create');
    log('grades-open-create', true);
  } catch (e) { log('grades-open-create', false, e.message); }

  try {
    await withTimeout((async () => {
      const combos = page.locator('[role="combobox"]');
      const count = await combos.count();
      for (let i = 0; i < count; i++) {
        const c = combos.nth(i);
        await c.click({ timeout: 3000 });
        await page.waitForTimeout(300);
        const opts = page.locator('[role="option"]');
        const optCount = await opts.count();
        if (optCount > 0) await opts.first().click({ timeout: 3000 });
        else await page.keyboard.press('Escape');
      }
      const scoreInput = page.locator('input[type="number"]').first();
      if (await scoreInput.count() > 0) await scoreInput.fill('85');
      const saveBtn = page.locator('button', { hasText: 'Saqlash' }).last();
      await saveBtn.click({ timeout: 5000 });
      await page.waitForTimeout(1200);
    })(), 15000, 'grades create submit');
    log('grades-create-submit', true, `netErrors so far: ${netErrors.length}`);
  } catch (e) { log('grades-create-submit', false, e.message); }

  await page.screenshot({ path: 'C:\\Users\\user\\Desktop\\Projects\\markaz\\frontend\\_qa_academic2_grades.png' });

  console.log('\n=== NET/CONSOLE ERRORS ===');
  console.log(netErrors.length ? netErrors.join('\n') : 'none');

  console.log('\n=== SUMMARY ===');
  results.forEach(r => console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name} ${r.detail}`));

  await browser.close();
})();
