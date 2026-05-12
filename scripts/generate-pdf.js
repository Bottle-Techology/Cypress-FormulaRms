/**
 * Formula RMS – PDF Report Generator
 * Reads cypress/reports/api-results.json and produces a styled PDF report.
 */

const PDFDocument = require('pdfkit')
const fs = require('fs')

const INPUT  = './cypress/reports/api-results.json'
const OUTPUT = './cypress/reports/formularms-test-report.pdf'

const BRAND  = '#E63946'   // red accent
const DARK   = '#1D3557'   // dark navy
const GREEN  = '#2D6A4F'
const RED    = '#AE2012'
const AMBER  = '#CA6702'
const GREY   = '#6C757D'
const LGREY  = '#F1F3F5'
const WHITE  = '#FFFFFF'

// ─── Known issues + fixes (static analysis) ──────────────────────────────────
const KNOWN_ISSUES = [
  {
    id: 'ENV-001',
    severity: 'HIGH',
    category: 'Environment',
    issue: 'Cypress Electron binary fails to start on Ubuntu 24.04',
    detail: 'The Cypress Electron binary rejects its own smoke-test flags (--smoke-test, --no-sandbox) causing all UI and browser tests to be skipped.',
    fix: 'Upgrade Node.js to v20+ and reinstall Cypress 13+, or run tests inside a Docker container with --shm-size=2g and a virtual display (xvfb). Alternatively use Playwright which bundles its own browsers.',
    files: ['package.json'],
  },
  {
    id: 'ENV-002',
    severity: 'HIGH',
    category: 'Environment',
    issue: 'Node.js 18 incompatible with Cypress 15',
    detail: 'Cypress 15 requires Node ^20.1.0 || ^22.0.0 || >=24.0.0. The current Node version is 18.19.1.',
    fix: 'Upgrade Node.js to v20 LTS (or v22) using nvm: nvm install 20 && nvm use 20, then npm install.',
    files: ['package.json'],
  },
  {
    id: 'TEST-001',
    severity: 'MEDIUM',
    category: 'Test Design',
    issue: 'Cypress.env() used for cross-test state sharing (MENU_ID, ORDER_ID, etc.)',
    detail: 'Using Cypress.env() to pass IDs between it() blocks is fragile. If a test fails, the cleanup tests that depend on the stored ID will also fail silently.',
    fix: 'Use cy.wrap() + aliases within the same describe block, or use a before() hook that sets up all required data, stores it in a shared object, and an after() hook that cleans it up.',
    files: ['cypress/e2e/04-menu.cy.js', 'cypress/e2e/14-order-lifecycle.cy.js', 'cypress/e2e/16-table-sessions.cy.js'],
  },
  {
    id: 'TEST-002',
    severity: 'MEDIUM',
    category: 'Test Design',
    issue: 'cy:run:safari uses --browser webkit but Cypress 12 has experimental WebKit support only',
    detail: 'WebKit/Safari stable support was introduced in Cypress 13. Running with Cypress 12 will fail.',
    fix: 'Upgrade to Cypress 13+ (requires Node 20+) before using the cy:run:safari script.',
    files: ['package.json'],
  },
  {
    id: 'TEST-003',
    severity: 'LOW',
    category: 'Test Design',
    issue: 'Order lifecycle status transitions are not validated in sequence',
    detail: 'Tests PATCH to "preparing", "ready", "completed" in separate it() blocks. If the API enforces strict state machine transitions (pending→preparing only), skipping a step will cause failures.',
    fix: 'Chain status transitions within a single it() block or use before() to ensure prior state before asserting the next.',
    files: ['cypress/e2e/14-order-lifecycle.cy.js'],
  },
  {
    id: 'TEST-004',
    severity: 'LOW',
    category: 'Test Design',
    issue: 'E2E flow (12-e2e-flow.cy.js) does not test the order→bill→payment chain',
    detail: 'The main E2E flow only creates menu data and navigates pages. It does not exercise the critical revenue path: create order → add items → bill → pay.',
    fix: 'Extend 12-e2e-flow.cy.js to include: createOrderViaApi → addItemToOrderViaApi → generateBillViaApi → POST /orders/:id/pay/ → verify table freed.',
    files: ['cypress/e2e/12-e2e-flow.cy.js'],
  },
  {
    id: 'TEST-005',
    severity: 'LOW',
    category: 'Test Coverage',
    issue: 'No tests for token refresh endpoint',
    detail: 'POST /auth/token/refresh/ (or equivalent) is not tested. A production system should verify that token refresh works and that expired tokens return 401.',
    fix: 'Add a test in 03-auth.cy.js: after obtaining tokens, call the refresh endpoint and verify a new access token is returned.',
    files: ['cypress/e2e/03-auth.cy.js'],
  },
  {
    id: 'TEST-006',
    severity: 'LOW',
    category: 'Test Coverage',
    issue: 'No tests for duplicate data validation (duplicate menu name, duplicate table number)',
    detail: 'Creating two menus with the same name or two tables with the same number may be accepted or rejected by the API — this is not verified.',
    fix: 'Add negative tests: POST /menu/menus/ twice with the same name and assert 400/409. Same for tables with duplicate number.',
    files: ['cypress/e2e/04-menu.cy.js', 'cypress/e2e/08-tables.cy.js'],
  },
  {
    id: 'CFG-001',
    severity: 'LOW',
    category: 'Configuration',
    issue: 'IDENTIFIER hardcoded in cypress.config.js and test files',
    detail: 'The test account email pranuj@bottle.com.np is hardcoded in multiple files. If the account changes, files need manual updates.',
    fix: 'Move IDENTIFIER to a single source of truth in cypress.config.js env section only, and reference it exclusively via Cypress.env("IDENTIFIER").',
    files: ['cypress/e2e/03-auth.cy.js', 'cypress.config.js'],
  },
]

