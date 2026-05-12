/**
 * Generate TEST_REPORT.pdf from the Cypress run results.
 * Usage: node scripts/generate-test-report-pdf.js
 */

const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const OUTPUT = path.join(__dirname, '../TEST_REPORT.pdf')

const DARK  = '#1D3557'
const BRAND = '#E63946'
const GREEN = '#2D6A4F'
const RED   = '#AE2012'
const AMBER = '#CA6702'
const GREY  = '#6C757D'
const LGREY = '#F1F3F5'
const WHITE = '#FFFFFF'

const SPECS = [
  { name: '01-signup',            tests: 14, pass: 6,  fail: 4,  skip: 4 },
  { name: '02-homepage',          tests: 10, pass: 3,  fail: 7,  skip: 0 },
  { name: '03-auth',              tests: 12, pass: 10, fail: 1,  skip: 1 },
  { name: '04-menu',              tests: 10, pass: 6,  fail: 4,  skip: 0 },
  { name: '05-categories',        tests: 11, pass: 5,  fail: 6,  skip: 0 },
  { name: '06-items',             tests: 17, pass: 11, fail: 6,  skip: 0 },
  { name: '07-orders',            tests: 13, pass: 7,  fail: 6,  skip: 0 },
  { name: '08-tables',            tests: 15, pass: 9,  fail: 6,  skip: 0 },
  { name: '09-settings',          tests: 8,  pass: 6,  fail: 2,  skip: 0 },
  { name: '10-responsive',        tests: 26, pass: 26, fail: 0,  skip: 0 },
  { name: '11-console-errors',    tests: 8,  pass: 8,  fail: 0,  skip: 0 },
  { name: '12-e2e-flow',          tests: 11, pass: 8,  fail: 3,  skip: 0 },
  { name: '13-dashboard',         tests: 14, pass: 11, fail: 3,  skip: 0 },
  { name: '14-order-lifecycle',   tests: 17, pass: 13, fail: 4,  skip: 0 },
  { name: '15-billing',           tests: 10, pass: 8,  fail: 2,  skip: 0 },
  { name: '16-table-sessions',    tests: 14, pass: 12, fail: 2,  skip: 0 },
  { name: '17-search-filter',     tests: 20, pass: 16, fail: 4,  skip: 0 },
  { name: '18-api-health',        tests: 17, pass: 12, fail: 5,  skip: 0 },
  { name: '19-permissions',       tests: 21, pass: 3,  fail: 18, skip: 0 },
  { name: '20-network-errors',    tests: 10, pass: 9,  fail: 1,  skip: 0 },
  { name: '21-accessibility',     tests: 14, pass: 8,  fail: 6,  skip: 0 },
  { name: '22-security',          tests: 18, pass: 12, fail: 6,  skip: 0 },
  { name: '23-reports',           tests: 13, pass: 13, fail: 0,  skip: 0 },
  { name: '24-performance',       tests: 15, pass: 15, fail: 0,  skip: 0 },
  { name: '25-menu-availability', tests: 12, pass: 7,  fail: 2,  skip: 3 },
  { name: '26-full-flow',         tests: 66, pass: 49, fail: 17, skip: 0 },
  { name: '27-regression',        tests: 39, pass: 26, fail: 13, skip: 0 },
  { name: '28-staff',             tests: 34, pass: 25, fail: 9,  skip: 0 },
]

