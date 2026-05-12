/**
 * 31 – Clear all takeaway (and dine-in) orders
 * Run:
 *   npx cypress run --browser chrome \
 *     --spec cypress/e2e/31-clear-orders.cy.js \
 *     --env OTP_CODE=<code>
 */
describe('Clear All Orders', () => {
  before(function () {
    if (!Cypress.env('OTP_CODE')) this.skip()
  })

  beforeEach(() => cy.loginViaApi())

  it('deletes / cancels every order', () => {
    cy.apiRequest('GET', '/orders/?limit=200').then((res) => {
      const orders = Array.isArray(res.body) ? res.body : res.body.results || []
      const takeaway = orders.filter(o => o.type === 'takeaway')
      const dineIn   = orders.filter(o => o.type === 'dine_in')
      cy.log(`Total: ${orders.length} | Takeaway: ${takeaway.length} | Dine-in: ${dineIn.length}`)
      orders.forEach(o => cy.log(`  order ${o.id} type=${o.type} status=${o.status}`))

      if (!orders.length) { cy.log('Nothing to clear.'); return }

      cy.wrap(orders).each((order) => {
        // Try DELETE first
        cy.apiRequest('DELETE', `/orders/${order.id}/`).then((d) => {
          if ([200, 204].includes(d.status)) {
            cy.log(`DELETED [${order.type}] ${order.id}`)
            return
          }
          // Try bill → then delete (some orders need billing before deletion)
          cy.apiRequest('POST', `/orders/${order.id}/bill/`, {}).then(() => {
            cy.apiRequest('DELETE', `/orders/${order.id}/`).then((d2) => {
              if ([200, 204].includes(d2.status)) {
                cy.log(`BILLED+DELETED [${order.type}] ${order.id}`)
                return
              }
              // Try cancel action
              cy.apiRequest('POST', `/orders/${order.id}/cancel/`, {}).then((c) => {
                if ([200, 201, 204].includes(c.status)) {
                  cy.log(`CANCELLED [${order.type}] ${order.id}`)
                  return
                }
                // Try various terminal status patches
                const statuses = ['cancelled', 'completed', 'closed', 'done']
                cy.wrap(statuses).each((s) => {
                  cy.apiRequest('PATCH', `/orders/${order.id}/`, { status: s }).then((p) => {
                    cy.log(`PATCH→${s} [${p.status}] [${order.type}] ${order.id}: ${JSON.stringify(p.body).slice(0,100)}`)
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  it('confirms orders are cleared', () => {
    cy.apiRequest('GET', '/orders/?limit=200').then((res) => {
      const orders = Array.isArray(res.body) ? res.body : res.body.results || []
      const active  = orders.filter(o => ['open','pending','preparing','ready'].includes(o.status))
      cy.log(`Active orders remaining: ${active.length} / ${orders.length} total`)
      if (active.length > 0) {
        active.forEach(o => cy.log(`  Still active: [${o.type}] ${o.id} status=${o.status} table=${o.table}`))
        cy.writeFile('cypress/fixtures/stuck-orders.json', active)
      }
      expect(active.length).to.eq(0)
    })
  })
})
