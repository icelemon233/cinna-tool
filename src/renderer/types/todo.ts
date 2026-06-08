export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  createdAt: number;
  updatedAt: number;
}

export type Priority = 'low' | 'medium' | 'high';

export type FilterType = 'all' | 'active' | 'completed';
