import { chromium } from 'playwright';
const BASE = 'https://invoice.bizzautoai.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  // Register a new user
  const email = `dbg${Date.now()}@example.com`;
  const pass = 'DebugPass123!';
  await page.goto(`${BASE}/auth/register`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.fill('input[placeholder="Your name"]', 'Debug User');
  await page.fill('input[placeholder="you@example.com"]', email);
  await page.fill('input[placeholder="At least 8 characters"]', pass);

  // Capture network responses
  page.on('response', (res) => {
    if (res.url().includes('/api/')) {
      console.log(`[RESP] ${res.status()} ${res.url().split('/').pop()}`);
    }
  });
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('[CONSOLE ERROR]', msg.text().slice(0, 100)); });

  await page.click('button:has-text("Create account")');
  await page.waitForTimeout(6000);
  console.log('Register URL after submit:', page.url());
  const body = await page.textContent('body').catch(() => '');
  const errMatch = body.match(/(Registration failed[^<]*|error[^<]{0,60})/i);
  console.log('Body error snippet:', errMatch?.[0] || 'none found');
  console.log('Full body (first 500):', body.replace(/\s+/g, ' ').slice(0, 500));

  await browser.close();
})();
