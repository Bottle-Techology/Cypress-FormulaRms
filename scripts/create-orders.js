/**
 * Create 16 active orders (mix of dine_in + takeaway, various statuses).
 * Usage: OTP_CODE=<code> node scripts/create-orders.js
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
  if (!OTP_CODE) { console.error('Usage: OTP_CODE=<code> node scripts/create-orders.js'); process.exit(1) }

  // Auth
  console.log('Authenticating...')
  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/', {
    identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE),
  })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('✓ Authenticated\n')

  // Fetch available tables
  console.log('Fetching tables...')
  const tablesRes = await req('GET', API_BASE + '/tables/', null, token)
  const tables = Array.isArray(tablesRes.data) ? tablesRes.data : tablesRes.data.results || []
  const available = tables.filter(t => t.status === 'available')
  console.log(`✓ ${tables.length} tables total, ${available.length} available\n`)

  // Fetch menu items
  console.log('Fetching menu items...')
  const itemsRes = await req('GET', API_BASE + '/menu/items/?limit=20', null, token)
  const allItems = Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.results || []
  const items = allItems.slice(0, 8)
  console.log(`✓ Using first ${items.length} items for orders\n`)

  // 16 orders definition
  const tableIds = available.map(t => t.id)
  const ORDERS = [
    // dine_in — open status (8 orders)
    { type: 'dine_in', customer_name: 'Table B1 Guest',  guests: 2, table: tableIds[0],  status: 'open' },
    { type: 'dine_in', customer_name: 'Table B2 Guest',  guests: 3, table: tableIds[1],  status: 'open' },
    { type: 'dine_in', customer_name: 'Table B3 Guest',  guests: 4, table: tableIds[2],  status: 'open' },
    { type: 'dine_in', customer_name: 'Table B4 Guest',  guests: 2, table: tableIds[3],  status: 'open' },
    { type: 'dine_in', customer_name: 'Table G1 Guest',  guests: 5, table: tableIds[4],  status: 'open' },
    { type: 'dine_in', customer_name: 'Table G2 Guest',  guests: 2, table: tableIds[5],  status: 'open' },
    { type: 'dine_in', customer_name: 'Table G3 Guest',  guests: 3, table: tableIds[6],  status: 'open' },
    { type: 'dine_in', customer_name: 'Table G4 Guest',  guests: 6, table: tableIds[7],  status: 'open' },
    // dine_in — preparing (2 orders)
    { type: 'dine_in', customer_name: 'Table P1 Guest',  guests: 2, table: tableIds[8]  || tableIds[0], status: 'preparing' },
    { type: 'dine_in', customer_name: 'Table P2 Guest',  guests: 4, table: tableIds[9]  || tableIds[1], status: 'preparing' },
    // dine_in — ready (2 orders)
    { type: 'dine_in', customer_name: 'Table R1 Guest',  guests: 3, table: tableIds[10] || tableIds[2], status: 'ready' },
    { type: 'dine_in', customer_name: 'Table R2 Guest',  guests: 2, table: tableIds[11] || tableIds[3], status: 'ready' },
    // takeaway — open (2 orders)
    { type: 'takeaway', customer_name: 'Ramesh Thapa',   customer_phone: '9841001001', status: 'open' },
    { type: 'takeaway', customer_name: 'Sita Sharma',    customer_phone: '9841002002', status: 'open' },
    // takeaway — preparing (2 orders)
    { type: 'takeaway', customer_name: 'Kumar Rai',      customer_phone: '9841003003', status: 'preparing' },
    { type: 'takeaway', customer_name: 'Maya Gurung',    customer_phone: '9841004004', status: 'preparing' },
  ]

  console.log('Creating 16 orders...\n')
  let created = 0, failed = 0
  const W = 42

  for (const o of ORDERS) {
    const { status: targetStatus, ...orderBody } = o

    // Create order
    const r = await req('POST', API_BASE + '/orders/', orderBody, token)
    if (r.status !== 200 && r.status !== 201) {
      console.log(`  ✗  ${o.customer_name.padEnd(W)}  FAILED (${r.status}): ${JSON.stringify(r.data).substring(0,60)}`)
      failed++
      continue
    }

    const orderId = r.data.id
    const orderNum = r.data.order_number

    // Add 2 random items
    const orderItems = [
      { menu_item: items[0].id, quantity: 2 },
      { menu_item: items[1 % items.length].id, quantity: 1 },
    ]
    const itemRes = await req('POST', `${API_BASE}/orders/${orderId}/items/bulk/`, orderItems, token)
    const itemLabel = itemRes.status === 200 || itemRes.status === 201 ? '✓ items' : `items ${itemRes.status}`

    // Advance status if not open
    let statusLabel = 'open'
    if (targetStatus !== 'open') {
      const sr = await req('PATCH', `${API_BASE}/orders/${orderId}/`, { status: targetStatus }, token)
      statusLabel = sr.status === 200 || sr.status === 204 ? targetStatus : `status ${sr.status}`
    }

    const typeLabel = o.type === 'dine_in' ? `dine_in` : `takeaway`
    console.log(`  ✓  #${String(orderNum).padEnd(4)} ${o.customer_name.padEnd(W-6)} [${typeLabel}]  ${statusLabel}`)
    created++
  }

  console.log('\n' + '═'.repeat(62))
  console.log(`  ✓  ${created} orders created`)
  if (failed) console.log(`  ✗  ${failed} failed`)
  console.log('\n  Status breakdown:')
  console.log('     open       — 10 orders (8 dine_in + 2 takeaway)')
  console.log('     preparing  —  4 orders (2 dine_in + 2 takeaway)')
  console.log('     ready      —  2 orders (2 dine_in)')
  console.log('═'.repeat(62))
}

main().catch(err => { console.error(err); process.exit(1) })
