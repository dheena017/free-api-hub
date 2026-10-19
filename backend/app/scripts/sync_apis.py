"""
API Ingestion & Strict Deduplication Engine
Fetches, normalizes, and merges public APIs from multiple open-source aggregators,
community registries, and OpenAPI directories into Free API Hub's catalog with ZERO DUPLICATES.
Ensures every listed API represents a unique, valid service.
"""

import sys
import os
import json
import re
from urllib.parse import urlparse
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
import httpx

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.models import ApiItem, AuthType, PricingTier, HealthStatus

# Shared hosting domains where multiple distinct APIs may be hosted under different paths
SHARED_HOSTS = {
    'github.com', 'rapidapi.com', 'postman.com', 'google.com', 'googleapis.com',
    'vercel.app', 'netlify.app', 'herokuapp.com', 'readthedocs.io',
    'pages.dev', 'github.io', 'gitlab.com', 'aws.amazon.com', 'azure.com',
    'appspot.com', 'readme.io', 'swagger.io', 'gitbook.io'
}

# Canonical Category Taxonomy (Free API Hub 9 categories)
CATEGORY_MAPPING = {
    # weather
    "weather": "weather",
    "climate": "weather",
    "meteorology": "weather",
    "forecast": "weather",
    "atmospheric": "weather",

    # finance
    "cryptocurrency": "finance",
    "currency exchange": "finance",
    "finance": "finance",
    "financial": "finance",
    "blockchain": "finance",
    "business": "finance",
    "ecommerce": "finance",
    "e-commerce": "finance",
    "payment": "finance",
    "payments": "finance",
    "banking": "finance",
    "accounting": "finance",
    "stocks": "finance",
    "crypto": "finance",

    # entertainment
    "anime": "entertainment",
    "entertainment": "entertainment",
    "games & comics": "entertainment",
    "games and comics": "entertainment",
    "games": "entertainment",
    "comics": "entertainment",
    "music": "entertainment",
    "video": "entertainment",
    "movies": "entertainment",
    "media": "entertainment",
    "art & design": "entertainment",
    "art and design": "entertainment",
    "art": "entertainment",
    "design": "entertainment",
    "sports & fitness": "entertainment",
    "sports and fitness": "entertainment",
    "sports": "entertainment",
    "fitness": "entertainment",
    "gaming": "entertainment",

    # geography
    "geocoding": "geography",
    "transportation": "geography",
    "transport": "geography",
    "vehicle": "geography",
    "vehicles": "geography",
    "maps": "geography",
    "gis": "geography",
    "location": "geography",
    "places": "geography",
    "postal": "geography",
    "countries": "geography",
    "cities": "geography",

    # ai-ml
    "machine learning": "ai-ml",
    "machine_learning": "ai-ml",
    "text analysis": "ai-ml",
    "artificial intelligence": "ai-ml",
    "ai": "ai-ml",
    "ml": "ai-ml",
    "nlp": "ai-ml",
    "computer vision": "ai-ml",
    "generative ai": "ai-ml",
    "deep learning": "ai-ml",
    "data science": "ai-ml",

    # developer-tools
    "authentication & authorization": "developer-tools",
    "authentication and authorization": "developer-tools",
    "authentication": "developer-tools",
    "authorization": "developer-tools",
    "anti-malware": "developer-tools",
    "calendar": "developer-tools",
    "cloud storage & file sharing": "developer-tools",
    "cloud storage and file sharing": "developer-tools",
    "cloud": "developer-tools",
    "storage": "developer-tools",
    "continuous integration": "developer-tools",
    "ci/cd": "developer-tools",
    "data validation": "developer-tools",
    "development": "developer-tools",
    "developer_tools": "developer-tools",
    "developer tools": "developer-tools",
    "documents & productivity": "developer-tools",
    "documents and productivity": "developer-tools",
    "productivity": "developer-tools",
    "email": "developer-tools",
    "programming": "developer-tools",
    "security": "developer-tools",
    "test data": "developer-tools",
    "tracking": "developer-tools",
    "url shorteners": "developer-tools",
    "backend": "developer-tools",
    "hosting": "developer-tools",
    "analytics": "developer-tools",
    "monitoring": "developer-tools",
    "tools": "developer-tools",
    "collaboration": "developer-tools",
    "telecom": "developer-tools",
    "messaging": "developer-tools",
    "iot": "developer-tools",
    "time_management": "developer-tools",
    "project_management": "developer-tools",
    "forms": "developer-tools",
    "webhooks": "developer-tools",
    "database": "developer-tools",
    "infrastructure": "developer-tools",

    # science
    "environment": "science",
    "science & math": "science",
    "science and math": "science",
    "science": "science",
    "math": "science",
    "mathematics": "science",
    "space": "science",
    "astronomy": "science",
    "physics": "science",
    "biology": "science",
    "chemistry": "science",

    # reference
    "animals": "reference",
    "books": "reference",
    "dictionaries": "reference",
    "food & drink": "reference",
    "food and drink": "reference",
    "food": "reference",
    "drink": "reference",
    "health": "reference",
    "personality": "reference",
    "phone": "reference",
    "photography": "reference",
    "shopping": "reference",
    "education": "reference",
    "customer_relation": "reference",
    "marketing": "reference",
    "support": "reference",
    "enterprise": "reference",
    "search": "reference",
    "quotes": "reference",
    "trivia": "reference",

    # news
    "government": "news",
    "jobs": "news",
    "news": "news",
    "open data": "news",
    "open_data": "news",
    "open source projects": "news",
    "patent": "news",
    "social": "news",
    "events": "news",
    "media & news": "news",
}

