import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export const SCHEDULE_COLORS = [
  '#6ed6d1',
  '#8ea2ff',
  '#ffb37a',
  '#72d59a',
  '#e78bf3',
  '#ff8f9a',
  '#7cccf6',
  '#d8a45f',
  '#b8e986',
  '#f7c7dc',
  '#b79cff',
  '#ffd86e',
  '#8fd8b8',
  '#ff9f80',
  '#9dd7ff',
  '#c9b18c',
];

export interface ScheduleItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleItemInput {
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  notes?: string;
}

export interface ScheduleState {
  items: ScheduleItem[];
}

export interface ScheduleActions {
  addItem: (input: ScheduleItemInput) => string;
  updateItem: (id: string, updates: Partial<ScheduleItemInput>) => void;
  deleteItem: (id: string) => void;
}

export type ScheduleStore = ScheduleState & ScheduleActions;

function normalizeDateRange(startDate: string, endDate: string) {
  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (input) => {
        const now = Date.now();
        const range = normalizeDateRange(input.startDate, input.endDate);
        const id = uuidv4();
        const item: ScheduleItem = {
          id,
          title: input.title.trim(),
          startDate: range.startDate,
          endDate: range.endDate,
          color: input.color,
          notes: input.notes?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          items: [...state.items, item],
        }));
        return id;
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;

            const nextStart = updates.startDate ?? item.startDate;
            const nextEnd = updates.endDate ?? item.endDate;
            const range = normalizeDateRange(nextStart, nextEnd);
            return {
              ...item,
              ...updates,
              title: updates.title?.trim() ?? item.title,
              notes: updates.notes === undefined ? item.notes : updates.notes.trim() || undefined,
              startDate: range.startDate,
              endDate: range.endDate,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },
    }),
    {
      name: 'cinnatool-schedule-storage',
    }
  )
);
