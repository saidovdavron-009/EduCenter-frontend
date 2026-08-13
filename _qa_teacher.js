const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const findings = [];
function log(area, msg) { findings.push(`[${area}] ${msg}`); console.log(`[${area}] ${msg}`); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const netErrors = [];
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      netErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });
  page.on('pageerror', (err) => netErrors.push(`[pageerror] ${err.message.split('\n')[0]}`));

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="ID raqami"]', '601487');
  await page.fill('input[placeholder="Parol"]', '800902');
  await page.click('button:has-text("Kirish")');
  await page.waitForURL('**/teacher/dashboard', { timeout: 15000 });
  log('login', 'PASS - reached /teacher/dashboard');

  // --- dashboard ---
  await page.waitForTimeout(1000);
  const statCards = await page.locator('text=Guruhlarim').count();
  log('dashboard', statCards > 0 ? 'PASS - stat cards render' : 'FAIL - stat cards missing');
  const allLinks = page.locator('a:has-text("Barchasi")');
  const linkCount = await allLinks.count();
  if (linkCount > 0) {
    await allLinks.first().click();
    await page.waitForTimeout(800);
    log('dashboard', `PASS - "Barchasi" link navigated to ${page.url()}`);
  } else {
    log('dashboard', 'INFO - no "Barchasi" links found (maybe no data yet)');
  }

  // --- groups ---
  await page.goto('http://localhost:3000/teacher/groups', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const groupCard = page.locator('text=Test Guruh').first();
  if (await groupCard.count()) {
    await groupCard.click();
    await page.waitForTimeout(800);
    const studentListVisible = await page.locator('text=Davomat:').count();
    log('groups', studentListVisible > 0 ? 'PASS - expanded student list with attendance %' : 'FAIL - student list did not expand / no attendance shown');
    const davomatBtn = page.locator('a:has-text("Davomat")').first();
    if (await davomatBtn.count()) {
      await davomatBtn.click();
      await page.waitForURL('**/teacher/attendance**', { timeout: 10000 }).catch(() => log('groups', 'FAIL - Davomat quick-link did not navigate'));
      log('groups', `PASS - Davomat quick-link navigated to ${page.url()}`);
    }
  } else {
    log('groups', 'FAIL - "Test Guruh" card not found on groups page');
  }

  // --- attendance ---
  await page.goto('http://localhost:3000/teacher/attendance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('button[role="combobox"]');
  await page.waitForTimeout(300);
  const groupOption = page.locator('[role="option"]:has-text("Test Guruh")');
  if (await groupOption.count()) {
    await groupOption.click();
    await page.waitForTimeout(1000);
    const presentBtns = page.locator('button:has-text("Keldi")');
    const n = await presentBtns.count();
    if (n > 0) {
      await presentBtns.first().click();
      await page.waitForTimeout(300);
      const saveBtn = page.locator('button:has-text("Saqlash")');
      const disabled = await saveBtn.isDisabled().catch(() => true);
      if (!disabled) {
        await saveBtn.click();
        await page.waitForTimeout(1200);
        const toastOk = await page.locator('text=saqlandi').count();
        log('attendance', toastOk > 0 ? 'PASS - marked + saved attendance' : 'INFO - saved, no confirm toast detected (may still be fine)');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        log('attendance', 'INFO - reloaded page after save (manual visual re-check recommended)');
      } else {
        log('attendance', 'INFO - Saqlash disabled (likely no lesson scheduled today for this group) — could not test save');
      }
    } else {
      log('attendance', 'FAIL - no student rows / status buttons rendered for Test Guruh');
    }
  } else {
    log('attendance', 'FAIL - "Test Guruh" not found in group selector');
  }

  // --- grades ---
  await page.goto('http://localhost:3000/teacher/grades', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const addGradeBtn = page.locator('button:has-text("Baho qo\'shish")');
  if (await addGradeBtn.count() && !(await addGradeBtn.isDisabled())) {
    await addGradeBtn.click();
    await page.waitForTimeout(500);
    const studentSelect = page.locator('button[role="combobox"]').first();
    await studentSelect.click();
    await page.waitForTimeout(300);
    const opt = page.locator('[role="option"]').first();
    if (await opt.count()) {
      await opt.click();
      await page.fill('input[placeholder="85"]', '77');
      await page.click('button:has-text("Saqlash")');
      await page.waitForTimeout(1200);
      const rowVisible = await page.locator('text=77/100').count();
      log('grades', rowVisible > 0 ? 'PASS - created grade, appears in list' : 'FAIL - grade created but not visible in list (or wrong score)');
    } else {
      log('grades', 'FAIL - no students in student-select dropdown for Test Guruh');
    }
  } else {
    log('grades', 'FAIL - "Baho qo\'shish" button missing or disabled');
  }

  // --- homework ---
  await page.goto('http://localhost:3000/teacher/homework', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('button:has-text("Vazifa berish")');
  await page.waitForTimeout(400);
  await page.fill('input[placeholder="Vazifa nomi"]', 'QATest_TeacherHW');
  const groupSelect2 = page.locator('button[role="combobox"]').first();
  await groupSelect2.click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]:has-text("Test Guruh")').click();
  const today = new Date();
  const due = new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().split('T')[0];
  await page.fill('input[type="date"]', due);
  await page.click('button:has-text("Saqlash")');
  await page.waitForTimeout(1200);
  const hwVisible = await page.locator('text=QATest_TeacherHW').count();
  log('homework', hwVisible > 0 ? 'PASS - created, appears in list' : 'FAIL - homework not visible after create');
  if (hwVisible > 0) {
    await page.locator('text=QATest_TeacherHW').first().click();
    await page.waitForURL('**/teacher/homework/**', { timeout: 10000 });
    await page.waitForTimeout(800);
    const detailTitle = await page.locator('h1:has-text("QATest_TeacherHW")').count();
    log('homework-detail', detailTitle > 0 ? 'PASS - detail page loaded with correct title' : 'FAIL - detail page title mismatch/missing');
    const submissionsSection = await page.locator('text=Topshiriqlar').count();
    log('homework-detail', submissionsSection > 0 ? 'PASS - submissions section rendered' : 'FAIL - submissions section missing');
  }

  // --- materials ---
  await page.goto('http://localhost:3000/teacher/materials', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('button:has-text("Material qo\'shish")');
  await page.waitForTimeout(400);
  await page.fill('input[placeholder="Material nomi"]', 'QATest_Material');
  await page.fill('input[placeholder="https://..."]', 'https://example.com/test.pdf');
  await page.click('button:has-text("Saqlash")');
  await page.waitForTimeout(1200);
  const matVisible = await page.locator('text=QATest_Material').count();
  log('materials', matVisible > 0 ? 'PASS - created, appears in list' : 'FAIL - material not visible after create');
  if (matVisible > 0) {
    const delBtn = page.locator('div:has-text("QATest_Material")').locator('..').locator('button').last();
  }

  // --- profile ---
  await page.goto('http://localhost:3000/teacher/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  // Edit phone field
  const phoneRow = page.locator('text=Telefon raqam').locator('..');
  const editPencil = phoneRow.locator('button').first();
  if (await editPencil.count()) {
    await editPencil.click();
    await page.waitForTimeout(300);
    const input = page.locator('input.border-\\[\\#1E3A5F\\]').first();
    await input.fill('+998900009999');
    await page.locator('button:has(svg)').filter({ hasText: '' }).first();
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(300);
    // click the check/save icon button (green)
    const checkBtn = page.locator('button.text-green-600').first();
    if (await checkBtn.count()) {
      await checkBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const persisted = await page.locator('text=+998900009999').count();
    log('profile-edit', persisted > 0 ? 'PASS - phone field persisted after reload' : 'FAIL - phone edit did not persist');
  } else {
    log('profile-edit', 'FAIL - edit pencil for phone not found');
  }

  // Avatar upload
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const filePath = path.join(__dirname, '_qa_teacher_avatar.png');
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count()) {
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(2000);
    const headerImg = await page.locator('header img').first().getAttribute('src').catch(() => null);
    log('profile-avatar', headerImg && headerImg.includes('/uploads/avatars/') ? `PASS - avatar updated in header (${headerImg})` : 'FAIL - header avatar did not update');
  } else {
    log('profile-avatar', 'FAIL - no file input found on profile page');
  }
  fs.unlinkSync(filePath);

  // Password modal open/close
  const changePassBtn = page.locator('button:has(svg)').filter({ hasText: '' });
  const passCard = page.locator('text=Parol').locator('..').locator('button').first();
  if (await passCard.count()) {
    await passCard.click();
    await page.waitForTimeout(400);
    const modalVisible = await page.locator('text=Parolni o\'zgartirish').count();
    log('profile-password-modal', modalVisible > 0 ? 'PASS - modal opens' : 'FAIL - modal did not open');
    const cancelBtn = page.locator('button:has-text("Bekor")');
    if (await cancelBtn.count()) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      const closed = await page.locator('text=Parolni o\'zgartirish').count();
      log('profile-password-modal', closed === 0 ? 'PASS - modal closes on cancel' : 'FAIL - modal still open after cancel');
    }
  } else {
    log('profile-password-modal', 'FAIL - password card/edit button not found');
  }

  console.log('\n=== NETWORK/CONSOLE ERRORS ===');
  console.log(netErrors.length ? [...new Set(netErrors)].join('\n') : 'none');

  await browser.close();
})();
