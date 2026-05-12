/**
 * Add food images to all menu items based on item name.
 * Usage: OTP_CODE=<code> node scripts/add-item-images.js
 *
 * Images are sourced from loremflickr.com (free, no API key, returns real food photos).
 * URL format: https://loremflickr.com/400/300/{keywords}?lock={N}
 * The ?lock seed is derived from the item name so each item always gets the same image.
 */

const AUTH_BASE  = 'https://formularms-api.bottle.com.np'
const API_BASE   = AUTH_BASE + '/api/v1'
const IDENTIFIER = 'pranuj@bottle.com.np'
const OTP_CODE   = process.env.OTP_CODE

// ── Keyword → Unsplash query mapping ─────────────────────────────────────────
// Order matters: first match wins. Keep specific entries before generic ones.
const KEYWORD_MAP = [
  // ── Momo / Dumplings ──
  [/momo|dumpling/i,               'momo,dumpling,nepali-food'],
  [/jhol/i,                        'momo,soup,nepali'],

  // ── Pizza ──
  [/margherita/i,                  'margherita,pizza'],
  [/pepperoni/i,                   'pepperoni,pizza'],
  [/bbq.*pizza|pizza.*bbq/i,       'bbq,pizza'],
  [/four cheese|cheese.*pizza/i,   'cheese,pizza'],
  [/pizza/i,                       'pizza,italian'],

  // ── Burger ──
  [/beef burger|classic burger/i,  'beef,burger'],
  [/chicken burger|crispy.*burger/i,'chicken,burger'],
  [/veggie.*burger|veg.*burger/i,  'veggie,burger'],
  [/pulled pork/i,                 'pulled-pork,burger'],
  [/burger/i,                      'burger,hamburger'],

  // ── Steak / Beef / Lamb / Mutton ──
  [/beef tenderloin|tenderloin/i,  'beef,tenderloin,steak'],
  [/beef stroganoff/i,             'beef,stroganoff'],
  [/beef/i,                        'beef,meat'],
  [/lamb chops/i,                  'lamb,chops,grill'],
  [/rack of lamb/i,                'rack,lamb,roast'],
  [/lamb rogan josh/i,             'lamb,curry,indian'],
  [/lamb/i,                        'lamb,meat'],
  [/mutton biryani/i,              'mutton,biryani'],
  [/mutton sukuti/i,               'mutton,sukuti,nepali'],
  [/mutton/i,                      'mutton,meat,curry'],

  // ── Chicken ──
  [/butter chicken/i,              'butter,chicken,curry'],
  [/chicken biryani/i,             'chicken,biryani,rice'],
  [/chicken corn soup/i,           'chicken,corn,soup'],
  [/chicken korma/i,               'chicken,korma,curry'],
  [/chicken schnitzel/i,           'chicken,schnitzel'],
  [/chicken sekuwa/i,              'chicken,sekuwa,grill'],
  [/chicken thukpa/i,              'chicken,noodles,soup'],
  [/chicken tikka/i,               'chicken,tikka,indian'],
  [/chicken wings/i,               'chicken,wings,crispy'],
  [/lemon herb roast chicken/i,    'roast,chicken,herbs'],
  [/grilled chicken breast/i,      'grilled,chicken,breast'],
  [/grilled chicken salad/i,       'grilled,chicken,salad'],
  [/steamed chicken momo/i,        'steamed,dumpling,chicken'],
  [/chicken/i,                     'chicken,food'],

  // ── Seafood / Fish / Prawn / Lobster ──
  [/garlic butter lobster/i,       'lobster,butter,seafood'],
  [/grilled salmon/i,              'salmon,grilled,fish'],
  [/fish & chips|fish and chips/i, 'fish,chips,british'],
  [/seafood linguine/i,            'seafood,pasta,linguine'],
  [/prawn cocktail/i,              'prawn,cocktail,seafood'],
  [/prawn stir fry/i,              'prawn,stirfry,asian'],
  [/prawn/i,                       'prawn,seafood'],
  [/fish/i,                        'fish,seafood'],

  // ── Pasta / Noodles ──
  [/spaghetti carbonara/i,         'spaghetti,carbonara,pasta'],
  [/fettuccine alfredo/i,          'fettuccine,alfredo,pasta'],
  [/penne arrabbiata/i,            'penne,pasta,tomato'],
  [/pad thai/i,                    'pad-thai,noodles,thai'],
  [/ramen/i,                       'ramen,noodles,japanese'],
  [/chow mein|chowmein/i,          'chow-mein,noodles,chinese'],
  [/thukpa/i,                      'thukpa,noodle-soup,nepali'],
  [/pasta/i,                       'pasta,italian'],
  [/noodles/i,                     'noodles,asian'],

  // ── Rice ──
  [/chicken biryani/i,             'chicken,biryani'],
  [/mutton biryani/i,              'mutton,biryani'],
  [/egg fried rice/i,              'egg,fried-rice'],
  [/veg fried rice/i,              'veg,fried-rice'],
  [/dal bhat|dal bhat tarkari/i,   'dal-bhat,nepali,rice'],
  [/biryani/i,                     'biryani,rice'],
  [/fried rice/i,                  'fried-rice,asian'],

  // ── Indian / Curry ──
  [/palak paneer/i,                'palak,paneer,indian'],
  [/paneer tikka/i,                'paneer,tikka,indian'],
  [/masala/i,                      'masala,curry,indian'],

  // ── Salad / Soup ──
  [/caesar salad/i,                'caesar,salad'],
  [/greek salad/i,                 'greek,salad'],
  [/quinoa.*avocado|avocado.*salad/i, 'quinoa,avocado,salad'],
  [/grilled chicken salad/i,       'chicken,salad,greens'],
  [/salad/i,                       'salad,fresh'],
  [/tomato basil soup/i,           'tomato,soup,basil'],
  [/mushroom cream soup/i,         'mushroom,soup,cream'],
  [/chicken corn soup/i,           'chicken,corn,soup'],
  [/hot.*sour soup|hot & sour/i,   'hot-sour,soup,asian'],
  [/soup/i,                        'soup,bowl'],

  // ── Breakfast ──
  [/full english breakfast/i,      'english,breakfast,eggs'],
  [/eggs benedict/i,               'eggs-benedict,breakfast'],
  [/blueberry pancakes/i,          'blueberry,pancakes'],
  [/buttermilk pancakes/i,         'pancakes,syrup'],
  [/french toast/i,                'french-toast,breakfast'],
  [/avocado toast/i,               'avocado,toast,breakfast'],
  [/belgian waffles/i,             'belgian,waffles'],
  [/chocolate waffles/i,           'chocolate,waffles'],
  [/pancakes|waffles/i,            'pancakes,waffles,breakfast'],
  [/breakfast/i,                   'breakfast,morning-food'],

  // ── Nepali / Asian ──
  [/newari khaja/i,                'nepali,food,traditional'],
  [/sekuwa/i,                      'sekuwa,grill,nepali'],
  [/dal bhat/i,                    'dal-bhat,nepali-food'],

  // ── Starters / Snacks ──
  [/loaded nachos/i,               'nachos,cheese,snack'],
  [/onion rings/i,                 'onion-rings,fried'],
  [/crispy spring rolls/i,         'spring-rolls,asian'],
  [/bruschetta/i,                  'bruschetta,tomato,italian'],
  [/cheese garlic bread/i,         'garlic-bread,cheese'],
  [/prawn cocktail/i,              'prawn,cocktail'],
  [/chicken wings/i,               'chicken-wings,crispy'],

  // ── Desserts / Ice Cream ──
  [/chocolate lava cake/i,         'chocolate,lava-cake,dessert'],
  [/chocolate sundae/i,            'chocolate,sundae,ice-cream'],
  [/chocolate peanut shake/i,      'chocolate,peanut,milkshake'],
  [/crème brûlée|creme brulee/i,   'brulee,dessert,caramel'],
  [/tiramisu/i,                    'tiramisu,coffee,dessert'],
  [/mango panna cotta/i,           'mango,dessert,cream,sweet'],
  [/mango sorbet/i,                'sorbet,mango,frozen'],
  [/mixed fruit gelato|gelato/i,   'gelato,ice-cream,italian'],
  [/vanilla scoop/i,               'vanilla,ice-cream,scoop'],
  [/strawberry smoothie/i,         'strawberry,smoothie'],
  [/cheesecake/i,                  'cheesecake,dessert'],
  [/ice cream|icecream/i,          'ice-cream,dessert'],
  [/cake/i,                        'cake,dessert'],
  [/dessert/i,                     'dessert,sweet'],

  // ── Coffee / Tea ──
  [/cappuccino/i,                  'cappuccino,coffee,foam'],
  [/espresso/i,                    'espresso,coffee,black'],
  [/flat white/i,                  'coffee,milk,white,cup'],
  [/cold brew/i,                   'iced,coffee,cold,glass'],
  [/coffee/i,                      'coffee,cup'],
  [/chamomile tea/i,               'chamomile,tea,herbal'],
  [/lemon ginger tea/i,            'lemon,ginger,tea'],
  [/masala chai/i,                 'masala-chai,tea,spiced'],
  [/green tea/i,                   'green-tea,tea,japanese'],
  [/tea/i,                         'tea,cup,hot'],

  // ── Juices / Smoothies ──
  [/apple.*ginger juice|apple.*juice/i, 'apple,juice,fresh'],
  [/fresh orange juice/i,          'orange,juice,fresh'],
  [/watermelon juice/i,            'watermelon,juice,pink'],
  [/mango lassi/i,                 'mango,lassi,yogurt'],
  [/banana berry smoothie/i,       'banana,berry,smoothie'],
  [/green detox smoothie/i,        'green,smoothie,healthy'],
  [/strawberry smoothie/i,         'strawberry,smoothie'],
  [/smoothie/i,                    'smoothie,healthy,drink'],
  [/juice/i,                       'juice,fresh-fruit'],

  // ── Cocktails / Mocktails / Beverages ──
  [/cosmopolitan/i,                'cosmopolitan,cocktail,pink'],
  [/mojito/i,                      'mojito,cocktail,mint'],
  [/virgin mojito/i,               'mojito,mocktail,lime'],
  [/old fashioned/i,               'old-fashioned,whisky,cocktail'],
  [/whisky sour/i,                 'whisky,sour,cocktail'],
  [/blue lagoon/i,                 'blue,cocktail,mocktail'],
  [/shirley temple/i,              'shirley-temple,mocktail,red'],
  [/passion fruit cooler/i,        'passion-fruit,drink,tropical'],
  [/black label/i,                 'whisky,scotch,drink'],
  [/mocktail/i,                    'mocktail,drink,colorful'],
  [/cocktail/i,                    'cocktail,drink,bar'],
  [/beer|lager|ale/i,              'beer,pub,glass'],

  // ── Generic fallbacks ──
  [/veg|vegetarian|vegetable/i,    'vegetables,veg,healthy'],
  [/pork/i,                        'pork,meat,roast'],
  [/egg/i,                         'eggs,breakfast'],
]

