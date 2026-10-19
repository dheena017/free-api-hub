import json
import os
import re

SPECIFIC_ENRICHMENTS = {
    "iconfinder": {
        "short_description": "Search, preview, and download millions of SVG, PNG, and vector icons for web and mobile design.",
        "detailed_description": "Iconfinder provides developers and designers with programmatic access to millions of vector icons, illustrations, and 3D graphics.\n\nThe API allows searching icon sets by keywords, visual categories, styles (outline, glyph, flat, colored, isometric), and commercial licenses. Responses deliver direct SVG vector code and raster PNG URLs across multiple resolutions.\n\nIdeal for UI/UX design tools, CMS icon pickers, vector asset managers, and custom interface builders."
    },
    "noun-project": {
        "short_description": "Extensive visual icon search API providing SVG and PNG iconography across thousands of creative concepts.",
        "detailed_description": "The Noun Project API gives developers access to a global visual language consisting of millions of curated icons created by designers worldwide.\n\nThe API supports vector SVG and raster PNG downloads, semantic keyword searching, author attributions, and collections browsing.\n\nIdeal for creative software suites, UI prototyping plugins, and automated publishing systems."
    },
    "open-meteo": {
        "short_description": "Accurate, open-source weather forecast API for any location worldwide without requiring an API key.",
        "detailed_description": "Open-Meteo provides high-resolution global weather forecasts, historical climate data, and atmospheric modeling without requiring API keys or subscriptions.\n\nIt features sub-hourly updates, hourly forecasts up to 16 days, marine data, solar radiation forecasts, and air quality indices. All endpoints respond with structured JSON.\n\nIdeal for localized weather widgets, travel forecasting applications, agricultural planning, and climate telemetry analysis."
    },
    "pokeapi": {
        "short_description": "Comprehensive RESTful Pokémon API consuming full data about Pokémon, moves, abilities, types, and species.",
        "detailed_description": "PokéAPI is the standard reference RESTful API for Pokémon video game data.\n\nIt catalogues detailed information covering all generations, including stats, move sets, evolution chains, sprite images, items, abilities, and game locations with hypermedia linking.\n\nIdeal for gaming companion apps, character encyclopedias, tournament drafting tools, and interactive game wiki databases."
    },
    "google-books": {
        "short_description": "Search and browse millions of books, magazines, and literature metadata via Google's vast book index.",
        "detailed_description": "The Google Books API enables developers to search the extensive Google Books index, view public domain book snippets, inspect cover artwork, and retrieve rich bibliographic records.\n\nQuery titles, authors, publishers, ISBNs, page counts, and user ratings with structured JSON responses.\n\nIdeal for reading trackers, e-commerce book stores, digital libraries, and academic bibliographies."
    },
    "art-institute-of-chicago": {
        "short_description": "Public API providing access to thousands of public domain artworks, exhibition history, and high-res imagery.",
        "detailed_description": "The Art Institute of Chicago API provides open, structured access to one of the world's premier art collections.\n\nDevelopers can search over 100,000 artworks, high-resolution IIIF images, artists, exhibition histories, audio tours, and publications.\n\nIdeal for interactive museum apps, cultural heritage platforms, educational tools, and digital curation galleries."
    },
    "harvard-art-museums": {
        "short_description": "Explore over 250,000 works of art, artifacts, and curatorial records from Harvard's collections.",
        "detailed_description": "The Harvard Art Museums API opens up Harvard University's rich art collections spanning ancient to contemporary eras.\n\nIt exposes complete object metadata, high-resolution color photographs, exhibition archives, galleries, and spectrum color data.\n\nIdeal for computer vision research, cultural heritage apps, and art discovery tools."
    },
    "metropolitan-museum-of-art": {
        "short_description": "Access over 470,000 artworks and high-resolution Open Access images from The Met's collection.",
        "detailed_description": "The Metropolitan Museum of Art Collection API provides datasets on more than 470,000 artworks spanning 5,000 years of global human history.\n\nEach record contains detailed metadata, artist bio, department classification, medium, dimensions, and rights-free high-resolution image downloads for Open Access items.\n\nIdeal for virtual museum tours, digital art education, and cultural data visualization."
    },
    "rescuegroups": {
        "short_description": "Nationwide pet adoption and animal rescue directory API with animal profiles and shelter metadata.",
        "detailed_description": "The RescueGroups.org API provides live animal adoption listings and shelter data across North America.\n\nUsers can search adoptable dogs, cats, horses, and small animals by breed, age, location, and personality traits.\n\nIdeal for animal welfare platforms, veterinary clinics, pet matchmaking websites, and shelter management tools."
    },
    "xeno-canto": {
        "short_description": "Global crowdsourced database of wild bird sound recordings and acoustic bioacoustics metadata.",
        "detailed_description": "Xeno-canto is a dedicated collaborative project sharing bird sounds from all over the world.\n\nThe API provides search access to hundreds of thousands of geolocated audio recordings, bird species taxonomy, spectrogram images, and acoustic sound metadata.\n\nIdeal for ornithological research, birdwatching field apps, and bioacoustic machine learning."
    }
}

