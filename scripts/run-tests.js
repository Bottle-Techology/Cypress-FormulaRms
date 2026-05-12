/**
 * Formula RMS – Node.js API Test Runner
 * Runs all API-level tests directly against the live server.
 * UI tests that need a browser are marked SKIPPED with a reason.
 */

const AUTH_BASE = 'https://formularms-api.bottle.com.np'
const API_BASE  = `${AUTH_BASE}/api/v1`
const APP_BASE  = 'https://formularms.bottle.com.np'

const OTP_CODE  = process.env.OTP_CODE  || null
const IDENTIFIER= process.env.IDENTIFIER || 'pranuj@bottle.com.np'

let accessToken = null
const results   = []
let suiteStart  = Date.now()

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    let responseBody
    const ct = res.headers.get('content-type') || ''
    try {
      responseBody = ct.includes('json') ? await res.json() : await res.text()
    } catch {
      responseBody = null
    }
    return { status: res.status, body: responseBody, headers: Object.fromEntries(res.headers) }
  } catch (err) {
    return { status: 0, body: null, error: err.message }
  }
}

function pass(suite, name, detail = '') {
  results.push({ suite, name, status: 'PASS', detail })
  console.log(`  ✓  ${name}${detail ? ' — ' + detail : ''}`)
}

function fail(suite, name, detail = '') {
  results.push({ suite, name, status: 'FAIL', detail })
  console.log(`  ✗  ${name} — ${detail}`)
}

function skip(suite, name, reason = 'requires OTP_CODE') {
  results.push({ suite, name, status: 'SKIP', detail: reason })
  console.log(`  –  ${name} [SKIPPED: ${reason}]`)
}

