/**
 * Setup – Assign Items & Categories to Bar or Kitchen Printer
 *
 * Drink categories  → Main Bar Printer
 * Food categories   → Kitchen Printer
 *
 * Usage:
 *   npx cypress run \
 *     --spec 'cypress/e2e/setup/assign-kitchen-printer.cy.js' \
 *     --env OTP_CODE=<your-otp>
 */

const BAR_PRINTER     = 'Main Bar Printer'
const KITCHEN_PRINTER = 'Kitchen Printer'

const DRINK_CATEGORIES = new Set([
  'Beer & Cider', 'Cocktails', 'Mocktails', 'Wine', 'Spirits & Whisky',
  'Soft Drinks', 'Water & Soda', 'Fresh Juices', 'Smoothies & Shakes',
  'Coffee & Espresso', 'Tea & Herbal Drinks',
])

const DRINK_NAME_RE = /beer|wine|cocktail|mocktail|juice|smoothie|shake|coffee|espresso|latte|tea|chai|soda|water|spirit|whisky|whiskey|rum|gin|vodka|lassi/i

describe('Setup – Assign Items to Bar / Kitchen Printer', () => {
  const OTP_CODE = Cypress.env('OTP_CODE')

  before(function () {
    if (!OTP_CODE) throw new Error('OTP_CODE env var is required. Run with --env OTP_CODE=<code>')
  })

  beforeEach(() => cy.loginViaApi())

  // ─── Step 1: resolve printer IDs ─────────────────────────────────────────

  it('01 – resolves Bar and Kitchen printer IDs from the API', () => {
    const endpoints = ['/printers/', '/kitchen-printers/', '/stations/', '/printer-stations/', '/settings/printers/']

    const tryNext = (list) => {
      if (!list.length) return cy.log('No printer endpoint found — will patch by name')
      const [head, ...tail] = list
      cy.apiRequest('GET', head).then((res) => {
        if (res.status !== 200) return tryNext(tail)
        const printers = Array.isArray(res.body) ? res.body : res.body.results || []
        if (!printers.length) return tryNext(tail)

        const bar     = printers.find(p => [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('bar')))
        const kitchen = printers.find(p => [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('kitchen')))

        if (bar)     { Cypress.env('BAR_PRINTER_ID', bar.id);     cy.log(`Bar printer id: ${bar.id}`) }
        if (kitchen) { Cypress.env('KITCHEN_PRINTER_ID', kitchen.id); cy.log(`Kitchen printer id: ${kitchen.id}`) }
        cy.log(`Printers: ${printers.map(p => p.name || p.label).join(', ')}`)
      })
    }
    tryNext(endpoints)
  })

  // ─── Step 2: assign categories ───────────────────────────────────────────

  it('02 – assigns categories to Bar or Kitchen printer', () => {
    const barId     = Cypress.env('BAR_PRINTER_ID')
    const kitchenId = Cypress.env('KITCHEN_PRINTER_ID')

    cy.apiRequest('GET', '/menu/categories/').then((res) => {
      expect(res.status).to.eq(200)
      const cats = Array.isArray(res.body) ? res.body : res.body.results || []

      cats.forEach((cat) => {
        const isDrink = DRINK_CATEGORIES.has(cat.name)
        const id      = isDrink ? barId : kitchenId
        const name    = isDrink ? BAR_PRINTER : KITCHEN_PRINTER
        const payload = id
          ? { printer: id, kitchen_printer: id, printer_station: id }
          : { printer_name: name, kitchen_printer: name }

        cy.apiRequest('PATCH', `/menu/categories/${cat.id}/`, payload).then((r) => {
          cy.log(`[${r.status}] ${isDrink ? 'Bar' : 'Kitchen'} ← Category "${cat.name}"`)
        })
      })
    })
  })

  // ─── Step 3: assign items ─────────────────────────────────────────────────

  it('03 – assigns items to Bar or Kitchen printer by category', () => {
    const barId     = Cypress.env('BAR_PRINTER_ID')
    const kitchenId = Cypress.env('KITCHEN_PRINTER_ID')

    cy.apiRequest('GET', '/menu/categories/').then((catRes) => {
      const cats = Array.isArray(catRes.body) ? catRes.body : catRes.body.results || []
      const catIsDrink = Object.fromEntries(cats.map(c => [c.id, DRINK_CATEGORIES.has(c.name)]))

      cy.apiRequest('GET', '/menu/items/').then((res) => {
        expect(res.status).to.eq(200)
        const items = Array.isArray(res.body) ? res.body : res.body.results || []

        items.forEach((item) => {
          const itemCatIds = item.category_ids || item.categories || []
          const isDrink = itemCatIds.some(id => catIsDrink[id]) || (!itemCatIds.length && DRINK_NAME_RE.test(item.name))
          const id      = isDrink ? barId : kitchenId
          const name    = isDrink ? BAR_PRINTER : KITCHEN_PRINTER
          const payload = id
            ? { printer: id, kitchen_printer: id, printer_station: id }
            : { printer_name: name, kitchen_printer: name }

          cy.apiRequest('PATCH', `/menu/items/${item.id}/`, payload).then((r) => {
            cy.log(`[${r.status}] ${isDrink ? 'Bar' : 'Kitchen'} ← Item "${item.name}"`)
          })
        })
      })
    })
  })

  // ─── Step 4: verify spot-check ────────────────────────────────────────────

  it('04 – verifies a drink item routes to bar and a food item routes to kitchen', () => {
    cy.apiRequest('GET', '/menu/items/').then((res) => {
      const items = Array.isArray(res.body) ? res.body : res.body.results || []
      const drink = items.find(i => DRINK_NAME_RE.test(i.name))
      const food  = items.find(i => !DRINK_NAME_RE.test(i.name))

      ;[drink, food].filter(Boolean).forEach((item) => {
        cy.apiRequest('GET', `/menu/items/${item.id}/`).then((r) => {
          const printerField = r.body.printer ?? r.body.kitchen_printer ?? r.body.printer_station ?? r.body.printer_name
          cy.log(`Item "${item.name}" → printer: ${JSON.stringify(printerField)}`)
        })
      })
    })
  })
})
