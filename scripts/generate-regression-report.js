/**
 * Generate a PDF regression report from mochawesome JSON files
 * Usage: node scripts/generate-regression-report.js
 */

const PDFDocument = require('pdfkit')
const fs          = require('fs')
const path        = require('path')

const REPORT_DIR = './cypress/reports/regression'
const TODAY      = new Date().toISOString().slice(0, 10)
const OUTPUT     = `./cypress/reports/regression-report-${TODAY}.pdf`
const SPEC_COUNT = 34   // number of spec files — take only the latest batch

// ── Colour palette ────────────────────────────────────────────────────────────
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

// ── Parse all mochawesome JSONs ────────────────────────────────────────────────
// Take only the latest batch of files so multiple runs don't mix
const files = fs.readdirSync(REPORT_DIR)
  .filter(f => f.match(/^mochawesome_\d+\.json$/))
  .sort()
  .slice(-SPEC_COUNT)

const SPEC_NAMES = [
  '01-signup', '02-homepage', '03-auth', '04-menu', '05-categories',
  '06-items', '07-orders', '08-tables', '09-settings', '10-responsive',
  '11-console-errors', '12-e2e-flow', '13-dashboard', '14-order-lifecycle',
  '15-billing', '16-table-sessions', '17-search-filter', '18-api-health',
  '19-permissions', '20-network-errors', '21-accessibility', '22-security',
  '23-reports', '24-performance', '25-menu-availability', '26-full-flow',
  '27-regression', '28-staff', '29-invoice-kot-settings',
  '30-google-sheet-testcases', '31-clear-orders', '32-user-profile',
  '33-profile-buttons', '34-preferences-buttons',
]

let totalPass = 0, totalFail = 0, totalPending = 0
const specRows   = []
const failedList = []

function walkSuites(suites, parentTitle) {
  if (!suites) return
  for (const suite of suites) {
    const ctx = parentTitle ? `${parentTitle} › ${suite.title}` : suite.title
    for (const t of (suite.tests || [])) {
      if (t.fail) {
        const msg = (t.err && t.err.message)
          ? t.err.message.replace(/\n/g, ' ').slice(0, 200)
          : 'no error message'
        failedList.push({ spec: parentTitle || suite.title, full: t.fullTitle || t.title, msg })
      }
    }
    walkSuites(suite.suites, ctx)
  }
}

files.forEach((file, i) => {
  const raw   = JSON.parse(fs.readFileSync(path.join(REPORT_DIR, file)))
  const stats = raw.stats || {}
  const pass  = stats.passes  || 0
  const fail  = stats.failures|| 0
  const pend  = stats.pending || 0
  const total = stats.tests   || 0

  totalPass    += pass
  totalFail    += fail
  totalPending += pend

  specRows.push({
    name:  SPEC_NAMES[i] || file.replace('.json',''),
    total, pass, fail, pend,
  })

  ;(raw.results || []).forEach(r => walkSuites(r.suites, r.title || file))
})

const totalTests = totalPass + totalFail + totalPending
const passRate   = totalPass + totalFail > 0
  ? Math.round((totalPass / (totalPass + totalFail)) * 100) : 0

// ── Group failures by root cause ───────────────────────────────────────────────
function classify(msg, spec) {
  if (msg.includes('401'))                                    return 'RC-003'
  if (msg.includes('expected 404') && msg.includes('200'))   return 'RC-001'
  if (msg.includes('expected 404'))                          return 'RC-001'
  if (msg.includes('/login'))                                return 'RC-002'
  if (msg.includes('429'))                                   return 'RC-004'
  if (msg.includes('Save changes') || spec.includes('34'))   return 'BUG-023'
  if (msg.includes('naturalWidth') || msg.includes('avatar'))return 'BUG-022'
  if (msg.includes('JWT') || msg.includes('3 parts'))        return 'RC-003'
  if (msg.includes('Expected to find content') ||
      msg.includes('Expected to find element'))              return 'RC-005'
  return 'RC-OTH'
}

