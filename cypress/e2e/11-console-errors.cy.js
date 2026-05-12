/**
 * Console-error audit — visits every key page and asserts that no unexpected
 * console.error calls are fired.
 *
 * The global e2e.js support file intercepts console.error and stores each call
 * in win.__consoleErrors__ so we can inspect it after the page loads.
 *
 * Authenticated pages require OTP_CODE env var.
 */
describe('11 – Console Errors', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  // Allow-list for known benign error patterns that should not fail the test.
  const IGNORED_PATTERNS = [
    /ResizeObserver loop/i,
    /Loading chunk/i,
    /ChunkLoadError/i,
    /NetworkError/i,
    /Non-Error promise rejection/i,
  ]

  function getConsoleErrors() {
    return cy.window().then((win) => win.__consoleErrors__ || [])
  }

  function assertNoConsoleErrors() {
    getConsoleErrors().then((errors) => {
      const significant = errors.filter(
        (msg) => !IGNORED_PATTERNS.some((pattern) => pattern.test(msg))
      )
      expect(significant, `Console errors: ${significant.join('\n')}`).to.have.length(0)
    })
  }

  // ─── Public pages ─────────────────────────────────────────────────────────

  context('Public pages', () => {
    it('login page produces no console errors', () => {
      cy.clearAuth()
      cy.visit('/login')
      cy.get('body').should('be.visible')
      assertNoConsoleErrors()
    })
  })

  // ─── Authenticated pages ──────────────────────────────────────────────────

  context('Authenticated pages', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    const pages = [
      { label: 'Overview / Dashboard', path: '/overview'  },
      { label: 'Menu',                 path: '/menu'      },
      { label: 'Orders',               path: '/orders'    },
      { label: 'Tables',               path: '/tables'    },
      { label: 'Settings',             path: '/settings'  },
    ]

    pages.forEach(({ label, path }) => {
      it(`${label} (${path}) produces no console errors`, () => {
        cy.loginViaApi()
        cy.visit(path, { failOnStatusCode: false })
        cy.get('body').should('be.visible')
        cy.wait(500)
        assertNoConsoleErrors()
      })
    })
  })

  // ─── Navigation transitions ───────────────────────────────────────────────

  context('Page-to-page navigation', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('navigating between menu and orders produces no console errors', () => {
      cy.loginViaApi()
      cy.visit('/menu', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      cy.visit('/orders', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      cy.wait(500)
      assertNoConsoleErrors()
    })

    it('navigating between orders and tables produces no console errors', () => {
      cy.loginViaApi()
      cy.visit('/orders', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      cy.visit('/tables', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      cy.wait(500)
      assertNoConsoleErrors()
    })
  })
})
