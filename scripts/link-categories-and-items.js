/**
 * Two-phase linking script:
 *   Phase 1 — Assign all 51 categories to relevant menus (via menu_ids PATCH)
 *   Phase 2 — Assign all 214 items to relevant categories (via categories PATCH)
 *
 * Usage: OTP_CODE=<code> node scripts/link-categories-and-items.js
 */

const AUTH_BASE  = 'https://formularms-api.bottle.com.np'
const API_BASE   = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

// ── Phase 1: Category → Menu mapping ─────────────────────────────────────────
// Each category can belong to multiple menus
const CAT_MENUS = {
  'American Classics':    ['Dinner Menu', 'Lunch Menu', "Chef's Special Menu", 'Takeaway Menu'],
  'Appetizers':           ['Dinner Menu', 'Lunch Menu', "Chef's Special Menu", 'Happy Hour Menu'],
  'BBQ & Grills':         ['Dinner Menu', "Chef's Special Menu", 'Weekend Special Menu', 'Festival Menu'],
  'Beef & Lamb':          ['Dinner Menu', "Chef's Special Menu", 'Weekend Special Menu'],
  'Beer & Cider':         ['Beverages Menu', 'Bar Menu', 'Happy Hour Menu'],
  'Breads & Toasts':      ['Breakfast Menu', 'Brunch Menu', 'Lunch Menu'],
  'Breakfast Mains':      ['Breakfast Menu', 'Brunch Menu'],
  'Burgers':              ['Lunch Menu', 'Dinner Menu', 'Takeaway Menu', 'Late Night Menu', 'Kids Menu'],
  'Cakes & Pastries':     ['Dessert Menu', "Chef's Special Menu", 'Weekend Special Menu'],
  'Chaat & Street Food':  ['Lunch Menu', 'Festival Menu', 'Takeaway Menu', "Chef's Special Menu"],
  'Chicken Dishes':       ['Lunch Menu', 'Dinner Menu', "Chef's Special Menu", 'Set Meal Menu'],
  'Chinese Dishes':       ['Dinner Menu', 'Lunch Menu', "Chef's Special Menu"],
  'Cocktails':            ['Beverages Menu', 'Bar Menu', 'Happy Hour Menu', 'Late Night Menu', 'Weekend Special Menu'],
  'Coffee & Espresso':    ['Beverages Menu', 'Breakfast Menu', 'Brunch Menu'],
  'Desserts':             ['Dessert Menu', 'Dinner Menu', "Chef's Special Menu", 'Weekend Special Menu'],
  'Dips & Sauces':        ['Bar Menu', 'Happy Hour Menu', "Chef's Special Menu"],
  'Eggs & Omelettes':     ['Breakfast Menu', 'Brunch Menu'],
  'Fresh Juices':         ['Beverages Menu', 'Breakfast Menu', 'Brunch Menu', 'Vegan Menu'],
  'Fried Snacks':         ['Happy Hour Menu', 'Late Night Menu', 'Takeaway Menu', 'Bar Menu'],
  'Ice Cream & Gelato':   ['Dessert Menu', 'Kids Menu', "Chef's Special Menu"],
  'Indian Curries':       ['Lunch Menu', 'Dinner Menu', 'Vegetarian Menu', 'Set Meal Menu', "Chef's Special Menu"],
  'Japanese Dishes':      ['Dinner Menu', "Chef's Special Menu", 'Weekend Special Menu'],
  'Kids Meals':           ['Kids Menu'],
  'Mediterranean':        ['Dinner Menu', "Chef's Special Menu", 'Weekend Special Menu'],
  'Mexican Corner':       ['Lunch Menu', 'Dinner Menu', 'Takeaway Menu', "Chef's Special Menu"],
  'Mocktails':            ['Beverages Menu', 'Bar Menu', 'Happy Hour Menu', 'Kids Menu', 'Late Night Menu'],
  'Momo & Dumplings':     ['Lunch Menu', 'Dinner Menu', 'Takeaway Menu', 'Festival Menu', "Chef's Special Menu"],
  'Nepali Classics':      ['Lunch Menu', 'Dinner Menu', 'Set Meal Menu', 'Festival Menu', "Chef's Special Menu"],
  'Noodles & Stir Fry':   ['Lunch Menu', 'Dinner Menu', 'Takeaway Menu', "Chef's Special Menu"],
  'Pancakes & Waffles':   ['Breakfast Menu', 'Brunch Menu', 'Kids Menu'],
  'Pasta':                ['Lunch Menu', 'Dinner Menu', 'Vegetarian Menu', "Chef's Special Menu"],
  'Pizza':                ['Lunch Menu', 'Dinner Menu', 'Takeaway Menu', 'Late Night Menu', 'Kids Menu', "Chef's Special Menu"],
  'Pork Dishes':          ['Dinner Menu', "Chef's Special Menu", 'Weekend Special Menu'],
  'Rice & Biryani':       ['Lunch Menu', 'Dinner Menu', 'Set Meal Menu', 'Vegetarian Menu', "Chef's Special Menu"],
  'Salads':               ['Lunch Menu', 'Brunch Menu', 'Vegan Menu', 'Vegetarian Menu', 'Gluten-Free Menu', 'Seasonal Menu'],
  'Sandwiches':           ['Lunch Menu', 'Brunch Menu', 'Takeaway Menu', "Chef's Special Menu"],
  'Seafood':              ['Dinner Menu', "Chef's Special Menu", 'Weekend Special Menu'],
  'Side Dishes':          ['Dinner Menu', 'Lunch Menu', 'Set Meal Menu'],
  'Smoothies & Shakes':   ['Beverages Menu', 'Breakfast Menu', 'Brunch Menu'],
  'Snacks & Finger Food': ['Happy Hour Menu', 'Late Night Menu', 'Bar Menu', 'Festival Menu', "Chef's Special Menu"],
  'Soft Drinks':          ['Beverages Menu', 'Kids Menu', 'Takeaway Menu'],
  'Soups':                ['Lunch Menu', 'Dinner Menu', 'Brunch Menu', 'Vegan Menu', 'Gluten-Free Menu', 'Seasonal Menu'],
  'Spirits & Whisky':     ['Beverages Menu', 'Bar Menu', 'Happy Hour Menu'],
  'Steamed Dishes':       ['Dinner Menu', 'Vegan Menu', 'Gluten-Free Menu', "Chef's Special Menu"],
  'Tea & Herbal Drinks':  ['Beverages Menu', 'Breakfast Menu', 'Brunch Menu'],
  'Thai Cuisine':         ['Dinner Menu', 'Lunch Menu', "Chef's Special Menu"],
  'Vegan Specials':       ['Vegan Menu', 'Vegetarian Menu', 'Gluten-Free Menu', "Chef's Special Menu"],
  'Vegetarian Mains':     ['Vegetarian Menu', 'Vegan Menu', 'Lunch Menu', 'Dinner Menu', 'Seasonal Menu'],
  'Water & Soda':         ['Beverages Menu', 'Kids Menu'],
  'Wine':                 ['Beverages Menu', 'Bar Menu', 'Dinner Menu', 'Weekend Special Menu'],
}