const rcCounts = { 'RC-001':0,'RC-002':0,'RC-003':0,'RC-004':0,'RC-005':0,'BUG-022':0,'BUG-023':0,'RC-OTH':0 }
failedList.forEach(f => {
  const rc = classify(f.msg, f.spec)
  rcCounts[rc]++
  f.rc = rc
})

// ── PDF helpers ───────────────────────────────────────────────────────────────
const doc = new PDFDocument({ margin: 30, size: 'A4', bufferPages: true })
doc.pipe(fs.createWriteStream(OUTPUT))

const PW = doc.page.width
const PH = doc.page.height

function header() {
  doc.rect(0, 0, PW, 40).fill(DARK)
  doc.fillColor(WHITE).fontSize(10).font('Helvetica-Bold')
    .text(`Formula RMS – Regression Test Report  |  ${TODAY}`, 30, 13)
  doc.fillColor(WHITE).fontSize(8).font('Helvetica')
    .text('CONFIDENTIAL', PW - 110, 15, { width: 90, align: 'right' })
  doc.y = 56
}

function newPage() {
  doc.addPage()
  header()
}

function checkY(needed = 40) {
  if (doc.y > PH - needed) newPage()
}

function sectionBar(title) {
  checkY(50)
  doc.moveDown(0.3)
  doc.rect(30, doc.y, PW - 60, 22).fill(DARK)
  doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
    .text(title, 38, doc.y - 16)
  doc.fillColor(DARK).moveDown(0.6)
}

// ── COVER PAGE ────────────────────────────────────────────────────────────────
doc.rect(0, 0, PW, PH).fill(DARK)
doc.rect(0, PH - 8, PW, 8).fill(BRAND)

doc.fillColor(WHITE).fontSize(28).font('Helvetica-Bold')
  .text('Formula RMS', 50, 130, { align: 'center' })
doc.fillColor(BRAND).fontSize(18).font('Helvetica-Bold')
  .text('Complete Regression Test Report', 50, 168, { align: 'center' })

doc.fillColor(DGREY).fontSize(10).font('Helvetica')
  .text('Date: 13 May 2026  |  Environment: https://formularms.bottle.com.np', 50, 224, { align: 'center' })
  .text(`Specs: ${files.length}  |  Browser: Chrome  |  Framework: Cypress 13`, 50, 240, { align: 'center' })

// Summary boxes
const bW = 86, bH = 62, bY = 296, gap = 16
const bStart = (PW - (5 * bW + 4 * gap)) / 2
const boxes = [
  { label: 'PASSED',   value: totalPass,    color: GREEN },
  { label: 'FAILED',   value: totalFail,    color: RED   },
  { label: 'PENDING',  value: totalPending, color: AMBER },
  { label: 'TOTAL',    value: totalTests,   color: BLUE  },
  { label: 'PASS %',   value: `${passRate}%`, color: passRate >= 80 ? GREEN : passRate >= 60 ? AMBER : RED },
]
boxes.forEach((b, i) => {
  const bx = bStart + i * (bW + gap)
  doc.rect(bx, bY, bW, bH).fill(b.color)
  const valStr = String(b.value)
  const fontSize = valStr.length > 4 ? 16 : 24
  doc.fillColor(WHITE).fontSize(fontSize).font('Helvetica-Bold')
    .text(valStr, bx, bY + (fontSize === 16 ? 16 : 8), { width: bW, align: 'center' })
  doc.fillColor(WHITE).fontSize(8).font('Helvetica')
    .text(b.label, bx, bY + 42, { width: bW, align: 'center' })
})

// Bug highlight box
doc.rect(50, 392, PW - 100, 110).fill('#2C3E50')
doc.fillColor('#F39C12').fontSize(9).font('Helvetica-Bold')
  .text('BUGS CONFIRMED IN THIS RUN', 65, 402)
