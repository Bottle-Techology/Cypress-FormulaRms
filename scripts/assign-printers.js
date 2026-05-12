/**
 * Assign menu items to printers based on category type:
 *   - Drink categories  → Main Bar Printer
 *   - Food categories   → Kitchen Printer
 *
 * Usage: OTP_CODE=<code> node scripts/assign-printers.js
 */

const AUTH_BASE = 'https://formularms-api.bottle.com.np'
const API_BASE  = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

const BAR_PRINTER     = 'Main Bar Printer'
const KITCHEN_PRINTER = 'Kitchen Printer'

// Categories that belong to the bar (drinks)
const DRINK_CATEGORIES = new Set([
  'Beer & Cider',
  'Cocktails',
  'Mocktails',
  'Wine',
  'Spirits & Whisky',
  'Hard Drinks',
  'Soft Drinks',
  'Water & Soda',
  'Fresh Juices',
  'Smoothies & Shakes',
  'Coffee & Espresso',
  'Tea & Herbal Drinks',
])

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchAll(url, token) {
  const results = []
  let next = url
  while (next) {
    const r = await req('GET', next, null, token)
    const page = Array.isArray(r.data) ? r.data : r.data?.results || []
    results.push(...page)
    next = r.data?.next || null
  }
  return results
}

async function resolvePrinters(token) {
  const endpoints = ['/printers/', '/kitchen-printers/', '/stations/', '/printer-stations/', '/settings/printers/']
  for (const ep of endpoints) {
    const r = await req('GET', API_BASE + ep, null, token)
    if (r.status !== 200) continue
    const list = Array.isArray(r.data) ? r.data : r.data?.results || []
    if (!list.length) continue

    const bar     = list.find(p => [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('bar')))
    const kitchen = list.find(p => [p.name, p.label, p.title].some(v => v?.toLowerCase().includes('kitchen')))

    console.log(`Printer endpoint: ${ep}`)
    console.log(`  Bar printer    : ${bar     ? `${bar.name || bar.label} (id ${bar.id})`     : 'not found by API'}`)
    console.log(`  Kitchen printer: ${kitchen ? `${kitchen.name || kitchen.label} (id ${kitchen.id})` : 'not found by API'}`)
    return { barId: bar?.id || null, kitchenId: kitchen?.id || null }
  }
  console.log('No printer list endpoint found — will patch by name only')
  return { barId: null, kitchenId: null }
}

function printerPayload(printerId, printerName) {
  return printerId
    ? { printer: printerId, kitchen_printer: printerId, printer_station: printerId }
    : { printer_name: printerName, kitchen_printer: printerName }
}

async function main() {
  if (!OTP_CODE) {
    console.error('Usage: OTP_CODE=<code> node scripts/assign-printers.js')
    process.exit(1)
  }

  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/',
    { identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE) })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('Authenticated OK\n')

  // Resolve printer IDs from the API (if available)
  const { barId, kitchenId } = await resolvePrinters(token)
  console.log()

  // Fetch categories to build a name→isDrink lookup
  const categories = await fetchAll(API_BASE + '/menu/categories/?limit=200', token)
  console.log(`Categories fetched: ${categories.length}`)
  const catIsDrink = Object.fromEntries(
    categories.map(c => [c.id, DRINK_CATEGORIES.has(c.name)])
  )
// Assign categories themselves to the appropriate printer
  console.log('\n── Phase 1: assigning categories ──────────────────────────')
  let barCats = 0, kitchenCats = 0
  for (const cat of categories) {
    const isDrink = DRINK_CATEGORIES.has(cat.name)
    const payload  = isDrink ? printerPayload(barId, BAR_PRINTER) : printerPayload(kitchenId, KITCHEN_PRINTER)
    const label    = isDrink ? '🍹 Bar    ' : '🍽  Kitchen'
    const r = await req('PATCH', `${API_BASE}/menu/categories/${cat.id}/`, payload, token)
    console.log(`  [${r.status}] ${label} ← ${cat.name}`)
    isDrink ? barCats++ : kitchenCats++
    await sleep(150)
  }

  // Fetch all items with their category IDs
  const items = await fetchAll(API_BASE + '/menu/items/?limit=200', token)
  console.log(`\nItems fetched: ${items.length}`)

  // Assign each item to bar or kitchen based on its first recognised category
  console.log('\n── Phase 2: assigning items ────────────────────────────────')
  let barItems = 0, kitchenItems = 0, skipped = 0
  for (const item of items) {
    // API may return categories as [{id, name}] objects or plain ID strings
    const rawCats = item.category_ids || item.categories || []
    const itemCatIds = rawCats.map(c => (typeof c === 'object' ? c.id : c))

    // An item is a drink if ANY of its categories is in the drink set
    const catDrink = itemCatIds.some(id => catIsDrink[id])

    // Name-based detection — use \b word boundaries to avoid substring false positives
    // e.g. "steak" contains "tea", "chocolate" contains "cola", "classic" contains "lassi"
    const DRINK_NAME_RE = /\b(beer|wine|cocktail|mocktail|juice|smoothie|shake|milkshake|lassi|coffee|espresso|latte|cappuccino|americano|mocha|cold brew|affogato|chai|soda|cola|spirit|whisky|whiskey|rum|vodka|mojito|cosmopolitan|margarita|martini|negroni|daiquiri|lemonade|jack daniel|black label|johnnie walker)\b|^(flat white|old fashioned|whisky sour|shirley temple|green tea|earl grey|peppermint tea|chamomile tea|hibiscus tea|lemon ginger tea|masala chai|iced tea)$/i
    const nameDrink = DRINK_NAME_RE.test(item.name)

    const routeToDrink = catDrink || nameDrink

    const payload = routeToDrink ? printerPayload(barId, BAR_PRINTER) : printerPayload(kitchenId, KITCHEN_PRINTER)
    const label   = routeToDrink ? '🍹 Bar    ' : '🍽  Kitchen'
    const r = await req('PATCH', `${API_BASE}/menu/items/${item.id}/`, payload, token)

    if (r.status === 200) {
      console.log(`  [${r.status}] ${label} ← ${item.name}`)
      routeToDrink ? barItems++ : kitchenItems++
    } else {
      console.log(`  [${r.status}] ✗ FAIL ← ${item.name}: ${JSON.stringify(r.data).slice(0, 80)}`)
      skipped++
    }
    await sleep(150)
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  Categories → Bar Printer    : ${barCats}`)
  console.log(`  Categories → Kitchen Printer: ${kitchenCats}`)
  console.log(`  Items      → Bar Printer    : ${barItems}`)
  console.log(`  Items      → Kitchen Printer: ${kitchenItems}`)
  if (skipped) console.log(`  Items failed                : ${skipped}`)
  console.log('═'.repeat(60))
}

main().catch(err => { console.error(err); process.exit(1) })
