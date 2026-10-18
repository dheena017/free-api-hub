import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "apis.json"

CURATED_DATA = {
    "coinpaprika": {
        "endpoints": [
            {
                "id": "ticker-btc",
                "name": "Get Ticker by ID (Bitcoin)",
                "path": "/v1/tickers/btc-bitcoin",
                "method": "GET",
                "description": "Fetch real-time spot price, 24h volume, and market metrics for Bitcoin",
                "badge": "Verified"
            },
            {
                "id": "tickers-list",
                "name": "List Top Cryptocurrencies",
                "path": "/v1/tickers",
                "method": "GET",
                "description": "Paginated list of top active market cryptocurrencies with valuations and price changes",
                "params": {"limit": "15"},
                "badge": "Top Market"
            },
            {
                "id": "global-stats",
                "name": "Global Market Overview",
                "path": "/v1/global",
                "method": "GET",
                "description": "Total cryptocurrency market capitalization, 24h trading volume, and Bitcoin dominance",
                "badge": "Global Stats"
            },
            {
                "id": "coins-directory",
                "name": "List Supported Coins",
                "path": "/v1/coins",
                "method": "GET",
                "description": "Directory of all coins available on CoinPaprika with symbols, names, and rankings",
                "badge": "Asset Directory"
            },
            {
                "id": "exchanges-list",
                "name": "Crypto Exchanges Directory",
                "path": "/v1/exchanges",
                "method": "GET",
                "description": "Catalog of major digital asset spot and derivative trading exchanges",
                "badge": "Exchanges"
            }
        ],
        "use_cases": [
            "Real-time cryptocurrency portfolio valuation and multi-currency tracking",
            "Automated price alert bots and Discord/Telegram market monitoring channels",
            "DeFi dashboards, global market cap widgets, and Bitcoin dominance charts"
        ],
        "features": [
            "Over 30,000 indexed tokens and fiat conversion pairs",
            "Sub-150ms average global latency response",
            "Zero API key required for public market endpoints",
            "Full CORS enabled for direct browser client requests"
        ],
        "rate_limit": "Free public tier: 300 requests/minute without authentication."
    },
    "open-meteo": {
        "endpoints": [
            {
                "id": "hourly-forecast",
                "name": "Current Weather & Hourly Forecast",
                "path": "/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true&hourly=temperature_2m,relative_humidity_2m",
                "method": "GET",
                "description": "Accurate meteorological forecast for Berlin with current temperature and hourly humidity",
                "badge": "Live Forecast"
            },
            {
                "id": "daily-forecast",
                "name": "Daily 7-Day Forecast (NYC)",
                "path": "/v1/forecast?latitude=40.71&longitude=-74.01&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=America%2FNew_York",
                "method": "GET",
                "description": "7-day daily high/low temperatures and weather conditions for New York City",
                "badge": "7-Day Daily"
            },
            {
                "id": "air-quality",
                "name": "Air Quality Index (Berlin)",
                "path": "/v1/air-quality?latitude=52.52&longitude=13.41&current=european_aqi,pm10,pm2_5",
                "method": "GET",
                "description": "Atmospheric air quality, particulate matter, and pollen metrics",
                "badge": "Air Quality"
            },
            {
                "id": "historical-weather",
                "name": "Historical Climate Telemetry (Tokyo)",
                "path": "/v1/forecast?latitude=35.68&longitude=139.76&past_days=7&hourly=temperature_2m",
                "method": "GET",
                "description": "Past 7 days hourly climate readings for Tokyo",
                "badge": "Historical"
            }
        ],
        "use_cases": [
            "Hyper-local weather forecasting widgets for web and mobile applications",
            "Agricultural irrigation scheduling and solar radiation modeling",
            "Outdoor travel planning, sports event logistics, and climate telemetry analysis"
        ],
        "features": [
            "High-resolution global weather models (DWD ICON, NOAA GFS, ECMWF)",
            "Sub-hourly update intervals with 16-day forecast horizon",
            "100% open-source and free for non-commercial and developer use",
            "No API key or registration required"
        ],
        "rate_limit": "Free access: Up to 10,000 daily API calls for non-commercial applications."
    },
    "pokeapi": {
        "endpoints": [
            {
                "id": "ditto-detail",
                "name": "Get Pokémon Details (Ditto)",
                "path": "/api/v2/pokemon/ditto",
                "method": "GET",
                "description": "Full attributes, abilities, stats, sprites, and types for Ditto",
                "badge": "Pokemon Info"
            },
            {
                "id": "pokemon-list",
                "name": "List All Pokémon",
                "path": "/api/v2/pokemon",
                "method": "GET",
                "description": "Paginated index of all Pokémon species across all generations",
                "params": {"limit": "20", "offset": "0"},
                "badge": "Pagination"
            },
            {
                "id": "move-info",
                "name": "Move Information (Thunderbolt)",
                "path": "/api/v2/move/thunderbolt",
                "method": "GET",
                "description": "Damage category, power, accuracy, PP, and battle effects for Thunderbolt",
                "badge": "Battle Moves"
            },
            {
                "id": "type-chart",
                "name": "Type Matchups & Strengths (Electric)",
                "path": "/api/v2/type/electric",
                "method": "GET",
                "description": "Damage relations, double damage to/from, and related Pokémon for Electric type",
                "badge": "Type Chart"
            }
        ],
        "use_cases": [
            "Interactive Pokédex web applications and mobile companion tools",
            "Pokémon battle simulators, tournament drafting, and team builders",
            "Character stat visualizers, evolution tree explorers, and trivia bots"
        ],
        "features": [
            "Complete coverage of all 9 Pokémon video game generations",
            "Hyperlinked RESTful pagination and JSON schema compliance",
            "Open-source and community-maintained with high CDN caching",
            "Zero authentication needed"
        ],
        "rate_limit": "Free public access: Fair usage (up to 100 requests/minute per IP address)."
    },
    "rest-countries": {
        "endpoints": [
            {
                "id": "germany-profile",
                "name": "Lookup Country by Name (Germany)",
                "path": "/v3.1/name/germany",
                "method": "GET",
                "description": "Comprehensive country profile including capital, currencies, languages, and flag",
                "badge": "Name Search"
            },
            {
                "id": "all-nations",
                "name": "List All Sovereign Nations",
                "path": "/v3.1/all",
                "method": "GET",
                "description": "Summary catalog of all world nations with key demographic indicators",
                "params": {"fields": "name,capital,currencies,population,flags"},
                "badge": "All Nations"
            },
            {
                "id": "alpha-code",
                "name": "Lookup by Alpha-3 Country Code (Japan)",
                "path": "/v3.1/alpha/jpn",
                "method": "GET",
                "description": "Direct ISO 3166-1 alpha-3 code lookup for Japan",
                "badge": "ISO Code"
            },
            {
                "id": "region-filter",
                "name": "Filter Countries by Region (Europe)",
                "path": "/v3.1/region/europe",
                "method": "GET",
                "description": "All recognized European sovereign territories",
                "badge": "Regional Filter"
            }
        ],
        "use_cases": [
            "International e-commerce checkout forms, currency pickers, and phone code selectors",
            "Interactive world map visualizers, geography trivia, and travel trackers",
            "Demographic research platforms and automated country profile generators"
        ],
        "features": [
            "High-resolution SVG and PNG flag graphics for every territory",
            "Geospatial coordinates, capital cities, and UN sub-region classifications",
            "Field filtering (?fields=...) to optimize payload transmission size",
            "Zero authentication requirement"
        ],
        "rate_limit": "Public access: Open with no strict throttling, cached by global Cloudflare CDN."
    },
    "frankfurter-rates": {
        "endpoints": [
            {
                "id": "latest-conversion",
                "name": "Latest Currency Conversion (USD to EUR, GBP)",
                "path": "/latest?from=USD&to=EUR,GBP",
                "method": "GET",
                "description": "Live spot currency exchange rates from USD to EUR and GBP",
                "badge": "Latest Rates"
            },
            {
                "id": "all-rates-eur",
                "name": "All Currencies Conversion Base (EUR)",
                "path": "/latest?from=EUR",
                "method": "GET",
                "description": "Full exchange rate matrix against Euro for all 30+ central bank currencies",
                "badge": "Base Matrix"
            },
            {
                "id": "historical-rate",
                "name": "Historical Exchange Rate (2020-01-01)",
                "path": "/2020-01-01?from=USD&to=EUR",
                "method": "GET",
                "description": "Historical reference exchange rate on specific date",
                "badge": "Historical Date"
            },
            {
                "id": "supported-currencies",
                "name": "Supported Currencies List",
                "path": "/currencies",
                "method": "GET",
                "description": "Dictionary of all ISO 4217 currency codes supported by the ECB",
                "badge": "Currency Directory"
            }
        ],
        "use_cases": [
            "Multi-currency e-commerce pricing switchers and invoice generation",
            "Foreign exchange forecasting, currency conversion calculators, and forex charts",
            "Cross-border financial accounting and expense reconciliation"
        ],
        "features": [
            "European Central Bank (ECB) official daily reference data",
            "Historical currency exchange rates dating back to 1999",
            "High availability open-source deployment with sub-100ms latency",
            "Zero authentication or registration required"
        ],
        "rate_limit": "Public API: Unlimited open fair use."
    },
    "coingecko-free": {
        "endpoints": [
            {
                "id": "simple-price",
                "name": "Simple Price Ticker (BTC, ETH)",
                "path": "/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,eur&include_24hr_change=true",
                "method": "GET",
                "description": "Real-time spot price and 24h change for Bitcoin and Ethereum",
                "badge": "Spot Prices"
            },
            {
                "id": "top-markets",
                "name": "Cryptocurrency Market Ranking",
                "path": "/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1",
                "method": "GET",
                "description": "Top 10 cryptocurrencies ordered by market capitalization",
                "badge": "Top 10 Markets"
            },
            {
                "id": "coin-detail",
                "name": "Single Coin Detailed Profile (Bitcoin)",
                "path": "/api/v3/coins/bitcoin",
                "method": "GET",
                "description": "Deep coin profile including developer scores, social metrics, and liquidity",
                "badge": "Coin Profile"
            },
            {
                "id": "global-crypto",
                "name": "Global Crypto Market Data",
                "path": "/api/v3/global",
                "method": "GET",
                "description": "Global market cap, active cryptocurrencies count, and volume shares",
                "badge": "Global Stats"
            }
        ],
        "use_cases": [
            "Crypto price tickers for browser extensions and menu bar widgets",
            "Decentralized finance (DeFi) portfolio tracking applications",
            "Automated crypto trading signals and market analysis pipelines"
        ],
        "features": [
            "Covers 10,000+ crypto assets across hundreds of exchanges",
            "Market capitalization, 24h trading volume, and liquidity scores",
            "No credit card or key required on public demo tier",
            "Structured JSON output"
        ],
        "rate_limit": "Public Free Tier: 10-30 calls/minute without an API key."
    },
    "dummyjson": {
        "endpoints": [
            {
                "id": "single-product",
                "name": "Get Single Product (#1)",
                "path": "/products/1",
                "method": "GET",
                "description": "Sample e-commerce product with title, pricing, discount, and gallery images",
                "badge": "Single Product"
            },
            {
                "id": "products-list",
                "name": "List All Products",
                "path": "/products",
                "method": "GET",
                "description": "Paginated list of mock e-commerce products with categories and ratings",
                "params": {"limit": "10", "skip": "0"},
                "badge": "Product Catalog"
            },
            {
                "id": "search-products",
                "name": "Search Products",
                "path": "/products/search",
                "method": "GET",
                "description": "Search products by keyword query",
                "params": {"q": "phone"},
                "badge": "Search"
            },
            {
                "id": "users-list",
                "name": "List Mock Users",
                "path": "/users",
                "method": "GET",
                "description": "Mock user profiles with avatars, addresses, and company details",
                "params": {"limit": "5"},
                "badge": "Users"
            },
            {
                "id": "add-product",
                "name": "Simulate Add Product (POST)",
                "path": "/products/add",
                "method": "POST",
                "description": "Simulate adding a new product record with custom JSON body",
                "body": json.dumps({"title": "Wireless Noise-Cancelling Headphones", "price": 129.99, "category": "electronics", "stock": 50}, indent=2),
                "badge": "POST Mutation"
            }
        ],
        "use_cases": [
            "Rapid frontend prototyping for e-commerce, social, and dashboard applications",
            "Mock API server for integration testing, unit test suites, and UI demos",
            "Coding bootcamps, workshops, and educational tutorials"
        ],
        "features": [
            "Rich realistic data models (products, users, posts, comments, todos, quotes)",
            "Built-in search, pagination, and sorting parameters",
            "Supports simulated POST, PUT, and DELETE operations",
            "Zero setup or authentication required"
        ],
        "rate_limit": "Public sandbox: Unlimited open access for developers."
    },
    "jsonplaceholder": {
        "endpoints": [
            {
                "id": "single-post",
                "name": "Get Post by ID (#1)",
                "path": "/posts/1",
                "method": "GET",
                "description": "Single mock blog post with user ID, title, and body",
                "badge": "Single Post"
            },
            {
                "id": "posts-list",
                "name": "List All Posts",
                "path": "/posts",
                "method": "GET",
                "description": "Paginated list of mock blog posts",
                "params": {"_limit": "10"},
                "badge": "Posts List"
            },
            {
                "id": "post-comments",
                "name": "Get Comments for Post (#1)",
                "path": "/posts/1/comments",
                "method": "GET",
                "description": "Sample user comments associated with Post #1",
                "badge": "Comments"
            },
            {
                "id": "users-directory",
                "name": "List Users Directory",
                "path": "/users",
                "method": "GET",
                "description": "10 realistic mock users with nested geo-coordinates and company info",
                "badge": "Users"
            },
            {
                "id": "create-post",
                "name": "Create Post (POST)",
                "path": "/posts",
                "method": "POST",
                "description": "Simulate creating a new blog post",
                "body": json.dumps({"title": "Free API Hub Integration Guide", "body": "Building modern data apps using verified public APIs.", "userId": 1}, indent=2),
                "badge": "POST Create"
            }
        ],
        "use_cases": [
            "Frontend UI prototyping with React, Vue, Angular, and Svelte",
            "Testing state management, optimistic updates, and CRUD interfaces",
            "CI/CD automated regression and smoke testing"
        ],
        "features": [
            "Gold standard public mock REST API relied upon by millions of developers",
            "Full CRUD simulation (GET, POST, PUT, PATCH, DELETE)",
            "Zero authentication, 100% uptime with global edge caching"
        ],
        "rate_limit": "Public sandbox: Unlimited free access."
    },
    "itunes-search": {
        "endpoints": [
            {
                "id": "search-queen",
                "name": "Search Songs by Artist (Queen)",
                "path": "/search?term=queen&limit=5&entity=song",
                "method": "GET",
                "description": "Search songs by Queen with 30-second preview audio streams and cover artwork",
                "badge": "Song Search"
            },
            {
                "id": "search-albums",
                "name": "Search Albums (Daft Punk)",
                "path": "/search?term=daft+punk&entity=album&limit=5",
                "method": "GET",
                "description": "Catalog search for albums by Daft Punk with track counts and release dates",
                "badge": "Album Search"
            },
            {
                "id": "search-podcasts",
                "name": "Search Podcasts (Technology)",
                "path": "/search?term=technology&entity=podcast&limit=5",
                "method": "GET",
                "description": "Search popular technology podcasts with RSS feed links and artwork",
                "badge": "Podcasts"
            }
        ],
        "use_cases": [
            "Playable music player widgets with 30s streaming audio previews",
            "Podcast player directory search and episode artwork retrieval",
            "Music trivia applications and album artwork extraction tools"
        ],
        "features": [
            "Access to Apple's vast global music and media catalog",
            "Includes playable 30-second audio preview MP3 URLs",
            "High-resolution album cover artwork links in multiple dimensions",
            "No API key or developer account required"
        ],
        "rate_limit": "Public catalog: Approximately 20 calls/minute without credentials."
    },
    "radio-browser": {
        "endpoints": [
            {
                "id": "top-stations",
                "name": "Top Clicked Radio Stations",
                "path": "/json/stations/topclick/10",
                "method": "GET",
                "description": "10 most popular global radio stations by listener clicks with live audio streams",
                "badge": "Top Stations"
            },
            {
                "id": "jazz-stations",
                "name": "Search Stations by Genre (Jazz)",
                "path": "/json/stations/bytag/jazz?limit=10",
                "method": "GET",
                "description": "Top streaming radio stations playing Jazz music",
                "badge": "Genre Filter"
            },
            {
                "id": "country-stations",
                "name": "Search Stations by Country (Germany)",
                "path": "/json/stations/bycountry/germany?limit=10",
                "method": "GET",
                "description": "Online radio stations broadcasting from Germany",
                "badge": "Country Filter"
            }
        ],
        "use_cases": [
            "Live online radio player web apps and streaming desktop widgets",
            "Background music player integrations in games or productivity suites"
        ],
        "features": [
            "Community-curated directory of 30,000+ online radio stations",
            "Direct playable MP3/AAC audio stream links and station favicons",
            "Community voting, click tracking, and audio codec metadata",
            "100% open-source and free without authentication"
        ],
        "rate_limit": "Community server: Fair usage (suggested < 60 calls/min)."
    },
    "google-books": {
        "endpoints": [
            {
                "id": "search-python",
                "name": "Search Books by Keyword (Python)",
                "path": "/books/v1/volumes?q=programming+python&maxResults=5",
                "method": "GET",
                "description": "Search Google Books catalog for Python programming volumes",
                "badge": "Keyword Search"
            },
            {
                "id": "author-tolkien",
                "name": "Search by Author (Tolkien)",
                "path": "/books/v1/volumes?q=inauthor:tolkien&maxResults=5",
                "method": "GET",
                "description": "Books authored by J.R.R. Tolkien with bibliographic records",
                "badge": "Author Filter"
            },
            {
                "id": "isbn-lookup",
                "name": "Search by ISBN (Clean Code)",
                "path": "/books/v1/volumes?q=isbn:9780132350884",
                "method": "GET",
                "description": "Direct ISBN lookup for Clean Code by Robert C. Martin",
                "badge": "ISBN Lookup"
            }
        ],
        "use_cases": [
            "Reading progress trackers, digital bookshelves, and book review platforms",
            "Automated bibliographic citations and ISBN barcode scanner apps"
        ],
        "features": [
            "Indexes millions of global titles, magazines, and historical publications",
            "Includes cover thumbnail graphics, publication dates, and page counts",
            "Public search endpoint works without authentication"
        ],
        "rate_limit": "Public demo access: 1,000 queries/day without API key."
    },
    "art-institute-of-chicago": {
        "endpoints": [
            {
                "id": "search-monet",
                "name": "Search Artworks (Monet)",
                "path": "/api/v1/artworks/search?q=monet&fields=id,title,artist_title,image_id",
                "method": "GET",
                "description": "Search world-renowned artworks by Claude Monet with IIIF image IDs",
                "badge": "Artist Search"
            },
            {
                "id": "artwork-detail",
                "name": "Get Artwork Details (La Grande Jatte)",
                "path": "/api/v1/artworks/27992?fields=id,title,artist_display,date_display,medium_display,image_id",
                "method": "GET",
                "description": "Complete curatorial record for A Sunday on La Grande Jatte",
                "badge": "Masterpiece"
            },
            {
                "id": "collection-stream",
                "name": "List Open Access Artworks",
                "path": "/api/v1/artworks?page=1&limit=10&fields=id,title,artist_title,image_id",
                "method": "GET",
                "description": "Paginated stream of artworks with public domain imagery",
                "badge": "Collection Stream"
            }
        ],
        "use_cases": [
            "Virtual museum tours, high-resolution artwork galleries, and art history apps",
            "Daily masterpiece wallpaper widgets and color palette generators"
        ],
        "features": [
            "Over 100,000 digitized artworks from one of the world's premier museums",
            "Full IIIF image server support for zooming into ultra-high-resolution canvases",
            "Detailed curatorial provenance, exhibition history, and department tags",
            "Zero authentication required"
        ],
        "rate_limit": "Public access: 60 requests/minute."
    },
    "dog-ceo": {
        "endpoints": [
            {
                "id": "random-dog",
                "name": "Random Dog Photo",
                "path": "/api/breeds/image/random",
                "method": "GET",
                "description": "Random high-resolution dog photo URL",
                "badge": "Random Photo"
            },
            {
                "id": "all-breeds",
                "name": "List All Dog Breeds",
                "path": "/api/breeds/list/all",
                "method": "GET",
                "description": "Dictionary of all dog breeds and sub-breeds",
                "badge": "Breed Directory"
            },
            {
                "id": "breed-photos",
                "name": "Photos by Breed (Hound)",
                "path": "/api/breed/hound/images/random/3",
                "method": "GET",
                "description": "3 random photos of Hound breed dogs",
                "badge": "Breed Photos"
            }
        ],
        "use_cases": [
            "Canine photo galleries, pet avatar generators, and breed identification apps",
            "Educational mobile games and pet trivia platforms"
        ],
        "features": [
            "Over 20,000 curated dog photos across 100+ breeds",
            "Fast CDN image hosting",
            "Zero authentication required"
        ],
        "rate_limit": "Public access: Open fair use."
    },
    "jokeapi": {
        "endpoints": [
            {
                "id": "prog-joke",
                "name": "Programming Joke (Safe Mode)",
                "path": "/joke/Programming?safe-mode",
                "method": "GET",
                "description": "Safe-for-work programming humor in single-line or two-part format",
                "badge": "Coding Joke"
            },
            {
                "id": "any-joke",
                "name": "Random Safe Joke (Any Category)",
                "path": "/joke/Any?safe-mode",
                "method": "GET",
                "description": "Random safe joke from any category (Programming, Misc, Pun)",
                "badge": "Any Joke"
            }
        ],
        "use_cases": [
            "Daily humor widgets, developer terminal motd scripts, and bot entertainment"
        ],
        "features": [
            "Extensive category, flags, and blacklisting filters (safe-mode)",
            "Supports multiple languages and custom delivery types",
            "Zero authentication required"
        ],
        "rate_limit": "Public server: Up to 120 requests/minute."
    },
    "rick-and-morty": {
        "endpoints": [
            {
                "id": "rick-detail",
                "name": "Get Character by ID (Rick Sanchez)",
                "path": "/api/character/1",
                "method": "GET",
                "description": "Full details for Rick Sanchez including status, species, and episode links",
                "badge": "Single Character"
            },
            {
                "id": "all-characters",
                "name": "List All Characters",
                "path": "/api/character?page=1",
                "method": "GET",
                "description": "Paginated list of show characters with high-resolution avatar avatars",
                "badge": "Characters List"
            },
            {
                "id": "alive-humans",
                "name": "Filter Characters (Alive Humans)",
                "path": "/api/character/?status=alive&species=human",
                "method": "GET",
                "description": "All living human characters in the show",
                "badge": "Filtered Search"
            }
        ],
        "use_cases": [
            "Show encyclopedias, interactive character visualizers, and fan wikis",
            "UI pagination tutorials and search filtering demos"
        ],
        "features": [
            "Complete database of characters, episodes, and alien locations",
            "High-quality character portrait images",
            "Zero authentication required"
        ],
        "rate_limit": "Open public API: Up to 10,000 requests/day."
    }
}