doc.fillColor(WHITE).fontSize(8).font('Helvetica')
  .text(
    'BUG-22  Avatar image returns HTTP 404 — profile picture missing on server\n' +
    '         Spec: 32-user-profile.cy.js  |  Severity: Medium\n\n' +
    'BUG-23  "Save changes" button permanently disabled on Preferences tab\n' +
    '         Dropdown and toggle changes cannot be persisted\n' +
    '         Spec: 34-preferences-buttons.cy.js  |  Severity: High\n\n' +
    'RC-001  Multiple API endpoints returning 404 — menu, orders, tables, settings\n' +
    '         Affects 18-api-health + 6 other specs  |  Severity: Critical',
    65, 418, { width: PW - 130 }
  )

// Prepared by
doc.fillColor(DGREY).fontSize(8).font('Helvetica')
  .text('Prepared by: Pranuj  |  QA Engineer – Formula RMS', 50, 520, { align: 'center' })
  .text('Generated with: Cypress E2E Automation Suite  |  Node.js PDF Generator', 50, 536, { align: 'center' })

// ── PAGE 2: SPEC SUMMARY TABLE ────────────────────────────────────────────────
newPage()
sectionBar('Spec-by-Spec Summary')

const cw = [176, 40, 40, 40, 40, 66]
const hdrs = ['Spec File', 'Total', 'Pass', 'Fail', 'Pend', 'Result']

// Table header
doc.rect(30, doc.y, cw.reduce((a,b)=>a+b), 20).fill(DARK)
doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
let hx = 30
hdrs.forEach((h, i) => {
  doc.text(h, hx + 3, doc.y - 14, { width: cw[i] - 6, lineBreak: false })
  hx += cw[i]
})
doc.moveDown(0.55)

specRows.forEach((s, idx) => {
  checkY(20)
  const bg = idx % 2 === 0 ? LGREY : WHITE
  const resultColor = s.fail > 0 ? RED : GREEN
  const resultLabel = s.fail > 0 ? 'FAIL' : 'PASS'
  doc.rect(30, doc.y, cw.reduce((a,b)=>a+b), 16).fill(bg)
  let cx = 30
  const vals = [s.name, s.total, s.pass, s.fail, s.pend, resultLabel]
  vals.forEach((v, i) => {
    const color = i === 5 ? resultColor : i === 3 && s.fail > 0 ? RED : DARK
    const font  = i === 5 ? 'Helvetica-Bold' : 'Helvetica'
    doc.fillColor(color).font(font).fontSize(7)
      .text(String(v), cx + 3, doc.y - 11, { width: cw[i] - 6, lineBreak: false })
    cx += cw[i]
  })
  doc.moveDown(0.44)
})

// Totals row
checkY(24)
doc.rect(30, doc.y, cw.reduce((a,b)=>a+b), 18).fill(DARK)
doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
let tx = 30
const totals = [`TOTAL  (${files.length} specs)`, totalTests, totalPass, totalFail, totalPending, `${passRate}% pass`]
totals.forEach((v, i) => {
  doc.fillColor(i === 3 && totalFail > 0 ? '#FF8A80' : WHITE)
  doc.text(String(v), tx + 3, doc.y - 13, { width: cw[i] - 6, lineBreak: false })
  tx += cw[i]
})
doc.moveDown(0.5)

// ── PAGE 3: VISUAL BAR CHART ──────────────────────────────────────────────────
newPage()
sectionBar('Spec Results – Visual Breakdown')

const barMaxW = PW - 190
const labelW  = 148

