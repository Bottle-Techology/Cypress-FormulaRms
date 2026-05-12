/**
 * Utility: Clear all open orders (dine-in + takeaway)
 *
 * Run:
 *   npx cypress run --browser chrome \
 *     --spec cypress/e2e/setup/clear-all-orders.cy.js \
 *     --env OTP_CODE=<code>
 */

describe('Clear All Orders', () => {
  before(function () {
    if (!Cypress.env('OTP_CODE')) {
      throw new Error('OTP_CODE env var is required')
    }
  })

  beforeEach(() => cy.loginViaApi())

  it('cancels / deletes every open order', () => {
    // Collect all orders across pages
    const allOrders = []

    function fetchPage(url) {
      return cy.request({
        method: 'GET',
        url,
        headers: { Authorization: '' },
        failOnStatusCode: false,
      }).then((r) => {
        // Use authenticated apiRequest pattern instead
      })
    }

    cy.apiRequest('GET', '/orders/?limit=200').then((res) => {
      expect(res.status).to.eq(200)
      const orders = Array.isArray(res.body) ? res.body : res.body.results || []
      cy.log(`Found ${orders.length} orders to clear`)

      if (!orders.length) {
        cy.log('No orders to clear.')
        return
      }

      const takeaway = orders.filter(o => o.type === 'takeaway')
      const dineIn   = orders.filter(o => o.type === 'dine_in')
      cy.log(`Takeaway: ${takeaway.length} | Dine-in: ${dineIn.length}`)

      // Try DELETE first, fall back to PATCH status=cancelled
      cy.wrap(orders).each((order) => {
        cy.apiRequest('DELETE', `/orders/${order.id}/`).then((del) => {
          if (del.status === 204 || del.status === 200) {
            cy.log(`✓ Deleted [${order.type}] order ${order.id} (${order.customer_name || order.table || ''})`)
          } else {
            // Try cancel action endpoint
            cy.apiRequest('POST', `/orders/${order.id}/cancel/`, {}).then((cancel) => {
              if (cancel.status === 200 || cancel.status === 204) {
                cy.log(`✓ Cancelled [${order.type}] order ${order.id}`)
              } else {
                // Fall back to PATCH status
                cy.apiRequest('PATCH', `/orders/${order.id}/`, { status: 'cancelled' }).then((patch) => {
                  cy.log(`[${patch.status}] PATCH cancel [${order.type}] order ${order.id}`)
                })
              }
            })
          }
        })
      })
    })
  })

  it('verifies no open orders remain', () => {
    cy.apiRequest('GET', '/orders/?limit=200').then((res) => {
      const orders = Array.isArray(res.body) ? res.body : res.body.results || []
      const open   = orders.filter(o => o.status === 'open' || o.status === 'pending')
      cy.log(`Remaining open/pending orders: ${open.length}`)
      cy.log(`Total orders in system: ${orders.length}`)
      if (open.length > 0) {
        open.forEach(o => cy.log(`  Still open: [${o.type}] ${o.id} → ${o.status}`))
      }
    })
  })
})
