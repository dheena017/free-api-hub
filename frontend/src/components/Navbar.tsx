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
  Star,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useBookmarks } from '../utils/useBookmarks';
import { useTheme } from '../utils/ThemeContext';
import { Logo } from './Logo';

interface NavbarProps {
  onOpenSearchModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearchModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { bookmarks } = useBookmarks();
  const { theme, resolvedTheme, toggleTheme, cycleTheme, setTheme } = useTheme();

  const navLinks = [
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Collections', href: '/collections/no-auth', icon: FolderTree },
    { label: 'Live Status', href: '/status', icon: Activity },
    { label: 'Submit API', href: '/submit', icon: PlusCircle }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Custom Logo */}
        <Link to="/" className="group hover:opacity-90 transition-opacity" aria-label="Free API Hub Home">
          <Logo size="md" withText={true} />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Primary Navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href.split('/')[1]));
            return (
              <Link
                key={link.label}
                to={link.href}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'text-accent bg-accent/10 border border-accent/30 font-semibold'
                    : 'text-text-muted hover:text-text-base hover:bg-surface-elevated border border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
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
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated hover:bg-surface-hover border border-border text-text-base text-xs font-medium transition-colors"
              title="View Bookmarked APIs"
            >
              <Star className="h-3.5 w-3.5 fill-[#FDD663] text-[#FDD663]" />
              <span>Saved ({bookmarks.length})</span>
            </Link>
          )}

          {onOpenSearchModal && (
            <button
              onClick={onOpenSearchModal}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface-elevated hover:bg-surface-hover text-text-muted hover:text-text-base text-xs font-mono transition-colors cursor-pointer"
              aria-label="Search APIs"
            >
              <Search className="h-3.5 w-3.5 text-text-muted" />
              <span>Search APIs...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] text-text-muted font-sans">
                Ctrl K
              </kbd>
            </button>
          )}

          {/* Theme Switcher Toggle */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-full text-text-muted hover:text-text-base hover:bg-surface-elevated transition-colors border border-transparent hover:border-border cursor-pointer relative"
            title={`Current theme: ${theme.toUpperCase()} (Active: ${resolvedTheme}) — Click to cycle System / Dark / Light`}
            aria-label={`Current theme: ${theme}. Click to cycle themes.`}
          >
            {theme === 'system' ? (
              <Monitor className="h-4 w-4 text-accent" />
            ) : resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4 text-accent" />
            ) : (
              <Sun className="h-4 w-4 text-[#FDD663]" />
            )}
            {theme === 'system' && (
              <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full text-text-muted hover:text-text-base hover:bg-surface-elevated transition-colors"
            title="GitHub Repository"
            aria-label="GitHub Repository"
          >
            <Github className="h-4 w-4" />
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-elevated border border-border"
            aria-label="Open mobile menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 pt-2 pb-4 space-y-1">
          {onOpenSearchModal && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSearchModal();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-text-muted bg-surface-elevated border border-border mb-2"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-text-muted" />
                <span>Search APIs...</span>
              </div>
              <span className="text-[10px] text-text-muted font-mono">Ctrl K</span>
            </button>
          )}
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-base hover:text-accent hover:bg-surface-elevated"
              >
                <Icon className="h-4 w-4 text-accent" />
                {link.label}
              </Link>
            );
          })}
          {bookmarks.length > 0 && (
            <Link
              to="/explore?fav=1"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#FDD663] hover:bg-surface-elevated"
            >
              <Star className="h-4 w-4 text-[#FDD663] fill-[#FDD663]" />
              <span>Saved APIs ({bookmarks.length})</span>
            </Link>
          )}

          {/* Mobile Theme Selector */}
          <div className="pt-3 mt-2 border-t border-border flex items-center justify-between px-1">
            <span className="text-xs font-medium text-text-muted">Theme</span>
            <div className="flex items-center gap-1 bg-surface-elevated rounded-full p-1 border border-border">
              <button
                onClick={() => setTheme('light')}
                className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                  theme === 'light' ? 'bg-accent/20 text-accent font-semibold' : 'text-text-muted hover:text-text-base'
                }`}
                title="Light Theme"
              >
                <Sun className="h-3.5 w-3.5 text-[#FDD663]" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                  theme === 'dark' ? 'bg-accent/20 text-accent font-semibold' : 'text-text-muted hover:text-text-base'
                }`}
                title="Dark Theme"
              >
                <Moon className="h-3.5 w-3.5 text-accent" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                  theme === 'system' ? 'bg-accent/20 text-accent font-semibold' : 'text-text-muted hover:text-text-base'
                }`}
                title="System Theme"
              >
                <Monitor className="h-3.5 w-3.5 text-accent" />
                <span>Auto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