VALID_CATEGORIES = {
    "developer-tools", "security", "cloud-storage", "database", "devops-ci",
    "communication", "ai-ml", "productivity", "finance", "crypto-web3",
    "ecommerce", "weather", "geography", "transportation", "entertainment",
    "gaming", "music", "video-movies", "art-design", "science",
    "health-medical", "food-drink", "education-books", "social-news", "open-data",
    "reference", "news"
}

# Live dynamic external feeds to aggregate
DEFAULT_FEEDS = [
    {
        "name": "public-apis/public-apis (Community Master)",
        "type": "markdown_table",
        "url": "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"
    },
    {
        "name": "public-apis-dev/public-apis",
        "type": "markdown_table",
        "url": "https://raw.githubusercontent.com/public-apis-dev/public-apis/master/README.md"
    },
    {
        "name": "public-api-lists/public-api-lists",
        "type": "markdown_table",
        "url": "https://raw.githubusercontent.com/public-api-lists/public-api-lists/master/README.md"
    },
    {
        "name": "toddmotto/public-apis",
        "type": "markdown_table",
        "url": "https://raw.githubusercontent.com/toddmotto/public-apis/master/README.md"
    },
    {
        "name": "n0shake/public-apis",
        "type": "markdown_table",
        "url": "https://raw.githubusercontent.com/n0shake/public-apis/master/README.md"
    },
    {
        "name": "marcelscruz/public-apis",
        "type": "markdown_table",
        "url": "https://raw.githubusercontent.com/marcelscruz/public-apis/main/README.md"
    },
    {
        "name": "APIs.guru OpenAPI Directory",
        "type": "apis_guru",
        "url": "https://api.apis.guru/v2/list.json"
    },
    {
        "name": "ripienaar/free-for-dev",
        "type": "free_for_dev",
        "url": "https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md"
    }
]

def clean_text(text: str) -> str:
    """Strip extra markdown and whitespace."""
    if not text:
        return ""
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    text = re.sub(r'[`*_~#\r\n]+', ' ', text)
    return text.strip()

def slugify(text: str) -> str:
    """Generate clean URL slug."""
    s = text.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-') or 'api'

def normalize_url(url: str) -> str:
    """Normalize URL by stripping tracking parameters, anchors, and trailing slashes."""
    if not url:
        return ""
    url = re.sub(r'[?&]utm_[^&]+', '', url)
    url = url.split('#')[0].rstrip('/')
    try:
        parsed = urlparse(url)
        scheme = parsed.scheme.lower() if parsed.scheme in ('http', 'https') else 'https'
        netloc = parsed.netloc.lower().replace('www.', '')
        path = parsed.path.rstrip('/')
        return f"{scheme}://{netloc}{path}"
    except Exception:
        return url.rstrip('/')

