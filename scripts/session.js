require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// playwright-extra + stealth patches 12+ fingerprinting vectors that Akamai uses
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const TRIPIT_BASE = 'https://www.tripit.com';
const TRIPIT_LOGIN = `${TRIPIT_BASE}/account/login?redirect_url=https%3A%2F%2Fwww.tripit.com%2Fapp%2F404`;
const SCREENSHOTS_DIR = require('path').join(__dirname, '../screenshots');

async function createBrowser() {
  const headed = process.env.PLAYWRIGHT_HEADED === 'true';
  const browser = await chromium.launch({
    headless: !headed,
    slowMo: headed ? 80 : 0,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
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
  await page.goto(TRIPIT_LOGIN, { waitUntil: 'domcontentloaded' });

  // Accept TrustArc cookie banner via JS click (renders in overflow-hidden container)
  const hasCookieBanner = await page.waitForFunction(
    () => !!document.querySelector('button[type="submit"]'),
    { timeout: 6000 }
  ).then(() => true).catch(() => false);

  if (hasCookieBanner) {
    await page.evaluate(() => document.querySelector('button[type="submit"]').click());
    console.log('Cookie banner dismissed — waiting for redirects to settle…');
    await page.waitForLoadState('domcontentloaded', { timeout: 40000 });
    await page.waitForTimeout(3000);
    console.log('Landed on:', page.url());
  }

  console.log('Filling credentials…');
  const emailField = page.locator('input[type="email"]').first();
  const passField  = page.locator('input[type="password"]').first();
  await emailField.waitFor({ state: 'visible', timeout: 15000 });
  await emailField.click();
  await page.keyboard.type(email,    { delay: 80 });
  await passField.click();
  await page.keyboard.type(password, { delay: 80 });

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-login-form.png` });

  console.log('Submitting…');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
    page.click('input[type="submit"], button[type="submit"]'),
  ]);

  const currentUrl = page.url();
  if (currentUrl.includes('/account/login') || currentUrl.includes('/account/signin')) {
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-login-error.png` });
    throw new Error('Login failed — still on login page. Check credentials or Akamai block.');
  }

  console.log(`Logged in. Current URL: ${currentUrl}`);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-post-login.png` });
  return page;
}

module.exports = { createBrowser, login, TRIPIT_BASE };
