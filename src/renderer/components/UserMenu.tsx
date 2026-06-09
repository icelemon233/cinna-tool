import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useUserStore } from '../store/userStore';
import { useTodoStore } from '../store/todoStore';
import { useTranslation } from '../i18n';

// --- Styled Components ---

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
`;

const MenuContainer = styled.div`
  position: absolute;
  top: 48px;
  right: 16px;
  width: 300px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
  background: #ffffff;
  z-index: 1000;
  overflow: hidden;
  animation: fadeIn 0.15s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  [data-theme='dark'] & {
    background: #2a2a3d;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const MenuHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 12px;

  [data-theme='dark'] & {
    border-bottom-color: #3a3a4d;
  }
`;

const AvatarCircle = styled.div<{ bg?: string }>`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: ${({ bg }) => bg || '#667eea'};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #2d3748;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  [data-theme='dark'] & {
    color: #e8e8f0;
  }
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: #888;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  [data-theme='dark'] & {
    color: #999;
  }
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 12px 20px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 14px;
  color: #4a5568;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.15s ease;

  &:hover {
    background: #f7f7fa;
  }

  [data-theme='dark'] & {
    color: #d0d0e0;

    &:hover {
      background: #353548;
    }
  }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;

  [data-theme='dark'] & {
    background: #3a3a4d;
  }
`;

const FormContainer = styled.div`
  padding: 20px;
`;

const FormTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 16px;
  text-align: center;

  [data-theme='dark'] & {
    color: #e8e8f0;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 10px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #667eea;
  }

  [data-theme='dark'] & {
    background: #1e1e2e;
    border-color: #4a4a5d;
    color: #e8e8f0;

    &:focus {
      border-color: #667eea;
    }
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: #4a5568;

  [data-theme='dark'] & {
    color: #b0b0c0;
  }
`;

const StatValue = styled.span`
  font-weight: 600;
  color: #667eea;
`;

// --- Component ---

type MenuView = 'main' | 'edit' | 'stats';

interface UserMenuProps {
  onClose: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onClose }) => {
  const { isLoggedIn, username, email, login, logout, updateProfile } = useUserStore();
  const { todos } = useTodoStore();
  const { t } = useTranslation();

  const [view, setView] = useState<MenuView>('main');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [editUsername, setEditUsername] = useState(username);
  const [editEmail, setEditEmail] = useState(email);

  const handleLogin = () => {
    if (!loginUsername.trim()) return;
    login(loginUsername.trim(), loginEmail.trim());
    setLoginUsername('');
    setLoginEmail('');
  };

  const handleSaveProfile = () => {
    if (!editUsername.trim()) return;
    updateProfile({
      username: editUsername.trim(),
      email: editEmail.trim(),
    });
    setView('main');
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const completedTodos = todos.filter((t) => t.completed).length;
  const totalTodos = todos.length;

  // --- Login Form ---
  if (!isLoggedIn) {
    return (
      <Overlay onClick={onClose}>
        <MenuContainer onClick={(e) => e.stopPropagation()}>
          <FormContainer>
            <FormTitle>{t('user.loginTitle')}</FormTitle>
            <Input
              placeholder={t('user.username')}
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <Input
              placeholder={t('user.email')}
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <SubmitButton onClick={handleLogin} disabled={!loginUsername.trim()}>
              {t('user.login')}
            </SubmitButton>
          </FormContainer>
        </MenuContainer>
      </Overlay>
    );
  }

  // --- Edit Profile ---
  if (view === 'edit') {
    return (
      <Overlay onClick={onClose}>
        <MenuContainer onClick={(e) => e.stopPropagation()}>
          <FormContainer>
            <FormTitle>{t('user.editProfile')}</FormTitle>
            <Input
              placeholder={t('user.username')}
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
              autoFocus
            />
            <Input
              placeholder={t('user.email')}
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
            />
            <SubmitButton onClick={handleSaveProfile} disabled={!editUsername.trim()}>
              {t('user.save')}
            </SubmitButton>
          </FormContainer>
        </MenuContainer>
      </Overlay>
    );
  }

  // --- Stats View ---
  if (view === 'stats') {
    return (
      <Overlay onClick={onClose}>
        <MenuContainer onClick={(e) => e.stopPropagation()}>
          <FormContainer>
            <FormTitle>📊 {t('user.stats')}</FormTitle>
            <StatItem>
              <span>{t('user.totalTodos')}</span>
              <StatValue>{totalTodos}</StatValue>
            </StatItem>
            <StatItem>
              <span>{t('user.completedTodos')}</span>
              <StatValue>{completedTodos}</StatValue>
            </StatItem>
            <StatItem>
              <span>{t('user.completionRate')}</span>
              <StatValue>
                {totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0}%
              </StatValue>
            </StatItem>
            <SubmitButton onClick={() => setView('main')} style={{ marginTop: 12 }}>
              {t('user.back')}
            </SubmitButton>
          </FormContainer>
        </MenuContainer>
      </Overlay>
    );
  }

  // --- Main Menu (Logged In) ---
  return (
    <Overlay onClick={onClose}>
      <MenuContainer onClick={(e) => e.stopPropagation()}>
        <MenuHeader>
          <AvatarCircle>{username.charAt(0).toUpperCase()}</AvatarCircle>
          <UserInfo>
            <UserName>{username}</UserName>
            {email && <UserEmail>{email}</UserEmail>}
          </UserInfo>
        </MenuHeader>
        <div style={{ padding: '4px 0' }}>
          <MenuItem onClick={() => { setEditUsername(username); setEditEmail(email); setView('edit'); }}>
            📝 {t('user.editProfile')}
          </MenuItem>
          <MenuItem onClick={() => alert(t('user.featureInDev'))}>
            🔑 {t('user.changePassword')}
          </MenuItem>
          <MenuItem onClick={() => setView('stats')}>
            📊 {t('user.stats')}
          </MenuItem>
          <MenuDivider />
          <MenuItem onClick={handleLogout}>
            🚪 {t('user.logout')}
          </MenuItem>
        </div>
      </MenuContainer>
    </Overlay>
  );
};

export default UserMenu;