CATEGORY_USE_CASES = {
    "weather": [
        "Real-time localized meteorological forecasts and weather alert widgets",
        "Long-term climate data analysis and solar/wind energy generation modeling",
        "Outdoor travel planning, sports logistics, and agricultural irrigation scheduling"
    ],
    "finance": [
        "Live foreign exchange rate converters and multi-currency checkout feeds",
        "Portfolio valuation dashboards and automated financial market tracking",
        "Financial risk modeling and historical economic indicator analysis"
    ],
    "crypto-web3": [
        "Decentralized token price tickers and cryptocurrency market analytics",
        "Crypto wallet balance tracking and blockchain transaction monitors",
        "Web3 DeFi protocol yield dashboards and gas price estimators"
    ],
    "geography": [
        "Address autocomplete, postal geocoding, and reverse coordinate lookups",
        "Interactive geospatial mapping, boundary polygons, and travel routing",
        "Location-aware proximity search for local events and amenities"
    ],
    "health-medical": [
        "Clinical reference lookups, dosage calculators, and drug interaction checks",
        "Personal health informatics dashboards and medical directory search",
        "Fitness telemetry tracking and nutrition ingredient analysis"
    ],
    "developer-tools": [
        "Mock API endpoint responses for rapid frontend staging and prototyping",
        "Automated CI/CD integration testing and regression validation suites",
        "Developer sandboxes, offline test suites, and schema verification"
    ],
    "entertainment": [
        "Interactive trivia games, multimedia feeds, and entertainment databases",
        "Bot commands for Discord and Slack community servers",
        "Personal recommendation engines and hobbyist discovery apps"
    ],
    "gaming": [
        "Gamer statistics dashboards, character builders, and companion web apps",
        "Inventory lookup tools, lore encyclopedias, and drafting simulators",
        "Tournament management and multiplayer matchmaking bots"
    ],
    "art-design": [
        "High-resolution artwork galleries and digital museum curation platforms",
        "Color palette extraction, historical artifact lookups, and art education",
        "Design asset management and creative canvas vector graphics integration"
    ],
    "education-books": [
        "Digital library catalogues, ISBN lookups, and reading progress trackers",
        "Automated academic citation generation and bibliographic referencing",
        "Personalized literature recommendations and author bibliography databases"
    ],
    "music": [
        "Streaming music audio preview players and playlist managers",
        "Artist discography search, album cover art extraction, and lyric lookup",
        "Internet radio directories and podcast feed aggregators"
    ],
    "news": [
        "Live headline aggregators and breaking news ticker widgets",
        "Automated editorial feeds, newsletter builders, and topic monitoring",
        "Sentiment analysis pipelines and media intelligence dashboards"
    ],
    "science": [
        "Scientific research data feeds and astronomical observation tracking",
        "STEM educational applications and laboratory telemetry visualizers",
        "Geospatial climate modeling and open science pipelines"
    ],
    "productivity": [
        "Automated workflow bots and task management synchronization",
        "Calendar scheduling assistants and document generation pipelines",
        "Workspace integration widgets and notification dispatchers"
    ]
}

