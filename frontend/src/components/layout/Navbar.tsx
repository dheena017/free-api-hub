import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Menu,
  Star,
  Sun,
  Moon,
  Monitor,
  PanelLeft
} from 'lucide-react';
import { useBookmarks } from '../../utils/useBookmarks';
import { useTheme } from '../../utils/ThemeContext';
import { Logo } from './Logo';

interface NavbarProps {
  onOpenSearchModal?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearchModal,
  onToggleSidebar,
  isSidebarCollapsed
}) => {
  const { bookmarks } = useBookmarks();
  const { theme, resolvedTheme, cycleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border bg-surface transition-colors shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left Section: Expand Sidebar toggle (when collapsed) & Mobile Brand */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-text-muted hover:text-text-base hover:bg-surface-elevated border border-transparent hover:border-border transition-all flex items-center justify-center cursor-pointer lg:hidden"
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <Menu className="h-5 w-5 text-text-base" />
            </button>
          )}



          {/* Mobile-only Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group hover:opacity-90 transition-opacity lg:hidden"
            aria-label="Free API Hub Home"
          >
            <Logo size="sm" withText={true} withBadge={false} />
          </Link>
        </div>

        {/* Center / Search Quick Trigger (Primary search bar) */}
        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          {onOpenSearchModal && (
            <button
              onClick={onOpenSearchModal}
              className="w-full flex items-center justify-between px-4 py-2 rounded-full border border-border bg-surface-elevated hover:bg-surface-hover text-text-muted hover:text-text-base text-xs font-mono transition-all cursor-pointer group shadow-sm"
              aria-label="Search APIs"
            >
              <div className="flex items-center gap-2.5">
                <Search className="h-4 w-4 text-accent" />
                <span className="font-sans text-text-muted group-hover:text-text-base">
                  Search across 4,000+ free APIs and categories...
                </span>
              </div>
              <kbd className="px-2 py-0.5 rounded bg-background border border-border text-[10px] text-text-muted font-mono">
                Ctrl K
              </kbd>
            </button>
          )}
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Mobile search icon button */}
          {onOpenSearchModal && (
            <button
              onClick={onOpenSearchModal}
              className="p-2 rounded-xl text-text-muted hover:text-text-base hover:bg-surface-elevated md:hidden border border-border"
              title="Search APIs"
              aria-label="Search APIs"
            >
              <Search className="h-4 w-4 text-accent" />
            </button>
          )}

          {/* Saved Bookmarks Button */}
          {bookmarks.length > 0 && (
            <Link
              to="/explore?fav=1"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated hover:bg-surface-hover border border-border text-text-base text-xs font-medium transition-colors"
              title="View Bookmarked APIs"
            >
              <Star className="h-3.5 w-3.5 fill-[#FDD663] text-[#FDD663]" />
              <span className="hidden sm:inline">Saved</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#FDD663]/20 text-[#FDD663] font-bold">
                {bookmarks.length}
              </span>
            </Link>
          )}

          {/* Quick Submit API Button */}
          <Link
            to="/submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent text-xs font-semibold transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Submit API</span>
          </Link>

          {/* Theme Switcher Toggle */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl text-text-muted hover:text-text-base hover:bg-surface-elevated border border-border transition-colors flex items-center justify-center cursor-pointer"
            title={`Current theme: ${theme}. Click to switch theme.`}
            aria-label="Toggle Theme"
          >
            {theme === 'system' ? (
              <Monitor className="h-4 w-4 text-accent" />
            ) : resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4 text-accent" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
