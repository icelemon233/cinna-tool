import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import type { Todo } from '../../types/todo';
import { useTodoStore } from '../../store/todoStore';
import { useTranslation } from '../../i18n';

const ItemContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  position: relative;

  &:hover {
    background: var(--accent-light);
  }

  &:hover .action-buttons {
    opacity: 1;
  }
`;

const Checkbox = styled.button<{ checked: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid ${({ checked }) => (checked ? 'var(--accent)' : 'var(--border-color)')};
  background: ${({ checked }) => (checked ? 'var(--accent)' : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    border-color: var(--accent);
  }

  &::after {
    content: '${({ checked }) => (checked ? '✓' : '')}';
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.span<{ completed: boolean }>`
  display: block;
  font-size: 14px;
  color: ${({ completed }) => (completed ? 'var(--text-muted)' : 'var(--text-primary)')};
  text-decoration: ${({ completed }) => (completed ? 'line-through' : 'none')};
  transition: color 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  flex-wrap: wrap;
`;

const Tag = styled.span<{ color?: string }>`
  font-size: 11px;
  color: ${({ color }) => color || 'var(--text-muted)'};
  display: flex;
  align-items: center;
  gap: 3px;
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
`;

const StarButton = styled.button<{ active: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  line-height: 1;
  color: ${({ active }) => (active ? '#f59e0b' : 'var(--text-muted)')};
  opacity: ${({ active }) => (active ? 1 : 0.5)};
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    color: #f59e0b;
  }
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  padding: 4px;
  line-height: 1;
  color: var(--text-muted);
  opacity: 0.6;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    color: #e53e3e;
  }
`;

const ContextMenu = styled.div<{ x: number; y: number }>`
  position: fixed;
  top: ${({ y }) => y}px;
  left: ${({ x }) => x}px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  min-width: 160px;
`;

const ContextMenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s ease;

  &:hover {
    background: var(--accent-light);
  }
`;

const ContextMenuDivider = styled.div`
  height: 1px;
  background: var(--border-color);
  margin: 4px 8px;
`;

interface TodoTaskItemProps {
  todo: Todo;
}

function formatDueDate(ts: number, t: (key: string) => string): string {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const taskDate = new Date(ts);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() === today.getTime()) return t('todo.today');
  if (taskDate.getTime() === tomorrow.getTime()) return t('todo.tomorrow');
  if (taskDate < today) return `${t('todo.overdue')} · ${d.getMonth() + 1}/${d.getDate()}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDueDateColor(ts: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(ts);
  taskDate.setHours(0, 0, 0, 0);
  if (taskDate < today) return '#e53e3e';
  if (taskDate.getTime() === today.getTime()) return '#ed8936';
  return 'var(--text-muted)';
}

const TodoTaskItem: React.FC<TodoTaskItemProps> = ({ todo }) => {
  const { toggleTodo, toggleImportant, toggleMyDay, deleteTodo, setDueDate } = useTodoStore();
  const lists = useTodoStore((s) => s.lists);
  const { t } = useTranslation();

  const priorityConfig: Record<string, { label: string; color: string }> = {
    high: { label: t('todo.priority.high'), color: '#e53e3e' },
    medium: { label: t('todo.priority.medium'), color: '#ed8936' },
    low: { label: t('todo.priority.low'), color: '#38a169' },
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const listName = todo.listId ? lists.find((l) => l.id === todo.listId)?.name : undefined;

  return (
    <>
      <ItemContainer onContextMenu={handleContextMenu}>
        <Checkbox
          checked={todo.completed}
          onClick={(e) => { e.stopPropagation(); toggleTodo(todo.id); }}
        />
        <Content>
          <Title completed={todo.completed}>{todo.title}</Title>
          <Meta>
            {todo.priority !== 'medium' && (
              <Tag color={priorityConfig[todo.priority].color}>
                ● {priorityConfig[todo.priority].label}
              </Tag>
            )}
            {todo.dueDate && (
              <Tag color={getDueDateColor(todo.dueDate)}>
                📅 {formatDueDate(todo.dueDate, t)}
              </Tag>
            )}
            {todo.myDay && !todo.completed && (
              <Tag>☀️ {t('todo.myDay')}</Tag>
            )}
            {listName && (
              <Tag>📋 {listName}</Tag>
            )}
          </Meta>
        </Content>
        <StarButton
          active={todo.important}
          onClick={(e) => { e.stopPropagation(); toggleImportant(todo.id); }}
        >
          {todo.important ? '⭐' : '☆'}
        </StarButton>
        <ActionButtons className="action-buttons">
          <DeleteButton
            onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
            title={t('todo.deleteTask')}
          >
            🗑️
          </DeleteButton>
        </ActionButtons>
      </ItemContainer>

      {contextMenu && (
        <ContextMenu ref={menuRef} x={contextMenu.x} y={contextMenu.y}>
          <ContextMenuItem onClick={() => { toggleMyDay(todo.id); setContextMenu(null); }}>
            <span>☀️</span>
            {todo.myDay ? t('todo.removeFromMyDay') : t('todo.addToMyDay')}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { toggleImportant(todo.id); setContextMenu(null); }}>
            <span>⭐</span>
            {todo.important ? t('todo.unmarkImportant') : t('todo.markImportant')}
          </ContextMenuItem>
          <ContextMenuDivider />
          <ContextMenuItem onClick={() => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            setDueDate(todo.id, todo.dueDate ? undefined : today.getTime());
            setContextMenu(null);
          }}>
            <span>📅</span>
            {todo.dueDate ? t('todo.clearDueDate') : t('todo.setDueToday')}
          </ContextMenuItem>
          <ContextMenuDivider />
          <ContextMenuItem onClick={() => { deleteTodo(todo.id); setContextMenu(null); }}>
            <span>🗑️</span>
            {t('todo.deleteTask')}
          </ContextMenuItem>
        </ContextMenu>
      )}
    </>
  );
};

export default TodoTaskItem;
