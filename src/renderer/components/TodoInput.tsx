import React, { useState } from 'react';
import styled from '@emotion/styled';
import type { Priority } from '../types/todo';

const Container = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
  background: var(--input-bg);
  color: var(--text-primary);

  &:focus {
    border-color: #667eea;
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const Select = styled.select`
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;

  &:focus {
    border-color: #667eea;
  }

  option {
    background: var(--bg-card);
    color: var(--text-primary);
  }
`;

const AddButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.1s ease;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

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
    <Container>
      <Input
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Select
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </Select>
      <AddButton onClick={handleAdd} disabled={!title.trim()}>
        Add
      </AddButton>
    </Container>
  );
};

export default TodoInput;
