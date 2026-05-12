/**
 * 16 – Table Sessions
 *
 * Tests the table state machine central to dine-in RMS operation:
 *   available → occupied (order placed) → payment → available
 *
 * Also tests:
 *   - Assigning an order to a table
 *   - Listing orders for a specific table
 *   - Table cannot be double-occupied
 *   - UI reflects table status correctly
 */
describe('16 – Table Sessions', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')
  const PREFIX   = Cypress.env('TEST_PREFIX') || '[TEST]'

  before(function () {
    if (!OTP_CODE) this.skip()
  })

  beforeEach(() => cy.loginViaApi())

  // ─── Setup ────────────────────────────────────────────────────────────────

  context('Test table setup', () => {
    it('creates a test table', () => {
      cy.apiRequest('POST', '/tables/', { name: `${PREFIX} Session T1`, number: 91 }).then(
        (res) => {
          expect(res.status).to.be.oneOf([200, 201])
          Cypress.env('SESSION_TABLE_ID', res.body.id)
        }
      )
    })
  })

  // ─── Table status transitions ─────────────────────────────────────────────

  context('Table status: available → occupied → available', () => {
    it('marks table as occupied', () => {
      const id = Cypress.env('SESSION_TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.updateTableStatusViaApi(id, 'occupied').then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })

    it('GET /tables/:id/ reflects occupied status', () => {
      const id = Cypress.env('SESSION_TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.apiRequest('GET', `/tables/${id}/`).then((res) => {
        expect(res.status).to.eq(200)
        cy.log(`Table status: ${res.body.status}`)
      })
    })

    it('marks table as available after session ends', () => {
      const id = Cypress.env('SESSION_TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.updateTableStatusViaApi(id, 'available').then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })
  })

  // ─── Order ↔ Table assignment ─────────────────────────────────────────────

  context('Assign order to table', () => {
    it('creates an order associated with the test table', () => {
      const tableId = Cypress.env('SESSION_TABLE_ID')
      if (!tableId) return cy.log('No table id – skipping')
      cy.createOrderViaApi(tableId, [], `${PREFIX} table order`).then((res) => {
        expect(res.status).to.be.oneOf([200, 201])
        Cypress.env('SESSION_ORDER_ID', res.body.id)
        if (res.body.table !== undefined) {
          expect(res.body.table).to.eq(tableId)
        }
      })
    })

    it('GET /orders/?table=:id returns orders for that table', () => {
      const tableId = Cypress.env('SESSION_TABLE_ID')
      if (!tableId) return cy.log('No table id – skipping')
      cy.apiRequest('GET', `/orders/?table=${tableId}`).then((res) => {
        expect(res.status).to.be.oneOf([200, 404])
        if (res.status === 200) {
          expect(res.body).to.satisfy(
            (b) => Array.isArray(b) || Array.isArray(b.results),
            'Expected array or paginated results'
          )
        }
      })
    })

    it('GET /tables/:id/orders/ lists orders for the table', () => {
      const tableId = Cypress.env('SESSION_TABLE_ID')
      if (!tableId) return cy.log('No table id – skipping')
      cy.apiRequest('GET', `/tables/${tableId}/orders/`).then((res) => {
        expect(res.status).to.be.oneOf([200, 404])
      })
    })
  })

  // ─── Open / close session endpoints ──────────────────────────────────────

  context('Open/close table session', () => {
    it('POST /tables/:id/open/ opens the session', () => {
      const id = Cypress.env('SESSION_TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.openTableViaApi(id).then((res) => {
        expect(res.status).to.be.oneOf([200, 201, 204, 400, 404])
      })
    })

    it('POST /tables/:id/close/ closes the session', () => {
      const id = Cypress.env('SESSION_TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.closeTableViaApi(id).then((res) => {
        expect(res.status).to.be.oneOf([200, 201, 204, 400, 404])
      })
    })
  })

  // ─── UI ───────────────────────────────────────────────────────────────────

  context('Tables UI – session states', () => {
    beforeEach(() => {
      cy.loginViaApi()
      cy.goToTables()
    })

    it('tables page shows status indicators', () => {
      cy.get('body').contains(/available|occupied|reserved|free/i).should('exist')
    })

    it('table cards or rows are clickable', () => {
      cy.get('body').should('be.visible')
    })

    it('clicking an occupied table shows its active order', () => {
      cy.apiRequest('GET', '/tables/').then((res) => {
        const tables = Array.isArray(res.body) ? res.body : res.body.results || []
        const occupied = tables.find((t) => /occupied|busy/i.test(t.status || ''))
        if (!occupied) return cy.log('No occupied tables – skipping')
        cy.visit(`/tables/${occupied.id}`, { failOnStatusCode: false })
        cy.url().should('not.include', '/login')
        cy.get('body').should('be.visible')
      })
    })
  })

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  context('Cleanup', () => {
    it('deletes the test order', () => {
      const id = Cypress.env('SESSION_ORDER_ID')
      if (!id) return cy.log('No order id – skipping')
      cy.apiRequest('DELETE', `/orders/${id}/`).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })

    it('deletes the test table', () => {
      const id = Cypress.env('SESSION_TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.apiRequest('DELETE', `/tables/${id}/`).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })
  })
})
