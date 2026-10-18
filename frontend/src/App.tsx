import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { ApiDetailPage } from './pages/ApiDetailPage';
import { CategoryPage } from './pages/CategoryPage';
import { CollectionPage } from './pages/CollectionPage';
import { StatusPage } from './pages/StatusPage';
import { SubmitPage } from './pages/SubmitPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { fetchApis } from './api/client';
import { ApiItem } from './types/api';
import { Search, X, ArrowRight, Zap, Star } from 'lucide-react';
import { ToastProvider } from './utils/useToast';

// Upgraded Global Search Modal with Live Suggestions & Keyboard Navigation
const GlobalSearchModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ApiItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          window.dispatchEvent(new CustomEvent('toggle-search-modal'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(-1);
    } else {
      setQuery('');
      setSuggestions([]);
    }
  }, [isOpen]);

  // Live debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchApis({ q: query.trim(), limit: 6 });
        setSuggestions(res.items);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Search suggestion error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        navigate(`/api/${suggestions[selectedIndex].slug}`);
        onClose();
      } else if (query.trim()) {
        navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
        onClose();
      }
    }
  };

  const handleSelectApi = (slug: string) => {
    navigate(`/api/${slug}`);
    onClose();
  };

  const handleExploreAll = () => {
    if (query.trim()) {
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#28292A] rounded-2xl border border-[#3C4043] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-[#3C4043]">
          <Search className="h-5 w-5 text-[#8AB4F8] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInInput}
            placeholder="Type API name, tag, or topic (e.g. weather, crypto, pokemon)..."
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-slate-400 outline-none font-medium"
          />
          {isSearching && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#8AB4F8] border-t-transparent flex-shrink-0" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#303134]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Live Suggestions List */}
        {suggestions.length > 0 && (
          <div className="max-h-80 overflow-y-auto divide-y divide-[#3C4043] p-2">
            <div className="px-3 py-1.5 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Matching Endpoints
            </div>
            {suggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectApi(item.slug)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#303134] text-white'
                      : 'hover:bg-[#303134]/60 text-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{item.name}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-300 px-1.5 py-0.5 rounded bg-[#1F1F1F] border border-[#3C4043]">
                        {item.category}
                      </span>
                      {item.auth_type === 'none' && (
                        <span className="text-[10px] text-[#81C995] font-mono flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5" />
                          <span>No Key</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {item.short_description || item.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-shrink-0">
                    <span className="text-[#81C995] font-semibold">{item.health.avg_latency_ms}ms</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#8AB4F8]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Jump Bar when search is empty */}
        {!query.trim() && (
          <div className="p-4 space-y-4">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                Quick Collections
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Zero-Auth', path: '/collections/no-auth', desc: 'No Key Required' },
                  { label: 'CORS-Ready', path: '/collections/cors-enabled', desc: 'Direct Browser' },
                  { label: 'Ultra Fast', path: '/collections/fast-response', desc: '<120ms Latency' },
                  { label: 'Open Data', path: '/collections/open-data', desc: 'Public Science/Geo' }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] hover:border-[#8AB4F8]/50 text-left transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-white group-hover:text-[#8AB4F8]">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                Trending Searches
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {['weather', 'crypto', 'pokemon', 'geocoding', 'placeholder', 'ai', 'books'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      navigate(`/explore?q=${encodeURIComponent(tag)}`);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] border border-[#3C4043] text-slate-300 hover:text-white transition-colors font-mono text-[11px] cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state when query produces no result */}
        {query.trim() && !isSearching && suggestions.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400">
            No instant matches found for "<strong>{query}</strong>". Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-[#1F1F1F] border border-[#3C4043] text-slate-300 font-mono">
              Enter
            </kbd>{' '}
            to explore all results.
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="p-3 bg-[#1F1F1F] border-t border-[#3C4043] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#28292A] border border-[#3C4043] text-slate-300">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#28292A] border border-[#3C4043] text-slate-300">Enter</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#28292A] border border-[#3C4043] text-slate-300">Esc</kbd> Close
            </span>
          </div>

          {query.trim() && (
            <button
              onClick={handleExploreAll}
              className="text-[#8AB4F8] hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Explore all in directory</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setSearchModalOpen((prev) => !prev);
    window.addEventListener('toggle-search-modal', handleToggle);
    return () => window.removeEventListener('toggle-search-modal', handleToggle);
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-background text-slate-100 font-sans">
          <Navbar onOpenSearchModal={() => setSearchModalOpen(true)} />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/api/:slug" element={<ApiDetailPage />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/collections/:filter" element={<CollectionPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/submit" element={<SubmitPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          <Footer />
          <GlobalSearchModal
            isOpen={searchModalOpen}
            onClose={() => setSearchModalOpen(false)}
          />
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}
