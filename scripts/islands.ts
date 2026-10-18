// The Islands: parts of a Country set apart from its mainland, carved out of it at build time
// (ADR 0003). Each one takes the Country's world-atlas 50m polygons that contain its points,
// and, for Alaska's scattered islands, every polygon whose centre is in its box.
//
// The ids are stable: the Journal stores them, so never rename one.

export type IslandSpec = {
  id: `i-${string}`;
  name: string;
  /** The Country's id in the Atlas (its ISO 3166-1 numeric code). */
  countryId: string;
  /** Points on land, lon and lat in degrees: one in each polygon of the Island. */
  points: [lon: number, lat: number][];
  /** West, south, east, north in degrees: every polygon centred inside belongs to the Island. */
  box?: [west: number, south: number, east: number, north: number];
};

export const ISLANDS: IslandSpec[] = [
  // France
  { id: 'i-corse', name: 'Corse', countryId: '250', points: [[9.1, 42.15]] },
  { id: 'i-guadeloupe', name: 'Guadeloupe', countryId: '250', points: [[-61.68, 16.15], [-61.45, 16.3]] },
  { id: 'i-martinique', name: 'Martinique', countryId: '250', points: [[-61.0, 14.65]] },
  { id: 'i-reunion', name: 'La Réunion', countryId: '250', points: [[55.53, -21.12]] },
  { id: 'i-mayotte', name: 'Mayotte', countryId: '250', points: [[45.15, -12.82]] },
  { id: 'i-guyane', name: 'Guyane', countryId: '250', points: [[-53.0, 4.0]] },
  // Espagne
  { id: 'i-majorque', name: 'Majorque', countryId: '724', points: [[2.95, 39.62]] },
  { id: 'i-minorque', name: 'Minorque', countryId: '724', points: [[4.1, 39.97]] },
  { id: 'i-ibiza', name: 'Ibiza', countryId: '724', points: [[1.4, 38.98]] },
  { id: 'i-formentera', name: 'Formentera', countryId: '724', points: [[1.45, 38.7]] },
  { id: 'i-tenerife', name: 'Tenerife', countryId: '724', points: [[-16.6, 28.27]] },
  { id: 'i-grande-canarie', name: 'Grande Canarie', countryId: '724', points: [[-15.6, 27.95]] },
  { id: 'i-lanzarote', name: 'Lanzarote', countryId: '724', points: [[-13.65, 29.03]] },
  { id: 'i-fuerteventura', name: 'Fuerteventura', countryId: '724', points: [[-14.0, 28.4]] },
  { id: 'i-la-palma', name: 'La Palma', countryId: '724', points: [[-17.85, 28.65]] },
  { id: 'i-la-gomera', name: 'La Gomera', countryId: '724', points: [[-17.23, 28.11]] },
  // Portugal
  { id: 'i-madere', name: 'Madère', countryId: '620', points: [[-16.95, 32.75]] },
  {
    id: 'i-acores',
    name: 'Açores',
    countryId: '620',
    points: [
      [-25.5, 37.78],
      [-27.2, 38.72],
      [-28.35, 38.47],
      [-28.04, 38.634],
      [-28.71, 38.58],
      [-31.2, 39.44],
      [-25.11, 36.98],
    ],
  },
  // Italie
  { id: 'i-sicile', name: 'Sicile', countryId: '380', points: [[14.2, 37.5]] },
  { id: 'i-sardaigne', name: 'Sardaigne', countryId: '380', points: [[9.0, 40.1]] },
  { id: 'i-elbe', name: 'Elbe', countryId: '380', points: [[10.25, 42.77]] },
  // Grèce
  { id: 'i-crete', name: 'Crète', countryId: '300', points: [[24.9, 35.25]] },
  { id: 'i-santorin', name: 'Santorin', countryId: '300', points: [[25.43, 36.42]] },
  { id: 'i-mykonos', name: 'Mykonos', countryId: '300', points: [[25.35, 37.45]] },
  { id: 'i-naxos', name: 'Naxos', countryId: '300', points: [[25.5, 37.05]] },
  { id: 'i-paros', name: 'Paros', countryId: '300', points: [[25.15, 37.07]] },
  { id: 'i-rhodes', name: 'Rhodes', countryId: '300', points: [[28.0, 36.2]] },
  { id: 'i-kos', name: 'Kos', countryId: '300', points: [[27.14, 36.83]] },
  { id: 'i-corfou', name: 'Corfou', countryId: '300', points: [[19.85, 39.62]] },
  { id: 'i-zante', name: 'Zante', countryId: '300', points: [[20.78, 37.78]] },
  { id: 'i-cephalonie', name: 'Céphalonie', countryId: '300', points: [[20.55, 38.2]] },
  { id: 'i-lesbos', name: 'Lesbos', countryId: '300', points: [[26.3, 39.3]] },
  // Croatie
  { id: 'i-hvar', name: 'Hvar', countryId: '191', points: [[16.65, 43.15]] },
  { id: 'i-brac', name: 'Brač', countryId: '191', points: [[16.65, 43.32]] },
  { id: 'i-korcula', name: 'Korčula', countryId: '191', points: [[16.9, 42.95]] },
  { id: 'i-krk', name: 'Krk', countryId: '191', points: [[14.6, 45.08]] },
  // Royaume-Uni
  { id: 'i-skye', name: 'Skye', countryId: '826', points: [[-6.2, 57.3]] },
  { id: 'i-lewis-et-harris', name: 'Lewis-et-Harris', countryId: '826', points: [[-6.6, 58.2]] },
  {
    id: 'i-orcades',
    name: 'Orcades',
    countryId: '826',
    points: [
      [-3.11, 59.01],
      [-3.3, 58.85],
      [-2.88, 59.26],
      [-2.54, 59.27],
      [-2.96, 58.8],
    ],
  },
  {
    id: 'i-shetland',
    name: 'Shetland',
    countryId: '826',
    points: [
      [-1.31, 60.3],
      [-1.08, 60.62],
      [-0.86, 60.76],
    ],
  },
  { id: 'i-wight', name: 'Île de Wight', countryId: '826', points: [[-1.3, 50.67]] },
  // Allemagne, Danemark, Suède, Estonie, Norvège
  { id: 'i-sylt', name: 'Sylt', countryId: '276', points: [[8.3, 54.9]] },
  { id: 'i-rugen', name: 'Rügen', countryId: '276', points: [[13.4, 54.4]] },
  { id: 'i-bornholm', name: 'Bornholm', countryId: '208', points: [[14.9, 55.12]] },
  { id: 'i-gotland', name: 'Gotland', countryId: '752', points: [[18.5, 57.5]] },
  { id: 'i-saaremaa', name: 'Saaremaa', countryId: '233', points: [[22.5, 58.4]] },
  {
    id: 'i-lofoten',
    name: 'Lofoten',
    countryId: '578',
    points: [
      [13.61, 68.16],
      [12.99, 67.95],
    ],
  },
  // Afrique, Moyen-Orient
  { id: 'i-djerba', name: 'Djerba', countryId: '788', points: [[10.9, 33.8]] },
  { id: 'i-zanzibar', name: 'Zanzibar', countryId: '834', points: [[39.3, -6.1]] },
  { id: 'i-pemba', name: 'Pemba', countryId: '834', points: [[39.75, -5.2]] },
  { id: 'i-nosy-be', name: 'Nosy Be', countryId: '450', points: [[48.27, -13.32]] },
  { id: 'i-socotra', name: 'Socotra', countryId: '887', points: [[53.9, 12.5]] },
  // Inde
  {
    id: 'i-andaman',
    name: 'Îles Andaman',
    countryId: '356',
    points: [
      [92.82, 12.53],
      [92.46, 10.7],
      [92.65, 11.42],
      [93.01, 11.98],
      [92.7, 12.9],
    ],
  },
  // Asie du Sud-Est
  { id: 'i-phuket', name: 'Phuket', countryId: '764', points: [[98.35, 7.95]] },
  { id: 'i-koh-samui', name: 'Koh Samui', countryId: '764', points: [[100.0, 9.5]] },
  { id: 'i-koh-phangan', name: 'Koh Phangan', countryId: '764', points: [[100.03, 9.75]] },
  { id: 'i-koh-chang', name: 'Koh Chang', countryId: '764', points: [[102.35, 12.05]] },
  { id: 'i-langkawi', name: 'Langkawi', countryId: '458', points: [[99.8, 6.35]] },
  { id: 'i-penang', name: 'Penang', countryId: '458', points: [[100.27, 5.4]] },
  { id: 'i-phu-quoc', name: 'Phú Quốc', countryId: '704', points: [[103.97, 10.25]] },
  {
    id: 'i-bali',
    name: 'Bali',
    countryId: '360',
    points: [
      [115.15, -8.4],
      [115.52, -8.73],
    ],
  },
  { id: 'i-lombok', name: 'Lombok', countryId: '360', points: [[116.3, -8.6]] },
  { id: 'i-flores', name: 'Flores', countryId: '360', points: [[121.0, -8.65]] },
  { id: 'i-komodo', name: 'Komodo', countryId: '360', points: [[119.48, -8.55]] },
  { id: 'i-palawan', name: 'Palawan', countryId: '608', points: [[118.6, 9.75]] },
  { id: 'i-cebu', name: 'Cebu', countryId: '608', points: [[123.85, 10.3]] },
  { id: 'i-bohol', name: 'Bohol', countryId: '608', points: [[124.2, 9.85]] },
  { id: 'i-siargao', name: 'Siargao', countryId: '608', points: [[126.05, 9.85]] },
  // Asie de l'Est
  { id: 'i-hainan', name: 'Hainan', countryId: '156', points: [[109.8, 19.2]] },
  { id: 'i-jeju', name: 'Jeju', countryId: '410', points: [[126.55, 33.38]] },
  { id: 'i-okinawa', name: 'Okinawa', countryId: '392', points: [[127.8, 26.35]] },
  { id: 'i-ishigaki', name: 'Ishigaki', countryId: '392', points: [[124.18, 24.42]] },
  { id: 'i-yakushima', name: 'Yakushima', countryId: '392', points: [[130.53, 30.35]] },
  // États-Unis: Maui with Molokai and Lanai (Maui County; Kahoolawe is not on the 50m map), Kauai with Niihau.
  { id: 'i-alaska', name: 'Alaska', countryId: '840', points: [[-150, 64]], box: [172, 50, -129, 72] },
  { id: 'i-oahu', name: 'Oahu', countryId: '840', points: [[-158.0, 21.48]] },
  {
    id: 'i-maui',
    name: 'Maui',
    countryId: '840',
    points: [
      [-156.3, 20.8],
      [-157.0, 21.13],
      [-156.93, 20.83],
    ],
  },
  { id: 'i-hawaii', name: 'Hawaï', countryId: '840', points: [[-155.5, 19.6]] },
  {
    id: 'i-kauai',
    name: 'Kauai',
    countryId: '840',
    points: [
      [-159.5, 22.05],
      [-160.15, 21.9],
    ],
  },
  // Canada
  { id: 'i-ile-du-prince-edouard', name: 'Île-du-Prince-Édouard', countryId: '124', points: [[-63.3, 46.35]] },
  { id: 'i-terre-neuve', name: 'Terre-Neuve', countryId: '124', points: [[-56.0, 48.8]] },
  { id: 'i-vancouver', name: 'Île de Vancouver', countryId: '124', points: [[-125.5, 49.6]] },
  // Amérique latine
  { id: 'i-cozumel', name: 'Cozumel', countryId: '484', points: [[-86.92, 20.42]] },
  { id: 'i-roatan', name: 'Roatán', countryId: '340', points: [[-86.55, 16.35]] },
  { id: 'i-margarita', name: 'Margarita', countryId: '862', points: [[-63.9, 11.0]] },
  { id: 'i-tobago', name: 'Tobago', countryId: '780', points: [[-60.7, 11.25]] },
  {
    id: 'i-galapagos',
    name: 'Galápagos',
    countryId: '218',
    points: [
      [-91.05, -0.8],
      [-90.36, -0.63],
      [-91.52, -0.37],
      [-89.43, -0.82],
      [-90.71, -0.27],
      [-90.45, -1.29],
    ],
  },
  { id: 'i-chiloe', name: 'Chiloé', countryId: '152', points: [[-73.9, -42.6]] },
  { id: 'i-ile-de-paques', name: 'Île de Pâques', countryId: '152', points: [[-109.35, -27.12]] },
  // The Argentine half of Tierra del Fuego, with Isla de los Estados off its tip.
  {
    id: 'i-terre-de-feu',
    name: 'Terre de Feu',
    countryId: '032',
    points: [
      [-67.8, -54.2],
      [-64.3, -54.78],
    ],
  },
  // Australie
  { id: 'i-tasmanie', name: 'Tasmanie', countryId: '036', points: [[146.6, -42.0]] },
  { id: 'i-kangaroo-island', name: 'Kangaroo Island', countryId: '036', points: [[137.2, -35.8]] },
  { id: 'i-kgari', name: "K'gari", countryId: '036', points: [[153.1, -25.25]] },
];
