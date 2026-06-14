import React, { useMemo, useState } from 'react';
import { Button, Empty, Space, Typography } from 'antd';
import {
  CalendarOutlined,
  CaretRightOutlined,
  SearchOutlined,
  StarOutlined,
  SunOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { ViewType } from '@/shared/types/todo';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTranslation } from '@/shared/i18n';
import TodoTaskItem from './TodoTaskItem';
import TodoAddBar from './TodoAddBar';

function getViewTitle(view: ViewType, t: (key: string) => string, listName?: string) {
  switch (view) {
    case 'my-day':
      return { icon: <SunOutlined />, title: t('todo.myDay') };
    case 'important':
      return { icon: <StarOutlined />, title: t('todo.important') };
    case 'planned':
      return { icon: <CalendarOutlined />, title: t('todo.planned') };
    case 'tasks':
      return { icon: <UnorderedListOutlined />, title: t('todo.tasks') };
    case 'list':
      return { icon: <UnorderedListOutlined />, title: listName || t('todo.list') };
    default:
      return { icon: <UnorderedListOutlined />, title: t('todo.task') };
  }
}

function getEmptyContent(view: ViewType, t: (key: string) => string) {
  switch (view) {
    case 'my-day':
      return { text: t('todo.empty.myDay'), hint: t('todo.empty.myDay.hint') };
    case 'important':
      return { text: t('todo.empty.important'), hint: t('todo.empty.important.hint') };
    case 'planned':
      return { text: t('todo.empty.planned'), hint: t('todo.empty.planned.hint') };
    case 'tasks':
      return { text: t('todo.empty.tasks'), hint: t('todo.empty.tasks.hint') };
    case 'list':
      return { text: t('todo.empty.list'), hint: t('todo.empty.list.hint') };
    default:
      return { text: t('todo.empty.default'), hint: '' };
  }
}

function formatDate(t: (key: string) => string): string {
  const now = new Date();
  const weekdays = t('todo.weekdays').split(',');
  return `${now.getMonth() + 1}/${now.getDate()}, ${weekdays[now.getDay()]}`;
}

const TodoContent: React.FC = () => {
  const todos = useTodoStore((state) => state.todos);
  const lists = useTodoStore((state) => state.lists);
  const currentView = useTodoStore((state) => state.currentView);
  const currentListId = useTodoStore((state) => state.currentListId);
  const searchQuery = useTodoStore((state) => state.searchQuery);

  const { t } = useTranslation();
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const searchResult = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matched = todos.filter((todo) => todo.title.toLowerCase().includes(q));
    return {
      activeMatched: matched.filter((todo) => !todo.completed),
      completedMatched: matched.filter((todo) => todo.completed),
      matched,
    };
  }, [searchQuery, todos]);

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

  const filteredTodos = useMemo(() => {
    switch (currentView) {
      case 'my-day':
        return todos.filter((todo) => todo.myDay);
      case 'important':
        return todos.filter((todo) => todo.important);
      case 'planned':
        return todos
          .filter((todo) => todo.dueDate !== undefined)
          .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));
      case 'tasks':
        return todos;
      case 'list':
        return todos.filter((todo) => todo.listId === currentListId);
      default:
        return todos;
    }
  }, [currentListId, currentView, todos]);
  const { activeTodos, completedTodos } = useMemo(() => ({
    activeTodos: filteredTodos.filter((todo) => !todo.completed),
    completedTodos: filteredTodos.filter((todo) => todo.completed),
  }), [filteredTodos]);

  const currentList = useMemo(
    () => lists.find((list) => list.id === currentListId),
    [currentListId, lists]
  );
  const { icon, title } = getViewTitle(currentView, t, currentList?.name);
  const emptyContent = getEmptyContent(currentView, t);

  return (
    <section className="todo-content">
      <header className="todo-content-header">
        <Typography.Title className="todo-content-title" level={3}>
          <Space className="todo-title-line">
            {icon}
            {title}
          </Space>
        </Typography.Title>
        {currentView === 'my-day' && (
          <Typography.Text type="secondary">{formatDate(t)}</Typography.Text>
        )}
      </header>

      <div className="todo-task-list">
        {activeTodos.length === 0 && completedTodos.length === 0 ? (
          <div className="todo-empty-wrap">
            <Empty description={emptyContent.text}>
              {emptyContent.hint && (
                <Typography.Text type="secondary">{emptyContent.hint}</Typography.Text>
              )}
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

      <TodoAddBar />
    </section>
  );
};

export default TodoContent;
