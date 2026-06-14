import type { Session, User } from '@supabase/supabase-js';
import { requireSupabaseClient, supabase } from './client';
import type { AccountProfile } from './types';

const AVATAR_BUCKET = 'avatars';
const AVATAR_OBJECT_NAME = 'avatar.png';

export interface AccountSnapshot {
  userId: string;
  username: string;
  email: string;
  avatar: string;
}

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

export interface UpdateAccountResult {
  emailChangePending: boolean;
}

export function createInitialAvatar(username: string): string {
  return username.trim().slice(0, 1).toUpperCase() || '👤';
}

export function isGeneratedAvatar(avatar: string, username: string): boolean {
  return avatar === '👤' || avatar === createInitialAvatar(username);
}

export function isAccountServiceConfigured(): boolean {
  return Boolean(supabase);
}

function getUserMetadataText(user: User, key: string): string {
  const value = user.user_metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getDefaultUsername(user: User): string {
  return (
    getUserMetadataText(user, 'username') ||
    getUserMetadataText(user, 'name') ||
    user.email?.split('@')[0] ||
    'User'
  );
}

function profileToSnapshot(user: User, profile: AccountProfile): AccountSnapshot {
  const username = profile.username?.trim() || getDefaultUsername(user);
  return {
    userId: user.id,
    username,
    email: user.email || '',
    avatar: profile.avatar_url || getUserMetadataText(user, 'avatar_url') || createInitialAvatar(username),
  };
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getOrCreateProfile(user: User): Promise<AccountProfile> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, username, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const username = getDefaultUsername(user);
  const { data: createdProfile, error: createError } = await client
    .from('profiles')
    .upsert(
      {
        id: user.id,
        username,
        avatar_url: getUserMetadataText(user, 'avatar_url') || null,
      },
      { onConflict: 'id' }
    )
    .select('id, username, avatar_url, created_at, updated_at')
    .single();

  if (createError) throw createError;
  return createdProfile;
}

export async function getAccountSnapshot(session: Session | null): Promise<AccountSnapshot | null> {
  if (!session?.user) return null;
  const profile = await getOrCreateProfile(session.user);
  return profileToSnapshot(session.user, profile);
}

export async function signInWithPassword(email: string, password: string): Promise<AccountSnapshot> {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  const snapshot = await getAccountSnapshot(data.session);
  if (!snapshot) throw new Error('Login succeeded but no session was returned.');
  return snapshot;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  username: string
): Promise<SignUpResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (error) throw error;

  if (data.session) {
    await getAccountSnapshot(data.session);
  }

  return {
    needsEmailConfirmation: !data.session,
  };
}

export async function signOut(): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function updateAccountProfile(
  userId: string,
  username: string,
  avatar: string,
  currentEmail: string,
  nextEmail: string
): Promise<UpdateAccountResult> {
  const client = requireSupabaseClient();
  const normalizedEmail = nextEmail.trim();
  let emailChangePending = false;

  if (normalizedEmail && normalizedEmail !== currentEmail) {
    const { data, error } = await client.auth.updateUser({ email: normalizedEmail });
    if (error) throw error;
    emailChangePending = data.user.email !== normalizedEmail;
  }

  const { error } = await client
    .from('profiles')
    .upsert(
      {
        id: userId,
        username,
        avatar_url: avatar.startsWith('http') ? avatar : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) throw error;

  return { emailChangePending };
}

export async function uploadAccountAvatar(userId: string, avatarBlob: Blob): Promise<string> {
  const client = requireSupabaseClient();
  const path = `${userId}/${AVATAR_OBJECT_NAME}`;
  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, avatarBlob, {
      cacheControl: '3600',
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAccountAvatar(userId: string): Promise<void> {
  const client = requireSupabaseClient();
  await client.storage.from(AVATAR_BUCKET).remove([`${userId}/${AVATAR_OBJECT_NAME}`]);
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
