import React, { useState } from 'react';
import styled from '@emotion/styled';
import { TodoInput, TodoList, TodoFilter } from './components';
import { useTodoStore } from './store/todoStore';
import type { FilterType, Priority } from './types/todo';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
  box-sizing: border-box;
`;

const Card = styled.div`
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  padding: 32px;
`;

const Title = styled.h1`
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 28px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const App: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const { todos, addTodo, toggleTodo, deleteTodo, clearCompleted } = useTodoStore();

  const activeCount = todos.filter((t) => !t.completed).length;
  const hasCompleted = todos.some((t) => t.completed);

  const handleAdd = (title: string, priority: Priority) => {
    addTodo(title, priority);
  };

  return (
    <AppContainer>
      <Card>
        <Title>CinnaTool - Todo</Title>
        <TodoInput onAdd={handleAdd} />
        <TodoFilter
          filter={filter}
          activeCount={activeCount}
          hasCompleted={hasCompleted}
          onFilterChange={setFilter}
          onClearCompleted={clearCompleted}
        />
        <TodoList
          todos={todos}
          filter={filter}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />
      </Card>
    </AppContainer>
  );
};

export default App;
