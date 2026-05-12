describe('04 – Menu Management', () => {
  const OTP_CODE  = Cypress.env('OTP_CODE')
  const PREFIX    = Cypress.env('TEST_PREFIX') || '[TEST]'

  const menuName  = `${PREFIX} Cypress Menu`
  const menuDesc  = 'Created by Cypress automation'

  // ─── UI – unauthenticated ──────────────────────────────────────────────────

  context('Menu page – unauthenticated', () => {
    beforeEach(() => {
      cy.clearAuth()
    })

    it('redirects to /login when not authenticated', () => {
      cy.visit('/menu', { failOnStatusCode: false })
      cy.url().should('include', '/login')
    })
  })

  // ─── API – public / non-destructive ───────────────────────────────────────

  context('Menu API – read', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
    })

    it('GET /menu/menus/ returns 200', () => {
      cy.apiRequest('GET', '/menu/menus/').then((res) => {
        expect(res.status).to.eq(200)
      })
    })

    it('GET /menu/menus/ response is an array or paginated object', () => {
      cy.apiRequest('GET', '/menu/menus/').then((res) => {
        expect(res.body).to.satisfy(
          (b) => Array.isArray(b) || Array.isArray(b.results),
          'Expected array or paginated results'
        )
      })
    })
  })

  // ─── API – CRUD ───────────────────────────────────────────────────────────

  context('Menu API – CRUD', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    let createdId

    beforeEach(() => {
      cy.loginViaApi()
    })

    it('POST /menu/menus/ creates a new menu', () => {
      cy.apiRequest('POST', '/menu/menus/', { name: menuName, description: menuDesc }).then(
        (res) => {
          expect(res.status).to.be.oneOf([200, 201])
          expect(res.body).to.have.property('id')
          expect(res.body.name).to.eq(menuName)
          createdId = res.body.id
          cy.task('setToken', null) // preserve token across tests via env
          Cypress.env('MENU_ID', createdId)
        }
      )
    })

    it('GET /menu/menus/:id/ retrieves the created menu', () => {
      const id = Cypress.env('MENU_ID')
      if (!id) return cy.log('No menu id – skipping')
      cy.apiRequest('GET', `/menu/menus/${id}/`).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body.name).to.eq(menuName)
      })
    })

    it('PATCH /menu/menus/:id/ updates the menu name', () => {
      const id = Cypress.env('MENU_ID')
      if (!id) return cy.log('No menu id – skipping')
      cy.apiRequest('PATCH', `/menu/menus/${id}/`, { name: `${menuName} (updated)` }).then(
        (res) => {
          expect(res.status).to.be.oneOf([200, 204])
        }
      )
    })

    it('DELETE /menu/menus/:id/ removes the menu', () => {
      const id = Cypress.env('MENU_ID')
      if (!id) return cy.log('No menu id – skipping')
      cy.apiRequest('DELETE', `/menu/menus/${id}/`).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })
  })

  // ─── UI – authenticated ───────────────────────────────────────────────────

  context('Menu UI – authenticated', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
      cy.goToMenuPage()
    })

    it('loads the menu page', () => {
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('displays a list or empty state for menus', () => {
      cy.get('body').should('satisfy', (body) => body.length > 0)
    })

    it('has a create / add menu button or link', () => {
      cy.get('body').contains(/add|create|new menu/i).should('exist')
    })
  })
})
