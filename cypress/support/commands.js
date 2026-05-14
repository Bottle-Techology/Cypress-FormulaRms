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

        if (otp) {
          // OTP_CODE pre-supplied via env (CI / command line)
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
          return;
        }

        // No token, no OTP — send OTP email and prompt user interactively in terminal
        cy.task('askOtp', id).then((enteredOtp) => {
          cy.task('verifyOtpAndGetToken', { identifier: id, otp: enteredOtp }).then((token) => {
            cy.window().then((win) => {
              win.localStorage.setItem('access_token', token);
            });
          });
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
    if (!token) throw new Error('apiRequest: no auth token — call cy.loginViaApi() in beforeEach first');
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

// ─── User Profile Helpers ─────────────────────────────────────────────────────

Cypress.Commands.add('getMyProfileViaApi', () => {
  return cy.apiRequest('GET', '/auth/me/');
});

Cypress.Commands.add('updateMyProfileViaApi', (fields) => {
  return cy.apiRequest('PATCH', '/auth/me/', fields);
});

Cypress.Commands.add('logoutViaApi', () => {
  return cy.apiRequest('POST', '/auth/logout/', {});
});

Cypress.Commands.add('changePasswordViaApi', (payload) => {
  return cy.apiRequest('POST', '/auth/change-password/', payload);
});

// ─── Settings Helpers ─────────────────────────────────────────────────────────

Cypress.Commands.add('getSettingsViaApi', () => {
  return cy.apiRequest('GET', '/settings/');
});

Cypress.Commands.add('updateSettingsViaApi', (fields) => {
  return cy.apiRequest('PATCH', '/settings/', fields);
});

Cypress.Commands.add('getRestaurantProfileViaApi', () => {
  return cy.apiRequest('GET', '/settings/profile/');
});

Cypress.Commands.add('updateRestaurantProfileViaApi', (fields) => {
  return cy.apiRequest('PATCH', '/settings/profile/', fields);
});

Cypress.Commands.add('getRestaurantInfoViaApi', () => {
  return cy.apiRequest('GET', '/restaurant/');
});

// ─── Reports Helpers ──────────────────────────────────────────────────────────

Cypress.Commands.add('getSalesReportViaApi', (period) => {
  const query = period ? `?period=${period}` : '';
  return cy.apiRequest('GET', `/reports/sales/${query}`);
});

Cypress.Commands.add('getOrdersReportViaApi', () => {
  return cy.apiRequest('GET', '/reports/orders/');
});

Cypress.Commands.add('getPopularItemsReportViaApi', () => {
  return cy.apiRequest('GET', '/reports/popular-items/');
});

Cypress.Commands.add('getReportsSummaryViaApi', () => {
  return cy.apiRequest('GET', '/reports/summary/');
});

Cypress.Commands.add('getDashboardViaApi', () => {
  return cy.apiRequest('GET', '/dashboard/');
});

Cypress.Commands.add('getOverviewViaApi', () => {
  return cy.apiRequest('GET', '/overview/');
});

// ─── Menu Read Helpers ────────────────────────────────────────────────────────

Cypress.Commands.add('getMenusViaApi', () => {
  return cy.apiRequest('GET', '/menu/menus/');
});

Cypress.Commands.add('getCategoriesViaApi', () => {
  return cy.apiRequest('GET', '/menu/categories/');
});

Cypress.Commands.add('getItemsViaApi', (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return cy.apiRequest('GET', `/menu/items/${query}`);
});

Cypress.Commands.add('getCustomizationGroupsViaApi', () => {
  return cy.apiRequest('GET', '/menu/customization-groups/');
});

Cypress.Commands.add('deleteItemViaApi', (itemId) => {
  return cy.apiRequest('DELETE', `/menu/items/${itemId}/`);
});

Cypress.Commands.add('deleteCategoryViaApi', (categoryId) => {
  return cy.apiRequest('DELETE', `/menu/categories/${categoryId}/`);
});

Cypress.Commands.add('deleteMenuViaApi', (menuId) => {
  return cy.apiRequest('DELETE', `/menu/menus/${menuId}/`);
});

// ─── Order Read & Filter Helpers ──────────────────────────────────────────────

Cypress.Commands.add('getOrdersViaApi', (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return cy.apiRequest('GET', `/orders/${query}`);
});

Cypress.Commands.add('getOrdersByStatusViaApi', (status) => {
  return cy.apiRequest('GET', `/orders/?status=${status}`);
});

Cypress.Commands.add('getOrdersByTypeViaApi', (type) => {
  return cy.apiRequest('GET', `/orders/?type=${type}`);
});

Cypress.Commands.add('cancelOrderViaApi', (orderId) => {
  return cy.apiRequest('PATCH', `/orders/${orderId}/`, { status: 'cancelled' });
});

Cypress.Commands.add('deleteOrderViaApi', (orderId) => {
  return cy.apiRequest('DELETE', `/orders/${orderId}/`);
});

Cypress.Commands.add('markOrderPaidViaApi', (orderId) => {
  return cy.apiRequest('PATCH', `/orders/${orderId}/`, { status: 'paid' });
});

// ─── Table & Section Helpers ──────────────────────────────────────────────────

Cypress.Commands.add('getTablesViaApi', (params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  return cy.apiRequest('GET', `/tables/${query}`);
});

Cypress.Commands.add('getTableSectionsViaApi', () => {
  return cy.apiRequest('GET', '/tables/sections/');
});

Cypress.Commands.add('createTableViaApi', (name, sectionId, capacity = 4) => {
  return cy.apiRequest('POST', '/tables/', { name, section: sectionId, capacity });
});

Cypress.Commands.add('deleteTableViaApi', (tableId) => {
  return cy.apiRequest('DELETE', `/tables/${tableId}/`);
});

// ─── Printer Helpers ──────────────────────────────────────────────────────────

Cypress.Commands.add('getPrintersViaApi', () => {
  return cy.apiRequest('GET', '/printers/');
});

// ─── Navigation Helpers ───────────────────────────────────────────────────────

Cypress.Commands.add('goToProfile', () => {
  cy.visit('/profile');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('goToLogin', () => {
  cy.visit('/login');
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('goToSignup', () => {
  cy.visit('/signup');
  cy.get('body').should('be.visible');
});

// ─── UI Interaction Helpers ───────────────────────────────────────────────────

Cypress.Commands.add('clickSidebarLink', (label) => {
  cy.get('[class*="sidebar"], [class*="nav"], nav, aside')
    .contains(new RegExp(`^${label}$`, 'i'))
    .click();
});

Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible');
  cy.get('[class*="spinner"], [class*="loading"], [class*="skeleton"]').should('not.exist');
});

Cypress.Commands.add('waitForApiResponse', (alias) => {
  cy.wait(alias).its('response.statusCode').should('be.oneOf', [200, 201, 204]);
});

Cypress.Commands.add('assertNoConsoleErrors', () => {
  cy.window().its('__consoleErrors__').then((errors) => {
    const filtered = (errors || []).filter((e) => !e.includes('favicon'));
    expect(filtered, 'No console errors expected').to.have.length(0);
  });
});

Cypress.Commands.add('switchProfileTab', (tabName) => {
  cy.contains('button', tabName).click();
  cy.contains('button', tabName).should('exist');
});
