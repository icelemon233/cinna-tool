import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import type { TodoList } from '../../types/todo';
import { useTodoStore } from '../../store/todoStore';
import { useTranslation } from '../../i18n';

const SidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
  padding: 16px 0;
  overflow-y: auto;
`;

const SearchBox = styled.div`
  padding: 0 12px 12px;
`;

const SearchWrapper = styled.div`
  position: relative;

  &::before {
    content: '🔍';
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 9px 12px 9px 32px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: var(--accent);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const NavSection = styled.div`
  padding: 4px 8px;
`;

const NavItem = styled.button<{ active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: ${({ active }) => (active ? 'var(--accent-light)' : 'transparent')};
  color: ${({ active }) => (active ? 'var(--accent)' : 'var(--text-primary)')};
  font-size: 13px;
  font-weight: ${({ active }) => (active ? 600 : 400)};
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;

  &:hover {
    background: var(--accent-light);
  }
`;

const NavIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
  width: 22px;
  text-align: center;
`;

const NavLabel = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NavCount = styled.span`
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
  min-width: 16px;
  text-align: right;
`;

const Divider = styled.div`
  height: 1px;
  background: var(--border-color);
  margin: 8px 16px;
`;

const ListSection = styled.div`
  flex: 1;
  padding: 4px 8px;
  overflow-y: auto;
`;

const ListItemWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  &:hover .delete-btn {
    opacity: 1;
  }
`;

const DeleteListBtn = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
  padding: 4px;
  line-height: 1;
  z-index: 1;

  &:hover {
    color: #e53e3e;
  }
`;

const BottomBar = styled.div`
  padding: 8px 12px;
  margin-top: auto;
`;

const NewListButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--accent-light);
  }
`;

const NewListForm = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
`;

const EmojiPicker = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const NewListInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  min-width: 0;

  &::placeholder {
    color: var(--text-muted);
  }
`;

const EMOJI_OPTIONS = ['📋', '💼', '🏠', '📚', '🎯', '💡', '🎨', '🏃', '🛒', '❤️'];

const EmojiDropdown = styled.div`
  position: absolute;
  bottom: 100%;
  left: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
`;

const EmojiOption = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--accent-light);
  }
`;

const GuideButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-top: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--accent-light);
    color: var(--accent);
  }
`;

const GuideOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const GuideModal = styled.div`
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const GuideHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
`;

const GuideTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
`;

const GuideCloseBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;

  &:hover {
    background: var(--accent-light);
    color: var(--text-primary);
  }
