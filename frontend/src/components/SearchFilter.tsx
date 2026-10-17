import React from 'react';
import { Search, X, Zap, Globe, ShieldCheck, Database } from 'lucide-react';

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
  const quickFilters = [
    { id: 'no-auth', label: 'No Key Needed', icon: Zap },
    { id: 'cors-enabled', label: 'Browser Ready (CORS)', icon: Globe },
    { id: 'high-uptime', label: 'High Uptime (99%+)', icon: ShieldCheck },
    { id: 'mock-data', label: 'Mock & Proto Data', icon: Database },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Clean Rounded-Full Search Bar */}
      <div className="relative flex items-center shadow-sm">
        <div className="absolute left-4.5 text-slate-400 pointer-events-none">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3.5 rounded-full bg-[#28292A] hover:bg-[#303134] focus:bg-[#303134] border border-[#3C4043] focus:border-[#5F6368] text-white placeholder-slate-400 text-sm transition-all outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 text-slate-400 hover:text-white p-1 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Clean Friendly Filter Chips */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 text-xs">
        {quickFilters.map((qf) => {
          const Icon = qf.icon;
          const isSelected = activeCollection === qf.id;
          return (
            <button
              key={qf.id}
              onClick={() => onCollectionSelect(isSelected ? '' : qf.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-colors whitespace-nowrap text-xs font-medium ${
                isSelected
                  ? 'bg-accent/20 border-accent text-accent font-semibold'
                  : 'bg-[#28292A] border-[#3C4043] text-slate-300 hover:bg-[#3C4043] hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{qf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
