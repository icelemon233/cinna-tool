import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface UserAvatarProps {
  avatar?: string;
  username?: string;
  size?: number;
  className?: string;
}

function isImageAvatar(value?: string): boolean {
  return Boolean(value && /^(data:image\/|https?:\/\/|file:\/\/|blob:)/i.test(value));
}

function getFallbackText(avatar?: string, username?: string): string {
  const trimmedName = username?.trim();
  if (trimmedName) return trimmedName.slice(0, 1).toUpperCase();

  const trimmedAvatar = avatar?.trim();
  if (trimmedAvatar && !isImageAvatar(trimmedAvatar)) return trimmedAvatar;

  return '';
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  username,
  size = 40,
  className,
}) => {
  const imageAvatar = isImageAvatar(avatar) ? avatar : undefined;
  const fallbackText = getFallbackText(avatar, username);

  return (
    <Avatar
      className={className}
      size={size}
      src={imageAvatar}
      icon={!imageAvatar && !fallbackText ? <UserOutlined /> : undefined}
    >
      {!imageAvatar ? fallbackText : null}
    </Avatar>
  );
};

export default UserAvatar;
