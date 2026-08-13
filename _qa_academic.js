const { chromium } = require('playwright');

const results = [];
const log = (page, msg) => results.push(`[${page}] ${msg}`);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const netErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('Download the React DevTools')) netErrors.push(`[console.error] ${msg.text().slice(0,200)}`); });
  page.on('pageerror', (err) => netErrors.push(`[pageerror] ${err.message.slice(0,200)}`));
  page.on('response', (res) => { if (res.url().includes('/api/') && res.status() >= 400) netErrors.push(`[http ${res.status()}] ${res.request().method()} ${res.url()}`); });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="ID raqami"]', '621929');
  await page.fill('input[placeholder="Parol"]', '096842');
  await page.click('button:has-text("Kirish")');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  const todayISO = new Date().toISOString().split('T')[0];

  // ===== SCHEDULE =====
  await page.goto('http://localhost:3000/admin/schedule', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const beforeErr = netErrors.length;
  await page.click('button:has-text("Dars qo\'shish")');
  await page.waitForTimeout(300);
  const comboboxes = page.locator('button[role="combobox"]');
  await comboboxes.nth(0).click();
  await page.waitForTimeout(200);
  const testGuruhOption = page.locator('[role="option"]', { hasText: 'Test Guruh' });
  if (await testGuruhOption.count() > 0) {
    await testGuruhOption.first().click();
  } else {
    log('schedule', 'FAIL: "Test Guruh" not found in group select options');
  }
  await page.click('button:has-text("Qo\'shish")');
  await page.waitForTimeout(1200);
  const scheduleCreated = await page.locator('text=Test Guruh').count();
  log('schedule', scheduleCreated > 0 ? 'PASS: create schedule entry for Test Guruh' : 'FAIL: created entry not visible in list');
  // find delete button in the row containing Test Guruh under "Barcha darslar ro'yxati" and click it
  const scheduleRow = page.locator('div.flex.items-center.gap-4', { hasText: 'Test Guruh' }).first();
  if (await scheduleRow.count() > 0) {
    page.once('dialog', (d) => d.accept());
    await scheduleRow.locator('button').last().click();
    await page.waitForTimeout(1000);
    const afterDelete = await page.locator('text=Test Guruh').count();
    log('schedule', afterDelete === 0 ? 'PASS: delete schedule entry works' : 'WARN: entry still visible after delete (may be duplicate rows)');
  } else {
    log('schedule', 'FAIL: could not locate created row to delete');
  }
  if (netErrors.length > beforeErr) log('schedule', 'ERRORS: ' + netErrors.slice(beforeErr).join(' | '));

  // ===== ATTENDANCE =====
  await page.goto('http://localhost:3000/admin/attendance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const attErrBefore = netErrors.length;
  await page.click('button[role="combobox"]');
  await page.waitForTimeout(200);
  const attGroupOpt = page.locator('[role="option"]', { hasText: 'Test Guruh' });
  if (await attGroupOpt.count() > 0) {
    await attGroupOpt.first().click();
    await page.waitForTimeout(1000);
    await page.fill('input[type="date"]', todayISO);
    await page.waitForTimeout(1000);
    const absentBtn = page.locator('button:has-text("Kelmadi")').first();
    if (await absentBtn.count() > 0) {
      await absentBtn.click();
      await page.click('button:has-text("Saqlash")');
      await page.waitForTimeout(1200);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      // reselect group + date after reload (state resets)
      await page.click('button[role="combobox"]');
      await page.waitForTimeout(200);
      await page.locator('[role="option"]', { hasText: 'Test Guruh' }).first().click();
      await page.fill('input[type="date"]', todayISO);
      await page.waitForTimeout(1000);
      const stillAbsent = await page.locator('button.bg-red-500:has-text("Kelmadi")').count();
      log('attendance', stillAbsent > 0 ? 'PASS: mark + persist attendance works (reload confirms)' : 'FAIL: attendance status did not persist after reload');
    } else {
      log('attendance', 'FAIL: no students found in Test Guruh to mark attendance, or "Kelmadi" button missing');
    }
  } else {
    log('attendance', 'FAIL: "Test Guruh" not found in group filter');
  }
  if (netErrors.length > attErrBefore) log('attendance', 'ERRORS: ' + netErrors.slice(attErrBefore).join(' | '));

  // ===== TEACHER ATTENDANCE =====
  await page.goto('http://localhost:3000/admin/teacher-attendance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const taErrBefore = netErrors.length;
  await page.fill('input[type="date"]', todayISO);
  await page.waitForTimeout(500);
  await page.click('button:has-text("Belgilash")');
  await page.waitForTimeout(300);
  await page.click('button[role="combobox"]');
  await page.waitForTimeout(200);
  const teacherOpt = page.locator('[role="option"]', { hasText: 'Test Domla' });
  if (await teacherOpt.count() > 0) {
    await teacherOpt.first().click();
    await page.click('button:has-text("Saqlash")');
    await page.waitForTimeout(1200);
    const taRow = await page.locator('text=Test Domla').count();
    log('teacher-attendance', taRow > 0 ? 'PASS: mark teacher attendance works' : 'FAIL: Test Domla not visible after marking');
    const taRowEl = page.locator('div.flex.items-center.gap-4', { hasText: 'Test Domla' }).first();
    if (await taRowEl.count() > 0) {
      await taRowEl.locator('button').last().click();
      await page.waitForTimeout(1000);
      const afterDel = await page.locator('text=Test Domla').count();
      log('teacher-attendance', afterDel === 0 ? 'PASS: delete works' : 'WARN: still visible after delete');
    }
  } else {
    log('teacher-attendance', 'FAIL: "Test Domla" not found in teacher select');
  }
  if (netErrors.length > taErrBefore) log('teacher-attendance', 'ERRORS: ' + netErrors.slice(taErrBefore).join(' | '));

  // ===== GRADES =====
  await page.goto('http://localhost:3000/admin/grades', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const gErrBefore = netErrors.length;
  await page.click('button:has-text("Baho qo\'shish")').catch(() => {});
  await page.waitForTimeout(300);
  // If group must be selected first (page filter), try filter combobox before modal
  let opened = await page.locator('text=Yangi baho').count();
  if (!opened) {
    // maybe need to select a group filter first
    const groupSelects = page.locator('button[role="combobox"]');
    if (await groupSelects.count() > 0) {
      await groupSelects.first().click();
      await page.waitForTimeout(200);
      const gOpt = page.locator('[role="option"]', { hasText: 'Test Guruh' });
      if (await gOpt.count() > 0) await gOpt.first().click();
      await page.waitForTimeout(500);
      await page.click('button:has-text("Baho qo\'shish")');
      await page.waitForTimeout(300);
    }
  }
  const modalVisible = await page.locator('text=Yangi baho').count();
  if (modalVisible > 0) {
    const selects = page.locator('[role="dialog"] button[role="combobox"], .fixed button[role="combobox"]');
    const studentSelect = page.locator('button[role="combobox"]').first();
    await studentSelect.click();
    await page.waitForTimeout(200);
    const studentOpt = page.locator('[role="option"]', { hasText: 'Test Talaba2' });
    if (await studentOpt.count() > 0) {
      await studentOpt.first().click();
      const scoreInput = page.locator('input[placeholder="85"]');
      await scoreInput.fill('92');
      await page.click('button:has-text("Saqlash")');
      await page.waitForTimeout(1200);
      const gradeVisible = await page.locator('text=Test Talaba2').count();
      log('grades', gradeVisible > 0 ? 'PASS: create grade for Test Talaba2 works, name shown' : 'FAIL: grade not visible in list after create');
    } else {
      log('grades', 'FAIL: "Test Talaba2" not found in student select (group filter may not include this student)');
    }
  } else {
    log('grades', 'FAIL: could not open "Yangi baho" create modal');
  }
  if (netErrors.length > gErrBefore) log('grades', 'ERRORS: ' + netErrors.slice(gErrBefore).join(' | '));

  console.log(results.join('\n'));
  await browser.close();
})();