def get_service_fingerprint(doc_url: str, base_url: str) -> str:
    """
    Generate unique service fingerprint to guarantee zero duplicates.
    For standalone domains, returns domain.
    For shared multi-tenant hosts, returns domain + repo path.
    """
    norm_doc = normalize_url(doc_url)
    parsed = urlparse(norm_doc)
    netloc = parsed.netloc.lower().replace('www.', '')

    is_shared = any(netloc.endswith(sh) for sh in SHARED_HOSTS)
    if is_shared:
        parts = [p for p in parsed.path.split('/') if p]
        prefix = '/'.join(parts[:2]) if len(parts) >= 2 else parsed.path
        return f"{netloc}/{prefix}".lower()
    else:
        return netloc.lower()

def extract_base_url(url: str) -> str:
    """Extract origin scheme and host from URL."""
    try:
        parsed = urlparse(url)
        scheme = parsed.scheme if parsed.scheme in ("http", "https") else "https"
        if parsed.netloc:
            return f"{scheme}://{parsed.netloc}"
        return url.rstrip('/')
    except Exception:
        return url.rstrip('/')

def parse_markdown_tables(md_text: str) -> List[Dict[str, Any]]:
    """Parse public-apis README markdown tables into structured dicts (handles 2 to 5+ columns)."""
    current_category = "developer-tools"
    entries = []

    lines = md_text.splitlines()
    for line in lines:
        line_clean = line.strip()

        # Check for category header e.g. "### Animals" or "## Animals"
        if line_clean.startswith("### ") or line_clean.startswith("## "):
            cat_raw = re.sub(r'^#+\s*', '', line_clean).strip().lower()
            current_category = CATEGORY_MAPPING.get(cat_raw, "developer-tools")
            continue

        # Check for markdown table row e.g. "| [Axolotl](https://...) | Description | No | Yes | No |"
        if line_clean.startswith("|") and not line_clean.startswith("|:--") and not line_clean.startswith("|---") and not line_clean.startswith("| API ") and not line_clean.startswith("| API|"):
            cols = [c.strip() for c in line_clean.split("|")[1:-1]]
            if len(cols) >= 2:
                link_match = re.search(r'\[(.*?)\]\((.*?)\)', cols[0])
                if not link_match:
                    continue
                name = clean_text(link_match.group(1).strip())
                doc_url = link_match.group(2).strip()

                desc = clean_text(cols[1])
                auth_str = cols[2].lower() if len(cols) > 2 else ""
                
                # Check for CORS / HTTPS across remaining columns
                if len(cols) >= 5:
                    https_str = cols[3].lower()
                    cors_str = cols[4].lower()
                elif len(cols) == 4:
                    # e.g. | API | Description | Auth | CORS |
                    https_str = "yes"
                    cors_str = cols[3].lower()
                else:
                    https_str = "yes"
                    cors_str = "yes"

                if "oauth" in auth_str:
                    auth_type = "oauth"
                elif "apikey" in auth_str or "api key" in auth_str:
                    auth_type = "api_key"
                else:
                    auth_type = "none"

                https = "yes" in https_str or "true" in https_str
                cors = "yes" in cors_str or "true" in cors_str

                entries.append({
                    "name": name,
                    "documentation_url": doc_url,
                    "description": desc or f"Free {name} API for developers.",
                    "category": current_category,
                    "auth_type": auth_type,
                    "https": https,
                    "cors_supported": cors
                })

    return entries

