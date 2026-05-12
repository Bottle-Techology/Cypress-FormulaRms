/**
 * Link 30 menu items to relevant variant groups and customization groups.
 * Skips items that already have variants. Uses name-pattern matching.
 * Usage: OTP_CODE=<code> node scripts/link-items-variants-customizations.js
 */

const AUTH_BASE  = 'https://formularms-api.bottle.com.np'
const API_BASE   = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

// ── Pattern → [variantGroupNames], [customizationGroupNames] ─────────────────
// Order matters: first match wins
const RULES = [
  // Biryani
  { match: /biryani/i,
    vg: ['Biryani Portion'],
    cg: ['Spice Level', 'Special Instructions'] },

  // Pizza
  { match: /pizza/i,
    vg: ['Pizza Size'],
    cg: ['Extra Toppings', 'Cheese Options', 'Sauce Choice'] },

  // Burger
  { match: /burger/i,
    vg: ['Burger Size'],
    cg: ['Sauce Choice', 'Extra Toppings', 'Bread Choice'] },

  // Steak / BBQ / Grill
  { match: /steak|bbq|grill|sekuwa|chops/i,
    vg: ['Steak Size'],
    cg: ['Meat Doneness', 'Sauce Choice', 'Side Dish'] },

  // Pasta / Noodles
  { match: /pasta|spaghetti|fettuccine|penne|linguine/i,
    vg: ['Pasta Size'],
    cg: ['Sauce Choice', 'Protein Add-on', 'Special Instructions'] },
  { match: /noodle|ramen|thukpa|chow mein|pad thai/i,
    vg: ['Noodle Bowl Size'],
    cg: ['Noodle Type', 'Spice Level', 'Protein Add-on'] },

  // Momo / Dumplings
  { match: /momo|dumpling/i,
    vg: ['Momo Portion'],
    cg: ['Cooking Style', 'Spice Level', 'Sauce Choice'] },

  // Curry / Masala / Indian
  { match: /curry|masala|korma|tikka|paneer|rogan|chole|saag|dal makhani/i,
    vg: ['Curry Portion'],
    cg: ['Spice Level', 'Rice Choice', 'Bread Choice'] },

  // Fried Rice / Rice dishes
  { match: /fried rice|rice/i,
    vg: ['Rice Portion'],
    cg: ['Protein Add-on', 'Spice Level', 'Special Instructions'] },

  // Salad
  { match: /salad/i,
    vg: ['Salad Size'],
    cg: ['Dressing Choice', 'Protein Add-on', 'Allergies & Dietary'] },

  // Soup
  { match: /soup/i,
    vg: ['Soup Bowl Size'],
    cg: ['Spice Level', 'Special Instructions'] },

  // Sandwich / Toast / Wrap
  { match: /sandwich|wrap|toast|club/i,
    vg: ['Sandwich Size'],
    cg: ['Bread Choice', 'Sauce Choice', 'Extra Toppings'] },

  // Pancakes / Waffles
  { match: /pancake|waffle/i,
    vg: ['Pancake Stack Size'],
    cg: ['Extra Toppings', 'Sugar Level'] },

  // Breakfast
  { match: /breakfast|omelette|eggs benedict|french toast/i,
    vg: ['Breakfast Set'],
    cg: ['Cooking Style', 'Special Instructions'] },

  // Coffee / Espresso
  { match: /coffee|espresso|cappuccino|latte|flat white|cold brew/i,
    vg: ['Coffee Cup Size'],
    cg: ['Sugar Level', 'Beverage Temperature', 'Special Instructions'] },

  // Tea
  { match: /tea|chai/i,
    vg: ['Tea Cup Size'],
    cg: ['Sugar Level', 'Ice Preference'] },

  // Juice / Smoothie / Shake
  { match: /juice|smoothie|shake|lassi/i,
    vg: ['Drink Size'],
    cg: ['Sugar Level', 'Ice Preference'] },

  // Cocktail / Mocktail
  { match: /cocktail|mocktail/i,
    vg: ['Drink Size'],
    cg: ['Ice Preference', 'Sugar Level'] },

  // Desserts / Ice Cream
  { match: /ice cream|gelato|sorbet|sundae/i,
    vg: ['Ice Cream Scoop Count'],
    cg: ['Extra Toppings', 'Special Instructions'] },
  { match: /cake|dessert|tiramisu|panna cotta|cheesecake|lava/i,
    vg: ['Dessert Portion'],
    cg: ['Special Instructions'] },

  // Seafood
  { match: /prawn|lobster|fish|seafood|salmon/i,
    vg: ['Seafood Portion'],
    cg: ['Cooking Style', 'Sauce Choice', 'Side Dish'] },

  // Chicken (catch-all after specific chicken rules above)
  { match: /chicken/i,
    vg: ['Chicken Portion'],
    cg: ['Spice Level', 'Cooking Style', 'Sauce Choice'] },

  // Snacks / Starters
  { match: /snack|starter|spring roll|nachos|onion ring|bruschetta|wings/i,
    vg: ['Snack Portion'],
    cg: ['Sauce Choice', 'Spice Level'] },
]

