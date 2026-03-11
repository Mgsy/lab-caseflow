import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db } from './index';
import { users, tickets, messages } from './schema';

async function seedAcmecorp(): Promise<void> {
  console.log('Seeding acmecorp database...');

  // Clear in reverse FK order
  db.delete(messages).run();
  db.delete(tickets).run();
  db.delete(users).run();
  console.log('  [ok] cleared existing data');

  // ──────────────────────────────────────────────
  // AGENTS
  // ──────────────────────────────────────────────

  const agentRows = await Promise.all([
    {
      email: 'sarah.chen@caseflow.io',
      passwordHash: await bcrypt.hash('Caseflow_Admin1!', 10),
      firstName: 'Sarah',
      lastName: 'Chen',
      nickname: 'sarah.c',
      role: 'admin' as const,
    },
    {
      email: 'marcus.rivera@caseflow.io',
      passwordHash: await bcrypt.hash('Caseflow_Agent1!', 10),
      firstName: 'Marcus',
      lastName: 'Rivera',
      nickname: 'marc',
      role: 'agent' as const,
    },
    {
      email: 'emma.larsson@caseflow.io',
      passwordHash: await bcrypt.hash('Caseflow_Agent2!', 10),
      firstName: 'Emma',
      lastName: 'Larsson',
      nickname: 'emma.l',
      role: 'agent' as const,
    },
    {
      email: 'james.okonkwo@caseflow.io',
      passwordHash: await bcrypt.hash('Caseflow_Agent3!', 10),
      firstName: 'James',
      lastName: 'Okonkwo',
      nickname: 'james.o',
      role: 'agent' as const,
    },
  ]);

  const insertedAgents = db.insert(users).values(agentRows).returning().all();
  const [sarah, marcus, emma, james] = insertedAgents;
  console.log(`  [ok] seeded ${insertedAgents.length} agents`);

  // ──────────────────────────────────────────────
  // CUSTOMERS
  // ──────────────────────────────────────────────

  const customerRows = await Promise.all([
    {
      email: 'alex.thompson@datapulse.io',
      passwordHash: await bcrypt.hash('Customer_Pass1!', 10),
      firstName: 'Alex',
      lastName: 'Thompson',
      role: 'customer' as const,
    },
    {
      email: 'priya.sharma@novacorp.com',
      passwordHash: await bcrypt.hash('Customer_Pass2!', 10),
      firstName: 'Priya',
      lastName: 'Sharma',
      role: 'customer' as const,
    },
    {
      email: 'tom.mitchell@brightlabs.co',
      passwordHash: await bcrypt.hash('Customer_Pass3!', 10),
      firstName: 'Tom',
      lastName: 'Mitchell',
      role: 'customer' as const,
    },
    {
      email: 'lisa.wang@streamline.dev',
      passwordHash: await bcrypt.hash('Customer_Pass4!', 10),
      firstName: 'Lisa',
      lastName: 'Wang',
      role: 'customer' as const,
    },
    {
      email: 'daniel.kowalski@techforge.pl',
      passwordHash: await bcrypt.hash('Customer_Pass5!', 10),
      firstName: 'Daniel',
      lastName: 'Kowalski',
      role: 'customer' as const,
    },
    {
      email: 'nina.petrova@cloudnest.io',
      passwordHash: await bcrypt.hash('Customer_Pass6!', 10),
      firstName: 'Nina',
      lastName: 'Petrova',
      role: 'customer' as const,
    },
  ]);

  const insertedCustomers = db.insert(users).values(customerRows).returning().all();
  const [alex, priya, tom, lisa, daniel, nina] = insertedCustomers;
  console.log(`  [ok] seeded ${insertedCustomers.length} customers`);

  // ──────────────────────────────────────────────
  // TICKETS + MESSAGES
  // ──────────────────────────────────────────────

  // Helper to generate a timestamp offset from now
  function daysAgo(d: number, hoursOffset = 0): string {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    dt.setHours(dt.getHours() - hoursOffset);
    return dt.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  }

  function hoursAgo(h: number): string {
    const dt = new Date();
    dt.setHours(dt.getHours() - h);
    return dt.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  }

  // ── Ticket 1 ── NEW, unassigned, high ──────────
  const [t1] = db.insert(tickets).values({
    subject: 'CSV export returning empty file for large datasets',
    status: 'new',
    priority: 'high',
    customerId: alex.id,
    assignedAgentId: null,
    tags: JSON.stringify(['export', 'csv', 'data', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(3),
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t1.id,
      senderId: alex.id,
      bodyHtml: '<p>Hi, I\'m trying to export our Q4 analytics data as CSV but anything over 10,000 rows comes back as an empty file. Smaller exports work fine. We\'re on the Business plan and this is blocking our quarterly reporting. File attached shows the export dialog — it completes successfully but the downloaded file is 0 bytes.</p>',
      createdAt: daysAgo(2),
    },
    {
      ticketId: t1.id,
      senderId: alex.id,
      bodyHtml: '<p>Just tested again this morning — same issue. Our team really needs this resolved before the board meeting on Friday. Can someone please take a look?</p>',
      createdAt: daysAgo(1, 12),
    },
    {
      ticketId: t1.id,
      senderId: alex.id,
      bodyHtml: '<p>Update: I tried exporting from a different browser (Firefox instead of Chrome) and got the same result. Definitely a server-side issue.</p>',
      createdAt: hoursAgo(3),
    },
  ]).run();

  // ── Ticket 2 ── OPEN, Marcus, urgent ───────────
  const [t2] = db.insert(tickets).values({
    subject: 'API rate limiting hitting us during peak hours',
    status: 'open',
    priority: 'urgent',
    customerId: priya.id,
    assignedAgentId: marcus.id,
    tags: JSON.stringify(['api', 'rate-limit', 'performance', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(5),
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t2.id,
      senderId: priya.id,
      bodyHtml: '<p>We\'re getting 429 responses from the /api/v2/events endpoint between 2-4pm UTC daily. Our integration processes about 500 requests/minute during peak. Current rate limit of 300/min is too low for our use case. Is there any way to increase this for our account?</p>',
      createdAt: daysAgo(3),
    },
    {
      ticketId: t2.id,
      senderId: marcus.id,
      bodyHtml: '<p>Hi Priya, thanks for reaching out. I can see the 429s in our logs — you\'re consistently hitting the ceiling around 2:15pm UTC. Let me check with the engineering team about a limit increase for your plan. In the meantime, have you considered implementing request batching? Our batch endpoint can handle up to 50 events per request.</p>',
      createdAt: daysAgo(2, 18),
    },
    {
      ticketId: t2.id,
      senderId: priya.id,
      bodyHtml: '<p>Thanks Marcus. We\'re already using batching for some operations but the real-time event stream can\'t be easily batched — it\'s user-triggered actions that need sub-second processing. Our previous provider supported 1000/min on the equivalent plan.</p>',
      createdAt: daysAgo(2, 14),
    },
    {
      ticketId: t2.id,
      senderId: marcus.id,
      bodyHtml: '<p>Understood. I\'ve escalated this to our platform team. They\'re reviewing whether we can do a per-account override for the Enterprise tier. I should have an answer by tomorrow.</p>',
      createdAt: daysAgo(1, 10),
    },
    {
      ticketId: t2.id,
      senderId: priya.id,
      bodyHtml: '<p>Appreciate the quick follow-up. Let me know once you hear back.</p>',
      createdAt: hoursAgo(5),
    },
  ]).run();

  // ── Ticket 3 ── OPEN, Emma, high ───────────────
  const [t3] = db.insert(tickets).values({
    subject: 'SSO configuration failing with SAML assertion error',
    status: 'open',
    priority: 'high',
    customerId: tom.id,
    assignedAgentId: emma.id,
    tags: JSON.stringify(['sso', 'saml', 'auth', 'enterprise', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(4),
    updatedAt: hoursAgo(8),
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t3.id,
      senderId: tom.id,
      bodyHtml: '<p>We\'re trying to set up SAML SSO with our Okta instance and getting this error during the assertion step: \'Invalid SAML Response: Signature validation failed\'. Our IdP metadata is correctly configured (attached screenshot). We\'ve verified the certificate and entity ID match.</p>',
      createdAt: daysAgo(4),
    },
    {
      ticketId: t3.id,
      senderId: emma.id,
      bodyHtml: '<p>Hi Tom, thanks for the detailed report. The signature validation error usually means there\'s a mismatch between the certificate in our system and what Okta is sending. Could you check: 1) Is your Okta app configured to sign both the response AND the assertion? We require both. 2) Did you copy the certificate from Okta\'s metadata XML directly, or from the admin dashboard? Sometimes the dashboard truncates it.</p>',
      createdAt: daysAgo(3, 20),
    },
    {
      ticketId: t3.id,
      senderId: tom.id,
      bodyHtml: '<p>Good catch — we had \'Sign Response\' enabled but \'Sign Assertion\' was off. I\'ve enabled both but now getting a different error: \'Audience restriction mismatch\'. Our audience URI is set to https://brightlabs.caseflow.io/saml/metadata — is that correct?</p>',
      createdAt: daysAgo(3, 16),
    },
    {
      ticketId: t3.id,
      senderId: emma.id,
      bodyHtml: '<p>Almost — the audience URI should be https://app.caseflow.io/saml/sp/brightlabs (with your org slug at the end, not as a subdomain). I\'ll send you our updated SSO setup guide that has the correct endpoints. Let me know if that resolves it.</p>',
      createdAt: hoursAgo(8),
    },
  ]).run();

  // ── Ticket 4 ── NEW, unassigned, normal ────────
  const [t4] = db.insert(tickets).values({
    subject: 'Webhook deliveries failing silently since Tuesday',
    status: 'new',
    priority: 'normal',
    customerId: lisa.id,
    assignedAgentId: null,
    tags: JSON.stringify(['webhooks', 'integrations', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(5),
    updatedAt: hoursAgo(20),
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t4.id,
      senderId: lisa.id,
      bodyHtml: '<p>Our webhook endpoint at https://hooks.streamline.dev/caseflow hasn\'t received any payloads since Tuesday 3/4. I checked our server logs and there are no incoming requests at all — not even failed ones. The webhook is still showing as \'Active\' in our Caseflow settings. We depend on these webhooks for our internal Slack notifications about ticket updates.</p>',
      createdAt: daysAgo(5),
    },
    {
      ticketId: t4.id,
      senderId: lisa.id,
      bodyHtml: '<p>I just checked the webhook delivery logs in our Caseflow dashboard and they all show \'Delivered\' with 200 status. But our server definitely isn\'t receiving anything. Is it possible the requests are going somewhere else?</p>',
      createdAt: hoursAgo(20),
    },
  ]).run();

  // ── Ticket 5 ── OPEN, James, normal ───────────
  const [t5] = db.insert(tickets).values({
    subject: 'Custom fields not appearing in ticket export PDF',
    status: 'open',
    priority: 'normal',
    customerId: daniel.id,
    assignedAgentId: james.id,
    tags: JSON.stringify(['export', 'pdf', 'custom-fields', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(6),
    updatedAt: hoursAgo(10),
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t5.id,
      senderId: daniel.id,
      bodyHtml: '<p>We\'ve added several custom fields to our ticket schema (region, contract_id, escalation_level) and they appear fine in the web UI. But when we export a ticket to PDF, these fields are completely missing from the output. Only the default fields show up.</p>',
      createdAt: daysAgo(6),
    },
    {
      ticketId: t5.id,
      senderId: james.id,
      bodyHtml: '<p>Hi Daniel, you\'re right — I can reproduce this on our end. The PDF export template currently only includes the built-in fields. I\'ll file this with our product team. As a workaround, have you tried the CSV export? Custom fields are included there.</p>',
      createdAt: daysAgo(5, 20),
    },
    {
      ticketId: t5.id,
      senderId: daniel.id,
      bodyHtml: '<p>CSV won\'t work for us — we need the formatted PDF for client-facing reports. These go directly to our enterprise clients. Any timeline on a fix?</p>',
      createdAt: daysAgo(5, 16),
    },
    {
      ticketId: t5.id,
      senderId: james.id,
      bodyHtml: '<p>Let me check with the team. I know the PDF renderer is being updated in the next sprint which starts Monday. I\'ll push to get this included.</p>',
      createdAt: daysAgo(4, 14),
    },
    {
      ticketId: t5.id,
      senderId: daniel.id,
      bodyHtml: '<p>Thanks. Can you also check if the PDF API endpoint supports custom fields? We could potentially generate our own PDFs if the data is available via API.</p>',
      createdAt: daysAgo(2, 10),
    },
    {
      ticketId: t5.id,
      senderId: james.id,
      bodyHtml: '<p>Good thinking — the API at /api/v2/tickets/:id does include custom fields in the response. So you could pull the data and generate PDFs on your end. I\'ll also follow up on the native PDF fix.</p>',
      createdAt: hoursAgo(10),
    },
  ]).run();

  // ── Ticket 6 ── NEW, unassigned, high ──────────
  const [t6] = db.insert(tickets).values({
    subject: 'Dashboard loading extremely slow after data migration',
    status: 'new',
    priority: 'high',
    customerId: nina.id,
    assignedAgentId: null,
    tags: JSON.stringify(['performance', 'dashboard', 'migration', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(6),
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t6.id,
      senderId: nina.id,
      bodyHtml: '<p>After importing 45,000 historical tickets through your migration API last weekend, the main dashboard takes 30+ seconds to load. Before the import it was instant. The ticket list page and individual tickets are fine — it\'s specifically the analytics dashboard with the charts and metrics that\'s crawling.</p>',
      createdAt: daysAgo(1),
    },
    {
      ticketId: t6.id,
      senderId: nina.id,
      bodyHtml: '<p>I checked the network tab — the /api/v2/analytics/overview endpoint is taking 28 seconds to respond. Is there some kind of aggregation cache that needs to be rebuilt after a bulk import?</p>',
      createdAt: hoursAgo(6),
    },
  ]).run();

  // ── Ticket 7 ── CLOSED, Sarah, normal ──────────
  const closedAt7 = daysAgo(3);
  const [t7] = db.insert(tickets).values({
    subject: 'Unable to create team with special characters in name',
    status: 'closed',
    priority: 'normal',
    customerId: alex.id,
    assignedAgentId: sarah.id,
    tags: JSON.stringify(['teams', 'validation', 'bug', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(5),
    updatedAt: closedAt7,
    closedAt: closedAt7,
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t7.id,
      senderId: alex.id,
      bodyHtml: '<p>When I try to create a team called \'R&D — Frontend\' I get a validation error: \'Team name contains invalid characters\'. It seems like ampersand and em-dash aren\'t supported? We have several teams with these characters.</p>',
      createdAt: daysAgo(5),
    },
    {
      ticketId: t7.id,
      senderId: sarah.id,
      bodyHtml: '<p>Hi Alex, confirmed — our team name validation regex is too strict. It currently only allows alphanumerics, spaces, and hyphens. I\'m pushing a fix now to allow &amp; — () and other common punctuation.</p>',
      createdAt: daysAgo(4, 20),
    },
    {
      ticketId: t7.id,
      senderId: sarah.id,
      bodyHtml: '<p>Fix is deployed. You should now be able to create teams with special characters. Can you confirm it\'s working on your end?</p>',
      createdAt: daysAgo(4, 16),
    },
    {
      ticketId: t7.id,
      senderId: alex.id,
      bodyHtml: '<p>Works perfectly now. Thanks for the fast turnaround, Sarah!</p>',
      createdAt: daysAgo(3),
    },
  ]).run();

  // ── Ticket 8 ── CLOSED, Marcus, urgent ─────────
  const closedAt8 = daysAgo(7);
  const [t8] = db.insert(tickets).values({
    subject: 'Two-factor authentication codes not arriving via SMS',
    status: 'closed',
    priority: 'urgent',
    customerId: priya.id,
    assignedAgentId: marcus.id,
    tags: JSON.stringify(['2fa', 'sms', 'auth', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(8),
    updatedAt: closedAt8,
    closedAt: closedAt8,
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t8.id,
      senderId: priya.id,
      bodyHtml: '<p>Multiple users in our org are reporting that SMS 2FA codes aren\'t arriving. This started about 2 hours ago. We can\'t log in to our admin accounts. Email-based codes work fine.</p>',
      createdAt: daysAgo(8),
    },
    {
      ticketId: t8.id,
      senderId: marcus.id,
      bodyHtml: '<p>This is a known issue — our SMS provider is experiencing an outage in the EU region. We\'re monitoring it. In the meantime, affected users can switch to email-based 2FA or use an authenticator app.</p>',
      createdAt: daysAgo(7, 22),
    },
    {
      ticketId: t8.id,
      senderId: priya.id,
      bodyHtml: '<p>How do they switch if they can\'t log in? The 2FA prompt is mandatory.</p>',
      createdAt: daysAgo(7, 20),
    },
    {
      ticketId: t8.id,
      senderId: marcus.id,
      bodyHtml: '<p>You\'re right — I\'ve temporarily disabled mandatory 2FA for your organization so your users can log in and reconfigure. I\'ll re-enable it once SMS is restored. Our SMS provider has confirmed the issue is on their end and ETA for resolution is ~2 hours.</p>',
      createdAt: daysAgo(7, 18),
    },
    {
      ticketId: t8.id,
      senderId: priya.id,
      bodyHtml: '<p>SMS codes are arriving again. I\'ve asked our team to set up authenticator apps as backup. You can re-enable mandatory 2FA. Thanks for the quick help.</p>',
      createdAt: daysAgo(7),
    },
  ]).run();

  // ── Ticket 9 ── CLOSED, Emma, normal ───────────
  const closedAt9 = daysAgo(14);
  const [t9] = db.insert(tickets).values({
    subject: 'Bulk ticket import failing at row 847',
    status: 'closed',
    priority: 'normal',
    customerId: lisa.id,
    assignedAgentId: emma.id,
    tags: JSON.stringify(['import', 'csv', 'bug', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(16),
    updatedAt: closedAt9,
    closedAt: closedAt9,
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t9.id,
      senderId: lisa.id,
      bodyHtml: '<p>I\'m trying to import tickets from our old system via CSV. The import consistently fails at row 847 with \'Invalid date format\'. I\'ve checked the row and the date looks correct: \'2024-02-29\'. It was a leap year so the date is valid.</p>',
      createdAt: daysAgo(16),
    },
    {
      ticketId: t9.id,
      senderId: emma.id,
      bodyHtml: '<p>Found the issue — our date parser was using a library that had a known leap year bug for 2024 specifically. Updating the parser now.</p>',
      createdAt: daysAgo(15, 18),
    },
    {
      ticketId: t9.id,
      senderId: emma.id,
      bodyHtml: '<p>Parser updated and deployed. Your CSV should import cleanly now. Let me know if you run into anything else.</p>',
      createdAt: daysAgo(14),
    },
  ]).run();

  // ── Ticket 10 ── CLOSED, James, low ────────────
  const closedAt10 = daysAgo(5);
  const [t10] = db.insert(tickets).values({
    subject: 'Caseflow Slack integration posting duplicate notifications',
    status: 'closed',
    priority: 'low',
    customerId: daniel.id,
    assignedAgentId: james.id,
    tags: JSON.stringify(['slack', 'integrations', 'notifications', 'summarized']),
    metadata: JSON.stringify({}),
    createdAt: daysAgo(7),
    updatedAt: closedAt10,
    closedAt: closedAt10,
  }).returning().all();

  db.insert(messages).values([
    {
      ticketId: t10.id,
      senderId: daniel.id,
      bodyHtml: '<p>Every ticket update is generating 2-3 Slack notifications instead of one. We think it started after we updated our Slack app permissions last week.</p>',
      createdAt: daysAgo(7),
    },
    {
      ticketId: t10.id,
      senderId: james.id,
      bodyHtml: '<p>Hi Daniel, this is likely a duplicate webhook subscription issue. When you updated the Slack app permissions, it may have re-registered the webhook without removing the old one. Can you go to Settings → Integrations → Slack and check how many webhook URLs are registered?</p>',
      createdAt: daysAgo(6, 20),
    },
    {
      ticketId: t10.id,
      senderId: daniel.id,
      bodyHtml: '<p>You\'re right — there are 3 identical webhook URLs registered. I removed the duplicates and we\'re now getting single notifications. But shouldn\'t the system prevent duplicate registrations?</p>',
      createdAt: daysAgo(6, 16),
    },
    {
      ticketId: t10.id,
      senderId: james.id,
      bodyHtml: '<p>It should — and you\'ve actually found a bug. I\'ve filed it internally. The deduplication check wasn\'t running during permission updates, only during initial setup. We\'ll fix this in the next release. Thanks for catching it.</p>',
      createdAt: daysAgo(5),
    },
  ]).run();

  // Suppress unused variable warnings for tickets only used for context
  void t6; void t9; void t10;

  console.log('  [ok] seeded 10 tickets');

  // Count messages
  const [{ count: msgCount }] = db.select({ count: sql<number>`count(*)` }).from(messages).all();
  console.log(`  [ok] seeded ${msgCount} messages`);

  console.log('Seed complete.');
}

async function seedAttacker(): Promise<void> {
  console.log('Seeding attacker database...');

  // Clear in reverse FK order
  db.delete(messages).run();
  db.delete(tickets).run();
  db.delete(users).run();
  console.log('  [ok] cleared existing data');

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const now = new Date().toISOString();

  db.insert(users).values({
    email: 'admin@caseflow.io',
    passwordHash,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    createdAt: now,
    updatedAt: now,
  }).run();

  console.log('  [ok] seeded 1 admin user (admin@caseflow.io / Admin123!)');
  console.log('Seed complete.');
}

async function seed(): Promise<void> {
  const tenant = process.env.TENANT ?? 'acmecorp';

  if (tenant === 'attacker') {
    await seedAttacker();
  } else {
    await seedAcmecorp();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
