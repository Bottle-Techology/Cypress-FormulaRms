/**
 * Responsive tests — verifies that key pages render without layout breaks
 * across mobile, tablet, laptop, and desktop viewports.
 *
 * Authenticated pages require OTP_CODE env var.
 */
describe('10 – Responsive Design', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  const viewports = [
    { label: 'Mobile  (375×812)',   width: 375,  height: 812  },
    { label: 'Tablet  (768×1024)',  width: 768,  height: 1024 },
    { label: 'Laptop  (1280×800)',  width: 1280, height: 800  },
    { label: 'Desktop (1920×1080)', width: 1920, height: 1080 },
  ]

  // ─── Public pages ─────────────────────────────────────────────────────────

  context('Login page', () => {
    viewports.forEach(({ label, width, height }) => {
      it(`renders correctly on ${label}`, () => {
        cy.viewport(width, height)
        cy.clearAuth()
        cy.visit('/login')
        cy.get('body').should('be.visible')
        cy.get('input').should('exist').and('be.visible')
        cy.get('button').should('exist').and('be.visible')
      })
    })
  })

  // ─── Authenticated pages ──────────────────────────────────────────────────

  context('Overview / Dashboard', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    viewports.forEach(({ label, width, height }) => {
      it(`renders correctly on ${label}`, () => {
        cy.viewport(width, height)
        cy.loginViaApi()
        cy.visit('/overview', { failOnStatusCode: false })
        cy.get('body').should('be.visible')
        cy.url().should('not.include', '/login')
      })
    })
  })

  context('Menu page', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    viewports.forEach(({ label, width, height }) => {
      it(`renders correctly on ${label}`, () => {
        cy.viewport(width, height)
        cy.loginViaApi()
        cy.visit('/menu', { failOnStatusCode: false })
        cy.get('body').should('be.visible')
        cy.url().should('not.include', '/login')
      })
    })
  })

  context('Orders page', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    viewports.forEach(({ label, width, height }) => {
      it(`renders correctly on ${label}`, () => {
        cy.viewport(width, height)
        cy.loginViaApi()
        cy.visit('/orders', { failOnStatusCode: false })
        cy.get('body').should('be.visible')
        cy.url().should('not.include', '/login')
      })
    })
  })

  context('Tables page', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    viewports.forEach(({ label, width, height }) => {
      it(`renders correctly on ${label}`, () => {
        cy.viewport(width, height)
        cy.loginViaApi()
        cy.visit('/tables', { failOnStatusCode: false })
        cy.get('body').should('be.visible')
        cy.url().should('not.include', '/login')
      })
    })
  })

  context('Settings page', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    viewports.forEach(({ label, width, height }) => {
      it(`renders correctly on ${label}`, () => {
        cy.viewport(width, height)
        cy.loginViaApi()
        cy.visit('/settings', { failOnStatusCode: false })
        cy.get('body').should('be.visible')
        cy.url().should('not.include', '/login')
      })
    })
  })

  // ─── Layout integrity checks ──────────────────────────────────────────────

  context('Layout integrity – no horizontal overflow', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('login page has no horizontal scrollbar on mobile', () => {
      cy.viewport(375, 812)
      cy.clearAuth()
      cy.visit('/login')
      cy.window().then((win) => {
        expect(win.document.documentElement.scrollWidth).to.lte(375)
      })
    })

    it('authenticated app has no horizontal scrollbar on mobile', () => {
      cy.viewport(375, 812)
      cy.loginViaApi()
      cy.visit('/overview', { failOnStatusCode: false })
      cy.window().then((win) => {
        expect(win.document.documentElement.scrollWidth).to.lte(375 + 15)
      })
    })
  })
})