// ── Helpers ───────────────────────────────────────────────────────────────────

// Stable numeric seed from item name — same name always produces same lock value
function nameSeed(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  return Math.abs(h) % 9000 + 1000   // range 1000–9999
}

function getImageUrl(name) {
  for (const [pattern, keywords] of KEYWORD_MAP) {
    if (pattern.test(name)) {
      return `https://loremflickr.com/400/300/${keywords}?lock=${nameSeed(name)}`
    }
  }
  return `https://loremflickr.com/400/300/food,restaurant?lock=${nameSeed(name)}`
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
    console.error('Usage: OTP_CODE=<code> node scripts/add-item-images.js')
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

  // Fetch all items (paginated)
  console.log('Fetching all menu items...')
  let url = API_BASE + '/menu/items/?limit=200'
  const allItems = []
  while (url) {
    const r = await req('GET', url, null, token)
    const items = Array.isArray(r.data) ? r.data : (r.data?.results || [])
    allItems.push(...items)
    url = r.data?.next || null
  }
  console.log(`Found ${allItems.length} items\n`)

  // Keyword patterns that return HTTP 500 from loremflickr (no matching Flickr photos)
  const DEAD_PATTERNS = [
    'newari,nepali,traditional-food',
    'chicken,thukpa,noodle-soup',
    'creme-brulee,dessert,french',
    'flat-white,coffee,latte',
    'cold-brew,coffee,iced',
    'panna-cotta,mango,dessert',
  ]
  const isDead = url =>
    !url || url.trim() === '' ||
    url.includes('source.unsplash.com') ||
    DEAD_PATTERNS.some(p => url.includes(p))

  const needsImage = allItems.filter(i => isDead(i.image_url))
  const hasImage   = allItems.filter(i => !isDead(i.image_url))
  console.log(`  ${hasImage.length} already have working images`)
  console.log(`  ${needsImage.length} need images (empty or dead URL)\n`)

  if (needsImage.length === 0) {
    console.log('All items already have working images. Done.')
    return
  }

  // Update items
  console.log('Adding images...\n')
  const results = { ok: 0, fail: 0, skipped: 0 }
  const WIDTH = 35

  for (const item of needsImage) {
    const imageUrl = getImageUrl(item.name)
    const r = await req('PATCH', `${API_BASE}/menu/items/${item.id}/`, { image_url: imageUrl }, token)

    if (r.status === 200 || r.status === 204) {
      console.log(`  ✓  ${item.name.padEnd(WIDTH)}  ${item.food_type.padEnd(8)}  → image added`)
      results.ok++
    } else {
      console.log(`  ✗  ${item.name.padEnd(WIDTH)}  FAILED (${r.status}): ${JSON.stringify(r.data).substring(0, 80)}`)
      results.fail++
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70))
  console.log(`  ✓ ${results.ok} items updated`)
  if (results.fail)    console.log(`  ✗ ${results.fail} failed`)
  if (hasImage.length) console.log(`  ↷ ${hasImage.length} already had images (skipped)`)
  console.log('═'.repeat(70))
}

main().catch(err => { console.error(err); process.exit(1) })
