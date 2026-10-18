import json
import re
import sys
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "apis.json"

EXPLICIT_SLUGS = {
    "open-meteo": "weather",
    "pokeapi": "gaming",
    "rest-countries": "geography",
    "frankfurter-rates": "finance",
    "coingecko-free": "crypto-web3",
    "coinpaprika": "crypto-web3",
    "binance-ticker": "crypto-web3",
    "exchangerate-api-open": "finance",
    "dummyjson": "developer-tools",
    "jsonplaceholder": "developer-tools",
    "reqres": "developer-tools",
    "cat-facts": "animals",
    "dog-ceo": "animals",
    "rescuegroups": "animals",
    "xeno-canto": "animals",
    "jokeapi": "entertainment",
    "chuck-norris-jokes": "entertainment",
    "advice-slip": "entertainment",
    "rick-and-morty": "entertainment",
    "agify": "reference",
    "genderize": "reference",
    "nationalize": "reference",
    "zippopotam": "geography",
    "universities-hipolabs": "education-books",
    "open-brewery-db": "food-drink",
    "sunrise-sunset": "science",
    "open-notify-iss": "science",
    "ipify": "developer-tools",
    "itunes-search": "music",
    "radio-browser": "music",
    "lyrics-ovh": "music",
    "iconfinder": "art-design",
    "noun-project": "art-design",
    "google-books": "education-books",
    "art-institute-of-chicago": "art-design",
    "metropolitan-museum-of-art": "art-design",
    "harvard-art-museums": "art-design",
    "tvmaze": "video-movies",
    "gutendex": "education-books",
    "open-library": "education-books"
}

