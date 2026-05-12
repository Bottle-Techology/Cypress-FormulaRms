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
      });
      return config;
    },
  },
});
