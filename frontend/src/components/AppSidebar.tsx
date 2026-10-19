import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Activity,
  PlusCircle,
  FolderTree,
  Zap,
  Globe,
  Gauge,
  Database,
  Sparkles,
  Code2,
  Coins,
  CloudSun,
  BookOpen,
  Layers,
  Star,
  PanelLeftClose,
  PanelLeft,
  X,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { Logo } from './Logo';
import { useBookmarks } from '../utils/useBookmarks';
import { useTheme } from '../utils/ThemeContext';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSearchModal: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) => {
  const location = useLocation();
  const { bookmarks } = useBookmarks();
  const { theme, resolvedTheme, cycleTheme } = useTheme();

  const isCurrent = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const mainNav = [
    { label: 'Explore Directory', path: '/explore', icon: Compass, badge: '4,000+' },
    { label: 'Live Status & Uptime', path: '/status', icon: Activity, isLive: true },
    { label: 'Submit API', path: '/submit', icon: PlusCircle, badge: 'Add' },
    { label: 'Home Overview', path: '/', icon: Home }
  ];

  const collections = [
    { label: 'Zero-Auth APIs', path: '/collections/no-auth', icon: Zap },
    { label: 'CORS-Ready', path: '/collections/cors-enabled', icon: Globe },
    { label: 'Ultra Fast (<120ms)', path: '/collections/fast-response', icon: Gauge },
    { label: 'Public Open Data', path: '/collections/open-data', icon: Database }
  ];

  const categories = [
    { label: 'AI & Machine Learning', path: '/category/ai-ml', icon: Sparkles },
    { label: 'Developer Tools', path: '/category/developer-tools', icon: Code2 },
    { label: 'Databases & BaaS', path: '/category/database', icon: Layers },
    { label: 'Finance & FinTech', path: '/category/finance', icon: Coins },
    { label: 'Weather & Climate', path: '/category/weather', icon: CloudSun },
    { label: 'Reference & Books', path: '/category/reference', icon: BookOpen }
  ];

  // Common navigation content inside sidebar
  const renderSidebarContent = (isMobile = false) => {
    const isExpanded = isMobile || !collapsed;

    return (
      <div className="flex flex-col h-full overflow-hidden select-none">
        {/* Sidebar Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-border flex-shrink-0 transition-all ${
            isExpanded ? 'justify-between px-3.5' : 'justify-center px-2'
          }`}
        >
          {isExpanded ? (
            <>
              <Link
                to="/"
                onClick={isMobile ? onCloseMobile : undefined}
                className="flex items-center gap-2.5 overflow-hidden group py-1 min-w-0"
                title="Free API Hub Home"
              >
                <Logo size="sm" withText={true} withBadge={false} />
              </Link>

              {isMobile ? (
                <button
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-elevated transition-colors cursor-pointer"
                  title="Close Navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface-elevated transition-colors flex-shrink-0 cursor-pointer"
                  title="Collapse Sidebar"
                  aria-label="Collapse Sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            /* Collapsed State: Logo with Hover-to-Show Expand Toggle right at the logo */
            <button
              onClick={onToggleCollapse}
              className="relative group p-2 rounded-xl hover:bg-surface-elevated transition-all flex items-center justify-center cursor-pointer"
              title="Click to expand sidebar"
              aria-label="Expand Sidebar"
            >
              {/* Normal State: Logo */}
              <div className="transition-opacity duration-200 group-hover:opacity-20 flex items-center justify-center">
                <Logo size="sm" withText={false} />
              </div>

              {/* Hover State: Shows the expand toggle icon right where the logo is */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-accent">
                <PanelLeft className="h-5 w-5" />
              </div>
            </button>
          )}
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-6 scrollbar-none">
          {/* Main Navigation Section */}
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted/70 font-mono">
                Navigation
              </div>
            )}
            {mainNav.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={isMobile ? onCloseMobile : undefined}
                  className={`group relative flex items-center rounded-xl text-xs font-medium transition-all ${
                    isExpanded ? 'px-3 py-2 gap-2.5' : 'p-2.5 justify-center'
                  } ${
                    active
                      ? 'bg-accent/15 text-accent border border-accent/30 font-semibold shadow-sm'
                      : 'text-text-muted hover:text-text-base hover:bg-surface-elevated border border-transparent'
                  }`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-accent' : 'text-text-muted group-hover:text-text-base'}`} />

                  {isExpanded && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.isLive && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live
                        </span>
                      )}
                      {item.badge && !item.isLive && (
                        <span className="text-[10px] font-mono text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-border">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Curated Collections Section */}
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted/70 font-mono flex items-center justify-between">
                <span>Collections</span>
                <FolderTree className="h-3 w-3 text-text-muted" />
              </div>
            )}
            {collections.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={isMobile ? onCloseMobile : undefined}
                  className={`group flex items-center rounded-xl text-xs font-medium transition-all ${
                    isExpanded ? 'px-3 py-1.5 gap-2.5' : 'p-2.5 justify-center'
                  } ${
                    active
                      ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
                      : 'text-text-muted hover:text-text-base hover:bg-surface-elevated border border-transparent'
                  }`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-accent' : 'text-text-muted group-hover:text-text-base'}`} />
                  {isExpanded && <span className="truncate text-[12px]">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Top Categories Section */}
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted/70 font-mono flex items-center justify-between">
                <span>Top Categories</span>
                <Link
                  to="/explore"
                  onClick={isMobile ? onCloseMobile : undefined}
                  className="text-[10px] text-accent hover:underline lowercase font-sans font-normal"
                >
                  view all
                </Link>
              </div>
            )}
            {categories.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={isMobile ? onCloseMobile : undefined}
                  className={`group flex items-center rounded-xl text-xs font-medium transition-all ${
                    isExpanded ? 'px-3 py-1.5 gap-2.5' : 'p-2.5 justify-center'
                  } ${
                    active
                      ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
                      : 'text-text-muted hover:text-text-base hover:bg-surface-elevated border border-transparent'
                  }`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-accent' : 'text-text-muted group-hover:text-text-base'}`} />
                  {isExpanded && <span className="truncate text-[12px]">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-border flex-shrink-0 space-y-1.5 bg-surface/50">
          {/* Saved Bookmarks Link */}
          <Link
            to="/explore?fav=1"
            onClick={isMobile ? onCloseMobile : undefined}
            className={`flex items-center rounded-xl text-xs font-medium text-text-muted hover:text-text-base hover:bg-surface-elevated transition-colors ${
              isExpanded ? 'px-3 py-2 justify-between' : 'p-2.5 justify-center'
            }`}
            title="Saved APIs"
          >
            <div className="flex items-center gap-2.5">
              <Star className={`h-4 w-4 ${bookmarks.length > 0 ? 'fill-[#FDD663] text-[#FDD663]' : 'text-text-muted'}`} />
              {isExpanded && <span>Saved Bookmarks</span>}
            </div>
            {isExpanded && bookmarks.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#FDD663]/15 text-[#FDD663] border border-[#FDD663]/30 font-bold">
                {bookmarks.length}
              </span>
            )}
          </Link>

          {/* Theme Switcher Toggle */}
          <button
            onClick={cycleTheme}
            className={`w-full flex items-center rounded-xl text-xs font-medium text-text-muted hover:text-text-base hover:bg-surface-elevated transition-colors cursor-pointer ${
              isExpanded ? 'px-3 py-2 justify-between' : 'p-2.5 justify-center'
            }`}
            title={`Current theme: ${theme}. Click to switch theme.`}
          >
            <div className="flex items-center gap-2.5">
              {theme === 'system' ? (
                <Monitor className="h-4 w-4 text-accent" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="h-4 w-4 text-accent" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              {isExpanded && <span>Theme Mode</span>}
            </div>
            {isExpanded && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-text-muted">
                {theme}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen border-r border-border bg-surface transition-all duration-300 z-30 flex-shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-Over Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Dark Overlay */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-surface border-r border-border shadow-2xl flex flex-col z-50 transition-transform animate-in slide-in-from-left duration-250">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