CATEGORY_RULES = [
    ('crypto-web3', [
        r'\bcrypto\b', r'\bbitcoin\b', r'\bbtc\b', r'\bethereum\b', r'\beth\b',
        r'\bblockchain\b', r'\btoken\b', r'\btokenomics\b', r'\bwallet\b',
        r'\bweb3\b', r'\bnft\b', r'\bnfts\b', r'\bdefi\b', r'\bcoin\b', r'\bcoins\b',
        r'\bbinance\b', r'\bcoingecko\b', r'\bcoinmarketcap\b', r'\bcoinpaprika\b',
        r'\bsolana\b', r'\bcardano\b', r'\bmining\b', r'\bsmart contract\b'
    ]),
    ('animals', [
        r'\banimal\b', r'\banimals\b', r'\bcat\b', r'\bcats\b', r'\bdog\b', r'\bdogs\b',
        r'\bpet\b', r'\bpets\b', r'\bbird\b', r'\bbirds\b', r'\bwildlife\b', r'\bzoo\b',
        r'\bfish\b', r'\baquarium\b', r'\bbreed\b', r'\bbreeds\b', r'\brescuegroups\b',
        r'\bxeno-canto\b', r'\bcanine\b', r'\bfeline\b', r'\bveterinary\b'
    ]),
    ('music', [
        r'\bmusic\b', r'\bsong\b', r'\bsongs\b', r'\baudio\b', r'\bspotify\b',
        r'\bitunes\b', r'\blyric\b', r'\blyrics\b', r'\bradio\b', r'\bpodcast\b',
        r'\bpodcasts\b', r'\btrack\b', r'\btracks\b', r'\balbum\b', r'\balbums\b',
        r'\bdeezer\b', r'\blast\.fm\b', r'\bsoundcloud\b', r'\bmidi\b', r'\bdiscography\b'
    ]),
    ('video-movies', [
        r'\bmovie\b', r'\bmovies\b', r'\bfilm\b', r'\bfilms\b', r'\bcinema\b',
        r'\byoutube\b', r'\bvimeo\b', r'\btv\b', r'\btelevision\b', r'\bseries\b',
        r'\bshows\b', r'\btmdb\b', r'\bimdb\b', r'\btvmaze\b', r'\banime\b',
        r'\bmanga\b', r'\bstreaming\b', r'\bnetflix\b', r'\btrailer\b', r'\bvhs\b'
    ]),
    ('gaming', [
        r'\bgame\b', r'\bgames\b', r'\bgaming\b', r'\bsteam\b', r'\bplaystation\b',
        r'\bxbox\b', r'\bnintendo\b', r'\bpokemon\b', r'\bpokeapi\b', r'\bminecraft\b',
        r'\brpg\b', r'\bboardgame\b', r'\bchess\b', r'\besport\b', r'\besports\b',
        r'\bdota\b', r'\bfortnite\b', r'\briot\b', r'\bvalorant\b', r'\btwitch\b'
    ]),
    ('food-drink', [
        r'\bfood\b', r'\brecipe\b', r'\brecipes\b', r'\bbeer\b', r'\bbrewery\b',
        r'\bbreweries\b', r'\bdrink\b', r'\bdrinks\b', r'\bwine\b', r'\bcocktail\b',
        r'\bcocktails\b', r'\brestaurant\b', r'\brestaurants\b', r'\bmeal\b',
        r'\bmeals\b', r'\bnutrition\b', r'\bculinary\b', r'\bcooking\b', r'\bcoffee\b',
        r'\bcafe\b', r'\bdiet\b', r'\bingredient\b', r'\bingredients\b'
    ]),
    ('health-medical', [
        r'\bhealth\b', r'\bmedical\b', r'\bmedicine\b', r'\bhospital\b', r'\bhospitals\b',
        r'\bdisease\b', r'\bdiseases\b', r'\bcovid\b', r'\bdrug\b', r'\bdrugs\b',
        r'\bfitness\b', r'\bworkout\b', r'\bdoctor\b', r'\bclinic\b', r'\bpharmacy\b',
        r'\bhealthcare\b', r'\bpatient\b', r'\bvital\b', r'\bwellness\b', r'\bcalorie\b'
    ]),
    ('education-books', [
        r'\bbook\b', r'\bbooks\b', r'\blibrary\b', r'\blibraries\b', r'\beducation\b',
        r'\bacademic\b', r'\buniversity\b', r'\buniversities\b', r'\bcollege\b',
        r'\bcolleges\b', r'\bschool\b', r'\bschools\b', r'\bdictionary\b',
        r'\bisbn\b', r'\bliterature\b', r'\bgutenberg\b', r'\bcitation\b',
        r'\bauthor\b', r'\bauthors\b', r'\bcourse\b', r'\bcourses\b', r'\btextbook\b'
    ]),
    ('transportation', [
        r'\btransit\b', r'\bflight\b', r'\bflights\b', r'\bairline\b', r'\bairlines\b',
        r'\bairport\b', r'\bairports\b', r'\btraffic\b', r'\bvehicle\b', r'\bvehicles\b',
        r'\bcar\b', r'\bcars\b', r'\btrain\b', r'\btrains\b', r'\bbus\b', r'\bbuses\b',
        r'\bmetro\b', r'\bsubway\b', r'\btransport\b', r'\btransportation\b',
        r'\bshipping\b', r'\bfleet\b', r'\bnavigation\b', r'\broute\b', r'\broutes\b'
    ]),
    ('sports', [
        r'\bsport\b', r'\bsports\b', r'\bfootball\b', r'\bsoccer\b', r'\bnba\b',
        r'\bbasketball\b', r'\bbaseball\b', r'\bcricket\b', r'\bhockey\b', r'\bnhl\b',
        r'\bnfl\b', r'\bathlete\b', r'\bathletes\b', r'\bleague\b', r'\bleagues\b',
        r'\bpremier league\b', r'\btournament\b', r'\bscore\b', r'\bscores\b', r'\bfixture\b'
    ]),
    ('ecommerce', [
        r'\becommerce\b', r'\be-commerce\b', r'\bshop\b', r'\bshopping\b',
        r'\bstore\b', r'\bcart\b', r'\bcheckout\b', r'\bmerchant\b', r'\bproduct\b',
        r'\bproducts\b', r'\bpricing\b', r'\bretail\b', r'\border\b', r'\borders\b',
        r'\binventory\b', r'\bshopify\b', r'\bstripe\b', r'\bpayment\b', r'\bpayments\b'
    ]),
    ('security', [
        r'\bsecurity\b', r'\bauth\b', r'\bauthentication\b', r'\bpassword\b',
        r'\bpasswords\b', r'\bvulnerability\b', r'\bvulnerabilities\b', r'\bcve\b',
        r'\bssl\b', r'\bcertificate\b', r'\bcertificates\b', r'\bencrypt\b',
        r'\bencryption\b', r'\bthreat\b', r'\bmalware\b', r'\bhacker\b',
        r'\bcybersecurity\b', r'\bhash\b', r'\bshasum\b', r'\bjwt\b', r'\boauth\b'
    ]),
    ('database', [
        r'\bdatabase\b', r'\bdatabases\b', r'\bsql\b', r'\bnosql\b', r'\bpostgres\b',
        r'\bmysql\b', r'\bmongo\b', r'\bmongodb\b', r'\bredis\b', r'\bbaas\b',
        r'\bgraphql\b', r'\bdata storage\b', r'\borm\b', r'\bsupabase\b', r'\bfirebase\b'
    ]),
    ('communication', [
        r'\bsms\b', r'\bemail\b', r'\bemails\b', r'\bchat\b', r'\bmessage\b',
        r'\bmessages\b', r'\bmessaging\b', r'\btelephony\b', r'\bphone\b',
        r'\bwhatsapp\b', r'\bslack\b', r'\bdiscord\b', r'\btelegram\b',
        r'\bwebhook\b', r'\bwebhooks\b', r'\bnotification\b', r'\bnotifications\b',
        r'\btwilio\b', r'\bsendgrid\b', r'\bmailgun\b'
    ]),
    ('productivity', [
        r'\bcalendar\b', r'\btodo\b', r'\btodos\b', r'\btask\b', r'\btasks\b',
        r'\bnote\b', r'\bnotes\b', r'\bdocument\b', r'\bdocuments\b', r'\bpdf\b',
        r'\bspreadsheet\b', r'\bexcel\b', r'\bcsv\b', r'\bworkflow\b', r'\bkanban\b',
        r'\btrello\b', r'\bnotion\b', r'\basana\b', r'\bjira\b', r'\btime tracking\b'
    ]),
    ('art-design', [
        r'\bart\b', r'\bdesign\b', r'\bicon\b', r'\bicons\b', r'\bcolor\b',
        r'\bcolors\b', r'\bfont\b', r'\bfonts\b', r'\bphoto\b', r'\bphotos\b',
        r'\bimage\b', r'\bimages\b', r'\bsvg\b', r'\bvector\b', r'\bvectors\b',
        r'\bpalette\b', r'\billustration\b', r'\bmuseum\b', r'\bgallery\b',
        r'\bcanvas\b', r'\bunsplash\b', r'\biconfinder\b'
    ]),
    ('weather', [
        r'\bweather\b', r'\bforecast\b', r'\bforecasts\b', r'\bmeteorolog\w*\b',
        r'\bclimate\b', r'\btemperature\b', r'\brain\b', r'\bwind\b',
        r'\bprecipitation\b', r'\bhurricane\b', r'\bair quality\b', r'\bpollen\b', r'\bradar\b'
    ]),
    ('ai-ml', [
        r'\bai\b', r'\bmachine learning\b', r'\bdeep learning\b', r'\bllm\b',
        r'\bgpt\b', r'\bopenai\b', r'\bneural\b', r'\bcomputer vision\b',
        r'\bnlp\b', r'\bembeddings\b', r'\btranscription\b', r'\bspeech-to-text\b',
        r'\btext-to-speech\b', r'\bvision\b', r'\bhuggingface\b', r'\bartificial intelligence\b'
    ]),
    ('science', [
        r'\bscience\b', r'\bspace\b', r'\bastronomy\b', r'\bnasa\b', r'\borbit\b',
        r'\bplanet\b', r'\bplanets\b', r'\bphysics\b', r'\bchemistry\b',
        r'\bbiology\b', r'\bmath\b', r'\bmathematics\b', r'\bsatellite\b',
        r'\bscientific\b', r'\biss\b', r'\bsolar\b'
    ]),
    ('geography', [
        r'\bgeography\b', r'\bgeocoding\b', r'\bgeocode\b', r'\blatitude\b',
        r'\blongitude\b', r'\bcoordinates\b', r'\bmap\b', r'\bmaps\b',
        r'\bcountry\b', r'\bcountries\b', r'\bcity\b', r'\bcities\b',
        r'\bpostal\b', r'\bzipcode\b', r'\btimezone\b', r'\btimezones\b', r'\bdemographics\b'
    ]),
    ('finance', [
        r'\bfinance\b', r'\bforex\b', r'\bexchange rate\b', r'\bcurrency\b',
        r'\bcurrencies\b', r'\bbanking\b', r'\bbank\b', r'\bstocks\b',
        r'\bstock market\b', r'\binvestment\b', r'\binflation\b', r'\beconomic\b',
        r'\bfed\b', r'\becb\b', r'\baccounting\b', r'\binvoice\b', r'\binvoicing\b'
    ]),
    ('news', [
        r'\bnews\b', r'\bheadline\b', r'\bheadlines\b', r'\bjournalism\b',
        r'\brss\b', r'\bfeed\b', r'\bpress\b', r'\bbreaking\b', r'\barticle\b',
        r'\barticles\b', r'\bnewspaper\b'
    ]),
    ('entertainment', [
        r'\bjoke\b', r'\bjokes\b', r'\bhumor\b', r'\bmeme\b', r'\bmemes\b',
        r'\btrivia\b', r'\bquote\b', r'\bquotes\b', r'\bcomic\b', r'\bcomics\b',
        r'\bfun\b', r'\bcelebrity\b'
    ])
]

