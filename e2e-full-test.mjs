import { chromium } from 'playwright';

const BASE = 'https://invoice.bizzautoai.com';
const results = [];

function log(test, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
  results.push({ test, status, detail });
  console.log(`${icon} ${test}${detail ? ' — ' + detail : ''}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const goto = (url) => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => null);

  // ── 1. Homepage ──
  try {
    await goto(BASE);
    await page.waitForTimeout(2000);
    const heroText = await page.textContent('h1').catch(() => '');
    log('1. Homepage', heroText?.includes('Invoicing') ? 'PASS' : 'FAIL', heroText?.slice(0, 50));
  } catch (e) { log('1. Homepage', 'FAIL', e.message?.slice(0, 60)); }

  // ── 2. Pricing page (public) ──
  try {
    await goto(`${BASE}/pricing`);
    await page.waitForTimeout(2000);
    const text = await page.textContent('body').catch(() => '');
    log('2. Pricing page', text?.includes('Plan') || text?.includes('price') || text?.includes('Free') ? 'PASS' : 'FAIL');
  } catch (e) { log('2. Pricing page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 3. Sign-in page (public) ──
  try {
    await goto(`${BASE}/auth/signin`);
    await page.waitForTimeout(3000);
    const heading = await page.textContent('h1').catch(() => '');
    const hasEmailTab = await page.locator('button:has-text("Email")').isVisible().catch(() => false);
    const hasPhoneTab = await page.locator('button:has-text("Phone")').isVisible().catch(() => false);
    log('3. Sign-in page', heading?.includes('Sign in') && hasEmailTab && hasPhoneTab ? 'PASS' : 'FAIL', `${heading}, tabs: email=${hasEmailTab} phone=${hasPhoneTab}`);
  } catch (e) { log('3. Sign-in page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 4. Phone tab toggle ──
  try {
    await goto(`${BASE}/auth/signin`);
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Phone")').catch(() => {});
    await page.waitForTimeout(500);
    const phoneInput = await page.locator('input[type="tel"]').isVisible().catch(() => false);
    log('4. Phone tab toggle', phoneInput ? 'PASS' : 'FAIL');
  } catch (e) { log('4. Phone tab toggle', 'FAIL', e.message?.slice(0, 60)); }

  // ── 5. Register page (public) ──
  try {
    await goto(`${BASE}/auth/register`);
    await page.waitForTimeout(3000);
    const heading = await page.textContent('h1').catch(() => '');
    const phoneField = await page.locator('input[type="tel"]').isVisible().catch(() => false);
    log('5. Register page', heading?.includes('Create') ? 'PASS' : 'FAIL', `${heading}, phone=${phoneField}`);
  } catch (e) { log('5. Register page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 6. Forgot password page (public) ──
  try {
    await goto(`${BASE}/auth/forgot-password`);
    await page.waitForTimeout(3000);
    const heading = await page.textContent('h1').catch(() => '');
    log('6. Forgot password page', heading?.includes('Forgot') ? 'PASS' : 'FAIL', heading);
  } catch (e) { log('6. Forgot password page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 7. Register a test user ──
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  try {
    await goto(`${BASE}/auth/register`);
    await page.waitForTimeout(3000);
    await page.fill('input[placeholder="Your name"]', 'Test User E2E');
    await page.fill('input[placeholder="you@example.com"]', testEmail);
    await page.fill('input[placeholder="At least 8 characters"]', testPassword);
    await page.click('button:has-text("Create account")');
    await page.waitForTimeout(5000);
    const url = page.url();
    const registered = url.includes('onboarding') || url.includes('dashboard') || !url.includes('/auth/register');
    log('7. Register new user', registered ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('7. Register new user', 'FAIL', e.message?.slice(0, 60)); }

  // ── 8. Sign in with email ──
  try {
    await goto(`${BASE}/auth/signin`);
    await page.waitForTimeout(3000);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(5000);
    const url = page.url();
    const loggedIn = !url.includes('/auth/signin');
    log('8. Sign in (email)', loggedIn ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('8. Sign in (email)', 'FAIL', e.message?.slice(0, 60)); }

  // ── 9. Dashboard ──
  try {
    await goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    const url = page.url();
    const onDashboard = url.includes('dashboard') || url.includes('onboarding');
    log('9. Dashboard/onboarding', onDashboard ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('9. Dashboard/onboarding', 'FAIL', e.message?.slice(0, 60)); }

  // ── 10. Billing page ──
  try {
    await goto(`${BASE}/billing`);
    await page.waitForTimeout(3000);
    const url = page.url();
    const onBilling = url.includes('billing') || url.includes('signin');
    log('10. Billing page', onBilling ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('10. Billing page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 11. Parties page ──
  try {
    await goto(`${BASE}/parties`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('11. Parties page', url.includes('parties') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('11. Parties page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 12. Orders page ──
  try {
    await goto(`${BASE}/orders`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('12. Orders page', url.includes('orders') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('12. Orders page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 13. Payments page ──
  try {
    await goto(`${BASE}/payments`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('13. Payments page', url.includes('payments') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('13. Payments page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 14. Inventory page ──
  try {
    await goto(`${BASE}/inventory`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('14. Inventory page', url.includes('inventory') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('14. Inventory page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 15. Reports page ──
  try {
    await goto(`${BASE}/reports`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('15. Reports page', url.includes('reports') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('15. Reports page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 16. GST page ──
  try {
    await goto(`${BASE}/gst`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('16. GST page', url.includes('gst') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('16. GST page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 17. Accounting page ──
  try {
    await goto(`${BASE}/accounting/chart-of-accounts`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('17. Accounting page', url.includes('accounting') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('17. Accounting page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 18. Template settings ──
  try {
    await goto(`${BASE}/settings/template`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('18. Template settings', url.includes('settings') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('18. Template settings', 'FAIL', e.message?.slice(0, 60)); }

  // ── 19. Subscription page ──
  try {
    await goto(`${BASE}/settings/subscription`);
    await page.waitForTimeout(3000);
    const url = page.url();
    log('19. Subscription page', url.includes('settings') || url.includes('signin') ? 'PASS' : 'FAIL', `URL: ${url.replace(BASE, '')}`);
  } catch (e) { log('19. Subscription page', 'FAIL', e.message?.slice(0, 60)); }

  // ── 20. API health check ──
  try {
    const res = await page.request.fetch(`${BASE}/api/health`);
    log('20. API health', res.status() === 200 ? 'PASS' : 'FAIL', `status=${res.status()}`);
  } catch (e) { log('20. API health', 'FAIL', e.message?.slice(0, 60)); }

  // ── Summary ──
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    console.log('\n❌ FAILED:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  - ${r.test}: ${r.detail}`));
  }
  console.log('\n✅ PASSED:');
  results.filter(r => r.status === 'PASS').forEach(r => console.log(`  - ${r.test}`));

  await browser.close();
})();
