import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Todo, TodoList, Priority, ViewType } from '@/shared/types/todo';

export interface TodoState {
  todos: Todo[];
  lists: TodoList[];
  currentView: ViewType;
  currentListId: string | null;
  searchQuery: string;
  todayKey: string;
}

export interface TodoActions {
  addTodo: (title: string, options?: {
    priority?: Priority;
    dueDate?: number;
    listId?: string;
    myDay?: boolean;
    important?: boolean;
  }) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>) => void;
  toggleImportant: (id: string) => void;
  toggleMyDay: (id: string) => void;
  setDueDate: (id: string, date: number | undefined) => void;
  setCurrentView: (view: ViewType, listId?: string) => void;
  setSearchQuery: (query: string) => void;
  addList: (name: string, icon: string) => void;
  deleteList: (id: string) => void;
  clearCompleted: () => void;
  refreshMyDay: () => void;
}

export type TodoStore = TodoState & TodoActions;

export function getLocalDateKey(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodoMyDayDate(todo: Todo): string | undefined {
  if (todo.myDayDate) return todo.myDayDate;
  const fallbackTimestamp = todo.updatedAt || todo.createdAt;
  return fallbackTimestamp ? getLocalDateKey(fallbackTimestamp) : undefined;
}

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      // State
      todos: [],
      lists: [],
      currentView: 'my-day',
      currentListId: null,
      searchQuery: '',
      todayKey: getLocalDateKey(),

      // Actions
      addTodo: (title, options = {}) => {
        const now = Date.now();
        const todayKey = getLocalDateKey(now);
        const newTodo: Todo = {
          id: uuidv4(),
          title,
          completed: false,
          priority: options.priority ?? 'medium',
          important: options.important ?? false,
          dueDate: options.dueDate,
          myDay: options.myDay ?? false,
          myDayDate: options.myDay ? todayKey : undefined,
          listId: options.listId,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ todos: [newTodo, ...state.todos] }));
      },

      toggleTodo: (id) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id
              ? { ...todo, completed: !todo.completed, updatedAt: Date.now() }
              : todo
          ),
        }));
      },

      deleteTodo: (id) => {
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        }));
      },

      updateTodo: (id, updates) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id
              ? { ...todo, ...updates, updatedAt: Date.now() }
              : todo
          ),
        }));
      },

      toggleImportant: (id) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id
              ? { ...todo, important: !todo.important, updatedAt: Date.now() }
              : todo
          ),
        }));
      },

      toggleMyDay: (id) => {
        set((state) => ({
          todos: state.todos.map((todo) => {
            if (todo.id !== id) return todo;

            const now = Date.now();
            const myDay = !todo.myDay;
            return {
              ...todo,
              myDay,
              myDayDate: myDay ? getLocalDateKey(now) : undefined,
              updatedAt: now,
            };
          }),
        }));
      },

      setDueDate: (id, date) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id
              ? { ...todo, dueDate: date, updatedAt: Date.now() }
              : todo
          ),
        }));
      },

      setCurrentView: (view, listId) => {
        set({ currentView: view, currentListId: listId ?? null });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      addList: (name, icon) => {
        const newList: TodoList = {
          id: uuidv4(),
          name,
          icon,
        };
        set((state) => ({ lists: [...state.lists, newList] }));
      },

      deleteList: (id) => {
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== id),
          todos: state.todos.map((todo) =>
            todo.listId === id ? { ...todo, listId: undefined, updatedAt: Date.now() } : todo
          ),
          currentView: state.currentListId === id ? 'tasks' as ViewType : state.currentView,
          currentListId: state.currentListId === id ? null : state.currentListId,
        }));
      },

      clearCompleted: () => {
        set((state) => ({
          todos: state.todos.filter((todo) => !todo.completed),
        }));
      },

      refreshMyDay: () => {
        set((state) => {
          const now = Date.now();
          const todayKey = getLocalDateKey(now);
          let changed = state.todayKey !== todayKey;

          const todos = state.todos.map((todo) => {
            if (!todo.myDay) return todo;

            const myDayDate = getTodoMyDayDate(todo);
            if (myDayDate === todayKey) {
              if (todo.myDayDate) return todo;
              changed = true;
              return { ...todo, myDayDate: todayKey };
            }

            changed = true;
            return {
              ...todo,
              myDay: false,
              myDayDate: undefined,
              updatedAt: now,
            };
          });

          return changed ? { todayKey, todos } : {};
        });
      },
    }),
    {
      name: 'cinnatool-todo-storage',
    }
  )
);