CATEGORY_USE_CASES = {
    "crypto-web3": [
        "Real-time cryptocurrency portfolio valuation and multi-currency tracking",
        "Automated price alert bots and Discord/Telegram market monitoring channels",
        "DeFi dashboards, global market cap widgets, and Bitcoin dominance charts"
    ],
    "animals": [
        "Pet adoption matching portals, shelter directories, and animal profile cards",
        "Bioacoustic sound recording research and wild animal identification",
        "Canine/feline trivia widgets, breed calculators, and pet health apps"
    ],
    "music": [
        "Streaming music audio preview players and playlist managers",
        "Artist discography search, album cover art extraction, and lyric lookup",
        "Internet radio directories and podcast feed aggregators"
    ],
    "video-movies": [
        "Streaming cinema search engines, watchlist organizers, and TV guide apps",
        "IMDb/TMDB film metadata lookups, cast filmographies, and trailer feeds",
        "Personalized movie recommendation algorithms and media catalog builders"
    ],
    "gaming": [
        "Gamer statistics dashboards, character builders, and companion web apps",
        "Inventory lookup tools, lore encyclopedias, and drafting simulators",
        "Tournament management and multiplayer matchmaking bots"
    ],
    "food-drink": [
        "Recipe discovery engines, ingredient shopping lists, and meal planning apps",
        "Craft brewery trail maps, local taproom locators, and beer reviews",
        "Nutritional calorie calculators and restaurant menu lookup services"
    ],
    "health-medical": [
        "Clinical reference lookups, dosage calculators, and drug interaction checks",
        "Personal health informatics dashboards and medical directory search",
        "Fitness telemetry tracking and nutrition ingredient analysis"
    ],
    "education-books": [
        "Digital library catalogues, ISBN lookups, and reading progress trackers",
        "Automated academic citation generation and bibliographic referencing",
        "Personalized literature recommendations and author bibliography databases"
    ],
    "transportation": [
        "Live flight arrival/departure boards, airline schedules, and airport status",
        "Public transit timetable widgets, multi-modal routing, and bus tracking",
        "Vehicle telemetry analytics, logistics tracking, and traffic route planning"
    ],
    "sports": [
        "Live match score tickers, tournament bracket visualizers, and league standings",
        "Athletic player performance profiles, fantasy league draft stats, and odds",
        "Automated sports news bots and fixture calendar notifications"
    ],
    "ecommerce": [
        "Product catalog search, price comparison feeds, and merchant inventory sync",
        "Shopping cart checkout flows and currency conversions",
        "Order status notifications and customer e-commerce portals"
    ],
    "security": [
        "Automated vulnerability scanner pipelines and CVE database security audits",
        "Password strength testers, token authentication, and SSL certificate monitors",
        "Cybersecurity threat intelligence feeds and incident response workflows"
    ],
    "database": [
        "Cloud database connection pooling, persistent record storage, and CRUD backends",
        "Real-time GraphQL subscriptions and document sync pipelines",
        "Data warehouse query connectors and analytics ingestion"
    ],
    "communication": [
        "Automated transactional SMS dispatches and two-factor authentication alerts",
        "Customer notification emails, newsletters, and webhook triggers",
        "Multi-channel chat bots for Slack, Telegram, and Discord communities"
    ],
    "productivity": [
        "Automated calendar schedule booking, meeting reminders, and task sync",
        "Dynamic PDF invoice generation, document converters, and spreadsheet tools",
        "Kanban board workflow automation and team project tracking integrations"
    ],
    "art-design": [
        "High-resolution artwork galleries and digital museum curation platforms",
        "Color palette extraction, historical artifact lookups, and art education",
        "Design asset management and creative canvas vector graphics integration"
    ],
    "weather": [
        "Real-time localized meteorological forecasts and weather alert widgets",
        "Long-term climate data analysis and solar/wind energy generation modeling",
        "Outdoor travel planning, sports logistics, and agricultural irrigation scheduling"
    ],
    "ai-ml": [
        "AI text completion, semantic search, and document summarization",
        "Computer vision image classification, OCR, and object detection",
        "Speech-to-text audio transcription and natural language processing pipelines"
    ],
    "science": [
        "NASA space observation feeds, astronomical ephemeris, and satellite tracking",
        "STEM educational applications and laboratory telemetry visualizers",
        "Geospatial climate modeling and open science data pipelines"
    ],
    "geography": [
        "Address autocomplete, postal geocoding, and reverse coordinate lookups",
        "Interactive geospatial mapping, boundary polygons, and travel routing",
        "Location-aware proximity search for local events and amenities"
    ],
    "finance": [
        "Live foreign exchange rate converters and multi-currency checkout feeds",
        "Portfolio valuation dashboards and automated financial market tracking",
        "Financial risk modeling and historical economic indicator analysis"
    ],
    "news": [
        "Live headline aggregators and breaking news ticker widgets",
        "Automated editorial feeds, newsletter builders, and topic monitoring",
        "Sentiment analysis pipelines and media intelligence dashboards"
    ],
    "entertainment": [
        "Daily humor widgets, developer terminal motd scripts, and bot entertainment",
        "Pop culture trivia games and meme generator feeds",
        "Celebrity quote discovery and interactive entertainment encyclopedias"
    ],
    "reference": [
        "General knowledge directories, lexical definitions, and language lookups",
        "Demographic entity searches and cross-reference research tools"
    ],
    "developer-tools": [
        "Mock API endpoint responses for rapid frontend staging and prototyping",
        "Automated CI/CD integration testing and regression validation suites",
        "Developer sandboxes, offline test suites, and schema verification"
    ]
}

