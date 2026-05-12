/**
 * Create 20 variant groups and link one representative item per group.
 *
 * Flow:
 *  1. Create (or reuse) 20 variant groups at POST /api/v1/menu/variant-groups/
 *  2. For each group find one matching menu item (no existing variants)
 *  3. Delete any stale null-option variants on that item
 *  4. Create item variants linked to the group option IDs
 *
 * Usage: OTP_CODE=<code> node scripts/create-variants.js
 *
 * Variant groups created:
 *  1  Coffee Size          — Small (8oz) / Regular (12oz)* / Large (16oz)
 *  2  Tea Size             — Small (150ml) / Regular (250ml)* / Large (350ml)
 *  3  Smoothie & Shake     — Regular (300ml)* / Large (500ml)
 *  4  Juice Size           — Small (250ml) / Regular (350ml)* / Large (500ml)
 *  5  Cocktail / Mocktail  — Single* / Double
 *  6  Pizza Size           — Personal (6") / Medium (10")* / Large (14") / XL (16")
 *  7  Burger Size          — Regular* / Double Patty
 *  8  Pasta & Risotto      — Regular* / Large Portion
 *  9  Momo Quantity        — 6 pcs* / 10 pcs / 15 pcs
 * 10  Biryani Portion      — Half / Full* / Party (2 kg)
 * 11  Curry Portion        — Regular* / Large / Family (serves 4)
 * 12  Noodles Portion      — Regular* / Large / Extra Large
 * 13  Soup Size            — Bowl* / Large Bowl
 * 14  Salad Size           — Small / Regular* / Large
 * 15  Ice Cream & Gelato   — Single Scoop* / Double / Triple
 * 16  Steak Doneness       — Rare / Medium-Rare* / Medium / Well Done
 * 17  Wings Quantity       — 6 pcs* / 9 pcs / 12 pcs
 * 18  Sandwich Size        — Regular* / Large
 * 19  Bread & Naan         — Single* / 2 pcs / 3 pcs
 * 20  Cake & Dessert       — Regular Slice* / Large Slice / Whole
 *
 *  * = is_default
 */

const AUTH_BASE  = 'https://formularms-api.bottle.com.np'
const API_BASE   = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

// One representative item per variant group
const MAX_PER_GROUP = 1

