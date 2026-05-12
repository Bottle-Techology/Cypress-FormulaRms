/**
 * Add 5 menu items to each active open/preparing/ready order.
 * Uses POST /api/v1/orders/:id/add_items/ with {"items": [...]} body.
 *
 * Usage: OTP_CODE=<code> node scripts/add-order-items.js
 */

const AUTH_BASE = 'https://formularms-api.bottle.com.np'
const API_BASE  = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE  = process.env.OTP_CODE

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

async function main() {
  if (!OTP_CODE) { console.error('Usage: OTP_CODE=<code> node scripts/add-order-items.js'); process.exit(1) }

  // Auth
  console.log('Authenticating...')
  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/', {
    identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE),
  })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('✓ Authenticated\n')

  // Fetch menu items
  console.log('Fetching menu items...')
  const itemsRes = await req('GET', API_BASE + '/menu/items/?limit=20', null, token)
  const allItems = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || []
  if (allItems.length < 5) { console.error(`Only ${allItems.length} items — need at least 5`); process.exit(1) }
  const pick5 = allItems.slice(0, 5)
  console.log(`✓ Using ${pick5.length} items: ${pick5.map(i => i.name).join(', ')}\n`)

  // Fetch active orders (open, preparing, ready)
  console.log('Fetching active orders...')
  const ordersRes = await req('GET', API_BASE + '/orders/?limit=100', null, token)
  const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || []
  const active = allOrders.filter(o => ['open', 'preparing', 'ready'].includes(o.status))
  console.log(`✓ ${active.length} active orders (open/preparing/ready)\n`)

  if (active.length === 0) {
    console.log('No active orders found. Run create-orders.js first.')
    process.exit(0)
  }

  // Build item payload — 5 items with varying quantities
  const itemPayload = [
    { menu_item: pick5[0].id, quantity: 2 },
    { menu_item: pick5[1].id, quantity: 1 },
    { menu_item: pick5[2].id, quantity: 1 },
    { menu_item: pick5[3].id, quantity: 2 },
    { menu_item: pick5[4].id, quantity: 1 },
  ]

  console.log(`Adding 5 items to ${active.length} orders...\n`)
  let succeeded = 0, failed = 0
  const W = 36

  for (const order of active) {
    const label = `#${String(order.order_number).padEnd(4)} ${(order.customer_name || '—').substring(0, W).padEnd(W)}`

    // Try {"items": [...]} wrapper format first
    let r = await req('POST', `${API_BASE}/orders/${order.id}/add_items/`, { items: itemPayload }, token)

    if (r.status === 200 || r.status === 201) {
      console.log(`  ✓  ${label} [${order.status}]  items added`)
      succeeded++
      continue
    }

    // Fallback: try bare array (some versions accept this)
    if (r.status === 400 || r.status === 422) {
      const r2 = await req('POST', `${API_BASE}/orders/${order.id}/add_items/`, itemPayload, token)
      if (r2.status === 200 || r2.status === 201) {
        console.log(`  ✓  ${label} [${order.status}]  items added (bare-array format)`)
        succeeded++
        continue
      }
      console.log(`  ✗  ${label}  FAILED (${r.status}/${r2.status}): ${JSON.stringify(r.data).substring(0, 80)}`)
    } else {
      console.log(`  ✗  ${label}  FAILED (${r.status}): ${JSON.stringify(r.data).substring(0, 80)}`)
    }
    failed++
  }

  console.log('\n' + '═'.repeat(64))
  console.log(`  ✓  ${succeeded} orders updated with 5 items`)
  if (failed) console.log(`  ✗  ${failed} failed`)
  console.log('═'.repeat(64))
}

main().catch(err => { console.error(err); process.exit(1) })
