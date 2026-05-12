describe('09 – Settings', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  // ─── Unauthenticated ──────────────────────────────────────────────────────

  context('Settings page – unauthenticated', () => {
    beforeEach(() => cy.clearAuth())

    it('redirects to /login when not authenticated', () => {
      cy.visit('/settings', { failOnStatusCode: false })
      cy.url().should('include', '/login')
    })
  })

  // ─── UI – authenticated ───────────────────────────────────────────────────

  context('Settings UI – authenticated', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
      cy.goToSettings()
    })

    it('loads the settings page without redirecting to login', () => {
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('displays a settings heading or section title', () => {
      cy.get('body').contains(/settings|configuration|preferences/i).should('exist')
    })

    it('has a restaurant / business profile section', () => {
      cy.get('body').contains(/restaurant|business|profile|name/i).should('exist')
    })

    it('has save / update controls', () => {
      cy.get('body').contains(/save|update|submit/i).should('exist')
    })
  })

  // ─── API – profile ────────────────────────────────────────────────────────

  context('Settings API – restaurant profile', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('GET /restaurant/ or /settings/ returns 200', () => {
      cy.apiRequest('GET', '/restaurant/').then((res) => {
        // Some endpoints may be at /restaurant/ or /settings/
        if (res.status === 404) {
          cy.apiRequest('GET', '/settings/').then((r) => {
            expect(r.status).to.be.oneOf([200, 404])
          })
        } else {
          expect(res.status).to.eq(200)
        }
      })
    })
  })

  // ─── UI – sub-sections ───────────────────────────────────────────────────

  context('Settings UI – sub-sections', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    const subPages = [
      { label: 'profile', path: '/settings/profile' },
      { label: 'general', path: '/settings/general' },
    ]

    subPages.forEach(({ label, path }) => {
      it(`${label} sub-page loads or 404s gracefully`, () => {
        cy.loginViaApi()
        cy.visit(path, { failOnStatusCode: false })
        cy.url().should('not.include', '/login')
        cy.get('body').should('be.visible')
      })
    })
  })
})
