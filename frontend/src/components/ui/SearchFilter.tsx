import React from 'react';
import { Search, X } from 'lucide-react';
import { CURATED_COLLECTIONS } from '../../types/collections';

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeCollection?: string;
  onCollectionSelect: (collection: string) => void;
  placeholder?: string;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  activeCollection,
  onCollectionSelect,
  placeholder = "Search free APIs (e.g. weather, crypto, pokemon)..."
}) => {
  const quickFilters = CURATED_COLLECTIONS.map((col) => ({
    id: col.id,
    label: col.shortLabel || col.name,
    icon: col.icon
  }));

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3.5">
      {/* Sleek Command-Bar Style Search Input */}
      <div className="relative group">
        <div className="relative flex items-center bg-surface border border-border focus-within:border-accent rounded-2xl transition-colors shadow-sm">
          <div className="pl-4 text-text-muted group-focus-within:text-accent transition-colors pointer-events-none">
            <Search className="h-5 w-5" />
          </div>
          
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-3.5 pr-20 py-4 bg-transparent text-text-base placeholder-text-muted text-sm sm:text-base outline-none font-medium"
          />

          <div className="absolute right-3.5 flex items-center gap-1.5">
            {searchTerm ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="p-1 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-hover transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-text-muted bg-surface-elevated border border-border rounded-md">
                <span>Ctrl</span>
                <span>K</span>
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Clean Quick Filter Pills with No Scrollbar */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        {quickFilters.map((qf) => {
          const Icon = qf.icon;
          const isSelected = activeCollection === qf.id;
          return (
            <button
              key={qf.id}
              type="button"
              onClick={() => onCollectionSelect(isSelected ? '' : qf.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-150 whitespace-nowrap text-xs font-medium cursor-pointer ${
                isSelected
                  ? 'bg-accent border-accent text-background font-semibold shadow-sm'
                  : 'bg-surface border-border text-text-muted hover:bg-surface-hover hover:text-text-base'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-background' : 'text-text-muted'}`} />
              <span>{qf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
