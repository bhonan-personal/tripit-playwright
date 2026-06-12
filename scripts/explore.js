const { createBrowser, login, TRIPIT_BASE } = require('./session');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');

async function navigate(page, label, url) {
  console.log(`\n→ ${label}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Wait for the SPA to finish rendering (spinner disappears or 6s max)
  await page.waitForFunction(
    () => !document.querySelector('.loading-spinner, [class*="spinner"], [class*="loading"]'),
    { timeout: 6000 }
  ).catch(() => {});
  await page.waitForTimeout(2000);
  const file = path.join(SCREENSHOTS_DIR, `${label.replace(/\s+/g, '-').toLowerCase()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  Screenshot saved: ${path.basename(file)}`);
}

(async () => {
  const { browser, page } = await createBrowser();
  try {
    await login(page);

    // Navigate key sections of TripIt
    await navigate(page, 'trips-list',        `${TRIPIT_BASE}/trips`);
    await navigate(page, 'upcoming-trips',    `${TRIPIT_BASE}/trips#upcoming`);
    await navigate(page, 'past-trips',        `${TRIPIT_BASE}/trips#past`);
    await navigate(page, 'profile',           `${TRIPIT_BASE}/user/profile`);
    await navigate(page, 'points-pro',        `${TRIPIT_BASE}/pro`);

    // Print a summary of all trips found on the trips page
    await page.goto(`${TRIPIT_BASE}/trips`, { waitUntil: 'domcontentloaded' });
    const tripTitles = await page.$$eval(
      '[data-test="trip-name"], .trip-name, h2.trip-title, a.trip-link',
      els => els.map(el => el.textContent.trim()).filter(Boolean)
    );
    if (tripTitles.length) {
      console.log('\nTrips found:');
      tripTitles.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    } else {
      console.log('\nNo trip titles matched known selectors — page structure may differ. Check screenshots/trips-list.png.');
    }

    console.log('\nExploration complete. Screenshots saved to ./screenshots/');
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
