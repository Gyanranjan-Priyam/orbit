import { create } from 'zustand';

interface BookmarkStore {
  bookmarks: string[];
  addBookmark: (id: string) => void;
  removeBookmark: (id: string) => void;
}

export const useBookmarkStore = create<BookmarkStore>((set) => ({
  bookmarks: [],
  addBookmark: (id) =>
    set((state) => ({
      bookmarks: [...state.bookmarks, id],
    })),
  removeBookmark: (id) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter((bookmark) => bookmark !== id),
    })),
}));
