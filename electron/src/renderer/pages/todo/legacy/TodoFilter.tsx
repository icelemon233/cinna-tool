import React from 'react';
import type { FilterType } from '@/shared/types/todo';
import './LegacyTodo.css';

interface TodoFilterProps {
  filter: FilterType;
  activeCount: number;
  hasCompleted: boolean;
  onFilterChange: (filter: FilterType) => void;
  onClearCompleted: () => void;
}

const TodoFilter: React.FC<TodoFilterProps> = ({
  filter,
  activeCount,
  hasCompleted,
  onFilterChange,
  onClearCompleted,
}) => {
  return (
    <div className="legacy-todo-filter">
      <div className="legacy-todo-filter-buttons">
        <button className={`legacy-todo-filter-button${filter === 'all' ? ' is-active' : ''}`} onClick={() => onFilterChange('all')}>
          All
        </button>
        <button className={`legacy-todo-filter-button${filter === 'active' ? ' is-active' : ''}`} onClick={() => onFilterChange('active')}>
          Active
        </button>
        <button className={`legacy-todo-filter-button${filter === 'completed' ? ' is-active' : ''}`} onClick={() => onFilterChange('completed')}>
          Completed
        </button>
      </div>
      <div className="legacy-todo-filter-right">
        <span className="legacy-todo-info">
          {activeCount} item{activeCount !== 1 ? 's' : ''} left
        </span>
        {hasCompleted && (
          <button className="legacy-todo-clear-button" onClick={onClearCompleted}>Clear Completed</button>
        )}
      </div>
    </div>
  );
};

export default TodoFilter;
