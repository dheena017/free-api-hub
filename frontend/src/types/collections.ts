import React from 'react';
import {
  Zap,
  Globe,
  Gauge,
  Building2,
  Database,
  ShieldCheck,
  LucideIcon
} from 'lucide-react';

export interface CollectionDefinition {
  id: string;
  name: string;
  shortLabel: string;
  tagline: string;
  desc: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  path: string;
}

export const CURATED_COLLECTIONS: CollectionDefinition[] = [
  {
    id: 'no-auth',
    name: 'No Registration / No Key',
    shortLabel: 'Zero-Auth',
    tagline: 'Instant Zero-Auth APIs',
    desc: 'No Key Required',
    description:
      'These endpoints require absolutely zero accounts, API tokens, or secrets. Perfect for hackathons, student projects, and rapid prototyping without setup friction.',
    icon: Zap,
    path: '/collections/no-auth'
  },
  {
    id: 'cors-enabled',
    name: 'CORS-Ready Endpoints',
    shortLabel: 'CORS-Ready',
    tagline: 'Direct Browser Execution',
    desc: 'Direct Browser',
    description:
      'These APIs return explicit Access-Control-Allow-Origin headers, meaning you can fetch them straight from client-side vanilla JavaScript or React without needing a proxy server.',
    icon: Globe,
    path: '/collections/cors-enabled'
  },
  {
    id: 'fast-response',
    name: 'Ultra Fast (<120ms)',
    shortLabel: 'Ultra Fast',
    tagline: 'Lightning Latency',
    desc: '<120ms Latency',
    description:
      'Blazing fast response times verified under 120 milliseconds. Ideal for high-throughput mobile apps, autocompletes, and interactive micro-interactions.',
    icon: Gauge,
    path: '/collections/fast-response'
  },
  {
    id: 'open-data',
    name: 'Public & Open Datasets',
    shortLabel: 'Open Data',
    tagline: 'Science, Civic & Geodata',
    desc: 'Public Science/Geo',
    description:
      'Free governmental, scientific, astronomical, meteorological, and educational repositories with zero licensing restrictions.',
    icon: Building2,
    path: '/collections/open-data'
  },
  {
    id: 'high-uptime',
    name: 'Ultra High Reliability (99.7%+)',
    shortLabel: 'High Uptime',
    tagline: 'Enterprise Uptime Standards',
    desc: '99.7%+ Uptime',
    description:
      'The most dependable free APIs in our entire directory. Each has passed hundreds of automated daily health checks with near-zero downtime.',
    icon: ShieldCheck,
    path: '/collections/high-uptime'
  },
  {
    id: 'developer-tools',
    name: 'Developer Utilities & APIs',
    shortLabel: 'Dev Tools',
    tagline: 'Coding & Infrastructure APIs',
    desc: 'Dev Utilities',
    description:
      'Essential programmatic utilities, code formatters, validation services, and developer tooling with free tiers.',
    icon: Database,
    path: '/collections/developer-tools'
  }
];

export function getCollectionById(id?: string): CollectionDefinition {
  if (!id) return CURATED_COLLECTIONS[0];
  return (
    CURATED_COLLECTIONS.find((c) => c.id.toLowerCase() === id.toLowerCase()) ||
    CURATED_COLLECTIONS[0]
  );
}
