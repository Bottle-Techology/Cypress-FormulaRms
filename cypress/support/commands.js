/// <reference path="./index.d.ts" />

const API_BASE = 'https://formularms-api.bottle.com.np/api/v1';
const AUTH_BASE = 'https://formularms-api.bottle.com.np';

// ─── Navigation ──────────────────────────────────────────────────────────────

Cypress.Commands.add('visitPage', (path) => {
  cy.visit(path);
  cy.get('body').should('be.visible');
});

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Send OTP to the given identifier (email or phone).
 * Returns the masked contact from the API response.
 */
Cypress.Commands.add('sendOtp', (identifier, method = 'email') => {
  return cy.request({
    method: 'POST',
    url: `${AUTH_BASE}/auth/login/send-otp/`,
    body: { identifier, method },
    failOnStatusCode: false,
  });
});

/**
 * Verify OTP and store the access token in localStorage.
 * Use this after manually retrieving the OTP.
 */
Cypress.Commands.add('verifyOtp', (identifier, code, method = 'email') => {
  return cy
    .request({
      method: 'POST',
      url: `${AUTH_BASE}/auth/login/verify-otp/`,
      body: { identifier, method, code: String(code) },
    })
    .then((res) => {
      const { access, refresh } = res.body;
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', access);
        win.localStorage.setItem('refresh_token', refresh);
      });
      cy.task('setToken', access);
      return res.body;
    });
});

/**
 * Inject an access token directly into localStorage — use when you already
 * have a valid token (e.g. from a prior cy.task('getToken') call).
 */
Cypress.Commands.add('setAuthToken', (token) => {
  cy.window().then((win) => {
    win.localStorage.setItem('access_token', token);
  });
});

/**
 * Authenticate via OTP using credentials from the user fixture.
 * Relies on Cypress.env('OTP_CODE') being set before the test run,
 * or on cy.task('getToken') returning a pre-cached token.
 *
 * Usage:
 *   cy.loginViaApi()                      // uses fixture identifier
 *   cy.loginViaApi('user@example.com')    // custom identifier
 */
Cypress.Commands.add('loginViaApi', (identifier, otpCode) => {
  const id = identifier || Cypress.env('IDENTIFIER');
  const rawOtp = otpCode !== undefined ? otpCode : Cypress.env('OTP_CODE');
  // String() cast required — Cypress parses --env OTP_CODE=123456 as Number, causing 500 (BUG-01)
  const otp = rawOtp !== undefined && rawOtp !== null ? String(rawOtp) : null;
  const method = Cypress.env('OTP_METHOD') || 'email';

  // Stable session key — does NOT include OTP so the session is shared across all spec files.
  // OTPs are single-use; keying by OTP would force a re-verify on every spec and fail.
  cy.session(
    [id, 'api-session'],
    () => {
      // Prefer a cached token set by a previous direct verify (e.g. from 03-auth.cy.js tests).
      // Only fall back to OTP verification when no cached token is available.
      cy.task('getToken').then((cached) => {
        if (cached) {
          cy.window().then((win) => {
            win.localStorage.setItem('access_token', cached);
          });
          return;
        }
        if (!otp) {
          throw new Error(
            'No cached token and no OTP_CODE available. Set Cypress.env("OTP_CODE") or provide otpCode param.'
          );
        }
        cy.request({
          method: 'POST',
          url: `${AUTH_BASE}/auth/login/verify-otp/`,
          body: { identifier: id, method, code: otp },
        }).then((res) => {
          cy.window().then((win) => {
            win.localStorage.setItem('access_token', res.body.access);
            win.localStorage.setItem('refresh_token', res.body.refresh);
          });
          cy.task('setToken', res.body.access);
        });
      });
    },
    {
      validate() {
        cy.visit('/overview', { failOnStatusCode: false });
        cy.url().should('not.include', '/login');
      },
    }
  );
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('access_token');
    win.localStorage.removeItem('refresh_token');
  });
  cy.visit('/login');
  cy.url().should('include', '/login');
});

Cypress.Commands.add('clearAuth', () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.window().then((win) => win.sessionStorage.clear());
});

// ─── API Helpers ─────────────────────────────────────────────────────────────

/**
 * Make an authenticated API request using the stored token.
 */
