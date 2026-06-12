const { createBrowser, login } = require('./session');

(async () => {
  const { browser, page } = await createBrowser();
  try {
    await login(page);
    console.log('Login successful. Browser will close in 5 seconds.');
    await page.waitForTimeout(5000);
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
