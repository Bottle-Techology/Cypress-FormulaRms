const PDFDocument = require('pdfkit')
const fs = require('fs')

const INPUT  = './cypress/reports/cypress-results.json'
const OUTPUT = './cypress/reports/formularms-cypress-report.pdf'

const BRAND = '#E63946'
const DARK  = '#1D3557'
const GREEN = '#2D6A4F'
const RED   = '#AE2012'
const AMBER = '#CA6702'
const BLUE  = '#1565C0'
const GREY  = '#6C757D'
const LGREY = '#F1F3F5'
const DGREY = '#DEE2E6'
const WHITE = '#FFFFFF'

if (!fs.existsSync(INPUT)) {
  console.error(`❌  ${INPUT} not found.`)
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'))
const { meta, summary, specs } = data

const doc = new PDFDocument({ margin: 30, size: 'A4', bufferPages: true })
doc.pipe(fs.createWriteStream(OUTPUT))

const PW = doc.page.width
const PH = doc.page.height

// ── helpers ──────────────────────────────────────────────────────────────────

function pageHeader(doc) {
  doc.rect(0, 0, PW, 40).fill(DARK)
  doc.fillColor(WHITE).fontSize(10).font('Helvetica-Bold')
    .text('Formula RMS – Cypress E2E Test Report', 30, 13)
  doc.fillColor(WHITE).fontSize(8).font('Helvetica')
    .text('CONFIDENTIAL', PW - 110, 15, { width: 90, align: 'right' })
  doc.y = 56
}

function newPage(doc) {
  doc.addPage()
  pageHeader(doc)
}

function sectionBar(doc, title) {
  if (doc.y > PH - 80) newPage(doc)
  doc.moveDown(0.4)
  doc.rect(30, doc.y, PW - 60, 22).fill(DARK)
  doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
    .text(title, 38, doc.y - 17)
  doc.fillColor(DARK).moveDown(0.7)
}

function statusColor(pass, fail, skip) {
  if (fail > 0) return RED
  if (pass === 0 && skip === 0) return AMBER
  return GREEN
}

function statusLabel(pass, fail, skip, total) {
  if (fail > 0) return 'FAIL'
  if (pass === 0 && skip < total) return 'SKIP'
  return 'PASS'
}

function checkPage(doc, needed = 30) {
  if (doc.y > PH - needed) newPage(doc)
}

// ── COVER PAGE ────────────────────────────────────────────────────────────────
doc.rect(0, 0, PW, PH).fill(DARK)
doc.rect(0, PH - 8, PW, 8).fill(BRAND)

doc.fillColor(WHITE).fontSize(30).font('Helvetica-Bold')
  .text('Formula RMS', 50, 160, { align: 'center' })
doc.fillColor(BRAND).fontSize(20).font('Helvetica-Bold')
  .text('Cypress E2E Test Report', 50, 202, { align: 'center' })

doc.fillColor(DGREY).fontSize(10).font('Helvetica')
  .text(`Generated: ${new Date(meta.timestamp).toLocaleString()}`, 50, 268, { align: 'center' })
  .text(`Browser: ${meta.browser}`, 50, 284, { align: 'center' })
  .text(`Cypress ${meta.cypressVersion}  |  Node ${meta.nodeVersion}  |  ${meta.platform}`, 50, 300, { align: 'center' })
  .text(`Duration: ${Math.floor(meta.duration_s / 60)}m ${meta.duration_s % 60}s  |  Specs: ${meta.totalSpecs}`, 50, 316, { align: 'center' })

// summary boxes
const bW = 86, bH = 62, bY = 368, gap = 16
const bStart = (PW - (5 * bW + 4 * gap)) / 2
const boxes = [
  { label: 'PASSED',  value: summary.passing, color: GREEN },
  { label: 'FAILED',  value: summary.failing,  color: RED   },
  { label: 'PENDING', value: summary.pending,  color: AMBER },
  { label: 'SKIPPED', value: summary.skipped,  color: GREY  },
  { label: 'TOTAL',   value: summary.tests,    color: BLUE  },
]
boxes.forEach((b, i) => {
  const bx = bStart + i * (bW + gap)
  doc.rect(bx, bY, bW, bH).fill(b.color)
  doc.fillColor(WHITE).fontSize(24).font('Helvetica-Bold')
    .text(String(b.value), bx, bY + 8, { width: bW, align: 'center' })
  doc.fillColor(WHITE).fontSize(8).font('Helvetica')
    .text(b.label, bx, bY + 42, { width: bW, align: 'center' })
})

const passRate = summary.passing + summary.failing > 0
  ? Math.round((summary.passing / (summary.passing + summary.failing)) * 100) : 0
doc.fillColor(WHITE).fontSize(14).font('Helvetica-Bold')
  .text(`Pass Rate (excl. pending): ${passRate}%`, 50, 454, { align: 'center' })

// root cause note
doc.rect(60, 490, PW - 120, 58).fill('#2C3E50')
doc.fillColor('#F39C12').fontSize(8).font('Helvetica-Bold')
  .text('ROOT CAUSE SUMMARY', 70, 496)
doc.fillColor(WHITE).fontSize(7.5).font('Helvetica')
  .text(
    '31 of 44 failures share a single root cause: the app does not redirect unauthenticated users to /login (stays on /).' +
    ' Remaining: signup endpoint 404 (3), login invalid-identifier returns 401 (1), missing cy.tab() plugin (1), OTP_CODE required for kitchen-printer (1).',
    70, 508, { width: PW - 150 }
  )

// ── PAGE 2: SPEC SUMMARY TABLE ────────────────────────────────────────────────
newPage(doc)
sectionBar(doc, 'Spec Summary')

const cw = [182, 38, 38, 38, 38, 38, 60]
const headers = ['Spec File', 'Tests', 'Pass', 'Fail', 'Pend', 'Skip', 'Status']

// header row
doc.rect(30, doc.y, cw.reduce((a,b)=>a+b), 20).fill(DARK)
doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
let hx = 30
headers.forEach((h, i) => {
  doc.text(h, hx + 3, doc.y - 14, { width: cw[i] - 6, lineBreak: false })
  hx += cw[i]
})
doc.moveDown(0.55)

specs.forEach((s, idx) => {
  checkPage(doc, 24)
  const bg = idx % 2 === 0 ? LGREY : WHITE
  const sc = statusColor(s.passing, s.failing, s.skipped)
  const sl = statusLabel(s.passing, s.failing, s.skipped, s.tests)
  doc.rect(30, doc.y, cw.reduce((a,b)=>a+b), 16).fill(bg)
  let cx = 30
  const vals = [s.file, s.tests, s.passing, s.failing, s.pending, s.skipped, sl]
  vals.forEach((v, i) => {
    doc.fillColor(i === 6 ? sc : i === 3 && s.failing > 0 ? RED : DARK)
      .font(i === 6 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7)
      .text(String(v), cx + 3, doc.y - 11, { width: cw[i] - 6, lineBreak: false })
    cx += cw[i]
  })
  doc.moveDown(0.44)
})

// totals row
checkPage(doc, 24)
doc.rect(30, doc.y, cw.reduce((a,b)=>a+b), 18).fill(DARK)
doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
let tx = 30
const totals = [`TOTAL (${meta.totalSpecs} specs)`, summary.tests, summary.passing, summary.failing, summary.pending, summary.skipped, `${passRate}% pass`]
totals.forEach((v, i) => {
  doc.fillColor(i === 3 && summary.failing > 0 ? '#FF8A80' : WHITE)
  doc.text(String(v), tx + 3, doc.y - 13, { width: cw[i] - 6, lineBreak: false })
  tx += cw[i]
})
doc.moveDown(0.5)

// ── PAGE 3+: SPEC PASS/FAIL CHART BARS ────────────────────────────────────────
newPage(doc)
sectionBar(doc, 'Spec Results – Visual Breakdown')

const barMaxW = PW - 180
const barH = 11
const labelW = 140

specs.forEach((s, idx) => {
  checkPage(doc, 22)
  const total = s.tests || 1
  const passW  = Math.round((s.passing / total) * barMaxW)
  const failW  = Math.round((s.failing / total) * barMaxW)
  const pendW  = Math.round((s.pending / total) * barMaxW)
  const skipW  = barMaxW - passW - failW - pendW

  const y0 = doc.y

  doc.fillColor(DARK).fontSize(6.5).font('Helvetica')
    .text(s.file, 30, y0, { width: labelW - 4, lineBreak: false })

  let bx = 30 + labelW
  if (passW > 0) { doc.rect(bx, y0, passW, barH).fill(GREEN); bx += passW }
  if (failW > 0) { doc.rect(bx, y0, failW, barH).fill(RED);   bx += failW }
  if (pendW > 0) { doc.rect(bx, y0, pendW, barH).fill(AMBER); bx += pendW }
  if (skipW > 0) { doc.rect(bx, y0, skipW, barH).fill(GREY);  bx += skipW }

  doc.fillColor(DARK).fontSize(6.5).font('Helvetica')
    .text(`${s.passing}✓ ${s.failing}✗ ${s.pending}⊝`, bx + 4, y0, { lineBreak: false })

  doc.y = y0 + barH + 4
})

// legend
doc.moveDown(0.8)
checkPage(doc, 20)
const leg = [[GREEN,'Passed'],[RED,'Failed'],[AMBER,'Pending'],[GREY,'Skipped']]
let lx = 30
leg.forEach(([c, label]) => {
  doc.rect(lx, doc.y, 10, 10).fill(c)
  doc.fillColor(DARK).fontSize(7).font('Helvetica').text(label, lx + 13, doc.y, { lineBreak: false })
  lx += 70
})
doc.moveDown(1.2)

// ── FAILURE DETAILS ───────────────────────────────────────────────────────────
newPage(doc)
sectionBar(doc, 'Failure Details')

const failingSpecs = specs.filter(s => s.failures && s.failures.length > 0)

failingSpecs.forEach(s => {
  checkPage(doc, 50)

  // spec header
  doc.rect(30, doc.y, PW - 60, 16).fill('#C62828')
  doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
    .text(`${s.file}  —  ${s.failing} failure${s.failing !== 1 ? 's' : ''}`, 35, doc.y - 11, { width: PW - 70, lineBreak: false })
  doc.moveDown(0.35)

  s.failures.forEach((f, fi) => {
    checkPage(doc, 28)
    const bg = fi % 2 === 0 ? '#FFF3F3' : WHITE
    doc.rect(30, doc.y, PW - 60, 24).fill(bg)
    doc.fillColor(DARK).fontSize(7).font('Helvetica-Bold')
      .text(`${fi + 1}. ${f.name}`, 35, doc.y - 20, { width: PW - 75, lineBreak: false })
    doc.fillColor(RED).fontSize(6.5).font('Helvetica')
      .text(`↳ ${f.error}`, 42, doc.y - 9, { width: PW - 82, lineBreak: false })
    doc.moveDown(0.3)
  })

  doc.moveDown(0.5)
})

// ── ROOT CAUSE ANALYSIS ───────────────────────────────────────────────────────
newPage(doc)
sectionBar(doc, 'Root Cause Analysis & Recommendations')

const issues = [
  {
    id: 'RC-001', severity: 'CRITICAL', color: '#B71C1C',
    title: 'App does not redirect unauthenticated users to /login',
    count: '31 failures across 10 specs',
    detail: 'When visiting protected routes (/, /overview, /menu, /orders, /tables, /settings, /categories, /items, /dashboard, /reports) without authentication, the app stays on the root URL instead of redirecting to /login. Tests expecting the URL to include "/login" time out after 10 seconds.',
    fix: 'Check the frontend route guard / auth middleware. Ensure that any route requiring authentication calls router.push("/login") or router.replace("/login") when no access token is found in localStorage / cookies. Also verify the root "/" route itself has a guard.',
    specs: '02, 03, 04, 05, 06, 07, 08, 09, 13, 19, 22'
  },
  {
    id: 'RC-002', severity: 'HIGH', color: RED,
    title: 'Signup endpoint /auth/signup/send-otp/ returns 404',
    count: '3 failures in spec 01',
    detail: 'The signup send-OTP endpoint returns 404 for both valid and invalid emails. The endpoint may not be implemented, may have moved, or may require a different request format.',
    fix: 'Verify the signup endpoint path on the API server. If signup is disabled (invite-only), mark these tests as pending with a clear reason.',
    specs: '01'
  },
  {
    id: 'RC-003', severity: 'MEDIUM', color: AMBER,
    title: 'Login send-OTP returns 401 for invalid identifier (expected 400/404)',
    count: '1 failure in spec 03',
    detail: 'POST /auth/login/send-otp/ with a non-existent email returns 401 instead of 400 or 404. The test expects a client error indicating the identifier is unknown.',
    fix: 'Update the test assertion to also accept 401, or update the API to return 400/404 for unknown identifiers.',
    specs: '03'
  },
  {
    id: 'RC-004', severity: 'MEDIUM', color: AMBER,
    title: 'cy.tab() is not a function — missing plugin',
    count: '1 failure in spec 21',
    detail: 'The accessibility test calls cy.focused().tab() which requires cypress-real-events or cypress-plugin-tab. Neither is installed.',
    fix: 'Run: npm install --save-dev cypress-real-events  then add: import "cypress-real-events" in cypress/support/commands.js',
    specs: '21'
  },
  {
    id: 'RC-005', severity: 'LOW', color: GREY,
    title: 'Kitchen-printer setup requires OTP_CODE at runtime',
    count: '1 failure + 4 skipped in setup spec',
    detail: 'The setup spec fails in the before-all hook because OTP_CODE is not provided. This is expected behaviour for an unauthenticated run.',
    fix: 'Run with: env -u ELECTRON_RUN_AS_NODE npx cypress run --browser chrome --env OTP_CODE=<your-otp>',
    specs: 'setup/assign-kitchen-printer'
  },
  {
    id: 'RC-006', severity: 'INFO', color: BLUE,
    title: '256 tests pending — require authenticated session',
    count: '256 pending across all specs',
    detail: 'The majority of test cases are marked pending because they require an authenticated user session. They will activate when OTP_CODE is supplied and the auth guard issue (RC-001) is resolved.',
    fix: 'Provide OTP_CODE env var and fix the auth redirect (RC-001) to unlock the full test suite.',
    specs: 'all specs'
  },
]

issues.forEach((issue, idx) => {
  checkPage(doc, 90)

  doc.rect(30, doc.y, PW - 60, 20).fill(issue.color)
  doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold')
    .text(`${issue.id}  [${issue.severity}]  ${issue.title}`, 35, doc.y - 15, { width: PW - 75, lineBreak: false })
  doc.moveDown(0.35)

  doc.fillColor(DARK).fontSize(7.5).font('Helvetica-Bold').text('Affected: ', 35, doc.y, { continued: true })
  doc.font('Helvetica').fillColor(GREY).text(issue.count)
  doc.moveDown(0.2)

  doc.fillColor(DARK).fontSize(7.5).font('Helvetica-Bold').text('Specs: ', 35, doc.y, { continued: true })
  doc.font('Helvetica').fillColor(GREY).text(issue.specs)
  doc.moveDown(0.2)

  doc.fillColor(DARK).font('Helvetica-Bold').text('Detail: ', 35, doc.y)
  doc.font('Helvetica').fillColor(DARK).text(issue.detail, 35, doc.y, { width: PW - 70 })
  doc.moveDown(0.3)

  doc.fillColor(DARK).font('Helvetica-Bold').text('Fix: ', 35, doc.y)
  doc.font('Helvetica').fillColor(GREEN).text(issue.fix, 35, doc.y, { width: PW - 70 })
  doc.moveDown(0.4)

  doc.moveTo(30, doc.y).lineTo(PW - 30, doc.y).strokeColor(DGREY).stroke()
  doc.moveDown(0.6)
})

// ── HOW TO RUN ────────────────────────────────────────────────────────────────
newPage(doc)
sectionBar(doc, 'How to Run Tests')

const cmds = [
  ['All specs (Chrome, unauthenticated)',  'env -u ELECTRON_RUN_AS_NODE npx cypress run --browser chrome'],
  ['All specs with OTP auth',             'env -u ELECTRON_RUN_AS_NODE npx cypress run --browser chrome --env OTP_CODE=<code>'],
  ['Smoke suite (Chrome)',                'env -u ELECTRON_RUN_AS_NODE npm run cy:run:smoke'],
  ['Functional suite',                    'env -u ELECTRON_RUN_AS_NODE npm run cy:run:functional'],
  ['Order suite',                         'env -u ELECTRON_RUN_AS_NODE npm run cy:run:order-suite'],
  ['Security suite',                      'env -u ELECTRON_RUN_AS_NODE npm run cy:run:security-suite'],
  ['Quality suite',                       'env -u ELECTRON_RUN_AS_NODE npm run cy:run:quality'],
  ['Regression (with retries)',           'env -u ELECTRON_RUN_AS_NODE npm run cy:run:regression'],
  ['API tests only (no browser)',         'npm run test:api'],
  ['API tests with auth',                 'OTP_CODE=<code> npm run test:api:auth'],
  ['Generate API PDF report',            'npm run report:pdf'],
  ['Generate Cypress PDF report',        'node scripts/generate-cypress-pdf.js'],
]

const rw = [220, 310]
doc.rect(30, doc.y, rw.reduce((a,b)=>a+b), 20).fill(DARK)
doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
let rhx = 30
;['Description', 'Command'].forEach((h, i) => {
  doc.text(h, rhx + 3, doc.y - 14, { width: rw[i] - 6, lineBreak: false })
  rhx += rw[i]
})
doc.moveDown(0.55)

cmds.forEach(([desc, cmd], i) => {
  checkPage(doc, 22)
  const bg = i % 2 === 0 ? LGREY : WHITE
  doc.rect(30, doc.y, rw.reduce((a,b)=>a+b), 16).fill(bg)
  let rx = 30
  ;[desc, cmd].forEach((v, j) => {
    doc.fillColor(j === 1 ? BRAND : DARK).font(j === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7)
      .text(v, rx + 3, doc.y - 11, { width: rw[j] - 6, lineBreak: false })
    rx += rw[j]
  })
  doc.moveDown(0.43)
})

doc.moveDown(0.8)
checkPage(doc, 30)
doc.rect(30, doc.y, PW - 60, 22).fill('#FFF8E1')
doc.fillColor('#E65100').fontSize(7.5).font('Helvetica-Bold')
  .text('⚠  Note:', 35, doc.y - 17, { continued: true })
doc.font('Helvetica').fillColor(DARK)
  .text('  Always prefix cypress commands with env -u ELECTRON_RUN_AS_NODE because Claude Code sets ELECTRON_RUN_AS_NODE=1 which breaks the Cypress Electron binary.')
doc.moveDown(1)

// ── PAGE NUMBERS ──────────────────────────────────────────────────────────────
const range = doc.bufferedPageRange()
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i)
  doc.fillColor(GREY).fontSize(7.5).font('Helvetica')
    .text(
      `Page ${i + 1} of ${range.count}   |   Formula RMS Cypress E2E Report   |   ${new Date(meta.timestamp).toLocaleDateString()}`,
      30, PH - 18, { width: PW - 60, align: 'center' }
    )
}

doc.end()
doc.on('finish', () => {
  console.log(`✅  PDF saved: ${OUTPUT}`)
})
