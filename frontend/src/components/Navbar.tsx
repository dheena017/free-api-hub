import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap,
  Sparkles,
  Search,
  Activity,
  PlusCircle,
  FolderTree,
  Compass,
  Menu,
  X,
  Github,
  Star
} from 'lucide-react';
import { useBookmarks } from '../utils/useBookmarks';
import { Logo } from './Logo';

interface NavbarProps {
  onOpenSearchModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearchModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { bookmarks } = useBookmarks();

  const navLinks = [
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Collections', href: '/collections/no-auth', icon: FolderTree },
    { label: 'Live Status', href: '/status', icon: Activity },
    { label: 'Submit API', href: '/submit', icon: PlusCircle }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#3C4043] bg-[#1F1F1F]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Custom Logo */}
        <Link to="/" className="group hover:opacity-90 transition-opacity">
          <Logo size="md" withText={true} />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href.split('/')[1]));
            return (
              <Link
                key={link.label}
                to={link.href}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'text-[#8AB4F8] bg-[#8AB4F8]/15 border border-[#8AB4F8]/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-[#28292A]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Saved Bookmarks Button */}
          {bookmarks.length > 0 && (
            <Link
              to="/explore?fav=1"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-medium transition-colors"
              title="View Bookmarked APIs"
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>Saved ({bookmarks.length})</span>
            </Link>
          )}

          {onOpenSearchModal && (
            <button
              onClick={onOpenSearchModal}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#3C4043] bg-[#28292A] hover:bg-[#303134] text-slate-300 hover:text-white text-xs font-mono transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Search APIs...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#1F1F1F] border border-[#3C4043] text-[10px] text-slate-400">
                Ctrl K
              </kbd>
            </button>
          )}

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#28292A] transition-colors"
            title="GitHub Repository"
          >
            <Github className="h-4 w-4" />
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#28292A] border border-[#3C4043]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#3C4043] bg-[#28292A] px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-[#303134]"
              >
                <Icon className="h-4 w-4 text-[#8AB4F8]" />
                {link.label}
              </Link>
            );
          })}
          {bookmarks.length > 0 && (
            <Link
              to="/explore?fav=1"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-amber-300 hover:bg-[#303134]"
            >
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span>Saved APIs ({bookmarks.length})</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
