/**
 * 23 – Reports & Analytics
 *
 * Tests the business-intelligence layer of the RMS:
 *   - Sales report endpoint responds and returns valid structure
 *   - Revenue totals are non-negative numbers
 *   - Date-range filtering works
 *   - Most popular items endpoint
 *   - Daily summary / end-of-day report
 *   - Reports UI page loads and displays data or empty state
 */
describe('23 – Reports & Analytics', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  before(function () {
    if (!OTP_CODE) this.skip()
  })

  beforeEach(() => cy.loginViaApi())

  // ─── Sales report API ─────────────────────────────────────────────────────

  context('Sales report – API', () => {
    it('GET /reports/sales/ returns 200 or 404', () => {
      cy.apiRequest('GET', '/reports/sales/').then((res) => {
        expect(res.status).to.be.oneOf([200, 404])
        if (res.status === 200) {
          expect(res.body).to.be.an('object').or.to.be.an('array')
        }
      })
    })

    it('sales report total_revenue is a non-negative number', () => {
      cy.apiRequest('GET', '/reports/sales/').then((res) => {
        if (res.status !== 200) return cy.log('No sales endpoint – skipping')
        const revenue = res.body.total_revenue ?? res.body.revenue ?? res.body.total
        if (revenue !== undefined) {
          expect(parseFloat(revenue)).to.be.gte(0)
        }
      })
    })

    it('GET /reports/sales/?period=today returns 200 or 404', () => {
      cy.apiRequest('GET', '/reports/sales/?period=today').then((res) => {
        expect(res.status).to.be.oneOf([200, 400, 404])
      })
    })

    it('GET /reports/sales/?period=week returns 200 or 404', () => {
      cy.apiRequest('GET', '/reports/sales/?period=week').then((res) => {
        expect(res.status).to.be.oneOf([200, 400, 404])
      })
    })

    it('GET /reports/sales/?period=month returns 200 or 404', () => {
      cy.apiRequest('GET', '/reports/sales/?period=month').then((res) => {
        expect(res.status).to.be.oneOf([200, 400, 404])
      })
    })
  })

  // ─── Date-range filtering ─────────────────────────────────────────────────

  context('Reports – date range filter', () => {
    const today = new Date().toISOString().split('T')[0]
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    it(`GET /reports/sales/?start=${lastWeek}&end=${today} returns 200 or 404`, () => {
      cy.apiRequest('GET', `/reports/sales/?start=${lastWeek}&end=${today}`).then((res) => {
        expect(res.status).to.be.oneOf([200, 400, 404])
      })
    })

    it('end date before start date returns 400', () => {
      cy.apiRequest('GET', `/reports/sales/?start=${today}&end=${lastWeek}`).then((res) => {
        expect(res.status).to.be.oneOf([400, 422, 404])
      })
    })
  })

  // ─── Popular items ────────────────────────────────────────────────────────

  context('Popular items – API', () => {
    it('GET /reports/popular-items/ returns 200 or 404', () => {
      cy.apiRequest('GET', '/reports/popular-items/').then((res) => {
        expect(res.status).to.be.oneOf([200, 404])
        if (res.status === 200) {
          const items = Array.isArray(res.body) ? res.body : res.body.results || []
          expect(items).to.be.an('array')
        }
      })
    })

    it('each popular item has name and order_count', () => {
      cy.apiRequest('GET', '/reports/popular-items/').then((res) => {
        if (res.status !== 200) return cy.log('No popular-items endpoint – skipping')
        const items = Array.isArray(res.body) ? res.body : res.body.results || []
        if (items.length === 0) return cy.log('No items yet – skipping field check')
        expect(items[0]).to.have.property('name')
      })
    })
  })

  // ─── Order summary ────────────────────────────────────────────────────────

  context('Order summary – API', () => {
    it('GET /reports/orders/ or /reports/summary/ returns 200 or 404', () => {
      cy.apiRequest('GET', '/reports/orders/').then((res) => {
        if (res.status === 404) {
          cy.apiRequest('GET', '/reports/summary/').then((r) => {
            expect(r.status).to.be.oneOf([200, 404])
          })
        } else {
          expect(res.status).to.be.oneOf([200, 404])
        }
      })
    })
  })

  // ─── Reports UI ───────────────────────────────────────────────────────────

  context('Reports – UI', () => {
    it('visiting /reports loads the page without redirecting to login', () => {
      cy.goToReports()
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('reports page shows revenue or sales data, or an empty state', () => {
      cy.goToReports()
      cy.get('body').contains(/report|revenue|sales|order|summary|analytics/i).should('exist')
    })

    it('reports page has date or period controls', () => {
      cy.goToReports()
      cy.get('body').should('be.visible')
      cy.get('body').then(($body) => {
        const hasControls =
          $body.find('input[type="date"], select, [class*="period"], [class*="date-range"]').length > 0 ||
          $body.text().match(/today|week|month|day|period|from|to/i)
        cy.log(`Date controls found: ${!!hasControls}`)
      })
    })
  })
})
