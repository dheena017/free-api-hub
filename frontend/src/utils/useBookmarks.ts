import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'free_api_hub_bookmarks';

export function getStoredBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredBookmarks(bookmarks: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    window.dispatchEvent(new CustomEvent('free_api_bookmarks_changed', { detail: bookmarks }));
  } catch (err) {
    console.error('Failed to save bookmarks:', err);
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>(getStoredBookmarks);

  useEffect(() => {
    const handleUpdate = () => {
      setBookmarks(getStoredBookmarks());
    };
    window.addEventListener('free_api_bookmarks_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('free_api_bookmarks_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const isBookmarked = useCallback(
    (slug: string) => bookmarks.includes(slug),
    [bookmarks]
  );

  const toggleBookmark = useCallback((slug: string) => {
    const current = getStoredBookmarks();
    let updated: string[];
    if (current.includes(slug)) {
      updated = current.filter((s) => s !== slug);
    } else {
      updated = [...current, slug];
    }
    saveStoredBookmarks(updated);
    setBookmarks(updated);
  }, []);

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    count: bookmarks.length
  };
}
