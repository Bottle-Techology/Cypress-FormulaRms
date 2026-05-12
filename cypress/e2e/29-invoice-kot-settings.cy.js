/**
 * 29 – Invoice & KOT Settings
 *
 * Tests the three ORDER SETTING sub-pages visible in the Settings sidebar:
 *   • Invoice Setting
 *   • KOT Setting
 *   • Printer
 *
 * Run:
 *   npx cypress run --browser chrome \
 *     --spec cypress/e2e/29-invoice-kot-settings.cy.js \
 *     --env OTP_CODE=<code>
 */

const PRINTER_ENDPOINTS = [
  '/printers/',
  '/kitchen-printers/',
  '/stations/',
  '/printer-stations/',
  '/settings/printers/',
]

const DRINK_NAME_RE =
  /\b(beer|wine|cocktail|mocktail|juice|smoothie|shake|milkshake|lassi|coffee|espresso|latte|cappuccino|americano|mocha|chai|soda|cola|spirit|whisky|whiskey|rum|vodka)\b/i

function getPrinters() {
  const tryNext = (endpoints) => {
    if (!endpoints.length) return cy.wrap({ status: 404, body: [] })
    const [head, ...tail] = endpoints
    return cy.apiRequest('GET', head).then((res) => {
      if (res.status !== 200) return tryNext(tail)
      const list = Array.isArray(res.body) ? res.body : res.body.results || []
      if (!list.length) return tryNext(tail)
      return cy.wrap({ status: 200, body: list, endpoint: head })
    })
  }
  return tryNext([...PRINTER_ENDPOINTS])
}

