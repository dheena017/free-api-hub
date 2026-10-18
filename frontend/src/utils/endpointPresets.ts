import { ApiItem } from '../types/api';

export interface EndpointPreset {
  id: string;
  label: string;
  description: string;
  method: string;
  endpoint: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  badge?: string;
}

const PRESETS_BY_SLUG: Record<string, EndpointPreset[]> = {
  dummyjson: [
    {
      id: 'single-product',
      label: 'Single Product (ID: 1)',
      description: 'Fetch detailed product attributes including gallery images and ratings',
      method: 'GET',
      endpoint: '/products/1',
      badge: 'Popular'
    },
    {
      id: 'list-products',
      label: 'List Products (10 items)',
      description: 'Paginated product catalog query with custom limit and skip offset',
      method: 'GET',
      endpoint: '/products',
      params: { limit: '10', skip: '0' },
      badge: 'Paginated'
    },
    {
      id: 'search-products',
      label: 'Search Products (?q=phone)',
      description: 'Full-text keyword search across products catalog',
      method: 'GET',
      endpoint: '/products/search',
      params: { q: 'phone' },
      badge: 'Search'
    },
    {
      id: 'all-categories',
      label: 'All Categories List',
      description: 'Get list of available e-commerce product categories',
      method: 'GET',
      endpoint: '/products/categories'
    },
    {
      id: 'category-smartphones',
      label: 'Category "smartphones"',
      description: 'Filter items by a specific category taxonomy',
      method: 'GET',
      endpoint: '/products/category/smartphones'
    },
    {
      id: 'add-product',
      label: 'Add New Product (POST)',
      description: 'Simulate creating a new item with JSON body payload',
      method: 'POST',
      endpoint: '/products/add',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        {
          title: 'Mechanical Gaming Keyboard',
          price: 89.99,
          stock: 45,
          brand: 'KeyForge',
          category: 'laptops'
        },
        null,
        2
      ),
      badge: 'POST Body'
    },
    {
      id: 'user-profile',
      label: 'User Profile (ID: 1)',
      description: 'Get user credentials, contact, address, and bank fixtures',
      method: 'GET',
      endpoint: '/users/1'
    },
    {
      id: 'random-quote',
      label: 'Random Quote',
      description: 'Fetch motivational or famous quote with author',
      method: 'GET',
      endpoint: '/quotes/random'
    }
  ],
  pokeapi: [
    {
      id: 'ditto',
      label: 'Ditto (#132)',
      description: 'Complete data including moves, sprites, abilities, and base stats',
      method: 'GET',
      endpoint: '/api/v2/pokemon/ditto',
      badge: 'Popular'
    },
    {
      id: 'pikachu',
      label: 'Pikachu (#25)',
      description: 'Inspect Pikachu species data and evolution trigger requirements',
      method: 'GET',
      endpoint: '/api/v2/pokemon/pikachu'
    },
    {
      id: 'list-pokemon',
      label: 'List 10 Pokémon',
      description: 'Paginated endpoint for browsing the Pokédex sequentially',
      method: 'GET',
      endpoint: '/api/v2/pokemon',
      params: { limit: '10', offset: '0' },
      badge: 'Paginated'
    },
    {
      id: 'ability-blaze',
      label: 'Ability "Blaze"',
      description: 'Query battle ability effects and affected Pokémon list',
      method: 'GET',
      endpoint: '/api/v2/ability/blaze'
    }
  ],
  'open-meteo': [
    {
      id: 'berlin-current',
      label: 'Berlin Current Weather',
      description: 'Real-time temperature, wind speed, and meteorological code',
      method: 'GET',
      endpoint: '/v1/forecast',
      params: { latitude: '52.52', longitude: '13.41', current_weather: 'true' },
      badge: 'Popular'
    },
    {
      id: 'tokyo-hourly',
      label: 'Tokyo Hourly Forecast',
      description: 'Multi-variable hourly temperature and wind speed predictions',
      method: 'GET',
      endpoint: '/v1/forecast',
      params: {
        latitude: '35.68',
        longitude: '139.76',
        current_weather: 'true',
        hourly: 'temperature_2m,windspeed_10m'
      }
    },
    {
      id: 'ny-daily',
      label: 'New York 7-Day Highs/Lows',
      description: 'Daily maximum and minimum temperatures with time zone normalization',
      method: 'GET',
      endpoint: '/v1/forecast',
      params: {
        latitude: '40.71',
        longitude: '-74.01',
        daily: 'temperature_2m_max,temperature_2m_min',
        timezone: 'America/New_York'
      }
    }
  ],
  'frankfurter-rates': [
    {
      id: 'latest-eur',
      label: 'Latest Base EUR Rates',
      description: 'Exchange rates for all European Central Bank supported currencies',
      method: 'GET',
      endpoint: '/latest',
      badge: 'Live Forex'
    },
    {
      id: 'usd-to-eur-gbp',
      label: 'USD to EUR, GBP, JPY',
      description: 'Targeted multi-currency quote with base USD',
      method: 'GET',
      endpoint: '/latest',
      params: { from: 'USD', to: 'EUR,GBP,JPY' }
    },
    {
      id: 'historical-date',
      label: 'Historical Rates (2020-01-01)',
      description: 'Lookup archived currency parity on specific calendar day',
      method: 'GET',
      endpoint: '/2020-01-01',
      params: { from: 'USD' }
    }
  ],
  'rest-countries': [
    {
      id: 'europe',
      label: 'All European Countries',
      description: 'Curated dataset of European sovereign nations with flags and currencies',
      method: 'GET',
      endpoint: '/v3.1/region/europe',
      badge: 'Geo'
    },
    {
      id: 'search-france',
      label: 'Search Country "France"',
      description: 'Detailed demographic, capital city, coordinates, and calling code',
      method: 'GET',
      endpoint: '/v3.1/name/france'
    },
    {
      id: 'currency-usd',
      label: 'Countries using USD Currency',
      description: 'List territories that adopt United States Dollar as legal tender',
      method: 'GET',
      endpoint: '/v3.1/currency/usd'
    }
  ]
};

/**
 * Get endpoint presets for any API item
 */
export function getEndpointPresets(api: ApiItem): EndpointPreset[] {
  if (PRESETS_BY_SLUG[api.slug]) {
    return PRESETS_BY_SLUG[api.slug];
  }

  // Fallback defaults from api model
  const presets: EndpointPreset[] = [
    {
      id: 'default-sample',
      label: 'Default Sample Endpoint',
      description: `Primary verified endpoint: ${api.sample_endpoint}`,
      method: api.method || 'GET',
      endpoint: api.sample_endpoint.startsWith('/') ? api.sample_endpoint : `/${api.sample_endpoint}`,
      params: api.default_params,
      headers: api.default_headers,
      badge: 'Default'
    }
  ];

  // If there are default params, provide an unconstrained version too
  if (api.default_params && Object.keys(api.default_params).length > 0) {
    presets.push({
      id: 'clean-endpoint',
      label: 'Clean Base Endpoint',
      description: 'Query endpoint without custom parameters',
      method: api.method || 'GET',
      endpoint: api.sample_endpoint.split('?')[0].startsWith('/')
        ? api.sample_endpoint.split('?')[0]
        : `/${api.sample_endpoint.split('?')[0]}`
    });
  }

  return presets;
}
