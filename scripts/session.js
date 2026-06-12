require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { chromium } = require('playwright');

const TRIPIT_BASE = 'https://www.tripit.com';
const TRIPIT_LOGIN = `${TRIPIT_BASE}/account/signin`;
const SCREENSHOTS_DIR = require('path').join(__dirname, '../screenshots');

async function createBrowser() {
  const headed = process.env.PLAYWRIGHT_HEADED === 'true';
  const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 50 : 0 });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  return { browser, context, page };
}

async function login(page) {
  const email = process.env.TRIPIT_EMAIL;
  const password = process.env.TRIPIT_PASSWORD;

  if (!email || !password) {
    throw new Error('TRIPIT_EMAIL and TRIPIT_PASSWORD must be set in .env');
  }

  console.log('Navigating to TripIt login…');
  await page.goto(TRIPIT_LOGIN, { waitUntil: 'networkidle' });

  // Accept cookie banner if present
  const cookieBtn = page.locator('button:has-text("Accept"), button:has-text("OK")').first();
  if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cookieBtn.click();
  }

  console.log('Filling credentials…');
  await page.fill('input[name="user_email"], input[type="email"]', email);
  await page.fill('input[name="pw"], input[type="password"]', password);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-login-form.png` });

  console.log('Submitting…');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);

  // Confirm we landed on a logged-in page
  const currentUrl = page.url();
  if (currentUrl.includes('/account/signin')) {
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-login-error.png` });
    throw new Error('Login failed — still on signin page. Check credentials.');
  }

  console.log(`Logged in. Current URL: ${currentUrl}`);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-post-login.png` });
  return page;
}

module.exports = { createBrowser, login, TRIPIT_BASE };
