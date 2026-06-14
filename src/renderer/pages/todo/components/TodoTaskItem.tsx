import React, { useCallback, useMemo } from 'react';
import { Button, Checkbox, Dropdown, Tag, Tooltip, Typography, type MenuProps } from 'antd';
import {
  CalendarOutlined,
  DeleteOutlined,
  StarFilled,
  StarOutlined,
  SunOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { Todo } from '@/shared/types/todo';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTranslation } from '@/shared/i18n';

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
  return 'default';
}

const TodoTaskItem: React.FC<TodoTaskItemProps> = ({ todo }) => {
  const toggleTodo = useTodoStore((state) => state.toggleTodo);
  const toggleImportant = useTodoStore((state) => state.toggleImportant);
  const toggleMyDay = useTodoStore((state) => state.toggleMyDay);
  const deleteTodo = useTodoStore((state) => state.deleteTodo);
  const setDueDate = useTodoStore((state) => state.setDueDate);
  const lists = useTodoStore((state) => state.lists);
  const { t } = useTranslation();

  const priorityConfig = useMemo<Record<string, { label: string; color: string }>>(
    () => ({
      high: { label: t('todo.priority.high'), color: 'error' },
      medium: { label: t('todo.priority.medium'), color: 'processing' },
      low: { label: t('todo.priority.low'), color: 'success' },
    }),
    [t]
  );

  const listName = useMemo(
    () => (todo.listId ? lists.find((list) => list.id === todo.listId)?.name : undefined),
    [lists, todo.listId]
  );

  const menuItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'my-day',
        icon: <SunOutlined />,
        label: todo.myDay ? t('todo.removeFromMyDay') : t('todo.addToMyDay'),
      },
      {
        key: 'important',
        icon: todo.important ? <StarFilled /> : <StarOutlined />,
        label: todo.important ? t('todo.unmarkImportant') : t('todo.markImportant'),
      },
      { type: 'divider' },
      {
        key: 'due-today',
        icon: <CalendarOutlined />,
        label: todo.dueDate ? t('todo.clearDueDate') : t('todo.setDueToday'),
      },
      { type: 'divider' },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: t('todo.deleteTask'),
        danger: true,
      },
    ],
    [t, todo.dueDate, todo.important, todo.myDay]
  );

  const handleMenuClick = useCallback<NonNullable<MenuProps['onClick']>>(({ key }) => {
    switch (key) {
      case 'my-day':
        toggleMyDay(todo.id);
        break;
      case 'important':
        toggleImportant(todo.id);
        break;
      case 'due-today': {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        setDueDate(todo.id, todo.dueDate ? undefined : today.getTime());
        break;
      }
      case 'delete':
        deleteTodo(todo.id);
        break;
      default:
        break;
    }
  }, [deleteTodo, setDueDate, todo.dueDate, todo.id, toggleImportant, toggleMyDay]);

  return (
    <Dropdown trigger={['contextMenu']} menu={{ items: menuItems, onClick: handleMenuClick }}>
      <div className="todo-task-row">
        <Checkbox checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
        <div className="todo-task-content">
          <Typography.Text
            className={`todo-task-title${todo.completed ? ' is-completed' : ''}`}
            title={todo.title}
          >
            {todo.title}
          </Typography.Text>
          <div className="todo-task-meta">
            {todo.priority !== 'medium' && (
              <Tag color={priorityConfig[todo.priority].color}>
                {priorityConfig[todo.priority].label}
              </Tag>
            )}
            {todo.dueDate && (
              <Tag color={getDueDateColor(todo.dueDate)} icon={<CalendarOutlined />}>
                {formatDueDate(todo.dueDate, t)}
              </Tag>
            )}
            {todo.myDay && !todo.completed && (
              <Tag icon={<SunOutlined />}>{t('todo.myDay')}</Tag>
            )}
            {listName && (
              <Tag icon={<UnorderedListOutlined />}>{listName}</Tag>
            )}
          </div>
        </div>
        <div className="todo-task-actions">
          <Tooltip title={todo.important ? t('todo.unmarkImportant') : t('todo.markImportant')}>
            <Button
              className={todo.important ? 'todo-important-button' : undefined}
              type="text"
              size="small"
              icon={todo.important ? <StarFilled /> : <StarOutlined />}
              onClick={() => toggleImportant(todo.id)}
            />
          </Tooltip>
          <Tooltip title={t('todo.deleteTask')}>
            <Button
              danger
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => deleteTodo(todo.id)}
            />
          </Tooltip>
        </div>
      </div>
    </Dropdown>
  );
};

export default React.memo(TodoTaskItem);
