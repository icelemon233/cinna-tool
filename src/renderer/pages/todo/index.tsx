import React from 'react';
import TodoSidebar from './components/TodoSidebar';
import TodoContent from './components/TodoContent';
import './index.css';

interface TodoPageProps {
  quickCreateKey?: number;
}

const TodoPage: React.FC<TodoPageProps> = ({ quickCreateKey = 0 }) => {
  return (
    <div className="todo-page">
      <div className="todo-page-sidebar">
        <TodoSidebar />
      </div>
      <div className="todo-page-content">
        <TodoContent quickCreateKey={quickCreateKey} />
      </div>
    </div>
  );
};

export default TodoPage;
