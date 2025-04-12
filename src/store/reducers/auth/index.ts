// src/store/reducers/auth/index.ts

// API Key関連のThunks
import { affiliateKeySave, saveApiKeys } from './apiThunks';
import authReducer, {
  initialize,
  resetTask,
  selectAuth,
  selectAuthError,
  selectAuthLoading,
  selectAuthTask,
  selectIsAuthenticated,
  selectTermsAccepted,
  selectUser,
  setError,
  setLoading,
  setUser,
} from './authSlice';
// 認証関連のThunks
import {
  listenAuthState,
  sendResetPasswordEmail,
  signIn,
  signInWithGoogle,
  signOut,
  updateUserPassword,
} from './authThunks';
// ユーザープロファイル関連のThunks
import { acceptTerms, getProfileImages, getUserProfile, setProfile } from './userThunks';

// 型定義をエクスポート
export * from './types';

// Reducerをデフォルトエクスポート
export default authReducer;

// アクションをエクスポート
export {
  // アクションクリエイター
  initialize,
  resetTask,
  setLoading,
  setError,
  setUser,

  // 認証関連Thunk
  signIn,
  signInWithGoogle,
  signOut,
  sendResetPasswordEmail,
  updateUserPassword,
  listenAuthState,

  // ユーザープロファイル関連Thunk
  getUserProfile,
  getProfileImages,
  setProfile,
  acceptTerms,

  // API Key関連Thunk
  saveApiKeys,
  affiliateKeySave,

  // セレクター
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectTermsAccepted,
  selectAuthError,
  selectAuthTask,
};
