// src/store/reducers/auth/types.ts
import { User } from 'firebase/auth';
import { UserFirestoreData } from '@/types/auth';

/**
 * アプリケーション内ユーザー情報の型定義
 * Firebaseから取得した情報とカスタム情報を含む
 */
export interface AppUser {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  role: string | null;
  photoURL: string | null;
  avatarUrl: string | null;
  backgroundImageUrl: string | null;
  chatGptApiKey?: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  rakutenAppId?: string;
  amazonAccessKey?: string;
  amazonSecretKey?: string;
  dmmAffiliateId?: string;
  dmmApiId?: string;
  googleSheetUrl?: string;
  termsAccepted: boolean | null;
  isNewUser?: boolean;
}

/**
 * 認証ステートの型定義
 */
export interface AppAuth {
  user: AppUser;
  loading: boolean;
  error: string | null;
  task: string | null;
}

/**
 * setUserアクション用のペイロード型定義
 */
export interface SetUserPayload {
  user: User | null; // Firebase Auth User
  userData?: UserFirestoreData | null; // Firestore データ
  profileData?: any | null; // RTDB Profile データ
  settingsData?: any | null; // RTDB Settings データ
}

/**
 * プロフィール情報の型定義
 */
export interface ProfileData {
  role: string;
  avatarUrl: string;
  backgroundImageUrl: string;
}

/**
 * API Key情報の型定義
 */
export interface ApiKeyData {
  chatGptApiKey: string;
  geminiApiKey: string;
  anthropicApiKey: string;
  googleSheetUrl: string;
}

/**
 * アフィリエイト情報の型定義
 */
export interface AffiliateKeyData {
  rakutenAppId: string;
  amazonAccessKey: string;
  amazonSecretKey: string;
  dmmAffiliateId: string;
  dmmApiId: string;
  googleSheetUrl: string;
}

/**
 * プロフィール更新用のデータ型定義
 */
export interface ProfileUpdateData {
  displayName: string;
  role: string;
  avatar: File | null;
  backgroundImage: File | null;
}

/**
 * プロフィール更新結果の型定義
 */
export interface ProfileUpdateResult {
  displayName: string;
  role: string;
  avatarUrl: string;
  backgroundImageUrl: string;
}
