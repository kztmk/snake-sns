// src/store/reducers/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../index';
// API Key関連のThunks
import { affiliateKeySave, saveApiKeys } from './apiThunks';
// 認証関連のThunks
import {
  sendResetPasswordEmail,
  signIn,
  signInWithGoogle,
  signOut,
  updateUserPassword,
} from './authThunks';
import { DEFAULT_AVATAR_URL, DEFAULT_BACKGROUND_IMAGE_URL, SLICE_NAME } from './constants';
import { AppAuth, AppUser, SetUserPayload } from './types';
// ユーザープロファイル関連のThunks
import { acceptTerms, getProfileImages, getUserProfile, setProfile } from './userThunks';

/**
 * 初期状態
 */
const initialState: AppAuth = {
  user: {
    uid: null,
    email: null,
    displayName: null,
    role: null,
    photoURL: null,
    avatarUrl: DEFAULT_AVATAR_URL,
    backgroundImageUrl: DEFAULT_BACKGROUND_IMAGE_URL,
    chatGptApiKey: '',
    geminiApiKey: '',
    anthropicApiKey: '',
    rakutenAppId: '',
    amazonAccessKey: '',
    amazonSecretKey: '',
    dmmAffiliateId: '',
    dmmApiId: '',
    googleSheetUrl: '',
    termsAccepted: false,
    isNewUser: false,
  },
  loading: true,
  error: null,
  task: null,
};

/**
 * Authスライス
 */
const authSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    // stateを初期化
    initialize: (state) => {
      console.log('Initializing auth state...');
      state.loading = false;
      Object.assign(state, initialState);
    },
    // reset task & error
    resetTask: (state) => {
      state.task = null;
      state.error = null;
    },
    // setLoading
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // set error message
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    // onAuthStateChangedやログイン成功時にユーザー情報を設定
    setUser: (state, action: PayloadAction<SetUserPayload>) => {
      const { user, userData, profileData, settingsData } = action.payload;
      if (user) {
        console.log(`Setting user in Redux state: ${user.uid}`);
        state.user = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: profileData?.role ?? state.user.role ?? '', // 既存stateもフォールバック
          avatarUrl:
            profileData?.avatarUrl ?? user.photoURL ?? state.user.avatarUrl ?? DEFAULT_AVATAR_URL,
          backgroundImageUrl:
            profileData?.backgroundImageUrl ??
            state.user.backgroundImageUrl ??
            DEFAULT_BACKGROUND_IMAGE_URL,
          chatGptApiKey: settingsData?.chatGptApiKey ?? state.user.chatGptApiKey ?? '',
          geminiApiKey: settingsData?.geminiApiKey ?? state.user.geminiApiKey ?? '',
          anthropicApiKey: settingsData?.anthropicApiKey ?? state.user.anthropicApiKey ?? '',
          rakutenAppId: settingsData?.rakutenAppId ?? state.user.rakutenAppId ?? '',
          amazonAccessKey: settingsData?.amazonAccessKey ?? state.user.amazonAccessKey ?? '',
          amazonSecretKey: settingsData?.amazonSecretKey ?? state.user.amazonSecretKey ?? '',
          dmmAffiliateId: settingsData?.dmmAffiliateId ?? state.user.dmmAffiliateId ?? '',
          dmmApiId: settingsData?.dmmApiId ?? state.user.dmmApiId ?? '',
          googleSheetUrl: settingsData?.googleSheetUrl ?? state.user.googleSheetUrl ?? '',
          // termsAccepted は userData から、なければ null
          termsAccepted: userData?.termsAccepted ?? null,
          isNewUser: undefined, // isNewUser はThunkから直接渡さない
        };
        state.error = null; // ユーザーが設定されたらエラーはクリア
      } else {
        // ユーザーが null の場合、state を初期化
        console.log('Setting user to null (logged out), initializing state.');
        Object.assign(state, initialState);
        state.loading = false; // 初期化完了
      }
    },
  },
  extraReducers: (builder) => {
    // 共通のPending処理
    const handlePending = (state: AppAuth) => {
      state.loading = true;
      state.error = null;
      state.task = state.task ? `${state.task}_pending` : 'pending';
    };

    // 共通のRejected処理
    const handleRejected = (state: AppAuth, action: PayloadAction<any>) => {
      state.loading = false;
      // action.payloadが存在し、文字列であれば其れをエラーメッセージとして使用
      state.error = typeof action.payload === 'string' ? action.payload : 'An error occurred';
      state.task = state.task ? `${state.task}_error` : 'error';
      console.log(`Auth operation failed: ${state.task}`, state.error);
    };

    // signIn(Email/Password)
    builder.addCase(signIn.pending, (state) => {
      handlePending(state);
      state.task = 'signin';
    });
    builder.addCase(signIn.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.task = 'signin_success';
      state.error = null;
    });
    builder.addCase(signIn.rejected, (state, action) => {
      handleRejected(state, action);
      state.user = initialState.user; // ログイン失敗時はユーザー情報を初期化
    });

    // signInWithGoogle
    builder.addCase(signInWithGoogle.pending, (state) => {
      handlePending(state);
      state.task = 'google_signin';
    });
    builder.addCase(signInWithGoogle.fulfilled, (state, action) => {
      // isNewUser は payload に含まれるが、state.user には isNewUser フィールドはないので、他を設定
      state.user = { ...action.payload, isNewUser: undefined };
      state.loading = false;
      state.error = null;
      state.task = 'google_signin_success';
    });
    builder.addCase(signInWithGoogle.rejected, (state, action) => {
      handleRejected(state, action);
      state.user = initialState.user; // 失敗時は初期化
    });

    // --- acceptTerms ---
    builder.addCase(acceptTerms.pending, (state) => {
      handlePending(state);
      state.task = 'accept_terms';
    });
    builder.addCase(acceptTerms.fulfilled, (state, action) => {
      if (state.user) {
        state.user.termsAccepted = action.payload.termsAccepted;
      }
      state.loading = false;
      state.task = 'accept_terms_success';
    });
    builder.addCase(acceptTerms.rejected, handleRejected);

    // getUserProfile
    builder.addCase(getUserProfile.pending, (state) => {
      handlePending(state);
      state.task = 'get_user_profile';
    });
    builder.addCase(getUserProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.user = {
        ...state.user,
        role: action.payload.role,
        avatarUrl: action.payload.avatarUrl,
        backgroundImageUrl: action.payload.backgroundImageUrl,
      };
      state.task = 'get_user_profile_success';
    });
    builder.addCase(getUserProfile.rejected, handleRejected);

    // getProfileImages
    builder.addCase(getProfileImages.pending, (state) => {
      handlePending(state);
      state.task = 'get_profile_images';
    });
    builder.addCase(getProfileImages.fulfilled, (state, action) => {
      if (state.user) {
        state.user.avatarUrl = action.payload.avatarUrl;
        state.user.backgroundImageUrl = action.payload.backgroundImageUrl;
      }
      state.loading = false;
      state.task = 'get_profile_images_success';
    });
    builder.addCase(getProfileImages.rejected, handleRejected);

    // setProfile
    builder.addCase(setProfile.pending, (state) => {
      handlePending(state);
      state.task = 'set_profile';
    });
    builder.addCase(setProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.user = {
        ...state.user,
        displayName: action.payload.displayName,
        role: action.payload.role,
        avatarUrl: action.payload.avatarUrl,
        backgroundImageUrl: action.payload.backgroundImageUrl,
        photoURL: action.payload.avatarUrl,
      };
      state.task = 'set_profile_success';
    });
    builder.addCase(setProfile.rejected, handleRejected);

    // updateUserPassword
    builder.addCase(updateUserPassword.pending, (state) => {
      handlePending(state);
      state.task = 'update_password';
    });
    builder.addCase(updateUserPassword.fulfilled, (state) => {
      state.loading = false;
      state.task = 'update_password_success';
    });
    builder.addCase(updateUserPassword.rejected, handleRejected);

    // signout
    builder.addCase(signOut.pending, (state) => {
      handlePending(state);
      state.task = 'signout';
    });
    builder.addCase(signOut.fulfilled, (state) => {
      // initialize
      Object.assign(state, initialState);
      state.loading = false;
      state.task = 'signout_success';
    });
    builder.addCase(signOut.rejected, (state, action) => {
      handleRejected(state, action);
      Object.assign(state, initialState);
      state.loading = false;
    });

    // saveApiKeys
    builder.addCase(saveApiKeys.pending, (state) => {
      handlePending(state);
      state.task = 'save_api_keys';
    });
    builder.addCase(saveApiKeys.fulfilled, (state, action) => {
      state.loading = false;
      state.task = 'save_api_keys_success';
      state.user = {
        ...state.user,
        chatGptApiKey: action.payload.chatGptApiKey,
        geminiApiKey: action.payload.geminiApiKey,
        anthropicApiKey: action.payload.anthropicApiKey,
        googleSheetUrl: action.payload.googleSheetUrl,
      };
    });
    builder.addCase(saveApiKeys.rejected, handleRejected);

    // sendResetPasswordEmail
    builder.addCase(sendResetPasswordEmail.pending, (state) => {
      handlePending(state);
      state.task = 'send_reset_password';
    });
    builder.addCase(sendResetPasswordEmail.fulfilled, (state) => {
      state.loading = false;
      state.task = 'send_reset_password_success';
    });
    builder.addCase(sendResetPasswordEmail.rejected, handleRejected);

    // affiliateKeySave
    builder.addCase(affiliateKeySave.pending, (state) => {
      handlePending(state);
      state.task = 'save_affiliate_keys';
    });
    builder.addCase(affiliateKeySave.fulfilled, (state, action) => {
      state.loading = false;
      state.task = 'save_affiliate_keys_success';
      state.user = {
        ...state.user,
        rakutenAppId: action.payload.rakutenAppId,
        amazonAccessKey: action.payload.amazonAccessKey,
        amazonSecretKey: action.payload.amazonSecretKey,
        dmmAffiliateId: action.payload.dmmAffiliateId,
        dmmApiId: action.payload.dmmApiId,
        googleSheetUrl: action.payload.googleSheetUrl,
      };
    });
    builder.addCase(affiliateKeySave.rejected, handleRejected);
  },
});

// --- Selectors ---
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => !!state.auth.user?.uid;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
// termsAccepted は null もありうるので boolean だけでなく null も考慮
export const selectTermsAccepted = (state: RootState): boolean | null =>
  state.auth.user?.termsAccepted ?? null;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectAuthTask = (state: RootState) => state.auth.task;

// --- Actions ---
export const { initialize, resetTask, setLoading, setError, setUser } = authSlice.actions;

export default authSlice.reducer;
