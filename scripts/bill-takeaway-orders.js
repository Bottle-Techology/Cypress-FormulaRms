/**
 * Mark all open takeaway orders (#22–#41) as billed
 * Usage: OTP_CODE=<code> node scripts/bill-takeaway-orders.js
 */

const AUTH_BASE = 'https://formularms-api.bottle.com.np'
const API_BASE  = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

async function main() {
  if (!OTP_CODE) { console.error('Usage: OTP_CODE=<code> node scripts/bill-takeaway-orders.js'); process.exit(1) }

  // Authenticate
  console.log('Authenticating...')
  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/', {
    identifier: IDENTIFIER, method: 'email', code: OTP_CODE
  })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('✓ Authenticated\n')

  // Fetch all open takeaway orders (paginated)
  console.log('Fetching open takeaway orders...')
  let url = API_BASE + '/orders/?type=takeaway&status=open&limit=50'
  const allOrders = []
  while (url) {
    const r = await req('GET', url, null, token)
    const items = Array.isArray(r.data) ? r.data : (r.data?.results || [])
    allOrders.push(...items)
    url = r.data?.next || null
  }

  // Filter to order numbers 22–41
  const targets = allOrders.filter(o => o.order_number >= 22 && o.order_number <= 41)
  console.log(`Found ${targets.length} open takeaway orders to bill\n`)

  if (targets.length === 0) {
    console.log('No matching orders found. Fetching all orders to debug...')
    const all = await req('GET', API_BASE + '/orders/?limit=50', null, token)
    const sample = (Array.isArray(all.data) ? all.data : all.data?.results || [])
      .slice(0,5).map(o => ({ num: o.order_number, type: o.type, status: o.status }))
    console.log('Sample orders:', JSON.stringify(sample, null, 2))
    return
  }

  // Sort by order number
  targets.sort((a, b) => a.order_number - b.order_number)

  // Try direct PATCH to billed first on one order to check if it works
  const probe = targets[0]
  const probeRes = await req('PATCH', `${API_BASE}/orders/${probe.id}/`, { status: 'billed' }, token)
  console.log(`Status transition probe (order #${probe.order_number}): ${probeRes.status}`)

  let billingStrategy = 'patch'
  if (probeRes.status !== 200 && probeRes.status !== 204) {
    console.log('Direct PATCH failed:', JSON.stringify(probeRes.data))
    // Try via bill endpoint
    const billRes = await req('POST', `${API_BASE}/orders/${probe.id}/bill/`, {}, token)
    console.log(`Bill endpoint probe: ${billRes.status}`, JSON.stringify(billRes.data))
    billingStrategy = billRes.status === 200 || billRes.status === 201 ? 'bill-endpoint' : 'unknown'
  }

  console.log(`\nUsing strategy: ${billingStrategy}\n`)

  // Update all orders
  const results = []
  const rest = probeRes.status === 200 || probeRes.status === 204
    ? [{ order: probe, res: probeRes }, ...await Promise.resolve([])]
    : []

  // Process probe result
  const probeOk = probeRes.status === 200 || probeRes.status === 204
  console.log(probeOk ? '  ✓' : '  ✗', `Order #${probe.order_number}  ${probe.customer_name}  → ${probeOk ? 'billed' : 'FAILED (' + probeRes.status + ')'}`)
  results.push({ order_number: probe.order_number, ok: probeOk })

  // Process remaining orders
  for (const order of targets.slice(1)) {
    let ok = false
    let detail = ''

    if (billingStrategy === 'patch') {
      const r = await req('PATCH', `${API_BASE}/orders/${order.id}/`, { status: 'billed' }, token)
      ok = r.status === 200 || r.status === 204
      if (!ok) detail = `status ${r.status}`
    } else if (billingStrategy === 'bill-endpoint') {
      const r = await req('POST', `${API_BASE}/orders/${order.id}/bill/`, {}, token)
      ok = r.status === 200 || r.status === 201
      if (!ok) detail = `status ${r.status}`
    }

    console.log(ok ? '  ✓' : '  ✗', `Order #${order.order_number}  ${order.customer_name.padEnd(22)}  → ${ok ? 'billed' : 'FAILED ' + detail}`)
    results.push({ order_number: order.order_number, ok })
  }

  const passed = results.filter(r => r.ok).length
  console.log('\n' + '═'.repeat(60))
  console.log(`  ${passed}/${targets.length} orders marked as billed`)
  if (passed < targets.length) console.log(`  Failed: ${results.filter(r => !r.ok).map(r => '#' + r.order_number).join(', ')}`)
  console.log('═'.repeat(60))
}

main().catch(err => { console.error(err); process.exit(1) })