DOMAIN_USE_CASES = {
    "weather": "Ideal for localized weather widgets, travel forecasting applications, outdoor event planning, and meteorological research.",
    "finance": "Ideal for portfolio tracking dashboards, market intelligence tools, automated trading algorithms, and real-time currency conversion widgets.",
    "crypto-web3": "Ideal for cryptocurrency price tickers, decentralized wallet balances, token analytics dashboards, and Web3 transaction monitoring.",
    "entertainment": "Ideal for multimedia discovery apps, trivia platforms, gaming stats trackers, and interactive entertainment encyclopedias.",
    "gaming": "Ideal for gamer profile lookups, character stat builders, game companion apps, and interactive game databases.",
    "developer-tools": "Ideal for frontend prototyping, automated mock services, sandbox testing environments, and developer productivity tooling.",
    "art-design": "Ideal for digital asset managers, UI/UX icon pickers, graphic design tools, and creative canvas applications.",
    "science": "Ideal for research data pipelines, astronomical observation trackers, scientific simulation models, and educational STEM tools.",
    "health-medical": "Ideal for wellness tracking applications, pharmaceutical reference lookups, clinical decision support tools, and medical info directories.",
    "geography": "Ideal for address autocomplete, spatial coordinate lookups, map visualizations, and location-aware mobile services.",
    "transportation": "Ideal for live transit departure boards, route optimization, vehicle fleet tracking, and logistics coordination.",
    "database": "Ideal for persistent document storage, real-time data sync, scalable querying, and structured backend records.",
    "security": "Ideal for automated vulnerability audits, domain threat intelligence, SSL certificate monitoring, and security incident response.",
    "communication": "Ideal for customer notification systems, multi-channel messaging bots, email dispatching, and live chat services.",
    "productivity": "Ideal for task management automation, document workflow bots, workspace integrations, and calendar sync engines.",
    "food-drink": "Ideal for recipe discovery platforms, dietary analysis apps, restaurant menu planners, and culinary catalog tools.",
    "education-books": "Ideal for digital libraries, reading trackers, bibliographic referencing, and interactive learning systems.",
    "social-news": "Ideal for curated news feeds, social sentiment trackers, trend monitoring dashboards, and community content aggregation."
}

def clean_sentence(text: str) -> str:
    text = text.strip()
    if text and not text.endswith(('.', '!', '?')):
        text += '.'
    return text

def build_enrichment(item: dict) -> tuple[str, str]:
    item_id = item.get("id", "").lower()
    name = item.get("name", "API").strip()
    existing_desc = item.get("description", "").strip()
    category = item.get("category", "developer-tools").lower()
    auth_type = item.get("auth_type", "none")
    base_url = item.get("base_url", "").rstrip("/")
    endpoint = item.get("endpoint", "").lstrip("/")
    method = item.get("method", "GET").upper()

    # Check explicit hand-curated list
    if item_id in SPECIFIC_ENRICHMENTS:
        return (
            SPECIFIC_ENRICHMENTS[item_id]["short_description"],
            SPECIFIC_ENRICHMENTS[item_id]["detailed_description"]
        )

    # Clean short description
    # If the existing description was single word or too brief
    is_single_word = len(existing_desc.split()) <= 1
    if is_single_word or len(existing_desc) < 20:
        if category == "art-design":
            short_desc = f"Search, inspect, and retrieve vector assets, iconography, and design resources via {name}."
        elif category == "education-books":
            short_desc = f"Search and inspect books, literature records, and bibliographic metadata via {name}."
        elif category == "entertainment":
            short_desc = f"Access media catalogues, entertainment datasets, and interactive content via {name}."
        elif category == "weather":
            short_desc = f"Retrieve live weather conditions, atmospheric forecasts, and climate data from {name}."
        elif category == "finance":
            short_desc = f"Query live financial rates, market indicators, and currency valuations via {name}."
        elif category == "geography":
            short_desc = f"Query geographical coordinates, location metadata, and spatial records via {name}."
        else:
            short_desc = f"Access {name} data and services for {category} workflows."
    else:
        # Strip out any previously added boilerplate if re-running
        cleaned = re.sub(r"^\s*.*?\s+is a verified, developer-ready API in the .*? category\.\s*", "", existing_desc)
        cleaned = re.sub(r"Built for seamless integration into modern applications\.\s*", "", cleaned)
        short_desc = clean_sentence(cleaned) if cleaned else clean_sentence(existing_desc)

    # Build focused detailed description explaining THAT API ONLY
    # Paragraph 1: What this API specifically provides
    p1 = f"{name} is a specialized service providing {short_desc.lower() if short_desc.endswith('.') and not short_desc[0].isupper() else short_desc}"
    if not p1.endswith('.'):
        p1 += '.'

    # Paragraph 2: Technical access & endpoints for this API
    auth_detail = "no API key required (open public endpoint)" if auth_type == "none" else f"free {auth_type.replace('_', ' ')} authentication"
    p2 = f"Requests are sent to {base_url} using standard HTTP {method}. Developers can call endpoints such as '/{endpoint}' with {auth_detail} to receive structured JSON responses."

    # Paragraph 3: Domain-specific use cases for this API
    use_case = DOMAIN_USE_CASES.get(category, "Ideal for web and mobile applications, backend services, and automated data processing.")
    p3 = use_case

    detailed_desc = f"{p1}\n\n{p2}\n\n{p3}"
    return (short_desc, detailed_desc)

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "data", "apis.json")
    print(f"Reading from {data_path}...")
    with open(data_path, "r", encoding="utf-8") as f:
        apis = json.load(f)

    print(f"Total APIs to process: {len(apis)}")
    updated = 0
    for item in apis:
        short_d, detailed_d = build_enrichment(item)
        item["short_description"] = short_d
        item["detailed_description"] = detailed_d
        item["description"] = short_d
        updated += 1

    print(f"Writing {updated} enriched APIs back to {data_path}...")
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(apis, f, indent=2, ensure_ascii=False)
    print("Enrichment complete successfully!")

if __name__ == "__main__":
    main()