def generate_default_use_cases(item: dict) -> list[str]:
    cat = item.get("category", "developer-tools")
    name = item.get("name", "API")
    sample = item.get("sample_endpoint", "/")
    
    if cat in CATEGORY_USE_CASES:
        return CATEGORY_USE_CASES[cat]
    
    return [
        f"Direct application integration consuming live {name} data",
        f"Automated querying of {sample} for dynamic data feeds",
        f"Interactive developer widgets and dashboards in the {cat.replace('-', ' ')} domain"
    ]

def generate_default_features(item: dict) -> list[str]:
    features = []
    
    if item.get("auth_type") == "none":
        features.append("Zero authentication or API key required")
    elif item.get("auth_type") == "api_key":
        features.append("Standard API key authorization")
    else:
        features.append(f"{item.get('auth_type', 'none').upper()} authorization supported")
        
    if item.get("cors_supported"):
        features.append("Native CORS enabled for direct browser client requests")
    else:
        features.append("Proxy recommended for browser client environments")
        
    if item.get("https"):
        features.append("Strict HTTPS / TLS encrypted communications")
        
    features.append("Clean structured JSON data payloads")
    return features

def generate_default_rate_limit(item: dict) -> str:
    auth = item.get("auth_type", "none")
    tier = item.get("pricing_tier", "open")
    
    if auth == "none":
        return "Public access: Open fair usage policy (recommended < 60 requests/minute)."
    elif tier == "open":
        return "100% Free & Open access under provider terms."
    else:
        return "Free developer tier: Sign up on official portal to obtain API credentials."

