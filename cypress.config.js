const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://formularms.bottle.com.np',
    specPattern: 'cypress/e2e/*.cy.js',
    excludeSpecPattern: 'cypress/e2e/setup/**',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    downloadsFolder: 'cypress/downloads',

    viewportWidth: 1280,
    viewportHeight: 720,

    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,

    retries: {
      runMode: 2,
      openMode: 0,
    },

    video: false,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,

    env: {
      // Auth
      IDENTIFIER: 'pranuj@bottle.com.np',
      OTP_METHOD: 'email',
      OTP_CODE: process.env.OTP_CODE || '',

      // API
      API_BASE: 'https://formularms-api.bottle.com.np/api/v1',
      AUTH_BASE: 'https://formularms-api.bottle.com.np',

      // Test data prefixes (so test records can be cleaned up)
      TEST_PREFIX: '[TEST]',
    },

    setupNodeEvents(on, config) {
      const https    = require('https');
      const readline = require('readline');
      const { execFile } = require('child_process');
      const path = require('path');

      function httpsPost(hostname, urlPath, body) {
        return new Promise((resolve, reject) => {
          const data = JSON.stringify(body);
          const req  = https.request(
            {
              hostname, path: urlPath, method: 'POST',
              headers: {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(data),
                'User-Agent':     'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
              },
            },
            (res) => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, body: raw })); }
          );
          req.on('error', reject);
          req.write(data);
          req.end();
        });
      }

      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        table(message) {
          console.table(message);
          return null;
        },

        // Store token between tasks
        setToken(token) {
          process.env.FORMULARMS_TOKEN = token;
          return null;
        },
        getToken() {
          return process.env.FORMULARMS_TOKEN || null;
        },

        // Send OTP email then auto-fetch it via IMAP (falls back to readline prompt)
        async askOtp(identifier) {
          const id = identifier || 'pranuj@bottle.com.np';

          // 1. Send OTP
          console.log(`\n🔐  Sending OTP to ${id}...`);
          const res = await httpsPost('formularms-api.bottle.com.np', '/auth/login/send-otp/', { identifier: id, method: 'email' });
          if (res.status !== 200) {
            throw new Error(`Failed to send OTP: ${res.status} ${res.body}`);
          }
          console.log(`✅  OTP sent to ${id}`);

          // 2a. Auto-fetch via IMAP when IMAP_PASS is available
          if (process.env.IMAP_PASS) {
            console.log('📬  Auto-fetching OTP from Outlook inbox...');
            return new Promise((resolve, reject) => {
              const script = path.join(__dirname, 'scripts', 'get-otp-email.js');
              execFile(process.execPath, [script], { env: process.env }, (err, stdout, stderr) => {
                if (stderr) process.stdout.write(stderr); // surface IMAP progress lines
                if (err || !stdout.trim()) {
                  console.warn('⚠️  Auto-fetch failed, falling back to manual entry.');
                  askManually().then(resolve).catch(reject);
                  return;
                }
                const otp = stdout.trim();
                console.log(`✅  OTP auto-fetched: ${otp}\n`);
                resolve(otp);
              });
            });
          }

          // 2b. Manual readline fallback
          return askManually();

          function askManually() {
            return new Promise((resolve) => {
              const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
              rl.question('\n📩  Enter the OTP code from your email: ', (code) => {
                rl.close();
                const otp = code.trim();
                console.log(`    Using OTP: ${otp}\n`);
                resolve(otp);
              });
            });
          }
        },

        // Verify OTP and store token — returns the access token
        async verifyOtpAndGetToken({ identifier, otp }) {
          const id = identifier || 'pranuj@bottle.com.np';
          console.log(`\n🔑  Verifying OTP for ${id}...`);
          const res = await httpsPost('formularms-api.bottle.com.np', '/auth/login/verify-otp/', {
            identifier: id, method: 'email', code: String(otp),
          });
          if (res.status !== 200) {
            throw new Error(`OTP verification failed [${res.status}]: ${res.body}`);
          }
          const token = JSON.parse(res.body).access;
          if (!token) throw new Error(`No access token in response: ${res.body}`);
          process.env.FORMULARMS_TOKEN = token;
          console.log(`✅  Token obtained (${token.length} chars)\n`);
          return token;
        },
      });
      return config;
    },
  },
});
