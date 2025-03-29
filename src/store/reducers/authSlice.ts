import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { ref as dbRef, get, getDatabase, set } from 'firebase/database';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { translateFirebaseAuthError } from '@/utils/firebaseUtils';
import firebaseApp from '../../firebase';
import type { RootState } from '../index';

const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp);
const storage = getStorage(firebaseApp);

const getFileExtension = (file: File): string => {
  const fileName = file.name;
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  } // 拡張子がない場合は空文字を返す
  return fileName.substring(lastDotIndex + 1);
};

const defaultAvatarUrl =
  'https://firebasestorage.googleapis.com/v0/b/aiwriter-dev.appspot.com/o/public%2Fimages%2Favatar_default.jpg?alt=media&token=e10e901b-8293-4652-8516-5ddf8c9621e2';
const defaultBackgroundImageUrl =
  'https://firebasestorage.googleapis.com/v0/b/aiwriter-dev.appspot.com/o/public%2Fimages%2Fbackground_default.jpg?alt=media&token=43431318-b4fa-49fb-902b-5e4e96f9c681';

/*
 * AppUser
 *  keep flat for adding new fields in future
 * from firebase auth
 *   uid: string | null;
 *   email: string | null;
 *   displayName: string | null;
 *   photoURL: string | null;
 * from user-data/${uid}/profile
 *   role: string | null;
 *   avatarUrl: string | null;
 *   backgroundImageUrl: string | null;
 * from user-data/${uid}/settings
 *   chatGptApiKey: string | null;
 *   geminiApiKey: string | null;
 *   anthropicApiKey: string | null;
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
}

export interface AppAuth {
  user: AppUser;
  loading: boolean;
  error: string | null;
  task: string | null;
}

const initialState: AppAuth = {
  user: {
    uid: null,
    email: null,
    displayName: null,
    role: null,
    photoURL: null,
    avatarUrl: null,
    backgroundImageUrl: null,
    chatGptApiKey: '',
    geminiApiKey: '',
    anthropicApiKey: '',
    rakutenAppId: '',
    amazonAccessKey: '',
    amazonSecretKey: '',
    dmmAffiliateId: '',
    dmmApiId: '',
    googleSheetUrl: '',
  },
  loading: false,
  error: null,
  task: null,
};

export const signIn = createAsyncThunk<
  AppUser,
  { email: string; password: string },
  { rejectValue: string }
>('auth/signIn', async (args, thunkApi) => {
  try {
    const appUser: AppUser = {
      uid: null,
      email: null,
      displayName: null,
      role: null,
      photoURL: null,
      avatarUrl: null,
      backgroundImageUrl: null,
    };
    const response = await signInWithEmailAndPassword(auth, args.email, args.password);
    if (response.user) {
      appUser.uid = response.user.uid;
      appUser.email = response.user.email;
      appUser.displayName = response.user.displayName;
      appUser.photoURL = response.user.photoURL;
    }
    console.log(`login: ${appUser.uid}`);
    const userRef = dbRef(database, `user-data/${response.user.uid}/profile`);
    const snapshot = await get(userRef);
    console.log(`getSnapshot`);
    if (!snapshot.exists()) {
      if (!snapshot.val()) {
        console.log('setDefault');
        appUser.role = '';
        appUser.avatarUrl = defaultAvatarUrl;
        appUser.backgroundImageUrl = defaultBackgroundImageUrl;
      }
    } else {
      const data = snapshot.val();
      appUser.role = data.role ?? '';
      appUser.avatarUrl = data.avatarUrl ?? defaultAvatarUrl;
      appUser.backgroundImageUrl = data.backgroundImageUrl ?? defaultBackgroundImageUrl;
    }

    const settingsRef = dbRef(database, `user-data/${response.user.uid}/settings`);
    const settingsSnapshot = await get(settingsRef);
    if (settingsSnapshot.exists()) {
      const data = settingsSnapshot.val();
      appUser.chatGptApiKey = data.chatGptApiKey ?? '';
      appUser.geminiApiKey = data.geminiApiKey ?? '';
      appUser.anthropicApiKey = data.anthropicApiKey ?? '';
      appUser.rakutenAppId = data.rakutenAppId ?? '';
      appUser.amazonAccessKey = data.amazonAccessKey ?? '';
      appUser.amazonSecretKey = data.amazonSecretKey ?? '';
      appUser.dmmAffiliateId = data.dmmAffiliateId ?? '';
      appUser.dmmApiId = data.dmmApiId ?? '';
      appUser.googleSheetUrl = data.googleSheetUrl ?? '';
    }

    return appUser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const errorMessage = translateFirebaseAuthError(error);
    return thunkApi.rejectWithValue(errorMessage);
  }
});

export const affiliateKeySave = createAsyncThunk<
  {
    rakutenAppId: string;
    amazonAccessKey: string;
    amazonSecretKey: string;
    dmmAffiliateId: string;
    dmmApiId: string;
    googleSheetUrl: string;
  },
  { keyInfo: [string, string][] },
  { state: RootState; rejectValue: string }
>('auth/affiliateKeySave', async (args, thunkApi) => {
  try {
    const appUser = thunkApi.getState().auth.user;
    if (appUser && appUser.uid) {
      const newValues = Object.fromEntries(args.keyInfo);
      const settingsRef = dbRef(database, `user-data/${appUser.uid}/settings`);
      console.log('newValues', newValues);
      const userSettings = {
        rakutenAppId: appUser.rakutenAppId ?? '',
        amazonAccessKey: appUser.amazonAccessKey ?? '',
        amazonSecretKey: appUser.amazonSecretKey ?? '',
        dmmAffiliateId: appUser.dmmAffiliateId ?? '',
        dmmApiId: appUser.dmmApiId ?? '',
        chatGptApiKey: appUser.chatGptApiKey,
        geminiApiKey: appUser.geminiApiKey,
        anthropicApiKey: appUser.anthropicApiKey,
        googleSheetUrl: appUser.googleSheetUrl ?? '',
        ...newValues,
      };
      await set(settingsRef, userSettings);
      return {
        rakutenAppId: userSettings.rakutenAppId ?? '',
        amazonAccessKey: userSettings.amazonAccessKey ?? '',
        amazonSecretKey: userSettings.amazonSecretKey ?? '',
        dmmAffiliateId: userSettings.dmmAffiliateId ?? '',
        dmmApiId: userSettings.dmmApiId ?? '',
        googleSheetUrl: userSettings.googleSheetUrl ?? '',
      };
    }
    return {
      rakutenAppId: '',
      amazonAccessKey: '',
      amazonSecretKey: '',
      dmmAffiliateId: '',
      dmmApiId: '',
      googleSheetUrl: '',
    };
  } catch (error: any) {
    return thunkApi.rejectWithValue(error.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    initialize: (state) => {
      state.loading = false;
      state.error = null;
      state.task = null;
      state.user = initialState.user;
    },
    resetTask: (state) => {
      state.task = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(signIn.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signIn.fulfilled, (state, action) => {
      const user = action.payload;
      state.loading = false;
      state.user = {
        uid: user.uid,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        photoURL: user.photoURL,
        avatarUrl: user.avatarUrl,
        backgroundImageUrl: user.backgroundImageUrl,
        chatGptApiKey: user.chatGptApiKey,
        geminiApiKey: user.geminiApiKey,
        anthropicApiKey: user.anthropicApiKey,
        rakutenAppId: user.rakutenAppId,
        amazonAccessKey: user.amazonAccessKey,
        amazonSecretKey: user.amazonSecretKey,
        dmmAffiliateId: user.dmmAffiliateId,
        dmmApiId: user.dmmApiId,
      };
    });
    builder.addCase(signIn.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload === undefined ? 'An error occurred' : action.payload;
    });
    builder.addCase(getUserProfile.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getUserProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.user = {
        ...state.user,
        role: action.payload.role,
        avatarUrl: action.payload.avatarUrl,
        backgroundImageUrl: action.payload.backgroundImageUrl,
      };
    });
    builder.addCase(getUserProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload === undefined ? 'An error occurred' : (action.payload as string);
    });
    builder.addCase(getProfileImages.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProfileImages.fulfilled, (state, action) => {
      if (state.user) {
        state.loading = false;
        state.user.avatarUrl = action.payload.avatarUrl;
        state.user.backgroundImageUrl = action.payload.backgroundImageUrl;
      }
    });
    builder.addCase(getProfileImages.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(setProfile.pending, (state) => {
      state.loading = true;
      state.task = null;
    });
    builder.addCase(setProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.user = {
        ...state.user,
        displayName: action.payload.displayName,
        role: action.payload.role,
        avatarUrl: action.payload.avatarUrl,
        backgroundImageUrl: action.payload.backgroundImageUrl,
      };
      state.task = 'update_profile';
    });
    builder.addCase(setProfile.rejected, (state, action) => {
      state.loading = false;
      state.task = 'error_profile';
      state.error = action.payload === undefined ? 'An error occurred' : (action.payload as string);
    });
    builder.addCase(updateUserPassword.pending, (state) => {
      state.loading = true;
      state.task = null;
    });
    builder.addCase(updateUserPassword.fulfilled, (state) => {
      state.loading = false;
      state.task = 'update_password';
    });
    builder.addCase(updateUserPassword.rejected, (state, action) => {
      state.loading = false;
      state.task = 'error_password';
      state.error = action.payload === undefined ? 'An error occurred' : (action.payload as string);
    });
    builder.addCase(signOut.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(signOut.fulfilled, (state) => {
      state.loading = false;
      state.user = {
        uid: null,
        email: null,
        displayName: null,
        role: null,
        photoURL: null,
        avatarUrl: null,
        backgroundImageUrl: null,
      };
      state.task = null;
      state.error = null;
    });
    builder.addCase(signOut.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload === undefined ? 'An error occurred' : (action.payload as string);
    });
    builder.addCase(saveApiKeys.pending, (state) => {
      state.loading = true;
      state.task = 'save_api_keys';
    });
    builder.addCase(saveApiKeys.fulfilled, (state, action) => {
      state.loading = false;
      state.task;
      state.user = {
        ...state.user,
        chatGptApiKey: action.payload.chatGptApiKey,
        geminiApiKey: action.payload.geminiApiKey,
        anthropicApiKey: action.payload.anthropicApiKey,
      };
    });
    builder.addCase(saveApiKeys.rejected, (state, action) => {
      state.loading = false;
      state.task = 'error_api_keys';
      state.error = action.payload === undefined ? 'An error occurred' : (action.payload as string);
    });
    builder.addCase(sendResetPasswordEmail.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(sendResetPasswordEmail.fulfilled, (state) => {
      state.loading = false;
      state.task = 'send_reset_password_email';
    });
    builder.addCase(sendResetPasswordEmail.rejected, (state, action) => {
      state.loading = false;
      state.task = 'error_reset_password_email';
      state.error = action.payload === undefined ? 'An error occurred' : (action.payload as string);
    });
    builder.addCase(affiliateKeySave.pending, (state) => {
      state.loading = true;
      state.task = 'save_affiliate_keys_loading';
    });
    builder.addCase(affiliateKeySave.fulfilled, (state, action) => {
      state.loading = false;
      state.task = 'save_affiliate_keys';
      state.user = {
        ...state.user,
        rakutenAppId: action.payload.rakutenAppId,
        amazonAccessKey: action.payload.amazonAccessKey,
        amazonSecretKey: action.payload.amazonSecretKey,
        dmmAffiliateId: action.payload.dmmAffiliateId,
        dmmApiId: action.payload.dmmApiId,
      };
    });
    builder.addCase(affiliateKeySave.rejected, (state, action) => {
      state.loading = false;
      state.task = 'error_affiliate_keys';
      state.error = action.payload === undefined ? 'An error occurred' : (action.payload as string);
    });
  },
});

export const sendResetPasswordEmail = createAsyncThunk<
  void,
  { email: string },
  { rejectValue: string }
>('auth/sendPasswordResetEmail', async (args, thunkApi) => {
  try {
    const auth = getAuth();
    await sendPasswordResetEmail(auth, args.email);
  } catch (error: any) {
    return thunkApi.rejectWithValue(error.message);
  }
});

export const getUserProfile = createAsyncThunk<
  { role: string; avatarUrl: string; backgroundImageUrl: string },
  void,
  { state: RootState }
>('auth/getUserProfile', async (_, thunkApi) => {
  const user = thunkApi.getState().auth.user;
  if (!user) {
    throw new Error('User is not authenticated');
  }
  try {
    const userRef = dbRef(database, `user-data/${user.uid}/profile`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      if (!snapshot.val()) {
        return {
          role: '',
          avatarUrl: defaultAvatarUrl,
          backgroundImageUrl: defaultBackgroundImageUrl,
        };
      }
    }
    const data = snapshot.val();
    return {
      role: data.role ?? '',
      avatarUrl: data.avatarUl ?? defaultAvatarUrl,
      backgroundImageUrl: data.backgroundImageUrl ?? defaultBackgroundImageUrl,
    };
  } catch (error: any) {
    return thunkApi.rejectWithValue(error.message);
  }
});

const uploadImage = async (file: File, uid: string, useCase: string) => {
  const fileName = useCase === 'avatar' ? 'avatar' : 'background';
  const ext = getFileExtension(file);
  if (ext === '') {
    throw new Error('Invalid file extension');
  }
  const fileRef = ref(storage, `user-data/${uid}/images/${fileName}.${ext}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};

export const getProfileImages = createAsyncThunk<
  { avatarUrl: string; backgroundImageUrl: string },
  void,
  { state: RootState }
>('auth/getProfileImages', async (_, thunkApi) => {
  const user = thunkApi.getState().auth.user;
  // Ensure user is not null before accessing its properties
  if (!user) {
    // Handle the case where user is null, e.g., by throwing an error or returning default values
    return {
      avatarUrl: defaultAvatarUrl,
      backgroundImageUrl: defaultBackgroundImageUrl,
    };
  }
  const { uid } = user; // Now safe to destructure uid
  const avatarFileRef = ref(storage, `user-data/${uid}/images/avatar.jpg`);
  const backgroundImageFileRef = ref(storage, `user-data/${uid}/images/background.jpg`);
  try {
    const avatarUrl = await getDownloadURL(avatarFileRef);
    const backgroundImageUrl = await getDownloadURL(backgroundImageFileRef);
    return { avatarUrl, backgroundImageUrl };
  } catch (error) {
    return {
      avatarUrl: defaultAvatarUrl,
      backgroundImageUrl: defaultBackgroundImageUrl,
    };
  }
});

export const setProfile = createAsyncThunk<
  {
    displayName: string;
    role: string;
    avatarUrl: string;
    backgroundImageUrl: string;
  },
  {
    displayName: string;
    role: string;
    avatar: File | null;
    backgroundImage: File | null;
  },
  { state: RootState }
>('auth/setProfile', async (args, thunkApi) => {
  try {
    const appUser = thunkApi.getState().auth.user;
    if (appUser !== null && appUser.uid !== null) {
      // upload avatar image and get download url
      let avatarUrl = appUser.avatarUrl ?? defaultAvatarUrl;
      if (args.avatar) {
        avatarUrl = await uploadImage(args.avatar, appUser.uid, 'avatar');
      }
      // upload background image and get download url
      let backgroundImageUrl = appUser.backgroundImageUrl ?? defaultBackgroundImageUrl;
      if (args.backgroundImage) {
        backgroundImageUrl = await uploadImage(args.backgroundImage, appUser.uid, 'background');
      }
      // update user profile in database
      const userRef = dbRef(database, `user-data/${appUser.uid}/profile`);
      await set(userRef, {
        role: args.role,
        avatarUrl,
        backgroundImageUrl,
      });
      if (auth.currentUser) {
        updateProfile(auth.currentUser, {
          displayName: args.displayName,
          photoURL: avatarUrl,
        });
      }
      return {
        displayName: args.displayName,
        role: args.role,
        avatarUrl,
        backgroundImageUrl,
      };
    }
    throw new Error('User is not authenticated');
  } catch (error: any) {
    return thunkApi.rejectWithValue(error.message);
  }
});

export const updateUserPassword = createAsyncThunk<
  void,
  { newPassword: string },
  { state: RootState }
>('auth/updatePassword', async (args, thunkApi) => {
  try {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, args.newPassword);
      return;
    }
    throw new Error('User is not authenticated');
  } catch (error: any) {
    return thunkApi.rejectWithValue(error.message);
  }
});

export const signOut = createAsyncThunk<void, void, { state: RootState }>(
  'auth/signOut',
  async (_, thunkApi) => {
    try {
      await auth.signOut();
    } catch (error: any) {
      return thunkApi.rejectWithValue(error.message);
    }
  }
);

export const saveApiKeys = createAsyncThunk<
  { chatGptApiKey: string; geminiApiKey: string; anthropicApiKey: string; googleSheetUrl: string },
  { chatGptApiKey: string; geminiApiKey: string; anthropicApiKey: string; googleSheetUrl: string },
  { state: RootState }
>('auth/saveApiKeys', async (args, thunkApi) => {
  try {
    const appUser = thunkApi.getState().auth.user;
    if (appUser !== null && appUser.uid !== null) {
      const settingsRef = dbRef(database, `user-data/${appUser.uid}/settings`);
      await set(settingsRef, {
        chatGptApiKey: args.chatGptApiKey,
        geminiApiKey: args.geminiApiKey,
        anthropicApiKey: args.anthropicApiKey,
        googleSheetUrl: args.googleSheetUrl,
      });
      return {
        chatGptApiKey: args.chatGptApiKey,
        geminiApiKey: args.geminiApiKey,
        anthropicApiKey: args.anthropicApiKey,
        googleSheetUrl: args.googleSheetUrl,
      };
    }
    return { chatGptApiKey: '', geminiApiKey: '', anthropicApiKey: '', googleSheetUrl: '' };
  } catch (error: any) {
    return thunkApi.rejectWithValue(error.message);
  }
});

export const selectAuth = (state: RootState) => state.auth;

export const { initialize, resetTask } = authSlice.actions;

export default authSlice.reducer;