specRows.forEach(s => {
  checkY(20)
  const tot   = s.total || 1
  const passW = Math.round((s.pass  / tot) * barMaxW)
  const failW = Math.round((s.fail  / tot) * barMaxW)
  const pendW = Math.round((s.pend  / tot) * barMaxW)
  const skipW = barMaxW - passW - failW - pendW
  const y0    = doc.y

  doc.fillColor(DARK).fontSize(6.5).font('Helvetica')
    .text(s.name, 30, y0, { width: labelW - 4, lineBreak: false })

  let bx = 30 + labelW
  if (passW > 0) { doc.rect(bx, y0, passW, 11).fill(GREEN); bx += passW }
  if (failW > 0) { doc.rect(bx, y0, failW, 11).fill(RED);   bx += failW }
  if (pendW > 0) { doc.rect(bx, y0, pendW, 11).fill(AMBER); bx += pendW }
  if (skipW > 0) { doc.rect(bx, y0, skipW, 11).fill(LGREY); bx += skipW }

  doc.fillColor(DARK).fontSize(6.5).font('Helvetica')
    .text(`${s.pass}✓  ${s.fail}✗`, bx + 4, y0, { lineBreak: false })

  doc.y = y0 + 15
})

// Legend
doc.moveDown(0.8)
const leg = [[GREEN,'Passed'],[RED,'Failed'],[AMBER,'Pending'],[LGREY,'N/A']]
let lx = 30
leg.forEach(([c, label]) => {
  doc.rect(lx, doc.y, 10, 10).fill(c)
  doc.fillColor(DARK).fontSize(7).font('Helvetica').text(label, lx + 13, doc.y - 1, { lineBreak: false })
  lx += 70
})

// ── PAGE 4: ROOT CAUSE ANALYSIS ───────────────────────────────────────────────
newPage()
sectionBar('Root Cause Analysis')

const rootCauses = [
  {
    id: 'RC-001', sev: 'CRITICAL', color: '#B71C1C', count: rcCounts['RC-001'],
    title: 'API endpoints returning 404 — version mismatch or routes changed',
    detail: 'GET/POST to /menu/, /orders/, /tables/, /settings/, /staff/, /reports/, /printer/ all return 404 HTML instead of JSON. This affects 18-api-health (18 failures), search-filter, full-flow, regression suite, and more. The API base path may have changed, or resources were deleted.',
    fix: 'Verify API_BASE in cypress.config.js matches the current API route prefix. Check if the API server is serving the correct version. Re-create test data if resources were deleted.',
    specs: '05, 06, 07, 08, 12, 13, 14, 15, 16, 17, 18, 25, 26, 27, 28, 29',
  },
  {
    id: 'RC-002', sev: 'HIGH', color: RED, count: rcCounts['RC-002'],
    title: 'Unauthenticated routes redirect to "/" instead of "/login"',
    detail: 'Tests that clear localStorage and visit protected pages expect a redirect to /login, but the app stays on / (root). Tests in homepage, permissions, security, and settings specs all fail with "expected \'/\' to include \'/login\'".',
    fix: 'Check the frontend route guard. When no access_token is in localStorage, the router must redirect to /login. Also ensure the root "/" route itself requires authentication.',
    specs: '02, 04, 05, 09, 13, 19, 20, 22',
  },
  {
    id: 'RC-003', sev: 'HIGH', color: RED, count: rcCounts['RC-003'],
    title: 'Token expiry / auth failures in later specs (401 errors)',
    detail: 'Specs 32, 33, 34 failed with 401 Unauthorized. The Cypress session token (FORMULARMS_TOKEN) expired partway through the long regression run. The cy.session() validate() step did not re-authenticate in time.',
    fix: 'Specs 32–34 require a fresh OTP run. In CI, pass OTP_CODE per-run. For long regression runs, consider refreshing the token mid-suite or running auth-heavy specs first.',
    specs: '32, 33, 34',
  },
  {
    id: 'RC-004', sev: 'MEDIUM', color: AMBER, count: rcCounts['RC-004'],
    title: 'OTP rate-limited (429 Too Many Requests)',
    detail: 'Spec 03 hit a 429 when re-sending OTP. The test sent the OTP endpoint too quickly after a prior call in the same run.',
    fix: 'Add a cy.wait(60000) guard or check the rate-limit window before re-sending. Mark the test as retryable with a longer backoff.',
    specs: '03',
  },
  {
    id: 'RC-005', sev: 'MEDIUM', color: AMBER, count: rcCounts['RC-005'],
    title: 'UI content mismatch — expected text/elements not found',
    detail: 'Invoice/KOT settings pages do not render expected headings or form labels. Accessibility tests cannot find img or heading elements. Settings save button text differs from expected "/save|update|submit/i".',
    fix: 'Update selectors/text matchers in specs 09, 20, 21, 29 to reflect the current UI. Visit the pages manually to capture correct element content.',
    specs: '09, 20, 21, 29',
  },
  {
    id: 'BUG-022', sev: 'MEDIUM', color: AMBER, count: rcCounts['BUG-022'],
    title: 'BUG-22: Avatar image returns HTTP 404 — file missing on server',
    detail: 'The user profile avatar URL (https://formularms-api.bottle.com.np/media/avatars/...) returns 404. The img element has naturalWidth=0 confirming the image is broken. This was intentionally documented with 2 failing tests in spec 32.',
    fix: 'Re-upload the avatar file to the media server, or restore it from backup. Check storage backend configuration (S3, local disk). Ensure the media file path is correctly mounted.',
    specs: '32',
  },
  {
    id: 'BUG-023', sev: 'HIGH', color: RED, count: rcCounts['BUG-023'],
    title: 'BUG-23: "Save changes" button permanently disabled on Preferences tab',
    detail: 'On the /profile Preferences tab, the "Save changes" button is always disabled regardless of user interaction. Changing Language/Timezone/Currency/Date Format dropdowns or toggling notification switches does not enable the button. Preferences changes are silently lost on navigation.',
    fix: 'Check the React state/form-dirty logic for the Preferences tab. The onChange handlers for <select> and toggle switches must set isDirty=true (or equivalent). Ensure the Save button\'s disabled prop reads from that state.',
    specs: '34',
  },
]

