import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/shared/services/supabase/client';
import {
  createInitialAvatar,
  getAccountSnapshot,
  getCurrentSession,
  isAccountServiceConfigured,
  removeAccountAvatar,
  sendPasswordResetEmail,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updateAccountProfile,
  uploadAccountAvatar,
  type AccountSnapshot,
  type SignUpResult,
  type UpdateAccountResult,
} from '@/shared/services/supabase/account';

let authSubscription: { unsubscribe: () => void } | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toGuestState() {
  return {
    isLoggedIn: false,
    userId: '',
    username: '',
    avatar: '👤',
    email: '',
  };
}

function snapshotToState(snapshot: AccountSnapshot) {
  return {
    isLoggedIn: true,
    userId: snapshot.userId,
    username: snapshot.username,
    avatar: snapshot.avatar,
    email: snapshot.email,
  };
}

export interface UserState {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  isAuthAvailable: boolean;
  isLoading: boolean;
  userId: string;
  username: string;
  avatar: string;
  email: string;
  authError: string;
}

export interface UserActions {
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<SignUpResult>;
  logout: () => Promise<void>;
  updateProfile: (
    updates: Partial<Pick<UserState, 'username' | 'avatar' | 'email'>>
  ) => Promise<UpdateAccountResult>;
  uploadAvatar: (avatarBlob: Blob) => Promise<void>;
  removeAvatar: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearAuthError: () => void;
}

export type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => {
      const applySession = async (session: Session | null) => {
        if (!session?.user) {
          set({
            ...toGuestState(),
            isAuthReady: true,
            isAuthAvailable: isAccountServiceConfigured(),
            isLoading: false,
            authError: '',
          });
          return;
        }

        try {
          const snapshot = await getAccountSnapshot(session);
          if (!snapshot) return;
          set({
            ...snapshotToState(snapshot),
            isAuthReady: true,
            isAuthAvailable: true,
            isLoading: false,
            authError: '',
          });
        } catch (error) {
          set({
            isAuthReady: true,
            isAuthAvailable: true,
            isLoading: false,
            authError: getErrorMessage(error),
          });
        }
      };

      return {
        ...toGuestState(),
        isAuthReady: false,
        isAuthAvailable: isAccountServiceConfigured(),
        isLoading: false,
        authError: '',

        initializeAuth: async () => {
          if (!isAccountServiceConfigured() || !supabase) {
            set({
              ...toGuestState(),
              isAuthReady: true,
              isAuthAvailable: false,
              isLoading: false,
              authError: '',
            });
            return;
          }

          set({ isLoading: true, isAuthAvailable: true, authError: '' });

          if (!authSubscription) {
            const { data } = supabase.auth.onAuthStateChange((_event, session) => {
              void applySession(session);
            });
            authSubscription = data.subscription;
          }

          try {
            await applySession(await getCurrentSession());
          } catch (error) {
            set({
              ...toGuestState(),
              isAuthReady: true,
              isAuthAvailable: true,
              isLoading: false,
              authError: getErrorMessage(error),
            });
          }
        },

        signIn: async (email, password) => {
          set({ isLoading: true, authError: '' });
          try {
            const snapshot = await signInWithPassword(email.trim(), password);
            set({
              ...snapshotToState(snapshot),
              isAuthReady: true,
              isAuthAvailable: true,
              isLoading: false,
              authError: '',
            });
          } catch (error) {
            set({ isLoading: false, authError: getErrorMessage(error) });
            throw error;
          }
        },

        signUp: async (email, password, username) => {
          set({ isLoading: true, authError: '' });
          try {
            const result = await signUpWithPassword(email.trim(), password, username.trim());
            const session = await getCurrentSession().catch(() => null);
            if (session) {
              await applySession(session);
            } else {
              set({ isLoading: false, isAuthReady: true, isAuthAvailable: true });
            }
            return result;
          } catch (error) {
            set({ isLoading: false, authError: getErrorMessage(error) });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true, authError: '' });
          try {
            await signOut();
            set({
              ...toGuestState(),
              isAuthReady: true,
              isAuthAvailable: isAccountServiceConfigured(),
              isLoading: false,
              authError: '',
            });
          } catch (error) {
            set({ isLoading: false, authError: getErrorMessage(error) });
            throw error;
          }
        },

        updateProfile: async (updates) => {
          const current = get();
          if (!current.userId) throw new Error('No account is signed in.');

          const nextUsername = updates.username?.trim() || current.username;
          const nextEmail = updates.email?.trim() || current.email;
          const nextAvatar = updates.avatar ?? current.avatar;

          set({ isLoading: true, authError: '' });
          try {
            const result = await updateAccountProfile(
              current.userId,
              nextUsername,
              nextAvatar,
              current.email,
              nextEmail
            );
            set({
              username: nextUsername,
              email: result.emailChangePending ? current.email : nextEmail,
              avatar: nextAvatar,
              isLoading: false,
              authError: '',
            });
            return result;
          } catch (error) {
            set({ isLoading: false, authError: getErrorMessage(error) });
            throw error;
          }
        },

        uploadAvatar: async (avatarBlob) => {
          const current = get();
          if (!current.userId) throw new Error('No account is signed in.');

          set({ isLoading: true, authError: '' });
          try {
            const avatarUrl = await uploadAccountAvatar(current.userId, avatarBlob);
            await updateAccountProfile(
              current.userId,
              current.username,
              avatarUrl,
              current.email,
              current.email
            );
            set({ avatar: avatarUrl, isLoading: false, authError: '' });
          } catch (error) {
            set({ isLoading: false, authError: getErrorMessage(error) });
            throw error;
          }
        },

        removeAvatar: async () => {
          const current = get();
          if (!current.userId) throw new Error('No account is signed in.');

          set({ isLoading: true, authError: '' });
          try {
            await removeAccountAvatar(current.userId);
            const fallbackAvatar = createInitialAvatar(current.username);
            await updateAccountProfile(
              current.userId,
              current.username,
              fallbackAvatar,
              current.email,
              current.email
            );
            set({ avatar: fallbackAvatar, isLoading: false, authError: '' });
          } catch (error) {
            set({ isLoading: false, authError: getErrorMessage(error) });
            throw error;
          }
        },

        resetPassword: async (email) => {
          set({ isLoading: true, authError: '' });
          try {
            await sendPasswordResetEmail(email.trim());
            set({ isLoading: false, authError: '' });
          } catch (error) {
            set({ isLoading: false, authError: getErrorMessage(error) });
            throw error;
          }
        },

        clearAuthError: () => set({ authError: '' }),
      };
    },
    {
      name: 'cinnatool-user',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        userId: state.userId,
        username: state.username,
        avatar: state.avatar,
        email: state.email,
      }),
    }
  )
);
