import React from 'react';
import TodoSidebar from './components/TodoSidebar';
import TodoContent from './components/TodoContent';
import './index.css';

const TodoPage: React.FC = () => {
  return (
    <div className="todo-page">
      <div className="todo-page-sidebar">
        <TodoSidebar />
      </div>
      <div className="todo-page-content">
        <TodoContent />
      </div>
    </div>
  );
};

export default TodoPage;
