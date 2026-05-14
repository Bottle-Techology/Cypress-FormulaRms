#!/usr/bin/env node
/**
 * Formula RMS – Automation Runner
 *
 * Handles the full pipeline:
 *   1. OTP login (interactive or via env)
 *   2. Suite selection menu
 *   3. Cypress run with token injected
 *   4. PDF report generation
 *   5. Summary printed to console
 *
 * Usage:
 *   node scripts/automate.js                   # interactive mode
 *   SUITE=smoke node scripts/automate.js        # skip suite prompt
 *   OTP_CODE=123456 node scripts/automate.js    # skip OTP prompt
 *   OTP_CODE=123456 SUITE=regression node scripts/automate.js  # fully non-interactive
 */

'use strict'

const https      = require('https')
const readline   = require('readline')
const { spawn }  = require('child_process')
const fs         = require('fs')
const path       = require('path')

// ── Constants ─────────────────────────────────────────────────────────────────

const IDENTIFIER  = 'pranuj@bottle.com.np'
const API_HOST    = 'formularms-api.bottle.com.np'
const TOKEN_FILE  = '/tmp/formularms-token.txt'
const REPORT_DIR  = path.resolve(__dirname, '../cypress/reports')
const TODAY       = new Date().toISOString().slice(0, 10)

// ANSI colours
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  bgDark: '\x1b[44m',
}