// ── Phase 2: Item name pattern → category names ───────────────────────────────
const ITEM_RULES = [
  // Momo / Dumplings
  { match: /momo|dumpling|jhol/i,               cats: ['Momo & Dumplings', 'Nepali Classics'] },

  // Pizza
  { match: /pizza/i,                             cats: ['Pizza'] },

  // Burger
  { match: /burger/i,                            cats: ['Burgers', 'American Classics'] },

  // Steak
  { match: /steak|tenderloin/i,                  cats: ['Beef & Lamb'] },

  // BBQ / Grill / Sekuwa
  { match: /bbq|grill|sekuwa/i,                  cats: ['BBQ & Grills'] },

  // Pasta
  { match: /pasta|spaghetti|fettuccine|penne|linguine|carbonara|alfredo|arrabbiata/i, cats: ['Pasta'] },

  // Noodles
  { match: /noodle|ramen|thukpa|chow mein|pad thai|udon|lo mein/i, cats: ['Noodles & Stir Fry'] },

  // Biryani / Rice
  { match: /biryani/i,                           cats: ['Rice & Biryani'] },
  { match: /fried rice|jeera rice|coconut rice|steamed rice/i, cats: ['Rice & Biryani', 'Side Dishes'] },

  // Salad
  { match: /salad/i,                             cats: ['Salads'] },

  // Soup
  { match: /soup/i,                              cats: ['Soups'] },

  // Sandwich / Wrap / Club
  { match: /sandwich|wrap|club/i,                cats: ['Sandwiches'] },

  // Pancakes / Waffles
  { match: /pancake|waffle/i,                    cats: ['Pancakes & Waffles'] },

  // Breakfast
  { match: /breakfast|eggs benedict|french toast/i, cats: ['Breakfast Mains'] },

  // Omelette / Eggs
  { match: /omelette|scrambled egg|poached egg/i, cats: ['Eggs & Omelettes'] },

  // Toast / Avocado Toast
  { match: /avocado toast|garlic bread|garlic naan|naan|roti|puri|paratha/i, cats: ['Breads & Toasts'] },

  // Indian Curries
  { match: /masala|korma|tikka|rogan josh|chole|saag|dal makhani|butter chicken|palak|kadai/i, cats: ['Indian Curries'] },
  { match: /paneer/i,                            cats: ['Indian Curries', 'Vegetarian Mains'] },

  // Nepali Classics
  { match: /dal bhat|gundruk|sel roti|chatamari|kwati|sukuti|chhoyla|yomari|newari|aloo tama/i, cats: ['Nepali Classics'] },

  // Chinese
  { match: /fried rice.*chinese|dim sum|spring roll|manchurian|chilli chicken|kung pao|sweet.*sour/i, cats: ['Chinese Dishes'] },

  // Thai
  { match: /pad thai|green curry|tom yum|thai/i, cats: ['Thai Cuisine'] },

  // Japanese
  { match: /sushi|ramen|teriyaki|tempura|udon|miso|katsu|japanese/i, cats: ['Japanese Dishes'] },

  // Mediterranean
  { match: /hummus|falafel|shawarma|gyro|bruschetta|caprese|greek|mediterranean/i, cats: ['Mediterranean'] },

  // Mexican
  { match: /taco|burrito|quesadilla|nacho|guacamole|mexican/i, cats: ['Mexican Corner'] },

  // Seafood
  { match: /prawn|lobster|salmon|fish|seafood|crab|calamari/i, cats: ['Seafood'] },

  // Chicken
  { match: /chicken/i,                           cats: ['Chicken Dishes'] },

  // Beef / Lamb / Mutton
  { match: /beef|lamb|mutton/i,                  cats: ['Beef & Lamb'] },

  // Pork
  { match: /pork|bacon/i,                        cats: ['Pork Dishes'] },

  // Snacks / Starters / Appetizers
  { match: /starter|spring roll|onion ring|nachos|loaded fries|wings|satay|skewer|bruschetta/i, cats: ['Snacks & Finger Food', 'Appetizers'] },
  { match: /chaat|pani puri|bhel|samosa|pakora/i, cats: ['Chaat & Street Food', 'Snacks & Finger Food'] },

  // Fried snacks
  { match: /fried.*chicken|chicken.*fried|crispy.*chicken|nugget|popcorn chicken/i, cats: ['Fried Snacks', 'Chicken Dishes'] },
  { match: /french fries|onion ring|fried/i,     cats: ['Fried Snacks', 'Side Dishes'] },

  // BBQ & Grills (catch-all after specific)
  { match: /rack of lamb|mixed grill|tandoori/i, cats: ['BBQ & Grills'] },

  // Steamed
  { match: /steamed/i,                           cats: ['Steamed Dishes'] },

  // Side dishes
  { match: /coleslaw|garlic bread|side salad|corn|mashed potato/i, cats: ['Side Dishes'] },

  // Dips & Sauces
  { match: /dip|chutney|salsa|mayo|sauce.*bowl/i, cats: ['Dips & Sauces'] },

  // Kids
  { match: /kids|children|junior/i,              cats: ['Kids Meals'] },

  // Desserts
  { match: /cake|lava|tiramisu|panna cotta|cheesecake|crème brûlée|creme brulee|pudding|brownie|cookie/i, cats: ['Desserts', 'Cakes & Pastries'] },
  { match: /ice cream|gelato|sorbet|sundae|scoop/i, cats: ['Ice Cream & Gelato', 'Desserts'] },

  // Coffee
  { match: /coffee|espresso|cappuccino|latte|flat white|cold brew|americano|macchiato/i, cats: ['Coffee & Espresso'] },

  // Tea
  { match: /tea|chai|matcha|chamomile/i,          cats: ['Tea & Herbal Drinks'] },

  // Juice
  { match: /juice/i,                             cats: ['Fresh Juices'] },

  // Smoothie / Shake / Lassi
  { match: /smoothie|shake|lassi|milkshake/i,    cats: ['Smoothies & Shakes'] },

  // Cocktails
  { match: /cocktail|mojito|margarita|cosmopolitan|daiquiri|martini|old fashioned|whisky sour/i, cats: ['Cocktails'] },

  // Mocktails
  { match: /mocktail|virgin|shirley temple|blue lagoon|fruit punch/i, cats: ['Mocktails'] },

  // Beer / Cider
  { match: /beer|lager|ale|cider|draught/i,      cats: ['Beer & Cider'] },

  // Wine
  { match: /wine|merlot|chardonnay|cabernet|prosecco|champagne/i, cats: ['Wine'] },

  // Spirits
  { match: /whisky|vodka|rum|gin|tequila|bourbon|scotch|brandy|spirits/i, cats: ['Spirits & Whisky'] },

  // Soft Drinks
  { match: /cola|pepsi|sprite|fanta|soda|soft drink|lemonade|iced tea/i, cats: ['Soft Drinks'] },

  // Water
  { match: /water|sparkling/i,                   cats: ['Water & Soda'] },

  // Vegan
  { match: /vegan|plant.based/i,                 cats: ['Vegan Specials'] },

  // Vegetarian (catch-all)
  { match: /vegetarian|veggie/i,                 cats: ['Vegetarian Mains'] },
]