def generate_default_endpoints(item: dict) -> list[dict]:
    raw_sample = item.get("sample_endpoint", "/").strip()
    if not raw_sample.startswith("/"):
        raw_sample = f"/{raw_sample}"
        
    clean_path = raw_sample.split("?")[0]
    name = item.get("name", "API")
    method = item.get("method", "GET").upper()
    
    endpoints = [
        {
            "id": "primary-sample",
            "name": f"{name} (Primary Endpoint)",
            "path": raw_sample,
            "method": method,
            "description": f"Verified endpoint: {raw_sample}",
            "badge": "Verified"
        }
    ]
    
    # If sample had query parameters, offer clean path without query params
    if "?" in raw_sample:
        endpoints.append({
            "id": "base-path",
            "name": "Base Path (Unfiltered)",
            "path": clean_path,
            "method": method,
            "description": f"Query base resource without query parameter filters: {clean_path}",
            "badge": "Base Resource"
        })
        
    return endpoints

def enrich_all():
    print(f"Reading {DATA_PATH}...")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        apis = json.load(f)
        
    print(f"Loaded {len(apis)} APIs. Starting enrichment...")
    
    curated_count = 0
    generated_count = 0
    
    for item in apis:
        slug = item.get("slug", "")
        
        if slug in CURATED_DATA:
            curated = CURATED_DATA[slug]
            item["endpoints"] = curated.get("endpoints", [])
            item["use_cases"] = curated.get("use_cases", [])
            item["features"] = curated.get("features", [])
            item["rate_limit"] = curated.get("rate_limit", "")
            curated_count += 1
        else:
            # Check if fields are missing or empty
            if not item.get("endpoints"):
                item["endpoints"] = generate_default_endpoints(item)
            if not item.get("use_cases"):
                item["use_cases"] = generate_default_use_cases(item)
            if not item.get("features"):
                item["features"] = generate_default_features(item)
            if not item.get("rate_limit"):
                item["rate_limit"] = generate_default_rate_limit(item)
            generated_count += 1
            
    print(f"Enrichment summary: {curated_count} curated APIs, {generated_count} standard APIs.")
    
    # Write back to file
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(apis, f, indent=2)
        
    print(f"Successfully saved {len(apis)} enriched APIs to {DATA_PATH}!")

if __name__ == "__main__":
    enrich_all()