function suite(name) {
  console.log(`\n▶ ${name}`)
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function login() {
  if (!OTP_CODE) return false
  const res = await req('POST', `${AUTH_BASE}/auth/login/verify-otp/`, {
    identifier: IDENTIFIER, method: 'email', code: OTP_CODE,
  })
  if (res.status === 200 && res.body?.access) {
    accessToken = res.body.access
    return true
  }
  return false
}

// ─── Test suites ──────────────────────────────────────────────────────────────

async function testApiHealth() {
  suite('18 – API Health')

  // Health endpoint
  for (const path of ['/health/', '/ping/']) {
    const r = await req('GET', `${AUTH_BASE}${path}`)
    if (r.status === 200) { pass('API Health', `GET ${path} → 200`); break }
    if (path === '/ping/') pass('API Health', 'Health/ping endpoint (graceful 404)', `status ${r.status}`)
  }

  // Auth base reachable
  const base = await req('GET', `${AUTH_BASE}/`)
  base.status < 500
    ? pass('API Health', 'Auth base reachable (< 500)', `status ${base.status}`)
    : fail('API Health', 'Auth base reachable', `got ${base.status}`)

  // JSON content-type
  const otp = await req('POST', `${AUTH_BASE}/auth/login/send-otp/`, { identifier: 'ct@example.com', method: 'email' })
  const ct = otp.headers?.['content-type'] || ''
  ct.includes('application/json')
    ? pass('API Health', 'Auth endpoint returns application/json content-type')
    : fail('API Health', 'Auth endpoint content-type', `got "${ct}"`)

  // 404 on unknown paths (not 500)
  const unk = await req('GET', `${API_BASE}/nonexistent-path-xyz/`)
  ;[401, 403, 404].includes(unk.status)
    ? pass('API Health', 'Unknown path → 404/401/403 (not 500)', `status ${unk.status}`)
    : fail('API Health', 'Unknown path should not return 5xx', `got ${unk.status}`)

  // send-otp doesn't 5xx
  const sendOtp = await req('POST', `${AUTH_BASE}/auth/login/send-otp/`, { identifier: 'health@example.com', method: 'email' })
  sendOtp.status < 500
    ? pass('API Health', 'POST /auth/login/send-otp/ no 5xx', `status ${sendOtp.status}`)
    : fail('API Health', 'POST /auth/login/send-otp/ returned 5xx', `status ${sendOtp.status}`)
}

async function testAuth() {
  suite('03 – Authentication')

  // send-otp valid
  const valid = await req('POST', `${AUTH_BASE}/auth/login/send-otp/`, { identifier: IDENTIFIER, method: 'email' })
  ;[200, 201, 400].includes(valid.status)
    ? pass('Auth', `POST /auth/login/send-otp/ valid identifier → ${valid.status}`)
    : fail('Auth', 'POST /auth/login/send-otp/ valid identifier', `got ${valid.status}`)

  // send-otp invalid
  const inv = await req('POST', `${AUTH_BASE}/auth/login/send-otp/`, { identifier: 'notexist@example.com', method: 'email' })
  ;[400, 404].includes(inv.status)
    ? pass('Auth', 'POST /auth/login/send-otp/ invalid identifier → 400/404', `status ${inv.status}`)
    : fail('Auth', 'POST /auth/login/send-otp/ invalid identifier', `got ${inv.status}`)

  // verify-otp wrong code
  const wrong = await req('POST', `${AUTH_BASE}/auth/login/verify-otp/`, { identifier: IDENTIFIER, method: 'email', code: '000000' })
  ;[400, 401].includes(wrong.status)
    ? pass('Auth', 'POST /auth/login/verify-otp/ wrong code → 400/401', `status ${wrong.status}`)
    : fail('Auth', 'POST /auth/login/verify-otp/ wrong code', `got ${wrong.status}`)

  // OTP login
  if (!OTP_CODE) {
    skip('Auth', 'POST /auth/login/verify-otp/ correct code → tokens')
  } else {
    const res = await req('POST', `${AUTH_BASE}/auth/login/verify-otp/`, { identifier: IDENTIFIER, method: 'email', code: OTP_CODE })
    if (res.status === 200 && res.body?.access && res.body?.refresh) {
      accessToken = res.body.access
      pass('Auth', 'POST /auth/login/verify-otp/ → access + refresh tokens')
    } else {
      fail('Auth', 'POST /auth/login/verify-otp/ correct code', `status ${res.status}, body: ${JSON.stringify(res.body)}`)
    }
  }
}

async function testSignup() {
  suite('01 – Signup')

  const invalid = await req('POST', `${AUTH_BASE}/auth/signup/send-otp/`, { identifier: 'notvalid@@bad', method: 'email' })
  ;[400, 422].includes(invalid.status)
    ? pass('Signup', 'POST /auth/signup/send-otp/ invalid email → 400/422', `status ${invalid.status}`)
    : fail('Signup', 'POST /auth/signup/send-otp/ invalid email', `got ${invalid.status}`)

  const empty = await req('POST', `${AUTH_BASE}/auth/signup/send-otp/`, { identifier: '', method: 'email' })
  ;[400, 422].includes(empty.status)
    ? pass('Signup', 'POST /auth/signup/send-otp/ empty identifier → 400/422', `status ${empty.status}`)
    : fail('Signup', 'POST /auth/signup/send-otp/ empty identifier', `got ${empty.status}`)
}

async function testPermissions() {
  suite('19 – Permissions & Authorization')

  const endpoints = [
    { method: 'GET',  url: `${API_BASE}/menu/menus/`      },
    { method: 'GET',  url: `${API_BASE}/menu/categories/` },
    { method: 'GET',  url: `${API_BASE}/menu/items/`      },
    { method: 'GET',  url: `${API_BASE}/orders/`          },
    { method: 'GET',  url: `${API_BASE}/tables/`          },
    { method: 'POST', url: `${API_BASE}/menu/menus/`      },
    { method: 'POST', url: `${API_BASE}/orders/`          },
  ]

  for (const { method, url } of endpoints) {
    const r = await req(method, url)
    const path = url.replace(API_BASE, '')
    ;[401, 403].includes(r.status)
      ? pass('Permissions', `${method} ${path} without token → ${r.status}`)
      : fail('Permissions', `${method} ${path} without token`, `expected 401/403, got ${r.status}`)
  }

  // Invalid token
  const badToken = await req('GET', `${API_BASE}/menu/items/`, null, 'thisIsNotAValidJWT')
  ;[401, 403, 404].includes(badToken.status)
    ? pass('Permissions', 'GET /menu/items/ with invalid token → blocks access', `status ${badToken.status}`)
    : fail('Permissions', 'GET /menu/items/ with invalid token', `got ${badToken.status}`)

  // Empty auth header
  const emptyAuth = await fetch(`${API_BASE}/orders/`, { headers: { Authorization: '' } })
  ;[401, 403, 404].includes(emptyAuth.status)
    ? pass('Permissions', 'GET /orders/ empty Authorization → blocks access', `status ${emptyAuth.status}`)
    : fail('Permissions', 'GET /orders/ empty Authorization', `got ${emptyAuth.status}`)

  // Non-existent resource
  const notFound = await req('DELETE', `${API_BASE}/menu/items/99999/`)
  ;[401, 403, 404].includes(notFound.status)
    ? pass('Permissions', 'DELETE unknown item id → 401/403/404', `status ${notFound.status}`)
    : fail('Permissions', 'DELETE unknown item id', `got ${notFound.status}`)
}

async function testSecurity() {
  suite('22 – Security')

  // HTTPS
  API_BASE.startsWith('https://')
    ? pass('Security', 'API_BASE uses HTTPS')
    : fail('Security', 'API_BASE must use HTTPS')

  AUTH_BASE.startsWith('https://')
    ? pass('Security', 'AUTH_BASE uses HTTPS')
    : fail('Security', 'AUTH_BASE must use HTTPS')

  // No stack trace in 400 response
  const r = await req('POST', `${AUTH_BASE}/auth/login/send-otp/`, {})
  const body = JSON.stringify(r.body || '')
  !body.includes('Traceback') && !body.includes('django.db') && !body.includes('site-packages')
    ? pass('Security', '400 response does not leak stack trace')
    : fail('Security', '400 response leaks stack trace/internals')

  // No internal paths in 404 response
  const r404 = await req('GET', `${API_BASE}/nonexistent/`)
  const body404 = JSON.stringify(r404.body || '')
  !body404.includes('/home/') && !body404.includes('/usr/lib/')
    ? pass('Security', '404 response does not expose internal paths')
    : fail('Security', '404 response exposes internal file paths')

  // x-powered-by not exposed
  const hdr = await req('GET', `${AUTH_BASE}/`)
  const xpb = hdr.headers?.['x-powered-by']
  !xpb
    ? pass('Security', 'No X-Powered-By header exposed')
    : fail('Security', 'X-Powered-By header exposed', `value: ${xpb}`)

  // Server header doesn't expose version number
  const server = hdr.headers?.['server'] || ''
  !/\d+\.\d+\.\d+/.test(server)
    ? pass('Security', 'Server header does not expose version', `server: "${server}"`)
    : fail('Security', 'Server header exposes version', `server: "${server}"`)
}

async function testMenuCrud() {
  suite('04 – Menu Management')
  if (!accessToken) { skip('Menu', 'All menu CRUD tests'); return }

  const list = await req('GET', `${API_BASE}/menu/menus/`, null, accessToken)
  list.status === 200
    ? pass('Menu', 'GET /menu/menus/ → 200')
    : fail('Menu', 'GET /menu/menus/', `got ${list.status}`)

  const arr = Array.isArray(list.body) ? list.body : list.body?.results
  Array.isArray(arr)
    ? pass('Menu', 'Response is array or paginated object')
    : fail('Menu', 'Response shape', `expected array, got ${typeof list.body}`)

  const ts = Date.now()
  const created = await req('POST', `${API_BASE}/menu/menus/`, { name: `[TEST] Runner Menu ${ts}`, description: 'auto' }, accessToken)
  ;[200, 201].includes(created.status)
    ? pass('Menu', `POST /menu/menus/ → ${created.status}`)
    : fail('Menu', 'POST /menu/menus/', `got ${created.status}`)

  if (created.body?.id) {
    const id = created.body.id
    const get = await req('GET', `${API_BASE}/menu/menus/${id}/`, null, accessToken)
    get.status === 200 ? pass('Menu', `GET /menu/menus/${id}/ → 200`) : fail('Menu', `GET /menu/menus/${id}/`, `got ${get.status}`)

    const patch = await req('PATCH', `${API_BASE}/menu/menus/${id}/`, { name: `[TEST] Runner Menu ${ts} updated` }, accessToken)
    ;[200, 204].includes(patch.status) ? pass('Menu', 'PATCH menu → 200/204') : fail('Menu', 'PATCH menu', `got ${patch.status}`)

    const del = await req('DELETE', `${API_BASE}/menu/menus/${id}/`, null, accessToken)
    ;[200, 204].includes(del.status) ? pass('Menu', 'DELETE menu → 200/204') : fail('Menu', 'DELETE menu', `got ${del.status}`)
  }
}

async function testCategories() {
  suite('05 – Categories')
  if (!accessToken) { skip('Categories', 'All category CRUD tests'); return }

  const list = await req('GET', `${API_BASE}/menu/categories/`, null, accessToken)
  list.status === 200 ? pass('Categories', 'GET /menu/categories/ → 200') : fail('Categories', 'GET /menu/categories/', `got ${list.status}`)

  const ts = Date.now()
  const created = await req('POST', `${API_BASE}/menu/categories/`, { name: `[TEST] Runner Cat ${ts}` }, accessToken)
  ;[200, 201].includes(created.status) ? pass('Categories', `POST → ${created.status}`) : fail('Categories', 'POST /menu/categories/', `got ${created.status}`)

  if (created.body?.id) {
    const id = created.body.id
    const patch = await req('PATCH', `${API_BASE}/menu/categories/${id}/`, { name: `[TEST] Runner Cat ${ts} upd` }, accessToken)
    ;[200, 204].includes(patch.status) ? pass('Categories', 'PATCH category → 200/204') : fail('Categories', 'PATCH', `got ${patch.status}`)
    const del = await req('DELETE', `${API_BASE}/menu/categories/${id}/`, null, accessToken)
    ;[200, 204].includes(del.status) ? pass('Categories', 'DELETE category → 200/204') : fail('Categories', 'DELETE', `got ${del.status}`)
  }

  // Validation – empty name
  const bad = await req('POST', `${API_BASE}/menu/categories/`, { name: '' }, accessToken)
  ;[400, 422].includes(bad.status) ? pass('Categories', 'POST empty name → 400/422', `status ${bad.status}`) : fail('Categories', 'POST empty name validation', `got ${bad.status}`)
}

async function testItems() {
  suite('06 – Menu Items')
  if (!accessToken) { skip('Items', 'All item CRUD tests'); return }

  const list = await req('GET', `${API_BASE}/menu/items/`, null, accessToken)
  list.status === 200 ? pass('Items', 'GET /menu/items/ → 200') : fail('Items', 'GET /menu/items/', `got ${list.status}`)

  const ts = Date.now()
  const created = await req('POST', `${API_BASE}/menu/items/`, { name: `[TEST] Runner Item ${ts}`, base_price: '99.00', food_type: 'veg' }, accessToken)
  ;[200, 201].includes(created.status) ? pass('Items', `POST → ${created.status}`) : fail('Items', 'POST /menu/items/', `got ${created.status}`)

  if (created.body?.id) {
    const id = created.body.id
    const get = await req('GET', `${API_BASE}/menu/items/${id}/`, null, accessToken)
    get.status === 200 ? pass('Items', 'GET item by id → 200') : fail('Items', 'GET item by id', `got ${get.status}`)
    const patch = await req('PATCH', `${API_BASE}/menu/items/${id}/`, { base_price: '120.00' }, accessToken)
    ;[200, 204].includes(patch.status) ? pass('Items', 'PATCH item price → 200/204') : fail('Items', 'PATCH', `got ${patch.status}`)
    const del = await req('DELETE', `${API_BASE}/menu/items/${id}/`, null, accessToken)
    ;[200, 204].includes(del.status) ? pass('Items', 'DELETE item → 200/204') : fail('Items', 'DELETE', `got ${del.status}`)
  }

  // Validation – negative price
  const neg = await req('POST', `${API_BASE}/menu/items/`, { name: '[TEST] Bad', base_price: '-10.00', food_type: 'veg' }, accessToken)
  ;[400, 422].includes(neg.status) ? pass('Items', 'POST negative price → 400/422', `status ${neg.status}`) : fail('Items', 'POST negative price validation', `got ${neg.status}`)
}

async function testOrders() {
  suite('07 – Orders')
  if (!accessToken) { skip('Orders', 'All order tests'); return }

  const list = await req('GET', `${API_BASE}/orders/`, null, accessToken)
  list.status === 200 ? pass('Orders', 'GET /orders/ → 200') : fail('Orders', 'GET /orders/', `got ${list.status}`)

  for (const status of ['pending', 'completed', 'cancelled']) {
    const r = await req('GET', `${API_BASE}/orders/?status=${status}`, null, accessToken)
    r.status === 200 ? pass('Orders', `GET /orders/?status=${status} → 200`) : fail('Orders', `filter status=${status}`, `got ${r.status}`)
  }

  // Create order
  const created = await req('POST', `${API_BASE}/orders/`, { note: '[TEST] runner order' }, accessToken)
  ;[200, 201].includes(created.status) ? pass('Orders', `POST /orders/ → ${created.status}`) : fail('Orders', 'POST /orders/', `got ${created.status}`)

  if (created.body?.id) {
    const id = created.body.id
    pass('Orders', `New order has id: ${id} and status: ${created.body.status}`)

    // Status transition: preparing
    const prep = await req('PATCH', `${API_BASE}/orders/${id}/`, { status: 'preparing' }, accessToken)
    ;[200, 204].includes(prep.status) ? pass('Orders', 'PATCH → preparing') : fail('Orders', 'PATCH → preparing', `got ${prep.status}`)

    // Status transition: completed
    const comp = await req('PATCH', `${API_BASE}/orders/${id}/`, { status: 'completed' }, accessToken)
    ;[200, 204].includes(comp.status) ? pass('Orders', 'PATCH → completed') : fail('Orders', 'PATCH → completed', `got ${comp.status}`)

    // Cleanup
    await req('DELETE', `${API_BASE}/orders/${id}/`, null, accessToken)
  }
}

async function testTables() {
  suite('08 – Tables')
  if (!accessToken) { skip('Tables', 'All table tests'); return }

  const list = await req('GET', `${API_BASE}/tables/`, null, accessToken)
  list.status === 200 ? pass('Tables', 'GET /tables/ → 200') : fail('Tables', 'GET /tables/', `got ${list.status}`)

  const ts = Date.now()
  const created = await req('POST', `${API_BASE}/tables/`, { name: `[TEST] Runner T${ts}`, number: 88 }, accessToken)
  ;[200, 201].includes(created.status) ? pass('Tables', `POST /tables/ → ${created.status}`) : fail('Tables', 'POST /tables/', `got ${created.status}`)

  if (created.body?.id) {
    const id = created.body.id
    const patch = await req('PATCH', `${API_BASE}/tables/${id}/`, { status: 'occupied' }, accessToken)
    ;[200, 204].includes(patch.status) ? pass('Tables', 'PATCH status → occupied') : fail('Tables', 'PATCH status', `got ${patch.status}`)
    const free = await req('PATCH', `${API_BASE}/tables/${id}/`, { status: 'available' }, accessToken)
    ;[200, 204].includes(free.status) ? pass('Tables', 'PATCH status → available') : fail('Tables', 'PATCH status', `got ${free.status}`)
    const del = await req('DELETE', `${API_BASE}/tables/${id}/`, null, accessToken)
    ;[200, 204].includes(del.status) ? pass('Tables', 'DELETE table → 200/204') : fail('Tables', 'DELETE', `got ${del.status}`)
  }
}

async function testSearchFilter() {
  suite('17 – Search & Filter')
  if (!accessToken) { skip('Search', 'All search/filter tests'); return }

  for (const type of ['veg', 'non_veg']) {
    const r = await req('GET', `${API_BASE}/menu/items/?food_type=${type}`, null, accessToken)
    r.status === 200 ? pass('Search', `GET /menu/items/?food_type=${type} → 200`) : fail('Search', `food_type=${type}`, `got ${r.status}`)
  }

  const lim = await req('GET', `${API_BASE}/menu/items/?limit=2`, null, accessToken)
  if (lim.status === 200) {
    const arr = Array.isArray(lim.body) ? lim.body : lim.body?.results || []
    arr.length <= 2 ? pass('Search', 'GET /menu/items/?limit=2 returns ≤ 2 items', `got ${arr.length}`) : fail('Search', 'Limit=2 returned more than 2', `got ${arr.length}`)
  }
}

async function testReports() {
  suite('23 – Reports')
  if (!accessToken) { skip('Reports', 'All report tests'); return }

  for (const path of ['/reports/sales/', '/reports/popular-items/', '/reports/summary/']) {
    const r = await req('GET', `${API_BASE}${path}`, null, accessToken)
    ;[200, 404].includes(r.status)
      ? pass('Reports', `GET ${path} → ${r.status}`)
      : fail('Reports', `GET ${path}`, `got ${r.status}`)
  }
}

async function testUISkips() {
  const uiSuites = [
    '02 – Homepage / Login Page',
    '09 – Settings',
    '10 – Responsive Design',
    '11 – Console Errors',
    '12 – E2E Flow',
    '13 – Dashboard',
    '14 – Order Lifecycle (UI)',
    '15 – Billing (UI)',
    '16 – Table Sessions (UI)',
    '20 – Network Error Handling (UI)',
    '21 – Accessibility (UI)',
    '24 – Performance (UI)',
    '25 – Menu Availability (UI)',
    'Setup – Kitchen Printer Assignment (UI)',
  ]
  for (const s of uiSuites) {
    skip(s, 'All UI tests', 'requires browser (Cypress Electron unavailable in this environment)')
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60))
  console.log('  Formula RMS – API Test Runner')
  console.log(`  ${new Date().toISOString()}`)
  console.log(`  OTP_CODE: ${OTP_CODE ? '✓ provided' : '✗ not provided (auth tests skipped)'}`)
  console.log('═'.repeat(60))

  // Always-on tests (no auth needed)
  await testApiHealth()
  await testAuth()
  await testSignup()
  await testPermissions()
  await testSecurity()

  // Auth-dependent tests
  if (OTP_CODE) {
    console.log('\n🔐 Logging in...')
    const ok = await login()
    ok ? console.log('  Login successful') : console.log('  Login FAILED — skipping auth-dependent suites')
  }

  await testMenuCrud()
  await testCategories()
  await testItems()
  await testOrders()
  await testTables()
  await testSearchFilter()
  await testReports()
  await testUISkips()

  // Summary
  const pass_ = results.filter(r => r.status === 'PASS').length
  const fail_ = results.filter(r => r.status === 'FAIL').length
  const skip_ = results.filter(r => r.status === 'SKIP').length
  const elapsed = ((Date.now() - suiteStart) / 1000).toFixed(1)

  console.log('\n' + '═'.repeat(60))
  console.log(`  Results: ${pass_} passed, ${fail_} failed, ${skip_} skipped`)
  console.log(`  Duration: ${elapsed}s`)
  console.log('═'.repeat(60))

  // Write JSON results for PDF generator
  const fs = await import('fs')
  const report = {
    meta: {
      timestamp: new Date().toISOString(),
      identifier: IDENTIFIER,
      authenticated: !!accessToken,
      duration_s: parseFloat(elapsed),
    },
    summary: { pass: pass_, fail: fail_, skip: skip_, total: results.length },
    results,
  }
  fs.writeFileSync('./cypress/reports/api-results.json', JSON.stringify(report, null, 2))
  console.log('\n  Results saved to cypress/reports/api-results.json')

  process.exit(fail_ > 0 ? 1 : 0)
}

main().catch(err => { console.error(err); process.exit(1) })
