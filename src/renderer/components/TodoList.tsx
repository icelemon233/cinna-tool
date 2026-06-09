import React from 'react';
import styled from '@emotion/styled';
import type { Todo, FilterType } from '../types/todo';
import TodoItem from './TodoItem';

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--text-muted);
  text-align: center;
`;

const EmptyIcon = styled.span`
  font-size: 48px;
  margin-bottom: 12px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  margin: 0;
  color: var(--text-secondary);
`;

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
      <EmptyState>
        <EmptyIcon>📋</EmptyIcon>
        <EmptyText>{messages[filter]}</EmptyText>
      </EmptyState>
    );
  }

  return (
    <ListContainer>
      {filteredTodos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ListContainer>
  );
};

export default TodoList;
