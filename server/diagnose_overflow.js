const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function diagnoseAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 667 });
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });

  // Log in
  await page.type('input[type="text"]', 'CSA001');
  await page.type('input[type="password"]', 'csa123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1000));

  async function checkPage(pageName) {
    const overflowElements = await page.evaluate(() => {
      const docWidth = window.innerWidth;
      const overflowing = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 1) {
          overflowing.push({
            tag: el.tagName,
            className: el.className,
            id: el.id,
            right: rect.right,
            width: rect.width,
            outerHTMLSnippet: el.outerHTML.slice(0, 100)
          });
        }
      }
      return overflowing;
    });

    console.log(`\n=== ${pageName}: Found ${overflowElements.length} overflowing elements on 375px ===`);
    overflowElements.slice(0, 6).forEach((item, idx) => {
      console.log(`  #${idx + 1}: <${item.tag} class="${item.className}" id="${item.id}">`);
      console.log(`    Width: ${item.width}px, Right edge: ${item.right}px`);
      console.log(`    Snippet: ${item.outerHTMLSnippet}`);
    });
  }

  // 1. Dashboard
  await checkPage('Dashboard');

  // 2. Open drawer -> Voice Booking
  await page.click('header button[aria-label="Open Navigation Menu"]');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const drawer = document.querySelector('aside[aria-label="Mobile Navigation Drawer"]');
    const btn = Array.from(drawer.querySelectorAll('button')).find(b => b.textContent.includes('Voice Booking'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await checkPage('AI Voice Booking');

  // 3. Open drawer -> Calendar
  await page.click('header button[aria-label="Open Navigation Menu"]');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const drawer = document.querySelector('aside[aria-label="Mobile Navigation Drawer"]');
    const btn = Array.from(drawer.querySelectorAll('button')).find(b => b.textContent.includes('Calendar'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await checkPage('Calendar');

  // 4. Open drawer -> Programme History -> Click Receipt
  await page.click('header button[aria-label="Open Navigation Menu"]');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const drawer = document.querySelector('aside[aria-label="Mobile Navigation Drawer"]');
    const btn = Array.from(drawer.querySelectorAll('button')).find(b => b.textContent.includes('Programme History'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await checkPage('Programme History');

  // Click receipt
  await page.evaluate(() => {
    const btn = document.querySelector('#programme-history-view button[title*="Receipt"], #programme-history-view button[title*="receipt"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await checkPage('Receipt Modal');

  await browser.close();
}

diagnoseAll();
