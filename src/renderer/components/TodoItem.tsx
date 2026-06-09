import React from 'react';
import styled from '@emotion/styled';
import type { Todo, Priority } from '../types/todo';

const priorityColors: Record<Priority, string> = {
  high: '#e53e3e',
  medium: '#ed8936',
  low: '#38a169',
};

const ItemContainer = styled.div<{ completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ completed }) => (completed ? 'var(--bg-card-completed)' : 'var(--bg-card)')};
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: box-shadow 0.2s ease, background 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #667eea;
`;

const Title = styled.span<{ completed: boolean }>`
  flex: 1;
  font-size: 15px;
  color: ${({ completed }) => (completed ? 'var(--text-muted)' : 'var(--text-primary)')};
  text-decoration: ${({ completed }) => (completed ? 'line-through' : 'none')};
  transition: color 0.2s ease;
`;

const PriorityBadge = styled.span<{ priority: Priority }>`
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: ${({ priority }) => priorityColors[priority]};
  text-transform: capitalize;
`;

const DeleteButton = styled.button`
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #feb2b2;
  border-radius: 6px;
  color: #e53e3e;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: var(--delete-btn-hover-bg);
  }
`;

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <ItemContainer completed={todo.completed}>
      <Checkbox
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <Title completed={todo.completed}>{todo.title}</Title>
      <PriorityBadge priority={todo.priority}>{todo.priority}</PriorityBadge>
      <DeleteButton onClick={() => onDelete(todo.id)}>Delete</DeleteButton>
    </ItemContainer>
  );
};

export default TodoItem;
