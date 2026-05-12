/**
 * Import FormulaRMS test cases → Google Sheet
 * Strategy: convert CSV → TSV, load into system clipboard,
 *            then open the sheet and paste into cell A1.
 *
 * Usage: node scripts/import-to-gsheet.js
 */

const { chromium }    = require('@playwright/test')
const { execSync }    = require('child_process')
const fs              = require('fs')
const path            = require('path')

const CSV_PATH       = path.resolve(__dirname, '../cypress/reports/formularms-testcases.csv')
const SHEET_URL      = 'https://docs.google.com/spreadsheets/d/1xeDJuqieRe1uO4HYro3_y_J4GO4uofFyeR5JOJAw0B8/edit'
const CHROME_PROFILE = '/home/bottle/.config/google-chrome/Profile 1'

// ── Convert CSV → TSV ─────────────────────────────────────────────────────────
function csvToTsv(csvPath) {
  const raw   = fs.readFileSync(csvPath, 'utf8')
  const lines = raw.trim().split('\n')
  return lines.map(line => {
    // Parse quoted CSV fields and join with tabs
    const fields = []
    let field = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { field += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        fields.push(field); field = ''
      } else {
        field += ch
      }
    }
    fields.push(field)
    return fields.join('\t')
  }).join('\n')
}

;(async () => {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`); process.exit(1)
  }

  // ── Step 1: Copy data to clipboard ───────────────────────────────────────
  console.log('Converting CSV → TSV and loading into clipboard…')
  const tsv = csvToTsv(CSV_PATH)
  const rowCount = tsv.split('\n').length
  console.log(`  Rows: ${rowCount}`)

  const tmpFile = '/tmp/gsheet_tsv.txt'
  fs.writeFileSync(tmpFile, tsv, 'utf8')

  // Write directly to GTK CLIPBOARD selection (what Ctrl+V reads in Chrome)
  const pyScript = `
import gi, sys
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Gtk, Gdk, GLib

data = open('${tmpFile}', encoding='utf-8').read()

def set_and_exit():
    cb = Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)
    cb.set_text(data, -1)
    cb.store()          # persist after process exits
    verify = cb.wait_for_text()
    print(f'CLIPBOARD set: {len(verify)} chars, first 40: {repr(verify[:40])}')
    Gtk.main_quit()

GLib.timeout_add(100, set_and_exit)
Gtk.main()
`
  const pyFile = '/tmp/set_clipboard.py'
  fs.writeFileSync(pyFile, pyScript, 'utf8')
  execSync(`DISPLAY=:0 python3 ${pyFile}`, { stdio: 'inherit', env: { ...process.env, DISPLAY: ':0' } })

  // ── Step 2: Open Chrome with existing profile ─────────────────────────────
  console.log('\nLaunching Chrome with your Google profile…')
  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    channel:  'chrome',
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    viewport: { width: 1280, height: 800 },
    permissions: ['clipboard-read', 'clipboard-write'],
  })

  const page = await context.newPage()
  await page.goto(SHEET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)

  // Handle sign-in if needed
  if (page.url().includes('accounts.google.com')) {
    console.log('⚠  Please sign in to Google in the browser window. Waiting 90s…')
    await page.waitForURL(url => !url.toString().includes('accounts.google.com'), { timeout: 90000 })
    await page.waitForTimeout(3000)
  }

  // ── Step 3: Wait for sheet grid to load ──────────────────────────────────
  console.log('Waiting for spreadsheet to load…')
  await page.waitForSelector('.waffle-name-box, canvas.grid-canvas, .docs-sheet-tab', { timeout: 20000 })
  await page.waitForTimeout(2000)

  // ── Step 4: Click on cell A1 via the Name Box ─────────────────────────────
  console.log('Selecting cell A1…')
  const nameBox = page.locator('.waffle-name-box').first()
  await nameBox.click({ timeout: 10000 })
  await page.keyboard.press('Control+a')
  await page.keyboard.type('A1')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)

  // ── Step 5: Write TSV into Chrome's own clipboard then paste ─────────────
  console.log('Writing data to Chrome clipboard…')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text)
  }, tsv)
  console.log('Pasting…')
  await page.keyboard.press('Control+v')
  await page.waitForTimeout(5000)

  // ── Step 6: Screenshot to confirm ─────────────────────────────────────────
  await page.screenshot({ path: '/tmp/gsheet-pasted.png' })
  console.log('Screenshot: /tmp/gsheet-pasted.png')

  // ── Step 7: Rename sheet tab to "Test Cases" ──────────────────────────────
  try {
    const tab = page.locator('.docs-sheet-active-tab .docs-sheet-tab-name').first()
    await tab.dblclick({ timeout: 5000 })
    await page.waitForTimeout(400)
    await page.keyboard.selectAll()
    await page.keyboard.type('Test Cases')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
    console.log('Sheet tab renamed to "Test Cases"')
  } catch (_) {}

  console.log(`\n✅  Done! Sheet: ${page.url()}`)
  await page.waitForTimeout(10000)
  await context.close()
})()
