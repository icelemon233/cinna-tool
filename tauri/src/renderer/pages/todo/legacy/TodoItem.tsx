import React from 'react';
import type { Todo } from '@/shared/types/todo';
import './LegacyTodo.css';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className={`legacy-todo-item${todo.completed ? ' is-completed' : ''}`}>
      <input
        className="legacy-todo-checkbox"
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span className={`legacy-todo-title${todo.completed ? ' is-completed' : ''}`}>{todo.title}</span>
      <span className={`legacy-todo-priority is-${todo.priority}`}>{todo.priority}</span>
      <button className="legacy-todo-delete-button" onClick={() => onDelete(todo.id)}>Delete</button>
    </div>
  );
};

export default TodoItem;
