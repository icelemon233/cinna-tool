import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useTodoStore } from '../../store/todoStore';
import { useTranslation } from '../../i18n';

const BarContainer = styled.div`
  padding: 12px 20px 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
`;

const AddTrigger = styled.button<{ hidden: boolean }>`
  display: ${({ hidden }) => (hidden ? 'none' : 'flex')};
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--accent);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--accent-light);
    border-color: var(--accent);
  }
`;

const InputRow = styled.div<{ visible: boolean }>`
  display: ${({ visible }) => (visible ? 'flex' : 'none')};
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: var(--accent);
  }
`;

const PlusIcon = styled.span`
  font-size: 18px;
  color: var(--accent);
  flex-shrink: 0;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);

  &::placeholder {
    color: var(--text-muted);
  }
`;

const SubmitButton = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  flex-shrink: 0;

  &:hover {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const TodoAddBar: React.FC = () => {
  const { currentView, currentListId, addTodo } = useTodoStore();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Auto-set attributes based on current view
    const options: {
      myDay?: boolean;
      important?: boolean;
      dueDate?: number;
      listId?: string;
    } = {};

    switch (currentView) {
      case 'my-day':
        options.myDay = true;
        break;
      case 'important':
        options.important = true;
        break;
      case 'planned': {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        options.dueDate = today.getTime();
        break;
      }
      case 'list':
        if (currentListId) {
          options.listId = currentListId;
        }
        break;
      case 'tasks':
      default:
        break;
    }

    addTodo(trimmed, options);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setText('');
    }
  };

  const handleBlur = () => {
    if (!text.trim()) {
      setEditing(false);
    }
  };

  const getPlaceholder = (): string => {
    switch (currentView) {
      case 'my-day': return t('todo.addToMyDay.placeholder');
      case 'important': return t('todo.addImportant.placeholder');
      case 'planned': return t('todo.addPlanned.placeholder');
      case 'list': return t('todo.addToList.placeholder');
      default: return t('todo.addDefault.placeholder');
    }
  };

  return (
    <BarContainer>
      <AddTrigger hidden={editing} onClick={() => setEditing(true)}>
        <span>+</span> {t('todo.addTask')}
      </AddTrigger>
      <InputRow visible={editing}>
        <PlusIcon>+</PlusIcon>
        <Input
          ref={inputRef}
          placeholder={getPlaceholder()}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        <SubmitButton onClick={handleSubmit} disabled={!text.trim()}>
          {t('todo.add')}
        </SubmitButton>
      </InputRow>
    </BarContainer>
  );
};

export default TodoAddBar;
