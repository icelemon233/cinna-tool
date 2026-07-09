import React, { useMemo } from 'react';
import { Empty, Input, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTranslation } from '@/shared/i18n';
import TodoTaskItem from './TodoTaskItem';

function normalizeSearchQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeTodoTitle(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

const TodoSidebar: React.FC = () => {
  const todos = useTodoStore((state) => state.todos);
  const searchQuery = useTodoStore((state) => state.searchQuery);
  const setSearchQuery = useTodoStore((state) => state.setSearchQuery);
  const { t } = useTranslation();

  const normalizedSearchQuery = typeof searchQuery === 'string' ? searchQuery : '';
  const visibleTodos = useMemo(() => {
    const q = normalizeSearchQuery(searchQuery);
    const source = q
      ? todos.filter((todo) => normalizeTodoTitle(todo.title).includes(q))
      : todos;

    return [...source].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  }, [searchQuery, todos]);

  return (
    <aside className="todo-sidebar">
      <div className="todo-sidebar-search">
        <Input
          prefix={<SearchOutlined />}
          placeholder={t('todo.search')}
          value={normalizedSearchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          allowClear
        />
      </div>

      <div className="todo-sidebar-tasks">
        {visibleTodos.length === 0 ? (
          <div className="todo-sidebar-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Typography.Text type="secondary">
                  {normalizedSearchQuery ? t('todo.searchEmpty') : t('todo.empty.tasks')}
                </Typography.Text>
              }
            />
          </div>
        ) : (
          visibleTodos.map((todo) => (
            <TodoTaskItem key={todo.id} todo={todo} compact />
          ))
        )}
      </div>
    </aside>
  );
};

export default TodoSidebar;
