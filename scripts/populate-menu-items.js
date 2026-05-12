/**
 * Add 100 new menu items with images and category assignments.
 * Skips any item whose name already exists (case-insensitive).
 * Usage: OTP_CODE=<code> node scripts/populate-menu-items.js
 */

const AUTH_BASE  = 'https://formularms-api.bottle.com.np'
const API_BASE   = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

// ── Category name → ID  (fetched from /menu/categories/ at runtime) ──────────
// Populated dynamically in main()
const CAT = {}

// ── 100 new items ─────────────────────────────────────────────────────────────
// [ name, base_price, food_type, [category names], image_keywords ]
const NEW_ITEMS = [
  // ── Momo & Dumplings ──
  ['Veg Momo',                    '200.00', 'veg',     ['Momo & Dumplings', 'Steamed Dishes'],     'steamed,dumpling,vegetable'],
  ['Buff Momo',                   '260.00', 'non_veg', ['Momo & Dumplings'],                       'momo,buffalo,dumpling'],
  ['Pork Momo',                   '280.00', 'non_veg', ['Momo & Dumplings'],                       'pork,dumpling,steamed'],
  ['Tandoori Momo',               '320.00', 'non_veg', ['Momo & Dumplings', 'BBQ & Grills'],       'tandoori,momo,grilled'],
  ['Chilli Momo',                 '300.00', 'non_veg', ['Momo & Dumplings'],                       'chilli,dumpling,spicy'],
  ['Open Momo',                   '290.00', 'non_veg', ['Momo & Dumplings'],                       'open,dumpling,momo'],

  // ── Nepali Classics ──
  ['Sel Roti',                    '150.00', 'veg',     ['Nepali Classics', 'Snacks & Finger Food'], 'sel-roti,nepali,fried-bread'],
  ['Aloo Tama',                   '220.00', 'veg',     ['Nepali Classics', 'Vegetarian Mains'],     'potato,bamboo,nepali-curry'],
  ['Gundruk Soup',                '180.00', 'veg',     ['Nepali Classics', 'Soups'],                'gundruk,soup,nepali'],
  ['Chatamari',                   '250.00', 'veg',     ['Nepali Classics', 'Snacks & Finger Food'], 'chatamari,rice-crepe,nepali'],
  ['Kwati Soup',                  '200.00', 'veg',     ['Nepali Classics', 'Soups'],                'bean,soup,nepali'],
  ['Sukuti Sadeko',               '350.00', 'non_veg', ['Nepali Classics'],                         'sukuti,dried-meat,nepali'],
  ['Buff Chhoyla',                '380.00', 'non_veg', ['Nepali Classics', 'Appetizers'],           'chhoyla,buff,spicy'],
  ['Yomari',                      '200.00', 'veg',     ['Nepali Classics', 'Desserts'],             'yomari,rice,sweet'],

  // ── Indian Curries ──
  ['Paneer Butter Masala',        '350.00', 'veg',     ['Indian Curries', 'Vegetarian Mains'],     'paneer,butter,masala'],
  ['Chicken Tikka Masala',        '420.00', 'non_veg', ['Indian Curries', 'Chicken Dishes'],       'chicken,tikka,masala'],
  ['Saag Paneer',                 '330.00', 'veg',     ['Indian Curries', 'Vegetarian Mains'],     'saag,paneer,spinach'],
  ['Aloo Gobi',                   '280.00', 'veg',     ['Indian Curries', 'Vegetarian Mains'],     'aloo,gobi,curry'],
  ['Dal Makhani',                 '290.00', 'veg',     ['Indian Curries', 'Vegetarian Mains'],     'dal,makhani,lentil'],
  ['Chole Masala',                '280.00', 'veg',     ['Indian Curries', 'Vegetarian Mains'],     'chole,chickpea,masala'],
  ['Fish Curry',                  '450.00', 'non_veg', ['Indian Curries', 'Seafood'],              'fish,curry,indian'],
  ['Prawn Masala',                '520.00', 'non_veg', ['Indian Curries', 'Seafood'],              'prawn,masala,curry'],
  ['Vegetable Korma',             '320.00', 'veg',     ['Indian Curries', 'Vegetarian Mains'],     'vegetable,korma,curry'],

  // ── Breads & Toasts ──
  ['Garlic Naan',                 '120.00', 'veg',     ['Breads & Toasts'],                        'garlic,naan,bread'],
  ['Butter Naan',                 '100.00', 'veg',     ['Breads & Toasts'],                        'butter,naan,flatbread'],
  ['Keema Naan',                  '180.00', 'non_veg', ['Breads & Toasts'],                        'keema,naan,minced-meat'],
  ['Tandoori Roti',               '80.00',  'veg',     ['Breads & Toasts'],                        'tandoori,roti,bread'],

  // ── Rice & Biryani ──
  ['Vegetable Biryani',           '380.00', 'veg',     ['Rice & Biryani', 'Vegetarian Mains'],     'vegetable,biryani,rice'],
  ['Lamb Biryani',                '520.00', 'non_veg', ['Rice & Biryani', 'Beef & Lamb'],          'lamb,biryani,rice'],
  ['Prawn Biryani',               '560.00', 'non_veg', ['Rice & Biryani', 'Seafood'],              'prawn,biryani,seafood'],
  ['Jeera Rice',                  '200.00', 'veg',     ['Rice & Biryani', 'Side Dishes'],          'jeera,rice,cumin'],
  ['Coconut Rice',                '220.00', 'veg',     ['Rice & Biryani', 'Side Dishes'],          'coconut,rice,thai'],

  // ── Pizza ──
  ['Veggie Supreme Pizza',        '480.00', 'veg',     ['Pizza', 'Vegetarian Mains'],              'veggie,pizza,supreme'],
  ['Mushroom & Truffle Pizza',    '550.00', 'veg',     ['Pizza', 'Vegetarian Mains'],              'mushroom,truffle,pizza'],
  ['Chicken BBQ Pizza',           '520.00', 'non_veg', ['Pizza', 'Chicken Dishes'],                'chicken,bbq,pizza'],
  ['Hawaiian Pizza',              '500.00', 'non_veg', ['Pizza'],                                  'hawaiian,pizza,pineapple'],
  ['Meat Lovers Pizza',           '580.00', 'non_veg', ['Pizza'],                                  'meat,pizza,toppings'],

  // ── Burgers ──
  ['Mushroom Swiss Burger',       '380.00', 'veg',     ['Burgers', 'Vegetarian Mains'],            'mushroom,burger,swiss'],
  ['Double Cheeseburger',         '450.00', 'non_veg', ['Burgers', 'American Classics'],          'double,cheeseburger,beef'],
  ['Spicy Chicken Burger',        '400.00', 'non_veg', ['Burgers', 'Chicken Dishes'],              'spicy,chicken,burger'],
  ['Fish Burger',                 '420.00', 'non_veg', ['Burgers', 'Seafood'],                     'fish,burger,seafood'],

  // ── Pasta ──
  ['Mushroom Risotto',            '420.00', 'veg',     ['Pasta', 'Vegetarian Mains'],              'mushroom,risotto,italian'],
  ['Pesto Pasta',                 '380.00', 'veg',     ['Pasta', 'Vegetarian Mains'],              'pesto,pasta,basil'],
  ['Mac and Cheese',              '350.00', 'veg',     ['Pasta', 'American Classics'],             'mac,cheese,pasta'],
  ['Prawn Linguine',              '480.00', 'non_veg', ['Pasta', 'Seafood'],                       'prawn,linguine,seafood'],
  ['Lasagna',                     '450.00', 'non_veg', ['Pasta'],                                  'lasagna,pasta,baked'],

  // ── Noodles & Stir Fry ──
  ['Tom Yum Noodles',             '320.00', 'non_veg', ['Noodles & Stir Fry', 'Thai Cuisine'],     'tom-yum,noodles,thai'],
  ['Singapore Noodles',           '350.00', 'non_veg', ['Noodles & Stir Fry', 'Chinese Dishes'],   'singapore,noodles,stir-fry'],
  ['Dan Dan Noodles',             '340.00', 'non_veg', ['Noodles & Stir Fry', 'Chinese Dishes'],   'dan-dan,noodles,spicy'],
  ['Udon Noodles',                '300.00', 'veg',     ['Noodles & Stir Fry', 'Japanese Dishes'],  'udon,noodles,japanese'],
  ['Veg Thukpa',                  '250.00', 'veg',     ['Noodles & Stir Fry', 'Nepali Classics'],  'thukpa,noodle-soup,veg'],

  // ── Seafood ──
  ['Calamari Rings',              '420.00', 'non_veg', ['Seafood', 'Appetizers', 'Fried Snacks'],  'calamari,squid,fried'],
  ['Tuna Steak',                  '580.00', 'non_veg', ['Seafood'],                                'tuna,steak,grilled'],
  ['Prawn Tempura',               '450.00', 'non_veg', ['Seafood', 'Japanese Dishes'],             'prawn,tempura,japanese'],
  ['Crab Cakes',                  '550.00', 'non_veg', ['Seafood', 'Appetizers'],                  'crab,cakes,seafood'],
  ['Fish Tikka',                  '480.00', 'non_veg', ['Seafood', 'BBQ & Grills'],                'fish,tikka,grilled'],

  // ── Salads ──
  ['Caprese Salad',               '280.00', 'veg',     ['Salads', 'Mediterranean'],               'caprese,tomato,mozzarella'],
  ['Nicoise Salad',               '350.00', 'non_veg', ['Salads'],                                 'nicoise,tuna,salad'],
  ['Waldorf Salad',               '300.00', 'veg',     ['Salads'],                                 'waldorf,apple,salad'],
  ['Watermelon Feta Salad',       '290.00', 'veg',     ['Salads', 'Vegan Specials'],               'watermelon,feta,salad'],

  // ── Soups ──
  ['Minestrone Soup',             '220.00', 'veg',     ['Soups', 'Vegetarian Mains'],              'minestrone,soup,italian'],
  ['French Onion Soup',           '240.00', 'veg',     ['Soups'],                                  'french-onion,soup,cheese'],
  ['Lentil Soup',                 '200.00', 'veg',     ['Soups', 'Vegan Specials'],                'lentil,soup,healthy'],
  ['Pumpkin Soup',                '220.00', 'veg',     ['Soups', 'Vegan Specials'],                'pumpkin,soup,creamy'],

  // ── Breakfast ──
  ['Acai Bowl',                   '350.00', 'veg',     ['Breakfast Mains', 'Vegan Specials'],      'acai,bowl,breakfast'],
  ['Granola Bowl',                '300.00', 'veg',     ['Breakfast Mains'],                        'granola,bowl,yogurt'],
  ['Veggie Omelette',             '280.00', 'veg',     ['Breakfast Mains', 'Eggs & Omelettes'],   'omelette,vegetable,egg'],
  ['Ham & Cheese Omelette',       '320.00', 'non_veg', ['Eggs & Omelettes'],                       'ham,cheese,omelette'],
  ['Spanish Omelette',            '300.00', 'veg',     ['Eggs & Omelettes', 'Mediterranean'],      'spanish,omelette,tortilla'],

  // ── Coffee ──
  ['Americano',                   '180.00', 'veg',     ['Coffee & Espresso'],                      'americano,coffee,black'],
  ['Latte',                       '200.00', 'veg',     ['Coffee & Espresso'],                      'latte,coffee,milk'],
  ['Mocha',                       '220.00', 'veg',     ['Coffee & Espresso'],                      'mocha,coffee,chocolate'],
  ['Affogato',                    '280.00', 'veg',     ['Coffee & Espresso', 'Desserts'],           'affogato,espresso,ice-cream'],

  // ── Tea ──
  ['Earl Grey Tea',               '160.00', 'veg',     ['Tea & Herbal Drinks'],                    'earl-grey,tea,cup'],
  ['Peppermint Tea',              '150.00', 'veg',     ['Tea & Herbal Drinks'],                    'peppermint,tea,herbal'],
  ['Hibiscus Tea',                '170.00', 'veg',     ['Tea & Herbal Drinks'],                    'hibiscus,tea,pink'],

  // ── Smoothies & Shakes ──
  ['Mango Shake',                 '220.00', 'veg',     ['Smoothies & Shakes'],                     'mango,shake,smoothie'],
  ['Oreo Milkshake',              '250.00', 'veg',     ['Smoothies & Shakes'],                     'oreo,milkshake,chocolate'],
  ['Banana Milkshake',            '200.00', 'veg',     ['Smoothies & Shakes'],                     'banana,milkshake,creamy'],

  // ── Fresh Juices ──
  ['Pineapple Juice',             '180.00', 'veg',     ['Fresh Juices'],                           'pineapple,juice,tropical'],
  ['Pomegranate Juice',           '200.00', 'veg',     ['Fresh Juices'],                           'pomegranate,juice,red'],
  ['Carrot Ginger Juice',         '190.00', 'veg',     ['Fresh Juices'],                           'carrot,ginger,juice'],

  // ── Mocktails ──
  ['Strawberry Lemonade',         '220.00', 'veg',     ['Mocktails', 'Soft Drinks'],               'strawberry,lemonade,pink'],
  ['Pink Lemonade',               '200.00', 'veg',     ['Mocktails', 'Soft Drinks'],               'pink,lemonade,drink'],
  ['Lychee Cooler',               '240.00', 'veg',     ['Mocktails'],                              'lychee,cooler,mocktail'],

  // ── Desserts ──
  ['Gulab Jamun',                 '180.00', 'veg',     ['Desserts'],                               'gulab-jamun,indian,sweet'],
  ['Kheer',                       '160.00', 'veg',     ['Desserts'],                               'kheer,rice-pudding,indian'],
  ['Warm Brownie with Ice Cream', '280.00', 'veg',     ['Desserts'],                               'brownie,ice-cream,warm'],
  ['New York Cheesecake',         '320.00', 'veg',     ['Desserts', 'Cakes & Pastries'],           'cheesecake,new-york,dessert'],
  ['Fruit Tart',                  '290.00', 'veg',     ['Desserts', 'Cakes & Pastries'],           'fruit,tart,pastry'],

  // ── Ice Cream & Gelato ──
  ['Kulfi',                       '180.00', 'veg',     ['Ice Cream & Gelato', 'Desserts'],         'kulfi,indian,ice-cream'],
  ['Chocolate Gelato',            '220.00', 'veg',     ['Ice Cream & Gelato', 'Desserts'],         'chocolate,gelato,italian'],

  // ── Cakes & Pastries ──
  ['Red Velvet Cake',             '320.00', 'veg',     ['Cakes & Pastries', 'Desserts'],           'red-velvet,cake,cream'],
  ['Croissant',                   '200.00', 'veg',     ['Cakes & Pastries', 'Breakfast Mains'],    'croissant,pastry,french'],

  // ── Sandwiches ──
  ['Club Sandwich',               '380.00', 'non_veg', ['Sandwiches'],                             'club,sandwich,layers'],
  ['BLT Sandwich',                '350.00', 'non_veg', ['Sandwiches'],                             'blt,sandwich,bacon'],
  ['Grilled Cheese Sandwich',     '280.00', 'veg',     ['Sandwiches', 'Vegetarian Mains'],         'grilled-cheese,sandwich,toasted'],

  // ── Mexican ──
  ['Beef Tacos',                  '380.00', 'non_veg', ['Mexican Corner'],                         'beef,tacos,mexican'],
  ['Chicken Quesadilla',          '350.00', 'non_veg', ['Mexican Corner', 'Chicken Dishes'],       'chicken,quesadilla,mexican'],
  ['Nachos with Guacamole',       '320.00', 'veg',     ['Mexican Corner', 'Snacks & Finger Food'], 'nachos,guacamole,mexican'],

  // ── Thai ──
  ['Green Curry',                 '380.00', 'veg',     ['Thai Cuisine', 'Vegetarian Mains'],       'green-curry,thai,coconut'],
  ['Thai Basil Chicken',          '420.00', 'non_veg', ['Thai Cuisine', 'Chicken Dishes'],         'thai-basil,chicken,stir-fry'],

  // ── Japanese ──
  ['Chicken Teriyaki',            '420.00', 'non_veg', ['Japanese Dishes', 'Chicken Dishes'],      'chicken,teriyaki,japanese'],
  ['Miso Soup',                   '180.00', 'veg',     ['Japanese Dishes', 'Soups'],               'miso,soup,japanese'],
  ['Gyoza',                       '280.00', 'non_veg', ['Japanese Dishes', 'Appetizers'],          'gyoza,dumpling,japanese'],
  ['Edamame',                     '180.00', 'veg',     ['Japanese Dishes', 'Snacks & Finger Food'],'edamame,soybean,japanese'],

  // ── Snacks ──
  ['Mozzarella Sticks',           '280.00', 'veg',     ['Snacks & Finger Food', 'Appetizers'],     'mozzarella,sticks,fried'],
  ['Potato Wedges',               '200.00', 'veg',     ['Snacks & Finger Food', 'Side Dishes'],    'potato,wedges,crispy'],
  ['Chicken Satay',               '320.00', 'non_veg', ['Snacks & Finger Food', 'BBQ & Grills'],   'chicken,satay,skewer'],
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function nameSeed(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  return Math.abs(h) % 9000 + 1000
}

function getImageUrl(keywords, name) {
  return `https://loremflickr.com/400/300/${keywords}?lock=${nameSeed(name)}`
}

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct  = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!OTP_CODE) {
    console.error('Usage: OTP_CODE=<code> node scripts/populate-menu-items.js')
    process.exit(1)
  }

  // Authenticate
  console.log('Authenticating...')
  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/', {
    identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE),
  })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('✓ Authenticated\n')

  // Fetch categories → build name→id map
  console.log('Fetching categories...')
  const catRes = await req('GET', API_BASE + '/menu/categories/?limit=200', null, token)
  const catList = Array.isArray(catRes.data) ? catRes.data : (catRes.data?.results || [])
  catList.forEach(c => { CAT[c.name] = c.id })
  console.log(`✓ ${catList.length} categories loaded\n`)

  // Fetch existing items → build dedup set
  console.log('Fetching existing items...')
  let url = API_BASE + '/menu/items/?limit=200'
  const existingNames = new Set()
  while (url) {
    const r = await req('GET', url, null, token)
    const items = Array.isArray(r.data) ? r.data : (r.data?.results || [])
    items.forEach(i => existingNames.add(i.name.toLowerCase().trim()))
    url = r.data?.next || null
  }
  console.log(`✓ ${existingNames.size} existing items indexed\n`)

  // Create new items
  console.log(`Creating ${NEW_ITEMS.length} new items...\n`)
  const results = { created: 0, skipped: 0, failed: 0 }
  const W = 32

  for (const [name, price, foodType, categoryNames, imageKw] of NEW_ITEMS) {
    // Dedup check
    if (existingNames.has(name.toLowerCase().trim())) {
      console.log(`  ↷  ${name.padEnd(W)}  already exists — skipped`)
      results.skipped++
      continue
    }

    // Resolve category IDs
    const categoryIds = categoryNames
      .map(cn => CAT[cn])
      .filter(Boolean)

    const missing = categoryNames.filter(cn => !CAT[cn])
    if (missing.length) console.warn(`     ⚠ unknown categories: ${missing.join(', ')}`)

    // Build payload
    const payload = {
      name,
      base_price: price,
      food_type: foodType,
      image_url: getImageUrl(imageKw, name),
      ...(categoryIds.length && { categories: categoryIds }),
    }

    const r = await req('POST', API_BASE + '/menu/items/', payload, token)

    if (r.status === 200 || r.status === 201) {
      const catLabel = categoryNames[0] || '—'
      console.log(`  ✓  ${name.padEnd(W)}  ${foodType.padEnd(8)}  [${catLabel}]`)
      results.created++
    } else {
      console.log(`  ✗  ${name.padEnd(W)}  FAILED (${r.status}): ${JSON.stringify(r.data).substring(0, 100)}`)
      results.failed++
    }
  }

  console.log('\n' + '═'.repeat(70))
  console.log(`  ✓  ${results.created} items created`)
  if (results.skipped) console.log(`  ↷  ${results.skipped} skipped (already exist)`)
  if (results.failed)  console.log(`  ✗  ${results.failed} failed`)
  console.log('═'.repeat(70))
}

main().catch(err => { console.error(err); process.exit(1) })