rootCauses.forEach(rc => {
  checkY(100)
  doc.rect(30, doc.y, PW - 60, 20).fill(rc.color)
  doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold')
    .text(`${rc.id}  [${rc.sev}]  ${rc.title}  (${rc.count} test${rc.count !== 1 ? 's' : ''})`, 35, doc.y - 15, { width: PW - 75, lineBreak: false })
  doc.moveDown(0.3)

  doc.fillColor(DARK).fontSize(7.5).font('Helvetica-Bold')
    .text('Specs affected: ', 35, doc.y, { continued: true })
  doc.font('Helvetica').fillColor(GREY).text(rc.specs)
  doc.moveDown(0.2)

  doc.fillColor(DARK).font('Helvetica-Bold').text('Detail: ', 35, doc.y)
  doc.font('Helvetica').fillColor(DARK).text(rc.detail, 35, doc.y, { width: PW - 70 })
  doc.moveDown(0.25)

  doc.fillColor(DARK).font('Helvetica-Bold').text('Fix: ', 35, doc.y)
  doc.font('Helvetica').fillColor(GREEN).text(rc.fix, 35, doc.y, { width: PW - 70 })
  doc.moveDown(0.35)

  doc.moveTo(30, doc.y).lineTo(PW - 30, doc.y).strokeColor(DGREY).stroke()
  doc.moveDown(0.5)
})

// ── PAGE 5: BUG REGISTER ─────────────────────────────────────────────────────
newPage()
sectionBar('Bug Register')