def recategorize():
    print(f"Loading {DATA_PATH}...")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        apis = json.load(f)
        
    print(f"Loaded {len(apis)} APIs.")
    
    changed_count = 0
    cat_counts = {}
    
    for item in apis:
        slug = item.get("slug", "").lower()
        old_cat = item.get("category", "").lower()
        
        # Check explicit overrides
        if slug in EXPLICIT_SLUGS:
            new_cat = EXPLICIT_SLUGS[slug]
        else:
            name = str(item.get("name") or "")
            desc = str(item.get("description") or "")
            sdesc = str(item.get("short_description") or "")
            burl = str(item.get("base_url") or "")
            tags = " ".join([str(t) for t in (item.get("tags") or []) if t])
            text = f"{name} {desc} {sdesc} {burl} {tags}".lower()
            
            new_cat = None
            for cat_name, patterns in CATEGORY_RULES:
                if any(re.search(pat, text) for pat in patterns):
                    new_cat = cat_name
                    break
            
            if not new_cat:
                new_cat = old_cat if old_cat else "developer-tools"
                
        if new_cat != old_cat:
            item["category"] = new_cat
            changed_count += 1
            
            # If use_cases were generic, refresh them with category-tailored ones
            if new_cat in CATEGORY_USE_CASES and (not item.get("use_cases") or len(item.get("use_cases", [])) <= 1 or "Direct integration into applications consuming" in str(item.get("use_cases", []))):
                item["use_cases"] = CATEGORY_USE_CASES[new_cat]
                
        cat_counts[item["category"]] = cat_counts.get(item["category"], 0) + 1
        
    print(f"Recategorization complete: {changed_count} APIs updated.")
    print("New Category Distribution:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")
        
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(apis, f, indent=2)
        
    print(f"Saved to {DATA_PATH}!")

if __name__ == "__main__":
    recategorize()
