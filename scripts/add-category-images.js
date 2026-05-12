/**
 * Add cover images to all menu categories using loremflickr.com.
 * Skips categories that already have a working image_url.
 * Usage: OTP_CODE=<code> node scripts/add-category-images.js
 */

const AUTH_BASE  = 'https://formularms-api.bottle.com.np'
const API_BASE   = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

// Category name → loremflickr keyword string
const CATEGORY_IMAGES = {
  'American Classics':    'burger,fries,american-food',
  'Appetizers':           'appetizer,starter,food',
  'BBQ & Grills':         'bbq,grill,barbecue',
  'Beef & Lamb':          'beef,steak,meat',
  'Beer & Cider':         'beer,glass,pub',
  'Breads & Toasts':      'bread,toast,bakery',
  'Breakfast Mains':      'breakfast,eggs,morning',
  'Burgers':              'burger,hamburger,bun',
  'Cakes & Pastries':     'cake,pastry,bakery',
  'Chaat & Street Food':  'chaat,street-food,indian-snack',
  'Chicken Dishes':       'chicken,grilled,food',
  'Chinese Dishes':       'chinese-food,wok,asian',
  'Cocktails':            'cocktail,drink,bar',
  'Coffee & Espresso':    'coffee,espresso,cup',
  'Desserts':             'dessert,sweet,chocolate',
  'Dips & Sauces':        'sauce,dip,condiment',
  'Eggs & Omelettes':     'eggs,omelette,breakfast',
  'Fresh Juices':         'juice,fresh-fruit,healthy',
  'Fried Snacks':         'fried,snack,crispy',
  'Ice Cream & Gelato':   'ice-cream,gelato,scoop',
  'Indian Curries':       'curry,indian-food,masala',
  'Japanese Dishes':      'japanese-food,sushi,ramen',
  'Kids Meals':           'kids-food,nuggets,happy-meal',
  'Mediterranean':        'mediterranean,greek-food,hummus',
  'Mexican Corner':       'mexican,taco,burrito',
  'Mocktails':            'mocktail,drink,colorful',
  'Momo & Dumplings':     'momo,dumpling,nepali-food',
  'Nepali Classics':      'dal-bhat,nepali-food,traditional',
  'Noodles & Stir Fry':   'noodles,stir-fry,asian',
  'Pancakes & Waffles':   'pancakes,waffles,syrup',
  'Pasta':                'pasta,italian,spaghetti',
  'Pizza':                'pizza,italian,slice',
  'Pork Dishes':          'pork,roast,meat',
  'Rice & Biryani':       'biryani,rice,indian',
  'Salads':               'salad,fresh,greens',
  'Sandwiches':           'sandwich,toast,bread',
  'Seafood':              'seafood,fish,prawn',
  'Side Dishes':          'side-dish,fries,salad',
  'Smoothies & Shakes':   'smoothie,shake,healthy-drink',
  'Snacks & Finger Food': 'snack,finger-food,appetizer',
  'Soft Drinks':          'soft-drink,soda,cola',
  'Soups':                'soup,bowl,warm',
  'Spirits & Whisky':     'whisky,spirits,glass',
  'Steamed Dishes':       'steamed,dim-sum,healthy',
  'Tea & Herbal Drinks':  'tea,herbal,cup',
  'Thai Cuisine':         'thai-food,pad-thai,curry',
  'Vegan Specials':       'vegan,plant-based,healthy',
  'Vegetarian Mains':     'vegetarian,veg,healthy-food',
  'Water & Soda':         'water,drink,refreshing',
  'Wine':                 'wine,glass,red-wine',
}

function nameSeed(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  return Math.abs(h) % 9000 + 1000
}

function getImageUrl(name) {
  const kw = CATEGORY_IMAGES[name] || 'food,restaurant,menu'
  return `https://loremflickr.com/600/400/${kw}?lock=${nameSeed(name)}`
}

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
}

async function main() {
  if (!OTP_CODE) {
    console.error('Usage: OTP_CODE=<code> node scripts/add-category-images.js')
    process.exit(1)
  }

  const auth = await req('POST', AUTH_BASE + '/auth/login/verify-otp/',
    { identifier: IDENTIFIER, method: 'email', code: String(OTP_CODE) })
  if (!auth.data?.access) { console.error('Auth failed:', JSON.stringify(auth.data)); process.exit(1) }
  const token = auth.data.access
  console.log('Authenticated OK\n')

  // Fetch all categories
  let url = API_BASE + '/menu/categories/?limit=200'
  const allCats = []
  while (url) {
    const r = await req('GET', url, null, token)
    const items = Array.isArray(r.data) ? r.data : (r.data?.results || [])
    allCats.push(...items)
    url = r.data?.next || null
  }
  console.log(`Fetched ${allCats.length} categories\n`)

  const needsImage = allCats.filter(c => !c.image_url || c.image_url.trim() === '')
  const hasImage   = allCats.filter(c => c.image_url && c.image_url.trim() !== '')
  console.log(`  ${hasImage.length} already have images`)
  console.log(`  ${needsImage.length} need images\n`)

  let ok = 0, fail = 0
  for (const cat of needsImage) {
    const imageUrl = getImageUrl(cat.name)
    const r = await req('PATCH', `${API_BASE}/menu/categories/${cat.id}/`, { image_url: imageUrl }, token)
    if (r.status === 200 || r.status === 204) {
      console.log(`  ✓  ${cat.name.padEnd(28)}  → ${imageUrl}`)
      ok++
    } else {
      console.log(`  ✗  ${cat.name.padEnd(28)}  FAILED (${r.status}): ${JSON.stringify(r.data).slice(0, 80)}`)
      fail++
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ✓ ${ok} categories updated`)
  if (fail)           console.log(`  ✗ ${fail} failed`)
  if (hasImage.length) console.log(`  ↷ ${hasImage.length} already had images (skipped)`)
  console.log('═'.repeat(60))
}

main().catch(err => { console.error(err); process.exit(1) })