const bugs = [
  {
    id: 'BUG-22', severity: 'Medium', status: 'Open',
    title: 'Avatar image returns 404 on profile page',
    steps: '1. Log in  2. Visit /profile  3. Inspect avatar <img> src  4. Request URL returns HTTP 404',
    expected: 'Avatar image loads successfully (HTTP 200)',
    actual: 'HTTP 404 Not Found — image missing from media server',
    spec: '32-user-profile.cy.js',
  },
  {
    id: 'BUG-23', severity: 'High', status: 'Open',
    title: '"Save changes" button stays disabled on Preferences tab after any change',
    steps: '1. Log in  2. Visit /profile  3. Click Preferences tab  4. Change any dropdown (Language/Timezone/Currency/Date Format) or flip any toggle switch  5. Observe Save changes button',
    expected: 'Save changes button becomes enabled after any preference is modified',
    actual: 'Save changes remains disabled. No preferences can be saved. Changes are lost on navigation.',
    spec: '34-preferences-buttons.cy.js',
  },
]

bugs.forEach((bug, idx) => {
  checkY(110)
  const sevColor = bug.severity === 'High' ? RED : AMBER

  doc.rect(30, doc.y, PW - 60, 20).fill(sevColor)
  doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold')
    .text(`${bug.id}  [${bug.severity}]  Status: ${bug.status}  —  ${bug.title}`, 35, doc.y - 14, { width: PW - 75, lineBreak: false })
  doc.moveDown(0.3)

  const rows = [
    ['Steps to Reproduce', bug.steps],
    ['Expected Result',    bug.expected],
    ['Actual Result',      bug.actual],
    ['Automated Test',     bug.spec],
  ]
  rows.forEach(([label, text], i) => {
    checkY(30)
    const bg = i % 2 === 0 ? LGREY : WHITE
    doc.rect(30, doc.y, PW - 60, 18).fill(bg)
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
      .text(label + ':', 35, doc.y - 13, { width: 110, lineBreak: false })
    doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
      .text(text, 148, doc.y, { width: PW - 175 })
    doc.moveDown(0.3)
  })
  doc.moveDown(0.5)
})

// ── PAGE 6: FAILED TESTS TABLE ────────────────────────────────────────────────
newPage()
sectionBar('Failed Tests — Full List')

const fcw = [16, 110, 130, 80]
const fhdr = ['#', 'Spec', 'Test Name', 'Error Summary']

doc.rect(30, doc.y, fcw.reduce((a,b)=>a+b), 18).fill(DARK)
doc.fillColor(WHITE).fontSize(7).font('Helvetica-Bold')
let fhx = 30
fhdr.forEach((h, i) => {
  doc.text(h, fhx + 2, doc.y - 12, { width: fcw[i] - 4, lineBreak: false })
  fhx += fcw[i]
})
doc.moveDown(0.5)

// Deduplicate failures by test title within same spec
const seen = new Set()
const deduped = failedList.filter(f => {
  const key = f.spec + '|' + f.full
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

deduped.forEach((f, idx) => {
  checkY(22)
  const bg   = idx % 2 === 0 ? '#FFF3F3' : WHITE
  const name = f.full.split(' ').slice(-4).join(' ').slice(0, 60)
  const err  = f.msg.slice(0, 80)
  const rowH = 18

  doc.rect(30, doc.y, fcw.reduce((a,b)=>a+b), rowH).fill(bg)
  let cx = 30
  const vals = [String(idx+1), (f.spec||'').slice(0,30), name, err]
  vals.forEach((v, i) => {
    doc.fillColor(i === 3 ? RED : DARK).font('Helvetica').fontSize(6.5)
      .text(v, cx + 2, doc.y - rowH + 5, { width: fcw[i] - 4, lineBreak: false })
    cx += fcw[i]
  })
  doc.y += 5
})

// ── PAGE NUMBERS ──────────────────────────────────────────────────────────────
const range = doc.bufferedPageRange()
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i)
  doc.fillColor(GREY).fontSize(7).font('Helvetica')
    .text(
      `Page ${i + 1} of ${range.count}   ·   Formula RMS Regression Report   ·   ${TODAY}`,
      30, PH - 16, { width: PW - 60, align: 'center' }
    )
}

doc.end()
console.log(`✅  Report saved → ${OUTPUT}`)