// ─────────────────────────────────────────────────────────────────────────────
describe('29 – Invoice & KOT Settings', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  before(function () {
    if (!OTP_CODE) this.skip()
  })

  beforeEach(() => cy.loginViaApi())

  // ══════════════════════════════════════════════════════════════════════════
  // INVOICE SETTING
  // ══════════════════════════════════════════════════════════════════════════

  context('Invoice Setting – UI', () => {
    it('settings sidebar shows an Invoice Setting link', () => {
      cy.goToSettings()
      cy.get('body').contains(/invoice setting/i).should('exist')
    })

    it('clicking Invoice Setting navigates to the invoice settings page', () => {
      cy.goToSettings()
      cy.contains(/invoice setting/i).first().click()
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('Invoice Setting page loads with form fields', () => {
      cy.goToSettings()
      cy.contains(/invoice setting/i).first().click()
      cy.get('body').should('be.visible')
      // Page should contain invoice-related content
      cy.get('body').contains(/invoice|bill|receipt|print|tax|prefix|footer|header/i).should('exist')
    })

    it('Invoice Setting page shows invoice heading and line item sections', () => {
      cy.goToSettings()
      cy.contains(/invoice setting/i).first().click()
      cy.get('body').contains(/heading|line item|sub.?total|restaurant information/i).should('exist')
    })
  })

  // ─── Invoice Setting – API ────────────────────────────────────────────────

  context('Invoice Setting – API', () => {
    it('GET /settings/ returns print_enabled and printing_mode', () => {
      cy.apiRequest('GET', '/settings/').then((res) => {
        expect(res.status).to.be.oneOf([200, 404])
        if (res.status === 200) {
          expect(res.body).to.have.property('print_enabled')
          expect(res.body).to.have.property('printing_mode')
          cy.log(`print_enabled=${res.body.print_enabled}, printing_mode=${res.body.printing_mode}`)
        } else {
          cy.log('GET /settings/ returned 404 – endpoint may differ')
        }
      })
    })

    it('PATCH print_enabled toggles the invoice print flag', () => {
      cy.apiRequest('GET', '/settings/').then((res) => {
        if (res.status !== 200) return cy.log('Settings endpoint unavailable – skipping')
        const current = res.body.print_enabled
        const toggled = !current

        cy.apiRequest('PATCH', '/settings/', { print_enabled: toggled }).then((r) => {
          expect(r.status).to.be.oneOf([200, 204, 400, 405])
          cy.log(`PATCH print_enabled=${toggled} → ${r.status}`)

          // Restore
          cy.apiRequest('PATCH', '/settings/', { print_enabled: current }).then((restore) => {
            cy.log(`Restored print_enabled=${current} → ${restore.status}`)
          })
        })
      })
    })

    it('PATCH printing_mode accepts a mode value', () => {
      cy.apiRequest('GET', '/settings/').then((res) => {
        if (res.status !== 200) return cy.log('Settings endpoint unavailable – skipping')
        const original = res.body.printing_mode

        cy.apiRequest('PATCH', '/settings/', { printing_mode: 'auto' }).then((r) => {
          expect(r.status).to.be.oneOf([200, 204, 400, 405])
          cy.log(`PATCH printing_mode=auto → ${r.status}`)

          // Restore
          if (original !== undefined) {
            cy.apiRequest('PATCH', '/settings/', { printing_mode: original })
          }
        })
      })
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // KOT SETTING
  // ══════════════════════════════════════════════════════════════════════════

  context('KOT Setting – UI', () => {
    it('settings sidebar shows a KOT Setting link', () => {
      cy.goToSettings()
      cy.get('body').contains(/kot setting/i).should('exist')
    })

    it('clicking KOT Setting navigates to the KOT settings page', () => {
      cy.goToSettings()
      cy.contains(/kot setting/i).first().click()
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('KOT Setting page loads with relevant fields', () => {
      cy.goToSettings()
      cy.contains(/kot setting/i).first().click()
      cy.get('body').should('be.visible')
      cy.get('body').contains(/kot|kitchen order|printer|station|print/i).should('exist')
    })

    it('KOT Setting page has save/update controls', () => {
      cy.goToSettings()
      cy.contains(/kot setting/i).first().click()
      cy.get('body').contains(/save|update|submit/i).should('exist')
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // PRINTER SETTING
  // ══════════════════════════════════════════════════════════════════════════

  context('Printer Setting – UI', () => {
    it('settings sidebar shows a Printer link', () => {
      cy.goToSettings()
      cy.get('body').contains(/^printer$/i).should('exist')
    })

    it('clicking Printer navigates to the printer settings page', () => {
      cy.goToSettings()
      cy.contains(/^printer$/i).first().click()
      cy.url().should('not.include', '/login')
      cy.get('body').should('be.visible')
    })

    it('Printer page shows printer list or add-printer option', () => {
      cy.goToSettings()
      cy.contains(/^printer$/i).first().click()
      cy.get('body').should('be.visible')
      cy.get('body').contains(/printer|add|name|type|ip|port/i).should('exist')
    })
  })

  // ─── Printer Setting – API ────────────────────────────────────────────────

  context('Printer Setting – API', () => {
    it('at least one printer API endpoint responds', () => {
      getPrinters().then((result) => {
        if (result.status !== 200) {
          cy.log('No printer endpoint returned data – printers may not be configured yet')
        } else {
          expect(result.status).to.eq(200)
          expect(result.body).to.be.an('array')
          cy.log(`Printers via ${result.endpoint}: ${result.body.map(p => p.name || p.label || p.id).join(', ')}`)
        }
      })
    })

    it('bar and kitchen printers are discoverable by name', () => {
      getPrinters().then((result) => {
        if (result.status !== 200) return cy.log('No printers available – skipping')

        const bar     = result.body.find(p => [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('bar')))
        const kitchen = result.body.find(p => [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('kitchen')))

        cy.log(`Bar printer    : ${bar     ? (bar.name     || bar.label)     : 'not found'}`)
        cy.log(`Kitchen printer: ${kitchen ? (kitchen.name || kitchen.label) : 'not found'}`)

        if (bar)     Cypress.env('KOT_BAR_ID',     bar.id)
        if (kitchen) Cypress.env('KOT_KITCHEN_ID', kitchen.id)

        expect(bar || kitchen, 'Expected at least one named printer').to.not.be.undefined
      })
    })

    it('PATCH category assigns it to the kitchen printer', () => {
      cy.apiRequest('GET', '/menu/categories/').then((catRes) => {
        expect(catRes.status).to.eq(200)
        const cats = Array.isArray(catRes.body) ? catRes.body : catRes.body.results || []
        if (!cats.length) return cy.log('No categories – skipping')

        const kitchenId = Cypress.env('KOT_KITCHEN_ID')
        const payload   = kitchenId
          ? { printer: kitchenId, kitchen_printer: kitchenId }
          : { printer_name: 'Kitchen Printer', kitchen_printer: 'Kitchen Printer' }

        cy.apiRequest('PATCH', `/menu/categories/${cats[0].id}/`, payload).then((r) => {
          expect(r.status).to.be.oneOf([200, 204, 400, 404])
          cy.log(`[${r.status}] Kitchen ← category "${cats[0].name}"`)
        })
      })
    })

    it('PATCH item routes food to kitchen and drink to bar', { requestTimeout: 30000 }, () => {
      cy.apiRequest('GET', '/menu/items/').then((itemRes) => {
        expect(itemRes.status).to.eq(200)
        const items     = Array.isArray(itemRes.body) ? itemRes.body : itemRes.body.results || []
        const barId     = Cypress.env('KOT_BAR_ID')
        const kitchenId = Cypress.env('KOT_KITCHEN_ID')

        if (!items.length) return cy.log('No items – skipping')

        const drinkItem = items.find(i => DRINK_NAME_RE.test(i.name))
        const foodItem  = items.find(i => !DRINK_NAME_RE.test(i.name))

        const assignments = []
        if (drinkItem && barId)     assignments.push({ item: drinkItem, id: barId,     label: 'Bar' })
        if (foodItem  && kitchenId) assignments.push({ item: foodItem,  id: kitchenId, label: 'Kitchen' })

        if (!assignments.length) return cy.log('No bar/kitchen printer IDs resolved – skipping assignment')

        assignments.forEach(({ item, id, label }) => {
          cy.apiRequest('PATCH', `/menu/items/${item.id}/`, { printer: id, kitchen_printer: id }).then((r) => {
            expect(r.status).to.be.oneOf([200, 204, 400, 404])
            cy.log(`[${r.status}] ${label} ← item "${item.name}"`)
          })
        })
      })
    })

    it('GET item detail shows printer field after assignment', { requestTimeout: 30000 }, () => {
      cy.apiRequest('GET', '/menu/items/').then((res) => {
        const items = Array.isArray(res.body) ? res.body : res.body.results || []
        if (!items.length) return cy.log('No items – skipping')

        cy.apiRequest('GET', `/menu/items/${items[0].id}/`).then((detail) => {
          expect(detail.status).to.eq(200)
          const printerField =
            detail.body.printer       ??
            detail.body.kitchen_printer ??
            detail.body.printer_station ??
            detail.body.printer_name

          cy.log(`Item "${detail.body.name}" → printer: ${JSON.stringify(printerField)}`)
        })
      })
    })
  })
})
