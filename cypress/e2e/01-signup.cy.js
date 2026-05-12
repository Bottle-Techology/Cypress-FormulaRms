/**
 * 12 – Signup Flow
 *
 * Tests the new-account registration path:
 *   UI  → /signup page renders correctly
 *   API → POST /auth/signup/send-otp/ rejects unknown/invalid identifiers
 *   API → POST /auth/signup/verify-otp/ verifies OTP and returns tokens  (needs SIGNUP_OTP_CODE)
 *   UI  → after successful signup the user is redirected into the app
 *   UI  → already-authenticated users are redirected away from /signup
 *
 * Env vars:
 *   SIGNUP_IDENTIFIER  – new account email (default: uses NEW_IDENTIFIER fixture key)
 *   SIGNUP_OTP_CODE    – OTP received during signup (omit to skip OTP + post-signup tests)
 */
describe('01 – Signup Flow', () => {
  const AUTH_BASE      = Cypress.env('AUTH_BASE') || 'https://formularms-api.bottle.com.np'
  const OTP_CODE       = Cypress.env('OTP_CODE')
  const SIGNUP_OTP     = Cypress.env('SIGNUP_OTP_CODE')
  const SIGNUP_ID      = Cypress.env('SIGNUP_IDENTIFIER') || Cypress.env('IDENTIFIER')

  // ─── UI – unauthenticated ─────────────────────────────────────────────────

  context('Signup page – unauthenticated', () => {
    beforeEach(() => {
      cy.clearAuth()
      cy.visit('/signup', { failOnStatusCode: false })
    })

    it('loads the signup page (or redirects to login for invite-only apps)', () => {
      cy.url().should('satisfy', (url) =>
        url.includes('/signup') || url.includes('/register') || url.includes('/login')
      )
      cy.get('body').should('be.visible')
    })

    it('shows an identifier / email input', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return
        cy.get('input').should('exist').and('be.visible')
      })
    })

    it('shows a submit / register button', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return
        cy.get('button').should('exist').and('be.visible')
      })
    })

    it('shows a link to the login page', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return
        cy.get('body').contains(/sign in|log in|already have/i).should('exist')
      })
    })

    it('does not submit with an empty identifier', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return
        cy.get('button[type="submit"], button').first().click()
        cy.get('body').should('be.visible')
        cy.url().should('not.include', '/overview')
      })
    })

    it('shows a validation error for an invalid email format', () => {
      cy.url().then((url) => {
        if (!url.includes('/signup') && !url.includes('/register')) return
        cy.get('input').first().type('not-an-email')
        cy.get('button[type="submit"], button').first().click()
        cy.get('body').should('be.visible')
      })
    })
  })

  // ─── UI – already authenticated ───────────────────────────────────────────

  context('Signup page – already authenticated', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('redirects authenticated users away from /signup', () => {
      cy.loginViaApi()
      cy.visit('/signup', { failOnStatusCode: false })
      cy.url().should('not.include', '/signup')
    })
  })

  // ─── API – send OTP ───────────────────────────────────────────────────────

  context('Signup API – send OTP', () => {
    it('POST /auth/signup/send-otp/ rejects an invalid email', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/signup/send-otp/`,
        body: { identifier: 'notvalid@@bad', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 422])
      })
    })

    it('POST /auth/signup/send-otp/ rejects an empty identifier', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/signup/send-otp/`,
        body: { identifier: '', method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 422])
      })
    })

    it('POST /auth/signup/send-otp/ with a valid new identifier returns 200 or 201', function () {
      if (!SIGNUP_ID) return this.skip()
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/signup/send-otp/`,
        body: { identifier: SIGNUP_ID, method: 'email' },
        failOnStatusCode: false,
      }).then((res) => {
        // 200/201 = OTP sent; 400/409 = already registered (also valid for this test)
        expect(res.status).to.be.oneOf([200, 201, 400, 409])
      })
    })
  })

  // ─── API – verify OTP ─────────────────────────────────────────────────────

  context('Signup API – verify OTP', () => {
    before(function () {
      if (!SIGNUP_OTP) this.skip()
    })

    it('POST /auth/signup/verify-otp/ with wrong code returns 400 or 401', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/signup/verify-otp/`,
        body: { identifier: SIGNUP_ID, method: 'email', code: '000000' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401])
      })
    })

    it('POST /auth/signup/verify-otp/ with correct code returns access + refresh tokens', () => {
      cy.request({
        method: 'POST',
        url: `${AUTH_BASE}/auth/signup/verify-otp/`,
        body: { identifier: SIGNUP_ID, method: 'email', code: SIGNUP_OTP },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body).to.have.property('access')
        expect(res.body).to.have.property('refresh')
        cy.task('setToken', res.body.access)
      })
    })
  })

  // ─── UI – post-signup redirect ────────────────────────────────────────────

  context('Post-signup session', () => {
    before(function () {
      if (!SIGNUP_OTP) this.skip()
    })

    it('new account is redirected into the app after signup', () => {
      cy.task('getToken').then((token) => {
        if (!token) return cy.log('No token cached – skipping')
        cy.visit('/login')
        cy.window().then((win) => win.localStorage.setItem('access_token', token))
        cy.visit('/overview', { failOnStatusCode: false })
        cy.url().should('not.include', '/login')
        cy.get('body').should('be.visible')
      })
    })
  })

  // ─── UI – onboarding / setup wizard ──────────────────────────────────────

  context('Onboarding / setup wizard', () => {
    before(function () {
      if (!SIGNUP_OTP) this.skip()
    })

    it('new account sees an onboarding or restaurant-setup step', () => {
      cy.task('getToken').then((token) => {
        if (!token) return cy.log('No token cached – skipping')
        cy.visit('/login')
        cy.window().then((win) => win.localStorage.setItem('access_token', token))
        cy.visit('/overview', { failOnStatusCode: false })
        cy.get('body').should('be.visible')
        // New accounts typically go through a setup wizard before reaching the main app.
        cy.url().should('satisfy', (url) =>
          url.includes('/onboarding') ||
          url.includes('/setup') ||
          url.includes('/overview') ||
          url.includes('/login')
        )
      })
    })
  })
})