function getRuleFor(name) {
  for (const rule of RULES) {
    if (rule.match.test(name)) return rule
  }
  return null
}

async function main() {
  if (!OTP_CODE) {
    console.error('Usage: OTP_CODE=<code> node scripts/link-items-variants-customizations.js')
    process.exit(1)
  }

  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/',
    { identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE) })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('Authenticated OK\n')

  // Fetch items (all pages)
  let url = API_BASE + '/menu/items/?limit=200'
  const allItems = []
  while (url) {
    const r = await req('GET', url, null, token)
    const page = Array.isArray(r.data) ? r.data : r.data?.results || []
    allItems.push(...page)
    url = r.data?.next || null
  }
  console.log(`Items: ${allItems.length} total`)

  // Fetch variant groups
  const vgRes = await req('GET', API_BASE + '/menu/variant-groups/?limit=100', null, token)
  const vgList = Array.isArray(vgRes.data) ? vgRes.data : vgRes.data?.results || []
  const vgByName = Object.fromEntries(vgList.map(g => [g.name, g.id]))
  console.log(`Variant groups: ${vgList.length} → ${vgList.map(g => g.name).join(', ')}\n`)

  // Fetch customization groups
  const cgRes = await req('GET', API_BASE + '/menu/customization-groups/?limit=100', null, token)
  const cgList = Array.isArray(cgRes.data) ? cgRes.data : cgRes.data?.results || []
  const cgByName = Object.fromEntries(cgList.map(g => [g.name, g.id]))
  console.log(`Customization groups: ${cgList.length} → ${cgList.map(g => g.name).join(', ')}\n`)

  // Items without variants (candidates)
  const candidates = allItems.filter(i => !i.variants || i.variants.length === 0)
  console.log(`Items without variants: ${candidates.length} (will pick up to 30)\n`)

  let linked = 0, skipped = 0
  for (const item of candidates) {
    if (linked >= 30) break
    const rule = getRuleFor(item.name)
    if (!rule) { skipped++; continue }

    const vgIds = rule.vg.map(n => vgByName[n]).filter(Boolean)
    const cgIds = rule.cg.map(n => cgByName[n]).filter(Boolean)
    if (!vgIds.length && !cgIds.length) { skipped++; continue }

    const patchBody = {}
    if (vgIds.length) patchBody.variant_groups = vgIds
    if (cgIds.length) patchBody.customization_groups = cgIds

    const r = await req('PATCH', `${API_BASE}/menu/items/${item.id}/`, patchBody, token)
    if (r.status === 200) {
      linked++
      console.log(`[${linked}/30] ✓ ${item.name}`)
      if (vgIds.length) console.log(`       variants : ${rule.vg.filter(n => vgByName[n]).join(', ')}`)
      if (cgIds.length) console.log(`       customs  : ${rule.cg.filter(n => cgByName[n]).join(', ')}`)
    } else {
      console.log(`  ✗ FAIL ${item.name} — ${r.status}: ${JSON.stringify(r.data).slice(0,100)}`)
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ✓ ${linked} items linked to variants + customization groups`)
  console.log(`  — ${skipped} skipped (no matching rule)`)
  console.log('═'.repeat(60))
}

main().catch(err => { console.error(err); process.exit(1) })
