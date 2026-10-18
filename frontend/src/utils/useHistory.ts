import { useState, useEffect, useCallback } from 'react';
import { ApiItem } from '../types/api';

const HISTORY_KEY = 'free_api_hub_recent_history';
const MAX_HISTORY = 8;

export interface HistoryItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  sample_endpoint: string;
  auth_type: string;
  timestamp: number;
}

export function getStoredHistory(): HistoryItem[] {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(HISTORY_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredHistory(items: HistoryItem[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('free_api_history_changed', { detail: items }));
    }
  } catch (err) {
    console.warn('Failed to save recent history to local storage:', err);
  }
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(getStoredHistory);

  useEffect(() => {
    const handleUpdate = () => {
      setHistory(getStoredHistory());
    };
    window.addEventListener('free_api_history_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('free_api_history_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addHistoryItem = useCallback((api: ApiItem) => {
    const current = getStoredHistory();
    const filtered = current.filter((item) => item.slug !== api.slug);
    const updated = [
      {
        id: api.id,
        name: api.name,
        slug: api.slug,
        category: api.category,
        sample_endpoint: api.sample_endpoint,
        auth_type: api.auth_type,
        timestamp: Date.now()
      },
      ...filtered
    ].slice(0, MAX_HISTORY);

    saveStoredHistory(updated);
    setHistory(updated);
  }, []);

  const clearHistory = useCallback(() => {
    saveStoredHistory([]);
    setHistory([]);
  }, []);

  const removeHistoryItem = useCallback((slug: string) => {
    const current = getStoredHistory();
    const updated = current.filter((item) => item.slug !== slug);
    saveStoredHistory(updated);
    setHistory(updated);
  }, []);

  return {
    history,
    addHistoryItem,
    removeHistoryItem,
    clearHistory,
    count: history.length
  };
}