const log   = (msg)       => console.log(msg)
const info  = (msg)       => console.log(`${C.cyan}ℹ  ${msg}${C.reset}`)
const ok    = (msg)       => console.log(`${C.green}✅  ${msg}${C.reset}`)
const warn  = (msg)       => console.log(`${C.yellow}⚠  ${msg}${C.reset}`)
const err   = (msg)       => console.log(`${C.red}✖  ${msg}${C.reset}`)
const title = (msg)       => console.log(`\n${C.bold}${C.bgDark} ${msg} ${C.reset}\n`)
const hr    = ()          => console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`)

// ── Suite definitions ─────────────────────────────────────────────────────────

const SUITES = {
  smoke: {
    label: 'Smoke  (auth, homepage, dashboard)',
    spec:  'cypress/e2e/01-signup.cy.js,cypress/e2e/02-homepage.cy.js,cypress/e2e/03-auth.cy.js,cypress/e2e/13-dashboard.cy.js',
    report: 'smoke',
  },
  functional: {
    label: 'Functional  (auth + menu + orders + tables + billing)',
    spec:  'cypress/e2e/03-auth.cy.js,cypress/e2e/04-menu.cy.js,cypress/e2e/05-categories.cy.js,cypress/e2e/06-items.cy.js,cypress/e2e/07-orders.cy.js,cypress/e2e/08-tables.cy.js,cypress/e2e/14-order-lifecycle.cy.js,cypress/e2e/15-billing.cy.js,cypress/e2e/16-table-sessions.cy.js,cypress/e2e/26-full-flow.cy.js',
    report: 'functional',
  },
  profile: {
    label: 'Profile  (user-profile + buttons + preferences)',
    spec:  'cypress/e2e/32-user-profile.cy.js,cypress/e2e/33-profile-buttons.cy.js,cypress/e2e/34-preferences-buttons.cy.js',
    report: 'profile',
  },
  security: {
    label: 'Security  (permissions + network errors + security)',
    spec:  'cypress/e2e/19-permissions.cy.js,cypress/e2e/20-network-errors.cy.js,cypress/e2e/22-security.cy.js',
    report: 'security',
  },
  quality: {
    label: 'Quality  (responsive + console + a11y + performance)',
    spec:  'cypress/e2e/10-responsive.cy.js,cypress/e2e/11-console-errors.cy.js,cypress/e2e/21-accessibility.cy.js,cypress/e2e/24-performance.cy.js',
    report: 'quality',
  },
  regression: {
    label: 'Full Regression  (all specs)',
    spec:  null,   // null = no --spec flag (runs everything)
    report: 'regression',
  },
  critical: {
    label: 'Critical Path  (auth + order-lifecycle + billing + e2e + full-flow)',
    spec:  'cypress/e2e/03-auth.cy.js,cypress/e2e/14-order-lifecycle.cy.js,cypress/e2e/15-billing.cy.js,cypress/e2e/12-e2e-flow.cy.js,cypress/e2e/26-full-flow.cy.js,cypress/e2e/27-regression.cy.js',
    report: 'critical',
  },
  api: {
    label: 'API Health  (api-health only)',
    spec:  'cypress/e2e/18-api-health.cy.js',
    report: 'api-health',
  },
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpsPost(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req  = https.request({
      hostname: API_HOST,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    }, (res) => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => resolve({ status: res.statusCode, body: raw }))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// ── Readline helper ───────────────────────────────────────────────────────────

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()) })
  })
}

// ── Token management ──────────────────────────────────────────────────────────

function loadCachedToken() {
  try {
    const t = fs.readFileSync(TOKEN_FILE, 'utf8').trim()
    if (t && t.length > 20) return t
  } catch {}
  return null
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_FILE, token, 'utf8')
}

// ── OTP flow ──────────────────────────────────────────────────────────────────

async function getToken() {
  // 1. Env-supplied token (e.g. from a prior run)
  if (process.env.FORMULARMS_TOKEN) {
    info(`Using FORMULARMS_TOKEN from environment (${process.env.FORMULARMS_TOKEN.length} chars)`)
    return process.env.FORMULARMS_TOKEN
  }

  // 2. Cached token on disk
  const cached = loadCachedToken()
  if (cached) {
    info(`Reusing cached token from ${TOKEN_FILE} (${cached.length} chars)`)
    return cached
  }

  // 3. OTP supplied via env (CI mode)
  let otpCode = process.env.OTP_CODE
  if (!otpCode) {
    // 4. Interactive: send OTP and prompt
    info(`Sending OTP to ${IDENTIFIER}...`)
    const sendRes = await httpsPost('/auth/login/send-otp/', { identifier: IDENTIFIER, method: 'email' })
    if (sendRes.status !== 200) {
      err(`Failed to send OTP: HTTP ${sendRes.status}  ${sendRes.body}`)
      process.exit(1)
    }
    ok(`OTP sent to ${IDENTIFIER}`)
    otpCode = await ask('\n📩  Enter the OTP code from your email: ')
  } else {
    info(`Using OTP_CODE from environment`)
  }

  // 5. Verify OTP
  info('Verifying OTP...')
  const verRes = await httpsPost('/auth/login/verify-otp/', {
    identifier: IDENTIFIER,
    method: 'email',
    code: String(otpCode),
  })

  if (verRes.status !== 200) {
    err(`OTP verification failed [HTTP ${verRes.status}]: ${verRes.body}`)
    process.exit(1)
  }

  const token = JSON.parse(verRes.body).access
  if (!token) {
    err(`No access token in response: ${verRes.body}`)
    process.exit(1)
  }

  saveToken(token)
  ok(`Token obtained and saved (${token.length} chars)`)
  return token
}

// ── Suite selection ───────────────────────────────────────────────────────────

async function selectSuite() {
  const envSuite = (process.env.SUITE || '').toLowerCase()
  if (envSuite && SUITES[envSuite]) {
    info(`Suite from env: ${envSuite}`)
    return SUITES[envSuite]
  }

  log(`\n${C.bold}Select a test suite:${C.reset}\n`)
  const keys = Object.keys(SUITES)
  keys.forEach((key, i) => {
    log(`  ${C.cyan}${i + 1}${C.reset}. ${SUITES[key].label}`)
  })
  log(`\n  ${C.dim}(or press Enter for full regression)${C.reset}`)

  const answer = await ask('\nSuite number: ')
  const idx    = parseInt(answer, 10)

  if (!answer || isNaN(idx) || idx < 1 || idx > keys.length) {
    info('Defaulting to full regression')
    return SUITES.regression
  }

  return SUITES[keys[idx - 1]]
}

// ── Run options ───────────────────────────────────────────────────────────────

async function selectOptions() {
  const headedEnv = process.env.HEADED
  if (headedEnv !== undefined) return headedEnv === '1' || headedEnv === 'true'
  const ans = await ask('Run headed (visible browser)? [y/N]: ')
  return ans.toLowerCase() === 'y'
}

// ── Cypress runner ────────────────────────────────────────────────────────────

function runCypress({ suite, token, headed }) {
  return new Promise((resolve) => {
    const reportSubDir = path.join(REPORT_DIR, suite.report)
    fs.mkdirSync(reportSubDir, { recursive: true })

    const args = [
      'cypress', 'run',
      '--browser', 'chrome',
      '--reporter', 'mochawesome',
      '--reporter-options', `reportDir=${reportSubDir},overwrite=false,html=false,json=true`,
    ]

    if (suite.spec)  args.push('--spec', suite.spec)
    if (headed)      args.push('--headed')

    const env = {
      ...process.env,
      FORMULARMS_TOKEN: token,
      OTP_CODE:         'skip',    // prevents loginViaApi from throwing when token path is used
      ELECTRON_RUN_AS_NODE: undefined,
    }
    // Remove the key entirely so Cypress Electron binary is not broken
    delete env.ELECTRON_RUN_AS_NODE

    info(`Starting Cypress → suite: ${suite.label}`)
    info(`Report dir: ${reportSubDir}`)
    hr()

    const proc = spawn('npx', args, {
      stdio: 'inherit',
      env,
      shell: false,
    })

    proc.on('close', code => {
      hr()
      resolve({ exitCode: code, reportDir: reportSubDir })
    })
  })
}

// ── Parse mochawesome results ─────────────────────────────────────────────────

const SPEC_COUNT = 34  // number of spec files — always read only the latest batch

function parseResults(reportDir) {
  let pass = 0, fail = 0, pending = 0
  const failed = []

  try {
    // Sort numerically and take the last SPEC_COUNT files so multiple runs don't mix
    const files = fs.readdirSync(reportDir)
      .filter(f => f.match(/^mochawesome_\d+\.json$/))
      .sort()
      .slice(-SPEC_COUNT)

    function walk(suites) {
      if (!suites) return
      for (const suite of suites) {
        for (const t of (suite.tests || [])) {
          if (t.fail) {
            failed.push({
              name:  (t.fullTitle || t.title || '').slice(0, 120),
              error: (t.err && t.err.message) ? t.err.message.slice(0, 120) : '',
            })
          }
        }
        walk(suite.suites)
      }
    }

    for (const file of files) {
      const raw   = JSON.parse(fs.readFileSync(path.join(reportDir, file)))
      const stats = raw.stats || {}
      pass    += stats.passes   || 0
      fail    += stats.failures || 0
      pending += stats.pending  || 0
      ;(raw.results || []).forEach(r => walk(r.suites))
    }
  } catch (e) {
    warn(`Could not parse results: ${e.message}`)
  }

  return { pass, fail, pending, failed }
}

// ── Generate PDF report ───────────────────────────────────────────────────────

function generateReport() {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(__dirname, 'generate-regression-report.js')
    const proc = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    })
    proc.on('close', (code) => {
      if (code === 0) {
        ok(`PDF report → cypress/reports/regression-report-${TODAY}.pdf`)
      } else {
        warn(`PDF script exited with code ${code}`)
      }
      resolve(code === 0)
    })
  })
}

// ── Print final summary ───────────────────────────────────────────────────────

function printSummary(suite, stats, exitCode) {
  hr()
  title('AUTOMATION COMPLETE')

  const total    = stats.pass + stats.fail + stats.pending
  const passRate = stats.pass + stats.fail > 0
    ? Math.round((stats.pass / (stats.pass + stats.fail)) * 100) : 0

  log(`  Suite      : ${C.bold}${suite.label}${C.reset}`)
  log(`  Date       : ${TODAY}`)
  log(`  Total      : ${total}`)
  log(`  ${C.green}Passed     : ${stats.pass}${C.reset}`)
  log(`  ${stats.fail > 0 ? C.red : C.green}Failed     : ${stats.fail}${C.reset}`)
  log(`  ${C.yellow}Pending    : ${stats.pending}${C.reset}`)
  log(`  Pass Rate  : ${passRate >= 80 ? C.green : passRate >= 60 ? C.yellow : C.red}${passRate}%${C.reset}`)
  hr()

  if (stats.fail > 0) {
    log(`\n${C.bold}${C.red}  Failed Tests:${C.reset}`)
    stats.failed.slice(0, 20).forEach((f, i) => {
      log(`  ${C.red}${i + 1}.${C.reset} ${f.name}`)
      log(`     ${C.dim}${f.error}${C.reset}`)
    })
    if (stats.failed.length > 20) {
      warn(`  ...and ${stats.failed.length - 20} more failures (see PDF report)`)
    }
  } else {
    ok('All tests passed!')
  }

  hr()

  const overallResult = exitCode === 0 ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`
  log(`\n  Overall: ${overallResult}  (exit code ${exitCode})\n`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

;(async () => {
  title('Formula RMS – Automation Runner')

  let token, suite, headed

  // Step 1: Authenticate
  log(`${C.bold}Step 1 / 4  –  Authentication${C.reset}`)
  token = await getToken()
  process.env.FORMULARMS_TOKEN = token
  hr()

  // Step 2: Select suite
  log(`${C.bold}Step 2 / 4  –  Suite Selection${C.reset}`)
  suite = await selectSuite()
  hr()

  // Step 3: Display options
  log(`${C.bold}Step 3 / 4  –  Run Options${C.reset}`)
  headed = await selectOptions()
  hr()

  // Step 4: Run
  log(`${C.bold}Step 4 / 4  –  Running Tests${C.reset}`)
  const { exitCode, reportDir } = await runCypress({ suite, token, headed })

  // Parse results
  const stats = parseResults(reportDir)

  // Generate PDF
  info('Generating PDF report...')
  await generateReport()

  // Print summary
  printSummary(suite, stats, exitCode)

  process.exit(exitCode)
})()
