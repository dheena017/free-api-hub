import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart } from 'lucide-react';
import { Logo } from './Logo';
import { fetchCategories } from '../api/client';
import { CategorySummary } from '../types/api';

export const Footer: React.FC = () => {
  const [categories, setCategories] = useState<CategorySummary[]>([]);

  useEffect(() => {
    fetchCategories()
      .then((cats) => setCategories(cats.slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-[#3C4043] bg-[#1F1F1F] mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-3.5">
            <Logo size="sm" withText={true} />
            <p className="text-xs text-slate-400 leading-relaxed">
              The verified, developer-centric search engine and in-browser playground for genuinely free REST APIs. Zero credit card traps.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-[#81C995] font-mono bg-[#81C995]/10 px-2.5 py-1 rounded-lg border border-[#81C995]/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Automated Health Probes Daily</span>
            </div>
          </div>

          {/* Directory Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5 font-mono">Directory</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/explore" className="hover:text-[#8AB4F8] transition-colors">All APIs</Link></li>
              <li><Link to="/explore?auth=none" className="hover:text-[#8AB4F8] transition-colors">No Auth Required</Link></li>
              <li><Link to="/explore?sort=latency" className="hover:text-[#8AB4F8] transition-colors">Fastest Response (&lt;100ms)</Link></li>
              <li><Link to="/collections/cors-enabled" className="hover:text-[#8AB4F8] transition-colors">CORS-Ready APIs</Link></li>
            </ul>
          </div>

          {/* Popular Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5 font-mono">Popular Categories</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {categories.length > 0 ? (
                categories.map((c) => (
                  <li key={c.slug}>
                    <Link to={`/category/${c.slug}`} className="hover:text-[#8AB4F8] transition-colors">
                      {c.name}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/category/developer-tools" className="hover:text-[#8AB4F8] transition-colors">Developer Tools</Link></li>
                  <li><Link to="/category/security" className="hover:text-[#8AB4F8] transition-colors">Security</Link></li>
                  <li><Link to="/category/weather" className="hover:text-[#8AB4F8] transition-colors">Weather</Link></li>
                  <li><Link to="/category/finance" className="hover:text-[#8AB4F8] transition-colors">Finance</Link></li>
                  <li><Link to="/category/database" className="hover:text-[#8AB4F8] transition-colors">Database</Link></li>
                  <li><Link to="/category/ai-ml" className="hover:text-[#8AB4F8] transition-colors">AI & ML</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5 font-mono">Platform</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/status" className="hover:text-[#8AB4F8] transition-colors">Live Health Dashboard</Link></li>
              <li><Link to="/submit" className="hover:text-[#8AB4F8] transition-colors">Submit a Free API</Link></li>
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#8AB4F8] transition-colors">GitHub Repository</a></li>
              <li><a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-[#8AB4F8] transition-colors">FastAPI Backend Docs</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#3C4043] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Free API Hub. Open-source & developer-first.</p>
          <p className="flex items-center gap-1.5">
            Built for developers with <Heart className="h-3 w-3 text-[#F28B82] fill-[#F28B82]" />
          </p>
        </div>
      </div>
    </footer>
  );
};
