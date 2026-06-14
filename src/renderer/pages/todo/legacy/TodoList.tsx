import React from 'react';
import type { Todo, FilterType } from '@/shared/types/todo';
import TodoItem from './TodoItem';
import './LegacyTodo.css';

interface TodoListProps {
  todos: Todo[];
  filter: FilterType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, filter, onToggle, onDelete }) => {
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  if (filteredTodos.length === 0) {
    const messages: Record<FilterType, string> = {
      all: 'No todos yet. Add one above!',
      active: 'No active todos. Great job!',
      completed: 'No completed todos yet.',
    };

    return (
      <div className="legacy-todo-empty">
        <span className="legacy-todo-empty-icon">📋</span>
        <p className="legacy-todo-empty-text">{messages[filter]}</p>
      </div>
    );
  }

  return (
    <div className="legacy-todo-list">
      {filteredTodos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TodoList;
