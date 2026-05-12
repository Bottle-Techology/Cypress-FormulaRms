/**
 * Populate 20 takeaway orders in Formula RMS
 * Usage: OTP_CODE=<code> node scripts/populate-takeaway-orders.js
 */

const AUTH_BASE = 'https://formularms-api.bottle.com.np'
const API_BASE  = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

const CUSTOMERS = [
  { name: 'Aarav Sharma',     phone: '9841001001', note: 'Extra spicy please'              },
  { name: 'Binita Thapa',     phone: '9841002002', note: 'Less oil, pack neatly'           },
  { name: 'Chiranjivi Rai',   phone: '9841003003', note: 'No onion, no garlic'             },
  { name: 'Deepa Karki',      phone: '9841004004', note: 'Extra sauce on the side'         },
  { name: 'Eshan Poudel',     phone: '9841005005', note: 'Urgent — picking up in 10 min'   },
  { name: 'Farhana Begum',    phone: '9841006006', note: 'Vegetarian only, no MSG'         },
  { name: 'Ganesh Lama',      phone: '9841007007', note: 'Double portion rice'             },
  { name: 'Hira Magar',       phone: '9841008008', note: 'Birthday order — pack nicely'    },
  { name: 'Indira Basnet',    phone: '9841009009', note: 'Nut allergy — be careful'        },
  { name: 'Jivan Shrestha',   phone: '9841010010', note: 'Call on arrival'                 },
  { name: 'Kavita Gurung',    phone: '9841011011', note: 'Medium spice, extra napkins'     },
  { name: 'Lokraj Tamang',    phone: '9841012012', note: 'No chilli at all'                },
  { name: 'Manisha Adhikari', phone: '9841013013', note: 'Party order — 5 people'          },
  { name: 'Nabin Khatri',     phone: '9841014014', note: 'Pack items separately'           },
  { name: 'Ojha Devkota',     phone: '9841015015', note: 'Less salt please'                },
  { name: 'Pratima Subedi',   phone: '9841016016', note: 'Extra chilli on side'            },
  { name: 'Rajeev Bhandari',  phone: '9841017017', note: 'Sweet less in dessert'           },
  { name: 'Sarita Pandey',    phone: '9841018018', note: 'Well done, no pink'              },
  { name: 'Tikaram Koirala',  phone: '9841019019', note: 'Gluten free if possible'         },
  { name: 'Uma Dhakal',       phone: '9841020020', note: 'Extra gravy on side'             },
]

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

async function main() {
  if (!OTP_CODE) {
    console.error('Usage: OTP_CODE=<code> node scripts/populate-takeaway-orders.js')
    process.exit(1)
  }

  // Authenticate
  console.log('Authenticating...')
  const authRes = await req('POST', AUTH_BASE + '/auth/login/verify-otp/', {
    identifier: IDENTIFIER, method: 'email', code: OTP_CODE
  })
  if (!authRes.data?.access) {
    console.error('Auth failed:', JSON.stringify(authRes.data))
    process.exit(1)
  }
  const token = authRes.data.access
  console.log('✓ Authenticated\n')

  // Create 20 takeaway orders
  console.log('Creating 20 takeaway orders...\n')
  const created = []
  const failed  = []

  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i]
    const r = await req('POST', API_BASE + '/orders/', {
      type: 'takeaway',
      customer_name: c.name,
      customer_phone: c.phone,
      notes: c.note,
    }, token)

    if (r.status === 201) {
      console.log(`  ✓  #${String(r.data.order_number).padEnd(3)}  ${c.name.padEnd(22)}  ${c.phone}  —  ${c.note}`)
      created.push({ order_number: r.data.order_number, id: r.data.id, customer: c.name })
    } else {
      console.log(`  ✗  FAILED for ${c.name} — status ${r.status}: ${JSON.stringify(r.data)}`)
      failed.push(c.name)
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`  ${created.length}/20 takeaway orders created successfully`)
  if (failed.length) console.log(`  Failed: ${failed.join(', ')}`)
  console.log('═'.repeat(60))
}

main().catch(err => { console.error(err); process.exit(1) })