// ─── PDF helpers ──────────────────────────────────────────────────────────────

function hex(h) { const b = parseInt(h.slice(1), 16); return [(b >> 16) & 255, (b >> 8) & 255, b & 255] }

function addPage(doc) {
  doc.addPage()
  // Header bar
  doc.rect(0, 0, doc.page.width, 44).fill(DARK)
  doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
    .text('Formula RMS – Automated Test Report', 30, 14)
  doc.fillColor(WHITE).fontSize(9).font('Helvetica')
    .text(`CONFIDENTIAL`, doc.page.width - 120, 17, { width: 100, align: 'right' })
  doc.y = 60
}

function sectionTitle(doc, title) {
  if (doc.y > doc.page.height - 100) addPage(doc)
  doc.moveDown(0.5)
  doc.rect(30, doc.y, doc.page.width - 60, 22).fill(DARK)
  doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
    .text(title, 38, doc.y - 18)
  doc.fillColor(DARK)
  doc.moveDown(0.8)
}

function row(doc, cols, widths, isHeader = false, bg = null) {
  if (doc.y > doc.page.height - 50) addPage(doc)
  const rowH = 18
  const x0 = 30
  const totalW = widths.reduce((a, b) => a + b, 0)

  if (bg) doc.rect(x0, doc.y, totalW, rowH).fill(bg)

  doc.fillColor(isHeader ? WHITE : DARK).fontSize(8)
    .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')

  let x = x0
  cols.forEach((c, i) => {
    doc.text(String(c), x + 3, doc.y - (bg ? rowH - 3 : 0), { width: widths[i] - 6, lineBreak: false })
    x += widths[i]
  })
  doc.moveDown(rowH / 12)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(INPUT)) {
  console.error(`❌  ${INPUT} not found. Run 'node scripts/run-tests.js' first.`)
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'))
const { meta, summary, results } = data

const doc = new PDFDocument({ margin: 30, size: 'A4' })
doc.pipe(fs.createWriteStream(OUTPUT))

// ── Cover page ────────────────────────────────────────────────────────────────
doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK)
doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(BRAND)

doc.fillColor(WHITE).fontSize(28).font('Helvetica-Bold')
  .text('Formula RMS', 50, 180, { align: 'center' })
