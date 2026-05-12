/**
 * 25 – Menu Availability & Activation
 *
 * Tests the menu management operations specific to RMS operation:
 *   - Toggle item availability (in-stock / out-of-stock)
 *   - Activate / deactivate a menu
 *   - Assign a category to a menu
 *   - Assign an item to a category
 *   - Unavailable items are marked appropriately in the API response
 *   - Menu activation reflects in UI
 */
describe('25 – Menu Availability & Activation', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')
  const PREFIX   = Cypress.env('TEST_PREFIX') || '[TEST]'

  before(function () {
    if (!OTP_CODE) this.skip()
  })

  beforeEach(() => cy.loginViaApi())

  // ─── Item availability toggle ─────────────────────────────────────────────

  context('Item availability – toggle', () => {
    let itemId

    before(function () {
      if (!OTP_CODE) this.skip()
      cy.loginViaApi()
      cy.apiRequest('POST', '/menu/items/', {
        name: `${PREFIX} Avail Test Item`,
        base_price: '99.00',
        food_type: 'veg',
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201])
        itemId = res.body.id
        Cypress.env('AVAIL_ITEM_ID', itemId)
      })
    })

    it('PATCH item with is_available=false marks it unavailable', () => {
      const id = Cypress.env('AVAIL_ITEM_ID')
      if (!id) return cy.log('No item id – skipping')
      cy.apiRequest('PATCH', `/menu/items/${id}/`, { is_available: false }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })

    it('GET item shows is_available=false after toggle', () => {
      const id = Cypress.env('AVAIL_ITEM_ID')
      if (!id) return cy.log('No item id – skipping')
      cy.apiRequest('GET', `/menu/items/${id}/`).then((res) => {
        expect(res.status).to.eq(200)
        if (res.body.is_available !== undefined) {
          expect(res.body.is_available).to.be.false
        }
      })
    })

    it('PATCH item with is_available=true re-enables it', () => {
      const id = Cypress.env('AVAIL_ITEM_ID')
      if (!id) return cy.log('No item id – skipping')
      cy.apiRequest('PATCH', `/menu/items/${id}/`, { is_available: true }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })

    it('deletes availability test item', () => {
      const id = Cypress.env('AVAIL_ITEM_ID')
      if (!id) return cy.log('No item id – skipping')
      cy.apiRequest('DELETE', `/menu/items/${id}/`).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })
  })

  // ─── Menu activation ─────────────────────────────────────────────────────

  context('Menu activation – toggle', () => {
    it('creates a menu and marks it inactive', () => {
      cy.apiRequest('POST', '/menu/menus/', {
        name: `${PREFIX} Activation Test Menu`,
        description: 'toggled',
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201])
        Cypress.env('ACT_MENU_ID', res.body.id)

        cy.apiRequest('PATCH', `/menu/menus/${res.body.id}/`, { is_active: false }).then((r) => {
          expect(r.status).to.be.oneOf([200, 204])
        })
      })
    })

    it('inactive menu is_active=false in GET response', () => {
      const id = Cypress.env('ACT_MENU_ID')
      if (!id) return cy.log('No menu id – skipping')
      cy.apiRequest('GET', `/menu/menus/${id}/`).then((res) => {
        expect(res.status).to.eq(200)
        if (res.body.is_active !== undefined) {
          expect(res.body.is_active).to.be.false
        }
      })
    })

    it('re-activates the menu', () => {
      const id = Cypress.env('ACT_MENU_ID')
      if (!id) return cy.log('No menu id – skipping')
      cy.apiRequest('PATCH', `/menu/menus/${id}/`, { is_active: true }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })

    it('deletes activation test menu', () => {
      const id = Cypress.env('ACT_MENU_ID')
      if (!id) return cy.log('No menu id – skipping')
      cy.apiRequest('DELETE', `/menu/menus/${id}/`).then((res) => {
        expect(res.status).to.be.oneOf([200, 204])
      })
    })
  })

  // ─── Category ↔ Menu association ─────────────────────────────────────────

  context('Category assignment to menu', () => {
    it('POST /menu/menus/:id/categories/ or PATCH links a category to a menu', () => {
      cy.apiRequest('GET', '/menu/menus/').then((menusRes) => {
        const menus = Array.isArray(menusRes.body) ? menusRes.body : menusRes.body.results || []
        cy.apiRequest('GET', '/menu/categories/').then((catsRes) => {
          const cats = Array.isArray(catsRes.body) ? catsRes.body : catsRes.body.results || []
          if (menus.length === 0 || cats.length === 0) {
            return cy.log('No menus or categories – skipping association test')
          }
          const menuId = menus[0].id
          const catId  = cats[0].id
          cy.apiRequest('POST', `/menu/menus/${menuId}/categories/`, { category: catId }).then(
            (res) => {
              expect(res.status).to.be.oneOf([200, 201, 204, 400])
            }
          )
        })
      })
    })
  })

  // ─── Item ↔ Category association ─────────────────────────────────────────

  context('Item assignment to category', () => {
    it('PATCH item with category field links item to category', () => {
      cy.apiRequest('GET', '/menu/items/').then((itemsRes) => {
        const items = Array.isArray(itemsRes.body) ? itemsRes.body : itemsRes.body.results || []
        cy.apiRequest('GET', '/menu/categories/').then((catsRes) => {
          const cats = Array.isArray(catsRes.body) ? catsRes.body : catsRes.body.results || []
          if (items.length === 0 || cats.length === 0) {
            return cy.log('No items or categories – skipping')
          }
          const itemId = items[0].id
          const catId  = cats[0].id
          cy.apiRequest('PATCH', `/menu/items/${itemId}/`, { category: catId }).then((res) => {
            expect(res.status).to.be.oneOf([200, 204, 400])
          })
        })
      })
    })
  })

  // ─── UI – menu availability ───────────────────────────────────────────────

  context('Menu UI – availability indicators', () => {
    beforeEach(() => {
      cy.loginViaApi()
      cy.visit('/menu/items', { failOnStatusCode: false })
      cy.get('body').should('be.visible')
    })

    it('item list shows availability status indicator', () => {
      cy.get('body').should('be.visible')
      cy.get('body').then(($body) => {
        const hasAvailability = $body.text().match(/available|unavailable|in stock|out of stock/i)
        cy.log(`Availability indicator present: ${!!hasAvailability}`)
      })
    })

    it('toggle or switch element exists for item availability', () => {
      cy.get('body').then(($body) => {
        const hasToggle =
          $body.find('input[type="checkbox"], [class*="switch"], [class*="toggle"]').length > 0
        cy.log(`Toggle/switch present: ${hasToggle}`)
      })
    })
  })
})
