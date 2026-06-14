import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Drawer,
  Dropdown,
  Input,
  Space,
  Tooltip,
  type InputRef,
  type MenuProps,
} from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  StarOutlined,
  SunOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { TodoList, ViewType } from '@/shared/types/todo';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTranslation } from '@/shared/i18n';

const EMOJI_OPTIONS = ['📋', '💼', '🏠', '📚', '🎯', '💡', '🎨', '🏃', '🛒', '❤️'];

function menuLabel(label: string, count: number) {
  return (
    <span className="todo-label-content">
      <span className="todo-label-text nav-label">{label}</span>
      {count > 0 && <Badge count={count} size="small" />}
    </span>
  );
}

const TodoSidebar: React.FC = () => {
  const todos = useTodoStore((state) => state.todos);
  const lists = useTodoStore((state) => state.lists);
  const currentView = useTodoStore((state) => state.currentView);
  const currentListId = useTodoStore((state) => state.currentListId);
  const searchQuery = useTodoStore((state) => state.searchQuery);
  const setCurrentView = useTodoStore((state) => state.setCurrentView);
  const setSearchQuery = useTodoStore((state) => state.setSearchQuery);
  const addList = useTodoStore((state) => state.addList);
  const deleteList = useTodoStore((state) => state.deleteList);

  const { t } = useTranslation();

  const [creatingList, setCreatingList] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('📋');
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (creatingList) {
      inputRef.current?.focus();
    }
  }, [creatingList]);

  const counts = useMemo(() => {
    const listCounts = new Map<string, number>();
    let myDay = 0;
    let important = 0;
    let planned = 0;
    let all = 0;

    todos.forEach((todo) => {
      if (todo.completed) return;

      all += 1;
      if (todo.myDay) myDay += 1;
      if (todo.important) important += 1;
      if (todo.dueDate !== undefined) planned += 1;
      if (todo.listId) {
        listCounts.set(todo.listId, (listCounts.get(todo.listId) ?? 0) + 1);
      }
    });

    return { all, important, listCounts, myDay, planned };
  }, [todos]);

  const selectedKey = searchQuery
    ? ''
    : currentView === 'list' && currentListId
      ? `list:${currentListId}`
      : currentView;

  const navItems = useMemo(
    () => [
      {
        key: 'my-day',
        icon: <SunOutlined />,
        label: menuLabel(t('todo.myDay'), counts.myDay),
      },
      {
        key: 'important',
        icon: <StarOutlined />,
        label: menuLabel(t('todo.important'), counts.important),
      },
      {
        key: 'planned',
        icon: <CalendarOutlined />,
        label: menuLabel(t('todo.planned'), counts.planned),
      },
      {
        key: 'tasks',
        icon: <UnorderedListOutlined />,
        label: menuLabel(t('todo.tasks'), counts.all),
      },
    ] as Array<{ key: ViewType; icon: React.ReactNode; label: React.ReactNode }>,
    [counts.all, counts.important, counts.myDay, counts.planned, t]
  );

  const emojiMenu: MenuProps = {
    items: [
      {
        key: 'emoji-grid',
        label: (
          <div className="todo-emoji-grid">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                type="text"
                size="small"
                onClick={() => setNewListIcon(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        ),
      },
    ],
  };

  const handleCreateList = () => {
    const trimmed = newListName.trim();
    if (trimmed) {
      addList(trimmed, newListIcon);
    }
    setNewListName('');
    setNewListIcon('📋');
    setCreatingList(false);
  };

  const handleNewListKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleCreateList();
    if (event.key === 'Escape') {
      setCreatingList(false);
      setNewListName('');
      setNewListIcon('📋');
    }
  };

  const handleDeleteList = (event: React.MouseEvent, listId: string) => {
    event.stopPropagation();
    deleteList(listId);
  };

  return (
    <aside className="todo-sidebar">
      <div className="todo-sidebar-search">
        <Input
          prefix={<SearchOutlined />}
          placeholder={t('todo.search')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          allowClear
        />
      </div>

      <div className="todo-sidebar-nav">
        {navItems.map((item) => (
          <Button
            key={item.key}
            className={`todo-nav-button${selectedKey === item.key ? ' is-active' : ''}`}
            type="text"
            icon={item.icon}
            onClick={() => setCurrentView(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="todo-sidebar-lists">
        {lists.map((list: TodoList) => {
          const active = selectedKey === `list:${list.id}`;
          const count = counts.listCounts.get(list.id) ?? 0;

          return (
            <div className="todo-list-row" key={list.id}>
              <Button
                className={`todo-list-button${active ? ' is-active' : ''}`}
                type="text"
                onClick={() => setCurrentView('list', list.id)}
                icon={<span>{list.icon}</span>}
              >
                <span className="todo-label-content">
                  <span className="todo-label-text">{list.name}</span>
                  {count > 0 && <Badge count={count} size="small" />}
                </span>
              </Button>
              <Tooltip title={t('todo.deleteList')}>
                <Button
                  className="todo-delete-list-button"
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(event) => handleDeleteList(event, list.id)}
                />
              </Tooltip>
            </div>
          );
        })}
      </div>

      <div className="todo-sidebar-bottom">
        {creatingList ? (
          <Space.Compact className="todo-create-list-row">
            <Dropdown trigger={['click']} menu={emojiMenu}>
              <Button>{newListIcon}</Button>
            </Dropdown>
            <Input
              ref={inputRef}
              placeholder={t('todo.listName')}
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              onKeyDown={handleNewListKeyDown}
              onBlur={() => {
                if (!newListName.trim()) {
                  setCreatingList(false);
                  setNewListIcon('📋');
                }
              }}
            />
            <Button type="primary" icon={<PlusOutlined />} onMouseDown={(event) => event.preventDefault()} onClick={handleCreateList} />
          </Space.Compact>
        ) : (
          <div className="todo-sidebar-actions">
            <Button
              className="todo-new-list-button"
              icon={<PlusOutlined />}
              onClick={() => setCreatingList(true)}
            >
              {t('todo.newList')}
            </Button>
            <Tooltip title={t('todo.guide')}>
              <Button
                className="todo-guide-icon-button"
                aria-label={t('todo.guide')}
                icon={<BookOutlined />}
                onClick={() => setGuideOpen(true)}
              />
            </Tooltip>
          </div>
        )}
      </div>

      <Drawer
        rootClassName="todo-guide-drawer"
        title={t('todo.guide.title')}
        placement="right"
        size="min(520px, 92vw)"
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      >
        <pre className="todo-guide-content">{t('todo.guide.content')}</pre>
      </Drawer>
    </aside>
  );
};

export default TodoSidebar;
