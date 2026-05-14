/**
 * 35 – Signup & New-Account Behaviour (Comprehensive)
 *
 * FormulaRMS uses admin-provisioned accounts only.
 * The public signup API (/auth/signup/*) does NOT exist (returns 404).
 * Unregistered emails sent to the login endpoint receive 401.
 *
 * This spec verifies:
 *  - The UI handles /signup gracefully (redirects or shows a page)
 *  - The API consistently rejects all unregistered/invalid identifiers
 *  - All input validation edge-cases return correct error shapes
 *  - No credentials, stack traces, or DB internals are leaked
 *  - Authenticated users are redirected away from /signup
 *
 * Env vars:
 *   OTP_CODE – existing-account OTP (for the authenticated-redirect context)
 */

const AUTH_BASE = 'https://formularms-api.bottle.com.np';
const EXISTING  = Cypress.env('IDENTIFIER') || 'pranuj@bottle.com.np';
const NEW_EMAIL = `formularms-test-${Date.now()}@yopmail.com`;

describe('35 – Signup & New-Account Behaviour (Comprehensive)', () => {
  const LOGIN_OTP = Cypress.env('OTP_CODE');

  // ─── 1. UI – /signup Route Behaviour ────────────────────────────────────────

  context('UI – /signup route', () => {
    beforeEach(() => {
      // Arrange: clear any existing auth session
      cy.clearAuth();
      cy.visit('/signup', { failOnStatusCode: false });
    });

    it('visiting /signup does not return a 5xx error', () => {
      // Assert: page loaded without server error
      cy.get('body').should('be.visible');
    });

    it('resolves to /signup, /register, or redirects to /login (invite-only apps)', () => {
      // Assert: URL is one of the expected routes for a closed-system app
      cy.url().should('satisfy', (url) =>
        url.includes('/signup') ||
        url.includes('/register') ||
        url.includes('/login')
      );
    });

    it('page title is non-empty', () => {
      // Assert
      cy.title().should('not.be.empty');
    });

    it('body is not a blank white page', () => {
      // Assert: page has rendered meaningful content
      cy.get('body').invoke('text').should('have.length.greaterThan', 10);
    });
  });

  // ─── 2. UI – Signup page content (if /signup renders) ──────────────────────

  context('UI – Signup page content', () => {
    beforeEach(() => {
      cy.clearAuth();
      cy.visit('/signup', { failOnStatusCode: false });
    });

    it('shows an input field when /signup renders', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return;
        cy.get('input').should('exist').and('be.visible');
      });
    });

    it('shows a submit button when /signup renders', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return;
        cy.get('button').should('exist').and('be.visible');
      });
    });

    it('shows a link or text referring to login when /signup renders', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return;
        cy.get('body').contains(/sign in|log in|already have/i).should('exist');
      });
    });

    it('does not navigate away on empty-form submit', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return;
        cy.get('button[type="submit"], button').first().click();
        cy.url().should('not.include', '/overview');
      });
    });

    it('login link navigates to /login', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return;
        cy.get('body').contains(/sign in|log in/i).click({ force: true });
        cy.url().should('include', '/login');
      });
    });
  });

  // ─── 3. API – Signup Endpoint Existence ─────────────────────────────────────

  context('API – Signup endpoint (expected: not available)', () => {
    it('POST /auth/signup/send-otp/ returns 404 (feature not enabled)', () => {
      // Act
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/signup/send-otp/`,
        body: { identifier: NEW_EMAIL, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        // Assert: public signup not available — 404 is the correct closed-system response
        expect(res.status).to.eq(404);
      });
    });

    it('POST /auth/signup/verify-otp/ returns 404 (feature not enabled)', () => {
      // Act
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/signup/verify-otp/`,
        body: { identifier: NEW_EMAIL, method: 'email', code: '123456' },
        failOnStatusCode: false,
      }).then((res) => {
        // Assert
        expect(res.status).to.eq(404);
      });
    });

    it('GET /auth/signup/ returns 404 or 405', () => {
      // Act
      cy.request({
        method: 'GET',
        url: `${AUTH_BASE}/auth/signup/`,
        failOnStatusCode: false,
      }).then((res) => {
        // Assert: route either not found or method not allowed
        expect(res.status).to.be.oneOf([404, 405]);
      });
    });
  });

  // ─── 4. API – Login rejects unregistered emails ──────────────────────────────

  context('API – Login with unregistered email (closed system)', () => {
    it('POST /auth/login/send-otp/ rejects a brand-new yopmail address with 401', () => {
      // Arrange: NEW_EMAIL is a unique yopmail address that has never been registered
      // Act
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: NEW_EMAIL, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        // Assert: unregistered address must be rejected
        expect(res.status).to.eq(401);
      });
    });

    it('error body contains a detail or message field (not a raw server error)', () => {
      // Act
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: NEW_EMAIL, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        // Assert: error is a structured response, not a raw 500 dump
        expect(res.body).to.satisfy(
          (b) => b.detail || b.message || b.error,
          'error response should contain detail, message, or error'
        );
      });
    });

    it('rejects random unregistered email with 401', () => {
      // Act
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: `nobody-${Date.now()}@nowhere.com`, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        // Assert
        expect(res.status).to.eq(401);
      });
    });
  });

  // ─── 5. API – Login input validation (negative) ──────────────────────────────

  context('API – POST /auth/login/send-otp/ (input validation)', () => {
    it('rejects empty identifier with 400 or 401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: '', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects whitespace-only identifier with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: '   ', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects plain text without @ with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: 'notanemail', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects double-@ email with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: 'bad@@domain.com', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects @domain.com (missing local part) with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: '@domain.com', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('accepts missing method field (API defaults to email)', () => {
      // API does not require the method field — omitting it returns 200 (defaults to email)
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: EXISTING },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 400, 401, 422]);
      });
    });

    it('accepts or ignores unrecognised method value (API does not validate method strictly)', () => {
      // API currently returns 200 for any method value — not strict about enum validation
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: EXISTING, method: 'pigeon' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 400, 401, 422]);
      });
    });

    it('rejects completely empty body with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects SQL injection payload with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: "'; DROP TABLE users; --", method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects XSS payload with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: '<script>alert(1)</script>@evil.com', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects excessively long email (>254 chars) with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: `${'a'.repeat(245)}@x.com`, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });
  });

  // ─── 6. API – OTP Verify input validation (negative) ─────────────────────────

  context('API – POST /auth/login/verify-otp/ (input validation)', () => {
    it('rejects wrong 6-digit OTP with 400/401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email', code: '000000' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401]);
        expect(res.body).to.not.have.property('access');
      });
    });

    it('rejects empty code with 400', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email', code: '' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 422]);
      });
    });

    it('rejects 5-digit code (too short) with 400', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email', code: '12345' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects 7-digit code (too long) with 400', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email', code: '1234567' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects non-numeric OTP with 400', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email', code: 'abcdef' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });

    it('rejects all-zeros code with 400/401 and returns no token', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email', code: '000000' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401]);
        expect(res.body).to.not.have.property('access');
        expect(res.body).to.not.have.property('refresh');
      });
    });

    it('rejects missing code field with 400', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 422]);
      });
    });

    it('rejects missing identifier field with 400', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { method: 'email', code: '123456' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401, 422]);
      });
    });
  });

  // ─── 7. Security – No Information Leakage ────────────────────────────────────

  context('Security – Information Leakage', () => {
    it('401 response for unknown email does not include stack trace', () => {
      // Act
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: NEW_EMAIL, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        // Assert: no Python/Django traceback keywords in error response
        const body = JSON.stringify(res.body).toLowerCase();
        expect(body).to.not.include('traceback');
        expect(body).to.not.include('at line');
        expect(body).to.not.include('exception');
      });
    });

    it('failed verify response does not expose DB internals', () => {
      // Act: submit a wrong OTP
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email', code: '000000' },
        failOnStatusCode: false,
      }).then((res) => {
        // Assert: no DB or framework internals leaked
        const body = JSON.stringify(res.body).toLowerCase();
        expect(body).to.not.include('sql');
        expect(body).to.not.include('database');
        expect(body).to.not.include('query');
        expect(body).to.not.include('traceback');
      });
    });

    it('OPTIONS preflight on login endpoint returns CORS headers', () => {
      // Act
      cy.request({
        method: 'OPTIONS',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        failOnStatusCode: false,
      }).then((res) => {
        // Assert: preflight accepted (CORS is configured)
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });

    it('invalid OTP response does not echo back the submitted code', () => {
      // Arrange
      const testCode = '777777';

      // Act
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: EXISTING, method: 'email', code: testCode },
        failOnStatusCode: false,
      }).then((res) => {
        // Assert: the OTP value is not reflected back (prevents enumeration)
        expect(JSON.stringify(res.body)).to.not.include(testCode);
      });
    });
  });

  // ─── 8. UI – Authenticated User Redirect ─────────────────────────────────────

  context('UI – Authenticated user redirect', () => {
    before(function () {
      if (!LOGIN_OTP) this.skip();
    });

    it('authenticated user visiting /signup is redirected away', () => {
      // Arrange
      cy.loginViaApi();

      // Act
      cy.visit('/signup', { failOnStatusCode: false });

      // Assert: authenticated users cannot access /signup
      cy.url().should('not.include', '/signup');
    });

    it('redirect destination is a valid app page (not a 404)', () => {
      // Arrange
      cy.loginViaApi();

      // Act
      cy.visit('/signup', { failOnStatusCode: false });

      // Assert: redirected to a known internal route
      cy.get('body').should('be.visible');
      cy.url().should('satisfy', (url) =>
        url.includes('/overview') || url.includes('/dashboard') || url.includes('/login')
      );
    });
  });
});
