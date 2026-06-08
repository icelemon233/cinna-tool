import React, { useState } from 'react';
import styled from '@emotion/styled';
import { TodoInput, TodoList, TodoFilter } from './components';
import { ChatPage } from './components/chat';
import { useTodoStore } from './store/todoStore';
import type { FilterType, Priority } from './types/todo';

type Page = 'todo' | 'chat';

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const NavBar = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: #1a1a2e;
  border-bottom: 1px solid #2a2a3d;
  padding: 0;
  flex-shrink: 0;
`;

const NavButton = styled.button<{ active: boolean }>`
  padding: 14px 32px;
  background: ${({ active }) => (active ? '#252536' : 'transparent')};
  border: none;
  border-bottom: 2px solid ${({ active }) => (active ? '#667eea' : 'transparent')};
  color: ${({ active }) => (active ? '#e8e8f0' : '#8888a8')};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #e8e8f0;
    background: #252536;
  }
`;

const TodoPageContainer = styled.div`
  flex: 1;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
  box-sizing: border-box;
  overflow-y: auto;
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

const ChatPageWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('todo');
  const [filter, setFilter] = useState<FilterType>('all');
  const { todos, addTodo, toggleTodo, deleteTodo, clearCompleted } = useTodoStore();

  const activeCount = todos.filter((t) => !t.completed).length;
  const hasCompleted = todos.some((t) => t.completed);

  const handleAdd = (title: string, priority: Priority) => {
    addTodo(title, priority);
  };

  return (
    <AppContainer>
      <NavBar>
        <NavButton active={page === 'todo'} onClick={() => setPage('todo')}>
          📋 Todo
        </NavButton>
        <NavButton active={page === 'chat'} onClick={() => setPage('chat')}>
          💬 AI Chat
        </NavButton>
      </NavBar>

      {page === 'todo' ? (
        <TodoPageContainer>
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
        </TodoPageContainer>
      ) : (
        <ChatPageWrapper>
          <ChatPage />
        </ChatPageWrapper>
      )}
    </AppContainer>
  );
};

export default App;
