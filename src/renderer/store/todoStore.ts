import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Todo, TodoList, Priority, ViewType } from '../types/todo';

export interface TodoState {
  todos: Todo[];
  lists: TodoList[];
  currentView: ViewType;
  currentListId: string | null;
  searchQuery: string;
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
}

export type TodoStore = TodoState & TodoActions;

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      // State
      todos: [],
      lists: [],
      currentView: 'my-day',
      currentListId: null,
      searchQuery: '',

      // Actions
      addTodo: (title, options = {}) => {
        const now = Date.now();
        const newTodo: Todo = {
          id: uuidv4(),
          title,
          completed: false,
          priority: options.priority ?? 'medium',
          important: options.important ?? false,
          dueDate: options.dueDate,
          myDay: options.myDay ?? false,
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
          todos: state.todos.map((todo) =>
            todo.id === id
              ? { ...todo, myDay: !todo.myDay, updatedAt: Date.now() }
              : todo
          ),
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
    }),
    {
      name: 'cinnatool-todo-storage',
    }
  )
);
