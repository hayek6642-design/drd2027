// Real-world geo engine — procedural treasure generation anchored to real coordinates

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) | 0;
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) | 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0xffffffff;
  };
}

export interface GeoTreasure {
  id: string;
  lat: number;
  lng: number;
  type: 'codes' | 'silver' | 'gold';
  amount: number;
  mined: boolean;
  difficulty: number;
  regionName: string;
}

export interface GeoThief {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  type: 'scout' | 'brute' | 'shadow';
  name: string;
  health: number;
}

// Real-world treasure regions (anchored to named districts/areas)
const TREASURE_REGIONS = [
  { lat: 30.0562, lng: 31.2394, name: 'Cairo Old City', count: 6 },
  { lat: 25.1972, lng: 55.2744, name: 'Dubai Marina', count: 5 },
  { lat: 24.6877, lng: 46.7219, name: 'Riyadh Old Quarter', count: 5 },
  { lat: 41.0082, lng: 28.9784, name: 'Istanbul Grand Bazaar', count: 6 },
  { lat: 48.8534, lng: 2.3488, name: 'Paris Catacombs', count: 4 },
  { lat: 51.5103, lng: -0.1185, name: 'London Underground', count: 4 },
  { lat: 40.7580, lng: -73.9855, name: 'New York Times Square', count: 5 },
  { lat: 35.6584, lng: 139.7454, name: 'Tokyo Shibuya', count: 5 },
  { lat: -33.8688, lng: 151.2093, name: 'Sydney Harbour', count: 4 },
  { lat: 55.7558, lng: 37.6173, name: 'Moscow Red Square', count: 4 },
  { lat: 1.2847, lng: 103.8610, name: 'Singapore CBD', count: 4 },
  { lat: 37.5665, lng: 126.978, name: 'Seoul Gangnam', count: 4 },
  { lat: 31.7683, lng: 35.2137, name: 'Jerusalem Old City', count: 5 },
  { lat: 21.4225, lng: 39.8262, name: 'Makkah Valley', count: 5 },
  { lat: 33.5138, lng: 36.2765, name: 'Damascus Umayyad', count: 4 },
  { lat: 36.8065, lng: 10.1815, name: 'Tunis Medina', count: 3 },
  { lat: 34.0209, lng: -6.8417, name: 'Rabat Kasbah', count: 3 },
  { lat: 28.6139, lng: 77.209, name: 'New Delhi Connaught', count: 4 },
  { lat: -23.5505, lng: -46.6333, name: 'São Paulo Centro', count: 3 },
  { lat: 19.4326, lng: -99.1332, name: 'Mexico City Zocalo', count: 3 },
];

export function generateTreasures(seed: number = 42): GeoTreasure[] {
  const rand = seededRandom(seed);
  const treasures: GeoTreasure[] = [];

  for (const region of TREASURE_REGIONS) {
    for (let i = 0; i < region.count; i++) {
      const lat = region.lat + (rand() - 0.5) * 0.4;
      const lng = region.lng + (rand() - 0.5) * 0.4;
      const roll = rand();

      let type: GeoTreasure['type'] = 'codes';
      let amount = Math.floor(rand() * 25) + 5;
      let difficulty = 1;

      if (roll < 0.05) {
        type = 'gold'; amount = 1; difficulty = 5;
      } else if (roll < 0.20) {
        type = 'silver'; amount = Math.floor(rand() * 3) + 1; difficulty = 3;
      } else {
        difficulty = Math.floor(rand() * 2) + 1;
      }

      treasures.push({
        id: `t-${region.name.replace(/\s+/g, '_')}-${i}`,
        lat, lng, type, amount, mined: false, difficulty,
        regionName: region.name,
      });
    }
  }
  return treasures;
}

const THIEF_NAMES = [
  'Shadow Fox', 'Dark Rider', 'Sand Viper', 'Night Hawk', 'Storm Wolf',
  'Iron Fist', 'Ghost Hand', 'Red Scorpion', 'Blue Phantom', 'Silver Blade',
  'Gold Hunter', 'Desert Eagle', 'Neon Serpent', 'Void Walker', 'Dust Devil',
];

export function generateThieves(treasures: GeoTreasure[], count: number = 15): GeoThief[] {
  const thieves: GeoThief[] = [];
  const types: GeoThief['type'][] = ['scout', 'brute', 'shadow'];
  const valuable = treasures.filter(t => t.type === 'gold' || t.type === 'silver');
  const sources = valuable.length > 0 ? valuable : treasures;

  for (let i = 0; i < count; i++) {
    const src = sources[i % sources.length];
    thieves.push({
      id: `thief-${i}`,
      lat: src.lat + (Math.random() - 0.5) * 0.5,
      lng: src.lng + (Math.random() - 0.5) * 0.5,
      speed: 0.0008 + Math.random() * 0.0015,
      type: types[i % 3],
      name: THIEF_NAMES[i % THIEF_NAMES.length],
      health: 50 + Math.floor(Math.random() * 50),
    });
  }
  return thieves;
}

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getTreasureColor(type: GeoTreasure['type']): string {
  switch (type) {
    case 'gold': return '#e8a820';
    case 'silver': return '#a0b0c8';
    case 'codes': return '#00e5ff';
  }
}

export function getThiefColor(type: GeoThief['type']): string {
  switch (type) {
    case 'scout': return '#ffd700';
    case 'brute': return '#ff4444';
    case 'shadow': return '#cc55ff';
  }
}

export function findSafeHomeNear(lat: number, lng: number, treasures: GeoTreasure[]): { lat: number; lng: number } {
  // Try to place home 5-15km from current position, away from treasures
  for (let attempt = 0; attempt < 200; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.05 + Math.random() * 0.12; // ~5-13km radius
    const candidateLat = lat + Math.cos(angle) * dist;
    const candidateLng = lng + Math.sin(angle) * dist;

    const tooClose = treasures.some(t =>
      getDistanceKm(candidateLat, candidateLng, t.lat, t.lng) < 2
    );

    if (!tooClose) return { lat: candidateLat, lng: candidateLng };
  }
  // Fallback: just push 8km north
  return { lat: lat + 0.08, lng };
}
