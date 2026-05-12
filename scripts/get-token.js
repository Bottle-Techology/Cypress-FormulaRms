/**
 * Get a Bearer token via OTP login and save it to /tmp/formularms-token.txt
 * Usage: OTP_CODE=<code> node scripts/get-token.js
 */

const https = require('https')
const fs    = require('fs')

const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

if (!OTP_CODE) {
  console.error('Usage: OTP_CODE=<code> node scripts/get-token.js')
  process.exit(1)
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const opts = {
      hostname: 'formularms-api.bottle.com.np',
      path,
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent':    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    }
    const req = https.request(opts, (res) => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => resolve({ status: res.statusCode, body: raw }))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

;(async () => {
  console.log('Verifying OTP...')
  const res = await post('/auth/login/verify-otp/', {
    identifier: IDENTIFIER,
    method: 'email',
    code: String(OTP_CODE),
  })

  if (res.status !== 200) {
    console.error(`OTP verify failed [${res.status}]: ${res.body}`)
    process.exit(1)
  }

  const token = JSON.parse(res.body).access
  if (!token) {
    console.error('No access token in response:', res.body)
    process.exit(1)
  }

  const outFile = '/tmp/formularms-token.txt'
  fs.writeFileSync(outFile, token, 'utf8')
  console.log(`✅  Token saved to ${outFile} (${token.length} chars)`)
})()