const BUGS = [
  {
    id: 'BUG-01', severity: 'HIGH',
    title: 'Unauthenticated users not redirected to /login',
    specs: '01, 02, 04, 09, 13, 22',
    failures: 15,
    description: 'Visiting a protected route without authentication keeps the user on / instead of redirecting to /login. The route guard is missing from the frontend router.',
    fix: 'Add a PrivateRoute guard that checks for a valid auth token on every protected route and redirects to /login if absent.',
  },
  {
    id: 'BUG-02', severity: 'HIGH',
    title: 'Signup API endpoint returns 404',
    specs: '01-signup',
    failures: 3,
    description: 'POST /auth/signup/send-otp/ returns HTTP 404. The endpoint is not implemented or is registered under a different path.',
    fix: 'Implement POST /auth/signup/send-otp/ returning 200 on success, 400/422 on validation error, 409 if already registered. If invite-only, mark tests as pending.',
  },
  {
    id: 'BUG-03', severity: 'MEDIUM',
    title: 'Signup page does not redirect authenticated users',
    specs: '01-signup',
    failures: 1,
    description: 'An already-authenticated user visiting /signup stays on the page instead of being redirected.',
    fix: 'Add an auth check on the signup route: if authenticated, redirect to / or /dashboard.',
  },
  {
    id: 'BUG-04', severity: 'MEDIUM',
    title: 'OTP verify endpoint rate-limited (429) during test run',
    specs: '03-auth',
    failures: 1,
    description: 'The OTP is already consumed by loginViaApi session setup. Re-calling verify-otp with the same code returns 429 Too Many Requests.',
    fix: 'Check cy.task("getToken") first. If a cached token exists, skip re-verification and reuse the cached token.',
  },
  {
    id: 'BUG-05', severity: 'HIGH',
    title: 'API endpoints return 404 HTML page (70+ failures)',
    specs: '04–18, 25, 26, 27',
    failures: 70,
    description: 'GET/POST/PATCH/DELETE calls to /menu/, /orders/, /tables/, /billing/ return 404 with an HTML "Not Found" body — the API gateway is not routing requests to the backend.',
    fix: 'Verify API_BASE in cypress.config.js. Check that the API gateway routes /api/v1/* to the backend. Ensure the Authorization header is sent correctly.',
  },
  {
    id: 'BUG-06', severity: 'MEDIUM',
    title: 'Login input elements not found on homepage',
    specs: '02-homepage',
    failures: 3,
    description: 'Tests cannot find <input> elements because the user is never redirected to /login (cascades from BUG-01).',
    fix: 'Resolve BUG-01 first. If the login form uses a custom element, update the test selector to match.',
  },
  {
    id: 'BUG-07', severity: 'LOW',
    title: 'Settings page — save/submit button not found',
    specs: '09-settings',
    failures: 1,
    description: 'Test looks for a button matching /save|update|submit/i on the settings page but finds nothing.',
    fix: 'Ensure the settings form has a labelled submit button. Add data-testid="settings-save" if the label differs from the test pattern.',
  },
  {
    id: 'BUG-08', severity: 'HIGH',
    title: 'Permission tests: 18 of 21 failing',
    specs: '19-permissions',
    failures: 18,
    description: 'Only 3 of 21 permission tests pass. The RBAC system is not configured or test users lack expected roles.',
    fix: 'Seed test users with defined roles (admin, staff, viewer). Verify permission middleware is active on all relevant endpoints.',
  },
  {
    id: 'BUG-09', severity: 'MEDIUM',
    title: 'Accessibility — <img> and heading tags missing',
    specs: '21-accessibility',
    failures: 5,
    description: 'Tests look for <img> elements and h1/h2/h3 headings but they are absent. Item images are CSS background-image; page headers lack semantic headings.',
    fix: 'Add <img alt="..."> tags or update tests to check background-image style. Add <h1>/<h2> to page headers.',
  },
  {
    id: 'BUG-10', severity: 'HIGH',
    title: 'Auth token stored under wrong key — reads as "null"',
    specs: '22-security, 28-staff',
    failures: 2,
    description: 'Token length assertions receive length 4 — the string "null". localStorage.getItem("access_token") returns null, meaning the token is stored under a different key.',
    fix: 'Use one consistent localStorage key throughout: set in loginViaApi session command and read in all assertions.',
  },
  {
    id: 'BUG-11', severity: 'LOW',
    title: 'Table status labels not rendered as text',
    specs: '08-tables, 16-table-sessions',
    failures: 2,
    description: 'Tests look for text matching /available|occupied|reserved|free/i on the tables page but find nothing — status is likely shown via colour badge only.',
    fix: 'Add visible text labels to table status badges, or add data-testid="table-status" with the status value.',
  },
  {
    id: 'BUG-12', severity: 'LOW',
    title: 'Add Category button not found on categories page',
    specs: '05-categories',
    failures: 1,
    description: 'Test looks for /add|create|new category/i button but cannot find it on the page.',
    fix: 'Ensure the "Add Category" button is visible. Add data-testid="add-category-btn" and update the test selector.',
  },
  {
    id: 'BUG-13', severity: 'MEDIUM',
    title: 'API accepts negative and zero item prices',
    specs: '06-items',
    failures: 0,
    description: 'POST /menu/items/ with base_price: -10.00 or base_price: 0.00 returns HTTP 201. The backend lacks MinValueValidator on the price field, allowing items with invalid prices to be created.',
    fix: 'Add MinValueValidator(0.01) to base_price in the Django serializer: base_price = serializers.DecimalField(validators=[MinValueValidator(Decimal("0.01"))])',
  },
  {
    id: 'BUG-14', severity: 'MEDIUM',
    title: 'PATCH /orders/:id/ accepts invalid status values',
    specs: '07-orders',
    failures: 0,
    description: 'PATCH /orders/:id/ with status: "invalid_status_xyz" returns HTTP 200 instead of 400. The API applies no enum validation on the status field, so any string is accepted.',
    fix: 'Add ChoiceField validation: status = serializers.ChoiceField(choices=Order.STATUS_CHOICES). Existing orders with bad status values should be migrated or rejected.',
  },
  {
    id: 'BUG-15', severity: 'MEDIUM',
    title: 'food_type filter returns mixed results',
    specs: '17-search-filter',
    failures: 0,
    description: 'GET /menu/items/?food_type=veg returns non-veg items in the result set. The filter is accepted (200) but not accurately applied — likely a missing filter_backends registration or DISTINCT issue with a variant JOIN.',
    fix: 'Add DjangoFilterBackend to MenuItemViewSet and set filterset_fields = ["food_type"]. If items have variants, add DISTINCT to the queryset.',
  },
  {
    id: 'BUG-16', severity: 'LOW',
    title: 'ordering query param ignored on item list',
    specs: '17-search-filter',
    failures: 0,
    description: 'GET /menu/items/?ordering=base_price returns 200 but results are not sorted. OrderingFilter is either not in filter_backends or base_price is not in ordering_fields.',
    fix: 'Add OrderingFilter to filter_backends and set ordering_fields = ["base_price", "name", "created_at"] in MenuItemViewSet.',
  },
  {
    id: 'BUG-17', severity: 'LOW',
    title: 'Pagination limit param not respected',
    specs: '17-search-filter',
    failures: 0,
    description: 'GET /menu/items/?limit=2 returns more than 2 items. The limit query param is ignored — the pagination class does not support client-controlled page sizes.',
    fix: 'Use PageNumberPagination with page_size_query_param = "limit" and max_page_size = 100.',
  },
  {
    id: 'BUG-18', severity: 'LOW',
    title: '/menu/items/:id/reorder/ returns 405 — action not implemented',
    specs: '06-items',
    failures: 0,
    description: 'POST /menu/items/:id/reorder/ returns 405 Method Not Allowed. The URL is registered but the action handler is missing in MenuItemViewSet.',
    fix: 'Add @action(detail=True, methods=["post"]) def reorder(self, request, pk=None): ... to MenuItemViewSet to update display_order.',
  },
  {
    id: 'BUG-19', severity: 'LOW',
    title: '/menu/customization-groups/:id/toggle/ returns 405',
    specs: '06-items',
    failures: 0,
    description: 'POST /menu/customization-groups/:id/toggle/ returns 405. The toggle action is not registered in CustomizationGroupViewSet.',
    fix: 'Add @action(detail=True, methods=["post"]) def toggle(self, ...) to CustomizationGroupViewSet that flips is_active and returns the new state.',
  },
  {
    id: 'BUG-20', severity: 'HIGH',
    title: 'Unauthenticated API requests return 404 instead of 401',
    specs: '19-permissions',
    failures: 18,
    description: 'API endpoints return HTML 404 instead of 401/403 when no token is provided. In a multi-tenant setup the tenant cannot be resolved without a token, so the request hits a 404 before reaching auth middleware. This is the root cause of 18/21 permission test failures.',
    fix: 'Return 401 from authentication middleware before tenant resolution fails. Ensure all /api/v1/* routes return {"detail": "Authentication credentials were not provided."} with status 401 for unauthenticated requests.',
  },
  {
    id: 'BUG-21', severity: 'MEDIUM',
    title: 'POST /tables/ silently requires undocumented section field',
    specs: '08-tables, 16-table-sessions',
    failures: 2,
    description: 'POST /tables/ returns 400 when the section UUID field is omitted, but without a descriptive error. Tests cannot create tables without prior knowledge of the section ID, causing silent failures.',
    fix: '1. Return a clear error: {"section": ["This field is required."]}. 2. Document the field. 3. Auto-assign a default section if the tenant has only one.',
  },
]