function getCatsFor(name, foodType) {
  const matches = new Set()
  for (const rule of ITEM_RULES) {
    if (rule.match.test(name)) rule.cats.forEach(c => matches.add(c))
  }
  // food_type fallback
  if (matches.size === 0 && foodType === 'veg') matches.add('Vegetarian Mains')
  return [...matches]
}

async function main() {
  if (!OTP_CODE) { console.error('Usage: OTP_CODE=<code> node scripts/link-categories-and-items.js'); process.exit(1) }

  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/',
    { identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE) })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('Authenticated OK\n')

  // Fetch menus
  const mr = await req('GET', API_BASE + '/menu/menus/?limit=100', null, token)
  const menus = Array.isArray(mr.data) ? mr.data : mr.data?.results || []
  const menuByName = Object.fromEntries(menus.map(m => [m.name, m.id]))
  console.log(`Menus: ${menus.length}`)

  // Fetch all categories
  const cr = await req('GET', API_BASE + '/menu/categories/?limit=200', null, token)
  const cats = Array.isArray(cr.data) ? cr.data : cr.data?.results || []
  const catByName = Object.fromEntries(cats.map(c => [c.name, c]))
  console.log(`Categories: ${cats.length}\n`)

  // ── Phase 1: Link categories → menus ─────────────────────────────────────
  console.log('━━━ Phase 1: Categories → Menus ━━━\n')
  let catOk = 0, catFail = 0
  for (const [catName, menuNames] of Object.entries(CAT_MENUS)) {
    const cat = catByName[catName]
    if (!cat) { console.log(`  — cat not found: ${catName}`); continue }

    const menuIds = menuNames.map(n => menuByName[n]).filter(Boolean)
    // Merge with existing menu_ids
    const existing = cat.menu_ids || []
    const merged = [...new Set([...existing, ...menuIds])]

    const r = await req('PATCH', `${API_BASE}/menu/categories/${cat.id}/`, { menu_ids: merged }, token)
    if (r.status === 200) {
      catOk++
      console.log(`  ✓ ${catName.padEnd(28)} → ${menuNames.join(', ')}`)
    } else {
      catFail++
      console.log(`  ✗ FAIL ${catName} — ${r.status}: ${JSON.stringify(r.data).slice(0, 80)}`)
    }
  }
  console.log(`\nPhase 1 done: ${catOk} categories linked, ${catFail} failed\n`)

  // ── Phase 2: Link items → categories ──────────────────────────────────────
  console.log('━━━ Phase 2: Items → Categories ━━━\n')
  let url = API_BASE + '/menu/items/?limit=200'
  const allItems = []
  while (url) {
    const r = await req('GET', url, null, token)
    const page = Array.isArray(r.data) ? r.data : r.data?.results || []
    allItems.push(...page)
    url = r.data?.next || null
  }
  console.log(`Items fetched: ${allItems.length}\n`)

  let itemOk = 0, itemFail = 0, itemSkip = 0
  for (const item of allItems) {
    if (item.categories && item.categories.length > 0) { itemSkip++; continue }

    const catNames = getCatsFor(item.name, item.food_type)
    if (!catNames.length) { itemSkip++; continue }

    const catIds = catNames.map(n => catByName[n]?.id).filter(Boolean)
    if (!catIds.length) { itemSkip++; continue }

    const r = await req('PATCH', `${API_BASE}/menu/items/${item.id}/`, { category_ids: catIds }, token)
    if (r.status === 200) {
      itemOk++
      console.log(`  ✓ ${item.name.padEnd(36)} → ${catNames.join(', ')}`)
    } else {
      itemFail++
      console.log(`  ✗ FAIL ${item.name} — ${r.status}: ${JSON.stringify(r.data).slice(0, 80)}`)
    }
  }

  console.log(`\n${'═'.repeat(65)}`)
  console.log(`  Phase 1 — ${catOk}/${cats.length} categories linked to menus`)
  console.log(`  Phase 2 — ${itemOk} items linked to categories  |  ${itemSkip} skipped  |  ${itemFail} failed`)
  console.log('═'.repeat(65))
}

main().catch(err => { console.error(err); process.exit(1) })
