/**
 * Deterministic, entirely imaginary B2B procurement data.
 * Execute: npm run generate-data
 * No customer, employee, or operational data from any real organisation is used.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../src/data/synthetic.json');
const SEED = 24112026;
const START = Date.UTC(2025, 10, 1); // 1 November 2025
const END = Date.UTC(2026, 9, 31); // 31 October 2026
const DAY = 86400000;
const days = Math.round((END - START) / DAY) + 1;
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const random = mulberry32(SEED);
const rint = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
const pick = a => a[rint(0, a.length - 1)];
const iso = millis => new Date(millis).toISOString().slice(0,10);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const catalog = {
  'Fruits & Vegetables': [
    'Fresh Tomatoes','Red Onions','Potatoes','Green Chillies','Bananas','Apples','Oranges','Carrots','Cabbage','Cucumbers',
    'Spinach','Bell Peppers','Lemons','Ginger','Garlic','Cauliflower','Mangoes','Grapes','Watermelon','Coriander'],
  'Dairy & Bakery': [
    'Whole Milk','Fresh Curd','Paneer','Butter Blocks','Mozzarella','Cheddar','Greek Yogurt','Fresh Cream','White Bread','Brown Bread',
    'Burger Buns','Pav Buns','Croissants','Wheat Flour Tortillas','Milk Powder','Sweet Lassi','Buttermilk','Sourdough Loaf','Baking Yeast','Salted Butter'],
  'Staples': [
    'Sona Masoori Rice','Basmati Rice','Wheat Flour','Toor Dal','Moong Dal','Sunflower Oil','Mustard Oil','Sugar','Iodised Salt','Chickpeas',
    'Turmeric Powder','Cumin Seeds','Black Pepper','Red Chilli Powder','Semolina','Poha','Jaggery','Corn Flour','Coconut Oil','Urad Dal'],
  'Beverages': [
    'Arabica Coffee','Assam Tea','Green Tea','Orange Juice','Apple Juice','Mineral Water','Sparkling Water','Lemon Soda','Cold Brew','Mango Juice',
    'Ginger Ale','Masala Chai Mix','Hot Chocolate','Tonic Water','Coconut Water','Iced Tea','Espresso Beans','Filter Coffee','Fruit Nectar','Energy Drink'],
  'Snacks': [
    'Salted Peanuts','Roasted Cashews','Banana Chips','Potato Chips','Trail Mix','Oat Cookies','Digestive Biscuits','Granola Bars','Mixed Nuts','Popcorn',
    'Salted Crackers','Khakhra','Roasted Chana','Energy Bars','Rice Crackers','Nachos','Dark Chocolate','Sesame Bites','Fruit Bars','Spiced Makhana']
};
const categories = Object.keys(catalog);
const regions = ['North','South','East','West'];
const prices = [135,170,230,190,155]; // base INR per commercial unit
const products = categories.flatMap((category, catIdx) => catalog[category].map((name, p) => ({
  id: `SKU-${String(catIdx * 20 + p + 1).padStart(3, '0')}`,
  name, category, basePriceCents: Math.round(prices[catIdx] * (0.6 + (p % 7) * 0.115 + random() * .3) * 100),
  unit: ['crate','case','bag','case','carton'][catIdx],
  activity: +(0.58 + random() * 1.1).toFixed(3)
})));
const profiles = ['habitual','steady','newish','at-risk','lapsed'];
const customers = Array.from({length:1000}, (_, i) => {
  const profile = profiles[i % 5];
  let joinedDay;
  if (profile === 'newish') joinedDay = rint(160, 350);
  else if (profile === 'lapsed') joinedDay = rint(0, 90);
  else joinedDay = rint(0, 270);
  return {
    id:`CUST-${String(i + 1).padStart(4,'0')}`, region:regions[(i + rint(0, 3)) % 4],
    joinedAt:iso(START + joinedDay * DAY),
    _joinedDay:joinedDay, _profile:profile,
    _favorite:categories[(i + rint(0, 4)) % 5]
  };
});
const monthSeason = [0.88,0.91,0.99,1.02,1.01,1.07,1.10,1.04,1.06,1.22,1.18,1.15,1.08];
const orders = [];
const orderItems = [];
let id = 1;
let lineId = 1;
function chooseProduct(category, day) {
  const options = products.filter(p => p.category === category);
  const month = new Date(START + day * DAY).getUTCMonth();
  const late = day > 270;
  const weighted = options.map((p, i) => {
    let w = p.activity;
    if (i === 0 || i === 1) w *= late ? .39 : 1.45; // declining leaders
    if (i === 17 || i === 18) w *= late ? 2.1 : .75; // growing challengers
    if (category === 'Beverages' && [3,4,5].includes(month)) w *= 1.12;
    return w;
  });
  const sum = weighted.reduce((a,b)=>a+b,0);
  let needle = random() * sum;
  for(let i=0;i<options.length;i++) { needle -= weighted[i]; if(needle<=0) return options[i]; }
  return options[options.length-1];
}
const complements = {
  'Fruits & Vegetables':['Staples','Dairy & Bakery'],
  'Dairy & Bakery':['Beverages','Fruits & Vegetables'],
  'Staples':['Fruits & Vegetables','Snacks'],
  'Beverages':['Snacks','Dairy & Bakery'],
  'Snacks':['Beverages','Staples']
};
for(const customer of customers) {
  const profile = customer._profile;
  const available = days - customer._joinedDay;
  let desired = profile==='habitual' ? rint(26, 42) : profile==='steady' ? rint(12,24) : profile==='newish' ? rint(1,7) : profile==='at-risk' ? rint(6,18) : rint(2,8);
  desired = Math.min(desired,Math.max(1,Math.floor(available / 4)));
  const endingDay = profile==='lapsed' ? Math.min(220, customer._joinedDay + rint(45,160)) : profile==='at-risk' ? Math.min(280, customer._joinedDay+rint(100,260)) : 364;
  const start = customer._joinedDay;
  const validEnd = Math.max(start, endingDay);
  const selectedDays = new Set();
  for(let j=0;j<desired;j++) {
    // seasonal weighting using simple rejection sampling
    let d = start;
    for(let tries=0;tries<25;tries++) {
      d = rint(start, validEnd);
      const m = new Date(START + d * DAY).getUTCMonth();
      if(random() < monthSeason[m] / 1.24) break;
    }
    selectedDays.add(d);
  }
  for(const day of [...selectedDays].sort((a,b)=>a-b)) {
    const date=iso(START + day * DAY);
    const orderId=`ORD-${String(id++).padStart(6,'0')}`;
    orders.push({id:orderId,customerId:customer.id,region:customer.region,date});
    const basket = rint(2,5);
    const seen = new Set();
    let preferred = customer._favorite;
    for(let j=0;j<basket;j++) {
      if(j===1 && random()<.8) preferred=pick(complements[customer._favorite]);
      if(j>1 && random()<.62) preferred=pick(categories);
      const product=chooseProduct(preferred,day);
      if(seen.has(product.id)) continue;
      seen.add(product.id);
      const qty = rint(2,18) + (profile==='habitual' ? rint(0,10) : 0);
      // fixed cents pricing, no floating totals in reporting
      const priceCents=Math.round(product.basePriceCents * (0.94 + random() * .14));
      orderItems.push({id:`LINE-${String(lineId++).padStart(7,'0')}`,orderId,productId:product.id,quantity:qty,unitPriceCents:priceCents});
    }
  }
}
orders.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
const finalCustomers=customers.map(({id,region,joinedAt})=>({id,region,joinedAt}));
const data = {
  meta:{label:'SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL URBAN HARVEST RESULTS',seed:SEED,
    startDate:iso(START),endDate:iso(END),currency:'INR',generatedBy:'scripts/generate-data.mjs',
    orderCount:orders.length,customerCount:finalCustomers.length,productCount:products.length},
  customers:finalCustomers,products,orders,items:orderItems
};
mkdirSync(dirname(OUT), {recursive:true});
writeFileSync(OUT, JSON.stringify(data));
console.log(`Generated ${finalCustomers.length} customers, ${products.length} products, ${orders.length} orders, ${orderItems.length} lines at ${OUT}`);
