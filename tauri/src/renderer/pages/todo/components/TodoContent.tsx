import React, { useMemo, useState } from 'react';
import { Button, Empty, Space, Typography } from 'antd';
import {
  CaretRightOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTranslation } from '@/shared/i18n';
import TodoTaskItem from './TodoTaskItem';
import TodoAddBar from './TodoAddBar';

function normalizeSearchQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeTodoTitle(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

interface TodoContentProps {
  quickCreateKey?: number;
}

const TodoContent: React.FC<TodoContentProps> = ({ quickCreateKey = 0 }) => {
  const todos = useTodoStore((state) => state.todos);
  const searchQuery = useTodoStore((state) => state.searchQuery);

  const { t } = useTranslation();
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const searchResult = useMemo(() => {
    const q = normalizeSearchQuery(searchQuery);
    if (!q) return null;

    const matched = todos.filter((todo) => normalizeTodoTitle(todo.title).includes(q));
    return {
      activeMatched: matched.filter((todo) => !todo.completed),
      completedMatched: matched.filter((todo) => todo.completed),
      matched,
    };
  }, [searchQuery, todos]);

  const filteredTodos = todos;
  const { activeTodos, completedTodos } = useMemo(() => ({
    activeTodos: filteredTodos.filter((todo) => !todo.completed),
    completedTodos: filteredTodos.filter((todo) => todo.completed),
  }), [filteredTodos]);

  if (searchResult) {
    const { activeMatched, completedMatched, matched } = searchResult;

    return (
      <section className="todo-content">
        <header className="todo-content-header">
          <Typography.Title className="todo-content-title" level={3}>
            <Space className="todo-title-line">
              <SearchOutlined />
              {t('todo.searchResults')}
            </Space>
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('todo.searchFound').replace('{count}', String(matched.length))}
          </Typography.Text>
        </header>

        <div className="todo-task-list">
          {matched.length === 0 ? (
            <div className="todo-empty-wrap">
              <Empty description={t('todo.searchEmpty')}>
                <Typography.Text type="secondary">{t('todo.searchEmptyHint')}</Typography.Text>
              </Empty>
            </div>
          ) : (
            <>
              {activeMatched.length > 0 && (
                <div className="todo-search-result-header">
                  <Typography.Text type="secondary" strong>
                    {t('todo.incomplete')} ({activeMatched.length})
                  </Typography.Text>
                </div>
              )}
              {activeMatched.map((todo) => (
                <TodoTaskItem key={todo.id} todo={todo} />
              ))}
              {completedMatched.length > 0 && (
                <div className="todo-completed-section">
                  <Button
                    className={`todo-completed-button${completedExpanded ? ' is-expanded' : ''}`}
                    type="text"
                    block
                    icon={<CaretRightOutlined />}
                    onClick={() => setCompletedExpanded(!completedExpanded)}
                  >
                    {t('todo.completed')} {completedMatched.length}
                  </Button>
                  {completedExpanded &&
                    completedMatched.map((todo) => (
                      <TodoTaskItem key={todo.id} todo={todo} />
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="todo-content">
      <header className="todo-content-header">
        <Typography.Title className="todo-content-title" level={3}>
          <Space className="todo-title-line">
            <UnorderedListOutlined />
            {t('todo.tasks')}
          </Space>
        </Typography.Title>
      </header>

      <div className="todo-task-list">
        {activeTodos.length === 0 && completedTodos.length === 0 ? (
          <div className="todo-empty-wrap">
            <Empty description={t('todo.empty.tasks')}>
              <Typography.Text type="secondary">{t('todo.empty.tasks.hint')}</Typography.Text>
            </Empty>
          </div>
        ) : (
          <>
            {activeTodos.map((todo) => (
              <TodoTaskItem key={todo.id} todo={todo} />
            ))}

            {completedTodos.length > 0 && (
              <div className="todo-completed-section">
                <Button
                  className={`todo-completed-button${completedExpanded ? ' is-expanded' : ''}`}
                  type="text"
                  block
                  icon={<CaretRightOutlined />}
                  onClick={() => setCompletedExpanded(!completedExpanded)}
                >
                  {t('todo.completed')} {completedTodos.length}
                </Button>
                {completedExpanded &&
                  completedTodos.map((todo) => (
                    <TodoTaskItem key={todo.id} todo={todo} />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      <TodoAddBar quickCreateKey={quickCreateKey} />
    </section>
  );
};

export default TodoContent;