doc.fillColor(BRAND).fontSize(18).font('Helvetica-Bold')
  .text('Automated Test Report', 50, 220, { align: 'center' })

doc.fillColor(WHITE).fontSize(11).font('Helvetica')
  .text(`Generated: ${new Date(meta.timestamp).toLocaleString()}`, 50, 290, { align: 'center' })
  .text(`Environment: Ubuntu 24.04 | Node 18 | Cypress 12.17.4`, 50, 310, { align: 'center' })
  .text(`Auth: ${meta.authenticated ? '✓ Authenticated' : '✗ Unauthenticated (OTP not provided)'}`, 50, 330, { align: 'center' })
  .text(`Duration: ${meta.duration_s}s`, 50, 350, { align: 'center' })

// Summary boxes
const boxW = 90, boxH = 60, boxY = 410, gap = 20
const startX = (doc.page.width - (4 * boxW + 3 * gap)) / 2
const boxes = [
  { label: 'PASSED',  value: summary.pass,  color: GREEN },
  { label: 'FAILED',  value: summary.fail,  color: RED   },
  { label: 'SKIPPED', value: summary.skip,  color: AMBER },
  { label: 'TOTAL',   value: summary.total, color: DARK  },
]
boxes.forEach((b, i) => {
  const bx = startX + i * (boxW + gap)
  doc.rect(bx, boxY, boxW, boxH).fill(b.color)
  doc.fillColor(WHITE).fontSize(26).font('Helvetica-Bold')
    .text(String(b.value), bx, boxY + 8, { width: boxW, align: 'center' })
  doc.fillColor(WHITE).fontSize(9).font('Helvetica')
    .text(b.label, bx, boxY + 40, { width: boxW, align: 'center' })
})

// Pass rate
const passRate = summary.total > 0 ? Math.round((summary.pass / (summary.pass + summary.fail)) * 100) : 0
doc.fillColor(WHITE).fontSize(13).font('Helvetica-Bold')
  .text(`Pass Rate (excl. skipped): ${passRate}%`, 50, 500, { align: 'center' })

// ── Page 2: Executive Summary ─────────────────────────────────────────────────
addPage(doc)
sectionTitle(doc, 'Executive Summary')

doc.fillColor(DARK).fontSize(10).font('Helvetica')
  .text(
    `This report covers the automated test execution of the Formula RMS application ` +
    `(https://formularms.bottle.com.np). A total of ${summary.total} test cases were executed ` +
    `across ${[...new Set(results.map(r => r.suite))].length} test suites covering API health, ` +
    `authentication, permissions, security, menu management, orders, tables, search/filter, and reporting.`,
    30, doc.y, { width: doc.page.width - 60 }
  )
doc.moveDown()

// Key findings
const findings = [
  `${summary.pass} tests PASSED — core API functionality is working correctly.`,
  `${summary.fail} tests FAILED — see detailed results for root causes and fixes.`,
  `${summary.skip} tests SKIPPED — UI/browser tests require a display environment (Cypress Electron binary incompatible with Ubuntu 24.04 sandbox restrictions).`,
  `${KNOWN_ISSUES.filter(i => i.severity === 'HIGH').length} HIGH severity issues identified requiring immediate attention.`,
  `${KNOWN_ISSUES.filter(i => i.severity === 'MEDIUM').length} MEDIUM severity issues identified for near-term resolution.`,
]
findings.forEach(f => {
  if (doc.y > doc.page.height - 60) addPage(doc)
  doc.fillColor(DARK).fontSize(9).font('Helvetica')
    .text(`• ${f}`, 38, doc.y, { width: doc.page.width - 76 })
  doc.moveDown(0.3)
})

// ── Page 3: Test Results by Suite ────────────────────────────────────────────
addPage(doc)
sectionTitle(doc, 'Test Results by Suite')

const suiteMap = {}
results.forEach(r => {
  if (!suiteMap[r.suite]) suiteMap[r.suite] = { pass: 0, fail: 0, skip: 0, tests: [] }
  suiteMap[r.suite][r.status.toLowerCase()]++
  suiteMap[r.suite].tests.push(r)
})