const totals = SPECS.reduce((a, s) => ({
  tests: a.tests + s.tests, pass: a.pass + s.pass,
  fail: a.fail + s.fail, skip: a.skip + s.skip,
}), { tests: 0, pass: 0, fail: 0, skip: 0 })

const passRate = Math.round((totals.pass / totals.tests) * 100)

// ── PDF setup ─────────────────────────────────────────────────────────────────
const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true })
doc.pipe(fs.createWriteStream(OUTPUT))

const PW = doc.page.width   // 595
const PH = doc.page.height  // 842
const M  = 30               // margin

// Current y tracker — always use cy, never doc.y for layout decisions
let cy = 0

function setY(y) { cy = y; doc.y = y }
function advY(n)  { cy += n; doc.y = cy }

function drawHeader() {
  doc.rect(0, 0, PW, 40).fill(DARK)
  doc.fillColor(WHITE).fontSize(10).font('Helvetica-Bold')
    .text('FormulaRMS — Cypress E2E Test Report', M, 14, { lineBreak: false })
  doc.fillColor('#AAB4C4').fontSize(8).font('Helvetica')
    .text('2026-05-08  ·  https://formularms.bottle.com.np', PW - 240, 16, { width: 210, align: 'right', lineBreak: false })
  setY(55)
}

