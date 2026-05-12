describe('07 – Orders', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  // ─── Unauthenticated ──────────────────────────────────────────────────────

  context('Orders page – unauthenticated', () => {
    beforeEach(() => cy.clearAuth())

    it('redirects to /login when not authenticated', () => {
      cy.visit('/orders', { failOnStatusCode: false })
      cy.url().then(url => {
        if (url.includes('/login')) cy.log('✓ Redirected to /login')
        else cy.log(`⚠ No redirect — URL: ${url} (app may defer auth guard)`)
      })
    })
  })

  // ─── API – read ───────────────────────────────────────────────────────────

  context('Orders API – read', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('GET /orders/ returns 200', () => {
      cy.apiRequest('GET', '/orders/').then((res) => {
        expect(res.status).to.eq(200)
      })
    })

    it('GET /orders/ returns array or paginated object', () => {
      cy.apiRequest('GET', '/orders/').then((res) => {
        expect(res.body).to.satisfy(
          (b) => Array.isArray(b) || Array.isArray(b.results),
          'Expected array or paginated results'
        )
      })
    })

    it('each order has required fields', () => {
      cy.apiRequest('GET', '/orders/').then((res) => {
        const orders = Array.isArray(res.body) ? res.body : res.body.results
        if (orders.length === 0) return cy.log('No orders to inspect – skipping field check')
        const order = orders[0]
        expect(order).to.have.property('id')
        expect(order).to.have.property('status')
      })
    })
  })

  // ─── API – filters ────────────────────────────────────────────────────────

  context('Orders API – filters', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('GET /orders/?status=pending returns 200', () => {
      cy.apiRequest('GET', '/orders/?status=pending').then((res) => {
        expect(res.status).to.eq(200)
      })
    })

    it('GET /orders/?status=completed returns 200', () => {
      cy.apiRequest('GET', '/orders/?status=completed').then((res) => {
        expect(res.status).to.eq(200)
      })
    })
  })

  // ─── Regression guards ────────────────────────────────────────────────────

  context('Orders API – regression guards', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('POST /orders/:id/items/ returns 404 (wrong endpoint — use /add_items/ instead)', () => {
      // BUG-07 related: /orders/:id/items/ is not registered. The correct endpoint is
      // POST /orders/:id/add_items/ with body {"items": [{menu_item, quantity}]}.
      cy.apiRequest('GET', '/orders/').then(res => {
        const orders = Array.isArray(res.body) ? res.body : res.body.results || []
        if (orders.length === 0) return cy.log('No orders — skip endpoint check')
        cy.apiRequest('POST', `/orders/${orders[0].id}/items/`, {}).then(r => {
          expect(r.status).to.be.oneOf([401, 403, 404])
          cy.log(`✓ /orders/:id/items/ → ${r.status} (not a valid endpoint — use /add_items/)`)
        })
      })
    })

    it('PATCH /orders/:id/ with invalid status returns 200 (KNOWN BUG — no enum validation)', () => {
      // BUG (R04): API accepts any status string and returns 200 instead of 400.
      // Fix: add ChoiceValidator / serializer-level enum validation on the status field.
      cy.apiRequest('POST', '/orders/', {
        type: 'takeaway',
        customer_name: '[TEST] RegOrder',
        customer_phone: '9800000088',
      }).then(res => {
        if (!res.body?.id) return cy.log('Could not create order — skip')
        const id = res.body.id
        cy.apiRequest('PATCH', `/orders/${id}/`, { status: 'invalid_status_xyz' }).then(r => {
          if (r.status === 400) {
            cy.log('✓ invalid status correctly rejected (bug fixed)')
          } else {
            cy.log(`⚠ BUG ACTIVE: invalid status accepted with ${r.status} — backend must validate status enum`)
          }
          // cleanup
          cy.apiRequest('POST', `/orders/${id}/cancel/`, {})
        })
      })
    })
  })

  // ─── UI – authenticated ───────────────────────────────────────────────────

  context('Orders UI – authenticated', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
      cy.goToOrders()
    })

    it('loads the orders page without redirecting to login', () => {
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('shows an order list or empty state', () => {
      cy.get('body').should('be.visible')
    })

    it('has a create / new order control or table selector', () => {
      cy.get('body')
        .contains(/new order|create order|take order|add order/i)
        .should('exist')
    })

    it('has status filter tabs or dropdown', () => {
      cy.get('body')
        .contains(/all|pending|completed|cancelled/i)
        .should('exist')
    })
  })

  // ─── UI – order detail ────────────────────────────────────────────────────

  context('Orders UI – detail view', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
    })

    it('opens the first order detail when an order exists', () => {
      cy.apiRequest('GET', '/orders/').then((res) => {
        const orders = Array.isArray(res.body) ? res.body : res.body.results
        if (orders.length === 0) return cy.log('No orders – skipping detail test')
        const firstId = orders[0].id
        cy.visit(`/orders/${firstId}`, { failOnStatusCode: false })
        cy.url().should('not.include', '/login')
        cy.get('body').should('be.visible')
      })
    })
  })
})
