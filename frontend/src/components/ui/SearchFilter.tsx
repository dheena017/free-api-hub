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
        <div className="relative flex items-center bg-[#28292A] border border-[#3C4043] focus-within:border-[#5F6368] rounded-2xl transition-colors">
          <div className="pl-4 text-slate-400 group-focus-within:text-slate-200 transition-colors pointer-events-none">
            <Search className="h-5 w-5" />
          </div>
          
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-3.5 pr-20 py-4 bg-transparent text-white placeholder-slate-400 text-sm sm:text-base outline-none font-medium"
          />

          <div className="absolute right-3.5 flex items-center gap-1.5">
            {searchTerm ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#303134] transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-[#1F1F1F] border border-[#3C4043] rounded-md">
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
                  ? 'bg-[#303134] border-[#5F6368] text-white font-semibold'
                  : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#303134] hover:border-[#5F6368] hover:text-white'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              <span>{qf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