`;

const GuideContent = styled.pre`
  padding: 20px;
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const TodoSidebar: React.FC = () => {
  const {
    todos,
    lists,
    currentView,
    currentListId,
    searchQuery,
    setCurrentView,
    setSearchQuery,
    addList,
    deleteList,
  } = useTodoStore();

  const { t } = useTranslation();

  const [creatingList, setCreatingList] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('📋');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingList && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creatingList]);

  const myDayCount = todos.filter((td) => td.myDay && !td.completed).length;
  const importantCount = todos.filter((td) => td.important && !td.completed).length;
  const plannedCount = todos.filter((td) => td.dueDate !== undefined && !td.completed).length;
  const allCount = todos.filter((td) => !td.completed).length;

  const getListCount = (listId: string) =>
    todos.filter((td) => td.listId === listId && !td.completed).length;

  const handleCreateList = () => {
    const trimmed = newListName.trim();
    if (trimmed) {
      addList(trimmed, newListIcon);
    }
    setNewListName('');
    setNewListIcon('📋');
    setCreatingList(false);
    setShowEmojiPicker(false);
  };

  const handleNewListKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCreateList();
    if (e.key === 'Escape') {
      setCreatingList(false);
      setNewListName('');
      setShowEmojiPicker(false);
    }
  };

  const handleDeleteList = (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    deleteList(listId);
  };

  return (
    <SidebarContainer>
      <SearchBox>
        <SearchWrapper>
          <SearchInput
            placeholder={t('todo.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchWrapper>
      </SearchBox>

      <NavSection>
        <NavItem
          active={currentView === 'my-day' && !searchQuery}
          onClick={() => setCurrentView('my-day')}
        >
          <NavIcon>☀️</NavIcon>
          <NavLabel>{t('todo.myDay')}</NavLabel>
          {myDayCount > 0 && <NavCount>{myDayCount}</NavCount>}
        </NavItem>
        <NavItem
          active={currentView === 'important' && !searchQuery}
          onClick={() => setCurrentView('important')}
        >
          <NavIcon>⭐</NavIcon>
          <NavLabel>{t('todo.important')}</NavLabel>
          {importantCount > 0 && <NavCount>{importantCount}</NavCount>}
        </NavItem>
        <NavItem
          active={currentView === 'planned' && !searchQuery}
          onClick={() => setCurrentView('planned')}
        >
          <NavIcon>📅</NavIcon>
          <NavLabel>{t('todo.planned')}</NavLabel>
          {plannedCount > 0 && <NavCount>{plannedCount}</NavCount>}
        </NavItem>
        <NavItem
          active={currentView === 'tasks' && !searchQuery}
          onClick={() => setCurrentView('tasks')}
        >
          <NavIcon>📋</NavIcon>
          <NavLabel>{t('todo.tasks')}</NavLabel>
          {allCount > 0 && <NavCount>{allCount}</NavCount>}
        </NavItem>
      </NavSection>

      <Divider />

      <ListSection>
        {lists.map((list: TodoList) => (
          <ListItemWrapper key={list.id}>
            <NavItem
              active={currentView === 'list' && currentListId === list.id && !searchQuery}
              onClick={() => setCurrentView('list', list.id)}
              style={{ paddingRight: '32px' }}
            >
              <NavIcon>{list.icon}</NavIcon>
              <NavLabel>{list.name}</NavLabel>
              {getListCount(list.id) > 0 && <NavCount>{getListCount(list.id)}</NavCount>}
            </NavItem>
            <DeleteListBtn
              className="delete-btn"
              onClick={(e) => handleDeleteList(e, list.id)}
              title={t('todo.deleteList')}
            >
              ✕
            </DeleteListBtn>
          </ListItemWrapper>
        ))}
      </ListSection>

      <BottomBar style={{ position: 'relative' }}>
        {creatingList ? (
          <>
            {showEmojiPicker && (
              <EmojiDropdown>
                {EMOJI_OPTIONS.map((emoji) => (
                  <EmojiOption
                    key={emoji}
                    onClick={() => {
                      setNewListIcon(emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </EmojiOption>
                ))}
              </EmojiDropdown>
            )}
            <NewListForm>
              <EmojiPicker onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                {newListIcon}
              </EmojiPicker>
              <NewListInput
                ref={inputRef}
                placeholder={t('todo.listName')}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={handleNewListKeyDown}
                onBlur={() => {
                  // Delay to allow emoji click
                  setTimeout(() => {
                    if (!newListName.trim()) {
                      setCreatingList(false);
                      setShowEmojiPicker(false);
                    }
                  }, 200);
                }}
              />
            </NewListForm>
          </>
        ) : (
          <NewListButton onClick={() => setCreatingList(true)}>
            <span>+</span> {t('todo.newList')}
          </NewListButton>
        )}

        {/* Guide button */}
        <GuideButton onClick={() => setGuideOpen(true)}>
          <span>📖</span> {t('todo.guide')}
        </GuideButton>
      </BottomBar>

      {/* Guide Modal */}
      {guideOpen && (
        <GuideOverlay onClick={() => setGuideOpen(false)}>
          <GuideModal onClick={(e) => e.stopPropagation()}>
            <GuideHeader>
              <GuideTitle>{t('todo.guide.title')}</GuideTitle>
              <GuideCloseBtn onClick={() => setGuideOpen(false)}>✕</GuideCloseBtn>
            </GuideHeader>
            <GuideContent>{t('todo.guide.content')}</GuideContent>
          </GuideModal>
        </GuideOverlay>
      )}
    </SidebarContainer>
  );
};

export default TodoSidebar;
