/**
 * Reduxストアの設定ファイル
 * アプリケーション全体の状態管理を行う
 */
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import auth from './reducers/authSlice';
import xAccounts from './reducers/xAccoutsSlice';

/**
 * 全てのリデューサーを統合したルートリデューサー
 * - auth: 認証情報の管理
 * - xAccounts: Xアカウント情報のCRUD管理
 */
const rootReducer = combineReducers({ auth, xAccounts });
export type RootState = ReturnType<typeof rootReducer>;

/**
 * Redux Toolkit設定ストア
 * ミドルウェアの追加やDevToolsの設定はconfigureStoreが自動的に行う
 */
const store = configureStore({
  reducer: rootReducer,
  // 必要に応じてミドルウェアやdevToolsの設定を追加可能
});

export type AppDispatch = typeof store.dispatch;
export default store;
