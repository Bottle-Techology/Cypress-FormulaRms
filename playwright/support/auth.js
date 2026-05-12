const API_BASE  = 'https://formularms-api.bottle.com.np/api/v1'
const AUTH_BASE = 'https://formularms-api.bottle.com.np'
const IDENTIFIER = process.env.IDENTIFIER || 'pranuj@bottle.com.np'
const OTP_METHOD  = process.env.OTP_METHOD  || 'email'

let _cachedToken = null

/**
 * Send an OTP to the test identifier. Returns the response body.
 */
async function sendOtp(request, identifier = IDENTIFIER, method = OTP_METHOD) {
  const res = await request.post(`${AUTH_BASE}/auth/login/send-otp/`, {
    data: { identifier, method },
  })
  return { status: res.status(), body: await res.json().catch(() => ({})) }
}

/**
 * Verify an OTP and return { access, refresh } tokens.
 * Caches the access token in memory for the test worker process.
 */
async function verifyOtp(request, code, identifier = IDENTIFIER, method = OTP_METHOD) {
  const res = await request.post(`${AUTH_BASE}/auth/login/verify-otp/`, {
    data: { identifier, method, code: String(code) },
  })
  const body = await res.json()
  if (body.access) _cachedToken = body.access
  return { status: res.status(), ...body }
}

/**
 * Return the cached token, or null if not yet authenticated.
 */
function getCachedToken() {
  return _cachedToken || process.env.FORMULARMS_TOKEN || null
}

/**
 * Store token into the page's localStorage so the app treats the browser as authenticated.
 */
async function injectToken(page, token) {
  await page.addInitScript((t) => {
    localStorage.setItem('access_token', t)
  }, token)
}

/**
 * Full login: inject token into page storage, then navigate to /overview.
 * Requires that a token has already been obtained (via verifyOtp or env var).
 */
async function loginPage(page, token) {
  const t = token || getCachedToken()
  if (!t) throw new Error('No auth token — run verifyOtp() first or set FORMULARMS_TOKEN env var')
  await injectToken(page, t)
  await page.goto('/overview')
}

/**
 * Make an authenticated API call and return { status, body }.
 */
async function apiRequest(request, method, endpoint, data) {
  const token = getCachedToken()
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const options = { headers }
  if (data) options.data = data

  const res = await request[method.toLowerCase()](`${API_BASE}${endpoint}`, options)
  const body = await res.json().catch(() => ({}))
  return { status: res.status(), body }
}

module.exports = { sendOtp, verifyOtp, getCachedToken, injectToken, loginPage, apiRequest, API_BASE, AUTH_BASE, IDENTIFIER }