function newPage() {
  doc.addPage()
  drawHeader()
}

function checkRoom(needed) {
  if (cy + needed > PH - 30) newPage()
}

function sectionBar(title) {
  checkRoom(30)
  advY(6)
  doc.rect(M, cy, PW - M * 2, 22).fill(DARK)
  doc.fillColor(WHITE).fontSize(10).font('Helvetica-Bold')
    .text(title, M + 8, cy + 6, { lineBreak: false })
  advY(30)
}

// Draw a single table row with explicit y, returns row height used
function trow(cols, widths, opts = {}) {
  const { isHeader = false, rowColor = null, textColor = null, fontSize = 7.5, rowH = 16, bold = false } = opts
  checkRoom(rowH + 2)

  const rowY = cy
  const totalW = widths.reduce((a, b) => a + b, 0)

  if (rowColor) doc.rect(M, rowY, totalW, rowH).fill(rowColor)

  doc.font(isHeader || bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize)

  let x = M
  cols.forEach((col, i) => {
    const color = Array.isArray(textColor) ? (textColor[i] || DARK) : (textColor || (isHeader ? WHITE : DARK))
    doc.fillColor(color)
      .text(String(col ?? ''), x + 4, rowY + (rowH - fontSize) / 2 - 1,
        { width: widths[i] - 8, lineBreak: false })
    x += widths[i]
  })

  advY(rowH)
  return rowH
}

function textBlock(label, value, opts = {}) {
  const { labelColor = DARK, valueColor = DARK, indent = M + 6 } = opts
  const w = PW - indent - M

  if (label) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(labelColor)
      .text(label, indent, cy, { lineBreak: false })
    advY(13)
  }
  if (value) {
    doc.font('Helvetica').fontSize(7.5).fillColor(valueColor)
      .text(value, indent, cy, { width: w })
    advY(doc.heightOfString(value, { width: w, font: 'Helvetica', fontSize: 7.5 }) + 4)
  }
}

// ═══════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════
doc.rect(0, 0, PW, PH).fill(DARK)
doc.rect(0, PH - 8, PW, 8).fill(BRAND)

doc.fillColor(WHITE).fontSize(32).font('Helvetica-Bold')
  .text('FormulaRMS', 0, 150, { align: 'center', lineBreak: false })

doc.fillColor(BRAND).fontSize(17).font('Helvetica-Bold')
  .text('Cypress E2E Test Report', 0, 194, { align: 'center', lineBreak: false })

doc.fillColor('#AAB4C4').fontSize(10).font('Helvetica')
  .text('2026-05-08  ·  Cypress 13.17.0  ·  Electron 118  ·  Node 18.19.1', 0, 232, { align: 'center', lineBreak: false })
  .text('https://formularms.bottle.com.np', 0, 248, { align: 'center', lineBreak: false })

// Summary boxes
const bW = 86, bH = 62, bGap = 14
const bStart = (PW - (4 * bW + 3 * bGap)) / 2
;[
  { label: 'PASSED',  value: totals.pass,  bg: GREEN },
  { label: 'FAILED',  value: totals.fail,  bg: RED   },
  { label: 'SKIPPED', value: totals.skip,  bg: AMBER },
  { label: 'TOTAL',   value: totals.tests, bg: '#2C3E50' },
].forEach((b, i) => {
  const bx = bStart + i * (bW + bGap)
  const by = 296
  doc.rect(bx, by, bW, bH).fill(b.bg)
  doc.fillColor(WHITE).fontSize(28).font('Helvetica-Bold')
    .text(String(b.value), bx, by + 8, { width: bW, align: 'center', lineBreak: false })
  doc.fillColor(WHITE).fontSize(8).font('Helvetica')
    .text(b.label, bx, by + 44, { width: bW, align: 'center', lineBreak: false })
})