// Suite summary table
const sw = [200, 50, 50, 55, 90]
doc.rect(30, doc.y, sw.reduce((a,b)=>a+b), 20).fill(DARK)
doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
let hx = 30
;['Suite', 'Pass', 'Fail', 'Skip', 'Status'].forEach((h, i) => {
  doc.text(h, hx + 3, doc.y - 14, { width: sw[i] - 6, lineBreak: false })
  hx += sw[i]
})
doc.moveDown(0.6)

Object.entries(suiteMap).forEach(([name, s], idx) => {
  if (doc.y > doc.page.height - 25) addPage(doc)
  const bg = idx % 2 === 0 ? LGREY : WHITE
  const statusColor = s.fail > 0 ? RED : s.skip === s.tests.length ? AMBER : GREEN
  const statusLabel = s.fail > 0 ? 'FAIL' : s.skip === s.tests.length ? 'SKIP' : 'PASS'
  doc.rect(30, doc.y, sw.reduce((a,b)=>a+b), 16).fill(bg)
  doc.fillColor(statusColor).fontSize(7).font('Helvetica-Bold')
  let cx = 30
  ;[name, s.pass, s.fail, s.skip, statusLabel].forEach((v, i) => {
    doc.fillColor(i === 4 ? statusColor : DARK).font(i === 4 ? 'Helvetica-Bold' : 'Helvetica')
    doc.text(String(v), cx + 3, doc.y - 12, { width: sw[i] - 6, lineBreak: false })
    cx += sw[i]
  })
  doc.moveDown(0.45)
})

// ── Page 4+: Detailed Test Results ───────────────────────────────────────────
addPage(doc)
sectionTitle(doc, 'Detailed Test Results')

const dw = [16, 210, 55, 170]
doc.rect(30, doc.y, dw.reduce((a,b)=>a+b), 20).fill(DARK)
doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
let dhx = 30
;['#', 'Test Name', 'Status', 'Detail'].forEach((h, i) => {
  doc.text(h, dhx + 3, doc.y - 14, { width: dw[i] - 6, lineBreak: false })
  dhx += dw[i]
})
doc.moveDown(0.6)

let prevSuite = null
results.forEach((r, idx) => {
  if (doc.y > doc.page.height - 30) addPage(doc)

  // Suite separator
  if (r.suite !== prevSuite) {
    if (doc.y > doc.page.height - 40) addPage(doc)
    doc.rect(30, doc.y, dw.reduce((a,b)=>a+b), 14).fill('#DEE2E6')
    doc.fillColor(DARK).fontSize(7).font('Helvetica-Bold')
      .text(r.suite, 33, doc.y - 10, { width: 420, lineBreak: false })
    doc.moveDown(0.4)
    prevSuite = r.suite
  }

  const bg = idx % 2 === 0 ? LGREY : WHITE
  const statusColor = r.status === 'PASS' ? GREEN : r.status === 'FAIL' ? RED : AMBER
  doc.rect(30, doc.y, dw.reduce((a,b)=>a+b), 14).fill(bg)
  let rx = 30
  const cols = [String(idx + 1), r.name, r.status, r.detail || '']
  cols.forEach((v, i) => {
    doc.fillColor(i === 2 ? statusColor : DARK)
      .font(i === 2 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7)
      .text(v, rx + 3, doc.y - 10, { width: dw[i] - 6, lineBreak: false })
    rx += dw[i]
  })
  doc.moveDown(0.4)
})

// ── Issues & Recommended Fixes ────────────────────────────────────────────────
addPage(doc)
sectionTitle(doc, 'Issues Found & Recommended Fixes')