// ── 20 Variant Groups ─────────────────────────────────────────────────────────
const VARIANT_GROUPS = [
  {
    id: 1, name: 'Coffee Size',
    match: /americano|espresso|cappuccino|latte|flat white|cold brew|mocha|affogato|irish coffee/i,
    options: [
      { name: 'Small (8oz)',    isDefault: false, sort: 0, delta: -40 },
      { name: 'Regular (12oz)', isDefault: true,  sort: 1, delta:   0 },
      { name: 'Large (16oz)',   isDefault: false, sort: 2, delta:  60 },
    ],
  },
  {
    id: 2, name: 'Tea Size',
    match: /tea|chai/i,
    options: [
      { name: 'Small (150ml)',   isDefault: false, sort: 0, delta: -30 },
      { name: 'Regular (250ml)', isDefault: true,  sort: 1, delta:   0 },
      { name: 'Large (350ml)',   isDefault: false, sort: 2, delta:  40 },
    ],
  },
  {
    id: 3, name: 'Smoothie & Shake Size',
    match: /smoothie|milkshake|shake|lassi/i,
    options: [
      { name: 'Regular (300ml)', isDefault: true,  sort: 0, delta:   0 },
      { name: 'Large (500ml)',   isDefault: false, sort: 1, delta:  70 },
    ],
  },
  {
    id: 4, name: 'Juice Size',
    match: /juice/i,
    options: [
      { name: 'Small (250ml)',   isDefault: false, sort: 0, delta: -40 },
      { name: 'Regular (350ml)', isDefault: true,  sort: 1, delta:   0 },
      { name: 'Large (500ml)',   isDefault: false, sort: 2, delta:  60 },
    ],
  },
  {
    id: 5, name: 'Cocktail / Mocktail',
    match: /cocktail|mocktail|mojito|cosmopolitan|margarita|lemonade|cooler|shirley|colada|sour|fashioned|lagoon|passion|temple/i,
    options: [
      { name: 'Single', isDefault: true,  sort: 0, delta:   0 },
      { name: 'Double', isDefault: false, sort: 1, delta:  80 },
    ],
  },
  {
    id: 6, name: 'Pizza Size',
    match: /pizza/i,
    options: [
      { name: 'Personal (6")', isDefault: false, sort: 0, delta: -150 },
      { name: 'Medium (10")',  isDefault: true,  sort: 1, delta:    0 },
      { name: 'Large (14")',   isDefault: false, sort: 2, delta:  150 },
      { name: 'XL (16")',      isDefault: false, sort: 3, delta:  250 },
    ],
  },
  {
    id: 7, name: 'Burger Size',
    match: /burger/i,
    options: [
      { name: 'Regular',      isDefault: true,  sort: 0, delta:   0 },
      { name: 'Double Patty', isDefault: false, sort: 1, delta: 100 },
    ],
  },
  {
    id: 8, name: 'Pasta & Risotto Portion',
    match: /pasta|risotto|linguine|spaghetti|fettuccine|penne|lasagna|carbonara|alfredo|arrabbiata|mac and cheese/i,
    options: [
      { name: 'Regular',       isDefault: true,  sort: 0, delta:  0 },
      { name: 'Large Portion', isDefault: false, sort: 1, delta: 80 },
    ],
  },
  {
    id: 9, name: 'Momo Quantity',
    match: /momo|dumpling|gyoza/i,
    options: [
      { name: '6 pcs',  isDefault: true,  sort: 0, delta:   0 },
      { name: '10 pcs', isDefault: false, sort: 1, delta: 100 },
      { name: '15 pcs', isDefault: false, sort: 2, delta: 180 },
    ],
  },
  {
    id: 10, name: 'Biryani Portion',
    match: /biryani/i,
    options: [
      { name: 'Half Portion', isDefault: false, sort: 0, delta: -100 },
      { name: 'Full Portion', isDefault: true,  sort: 1, delta:    0 },
      { name: 'Party (2 kg)', isDefault: false, sort: 2, delta:  400 },
    ],
  },
  {
    id: 11, name: 'Curry Portion',
    match: /curry|korma|masala|makhani|tikka masala|butter chicken|rogan josh|saag|chole|dal|chhoyla|sukuti/i,
    options: [
      { name: 'Regular',           isDefault: true,  sort: 0, delta:   0 },
      { name: 'Large',             isDefault: false, sort: 1, delta:  80 },
      { name: 'Family (serves 4)', isDefault: false, sort: 2, delta: 250 },
    ],
  },
  {
    id: 12, name: 'Noodles Portion',
    match: /noodles|thukpa|chow mein|chowmein|pad thai|ramen|udon|dan dan|singapore/i,
    options: [
      { name: 'Regular',     isDefault: true,  sort: 0, delta:   0 },
      { name: 'Large',       isDefault: false, sort: 1, delta:  60 },
      { name: 'Extra Large', isDefault: false, sort: 2, delta: 120 },
    ],
  },
  {
    id: 13, name: 'Soup Size',
    match: /soup/i,
    options: [
      { name: 'Bowl',       isDefault: true,  sort: 0, delta:  0 },
      { name: 'Large Bowl', isDefault: false, sort: 1, delta: 60 },
    ],
  },
  {
    id: 14, name: 'Salad Size',
    match: /salad/i,
    options: [
      { name: 'Small',   isDefault: false, sort: 0, delta: -60 },
      { name: 'Regular', isDefault: true,  sort: 1, delta:   0 },
      { name: 'Large',   isDefault: false, sort: 2, delta:  80 },
    ],
  },
  {
    id: 15, name: 'Ice Cream & Gelato Scoop',
    match: /ice cream|gelato|kulfi|scoop|sorbet|sundae/i,
    options: [
      { name: 'Single Scoop', isDefault: true,  sort: 0, delta:   0 },
      { name: 'Double Scoop', isDefault: false, sort: 1, delta:  70 },
      { name: 'Triple Scoop', isDefault: false, sort: 2, delta: 130 },
    ],
  },
  {
    id: 16, name: 'Steak Doneness',
    match: /steak|tenderloin|rack of lamb|lamb chops|schnitzel|grilled salmon|tuna steak/i,
    options: [
      { name: 'Rare',        isDefault: false, sort: 0, delta: 0 },
      { name: 'Medium-Rare', isDefault: true,  sort: 1, delta: 0 },
      { name: 'Medium',      isDefault: false, sort: 2, delta: 0 },
      { name: 'Well Done',   isDefault: false, sort: 3, delta: 0 },
    ],
  },
  {
    id: 17, name: 'Wings Quantity',
    match: /wings/i,
    options: [
      { name: '6 pcs',  isDefault: true,  sort: 0, delta:   0 },
      { name: '9 pcs',  isDefault: false, sort: 1, delta:  80 },
      { name: '12 pcs', isDefault: false, sort: 2, delta: 150 },
    ],
  },
  {
    id: 18, name: 'Sandwich Size',
    match: /sandwich|wrap|toast|bagel|croissant|bruschetta/i,
    options: [
      { name: 'Regular', isDefault: true,  sort: 0, delta:  0 },
      { name: 'Large',   isDefault: false, sort: 1, delta: 60 },
    ],
  },
  {
    id: 19, name: 'Bread & Naan Quantity',
    match: /naan|roti|bread|paratha/i,
    options: [
      { name: 'Single', isDefault: true,  sort: 0, delta:   0 },
      { name: '2 pcs',  isDefault: false, sort: 1, delta:  80 },
      { name: '3 pcs',  isDefault: false, sort: 2, delta: 150 },
    ],
  },
  {
    id: 20, name: 'Cake & Dessert Slice',
    match: /cake|tart|tiramisu|panna cotta|brownie|eclair|crème brûlée|creme brulee|gulab jamun|kheer|baklava|cheesecake|yomari/i,
    options: [
      { name: 'Regular Slice', isDefault: true,  sort: 0, delta:   0 },
      { name: 'Large Slice',   isDefault: false, sort: 1, delta:  60 },
      { name: 'Whole',         isDefault: false, sort: 2, delta: 400 },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct  = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

function calcPrice(base, delta) {
  return Math.max(50, Math.round(parseFloat(base) + delta)).toFixed(2)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!OTP_CODE) {
    console.error('Usage: OTP_CODE=<code> node scripts/create-variants.js')
    process.exit(1)
  }

  // Authenticate
  console.log('Authenticating...')
  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/', {
    identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE),
  })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('✓ Authenticated\n')

  // ── Step 1: Ensure all 20 variant groups exist ─────────────────────────────
  console.log('Step 1: Ensuring variant groups exist...')
  const existingGroups = await req('GET', `${API_BASE}/menu/variant-groups/`, null, token)
  const groupsByName = {}
  for (const g of (existingGroups.data || [])) groupsByName[g.name] = g

  const groupMap = {}  // groupId (1-20) → { id, options: { optionName → optionId } }

  for (const vg of VARIANT_GROUPS) {
    if (groupsByName[vg.name]) {
      const g = groupsByName[vg.name]
      const optMap = {}
      for (const o of g.options) optMap[o.name] = o.id
      groupMap[vg.id] = { id: g.id, options: optMap }
      console.log(`  ↷  "${vg.name}" already exists (${g.options.length} options)`)
    } else {
      const r = await req('POST', `${API_BASE}/menu/variant-groups/`, {
        name: vg.name,
        options: vg.options.map(o => ({ name: o.name, is_default: o.isDefault, sort_order: o.sort })),
      }, token)
      if (r.status !== 200 && r.status !== 201) {
        console.error(`  ✗  Failed to create group "${vg.name}": ${JSON.stringify(r.data)}`)
        continue
      }
      const optMap = {}
      for (const o of r.data.options) optMap[o.name] = o.id
      groupMap[vg.id] = { id: r.data.id, options: optMap }
      console.log(`  ✓  Created "${vg.name}" (${r.data.options.length} options)`)
    }
  }
  console.log()

  // ── Step 2: Fetch all items ────────────────────────────────────────────────
  console.log('Step 2: Fetching all menu items...')
  let url = `${API_BASE}/menu/items/?limit=300`
  const allItems = []
  while (url) {
    const r = await req('GET', url, null, token)
    const items = Array.isArray(r.data) ? r.data : (r.data?.results || [])
    allItems.push(...items)
    url = r.data?.next || null
  }
  console.log(`✓ ${allItems.length} items loaded\n`)

  // ── Step 3: Delete stale null-option variants & create linked ones ─────────
  console.log('Step 3: Linking item variants to groups...')
  const stats = { created: 0, deleted: 0, skipped: 0, noMatch: 0, failed: 0 }
  const groupCount = {}
  VARIANT_GROUPS.forEach(vg => { groupCount[vg.id] = 0 })

  const W = 36
  for (const item of allItems) {
    // Find matching group
    const vg = VARIANT_GROUPS.find(g => g.match.test(item.name))
    if (!vg) { stats.noMatch++; continue }

    // Already processed enough for this group
    if (groupCount[vg.id] >= MAX_PER_GROUP) { stats.noMatch++; continue }

    const gm = groupMap[vg.id]
    if (!gm) { stats.failed++; continue }

    // Delete existing variants that have no variant_option_id (stale ones we created before)
    const stale = (item.variants || []).filter(v => v.variant_option_id === null)
    const hasLinked = (item.variants || []).some(v => v.variant_option_id !== null)

    if (hasLinked) {
      // Already properly linked — skip
      console.log(`  ↷  ${item.name.padEnd(W)}  already has linked variants — skipped`)
      stats.skipped++
      continue
    }

    for (const sv of stale) {
      const dr = await req('DELETE', `${API_BASE}/menu/variants/${sv.id}/`, null, token)
      if (dr.status === 204 || dr.status === 200) stats.deleted++
    }

    // Create new variants linked to group options
    let allOk = true
    const createdNames = []
    for (const opt of vg.options) {
      const optId = gm.options[opt.name]
      if (!optId) {
        console.log(`  ✗  ${item.name.padEnd(W)}  option "${opt.name}" not found in group`)
        allOk = false; stats.failed++
        continue
      }
      const price = calcPrice(item.base_price, opt.delta)
      const r = await req('POST', `${API_BASE}/menu/variants/`, {
        menu_item:        item.id,
        name:             opt.name,
        price,
        is_default:       opt.isDefault,
        sort_order:       opt.sort,
        variant_option_id: optId,
      }, token)

      if (r.status !== 200 && r.status !== 201) {
        console.log(`  ✗  ${item.name.padEnd(W)}  variant "${opt.name}" FAILED (${r.status}): ${JSON.stringify(r.data).substring(0, 80)}`)
        allOk = false; stats.failed++
      } else {
        createdNames.push(opt.name)
        stats.created++
      }
    }

    if (allOk) {
      console.log(`  ✓  ${item.name.padEnd(W)}  [${vg.name}]  →  ${createdNames.join(' / ')}`)
      groupCount[vg.id]++
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(72))
  console.log(`  ✓  ${stats.created} variants created across ${Object.values(groupCount).filter(c=>c>0).length} items`)
  if (stats.deleted)  console.log(`  🗑  ${stats.deleted} stale variants deleted`)
  if (stats.skipped)  console.log(`  ↷  ${stats.skipped} items already had linked variants`)
  if (stats.noMatch)  console.log(`  –  ${stats.noMatch} items had no matching group or cap reached`)
  if (stats.failed)   console.log(`  ✗  ${stats.failed} failures`)
  console.log('\n  Groups created/reused:')
  VARIANT_GROUPS.forEach(vg => {
    const gm = groupMap[vg.id]
    if (gm) console.log(`     ${String(vg.id).padStart(2)}  ${vg.name.padEnd(30)}  ${vg.options.length} options`)
  })
  console.log('═'.repeat(72))
}

main().catch(err => { console.error(err); process.exit(1) })
