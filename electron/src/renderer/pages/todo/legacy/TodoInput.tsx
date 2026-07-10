import React, { useState } from 'react';
import type { Priority } from '@/shared/types/todo';
import './LegacyTodo.css';

interface TodoInputProps {
  onAdd: (title: string, priority: Priority) => void;
}

const TodoInput: React.FC<TodoInputProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  const handleAdd = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, priority);
    setTitle('');
    setPriority('medium');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="legacy-todo-input">
      <input
        className="legacy-todo-text-input"
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <select
        className="legacy-todo-select"
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button className="legacy-todo-add-button" onClick={handleAdd} disabled={!title.trim()}>
        Add
      </button>
    </div>
  );
};

export default TodoInput;