KNOWN_ISSUES.forEach((issue, idx) => {
  if (doc.y > doc.page.height - 120) addPage(doc)

  const sevColor = issue.severity === 'HIGH' ? RED : issue.severity === 'MEDIUM' ? AMBER : GREY

  // Issue header bar
  doc.rect(30, doc.y, doc.page.width - 60, 20).fill(sevColor)
  doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold')
    .text(`${issue.id}  [${issue.severity}]  ${issue.category} — ${issue.issue}`, 35, doc.y - 15,
      { width: doc.page.width - 75, lineBreak: false })
  doc.moveDown(0.5)

  doc.fillColor(DARK).fontSize(8).font('Helvetica-Bold').text('Description:', 35, doc.y)
  doc.font('Helvetica').text(issue.detail, 35, doc.y, { width: doc.page.width - 70 })
  doc.moveDown(0.3)

  doc.font('Helvetica-Bold').text('Recommended Fix:', 35, doc.y)
  doc.font('Helvetica').fillColor(GREEN).text(issue.fix, 35, doc.y, { width: doc.page.width - 70 })
  doc.moveDown(0.3)

  if (issue.files?.length) {
    doc.fillColor(GREY).font('Helvetica').fontSize(7)
      .text(`Affected files: ${issue.files.join(', ')}`, 35, doc.y)
    doc.moveDown(0.3)
  }

  doc.moveDown(0.5)
  doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke('#DEE2E6')
  doc.moveDown(0.5)
})

// ── Appendix: Scripts Reference ────────────────────────────────────────────────
addPage(doc)
sectionTitle(doc, 'Appendix – Available Test Scripts')

const scripts = [
  ['cy:run:smoke',          'Auth + homepage + dashboard (quick sanity)'],
  ['cy:run:functional',     'Auth, menu, categories, items, orders, tables + lifecycle'],
  ['cy:run:order-suite',    'Orders, order lifecycle, billing, table sessions'],
  ['cy:run:menu-suite',     'Menu, categories, items, availability'],
  ['cy:run:quality',        'Responsive, console errors, accessibility, performance'],
  ['cy:run:security-suite', 'Permissions, network errors, security'],
  ['cy:run:api-health',     'API health checks and response times'],
  ['cy:run:reports',        'Business reporting endpoints'],
  ['cy:run:regression',     'Full suite with 1 retry (Chrome)'],
  ['cy:run:critical',       'Auth + order lifecycle + billing + E2E flow'],
  ['cy:run:nightly',        'Full suite with mochawesome HTML report'],
  ['cy:run:ci',             'Full suite with JSON report for CI integration'],
  ['setup:kitchen-printer', 'One-off: assign all items to Main Kitchen Printer'],
]

const aw = [160, 300]
doc.rect(30, doc.y, aw.reduce((a,b)=>a+b), 20).fill(DARK)
doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
let ax = 30
;['Script', 'Description'].forEach((h, i) => {
  doc.text(h, ax + 3, doc.y - 14, { width: aw[i] - 6, lineBreak: false })
  ax += aw[i]
})
doc.moveDown(0.6)

scripts.forEach(([script, desc], i) => {
  if (doc.y > doc.page.height - 25) addPage(doc)
  const bg = i % 2 === 0 ? LGREY : WHITE
  doc.rect(30, doc.y, aw.reduce((a,b)=>a+b), 15).fill(bg)
  let sx = 30
  ;[`npm run ${script}`, desc].forEach((v, j) => {
    doc.fillColor(j === 0 ? BRAND : DARK).fontSize(7)
      .font(j === 0 ? 'Helvetica-Bold' : 'Helvetica')
      .text(v, sx + 3, doc.y - 11, { width: aw[j] - 6, lineBreak: false })
    sx += aw[j]
  })
  doc.moveDown(0.42)
})

// Footer note
doc.moveDown(1)
doc.fillColor(GREY).fontSize(8).font('Helvetica')
  .text('To run tests: npx node scripts/run-tests.js [OTP_CODE=<code>]', 30, doc.y)
  .text('To generate this PDF: node --input-type=module scripts/generate-pdf.js', 30, doc.y + 12)

// Page numbers
const range = doc.bufferedPageRange()
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i)
  doc.fillColor(GREY).fontSize(8).font('Helvetica')
    .text(`Page ${i + 1} of ${range.count}`, 30, doc.page.height - 20,
      { width: doc.page.width - 60, align: 'right' })
}

doc.end()
doc.on('finish', () => {
  console.log(`✅  PDF saved to: ${OUTPUT}`)
})
