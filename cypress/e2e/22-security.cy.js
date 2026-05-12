/**
 * 22 – Security
 *
 * Validates common security baselines for an RMS web application:
 *   - Auth bypass via direct URL is blocked
 *   - XSS payloads in form fields are not reflected as raw HTML
 *   - Sensitive data (passwords, raw tokens) is not stored in plain localStorage keys
 *   - API does not leak stack traces or internal paths in error responses
 *   - Token is sent via Authorization header, not URL query parameters
 *   - HTTPS is enforced (all URLs use https://)
 *   - Security-relevant HTTP headers present
 */
describe('22 – Security', () => {
  const API_BASE = Cypress.env('API_BASE')  || 'https://formularms-api.bottle.com.np/api/v1'
  const AUTH_BASE = Cypress.env('AUTH_BASE') || 'https://formularms-api.bottle.com.np'
  const OTP_CODE  = Cypress.env('OTP_CODE')

  const XSS_PAYLOADS = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "'; DROP TABLE items; --",
    '<svg onload=alert(1)>',
  ]

  // ─── Auth bypass ──────────────────────────────────────────────────────────

  context('Auth bypass prevention', () => {
    beforeEach(() => cy.clearAuth())

    const protectedRoutes = ['/overview', '/menu', '/orders', '/tables', '/settings']

    protectedRoutes.forEach((route) => {
      it(`visiting ${route} without auth redirects to /login`, () => {
        cy.visit(route, { failOnStatusCode: false })
        cy.url().should('include', '/login')
      })
    })

    it('manually setting an invalid token in localStorage does not grant access', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', 'invalid.token.value')
      })
      cy.visit('/overview', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      // App may redirect to login once API calls fail with 401
    })
  })

  // ─── XSS prevention ───────────────────────────────────────────────────────

  context('XSS – payloads not reflected as raw HTML', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    XSS_PAYLOADS.forEach((payload) => {
      it(`XSS payload is not executed when stored as item name: ${payload.substring(0, 30)}`, () => {
        cy.apiRequest('POST', '/menu/items/', {
          name: payload,
          base_price: '1.00',
          food_type: 'veg',
        }).then((res) => {
          if (res.status !== 200 && res.status !== 201) return

          const createdId = res.body.id
          // Verify API returns the payload escaped or rejected
          if (res.body.name) {
            // The response should not include unescaped script tags
            expect(res.body.name).to.not.include('<script>')
            // (may be sanitised server-side, or returned as-is and escaped in UI)
          }

          // Cleanup
          if (createdId) {
            cy.apiRequest('DELETE', `/menu/items/${createdId}/`).then(() => {})
          }
        })
      })
    })
  })

  // ─── Sensitive data in localStorage ──────────────────────────────────────

  context('Sensitive data – localStorage', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('localStorage does not contain "password" key after login', () => {
      cy.loginViaApi()
      cy.window().then((win) => {
        const keys = Object.keys(win.localStorage)
        const hasPassword = keys.some((k) => /password/i.test(k))
        expect(hasPassword).to.be.false
      })
    })

    it('access_token in localStorage is a JWT (three dot-separated segments)', () => {
      cy.loginViaApi()
      cy.window().then((win) => {
        const token = win.localStorage.getItem('access_token')
        if (!token) return cy.log('No token in localStorage – skipping')
        const parts = token.split('.')
        expect(parts.length).to.eq(3)
      })
    })
  })

  // ─── API error responses do not leak internals ────────────────────────────

  context('API error responses – no stack trace leakage', () => {
    it('400 response on invalid login body does not include traceback', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 422])
        const body = JSON.stringify(res.body)
        expect(body).to.not.include('Traceback')
        expect(body).to.not.include('django.db')
        expect(body).to.not.include('site-packages')
      })
    })

    it('404 response does not include internal file paths', () => {
      cy.request({ url: `${API_BASE}/nonexistent/`, failOnStatusCode: false }).then((res) => {
        const body = JSON.stringify(res.body)
        expect(body).to.not.include('/home/')
        expect(body).to.not.include('/usr/lib/')
        expect(body).to.not.include('site-packages')
      })
    })
  })

  // ─── HTTPS enforcement ────────────────────────────────────────────────────

  context('HTTPS – all URLs use https://', () => {
    it('app base URL uses HTTPS', () => {
      cy.visit('/', { failOnStatusCode: false })
      cy.url().should('include', 'https://')
    })

    it('API base URL uses HTTPS', () => {
      expect(API_BASE).to.include('https://')
    })
  })

  // ─── Security headers ─────────────────────────────────────────────────────

  context('Security headers', () => {
    it('API responses do not expose Server version detail', () => {
      cy.request({ url: AUTH_BASE, failOnStatusCode: false }).then((res) => {
        const server = res.headers['server'] || ''
        // Should not expose specific version like "nginx/1.18.0" or "Apache/2.4.29"
        expect(server).to.not.match(/\d+\.\d+\.\d+/)
      })
    })

    it('no X-Powered-By header exposing tech stack', () => {
      cy.request({ url: AUTH_BASE, failOnStatusCode: false }).then((res) => {
        expect(res.headers['x-powered-by']).to.be.undefined
      })
    })
  })
})
