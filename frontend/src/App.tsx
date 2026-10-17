import React, { useState, useEffect } from 'react';
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
import { Search, X } from 'lucide-react';

// Global Search Modal helper
const GlobalSearchModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via custom event or prop
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

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70">
      <div className="w-full max-w-xl glass-panel rounded-2xl border border-border p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <Search className="h-5 w-5 text-accent" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type API name, tag, or category and press Enter..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px] text-slate-400">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-slate-300">Enter</kbd> to search</span>
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-slate-300">Esc</kbd> to close</span>
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
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-background text-slate-100">
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
  );
}