doc.fillColor(WHITE).fontSize(13).font('Helvetica-Bold')
  .text(`Pass Rate: ${passRate}%  ·  28 Specs  ·  ${BUGS.length} Bugs Found  ·  70% Pass Rate`, 0, 380, { align: 'center', lineBreak: false })

// Passing specs note
doc.fillColor('#AAB4C4').fontSize(9).font('Helvetica')
  .text('Fully Passing: 10-responsive · 11-console-errors · 23-reports · 24-performance', 0, 410, { align: 'center', lineBreak: false })

// ═══════════════════════════════════════════════════════════════════
// PAGE 2 — SPEC SUMMARY
// ═══════════════════════════════════════════════════════════════════
newPage()
sectionBar('1. Spec Results Summary')

const sw = [175, 48, 44, 44, 44, 65]
trow(['Spec', 'Tests', 'Pass', 'Fail', 'Skip', 'Result'], sw,
  { isHeader: true, rowColor: DARK, fontSize: 8, rowH: 18 })

SPECS.forEach((s, i) => {
  const result = s.fail > 0 ? 'FAIL' : s.skip > 0 && s.skip === s.tests ? 'SKIP' : s.fail === 0 ? 'PASS' : 'PARTIAL'
  const resultColor = s.fail > 0 ? RED : s.skip > 0 ? AMBER : GREEN
  trow(
    [s.name, s.tests, s.pass, s.fail, s.skip, result],
    sw,
    {
      rowColor: i % 2 === 0 ? LGREY : WHITE,
      textColor: [DARK, DARK, GREEN, s.fail > 0 ? RED : DARK, s.skip > 0 ? AMBER : DARK, resultColor],
      bold: false,
      rowH: 15,
    }
  )
})

// Totals row
trow(
  [`TOTAL (${SPECS.length} specs)`, totals.tests, totals.pass, totals.fail, totals.skip, `${passRate}% PASS`],
  sw,
  { isHeader: true, rowColor: DARK, fontSize: 8, rowH: 18 }
)

// ═══════════════════════════════════════════════════════════════════
// PAGE 3+ — BUGS
// ═══════════════════════════════════════════════════════════════════
newPage()
sectionBar('2. Bugs Found & Recommended Fixes')

BUGS.forEach((bug, idx) => {
  const sevColor = bug.severity === 'HIGH' ? RED : bug.severity === 'MEDIUM' ? AMBER : GREY

  // Estimate height needed: header(22) + meta(14) + desc + fix + gap
  const descH = doc.heightOfString(bug.description, { width: PW - M * 2 - 12, font: 'Helvetica', fontSize: 7.5 })
  const fixH  = doc.heightOfString(bug.fix,         { width: PW - M * 2 - 12, font: 'Helvetica', fontSize: 7.5 })
  const needed = 22 + 16 + 14 + descH + 14 + fixH + 20
  checkRoom(needed)

  // Bug header bar
  doc.rect(M, cy, PW - M * 2, 22).fill(sevColor)
  doc.fillColor(WHITE).fontSize(8.5).font('Helvetica-Bold')
    .text(`${bug.id}  [${bug.severity}]  ${bug.title}`, M + 6, cy + 6,
      { width: PW - M * 2 - 12, lineBreak: false })
  advY(22)

  // Meta line
  doc.fillColor(GREY).fontSize(7).font('Helvetica')
    .text(`Specs: ${bug.specs}   ·   Failures: ${bug.failures}`, M + 6, cy + 3, { lineBreak: false })
  advY(16)

  // Description
  textBlock('Description:', bug.description, { valueColor: '#333333' })

  // Fix
  textBlock('Recommended Fix:', bug.fix, { valueColor: GREEN })

  // Divider
  if (idx < BUGS.length - 1) {
    advY(4)
    doc.moveTo(M, cy).lineTo(PW - M, cy).strokeColor('#DEE2E6').lineWidth(0.5).stroke()
    advY(8)
  }
})

// ═══════════════════════════════════════════════════════════════════
// PAGE — PRIORITY TABLE
// ═══════════════════════════════════════════════════════════════════
newPage()
sectionBar('3. Fix Priority')

const pw2 = [54, 56, 210, 52, 62]
trow(['Bug ID', 'Severity', 'Issue', 'Failures', 'Priority'], pw2,
  { isHeader: true, rowColor: DARK, fontSize: 8, rowH: 18 })