Cypress.Commands.add('apiRequest', (method, endpoint, body) => {
  cy.task('getToken').then((token) => {
    return cy.request({
      method,
      url: `${API_BASE}${endpoint}`,
      headers: { Authorization: `Bearer ${token}` },
      body,
      failOnStatusCode: false,
    });
  });
});

// ─── Signup Helpers ───────────────────────────────────────────────────────────

Cypress.Commands.add('signupSendOtp', (identifier, method = 'email') => {
  return cy.request({
    method: 'POST',
    url: `${AUTH_BASE}/auth/signup/send-otp/`,
    body: { identifier, method },
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('signupVerifyOtp', (identifier, code, method = 'email') => {
  return cy
    .request({
      method: 'POST',
      url: `${AUTH_BASE}/auth/signup/verify-otp/`,
      body: { identifier, method, code },
    })
    .then((res) => {
      const { access, refresh } = res.body;
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', access);
        win.localStorage.setItem('refresh_token', refresh);
      });
      cy.task('setToken', access);
      return res.body;
    });
});

// ─── Menu Helpers ─────────────────────────────────────────────────────────────

Cypress.Commands.add('createMenuViaApi', (name, description = '') => {
  cy.apiRequest('POST', '/menu/menus/', { name, description });
});

Cypress.Commands.add('createCategoryViaApi', (name) => {
  cy.apiRequest('POST', '/menu/categories/', { name });
});

Cypress.Commands.add('createItemViaApi', (name, base_price, food_type = 'non_veg') => {
  cy.apiRequest('POST', '/menu/items/', { name, base_price, food_type });
});

// ─── Order Helpers ────────────────────────────────────────────────────────────

Cypress.Commands.add('createOrderViaApi', (tableId, items = [], note = '') => {
  // type is required: dine_in needs a table, takeaway needs customer_name
  const body = tableId
    ? { type: 'dine_in', table: tableId }
    : { type: 'takeaway', customer_name: 'Test Customer', customer_phone: '9800000001' };
  if (note) body.note = note;
  if (items.length) body.items = items;
  return cy.apiRequest('POST', '/orders/', body);
});

Cypress.Commands.add('updateOrderStatusViaApi', (orderId, status) => {
  return cy.apiRequest('PATCH', `/orders/${orderId}/`, { status });
});

Cypress.Commands.add('addItemToOrderViaApi', (orderId, itemId, quantity = 1) => {
  // /orders/:id/items/ returns 404 — correct endpoint is /add_items/ with dict wrapper (BUG-06)
  return cy.apiRequest('POST', `/orders/${orderId}/add_items/`, { items: [{ menu_item: itemId, quantity }] });
});

Cypress.Commands.add('generateBillViaApi', (orderId) => {
  return cy.apiRequest('POST', `/orders/${orderId}/bill/`, {});
});

// ─── Table Session Helpers ────────────────────────────────────────────────────

Cypress.Commands.add('openTableViaApi', (tableId) => {
  return cy.apiRequest('POST', `/tables/${tableId}/open/`, {});
});

Cypress.Commands.add('closeTableViaApi', (tableId) => {
  return cy.apiRequest('POST', `/tables/${tableId}/close/`, {});
});

Cypress.Commands.add('updateTableStatusViaApi', (tableId, status) => {
  return cy.apiRequest('PATCH', `/tables/${tableId}/`, { status });
});

// ─── Navigation Helpers ───────────────────────────────────────────────────────

Cypress.Commands.add('goToDashboard', () => {
  cy.visit('/overview');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('goToReports', () => {
  cy.visit('/reports');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('goToMenuPage', () => {
  cy.visit('/menu');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('goToOrders', () => {
  cy.visit('/orders');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('goToTables', () => {
  cy.visit('/tables');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('goToSettings', () => {
  cy.visit('/settings');
  cy.get('body').should('be.visible');
});

// ─── UI Interaction Helpers ───────────────────────────────────────────────────

Cypress.Commands.add('clickSidebarLink', (label) => {
  cy.get('nav, aside, [class*="sidebar"], [class*="nav"]')
    .contains(new RegExp(label, 'i'))
    .first()
    .click();
});

Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible');
  cy.get('[class*="spinner"], [class*="loading"], [class*="skeleton"]').should('not.exist');
});
