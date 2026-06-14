import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Input, Progress, Segmented, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  LoginOutlined,
  MailOutlined,
  ProfileOutlined,
  UploadOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import UserAvatar from '@/shared/components/user-avatar/UserAvatar';
import { useTodoStore } from '@/shared/store/todoStore';
import { useUserStore } from '@/shared/store/userStore';

interface UserSectionProps {
  t: (key: string) => string;
}

type AuthMode = 'login' | 'signup';

const AVATAR_MAX_FILE_SIZE = 8 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE = 256;
const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

function isSupportedAvatarFile(file: File): boolean {
  return (
    /^image\/(png|jpe?g|webp|gif)$/i.test(file.type) ||
    /\.(png|jpe?g|webp|gif)$/i.test(file.name)
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('Failed to create avatar image'));
    }, 'image/png');
  });
}

async function createAvatarBlob(file: File): Promise<Blob> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
  const outputSize = Math.min(AVATAR_OUTPUT_SIZE, sourceSize || AVATAR_OUTPUT_SIZE);
  const context = canvas.getContext('2d');

  canvas.width = outputSize;
  canvas.height = outputSize;
  if (!context) throw new Error('Canvas is unavailable');

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    outputSize,
    outputSize
  );

  return canvasToPngBlob(canvas);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function UserSection({ t }: UserSectionProps) {
  const { message } = App.useApp();
  const {
    isLoggedIn,
    isAuthAvailable,
    isLoading,
    username,
    avatar,
    email,
    signIn,
    signUp,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    resetPassword,
  } = useUserStore();
  const { todos } = useTodoStore();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [editUsername, setEditUsername] = useState(username);
  const [editEmail, setEditEmail] = useState(email);

  useEffect(() => {
    setEditUsername(username);
    setEditEmail(email);
  }, [email, username]);

  const todoStats = useMemo(() => {
    const completed = todos.filter((todo) => todo.completed).length;
    const total = todos.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, completionRate, total };
  }, [todos]);

  const loginReady = Boolean(loginEmail.trim() && loginPassword);
  const signupReady = Boolean(signupUsername.trim() && signupEmail.trim() && signupPassword);

  const handleLogin = async () => {
    if (!loginReady) return;
    try {
      await signIn(loginEmail.trim(), loginPassword);
      setLoginPassword('');
      message.success(t('settings.loginSucceeded'));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleSignUp = async () => {
    if (!signupReady) return;
    try {
      const result = await signUp(signupEmail.trim(), signupPassword, signupUsername.trim());
      setSignupPassword('');
      if (result.needsEmailConfirmation) {
        message.success(t('settings.signupEmailSent'));
        setAuthMode('login');
        return;
      }
      message.success(t('settings.loginSucceeded'));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handlePasswordReset = async () => {
    const targetEmail = (authMode === 'login' ? loginEmail : signupEmail).trim();
    if (!targetEmail) {
      message.warning(t('settings.passwordResetNeedsEmail'));
      return;
    }

    try {
      await resetPassword(targetEmail);
      message.success(t('settings.passwordResetSent'));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleCurrentAccountPasswordReset = async () => {
    if (!email.trim()) {
      message.warning(t('settings.passwordResetNeedsEmail'));
      return;
    }

    try {
      await resetPassword(email.trim());
      message.success(t('settings.passwordResetSent'));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) return;

    try {
      const result = await updateProfile({
        username: editUsername.trim(),
        email: editEmail.trim(),
      });
      message.success(result.emailChangePending ? t('settings.emailChangePending') : t('settings.profileSaved'));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!isSupportedAvatarFile(file)) {
      message.warning(t('settings.avatarInvalid'));
      return;
    }

    if (file.size > AVATAR_MAX_FILE_SIZE) {
      message.warning(t('settings.avatarTooLarge'));
      return;
    }

    try {
      await uploadAvatar(await createAvatarBlob(file));
      message.success(t('settings.avatarUpdated'));
    } catch (error) {
      message.error(getErrorMessage(error) || t('settings.avatarFailed'));
    }
  };

  const handleAvatarBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    void handleAvatarUpload(file as File);
    return false;
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar();
      message.success(t('settings.avatarRemoved'));
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  if (!isLoggedIn) {
    return (
      <section className="settings-section">
        <h2 className="settings-section-title">{t('settings.user')}</h2>
        <div className="settings-card">
          <div className="settings-row settings-row--full">
            <div className="settings-user-login">
              <div className="settings-user-login-main">
                <UserAvatar className="settings-user-avatar" size={52} />
                <div>
                  <div className="settings-row-title">{t('settings.accountTitle')}</div>
                  <Typography.Text className="settings-row-desc" type="secondary">
                    {t('settings.accountDesc')}
                  </Typography.Text>
                </div>
              </div>

              <div className="settings-user-form">
                {!isAuthAvailable && (
                  <Alert
                    showIcon
                    type="warning"
                    message={t('settings.accountUnavailable')}
                    description={t('settings.accountUnavailableDesc')}
                  />
                )}
                <Segmented
                  block
                  value={authMode}
                  options={[
                    { label: t('user.login'), value: 'login' },
                    { label: t('user.signup'), value: 'signup' },
                  ]}
                  onChange={(value) => setAuthMode(value as AuthMode)}
                />

                {authMode === 'signup' && (
                  <Input
                    prefix={<UserOutlined />}
                    placeholder={t('user.username')}
                    value={signupUsername}
                    disabled={!isAuthAvailable || isLoading}
                    onChange={(event) => setSignupUsername(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSignUp()}
                  />
                )}
                <Input
                  prefix={<MailOutlined />}
                  placeholder={t('user.email')}
                  value={authMode === 'login' ? loginEmail : signupEmail}
                  disabled={!isAuthAvailable || isLoading}
                  onChange={(event) => {
                    if (authMode === 'login') {
                      setLoginEmail(event.target.value);
                    } else {
                      setSignupEmail(event.target.value);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void (authMode === 'login' ? handleLogin() : handleSignUp());
                    }
                  }}
                />
                <Input.Password
                  prefix={<KeyOutlined />}
                  placeholder={t('user.password')}
                  value={authMode === 'login' ? loginPassword : signupPassword}
                  disabled={!isAuthAvailable || isLoading}
                  onChange={(event) => {
                    if (authMode === 'login') {
                      setLoginPassword(event.target.value);
                    } else {
                      setSignupPassword(event.target.value);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void (authMode === 'login' ? handleLogin() : handleSignUp());
                    }
                  }}
                />
                <Button
                  type="primary"
                  icon={authMode === 'login' ? <LoginOutlined /> : <UserAddOutlined />}
                  loading={isLoading}
                  onClick={() => void (authMode === 'login' ? handleLogin() : handleSignUp())}
                  disabled={!isAuthAvailable || (authMode === 'login' ? !loginReady : !signupReady)}
                >
                  {authMode === 'login' ? t('user.login') : t('user.signup')}
                </Button>
                <Button
                  type="text"
                  icon={<LockOutlined />}
                  disabled={!isAuthAvailable || isLoading}
                  onClick={() => void handlePasswordReset()}
                >
                  {t('user.resetPassword')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{t('settings.user')}</h2>
      <div className="settings-card">
        <div className="settings-row settings-row--user-profile">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <EditOutlined />
              {t('user.editProfile')}
            </div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.profileDesc')}
            </Typography.Text>
            <div className="settings-user-identity">
              <UserAvatar avatar={avatar} className="settings-user-avatar" size={56} username={username} />
              <div className="settings-user-identity-text">
                <Typography.Text strong title={username}>
                  {username}
                </Typography.Text>
                {email && (
                  <Typography.Text type="secondary" title={email}>
                    {email}
                  </Typography.Text>
                )}
              </div>
            </div>
          </div>
          <div className="settings-row-control settings-user-form">
            <div className="settings-avatar-actions">
              <Upload
                accept={AVATAR_ACCEPT}
                beforeUpload={handleAvatarBeforeUpload}
                maxCount={1}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} loading={isLoading}>
                  {t('settings.uploadAvatar')}
                </Button>
              </Upload>
              <Button icon={<DeleteOutlined />} loading={isLoading} onClick={() => void handleRemoveAvatar()}>
                {t('settings.removeAvatar')}
              </Button>
            </div>
            <Input
              prefix={<UserOutlined />}
              placeholder={t('user.username')}
              value={editUsername}
              disabled={isLoading}
              onChange={(event) => setEditUsername(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSaveProfile()}
            />
            <Input
              prefix={<MailOutlined />}
              placeholder={t('user.email')}
              value={editEmail}
              disabled={isLoading}
              onChange={(event) => setEditEmail(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSaveProfile()}
            />
            <Button
              className="settings-user-save-button"
              type="primary"
              loading={isLoading}
              onClick={() => void handleSaveProfile()}
              disabled={!editUsername.trim()}
            >
              {t('user.save')}
            </Button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <LockOutlined />
              {t('user.resetPassword')}
            </div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.changePasswordDesc')}
            </Typography.Text>
          </div>
          <div className="settings-row-control settings-row-control--button">
            <Button icon={<LockOutlined />} loading={isLoading} onClick={() => void handleCurrentAccountPasswordReset()}>
              {t('user.resetPassword')}
            </Button>
          </div>
        </div>

        <div className="settings-row settings-row--user-stats">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <ProfileOutlined />
              {t('user.stats')}
            </div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.userStatsDesc')}
            </Typography.Text>
          </div>
          <div className="settings-row-control settings-user-stats">
            <Progress percent={todoStats.completionRate} size="small" />
            <div className="settings-user-stat-grid">
              <div className="settings-user-stat">
                <Typography.Text type="secondary">{t('user.totalTodos')}</Typography.Text>
                <strong>{todoStats.total}</strong>
              </div>
              <div className="settings-user-stat">
                <Typography.Text type="secondary">{t('user.completedTodos')}</Typography.Text>
                <strong>{todoStats.completed}</strong>
              </div>
              <div className="settings-user-stat">
                <Typography.Text type="secondary">{t('user.completionRate')}</Typography.Text>
                <strong>{todoStats.completionRate}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
