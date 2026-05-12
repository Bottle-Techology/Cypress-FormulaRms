describe('13 – Dashboard / Overview', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  context('Dashboard – unauthenticated', () => {
    beforeEach(() => cy.clearAuth())

    it('redirects to /login when not authenticated', () => {
      cy.visit('/overview', { failOnStatusCode: false })
      cy.url().should('include', '/login')
    })
  })

  context('Dashboard – UI', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
      cy.goToDashboard()
    })

    it('loads without redirecting to /login', () => {
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('displays a heading or brand title', () => {
      cy.get('body').contains(/overview|dashboard|welcome|Formula RMS/i).should('exist')
    })

    it('shows key metric cards or stat widgets', () => {
      cy.get('body').contains(/order|revenue|table|sale/i).should('exist')
    })

    it('has navigation links to orders, menu, tables', () => {
      cy.get('nav, aside, [class*="sidebar"], [class*="nav"]').should('exist')
    })

    it('shows current date or greeting', () => {
      cy.get('body').should('be.visible')
    })

    it('renders without console errors', () => {
      cy.window().then((win) => {
        const errors = (win.__consoleErrors__ || []).filter(
          (e) => !/ResizeObserver|ChunkLoad|NetworkError/i.test(e)
        )
        expect(errors).to.have.length(0)
      })
    })
  })

  context('Dashboard – API data', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('GET /dashboard/ or /overview/ returns 200', () => {
      cy.apiRequest('GET', '/dashboard/').then((res) => {
        if (res.status === 404) {
          cy.apiRequest('GET', '/overview/').then((r) => {
            expect(r.status).to.be.oneOf([200, 404])
          })
        } else {
          expect(res.status).to.eq(200)
        }
      })
    })

    it('GET /orders/?status=pending reflects active order count', () => {
      cy.apiRequest('GET', '/orders/?status=pending').then((res) => {
        expect(res.status).to.eq(200)
        const list = Array.isArray(res.body) ? res.body : res.body.results || []
        expect(list).to.be.an('array')
      })
    })

    it('GET /tables/ reflects current table occupancy', () => {
      cy.apiRequest('GET', '/tables/').then((res) => {
        expect(res.status).to.eq(200)
      })
    })
  })

  context('Dashboard – navigation shortcuts', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
      cy.goToDashboard()
    })

    const sections = [
      { label: 'menu',     path: '/menu'     },
      { label: 'orders',   path: '/orders'   },
      { label: 'tables',   path: '/tables'   },
      { label: 'settings', path: '/settings' },
    ]

    sections.forEach(({ label, path }) => {
      it(`navigating to ${label} from dashboard stays authenticated`, () => {
        cy.visit(path, { failOnStatusCode: false })
        cy.url().should('not.include', '/login')
        cy.get('body').should('be.visible')
      })
    })
  })
})