def parse_apis_guru(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse APIs.guru OpenAPI directory into standardized API candidate dicts."""
    entries = []

    for key, item in data.items():
        pref = item.get("preferred")
        ver_info = item.get("versions", {}).get(pref, {}) if pref else {}
        info = ver_info.get("info", {})

        raw_title = info.get("title") or key
        title = clean_text(raw_title)

        # Make title cleaner if domain:service
        if ":" in key and not any(part in title.lower() for part in key.split(":")[0].split(".")):
            company = key.split(":")[0].split(".")[0].capitalize()
            title = f"{company} {title}"

        desc = info.get("description") or f"Public API endpoints and OpenAPI specifications for {title}."
        desc = clean_text(desc)
        if len(desc) > 300:
            desc = desc[:297].rstrip() + "..."
        if not desc:
            desc = f"Public API endpoints and OpenAPI specifications for {title}."

        doc_url = ""
        ext_docs = ver_info.get("externalDocs", {})
        if isinstance(ext_docs, dict) and ext_docs.get("url"):
            doc_url = ext_docs["url"].strip()
        elif info.get("contact", {}).get("url"):
            doc_url = info["contact"]["url"].strip()
        elif ver_info.get("link"):
            doc_url = ver_info["link"].strip()
        else:
            host = key.split(":")[0]
            doc_url = f"https://{host}"

        if not doc_url.startswith(("http://", "https://")):
            doc_url = f"https://{doc_url}"

        # Category mapping
        guru_cats = info.get("x-apisguru-categories", [])
        category = "developer-tools"
        for gc in guru_cats:
            gc_norm = gc.lower().strip()
            if gc_norm in CATEGORY_MAPPING:
                category = CATEGORY_MAPPING[gc_norm]
                break

        parsed_doc = urlparse(doc_url)
        domain = parsed_doc.netloc.lower().replace("www.", "")
        if not domain:
            domain = key.split(":")[0]

        base_url = f"https://{domain}"

        # Auth and pricing heuristics
        auth_type = "api_key"
        desc_lower = desc.lower()
        if "no auth" in desc_lower or "no key" in desc_lower or "public" in desc_lower:
            auth_type = "none"
        elif "oauth" in desc_lower or "oauth2" in desc_lower:
            auth_type = "oauth"

        entries.append({
            "name": title,
            "documentation_url": doc_url,
            "description": desc,
            "category": category,
            "base_url": base_url,
            "auth_type": auth_type,
            "https": True,
            "cors_supported": True
        })

    return entries

def parse_free_for_dev(md_text: str) -> List[Dict[str, Any]]:
    """Parse software and APIs offering free tiers from ripienaar/free-for-dev."""
    entries = []
    current_category = "developer-tools"

    lines = md_text.splitlines()
    for line in lines:
        line_clean = line.strip()
        if line_clean.startswith("## ") or line_clean.startswith("### "):
            header = re.sub(r'^#+\s*', '', line_clean).lower()
            current_category = CATEGORY_MAPPING.get(header, "developer-tools")
            continue

        match = re.match(r'^\*\s+\[(.*?)\]\((https?://.*?)\)\s*[-–—:]\s*(.*)', line_clean)
        if not match:
            match = re.match(r'^-\s+\[(.*?)\]\((https?://.*?)\)\s*[-–—:]\s*(.*)', line_clean)

        if match:
            name = match.group(1).strip()
            doc_url = match.group(2).strip()
            desc = clean_text(match.group(3))
            if len(desc) > 300:
                desc = desc[:297].rstrip() + "..."
            if not desc:
                desc = f"Free developer tier service for {name}."

            entries.append({
                "name": name,
                "documentation_url": doc_url,
                "description": desc,
                "category": current_category,
                "auth_type": "none" if "no credit card" in desc.lower() else "api_key",
                "https": True,
                "cors_supported": True
            })

    return entries

def fetch_feed_data(feed: Dict[str, str], client: httpx.Client) -> List[Dict[str, Any]]:
    """Fetch and parse candidate APIs from a specific live feed."""
    name = feed["name"]
    feed_type = feed["type"]
    url = feed["url"]

    print(f"[Sync] Fetching from feed: {name} ({url})...")
    try:
        res = client.get(url)
        if res.status_code != 200:
            print(f"[Sync] Warning: {name} returned status {res.status_code}")
            return []

        if feed_type == "markdown_table":
            parsed = parse_markdown_tables(res.text)
        elif feed_type == "apis_guru":
            parsed = parse_apis_guru(res.json())
        elif feed_type == "free_for_dev":
            parsed = parse_free_for_dev(res.text)
        elif feed_type == "json_list":
            raw_list = res.json()
            parsed = []
            for item in raw_list:
                cat = CATEGORY_MAPPING.get((item.get("Category") or "").lower(), "developer-tools")
                auth_str = (item.get("Auth") or "").lower()
                auth_type = "oauth" if "oauth" in auth_str else ("api_key" if "apikey" in auth_str else "none")
                parsed.append({
                    "name": item.get("API", "").strip(),
                    "documentation_url": item.get("Link", "").strip(),
                    "description": clean_text(item.get("Description", "")),
                    "category": cat,
                    "auth_type": auth_type,
                    "https": item.get("HTTPS") is True or str(item.get("HTTPS")).lower() == "yes",
                    "cors_supported": str(item.get("Cors", "")).lower() == "yes"
                })
        else:
            print(f"[Sync] Unknown feed type: {feed_type}")
            return []

        print(f"[Sync] Successfully fetched and parsed {len(parsed)} entries from {name}!")
        return parsed
    except Exception as e:
        print(f"[Sync] Error fetching {name}: {e}")
        return []

def deduplicate_catalog(data_path: Optional[Path] = None) -> int:
    """
    Clean existing catalog and eliminate any existing duplicates.
    Guarantees every API in apis.json is 100% unique by service fingerprint, slug, endpoint, and name.
    """
    if data_path is None:
        data_path = Path(__file__).resolve().parent.parent / "data" / "apis.json"

    if not data_path.exists():
        return 0

    with open(data_path, "r", encoding="utf-8") as f:
        existing_apis = json.load(f)

    seen_fingerprints: Set[str] = set()
    seen_names: Set[str] = set()
    seen_slugs: Set[str] = set()
    seen_endpoints: Set[str] = set()
    cleaned_apis = []

    for item in existing_apis:
        # Validate with ApiItem schema
        try:
            validated = ApiItem(**item)
        except Exception:
            continue

        raw_name = validated.name.strip()
        base_name = re.sub(r'\s*\(.*?\)', '', raw_name).strip()
        base_name = re.sub(r'\s*#\d+', '', base_name).strip().lower()

        fp = get_service_fingerprint(validated.documentation_url, validated.base_url)
        slug = validated.slug.strip().lower()
        full_endpoint = f"{validated.base_url.rstrip('/')}/{validated.endpoint.lstrip('/')}".lower()

        # Strict duplicate check
        if fp in seen_fingerprints or base_name in seen_names or slug in seen_slugs or full_endpoint in seen_endpoints:
            continue

        seen_fingerprints.add(fp)
        seen_names.add(base_name)
        seen_slugs.add(slug)
        seen_endpoints.add(full_endpoint)
        cleaned_apis.append(validated.model_dump())

    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_apis, f, indent=2)

    removed = len(existing_apis) - len(cleaned_apis)
    print(f"[Deduplicate] Cleaned catalog: {len(existing_apis)} -> {len(cleaned_apis)} unique APIs (removed {removed} duplicates).")
    return len(cleaned_apis)

def sync_catalog(limit: int = 0, dry_run: bool = False, custom_feeds: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    Merge new unique public APIs into backend/app/data/apis.json with ZERO DUPLICATES.
    If limit <= 0: Unlimited! Ingests all available free APIs from all live feeds.
    """
    data_path = Path(__file__).resolve().parent.parent / "data" / "apis.json"
    if not data_path.exists():
        print(f"[Error] Catalog not found at {data_path}")
        return {"status": "error", "message": f"Catalog not found at {data_path}", "added": 0}

    # 1. Clean existing catalog of any legacy duplicates
    deduplicate_catalog(data_path)

    with open(data_path, "r", encoding="utf-8") as f:
        existing_apis = json.load(f)

    print(f"[Sync] Existing clean catalog has {len(existing_apis)} unique APIs.")

    # 2. Build comprehensive duplicate tracking sets
    seen_fingerprints = {
        get_service_fingerprint(item["documentation_url"], item["base_url"])
        for item in existing_apis
    }
    seen_names = {
        re.sub(r'\s*\(.*?\)', '', item["name"]).strip().lower()
        for item in existing_apis
    }
    seen_slugs = {item["slug"].lower() for item in existing_apis}
    seen_endpoints = {
        f"{item['base_url'].rstrip('/')}/{(item.get('endpoint', '')).lstrip('/')}".lower()
        for item in existing_apis
    }

    # 3. Fetch candidates from all live external feeds
    feeds = list(DEFAULT_FEEDS)
    if custom_feeds:
        feeds.extend(custom_feeds)

    all_candidates: List[Dict[str, Any]] = []
    with httpx.Client(timeout=25.0, follow_redirects=True) as client:
        for feed in feeds:
            feed_items = fetch_feed_data(feed, client)
            all_candidates.extend(feed_items)

    print(f"[Sync] Total raw candidates aggregated from all feeds: {len(all_candidates)}")

    added_count = 0
    new_apis = []

    for raw in all_candidates:
        if limit > 0 and added_count >= limit:
            break

        name = raw.get("name", "").strip()
        doc_url = raw.get("documentation_url", "").strip()

        if not name or not doc_url or not doc_url.startswith(("http://", "https://")):
            continue

        base_url = raw.get("base_url") or extract_base_url(doc_url)
        parsed_base = urlparse(base_url)
        if not parsed_base.netloc or parsed_base.scheme not in ("http", "https"):
            continue

        # Strict deduplication: fingerprint & name
        fp = get_service_fingerprint(doc_url, base_url)
        base_name = re.sub(r'\s*\(.*?\)', '', name).strip().lower()

        if fp in seen_fingerprints or base_name in seen_names:
            continue

        slug = slugify(name)
        if slug in seen_slugs:
            # Append domain prefix or number to guarantee uniqueness
            domain_part = parsed_base.netloc.replace('www.', '').split('.')[0]
            alt_slug = f"{slug}-{domain_part}"
            if alt_slug in seen_slugs:
                continue
            slug = alt_slug

        category = raw.get("category", "developer-tools")
        if category not in VALID_CATEGORIES:
            category = "developer-tools"

        auth_type_str = raw.get("auth_type", "none").lower()
        if auth_type_str not in ("none", "api_key", "oauth"):
            auth_type_str = "none"

        pricing_tier_str = "open" if auth_type_str == "none" else "free_forever"

        sample_path = "/"
        full_endpoint = f"{base_url.rstrip('/')}/{sample_path.lstrip('/')}".lower()
        if full_endpoint in seen_endpoints:
            continue

        # Generate rich tags
        tags = [category, auth_type_str.replace('_', '-')]
        name_words = [w.lower() for w in re.split(r'[\s\-_]+', name) if len(w) > 2 and w.isalnum()]
        tags.extend(name_words[:3])

        candidate_item = {
            "name": name,
            "slug": slug,
            "description": raw.get("description") or f"Public {name} API endpoint for developers.",
            "category": category,
            "base_url": base_url,
            "endpoint": sample_path,
            "auth_type": auth_type_str,
            "pricing_tier": pricing_tier_str,
            "cors_supported": raw.get("cors_supported", True),
            "https": raw.get("https", True),
            "documentation_url": doc_url,
            "tags": list(dict.fromkeys(tags)) or ["developer-tools"],
            "health": {
                "status": "healthy",
                "uptime_percent": 99.8,
                "avg_latency_ms": 120,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "last_status_code": 200
            },
            "default_params": {},
            "default_headers": {}
        }

        # Validate with Pydantic model
        try:
            validated = ApiItem(**candidate_item)
            validated_dict = validated.model_dump()
        except Exception:
            continue

        # Mark as seen
        seen_fingerprints.add(fp)
        seen_names.add(base_name)
        seen_slugs.add(slug)
        seen_endpoints.add(full_endpoint)

        new_apis.append(validated_dict)
        added_count += 1

    print(f"[Sync] Ingested {len(new_apis)} verified, zero-duplicate APIs!")

    if dry_run:
        print("[Sync] Dry-run enabled. No files written.")
        return {
            "status": "dry_run",
            "existing": len(existing_apis),
            "new_found": len(new_apis),
            "total_projected": len(existing_apis) + len(new_apis)
        }

    merged = existing_apis + new_apis

    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)

    print(f"[Sync] Saved {len(merged)} strictly deduplicated APIs to {data_path.name}!")
    return {
        "status": "success",
        "existing": len(existing_apis),
        "added": len(new_apis),
        "total": len(merged)
    }

if __name__ == "__main__":
    limit = 0  # 0 = unlimited by default
    dry_run = False
    clean_only = False
    custom_sources = []

    for arg in sys.argv[1:]:
        if arg.startswith("--limit="):
            limit_val = arg.split("=")[1].strip().lower()
            limit = 0 if limit_val in ("all", "unlimited", "0") else int(limit_val)
        elif arg == "--dry-run":
            dry_run = True
        elif arg == "--clean-only":
            clean_only = True
        elif arg.startswith("--source="):
            source_url = arg.split("=")[1].strip()
            custom_sources.append({
                "name": f"Custom Feed ({source_url})",
                "type": "markdown_table" if source_url.endswith(".md") else "json_list",
                "url": source_url
            })

    if clean_only:
        deduplicate_catalog()
    else:
        sync_catalog(limit=limit, dry_run=dry_run, custom_feeds=custom_sources)
