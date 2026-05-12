/**
 * 24 – Performance
 *
 * Validates that key pages and API endpoints respond within acceptable thresholds.
 *
 * Thresholds (configurable via Cypress.env):
 *   PAGE_LOAD_MS     – max full page-load time (default: 5000ms)
 *   API_RESPONSE_MS  – max API round-trip (default: 2000ms)
 *
 * Uses the Navigation Timing API and cy.request() timing.
 */
describe('24 – Performance', () => {
  const OTP_CODE       = Cypress.env('OTP_CODE')
  const PAGE_THRESHOLD = Cypress.env('PAGE_LOAD_MS')    || 5000
  const API_THRESHOLD  = Cypress.env('API_RESPONSE_MS') || 2000

  // ─── Public pages ─────────────────────────────────────────────────────────

  context(`Public pages load in < ${PAGE_THRESHOLD}ms`, () => {
    it('login page loads within threshold', () => {
      cy.clearAuth()
      const t0 = Date.now()
      cy.visit('/login').then(() => {
        const elapsed = Date.now() - t0
        cy.log(`/login loaded in ${elapsed}ms`)
        expect(elapsed).to.be.lt(PAGE_THRESHOLD)
      })
    })

    it('login page Navigation Timing domContentLoaded < threshold', () => {
      cy.clearAuth()
      cy.visit('/login')
      cy.window().then((win) => {
        const [entry] = win.performance.getEntriesByType('navigation')
        if (!entry) return cy.log('No navigation entry – skipping')
        const dcl = entry.domContentLoadedEventEnd - entry.startTime
        cy.log(`domContentLoaded: ${Math.round(dcl)}ms`)
        expect(dcl).to.be.lt(PAGE_THRESHOLD)
      })
    })
  })

  // ─── Authenticated pages ──────────────────────────────────────────────────

  context(`Authenticated pages load in < ${PAGE_THRESHOLD}ms`, () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    const pages = [
      { label: 'Overview', path: '/overview' },
      { label: 'Menu',     path: '/menu'     },
      { label: 'Orders',   path: '/orders'   },
      { label: 'Tables',   path: '/tables'   },
      { label: 'Settings', path: '/settings' },
    ]

    pages.forEach(({ label, path }) => {
      it(`${label} (${path}) loads within threshold`, () => {
        cy.loginViaApi()
        const t0 = Date.now()
        cy.visit(path, { failOnStatusCode: false }).then(() => {
          const elapsed = Date.now() - t0
          cy.log(`${path} loaded in ${elapsed}ms`)
          expect(elapsed).to.be.lt(PAGE_THRESHOLD)
        })
        cy.get('body').should('be.visible')
      })
    })
  })

  // ─── API response times ───────────────────────────────────────────────────

  context(`API endpoints respond in < ${API_THRESHOLD}ms`, () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    const endpoints = [
      '/menu/menus/',
      '/menu/categories/',
      '/menu/items/',
      '/orders/',
      '/tables/',
    ]

    endpoints.forEach((endpoint) => {
      it(`GET ${endpoint} responds within API threshold`, () => {
        const t0 = Date.now()
        cy.apiRequest('GET', endpoint).then((res) => {
          const elapsed = Date.now() - t0
          cy.log(`${endpoint} → ${res.status} in ${elapsed}ms`)
          expect(res.status).to.be.lt(500)
          expect(elapsed).to.be.lt(API_THRESHOLD)
        })
      })
    })
  })

  // ─── Navigation Timing – authenticated ───────────────────────────────────

  context('Navigation Timing – authenticated', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('overview LCP (largest contentful paint) proxy < threshold', () => {
      cy.loginViaApi()
      cy.visit('/overview', { failOnStatusCode: false })
      cy.window().then((win) => {
        const [entry] = win.performance.getEntriesByType('navigation')
        if (!entry) return cy.log('No navigation entry – skipping')
        const loadEvent = entry.loadEventEnd - entry.startTime
        cy.log(`loadEventEnd: ${Math.round(loadEvent)}ms`)
        expect(loadEvent).to.be.lt(PAGE_THRESHOLD)
      })
    })
  })

  // ─── Large list rendering ─────────────────────────────────────────────────

  context('Large list rendering', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    it('renders /menu/items/ with all items without visible freeze', () => {
      cy.loginViaApi()
      const t0 = Date.now()
      cy.visit('/menu/items', { failOnStatusCode: false })
      cy.get('body').should('be.visible').then(() => {
        const elapsed = Date.now() - t0
        cy.log(`Items page interactive in ${elapsed}ms`)
        expect(elapsed).to.be.lt(PAGE_THRESHOLD)
      })
    })

    it('renders /orders/ list without visible freeze', () => {
      cy.loginViaApi()
      const t0 = Date.now()
      cy.visit('/orders', { failOnStatusCode: false })
      cy.get('body').should('be.visible').then(() => {
        const elapsed = Date.now() - t0
        cy.log(`Orders page interactive in ${elapsed}ms`)
        expect(elapsed).to.be.lt(PAGE_THRESHOLD)
      })
    })
  })
})
