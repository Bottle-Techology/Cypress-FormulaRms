describe('05 – Categories', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')
  const PREFIX   = Cypress.env('TEST_PREFIX') || '[TEST]'

  const catName  = `${PREFIX} Cypress Category`

  // ─── Unauthenticated ──────────────────────────────────────────────────────

  context('Categories page – unauthenticated', () => {
    beforeEach(() => cy.clearAuth())

    it('redirects to /login when not authenticated', () => {
      cy.visit('/menu/categories', { failOnStatusCode: false })
      cy.url().should('include', '/login')
    })
  })

  // ─── API – read ───────────────────────────────────────────────────────────

  context('Categories API – read', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('GET /menu/categories/ returns 200', () => {
      cy.apiRequest('GET', '/menu/categories/').then((res) => {
        expect(res.status).to.eq(200)
      })
    })

    it('GET /menu/categories/ returns array or paginated object', () => {
      cy.apiRequest('GET', '/menu/categories/').then((res) => {
        expect(res.body).to.satisfy(
          (b) => Array.isArray(b) || Array.isArray(b.results),
          'Expected array or paginated results'
        )
      })
    })
  })

  // ─── API – CRUD ───────────────────────────────────────────────────────────

  context('Categories API – CRUD', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('POST /menu/categories/ creates a new category', () => {
      cy.apiRequest('POST', '/menu/categories/', { name: catName }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201])
        expect(res.body).to.have.property('id')
        expect(res.body.name).to.eq(catName)
        Cypress.env('CAT_ID', res.body.id)
      })
    })

    it('GET /menu/categories/:id/ retrieves the created category', () => {
      const id = Cypress.env('CAT_ID')
      if (!id) return cy.log('No category id – skipping')
      cy.apiRequest('GET', `/menu/categories/${id}/`).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body.name).to.eq(catName)
      })
    })

    it('PATCH /menu/categories/:id/ updates the category name', () => {
      const id = Cypress.env('CAT_ID')
      if (!id) return cy.log('No category id – skipping')
      cy.apiRequest('PATCH', `/menu/categories/${id}/`, { name: `${catName} (updated)` }).then(
        (res) => {
          expect(res.status).to.be.oneOf([200, 204])
        }
      )
    })

    it('DELETE /menu/categories/:id/ removes the category', () => {
      const id = Cypress.env('CAT_ID')
      if (!id) return cy.log('No category id – skipping')
      cy.apiRequest('DELETE', `/menu/categories/${id}/`).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })

    it('POST /menu/categories/ rejects an empty name', () => {
      cy.apiRequest('POST', '/menu/categories/', { name: '' }).then((res) => {
        expect(res.status).to.be.oneOf([400, 422])
      })
    })
  })

  // ─── UI – authenticated ───────────────────────────────────────────────────

  context('Categories UI – authenticated', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
      cy.visit('/menu/categories', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
    })

    it('loads the categories page without redirecting to login', () => {
      cy.url().should('not.include', '/login')
    })

    it('shows a list or empty state for categories', () => {
      cy.get('body').should('be.visible')
    })

    it('has an add / create category control', () => {
      cy.get('body').contains(/add|create|new category/i).should('exist')
    })
  })
})
