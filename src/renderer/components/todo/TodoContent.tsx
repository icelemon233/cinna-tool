import React, { useState } from 'react';
import styled from '@emotion/styled';
import type { Todo, ViewType } from '../../types/todo';
import { useTodoStore } from '../../store/todoStore';
import { useTranslation } from '../../i18n';
import TodoTaskItem from './TodoTaskItem';
import TodoAddBar from './TodoAddBar';

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
`;

const Header = styled.div`
  padding: 24px 24px 16px;
  flex-shrink: 0;
`;

const ViewTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ViewDate = styled.p`
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
`;

const TaskList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }
`;

const CompletedSection = styled.div`
  margin-top: 8px;
`;

const CompletedToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
  width: 100%;
  text-align: left;

  &:hover {
    background: var(--accent-light);
  }
`;

const Arrow = styled.span<{ expanded: boolean }>`
  display: inline-block;
  transition: transform 0.2s ease;
  transform: rotate(${({ expanded }) => (expanded ? '90deg' : '0deg')});
  font-size: 10px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const EmptyText = styled.p`
  font-size: 15px;
  color: var(--text-muted);
  margin: 0;
`;

const EmptyHint = styled.p`
  font-size: 13px;
  color: var(--text-muted);
  margin: 8px 0 0;
  opacity: 0.7;
`;

const SearchResultHeader = styled.div`
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
`;

function getViewTitle(view: ViewType, t: (key: string) => string, listName?: string): { icon: string; title: string } {
  switch (view) {
    case 'my-day': return { icon: '☀️', title: t('todo.myDay') };
    case 'important': return { icon: '⭐', title: t('todo.important') };
    case 'planned': return { icon: '📅', title: t('todo.planned') };
    case 'tasks': return { icon: '📋', title: t('todo.tasks') };
    case 'list': return { icon: '📋', title: listName || t('todo.list') };
    default: return { icon: '📋', title: t('todo.task') };
  }
}

function getEmptyContent(view: ViewType, t: (key: string) => string): { icon: string; text: string; hint: string } {
  switch (view) {
    case 'my-day':
      return { icon: '☀️', text: t('todo.empty.myDay'), hint: t('todo.empty.myDay.hint') };
    case 'important':
      return { icon: '⭐', text: t('todo.empty.important'), hint: t('todo.empty.important.hint') };
    case 'planned':
      return { icon: '📅', text: t('todo.empty.planned'), hint: t('todo.empty.planned.hint') };
    case 'tasks':
      return { icon: '📋', text: t('todo.empty.tasks'), hint: t('todo.empty.tasks.hint') };
    case 'list':
      return { icon: '📋', text: t('todo.empty.list'), hint: t('todo.empty.list.hint') };
    default:
      return { icon: '📋', text: t('todo.empty.default'), hint: '' };
  }
}

function formatDate(t: (key: string) => string): string {
  const now = new Date();
  const weekdays = t('todo.weekdays').split(',');
  return `${now.getMonth() + 1}/${now.getDate()}, ${weekdays[now.getDay()]}`;
}

const TodoContent: React.FC = () => {
  const {
    todos,
    lists,
    currentView,
    currentListId,
    searchQuery,
  } = useTodoStore();

  const { t } = useTranslation();
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // Search mode: filter all todos by title
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    const matched = todos.filter((td) => td.title.toLowerCase().includes(q));
    const activeMatched = matched.filter((td) => !td.completed);
    const completedMatched = matched.filter((td) => td.completed);

    return (
      <ContentContainer>
        <Header>
          <ViewTitle>🔍 {t('todo.searchResults')}</ViewTitle>
          <ViewDate>{t('todo.searchFound').replace('{count}', String(matched.length))}</ViewDate>
        </Header>
        <TaskList>
          {matched.length === 0 ? (
            <EmptyState>
              <EmptyIcon>🔍</EmptyIcon>
              <EmptyText>{t('todo.searchEmpty')}</EmptyText>
              <EmptyHint>{t('todo.searchEmptyHint')}</EmptyHint>
            </EmptyState>
          ) : (
            <>
              {activeMatched.length > 0 && (
                <SearchResultHeader>{t('todo.incomplete')} ({activeMatched.length})</SearchResultHeader>
              )}
              {activeMatched.map((todo) => (
                <TodoTaskItem key={todo.id} todo={todo} />
              ))}
              {completedMatched.length > 0 && (
                <CompletedSection>
                  <CompletedToggle onClick={() => setCompletedExpanded(!completedExpanded)}>
                    <Arrow expanded={completedExpanded}>▶</Arrow>
                    {t('todo.completed')} {completedMatched.length}
                  </CompletedToggle>
                  {completedExpanded &&
                    completedMatched.map((todo) => (
                      <TodoTaskItem key={todo.id} todo={todo} />
                    ))}
                </CompletedSection>
              )}
            </>
          )}
        </TaskList>
      </ContentContainer>
    );
  }

  // Normal view mode: filter by currentView
  const filterTodos = (allTodos: Todo[]): Todo[] => {
    switch (currentView) {
      case 'my-day':
        return allTodos.filter((td) => td.myDay);
      case 'important':
        return allTodos.filter((td) => td.important);
      case 'planned':
        return allTodos
          .filter((td) => td.dueDate !== undefined)
          .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));
      case 'tasks':
        return allTodos;
      case 'list':
        return allTodos.filter((td) => td.listId === currentListId);
      default:
        return allTodos;
    }
  };

  const filteredTodos = filterTodos(todos);
  const activeTodos = filteredTodos.filter((td) => !td.completed);
  const completedTodos = filteredTodos.filter((td) => td.completed);

  const currentList = lists.find((l) => l.id === currentListId);
  const { icon, title } = getViewTitle(currentView, t, currentList?.name);
  const emptyContent = getEmptyContent(currentView, t);

  return (
    <ContentContainer>
      <Header>
        <ViewTitle>
          <span>{icon}</span> {title}
        </ViewTitle>
        {currentView === 'my-day' && <ViewDate>{formatDate(t)}</ViewDate>}
      </Header>

      <TaskList>
        {activeTodos.length === 0 && completedTodos.length === 0 ? (
          <EmptyState>
            <EmptyIcon>{emptyContent.icon}</EmptyIcon>
            <EmptyText>{emptyContent.text}</EmptyText>
            <EmptyHint>{emptyContent.hint}</EmptyHint>
          </EmptyState>
        ) : (
          <>
            {activeTodos.map((todo) => (
              <TodoTaskItem key={todo.id} todo={todo} />
            ))}

            {completedTodos.length > 0 && (
              <CompletedSection>
                <CompletedToggle onClick={() => setCompletedExpanded(!completedExpanded)}>
                  <Arrow expanded={completedExpanded}>▶</Arrow>
                  {t('todo.completed')} {completedTodos.length}
                </CompletedToggle>
                {completedExpanded &&
                  completedTodos.map((todo) => (
                    <TodoTaskItem key={todo.id} todo={todo} />
                  ))}
              </CompletedSection>
            )}
          </>
        )}
      </TaskList>

      <TodoAddBar />
    </ContentContainer>
  );
};

export default TodoContent;
