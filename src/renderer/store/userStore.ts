import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserState {
  isLoggedIn: boolean;
  username: string;
  avatar: string; // emoji or URL
  email: string;
}

export interface UserActions {
  login: (username: string, email?: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<UserState, 'username' | 'avatar' | 'email'>>) => void;
}

export type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      username: '',
      avatar: '👤',
      email: '',

      login: (username, email = '') => {
        set({
          isLoggedIn: true,
          username,
          email,
          avatar: username.charAt(0).toUpperCase(),
        });
      },

      logout: () => {
        set({
          isLoggedIn: false,
          username: '',
          avatar: '👤',
          email: '',
        });
      },

      updateProfile: (updates) => {
        set((state) => ({
          ...state,
          ...updates,
          // Regenerate avatar initial if username changed
          avatar: updates.username
            ? updates.username.charAt(0).toUpperCase()
            : state.avatar,
        }));
      },
    }),
    {
      name: 'cinnatool-user',
    }
  )
);
