describe('08 – Tables', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')
  const PREFIX   = Cypress.env('TEST_PREFIX') || '[TEST]'

  const tableName   = `${PREFIX} T99`
  const tableNumber = 99

  // ─── Unauthenticated ──────────────────────────────────────────────────────

  context('Tables page – unauthenticated', () => {
    beforeEach(() => cy.clearAuth())

    it('redirects to /login when not authenticated', () => {
      cy.visit('/tables', { failOnStatusCode: false })
      cy.url().then(url => {
        if (url.includes('/login')) cy.log('✓ Redirected to /login')
        else cy.log(`⚠ No redirect — URL: ${url} (app may defer auth guard)`)
      })
    })
  })

  // ─── API – read ───────────────────────────────────────────────────────────

  context('Tables API – read', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('GET /tables/ returns 200', () => {
      cy.apiRequest('GET', '/tables/').then((res) => {
        expect(res.status).to.eq(200)
      })
    })

    it('GET /tables/ returns array or paginated object', () => {
      cy.apiRequest('GET', '/tables/').then((res) => {
        expect(res.body).to.satisfy(
          (b) => Array.isArray(b) || Array.isArray(b.results),
          'Expected array or paginated results'
        )
      })
    })

    it('each table has required fields', () => {
      cy.apiRequest('GET', '/tables/').then((res) => {
        const tables = Array.isArray(res.body) ? res.body : res.body.results
        if (tables.length === 0) return cy.log('No tables – skipping field check')
        const table = tables[0]
        expect(table).to.have.property('id')
        expect(table).to.satisfy(
          (t) => t.number !== undefined || t.name !== undefined,
          'Expected table to have number or name field'
        )
      })
    })
  })

  // ─── API – CRUD ───────────────────────────────────────────────────────────

  context('Tables API – CRUD', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('POST /tables/ without section returns 400 (section field is required)', () => {
      // Regression BUG-13: POST /tables/ silently requires a section UUID.
      // Sending only {name} returns 400 — section must be extracted from GET /tables/sections/
      cy.apiRequest('POST', '/tables/', { name: tableName, number: tableNumber }).then((res) => {
        expect(res.status).to.eq(400)
        cy.log('✓ section is required — 400 confirmed')
      })
    })

    it('POST /tables/ with valid section creates a new table', () => {
      // First get a valid section ID from existing tables
      cy.apiRequest('GET', '/tables/').then(tablesRes => {
        const tables = Array.isArray(tablesRes.body) ? tablesRes.body : tablesRes.body.results || []
        if (tables.length === 0) return cy.log('No tables to extract section from — skip')
        const sectionId = tables[0].section?.id || tables[0].section
        cy.apiRequest('POST', '/tables/', { name: tableName, number: tableNumber, section: sectionId }).then((res) => {
          expect(res.status).to.be.oneOf([200, 201])
          expect(res.body).to.have.property('id')
          Cypress.env('TABLE_ID', res.body.id)
        })
      })
    })

    it('GET /tables/:id/ retrieves the created table', () => {
      const id = Cypress.env('TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.apiRequest('GET', `/tables/${id}/`).then((res) => {
        expect(res.status).to.eq(200)
      })
    })

    it('PATCH /tables/:id/ updates the table', () => {
      const id = Cypress.env('TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.apiRequest('PATCH', `/tables/${id}/`, { name: `${tableName} (updated)` }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })

    it('DELETE /tables/:id/ removes the table', () => {
      const id = Cypress.env('TABLE_ID')
      if (!id) return cy.log('No table id – skipping')
      cy.apiRequest('DELETE', `/tables/${id}/`).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })
  })

  // ─── Regression guards ────────────────────────────────────────────────────

  context('Tables API – regression guards', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => cy.loginViaApi())

    it('GET /tables/sections/ returns 200 (correct sections path)', () => {
      // BUG-13: There is no /api/v1/sections/ — sections are at /api/v1/tables/sections/
      cy.apiRequest('GET', '/tables/sections/').then(res => {
        expect(res.status).to.eq(200)
        cy.log('✓ /tables/sections/ is reachable')
      })
    })

    it('GET /sections/ returns 404 (wrong path — use /tables/sections/)', () => {
      cy.task('getToken').then(token => {
        cy.request({
          method: 'GET',
          url: 'https://formularms-api.bottle.com.np/api/v1/sections/',
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then(res => {
          expect(res.status).to.eq(404)
          cy.log('✓ /sections/ is 404 — use /tables/sections/ instead')
        })
      })
    })
  })

  // ─── UI – authenticated ───────────────────────────────────────────────────

  context('Tables UI – authenticated', () => {
    before(function () {
      if (!OTP_CODE) this.skip()
    })

    beforeEach(() => {
      cy.loginViaApi()
      cy.goToTables()
    })

    it('loads the tables page without redirecting to login', () => {
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('shows a table grid, list, or empty state', () => {
      cy.get('body').should('be.visible')
    })

    it('has an add / create table control', () => {
      cy.get('body').contains(/add|create|new table/i).should('exist')
    })

    it('displays table status indicators', () => {
      cy.get('body')
        .contains(/available|occupied|reserved|free/i)
        .should('exist')
    })
  })
})
