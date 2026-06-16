const PROPERTY_IMAGES = {
  residential: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
  highrise: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
  singlefamily: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80',
  luxury: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  midrise: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
  multifamily: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80',
  townhouse: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=900&q=80',
  duplex: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=900&q=80',
  commercial: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
  land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80',
};

const MARKETS = [
  { market: 'Miami', city: 'Miami, FL', zip: '33129', lat: 25.7617, lng: -80.1918, base: 690000, rent: 3150, cap: 5.2, roi: 8.0, score: 86, neighborhoods: ['Brickell', 'Little Havana', 'Edgewater', 'Coconut Grove', 'Wynwood'], mx: 72, my: 77 },
  { market: 'Austin', city: 'Austin, TX', zip: '78701', lat: 30.2672, lng: -97.7431, base: 520000, rent: 2550, cap: 5.8, roi: 8.7, score: 88, neighborhoods: ['East Austin', 'Mueller', 'South Congress', 'Riverside', 'North Loop'], mx: 38, my: 67 },
  { market: 'Phoenix', city: 'Phoenix, AZ', zip: '85018', lat: 33.4484, lng: -112.0740, base: 430000, rent: 2300, cap: 6.1, roi: 9.1, score: 87, neighborhoods: ['Arcadia', 'Encanto', 'Roosevelt Row', 'Camelback East', 'Maryvale'], mx: 19, my: 57 },
  { market: 'Denver', city: 'Denver, CO', zip: '80205', lat: 39.7392, lng: -104.9903, base: 560000, rent: 2650, cap: 5.5, roi: 8.0, score: 84, neighborhoods: ['RiNo', 'LoHi', 'Capitol Hill', 'Sloan Lake', 'Five Points'], mx: 27, my: 39 },
  { market: 'Nashville', city: 'Nashville, TN', zip: '37212', lat: 36.1627, lng: -86.7816, base: 455000, rent: 2400, cap: 5.9, roi: 8.6, score: 86, neighborhoods: ['Germantown', 'East Nashville', 'The Nations', '12 South', 'Wedgewood-Houston'], mx: 58, my: 52 },
  { market: 'Chicago', city: 'Chicago, IL', zip: '60614', lat: 41.8781, lng: -87.6298, base: 485000, rent: 2550, cap: 6.4, roi: 8.9, score: 85, neighborhoods: ['Logan Square', 'Lincoln Park', 'Pilsen', 'Hyde Park', 'West Loop'], mx: 52, my: 29 },
  { market: 'Atlanta', city: 'Atlanta, GA', zip: '30303', lat: 33.7490, lng: -84.3880, base: 350000, rent: 2050, cap: 7.0, roi: 10.0, score: 88, neighborhoods: ['Old Fourth Ward', 'West End', 'Grant Park', 'Midtown', 'Kirkwood'], mx: 60, my: 60 },
  { market: 'Charlotte', city: 'Charlotte, NC', zip: '28203', lat: 35.2271, lng: -80.8431, base: 380000, rent: 2150, cap: 6.5, roi: 9.4, score: 87, neighborhoods: ['South End', 'NoDa', 'Plaza Midwood', 'Dilworth', 'Optimist Park'], mx: 64, my: 53 },
  { market: 'Seattle', city: 'Seattle, WA', zip: '98118', lat: 47.6062, lng: -122.3321, base: 760000, rent: 3350, cap: 4.8, roi: 6.9, score: 80, neighborhoods: ['Ballard', 'Capitol Hill', 'Rainier Valley', 'Beacon Hill', 'Fremont'], mx: 9, my: 18 },
  { market: 'Oakland', city: 'Oakland, CA', zip: '94612', lat: 37.8044, lng: -122.2712, base: 720000, rent: 3450, cap: 5.1, roi: 7.4, score: 82, neighborhoods: ['Temescal', 'Rockridge', 'Jack London', 'Fruitvale', 'West Oakland'], mx: 7, my: 45 },
  { market: 'New Orleans', city: 'New Orleans, LA', zip: '70115', lat: 29.9511, lng: -90.0715, base: 330000, rent: 2050, cap: 7.8, roi: 10.9, score: 89, neighborhoods: ['Uptown', 'Bywater', 'Mid-City', 'Treme', 'Lower Garden District'], mx: 49, my: 72 },
  { market: 'Los Angeles', city: 'Los Angeles, CA', zip: '90046', lat: 34.0522, lng: -118.2437, base: 1050000, rent: 4700, cap: 4.0, roi: 5.8, score: 76, neighborhoods: ['Echo Park', 'Silver Lake', 'West Adams', 'Koreatown', 'Highland Park'], mx: 9, my: 52 },
  { market: 'Dallas', city: 'Dallas, TX', zip: '75201', lat: 32.7767, lng: -96.7970, base: 390000, rent: 2250, cap: 6.8, roi: 9.7, score: 88, neighborhoods: ['Deep Ellum', 'Bishop Arts', 'Oak Lawn', 'Lakewood', 'Uptown'], mx: 37, my: 63 },
  { market: 'Tampa', city: 'Tampa, FL', zip: '33602', lat: 27.9506, lng: -82.4572, base: 410000, rent: 2350, cap: 6.4, roi: 9.0, score: 86, neighborhoods: ['Seminole Heights', 'Hyde Park', 'Ybor City', 'Channelside', 'West Tampa'], mx: 70, my: 75 },
  { market: 'Orlando', city: 'Orlando, FL', zip: '32801', lat: 28.5383, lng: -81.3792, base: 370000, rent: 2200, cap: 6.7, roi: 9.5, score: 87, neighborhoods: ['Lake Eola', 'Mills 50', 'College Park', 'SoDo', 'Parramore'], mx: 71, my: 73 },
];

