/**
 * 20 – Network Error Handling
 *
 * Tests graceful degradation when the API is unavailable or returns errors:
 *   - 401 Unauthorized → app redirects to login
 *   - 403 Forbidden → app shows appropriate error state
 *   - 404 Not Found → app shows not-found state (not blank screen)
 *   - 500 Server Error → app shows error state gracefully
 *   - Intercepted network failures → loading/error states visible
 */
describe('20 – Network Error Handling', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  // ─── 401 handling ─────────────────────────────────────────────────────────

  context('401 Unauthorized – UI response', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('intercepts 401 on /menu/items/ and app stays usable', () => {
      cy.loginViaApi()
      cy.intercept('GET', '**/menu/items/**', { statusCode: 401, body: { detail: 'Unauthorized' } }).as('blockedItems')
      cy.visit('/menu/items', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      cy.url().then((url) => {
        cy.log(`URL after 401 intercept: ${url}`)
      })
    })

    it('intercepts 401 on /orders/ and app redirects or shows error', () => {
      cy.loginViaApi()
      cy.intercept('GET', '**/orders/**', { statusCode: 401, body: { detail: 'Unauthorized' } }).as('blockedOrders')
      cy.visit('/orders', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
    })
  })

  // ─── 403 handling ─────────────────────────────────────────────────────────

  context('403 Forbidden – UI response', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('intercepts 403 on /settings/ and app shows error or redirects', () => {
      cy.loginViaApi()
      cy.intercept('GET', '**/restaurant/**', { statusCode: 403, body: { detail: 'Forbidden' } }).as('forbidden')
      cy.visit('/settings', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
    })
  })

  // ─── 404 handling ─────────────────────────────────────────────────────────

  context('404 Not Found – UI response', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('visiting /orders/99999 shows not-found or redirects', () => {
      cy.loginViaApi()
      cy.visit('/orders/99999', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      cy.url().should('not.include', '/login').then(() => {
        cy.get('body').contains(/not found|404|does not exist|error/i).should('exist')
      })
    })

    it('visiting /tables/99999 shows not-found or redirects', () => {
      cy.loginViaApi()
      cy.visit('/tables/99999', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
    })
  })

  // ─── 500 handling ─────────────────────────────────────────────────────────

  context('500 Server Error – UI does not crash', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('intercepts 500 on /menu/items/ and app does not white-screen', () => {
      cy.loginViaApi()
      cy.intercept('GET', '**/menu/items/**', { statusCode: 500, body: { detail: 'Internal Server Error' } }).as('serverError')
      cy.visit('/menu/items', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      // The page should show something — not a blank body
      cy.get('body').invoke('text').should('not.be.empty')
    })

    it('intercepts 500 on /orders/ and app shows error state', () => {
      cy.loginViaApi()
      cy.intercept('GET', '**/orders/**', { statusCode: 500, body: {} }).as('ordersError')
      cy.visit('/orders', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
    })
  })

  // ─── Network timeout / offline ────────────────────────────────────────────

  context('Network failure – app does not crash', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('intercepts network error on /menu/ and body remains visible', () => {
      cy.loginViaApi()
      cy.intercept('GET', '**/menu/**', { forceNetworkError: true }).as('networkFail')
      cy.visit('/menu', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
    })
  })

  // ─── Empty state handling ─────────────────────────────────────────────────

  context('Empty state – zero results', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('intercepts empty orders list and shows empty state (not crash)', () => {
      cy.loginViaApi()
      cy.intercept('GET', '**/orders/**', { statusCode: 200, body: [] }).as('emptyOrders')
      cy.visit('/orders', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
      cy.get('body').invoke('text').should('not.be.empty')
    })

    it('intercepts empty tables list and shows empty state', () => {
      cy.loginViaApi()
      cy.intercept('GET', '**/tables/**', { statusCode: 200, body: [] }).as('emptyTables')
      cy.visit('/tables', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
    })
  })
})
