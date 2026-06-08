import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Todo, Priority, FilterType } from '../types/todo';

export interface TodoState {
  todos: Todo[];
  filter: FilterType;
}

export interface TodoActions {
  addTodo: (title: string, priority?: Priority, description?: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>) => void;
  setFilter: (filter: FilterType) => void;
  clearCompleted: () => void;
}

export type TodoStore = TodoState & TodoActions;

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      // State
      todos: [],
      filter: 'all',

      // Actions
      addTodo: (title, priority = 'medium', description) => {
        const now = Date.now();
        const newTodo: Todo = {
          id: uuidv4(),
          title,
          description,
          completed: false,
          priority,
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

      setFilter: (filter) => {
        set({ filter });
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