const PROPERTY_MIX = [
  { type: 'Single Family', label: 'Bungalow', price: 1.0, rent: 1.0, beds: 3, baths: 2, sqft: 1680, units: 1, cap: 0, roi: 0.2, cash: 0, score: 0, img: 'singlefamily' },
  { type: 'Condo', label: 'Loft', price: 0.72, rent: 0.76, beds: 2, baths: 2, sqft: 1120, units: 1, cap: -0.2, roi: -0.3, cash: -90, score: -2, img: 'midrise' },
  { type: 'Townhouse', label: 'Townhome', price: 0.88, rent: 0.9, beds: 3, baths: 3, sqft: 1540, units: 1, cap: 0.1, roi: 0.1, cash: 60, score: 1, img: 'townhouse' },
  { type: 'Duplex', label: 'Duplex', price: 1.18, rent: 1.55, beds: 4, baths: 3, sqft: 2350, units: 2, cap: 0.8, roi: 1.1, cash: 420, score: 4, img: 'duplex' },
  { type: 'Multifamily', label: 'Fourplex', price: 1.95, rent: 2.75, beds: 8, baths: 6, sqft: 4320, units: 4, cap: 1.2, roi: 1.8, cash: 980, score: 6, img: 'multifamily' },
  { type: 'Commercial', label: 'Mixed-Use', price: 1.45, rent: 1.95, beds: 0, baths: 2, sqft: 3100, units: 2, cap: 0.6, roi: 0.8, cash: 520, score: 2, img: 'commercial' },
  { type: 'Land', label: 'Infill Lot', price: 0.42, rent: 0, beds: 0, baths: 0, sqft: 6800, units: 0, cap: -1.5, roi: 2.2, cash: -210, score: -3, img: 'land' },
];

const STREETS = ['Main St', 'Oak Ave', 'Cedar Blvd', 'Market St', 'Riverside Dr', 'Highland Ave', 'Union Way'];
const STATUSES = ['For Sale', 'For Sale', 'For Sale', 'Coming Soon', 'Off-Market'];

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export const PROPERTY_TYPES = PROPERTY_MIX.map(item => item.type);
export const MARKETS_LIST = MARKETS.map(item => item.market);
export { PROPERTY_IMAGES };

export const DEMO_PROPERTIES = MARKETS.flatMap((market, marketIndex) => (
  PROPERTY_MIX.map((mix, typeIndex) => {
    const id = marketIndex * PROPERTY_MIX.length + typeIndex + 1;
    const neighborhood = market.neighborhoods[typeIndex % market.neighborhoods.length];
    const price = roundTo(market.base * mix.price * (1 + ((typeIndex % 3) - 1) * 0.035), 5000);
    const rent = mix.rent > 0 ? roundTo(market.rent * mix.rent * (1 + (typeIndex % 2) * 0.04), 25) : 0;
    const capRate = Number(clamp(market.cap + mix.cap + ((marketIndex % 4) - 1.5) * 0.12, 2.8, 10.2).toFixed(1));
    const roi = Number(clamp(market.roi + mix.roi + ((marketIndex % 5) - 2) * 0.18, 3.6, 14.8).toFixed(1));
    const baseCash = rent > 0 ? Math.round((rent * mix.units * 0.58) - (price * 0.0046)) : -Math.round(price * 0.0011);
    const cashFlow = roundTo(baseCash + mix.cash + ((marketIndex % 4) - 1) * 85, 10);
    const score = Math.round(clamp(market.score + mix.score + (capRate - 6) * 1.5 + (cashFlow > 0 ? 2 : -4), 58, 97));
    const lat = Number((market.lat + (typeIndex - 3) * 0.018).toFixed(4));
    const longitude = Number((market.lng + ((typeIndex % 4) - 1.5) * 0.023).toFixed(4));
    const latitude = lat;

    return {
      id,
      address: `${120 + id * 17} ${neighborhood.split(' ')[0]} ${STREETS[typeIndex]}`,
      city: `${market.city} ${market.zip}`,
      market: market.market,
      neighborhood,
      price,
      rent,
      beds: mix.beds,
      baths: mix.baths,
      sqft: mix.sqft + (marketIndex % 4) * 95,
      units: mix.units,
      capRate,
      roi,
      cashFlow,
      score,
      type: mix.type,
      status: STATUSES[(marketIndex + typeIndex) % STATUSES.length],
      image: PROPERTY_IMAGES[mix.img],
      img: mix.img,
      latitude,
      longitude,
      mx: clamp(market.mx + (typeIndex - 3) * 0.8, 4, 82),
      my: clamp(market.my + ((typeIndex % 3) - 1) * 1.2, 15, 80),
      daysListed: ((marketIndex + typeIndex) % 5) === 3 ? 0 : 3 + ((marketIndex * 5 + typeIndex * 7) % 58),
      mode: ['Commercial', 'Land'].includes(mix.type) || mix.units > 1 ? 'invest' : (score >= 84 ? 'invest' : 'buy'),
      subtype: mix.label,
    };
  })
));
