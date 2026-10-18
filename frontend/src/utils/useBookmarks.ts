import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'free_api_hub_bookmarks_v2';
const LEGACY_STORAGE_KEY = 'free_api_hub_bookmarks';

export interface BookmarkItem {
  slug: string;
  collection: string;
  notes?: string;
  savedAt: string;
}

export const DEFAULT_COLLECTIONS = ['Favorites', 'Work Projects', 'Learning & Testing', 'Prototyping'];

export function getStoredBookmarkItems(): BookmarkItem[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];

    // Check v2 storage first
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && typeof item.slug === 'string');
      }
    }

    // Fallback and migrate from legacy v1 string[]
    const rawLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy);
      if (Array.isArray(parsed)) {
        const migrated: BookmarkItem[] = parsed
          .filter((s) => typeof s === 'string')
          .map((slug) => ({
            slug,
            collection: 'Favorites',
            savedAt: new Date().toISOString()
          }));
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } catch {
          // ignore
        }
        return migrated;
      }
    }
  } catch (err) {
    console.warn('Failed to read bookmarks from storage:', err);
  }
  return [];
}

export function saveStoredBookmarkItems(items: BookmarkItem[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      // Also update legacy key for backward compatibility with older components
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(items.map((i) => i.slug)));
      window.dispatchEvent(new CustomEvent('free_api_bookmarks_changed', { detail: items }));
    }
  } catch (err) {
    console.warn('Storage unavailable or quota exceeded; bookmarks held in memory:', err);
  }
}

export function getStoredBookmarks(): string[] {
  return getStoredBookmarkItems().map((i) => i.slug);
}

export function saveStoredBookmarks(slugs: string[]): void {
  const currentItems = getStoredBookmarkItems();
  const existingMap = new Map(currentItems.map((i) => [i.slug, i]));

  const updated: BookmarkItem[] = slugs.map((slug) => {
    return existingMap.get(slug) || {
      slug,
      collection: 'Favorites',
      savedAt: new Date().toISOString()
    };
  });
  saveStoredBookmarkItems(updated);
}

export function useBookmarks() {
  const [items, setItems] = useState<BookmarkItem[]>(getStoredBookmarkItems);

  useEffect(() => {
    const handleUpdate = () => {
      setItems(getStoredBookmarkItems());
    };
    window.addEventListener('free_api_bookmarks_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('free_api_bookmarks_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const bookmarks = useMemo(() => items.map((i) => i.slug), [items]);

  const collections = useMemo(
    () => Array.from(new Set([...DEFAULT_COLLECTIONS, ...items.map((i) => i.collection).filter(Boolean)])),
    [items]
  );

  const isBookmarked = useCallback(
    (slug: string) => items.some((i) => i.slug.toLowerCase() === slug.toLowerCase()),
    [items]
  );

  const getBookmarkItem = useCallback(
    (slug: string) => items.find((i) => i.slug.toLowerCase() === slug.toLowerCase()),
    [items]
  );

  const toggleBookmark = useCallback((slug: string, collection: string = 'Favorites') => {
    const current = getStoredBookmarkItems();
    const existingIndex = current.findIndex((i) => i.slug.toLowerCase() === slug.toLowerCase());
    let updated: BookmarkItem[];

    if (existingIndex >= 0) {
      updated = current.filter((_, idx) => idx !== existingIndex);
    } else {
      updated = [
        ...current,
        {
          slug,
          collection: collection || 'Favorites',
          savedAt: new Date().toISOString()
        }
      ];
    }
    saveStoredBookmarkItems(updated);
    setItems(updated);
  }, []);

  const updateBookmark = useCallback((slug: string, updates: Partial<Omit<BookmarkItem, 'slug'>>) => {
    const current = getStoredBookmarkItems();
    const updated = current.map((item) => {
      if (item.slug.toLowerCase() === slug.toLowerCase()) {
        return { ...item, ...updates };
      }
      return item;
    });
    saveStoredBookmarkItems(updated);
    setItems(updated);
  }, []);

  const removeBookmark = useCallback((slug: string) => {
    const current = getStoredBookmarkItems();
    const updated = current.filter((i) => i.slug.toLowerCase() !== slug.toLowerCase());
    saveStoredBookmarkItems(updated);
    setItems(updated);
  }, []);

  const exportBookmarksJson = useCallback(() => {
    return JSON.stringify(items, null, 2);
  }, [items]);

  const importBookmarksJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return false;
      const valid = parsed.filter((item) => item && typeof item.slug === 'string').map((i) => ({
        slug: i.slug,
        collection: i.collection || 'Favorites',
        notes: i.notes || '',
        savedAt: i.savedAt || new Date().toISOString()
      }));
      saveStoredBookmarkItems(valid);
      setItems(valid);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    bookmarks,
    items,
    collections,
    isBookmarked,
    getBookmarkItem,
    toggleBookmark,
    updateBookmark,
    removeBookmark,
    exportBookmarksJson,
    importBookmarksJson,
    count: items.length
  };
}
