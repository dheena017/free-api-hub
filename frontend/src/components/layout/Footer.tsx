import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart } from 'lucide-react';
import { Logo } from './Logo';
import { fetchCategories } from '../../api/client';
import { CategorySummary } from '../../types/api';

export const Footer: React.FC = () => {
  const [categories, setCategories] = useState<CategorySummary[]>([]);

  useEffect(() => {
    fetchCategories()
      .then((cats) => setCategories(cats.slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-border bg-surface mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-3.5">
            <Logo size="sm" withText={true} />
            <p className="text-xs text-text-muted leading-relaxed">
              The verified, developer-centric search engine and in-browser playground for genuinely free REST APIs. Zero credit card traps.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-healthy font-mono bg-healthy/10 px-2.5 py-1 rounded-lg border border-healthy/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Automated Health Probes Daily</span>
            </div>
          </div>

          {/* Directory Links */}
          <div>
            <h4 className="text-xs font-bold text-text-base uppercase tracking-wider mb-3.5 font-mono">Directory</h4>
            <ul className="space-y-2 text-xs text-text-muted">
              <li><Link to="/explore" className="hover:text-accent transition-colors">All APIs</Link></li>
              <li><Link to="/explore?auth=none" className="hover:text-accent transition-colors">No Auth Required</Link></li>
              <li><Link to="/explore?sort=latency" className="hover:text-accent transition-colors">Fastest Response (&lt;100ms)</Link></li>
              <li><Link to="/collections/cors-enabled" className="hover:text-accent transition-colors">CORS-Ready APIs</Link></li>
            </ul>
          </div>

          {/* Popular Categories */}
          <div>
            <h4 className="text-xs font-bold text-text-base uppercase tracking-wider mb-3.5 font-mono">Popular Categories</h4>
            <ul className="space-y-2 text-xs text-text-muted">
              {categories.length > 0 ? (
                categories.map((c) => (
                  <li key={c.slug}>
                    <Link to={`/category/${c.slug}`} className="hover:text-accent transition-colors">
                      {c.name}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/category/developer-tools" className="hover:text-accent transition-colors">Developer Tools</Link></li>
                  <li><Link to="/category/security" className="hover:text-accent transition-colors">Security</Link></li>
                  <li><Link to="/category/weather" className="hover:text-accent transition-colors">Weather</Link></li>
                  <li><Link to="/category/finance" className="hover:text-accent transition-colors">Finance</Link></li>
                  <li><Link to="/category/database" className="hover:text-accent transition-colors">Database</Link></li>
                  <li><Link to="/category/ai-ml" className="hover:text-accent transition-colors">AI & ML</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold text-text-base uppercase tracking-wider mb-3.5 font-mono">Platform</h4>
            <ul className="space-y-2 text-xs text-text-muted">
              <li><Link to="/status" className="hover:text-accent transition-colors">Live Health Dashboard</Link></li>
              <li><Link to="/submit" className="hover:text-accent transition-colors">Submit a Free API</Link></li>
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">GitHub Repository</a></li>
              <li><a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">FastAPI Backend Docs</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>© {new Date().getFullYear()} Free API Hub. Open-source & developer-first.</p>
          <p className="flex items-center gap-1.5">
            Built for developers with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
