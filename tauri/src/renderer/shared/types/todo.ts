export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  important: boolean;
  dueDate?: number;
  myDay: boolean;
  myDayDate?: string;
  listId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TodoList {
  id: string;
  name: string;
  icon: string;
}

export type Priority = 'low' | 'medium' | 'high';
export type FilterType = 'all' | 'active' | 'completed';
export type ViewType = 'my-day' | 'important' | 'planned' | 'tasks' | 'list';