;[
  ['BUG-05', 'HIGH',   'API endpoints returning 404 HTML — gateway not routing to backend',   '70+', 'P1 — Critical'],
  ['BUG-20', 'HIGH',   'Unauthenticated API returns 404 not 401 — root cause of BUG-08',      '18',  'P1 — Critical'],
  ['BUG-01', 'HIGH',   'No /login redirect for unauthenticated users',                         '15',  'P1 — Critical'],
  ['BUG-10', 'HIGH',   'Auth token stored under wrong key — reads as "null"',                  '2',   'P1 — Critical'],
  ['BUG-02', 'HIGH',   'Signup API returns 404',                                               '3',   'P2 — High'],
  ['BUG-08', 'HIGH',   'Permission tests 18/21 failing — RBAC not configured',                 '18',  'P2 — High'],
  ['BUG-13', 'MEDIUM', 'API accepts negative/zero item prices — no MinValueValidator',          '—',   'P2 — High'],
  ['BUG-14', 'MEDIUM', 'PATCH /orders/:id/ accepts invalid status — no enum validation',        '—',   'P2 — High'],
  ['BUG-21', 'MEDIUM', 'POST /tables/ requires undocumented section UUID field',                '2',   'P2 — High'],
  ['BUG-15', 'MEDIUM', 'food_type filter returns mixed results',                                '—',   'P3 — Medium'],
  ['BUG-09', 'MEDIUM', 'Missing <img> and heading elements (accessibility)',                    '5',   'P3 — Medium'],
  ['BUG-04', 'MEDIUM', 'OTP rate-limited in 03-auth',                                          '1',   'P3 — Medium'],
  ['BUG-03', 'MEDIUM', 'Signup page does not redirect authenticated users',                     '1',   'P3 — Medium'],
  ['BUG-06', 'MEDIUM', 'Login inputs not found (cascades from BUG-01)',                         '3',   'P3 — Medium'],
  ['BUG-07', 'LOW',    'Settings save button not found',                                        '1',   'P4 — Low'],
  ['BUG-11', 'LOW',    'Table status labels missing as text',                                   '2',   'P4 — Low'],
  ['BUG-12', 'LOW',    'Add Category button not found',                                         '1',   'P4 — Low'],
  ['BUG-16', 'LOW',    'ordering param ignored on item list',                                   '—',   'P4 — Low'],
  ['BUG-17', 'LOW',    'Pagination limit param not respected',                                  '—',   'P4 — Low'],
  ['BUG-18', 'LOW',    '/menu/items/:id/reorder/ returns 405 — handler missing',                '—',   'P4 — Low'],
  ['BUG-19', 'LOW',    '/menu/customization-groups/:id/toggle/ returns 405',                    '—',   'P4 — Low'],
].forEach((cols, i) => {
  const sevColor = cols[1] === 'HIGH' ? RED : cols[1] === 'MEDIUM' ? AMBER : GREY
  const prColor  = cols[4].startsWith('P1') ? RED : cols[4].startsWith('P2') ? AMBER : cols[4].startsWith('P3') ? '#777' : GREY
  trow(cols, pw2, {
    rowColor: i % 2 === 0 ? LGREY : WHITE,
    textColor: [DARK, sevColor, DARK, DARK, prColor],
    rowH: 15,
  })
})

// Passing specs callout box
advY(16)
checkRoom(50)
doc.rect(M, cy, PW - M * 2, 46).fill('#E8F5E9')
doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold')
  .text('Fully Passing Specs — No Action Required', M + 10, cy + 8, { lineBreak: false })
doc.fillColor('#2D4A3E').fontSize(8).font('Helvetica')
  .text(
    '10-responsive (26/26)  ·  11-console-errors (8/8)  ·  23-reports (13/13)  ·  24-performance (15/15)',
    M + 10, cy + 24, { width: PW - M * 2 - 20, lineBreak: false }
  )
advY(46)

// ═══════════════════════════════════════════════════════════════════
// PAGE NUMBERS
// ═══════════════════════════════════════════════════════════════════
const range = doc.bufferedPageRange()
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i)
  if (i === 0) continue // no page number on cover
  doc.fillColor(GREY).fontSize(7).font('Helvetica')
    .text(`Page ${i} of ${range.count - 1}`, M, PH - 18,
      { width: PW - M * 2, align: 'right', lineBreak: false })
}

doc.end()
doc.on('finish', () => console.log(`✅  PDF saved → ${OUTPUT}`))
