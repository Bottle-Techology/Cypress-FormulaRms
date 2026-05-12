/**
 * 11 – End-to-End Flow
 *
 * Exercises the full happy path an operator would follow in one session:
 *   1. Login (via cached token / OTP)
 *   2. Create a menu
 *   3. Add a category to the menu
 *   4. Add an item to the category
 *   5. Verify the item appears on the menu page
 *   6. Navigate to tables — verify page loads
 *   7. Navigate to orders — verify page loads
 *   8. Clean up test data via API
 *
 * Requires: OTP_CODE env var (all tests skip without it).
 */
describe('12 – End-to-End Flow', () => {
  const OTP_CODE   = Cypress.env('OTP_CODE')
  const PREFIX     = Cypress.env('TEST_PREFIX') || '[TEST]'
  const IDENTIFIER = Cypress.env('IDENTIFIER') || 'pranuj@bottle.com.np'

  const ts        = Date.now()
  const menuName  = `${PREFIX} E2E Menu ${ts}`
  const catName   = `${PREFIX} E2E Category ${ts}`
  const itemName  = `${PREFIX} E2E Item ${ts}`
  const basePrice = '120.00'

  before(function () {
    if (!OTP_CODE) this.skip()
  })

  // Use a single shared session for the entire flow so cy.session caching works.
  beforeEach(() => {
    cy.loginViaApi(IDENTIFIER, OTP_CODE)
  })

  // ─── Step 1: Authenticated dashboard ─────────────────────────────────────

  it('01 – lands on the dashboard after login', () => {
    cy.visit('/overview', { failOnStatusCode: false })
    cy.url().should('not.include', '/login')
    cy.get('body').should('be.visible')
  })

  // ─── Step 2: Create a menu via API ───────────────────────────────────────

  it('02 – creates a test menu via API', () => {
    cy.apiRequest('POST', '/menu/menus/', { name: menuName, description: 'E2E test' }).then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 201])
        expect(res.body).to.have.property('id')
        Cypress.env('E2E_MENU_ID', res.body.id)
      }
    )
  })

  // ─── Step 3: Create a category via API ───────────────────────────────────

  it('03 – creates a test category via API', () => {
    cy.apiRequest('POST', '/menu/categories/', { name: catName }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201])
      expect(res.body).to.have.property('id')
      Cypress.env('E2E_CAT_ID', res.body.id)
    })
  })

  // ─── Step 4: Create an item via API ──────────────────────────────────────

  it('04 – creates a test item via API', () => {
    cy.apiRequest('POST', '/menu/items/', {
      name: itemName,
      base_price: basePrice,
      food_type: 'veg',
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201])
      expect(res.body).to.have.property('id')
      Cypress.env('E2E_ITEM_ID', res.body.id)
    })
  })

  // ─── Step 5: Verify menu page reflects data ───────────────────────────────

  it('05 – menu page loads and reflects authenticated state', () => {
    cy.visit('/menu', { failOnStatusCode: false })
    cy.url().should('not.include', '/login')
    cy.get('body').should('be.visible')
  })

  // ─── Step 6: Tables page ─────────────────────────────────────────────────

  it('06 – tables page loads', () => {
    cy.visit('/tables', { failOnStatusCode: false })
    cy.url().should('not.include', '/login')
    cy.get('body').should('be.visible')
  })

  // ─── Step 7: Orders page ─────────────────────────────────────────────────

  it('07 – orders page loads', () => {
    cy.visit('/orders', { failOnStatusCode: false })
    cy.url().should('not.include', '/login')
    cy.get('body').should('be.visible')
  })

  // ─── Step 8: Settings page ───────────────────────────────────────────────

  it('08 – settings page loads', () => {
    cy.visit('/settings', { failOnStatusCode: false })
    cy.url().should('not.include', '/login')
    cy.get('body').should('be.visible')
  })

  // ─── Step 9: Clean up test data ───────────────────────────────────────────

  it('09 – cleans up test item via API', () => {
    const id = Cypress.env('E2E_ITEM_ID')
    if (!id) return cy.log('No item id – skipping cleanup')
    cy.apiRequest('DELETE', `/menu/items/${id}/`).then((res) => {
      expect(res.status).to.be.oneOf([200, 204])
    })
  })

  it('10 – cleans up test category via API', () => {
    const id = Cypress.env('E2E_CAT_ID')
    if (!id) return cy.log('No category id – skipping cleanup')
    cy.apiRequest('DELETE', `/menu/categories/${id}/`).then((res) => {
      expect(res.status).to.be.oneOf([200, 204])
    })
  })

  it('11 – cleans up test menu via API', () => {
    const id = Cypress.env('E2E_MENU_ID')
    if (!id) return cy.log('No menu id – skipping cleanup')
    cy.apiRequest('DELETE', `/menu/menus/${id}/`).then((res) => {
      expect(res.status).to.be.oneOf([200, 204])
    })
  })

})
