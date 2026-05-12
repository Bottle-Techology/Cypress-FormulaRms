/**
 * Add options to the 20 customization groups created via add-customization-groups script.
 * Uses PATCH /menu/customization-groups/:id/ with an options array.
 * Usage: OTP_CODE=<code> node scripts/add-customization-options.js
 */

const https = require('https');
const AUTH_BASE  = 'https://formularms-api.bottle.com.np';
const API_BASE   = AUTH_BASE + '/api/v1';
const IDENTIFIER = 'pranuj@bottle.com.np';
const OTP_CODE   = process.env.OTP_CODE;

async function req(method, url, body, token) {
  return new Promise((res, rej) => {
    const b = body ? JSON.stringify(body) : null;
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': b ? Buffer.byteLength(b) : 0,
        ...(token && { Authorization: 'Bearer ' + token }),
      },
    };
    const r = https.request(opts, resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => res({ status: resp.statusCode, body: d }));
    });
    r.on('error', rej);
    if (b) r.write(b);
    r.end();
  });
}

const OPTIONS_MAP = {
  'Spice Level':          [
    { name: 'Mild',        price_adjustment: '0.00',   is_active: true },
    { name: 'Medium',      price_adjustment: '0.00',   is_active: true },
    { name: 'Hot',         price_adjustment: '0.00',   is_active: true },
    { name: 'Extra Hot',   price_adjustment: '0.00',   is_active: true },
  ],
  'Cooking Style':        [
    { name: 'Steamed',     price_adjustment: '0.00',   is_active: true },
    { name: 'Fried',       price_adjustment: '20.00',  is_active: true },
    { name: 'Grilled',     price_adjustment: '30.00',  is_active: true },
    { name: 'Baked',       price_adjustment: '20.00',  is_active: true },
  ],
  'Portion Size':         [
    { name: 'Half',        price_adjustment: '-50.00', is_active: true },
    { name: 'Full',        price_adjustment: '0.00',   is_active: true },
    { name: 'Large',       price_adjustment: '80.00',  is_active: true },
  ],
  'Sauce Choice':         [
    { name: 'Tomato Sauce',  price_adjustment: '0.00',  is_active: true },
    { name: 'Mint Chutney',  price_adjustment: '0.00',  is_active: true },
    { name: 'Garlic Mayo',   price_adjustment: '20.00', is_active: true },
    { name: 'BBQ Sauce',     price_adjustment: '20.00', is_active: true },
    { name: 'Cheese Dip',    price_adjustment: '30.00', is_active: true },
  ],
  'Extra Toppings':       [
    { name: 'Onions',      price_adjustment: '20.00', is_active: true },
    { name: 'Tomatoes',    price_adjustment: '20.00', is_active: true },
    { name: 'Jalapeños',   price_adjustment: '30.00', is_active: true },
    { name: 'Olives',      price_adjustment: '30.00', is_active: true },
    { name: 'Mushrooms',   price_adjustment: '40.00', is_active: true },
  ],
  'Cheese Options':       [
    { name: 'No Cheese',       price_adjustment: '0.00',   is_active: true },
    { name: 'Regular Cheese',  price_adjustment: '50.00',  is_active: true },
    { name: 'Extra Cheese',    price_adjustment: '100.00', is_active: true },
    { name: 'Mozzarella',      price_adjustment: '120.00', is_active: true },
  ],
  'Bread Choice':         [
    { name: 'Regular Bun',  price_adjustment: '0.00',  is_active: true },
    { name: 'Whole Wheat',  price_adjustment: '20.00', is_active: true },
    { name: 'Gluten Free',  price_adjustment: '60.00', is_active: true },
    { name: 'Naan',         price_adjustment: '30.00', is_active: true },
  ],
  'Protein Add-on':       [
    { name: 'Egg',     price_adjustment: '40.00', is_active: true },
    { name: 'Chicken', price_adjustment: '80.00', is_active: true },
    { name: 'Paneer',  price_adjustment: '70.00', is_active: true },
    { name: 'Tofu',    price_adjustment: '60.00', is_active: true },
  ],
  'Rice Choice':          [
    { name: 'Steamed Rice',  price_adjustment: '0.00',  is_active: true },
    { name: 'Fried Rice',    price_adjustment: '50.00', is_active: true },
    { name: 'Jeera Rice',    price_adjustment: '40.00', is_active: true },
    { name: 'Coconut Rice',  price_adjustment: '60.00', is_active: true },
  ],
  'Side Dish':            [
    { name: 'Salad',     price_adjustment: '60.00', is_active: true },
    { name: 'Fries',     price_adjustment: '80.00', is_active: true },
    { name: 'Coleslaw',  price_adjustment: '50.00', is_active: true },
    { name: 'Soup',      price_adjustment: '90.00', is_active: true },
  ],
  'Beverage Temperature': [
    { name: 'Hot',   price_adjustment: '0.00',  is_active: true },
    { name: 'Cold',  price_adjustment: '0.00',  is_active: true },
    { name: 'Iced',  price_adjustment: '20.00', is_active: true },
  ],
  'Sugar Level':          [
    { name: 'No Sugar',     price_adjustment: '0.00', is_active: true },
    { name: 'Less Sugar',   price_adjustment: '0.00', is_active: true },
    { name: 'Normal',       price_adjustment: '0.00', is_active: true },
    { name: 'Extra Sweet',  price_adjustment: '0.00', is_active: true },
  ],
  'Ice Preference':       [
    { name: 'No Ice',       price_adjustment: '0.00', is_active: true },
    { name: 'Less Ice',     price_adjustment: '0.00', is_active: true },
    { name: 'Regular Ice',  price_adjustment: '0.00', is_active: true },
    { name: 'Extra Ice',    price_adjustment: '0.00', is_active: true },
  ],
  'Noodle Type':          [
    { name: 'Egg Noodle',   price_adjustment: '0.00',  is_active: true },
    { name: 'Rice Noodle',  price_adjustment: '0.00',  is_active: true },
    { name: 'Glass Noodle', price_adjustment: '10.00', is_active: true },
    { name: 'Udon',         price_adjustment: '20.00', is_active: true },
  ],
  'Dressing Choice':      [
    { name: 'No Dressing',    price_adjustment: '0.00',  is_active: true },
    { name: 'Italian',        price_adjustment: '20.00', is_active: true },
    { name: 'Caesar',         price_adjustment: '20.00', is_active: true },
    { name: 'Honey Mustard',  price_adjustment: '20.00', is_active: true },
  ],
  'Meat Doneness':        [
    { name: 'Rare',         price_adjustment: '0.00', is_active: true },
    { name: 'Medium Rare',  price_adjustment: '0.00', is_active: true },
    { name: 'Medium',       price_adjustment: '0.00', is_active: true },
    { name: 'Well Done',    price_adjustment: '0.00', is_active: true },
  ],
  'Vegetable Extras':     [
    { name: 'Spinach',      price_adjustment: '30.00', is_active: true },
    { name: 'Broccoli',     price_adjustment: '30.00', is_active: true },
    { name: 'Bell Pepper',  price_adjustment: '25.00', is_active: true },
    { name: 'Corn',         price_adjustment: '25.00', is_active: true },
    { name: 'Baby Corn',    price_adjustment: '30.00', is_active: true },
  ],
  'Shell Type':           [
    { name: 'Soft Tortilla',  price_adjustment: '0.00', is_active: true },
    { name: 'Crispy Shell',   price_adjustment: '0.00', is_active: true },
    { name: 'Lettuce Wrap',   price_adjustment: '0.00', is_active: true },
  ],
  'Allergies & Dietary':  [
    { name: 'Vegan',        price_adjustment: '0.00',  is_active: true },
    { name: 'Gluten Free',  price_adjustment: '50.00', is_active: true },
    { name: 'Nut Free',     price_adjustment: '0.00',  is_active: true },
    { name: 'Dairy Free',   price_adjustment: '0.00',  is_active: true },
  ],
  'Special Instructions': [
    { name: 'Less Oil',      price_adjustment: '0.00', is_active: true },
    { name: 'Less Salt',     price_adjustment: '0.00', is_active: true },
    { name: 'Extra Crispy',  price_adjustment: '0.00', is_active: true },
    { name: 'No Garlic',     price_adjustment: '0.00', is_active: true },
  ],
};

