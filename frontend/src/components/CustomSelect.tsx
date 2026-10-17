import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X, AlertCircle } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'surface' | 'glass';
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  id?: string;
  fullWidth?: boolean;
  align?: 'left' | 'right';
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  label,
  helperText,
  error,
  icon,
  size = 'md',
  variant = 'default',
  searchable = false,
  disabled = false,
  className = '',
  menuClassName = '',
  id,
  fullWidth = true,
  align = 'left'
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options if searchable
  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened if searchable
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // Scroll active/focused element into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[focusedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      // Find current selected index
      const currentIndex = filteredOptions.findIndex((opt) => opt.value === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setSearchQuery('');
      setFocusedIndex(-1);
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        const currentIndex = filteredOptions.findIndex((opt) => opt.value === value);
        setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const opt = filteredOptions[focusedIndex];
          if (!opt.disabled) {
            handleSelect(opt);
          }
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  // Styling maps
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 h-8 rounded-lg gap-1.5',
    md: 'text-xs px-3 py-2 h-9 rounded-lg gap-2',
    lg: 'text-sm px-3.5 py-2.5 h-11 rounded-xl gap-2.5'
  };

  const variantStyles = {
    default: 'bg-[#1F1F1F] border-[#3C4043] text-slate-100 hover:border-[#5F6368] focus:border-[#8AB4F8]',
    surface: 'bg-[#28292A] border-[#3C4043] text-slate-100 hover:border-[#5F6368] focus:border-[#8AB4F8]',
    glass: 'bg-[#28292A]/90 backdrop-blur-md border-[#3C4043] text-slate-100 hover:border-[#5F6368] focus:border-[#8AB4F8]'
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${fullWidth ? 'w-full' : ''} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-slate-300 block mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Select Trigger Button */}
      <button
        id={selectId}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between border font-normal transition-all duration-150 outline-none select-none ${
          sizeStyles[size]
        } ${variantStyles[variant]} ${
          error ? '!border-rose-500 ring-1 ring-rose-500/30' : ''
        } ${
          isOpen ? 'border-[#8AB4F8] ring-1 ring-[#8AB4F8]/30 shadow-md' : ''
        } ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[#1F1F1F]/50' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-1.5">
          {icon && <span className="text-slate-400 flex-shrink-0">{icon}</span>}
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-slate-300">{selectedOption.icon}</span>
          )}
          <span className={`truncate text-left ${!selectedOption ? 'text-slate-400' : 'text-slate-100'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="ml-auto flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#303134] text-slate-300 border border-[#3C4043]">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ease-out ${
            isOpen ? 'rotate-180 text-[#8AB4F8]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-50 mt-1.5 w-full min-w-[200px] bg-[#28292A] border border-[#3C4043] rounded-xl shadow-2xl py-1.5 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 ${menuClassName}`}
          style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)' }}
        >
          {/* Optional Search Filter */}
          {searchable && (
            <div className="p-2 border-b border-[#3C4043] bg-[#28292A]">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(0);
                  }}
                  placeholder="Filter options..."
                  className="w-full bg-[#1F1F1F] border border-[#3C4043] rounded-lg pl-8 pr-7 py-1 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#8AB4F8]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto overflow-x-hidden p-1 space-y-0.5 focus:outline-none"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400 text-center">
                No matching options
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isFocused = idx === focusedIndex;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#8AB4F8]/15 text-[#8AB4F8] font-medium'
                        : isFocused
                        ? 'bg-[#303134] text-white'
                        : 'text-slate-300 hover:bg-[#303134] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 mr-2 flex-1">
                      {opt.icon && (
                        <span className={`flex-shrink-0 ${isSelected ? 'text-[#8AB4F8]' : 'text-slate-400'}`}>
                          {opt.icon}
                        </span>
                      )}
                      <div className="truncate min-w-0 flex-1">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.description && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {opt.description}
                          </div>
                        )}
                      </div>
                      {opt.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1F1F1F] text-slate-400 border border-[#3C4043] flex-shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-[#8AB4F8] flex-shrink-0 ml-1.5" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Helper text or Error */}
      {error ? (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-rose-400 font-medium animate-in fade-in-0 duration-150">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
