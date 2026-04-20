/**
 * Curated list of ~140 major world cities for Land Atlas drill-down.
 *
 * When a user clicks a country in Earth Mode, we show these cities as pins
 * so they can zoom into a specific city before buying parcels. Keeps the
 * "god's-eye → country → city → parcel" hierarchy tractable without bundling
 * the full 1MB+ Natural Earth cities GeoJSON.
 *
 * countryId matches the ISO numeric code used as `feature.id` in
 * public/world-110m.json (e.g. USA = '840'), and also accepts ISO alpha-3
 * ('USA') as a fallback — the hit-test does both.
 */

export interface City {
  name: string
  countryIso: string    // ISO alpha-3, e.g. 'USA'
  countryId: string     // ISO numeric, matches world-110m.json feature.id (as string)
  lat: number
  lng: number
  population: number    // approx, for pin sizing
}

export const WORLD_CITIES: City[] = [
  // ─── USA (840) ───────────────────────────────────────────
  { name: 'New York', countryIso: 'USA', countryId: '840', lat: 40.7128, lng: -74.0060, population: 8_400_000 },
  { name: 'Los Angeles', countryIso: 'USA', countryId: '840', lat: 34.0522, lng: -118.2437, population: 3_900_000 },
  { name: 'Chicago', countryIso: 'USA', countryId: '840', lat: 41.8781, lng: -87.6298, population: 2_700_000 },
  { name: 'Houston', countryIso: 'USA', countryId: '840', lat: 29.7604, lng: -95.3698, population: 2_300_000 },
  { name: 'Phoenix', countryIso: 'USA', countryId: '840', lat: 33.4484, lng: -112.0740, population: 1_700_000 },
  { name: 'Philadelphia', countryIso: 'USA', countryId: '840', lat: 39.9526, lng: -75.1652, population: 1_600_000 },
  { name: 'San Antonio', countryIso: 'USA', countryId: '840', lat: 29.4241, lng: -98.4936, population: 1_500_000 },
  { name: 'San Diego', countryIso: 'USA', countryId: '840', lat: 32.7157, lng: -117.1611, population: 1_400_000 },
  { name: 'Dallas', countryIso: 'USA', countryId: '840', lat: 32.7767, lng: -96.7970, population: 1_300_000 },
  { name: 'San Jose', countryIso: 'USA', countryId: '840', lat: 37.3382, lng: -121.8863, population: 1_000_000 },
  { name: 'San Francisco', countryIso: 'USA', countryId: '840', lat: 37.7749, lng: -122.4194, population: 870_000 },
  { name: 'Seattle', countryIso: 'USA', countryId: '840', lat: 47.6062, lng: -122.3321, population: 740_000 },
  { name: 'Denver', countryIso: 'USA', countryId: '840', lat: 39.7392, lng: -104.9903, population: 720_000 },
  { name: 'Boston', countryIso: 'USA', countryId: '840', lat: 42.3601, lng: -71.0589, population: 690_000 },
  { name: 'Atlanta', countryIso: 'USA', countryId: '840', lat: 33.7490, lng: -84.3880, population: 500_000 },
  { name: 'Miami', countryIso: 'USA', countryId: '840', lat: 25.7617, lng: -80.1918, population: 470_000 },
  { name: 'Washington DC', countryIso: 'USA', countryId: '840', lat: 38.9072, lng: -77.0369, population: 700_000 },
  { name: 'Austin', countryIso: 'USA', countryId: '840', lat: 30.2672, lng: -97.7431, population: 965_000 },
  { name: 'Las Vegas', countryIso: 'USA', countryId: '840', lat: 36.1699, lng: -115.1398, population: 650_000 },
  { name: 'Portland', countryIso: 'USA', countryId: '840', lat: 45.5152, lng: -122.6784, population: 650_000 },
  { name: 'Detroit', countryIso: 'USA', countryId: '840', lat: 42.3314, lng: -83.0458, population: 640_000 },
  { name: 'Nashville', countryIso: 'USA', countryId: '840', lat: 36.1627, lng: -86.7816, population: 690_000 },
  { name: 'New Orleans', countryIso: 'USA', countryId: '840', lat: 29.9511, lng: -90.0715, population: 380_000 },
  { name: 'Honolulu', countryIso: 'USA', countryId: '840', lat: 21.3069, lng: -157.8583, population: 350_000 },
  { name: 'Anchorage', countryIso: 'USA', countryId: '840', lat: 61.2181, lng: -149.9003, population: 290_000 },

  // ─── Canada (124) ───────────────────────────────────────
  { name: 'Toronto', countryIso: 'CAN', countryId: '124', lat: 43.6532, lng: -79.3832, population: 2_900_000 },
  { name: 'Montreal', countryIso: 'CAN', countryId: '124', lat: 45.5017, lng: -73.5673, population: 1_700_000 },
  { name: 'Vancouver', countryIso: 'CAN', countryId: '124', lat: 49.2827, lng: -123.1207, population: 675_000 },
  { name: 'Calgary', countryIso: 'CAN', countryId: '124', lat: 51.0447, lng: -114.0719, population: 1_300_000 },
  { name: 'Ottawa', countryIso: 'CAN', countryId: '124', lat: 45.4215, lng: -75.6972, population: 1_000_000 },
  { name: 'Edmonton', countryIso: 'CAN', countryId: '124', lat: 53.5461, lng: -113.4938, population: 980_000 },

  // ─── Mexico (484) ───────────────────────────────────────
  { name: 'Mexico City', countryIso: 'MEX', countryId: '484', lat: 19.4326, lng: -99.1332, population: 9_200_000 },
  { name: 'Guadalajara', countryIso: 'MEX', countryId: '484', lat: 20.6597, lng: -103.3496, population: 1_400_000 },
  { name: 'Monterrey', countryIso: 'MEX', countryId: '484', lat: 25.6866, lng: -100.3161, population: 1_100_000 },
  { name: 'Cancún', countryIso: 'MEX', countryId: '484', lat: 21.1619, lng: -86.8515, population: 890_000 },

  // ─── Brazil (076) ───────────────────────────────────────
  { name: 'São Paulo', countryIso: 'BRA', countryId: '076', lat: -23.5505, lng: -46.6333, population: 12_300_000 },
  { name: 'Rio de Janeiro', countryIso: 'BRA', countryId: '076', lat: -22.9068, lng: -43.1729, population: 6_700_000 },
  { name: 'Brasília', countryIso: 'BRA', countryId: '076', lat: -15.8267, lng: -47.9218, population: 3_000_000 },
  { name: 'Salvador', countryIso: 'BRA', countryId: '076', lat: -12.9714, lng: -38.5014, population: 2_900_000 },
  { name: 'Belo Horizonte', countryIso: 'BRA', countryId: '076', lat: -19.9167, lng: -43.9345, population: 2_500_000 },

  // ─── Argentina (032) ─────────────────────────────────────
  { name: 'Buenos Aires', countryIso: 'ARG', countryId: '032', lat: -34.6037, lng: -58.3816, population: 3_000_000 },
  { name: 'Córdoba', countryIso: 'ARG', countryId: '032', lat: -31.4201, lng: -64.1888, population: 1_400_000 },

  // ─── Peru (604) ──────────────────────────────────────────
  { name: 'Lima', countryIso: 'PER', countryId: '604', lat: -12.0464, lng: -77.0428, population: 9_700_000 },

  // ─── Chile (152) ─────────────────────────────────────────
  { name: 'Santiago', countryIso: 'CHL', countryId: '152', lat: -33.4489, lng: -70.6693, population: 6_700_000 },

  // ─── Colombia (170) ──────────────────────────────────────
  { name: 'Bogotá', countryIso: 'COL', countryId: '170', lat: 4.7110, lng: -74.0721, population: 7_400_000 },
  { name: 'Medellín', countryIso: 'COL', countryId: '170', lat: 6.2442, lng: -75.5812, population: 2_500_000 },

  // ─── UK (826) ────────────────────────────────────────────
  { name: 'London', countryIso: 'GBR', countryId: '826', lat: 51.5074, lng: -0.1278, population: 9_000_000 },
  { name: 'Manchester', countryIso: 'GBR', countryId: '826', lat: 53.4808, lng: -2.2426, population: 550_000 },
  { name: 'Birmingham', countryIso: 'GBR', countryId: '826', lat: 52.4862, lng: -1.8904, population: 1_140_000 },
  { name: 'Edinburgh', countryIso: 'GBR', countryId: '826', lat: 55.9533, lng: -3.1883, population: 540_000 },
  { name: 'Glasgow', countryIso: 'GBR', countryId: '826', lat: 55.8642, lng: -4.2518, population: 630_000 },
  { name: 'Liverpool', countryIso: 'GBR', countryId: '826', lat: 53.4084, lng: -2.9916, population: 500_000 },

  // ─── France (250) ────────────────────────────────────────
  { name: 'Paris', countryIso: 'FRA', countryId: '250', lat: 48.8566, lng: 2.3522, population: 2_100_000 },
  { name: 'Marseille', countryIso: 'FRA', countryId: '250', lat: 43.2965, lng: 5.3698, population: 870_000 },
  { name: 'Lyon', countryIso: 'FRA', countryId: '250', lat: 45.7640, lng: 4.8357, population: 520_000 },
  { name: 'Nice', countryIso: 'FRA', countryId: '250', lat: 43.7102, lng: 7.2620, population: 340_000 },

  // ─── Germany (276) ───────────────────────────────────────
  { name: 'Berlin', countryIso: 'DEU', countryId: '276', lat: 52.5200, lng: 13.4050, population: 3_700_000 },
  { name: 'Munich', countryIso: 'DEU', countryId: '276', lat: 48.1351, lng: 11.5820, population: 1_500_000 },
  { name: 'Hamburg', countryIso: 'DEU', countryId: '276', lat: 53.5511, lng: 9.9937, population: 1_900_000 },
  { name: 'Frankfurt', countryIso: 'DEU', countryId: '276', lat: 50.1109, lng: 8.6821, population: 760_000 },
  { name: 'Cologne', countryIso: 'DEU', countryId: '276', lat: 50.9375, lng: 6.9603, population: 1_100_000 },

  // ─── Italy (380) ─────────────────────────────────────────
  { name: 'Rome', countryIso: 'ITA', countryId: '380', lat: 41.9028, lng: 12.4964, population: 2_900_000 },
  { name: 'Milan', countryIso: 'ITA', countryId: '380', lat: 45.4642, lng: 9.1900, population: 1_400_000 },
  { name: 'Naples', countryIso: 'ITA', countryId: '380', lat: 40.8518, lng: 14.2681, population: 950_000 },
  { name: 'Venice', countryIso: 'ITA', countryId: '380', lat: 45.4408, lng: 12.3155, population: 260_000 },
  { name: 'Florence', countryIso: 'ITA', countryId: '380', lat: 43.7696, lng: 11.2558, population: 380_000 },

  // ─── Spain (724) ─────────────────────────────────────────
  { name: 'Madrid', countryIso: 'ESP', countryId: '724', lat: 40.4168, lng: -3.7038, population: 3_300_000 },
  { name: 'Barcelona', countryIso: 'ESP', countryId: '724', lat: 41.3874, lng: 2.1686, population: 1_600_000 },
  { name: 'Valencia', countryIso: 'ESP', countryId: '724', lat: 39.4699, lng: -0.3763, population: 790_000 },
  { name: 'Seville', countryIso: 'ESP', countryId: '724', lat: 37.3891, lng: -5.9845, population: 690_000 },

  // ─── Netherlands (528) ───────────────────────────────────
  { name: 'Amsterdam', countryIso: 'NLD', countryId: '528', lat: 52.3676, lng: 4.9041, population: 870_000 },
  { name: 'Rotterdam', countryIso: 'NLD', countryId: '528', lat: 51.9225, lng: 4.4792, population: 650_000 },

  // ─── Russia (643) ────────────────────────────────────────
  { name: 'Moscow', countryIso: 'RUS', countryId: '643', lat: 55.7558, lng: 37.6173, population: 12_500_000 },
  { name: 'Saint Petersburg', countryIso: 'RUS', countryId: '643', lat: 59.9311, lng: 30.3609, population: 5_400_000 },

  // ─── Poland (616) ────────────────────────────────────────
  { name: 'Warsaw', countryIso: 'POL', countryId: '616', lat: 52.2297, lng: 21.0122, population: 1_800_000 },
  { name: 'Kraków', countryIso: 'POL', countryId: '616', lat: 50.0647, lng: 19.9450, population: 780_000 },

  // ─── Other Europe ────────────────────────────────────────
  { name: 'Vienna', countryIso: 'AUT', countryId: '040', lat: 48.2082, lng: 16.3738, population: 1_900_000 },
  { name: 'Zurich', countryIso: 'CHE', countryId: '756', lat: 47.3769, lng: 8.5417, population: 430_000 },
  { name: 'Geneva', countryIso: 'CHE', countryId: '756', lat: 46.2044, lng: 6.1432, population: 200_000 },
  { name: 'Brussels', countryIso: 'BEL', countryId: '056', lat: 50.8503, lng: 4.3517, population: 1_200_000 },
  { name: 'Copenhagen', countryIso: 'DNK', countryId: '208', lat: 55.6761, lng: 12.5683, population: 660_000 },
  { name: 'Stockholm', countryIso: 'SWE', countryId: '752', lat: 59.3293, lng: 18.0686, population: 980_000 },
  { name: 'Oslo', countryIso: 'NOR', countryId: '578', lat: 59.9139, lng: 10.7522, population: 700_000 },
  { name: 'Helsinki', countryIso: 'FIN', countryId: '246', lat: 60.1699, lng: 24.9384, population: 660_000 },
  { name: 'Dublin', countryIso: 'IRL', countryId: '372', lat: 53.3498, lng: -6.2603, population: 560_000 },
  { name: 'Lisbon', countryIso: 'PRT', countryId: '620', lat: 38.7223, lng: -9.1393, population: 550_000 },
  { name: 'Athens', countryIso: 'GRC', countryId: '300', lat: 37.9838, lng: 23.7275, population: 660_000 },
  { name: 'Istanbul', countryIso: 'TUR', countryId: '792', lat: 41.0082, lng: 28.9784, population: 15_500_000 },
  { name: 'Ankara', countryIso: 'TUR', countryId: '792', lat: 39.9334, lng: 32.8597, population: 5_700_000 },
  { name: 'Prague', countryIso: 'CZE', countryId: '203', lat: 50.0755, lng: 14.4378, population: 1_300_000 },
  { name: 'Budapest', countryIso: 'HUN', countryId: '348', lat: 47.4979, lng: 19.0402, population: 1_750_000 },
  { name: 'Bucharest', countryIso: 'ROU', countryId: '642', lat: 44.4268, lng: 26.1025, population: 1_800_000 },

  // ─── China (156) ─────────────────────────────────────────
  { name: 'Beijing', countryIso: 'CHN', countryId: '156', lat: 39.9042, lng: 116.4074, population: 21_500_000 },
  { name: 'Shanghai', countryIso: 'CHN', countryId: '156', lat: 31.2304, lng: 121.4737, population: 24_900_000 },
  { name: 'Guangzhou', countryIso: 'CHN', countryId: '156', lat: 23.1291, lng: 113.2644, population: 15_300_000 },
  { name: 'Shenzhen', countryIso: 'CHN', countryId: '156', lat: 22.5431, lng: 114.0579, population: 12_500_000 },
  { name: 'Chengdu', countryIso: 'CHN', countryId: '156', lat: 30.5728, lng: 104.0668, population: 16_000_000 },
  { name: 'Hong Kong', countryIso: 'HKG', countryId: '344', lat: 22.3193, lng: 114.1694, population: 7_500_000 },

  // ─── Japan (392) ─────────────────────────────────────────
  { name: 'Tokyo', countryIso: 'JPN', countryId: '392', lat: 35.6762, lng: 139.6503, population: 13_900_000 },
  { name: 'Osaka', countryIso: 'JPN', countryId: '392', lat: 34.6937, lng: 135.5023, population: 2_700_000 },
  { name: 'Kyoto', countryIso: 'JPN', countryId: '392', lat: 35.0116, lng: 135.7681, population: 1_500_000 },
  { name: 'Yokohama', countryIso: 'JPN', countryId: '392', lat: 35.4437, lng: 139.6380, population: 3_700_000 },
  { name: 'Sapporo', countryIso: 'JPN', countryId: '392', lat: 43.0618, lng: 141.3545, population: 1_960_000 },

  // ─── South Korea (410) ────────────────────────────────────
  { name: 'Seoul', countryIso: 'KOR', countryId: '410', lat: 37.5665, lng: 126.9780, population: 9_700_000 },
  { name: 'Busan', countryIso: 'KOR', countryId: '410', lat: 35.1796, lng: 129.0756, population: 3_400_000 },

  // ─── India (356) ─────────────────────────────────────────
  { name: 'Mumbai', countryIso: 'IND', countryId: '356', lat: 19.0760, lng: 72.8777, population: 20_400_000 },
  { name: 'Delhi', countryIso: 'IND', countryId: '356', lat: 28.7041, lng: 77.1025, population: 19_000_000 },
  { name: 'Bangalore', countryIso: 'IND', countryId: '356', lat: 12.9716, lng: 77.5946, population: 13_200_000 },
  { name: 'Kolkata', countryIso: 'IND', countryId: '356', lat: 22.5726, lng: 88.3639, population: 14_800_000 },
  { name: 'Chennai', countryIso: 'IND', countryId: '356', lat: 13.0827, lng: 80.2707, population: 11_000_000 },
  { name: 'Hyderabad', countryIso: 'IND', countryId: '356', lat: 17.3850, lng: 78.4867, population: 10_000_000 },

  // ─── SE Asia ─────────────────────────────────────────────
  { name: 'Singapore', countryIso: 'SGP', countryId: '702', lat: 1.3521, lng: 103.8198, population: 5_900_000 },
  { name: 'Bangkok', countryIso: 'THA', countryId: '764', lat: 13.7563, lng: 100.5018, population: 10_500_000 },
  { name: 'Kuala Lumpur', countryIso: 'MYS', countryId: '458', lat: 3.1390, lng: 101.6869, population: 1_800_000 },
  { name: 'Jakarta', countryIso: 'IDN', countryId: '360', lat: -6.2088, lng: 106.8456, population: 10_600_000 },
  { name: 'Manila', countryIso: 'PHL', countryId: '608', lat: 14.5995, lng: 120.9842, population: 1_800_000 },
  { name: 'Ho Chi Minh City', countryIso: 'VNM', countryId: '704', lat: 10.8231, lng: 106.6297, population: 9_000_000 },
  { name: 'Hanoi', countryIso: 'VNM', countryId: '704', lat: 21.0285, lng: 105.8542, population: 8_000_000 },

  // ─── Middle East ─────────────────────────────────────────
  { name: 'Dubai', countryIso: 'ARE', countryId: '784', lat: 25.2048, lng: 55.2708, population: 3_400_000 },
  { name: 'Abu Dhabi', countryIso: 'ARE', countryId: '784', lat: 24.4539, lng: 54.3773, population: 1_500_000 },
  { name: 'Riyadh', countryIso: 'SAU', countryId: '682', lat: 24.7136, lng: 46.6753, population: 7_000_000 },
  { name: 'Jeddah', countryIso: 'SAU', countryId: '682', lat: 21.4858, lng: 39.1925, population: 4_700_000 },
  { name: 'Tel Aviv', countryIso: 'ISR', countryId: '376', lat: 32.0853, lng: 34.7818, population: 460_000 },
  { name: 'Jerusalem', countryIso: 'ISR', countryId: '376', lat: 31.7683, lng: 35.2137, population: 940_000 },
  { name: 'Doha', countryIso: 'QAT', countryId: '634', lat: 25.2854, lng: 51.5310, population: 2_400_000 },
  { name: 'Tehran', countryIso: 'IRN', countryId: '364', lat: 35.6892, lng: 51.3890, population: 9_000_000 },

  // ─── Africa ──────────────────────────────────────────────
  { name: 'Cairo', countryIso: 'EGY', countryId: '818', lat: 30.0444, lng: 31.2357, population: 10_200_000 },
  { name: 'Lagos', countryIso: 'NGA', countryId: '566', lat: 6.5244, lng: 3.3792, population: 15_400_000 },
  { name: 'Johannesburg', countryIso: 'ZAF', countryId: '710', lat: -26.2041, lng: 28.0473, population: 5_600_000 },
  { name: 'Cape Town', countryIso: 'ZAF', countryId: '710', lat: -33.9249, lng: 18.4241, population: 4_600_000 },
  { name: 'Nairobi', countryIso: 'KEN', countryId: '404', lat: -1.2921, lng: 36.8219, population: 4_400_000 },
  { name: 'Casablanca', countryIso: 'MAR', countryId: '504', lat: 33.5731, lng: -7.5898, population: 3_400_000 },
  { name: 'Addis Ababa', countryIso: 'ETH', countryId: '231', lat: 9.0300, lng: 38.7400, population: 5_000_000 },
  { name: 'Accra', countryIso: 'GHA', countryId: '288', lat: 5.6037, lng: -0.1870, population: 2_400_000 },

  // ─── Oceania ─────────────────────────────────────────────
  { name: 'Sydney', countryIso: 'AUS', countryId: '036', lat: -33.8688, lng: 151.2093, population: 5_300_000 },
  { name: 'Melbourne', countryIso: 'AUS', countryId: '036', lat: -37.8136, lng: 144.9631, population: 5_000_000 },
  { name: 'Brisbane', countryIso: 'AUS', countryId: '036', lat: -27.4698, lng: 153.0251, population: 2_600_000 },
  { name: 'Perth', countryIso: 'AUS', countryId: '036', lat: -31.9505, lng: 115.8605, population: 2_100_000 },
  { name: 'Auckland', countryIso: 'NZL', countryId: '554', lat: -36.8485, lng: 174.7633, population: 1_600_000 },
  { name: 'Wellington', countryIso: 'NZL', countryId: '554', lat: -41.2865, lng: 174.7762, population: 420_000 },
]

export function getCitiesForCountry(countryId: string | null | undefined): City[] {
  if (!countryId) return []
  const idStr = String(countryId)
  return WORLD_CITIES.filter(c => c.countryId === idStr || c.countryIso === idStr)
}

// City-level bounds — approximated as a ~0.25° square around the center.
// Zoom level enough to pick individual parcels but still see adjacent blocks.
export function cityBounds(city: City) {
  const r = 0.18
  return { minLng: city.lng - r, maxLng: city.lng + r, minLat: city.lat - r, maxLat: city.lat + r }
}
