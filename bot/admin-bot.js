const { chromium } = require('playwright-core');

const BASE_URL = 'http://127.0.0.1:3000';
const ADMIN_EMAIL = 'sarah.chen@caseflow.io';
const ADMIN_PASSWORD = 'Caseflow_Admin1!';
const POLL_INTERVAL = 30000; // 30s
const CYCLE_TIMEOUT = 60000; // 1min

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('[bot] Starting admin bot...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  // localhost without subdomain defaults to acmecorp tenant in middleware
  const context = await browser.newContext();

  const page = await context.newPage();

  // Login
  console.log('[bot] Logging in as admin...');
  await page.goto(`${BASE_URL}/agent/login`);
  await page.fill('input[name="email"], input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"], input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/agent/dashboard', { timeout: 15000 });
  console.log('[bot] Logged in successfully.');

  // Main loop
  while (true) {
    try {
      await processNextTicket(page, context);
    } catch (err) {
      console.error('[bot] Cycle error:', err.message);
    }
    await sleep(POLL_INTERVAL);
  }
}

async function processNextTicket(page, context) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CYCLE_TIMEOUT);

  try {
    // Navigate to dashboard
    console.log('[bot] Checking for unsummarized tickets...');
    await page.goto(`${BASE_URL}/agent/dashboard`, { timeout: 15000 });
    await page.waitForSelector('.ticket-table', { timeout: 10000 });

    // Wait a moment for the ticket list to fully load
    await sleep(2000);

    // Use the page context to fetch the ticket list API
    const csrfToken = await page.evaluate(() => {
      const match = document.cookie.match(/(?:^|;\s*)caseflow-csrf=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    });

    const ticketsResponse = await page.evaluate(async (csrf) => {
      const res = await fetch('/api/agent/tickets', {
        headers: { 'X-Caseflow-Csrf-Token': csrf },
      });
      return res.json();
    }, csrfToken);

    if (!ticketsResponse.tickets || ticketsResponse.tickets.length === 0) {
      console.log('[bot] No tickets found.');
      return;
    }

    // Find newest ticket without "summarized" tag
    const unsummarized = ticketsResponse.tickets.filter(t => {
      const tags = typeof t.tags === 'string' ? JSON.parse(t.tags) : (t.tags || []);
      return !tags.includes('summarized');
    });

    if (unsummarized.length === 0) {
      console.log('[bot] No unsummarized tickets.');
      return;
    }

    // Pick the newest (first in list since sorted by updated_at DESC)
    const ticket = unsummarized[0];
    console.log(`[bot] Processing ticket #${ticket.id}: "${ticket.subject}"`);

    // Navigate to ticket detail
    await page.goto(`${BASE_URL}/agent/tickets/${ticket.id}`, { timeout: 15000 });
    await page.waitForSelector('.ticket-detail-shell', { timeout: 10000 });
    await sleep(1000);

    // Switch to "Internal comment" tab
    const internalTab = await page.waitForSelector('.editor-tab--internal, button:has-text("Internal comment")', { timeout: 5000 });
    await internalTab.click();
    await sleep(500);

    // Click AI dropdown button
    const aiBtn = await page.waitForSelector('.ai-btn', { timeout: 5000 });
    await aiBtn.click();
    await sleep(300);

    // Click "Summarize last message" in dropdown
    const summarizeItem = await page.waitForSelector('.ai-menu-item', { timeout: 3000 });
    await summarizeItem.click();

    // Wait for AI to finish (loading state ends)
    console.log('[bot] Waiting for AI summary...');
    await page.waitForFunction(() => {
      const btn = document.querySelector('.ai-btn');
      return btn && !btn.classList.contains('ai-btn--loading');
    }, { timeout: 45000 });
    await sleep(1000);

    // Check if editor has content (AI inserted summary)
    const hasContent = await page.evaluate(() => {
      const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
      if (!editor) return false;
      const text = editor.textContent || '';
      return text.trim().length > 0;
    });

    if (!hasContent) {
      console.log('[bot] AI did not produce content, skipping.');
      return;
    }

    // Wait 5s before sending (gives XSS payload time to execute)
    await sleep(5000);

    // Click send button (internal comment)
    const sendBtn = await page.waitForSelector('.btn-internal, button:has-text("Add Internal Comment")', { timeout: 5000 });
    await sendBtn.click();
    await sleep(2000);

    // Add "summarized" tag via API
    const currentTags = typeof ticket.tags === 'string' ? JSON.parse(ticket.tags) : (ticket.tags || []);
    currentTags.push('summarized');

    await page.evaluate(async ({ ticketId, tags, csrf }) => {
      await fetch(`/api/agent/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Caseflow-Csrf-Token': csrf,
        },
        body: JSON.stringify({ tags }),
      });
    }, { ticketId: ticket.id, tags: currentTags, csrf: csrfToken });

    console.log(`[bot] Ticket #${ticket.id} summarized and tagged.`);
  } finally {
    clearTimeout(timeout);
  }
}

run().catch(err => {
  console.error('[bot] Fatal error:', err);
  process.exit(1);
});
