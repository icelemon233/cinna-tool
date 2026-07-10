import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface ClipboardButtonItem {
  id: string;
  content: string;
  note?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ClipboardState {
  items: ClipboardButtonItem[];
}

export interface ClipboardActions {
  addItem: (content: string, note?: string) => string;
  deleteItem: (id: string) => void;
  clearItems: () => void;
}

export type ClipboardStore = ClipboardState & ClipboardActions;

export const useClipboardStore = create<ClipboardStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (content, note) => {
        const trimmedContent = content.trim();
        if (!trimmedContent) return '';

        const now = Date.now();
        const id = uuidv4();
        const item: ClipboardButtonItem = {
          id,
          content: trimmedContent,
          note: note?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          items: [item, ...state.items],
        }));
        return id;
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      clearItems: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'cinnatool-clipboard-storage',
    }
  )
);
