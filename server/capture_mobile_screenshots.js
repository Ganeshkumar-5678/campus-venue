const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\ELCOT\\.gemini\\antigravity\\brain\\5616c6d5-5ee4-48d7-b993-d121e53275eb';

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 }); // iPhone X/12/13/14 portrait

  // 1. Login View
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_login_375px.png'), fullPage: false });
  console.log('Captured mobile_login_375px.png');

  // Log in
  await page.type('input[type="text"]', 'CSA001');
  await page.type('input[type="password"]', 'csa123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h2', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 800));

  // 2. Dashboard
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_dashboard_375px.png'), fullPage: false });
  console.log('Captured mobile_dashboard_375px.png');

  // 3. Mobile Navigation Drawer Open
  await page.click('header button[aria-label="Open Navigation Menu"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_drawer_open_375px.png'), fullPage: false });
  console.log('Captured mobile_drawer_open_375px.png');

  // 4. Programme History Cards
  await page.evaluate(() => {
    const drawer = document.querySelector('aside[aria-label="Mobile Navigation Drawer"]');
    const btn = Array.from(drawer.querySelectorAll('button')).find(b => b.textContent.includes('Programme History'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_programme_history_375px.png'), fullPage: false });
  console.log('Captured mobile_programme_history_375px.png');

  // 5. Booking Receipt Modal
  await page.evaluate(() => {
    const btn = document.querySelector('#programme-history-view button[title*="Receipt"], #programme-history-view button[title*="receipt"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_receipt_modal_375px.png'), fullPage: false });
  console.log('Captured mobile_receipt_modal_375px.png');

  // Close receipt modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('#booking-receipt-modal button[aria-label="Close modal"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // 6. AI Voice Booking View
  await page.click('header button[aria-label="Open Navigation Menu"]');
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const drawer = document.querySelector('aside[aria-label="Mobile Navigation Drawer"]');
    const btn = Array.from(drawer.querySelectorAll('button')).find(b => b.textContent.includes('Voice Booking'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_voice_booking_375px.png'), fullPage: false });
  console.log('Captured mobile_voice_booking_375px.png');

  // 7. Calendar View
  await page.click('header button[aria-label="Open Navigation Menu"]');
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const drawer = document.querySelector('aside[aria-label="Mobile Navigation Drawer"]');
    const btn = Array.from(drawer.querySelectorAll('button')).find(b => b.textContent.includes('Calendar'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_calendar_375px.png'), fullPage: false });
  console.log('Captured mobile_calendar_375px.png');

  await browser.close();
  console.log('All mobile screenshots captured successfully!');
}

captureScreenshots();