async function main() {
  if (!OTP_CODE) { console.error('Usage: OTP_CODE=<code> node scripts/add-customization-options.js'); process.exit(1); }

  const authRes = await req('POST', AUTH_BASE + '/auth/login/verify-otp/',
    { identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE) });
  const { access } = JSON.parse(authRes.body);
  if (!access) { console.error('Auth failed:', authRes.body); process.exit(1); }
  console.log('Authenticated OK\n');

  const gr = await req('GET', API_BASE + '/menu/customization-groups/', null, access);
  const raw = JSON.parse(gr.body);
  const groups = Array.isArray(raw) ? raw : raw.results || [];
  console.log(`Fetched ${groups.length} customization groups\n`);

  let updated = 0, skipped = 0;
  for (const g of groups) {
    const opts = OPTIONS_MAP[g.name];
    if (!opts) { console.log(`  — skip (no map): ${g.name}`); skipped++; continue; }
    if (g.option_count > 0) {
      console.log(`  ✓ already has options: ${g.name} (${g.option_count})`);
      updated++; continue;
    }
    const r = await req('PATCH', `${API_BASE}/menu/customization-groups/${g.id}/`,
      { options: opts }, access);
    if (r.status === 200) {
      const saved = JSON.parse(r.body).options?.length ?? '?';
      console.log(`  ✓ ${g.name} — ${saved} options added`);
      updated++;
    } else {
      console.log(`  ✗ FAIL ${g.name} — ${r.status} ${r.body.slice(0, 120)}`);
    }
  }
  console.log(`\nResult: ${updated} groups with options, ${skipped} skipped.`);
}

main().catch(err => { console.error(err); process.exit(1); });
