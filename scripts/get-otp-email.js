/**
 * Connects to Outlook IMAP and extracts the latest FormulaRMS OTP code.
 *
 * Required env vars:
 *   IMAP_PASS   — your Outlook password or app password
 *
 * Optional env vars:
 *   IMAP_USER   — defaults to IDENTIFIER or pranuj@bottle.com.np
 *   IMAP_HOST   — defaults to outlook.office365.com
 *   OTP_WAIT_MS — ms to wait before polling for the email (default 8000)
 *   OTP_MAX_AGE_MS — how far back to search for OTP email (default 120000 = 2 min)
 *
 * Prints the 6-digit OTP to stdout on success, exits with code 1 on failure.
 *
 * NOTE: Microsoft 365 / Exchange Online — if basic auth is disabled by your admin,
 * create an App Password:
 *   account.microsoft.com → Security → Advanced security options → App passwords
 */

'use strict';

const { ImapFlow }     = require('imapflow');
const { simpleParser } = require('mailparser');

const IMAP_USER     = process.env.IMAP_USER || process.env.IDENTIFIER || 'pranuj@bottle.com.np';
const IMAP_PASS     = process.env.IMAP_PASS;
const IMAP_HOST     = process.env.IMAP_HOST || 'outlook.office365.com';
const WAIT_MS       = parseInt(process.env.OTP_WAIT_MS    || '8000',   10);
const MAX_AGE_MS    = parseInt(process.env.OTP_MAX_AGE_MS || '120000', 10);

if (!IMAP_PASS) {
  process.stderr.write(
    'Error: IMAP_PASS is not set.\n' +
    'Set it in your environment:\n' +
    '  export IMAP_PASS="your-outlook-password"\n' +
    'Or create an App Password at account.microsoft.com → Security → App passwords\n'
  );
  process.exit(1);
}

async function fetchOtp() {
  // Give the mail server time to deliver the email before we poll
  if (WAIT_MS > 0) {
    process.stderr.write(`Waiting ${WAIT_MS}ms for OTP email to arrive...\n`);
    await new Promise(r => setTimeout(r, WAIT_MS));
  }

  const client = new ImapFlow({
    host:   IMAP_HOST,
    port:   993,
    secure: true,
    auth:   { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
  });

  await client.connect();

  let otp = null;
  const lock = await client.getMailboxLock('INBOX');

  try {
    const since = new Date(Date.now() - MAX_AGE_MS);

    // Search for recent unread messages (broad — we filter by content below)
    const uids = await client.search({ since }, { uid: true });
    if (!uids.length) {
      throw new Error(`No emails found in INBOX in the last ${MAX_AGE_MS / 1000}s`);
    }

    process.stderr.write(`Found ${uids.length} recent email(s), scanning for OTP...\n`);

    // Check most-recent first (highest UID last in array)
    for (const uid of [...uids].reverse()) {
      for await (const msg of client.fetch([uid], { source: true }, { uid: true })) {
        const parsed = await simpleParser(msg.source);

        const subject = parsed.subject || '';
        const text    = parsed.text  || '';
        const html    = parsed.html  || '';
        const body    = `${subject} ${text} ${html}`;

        // Extract first standalone 6-digit number
        const match = body.match(/(?<!\d)(\d{6})(?!\d)/);
        if (match) {
          otp = match[1];
          process.stderr.write(`OTP found in email (subject: "${subject}")\n`);
          break;
        }
      }
      if (otp) break;
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return otp;
}

fetchOtp()
  .then((otp) => {
    if (!otp) {
      process.stderr.write('No 6-digit OTP found in recent emails.\n');
      process.exit(1);
    }
    // Only the code goes to stdout — caller reads it via exec/spawn
    process.stdout.write(otp);
  })
  .catch((err) => {
    process.stderr.write(`IMAP error: ${err.message}\n`);
    process.exit(1);
  });
