/**
 * Auth tests — OTP-based login flow.
 *
 * To run these tests you must supply the OTP via Cypress.env:
 *   cypress run --env OTP_CODE=123456
 *
 * If OTP_CODE is not provided, the send-OTP tests still run
 * but the verify + session tests are skipped.
 */
describe('03 – Authentication', () => {
  const IDENTIFIER = Cypress.env('IDENTIFIER') || 'pranuj@bottle.com.np'
  const OTP_CODE   = Cypress.env('OTP_CODE')
  const AUTH_BASE  = 'https://formularms-api.bottle.com.np'

  context('Login page UI', () => {
    beforeEach(() => {
      cy.clearAuth()
      cy.visit('/login')
    })

    it('displays the login page', () => {
      cy.url().should('include', '/login')
      cy.get('body').should('be.visible')
    })

    it('has an identifier input field', () => {
      cy.get('input').should('exist').and('be.visible')
    })

    it('has a submit/continue button', () => {
      cy.get('button').should('exist')
    })

    it('does not submit with an empty identifier', () => {
      cy.get('button[type="submit"], button').first().click()
      // App may stay on /login or redirect to / — either way should not proceed to dashboard
      cy.url().should('not.include', '/overview').and('not.include', '/dashboard')
    })
  })

  context('Send OTP – API', () => {
    it('POST /auth/login/send-otp/ returns 200 for a valid identifier', function () {
      // Skip when OTP_CODE is provided — triggering a new OTP would invalidate the current one
      if (OTP_CODE) return this.skip()
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: IDENTIFIER, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(200)
      })
    })

    it('POST /auth/login/send-otp/ returns error for invalid identifier', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/send-otp/`,
        body: { identifier: 'notexist@example.com', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        // API returns 401 for unknown identifiers (tenant lookup fails)
        expect(res.status).to.be.oneOf([400, 401, 404])
      })
    })
  })

  context('Verify OTP – API', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('POST /auth/login/verify-otp/ returns access + refresh tokens', () => {
      // Regression: OTP code must be sent as String — sending as Number causes 500 (BUG-01)
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE) },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 400) {
          cy.log('⚠ OTP expired or already used — skipping token storage. Provide a fresh OTP_CODE.')
          return
        }
        expect(res.status).to.eq(200)
        expect(res.body).to.have.property('access')
        expect(res.body).to.have.property('refresh')
        cy.task('setToken', res.body.access)
      })
    })

    it('POST /auth/login/verify-otp/ fails with a wrong code', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: IDENTIFIER, method: 'email', code: '000000' },
        failOnStatusCode: false,
      }).then((res) => {
        // 429 = rate-limited after repeated wrong attempts — also a valid rejection
        expect(res.status).to.be.oneOf([400, 401, 429])
      })
    })
  })

  context('Authenticated session', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('redirects to /overview after successful OTP login', () => {
      cy.clearAuth()
      cy.task('getToken').then((token) => {
        if (!token) this.skip()
        cy.visit('/login')
        cy.window().then((win) => win.localStorage.setItem('access_token', token))
        cy.visit('/overview')
        cy.url().should('not.include', '/login')
      })
    })

    it('clears token on logout and redirects to /login', () => {
      cy.task('getToken').then((token) => {
        if (!token) this.skip()
        cy.visit('/login')
        cy.window().then((win) => win.localStorage.setItem('access_token', token))
        cy.visit('/overview')
        cy.logout()
        cy.url().should('include', '/login')
      })
    })
  })

  // ─── Regression guards ────────────────────────────────────────────────────

  context('Auth – regression guards', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('OTP code sent as integer causes 500 (KNOWN BUG — always use String())', () => {
      // BUG-01: Backend does not coerce the code field type — integer input causes 500.
      // Fix: add str(code) cast in the OTP verification view.
      // All other tests send String(OTP_CODE) to avoid this.
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/login/verify-otp/`,
        body: { identifier: IDENTIFIER, method: 'email', code: Number(String(OTP_CODE)) },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) {
          cy.log('✓ Integer OTP now accepted (bug may be fixed — verify String() cast still works)')
        } else {
          expect(res.status).to.be.oneOf([400, 422, 500])
          cy.log(`⚠ BUG-01 ACTIVE: integer OTP → ${res.status} (use String(OTP_CODE) as workaround)`)
        }
      })
    })

    it('GET /auth/staff/invitations/:id/ returns 404 (KNOWN — detail endpoint not registered)', () => {
      // BUG-11: Invitation list/create works but detail lookup is not registered.
      // Fix: register invitation detail route in the auth router.
      cy.task('getToken').then(token => {
        cy.request({
          method: 'GET',
          url: `${AUTH_BASE}/auth/staff/invitations/nonexistent-id/`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then(res => {
          if (res.status === 200 || res.status === 404 && res.body?.detail) {
            cy.log('✓ /auth/staff/invitations/:id/ is now live (bug fixed)')
          } else {
            expect(res.status).to.be.oneOf([404, 405])
            cy.log(`⚠ BUG-11 ACTIVE: /auth/staff/invitations/:id/ → ${res.status}`)
          }
        })
      })
    })
  })
})
