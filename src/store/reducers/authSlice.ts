import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getAdditionalUserInfo,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  Unsubscribe,
  updatePassword,
  updateProfile,
  User,
} from 'firebase/auth';
import { ref as dbRef, get, getDatabase, set as setRTDB } from 'firebase/database';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, database, db, firebaseApp, storage } from '@/firebase';
import { UserFirestoreData } from '@/types/auth';
import { translateFirebaseAuthError } from '@/utils/firebaseUtils';
import type { AppDispatch, RootState } from '../index';

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
  termsAccepted: boolean | null;
  isNewUser?: boolean;
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
    avatarUrl: defaultAvatarUrl,
    backgroundImageUrl: defaultBackgroundImageUrl,
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

// -- Async Thunks --

export const signIn = createAsyncThunk<
  AppUser,
  { email: string; password: string },
  { rejectValue: string }
>('auth/signIn', async (args, thunkApi) => {
  try {
    const response = await signInWithEmailAndPassword(auth, args.email, args.password);
    const user = response.user;
    if (!user) {
      return thunkApi.rejectWithValue('User not found');
    }
    // Firestoreから規約同意状態を取得
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    let termsAccepted = false;
    let firestoreDataExists = false;

    if (userDocSnap.exists()) {
      firestoreDataExists = true;
      const data = userDocSnap.data() as UserFirestoreData;
      // termsAcceptedがboolean型ならその値、そうでない場合はfalseを代入
      termsAccepted = typeof data.termsAccepted === 'boolean' ? data.termsAccepted : false;
    } else {
      // Firestoreにdataがない場合、作成（メールユーザーも規約同意が必要)
      console.log(
        `Firestore document for user ${user.uid} not found. Creating with termsAccepted: false`
      );
      await setDoc(userDocRef, { termsAccepted: false, createdAt: serverTimestamp() });
      termsAccepted = false;
    }

    // RTDBからProfile,Settingsを取得
    const profileRef = dbRef(database, `user-data/${user.uid}/profile`);
    const settingsRef = dbRef(database, `user-data/${user.uid}/settings`);

    const [profileSnapshot, settingsSnapshot] = await Promise.all([
      get(profileRef),
      get(settingsRef),
    ]);

    const profileData = profileSnapshot.exists() ? profileSnapshot.val() : null;
    const settingsData = settingsSnapshot.exists() ? settingsSnapshot.val() : null;

    // RTDB profileがなければデフォルト値を設定
    if (!profileSnapshot.exists()) {
      console.log(`RTDB profile for user ${user.uid} not found. Creating with default values`);
      await setRTDB(profileRef, {
        role: '',
        avatarUrl: defaultAvatarUrl,
        backgroundImageUrl: defaultBackgroundImageUrl,
      });
      profileData.role = '';
      profileData.avatarUrl = defaultAvatarUrl;
      profileData.backgroundImageUrl = defaultBackgroundImageUrl;
    }

    const appUser: AppUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL, // Authの情報を優先
      role: profileData.role ?? '',
      avatarUrl: profileData.avatarUrl ?? defaultAvatarUrl,
      backgroundImageUrl: profileData.backgroundImageUrl ?? defaultBackgroundImageUrl,
      chatGptApiKey: settingsData.chatGptApiKey ?? '',
      geminiApiKey: settingsData.geminiApiKey ?? '',
      anthropicApiKey: settingsData.anthropicApiKey ?? '',
      rakutenAppId: settingsData.rakutenAppId ?? '',
      amazonAccessKey: settingsData.amazonAccessKey ?? '',
      amazonSecretKey: settingsData.amazonSecretKey ?? '',
      dmmAffiliateId: settingsData.dmmAffiliateId ?? '',
      dmmApiId: settingsData.dmmApiId ?? '',
      googleSheetUrl: settingsData.googleSheetUrl ?? '',
      termsAccepted: termsAccepted, // Firestoreから取得した値
    };
    console.log(`Sign in successful for user ${user.uid}, Terms Accepted: ${termsAccepted}`);
    return appUser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log('Sign in error:', error);
    const errorMessage = translateFirebaseAuthError(error);
    return thunkApi.rejectWithValue(errorMessage);
  }
});

// signInWithGoogle
export const signInWithGoogle = createAsyncThunk<AppUser, void, { rejectValue: string }>(
  'auth/signInWithGoogle',
  async (_, thunkApi) => {
    const googleProvider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser ?? false;
      console.log(`Google sign in: ${user.uid}, New user: ${isNewUser}`);

      // Firestoreのユーザードキュメント参照 & 規約状態確認/設定
      const userDocRef = doc(db, 'users', user.uid);
      let termsAccepted: boolean = false;
      let firestoreDataExists = false;

      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        firestoreDataExists = true;
        const data = userDocSnap.data() as UserFirestoreData;
        termsAccepted = typeof data.termsAccepted === 'boolean' ? data.termsAccepted : false;
      }

      if (isNewUser || !firestoreDataExists) {
        // 新規ユーザー or Firestoreにドキュメントがない場合、作成/上書き
        console.log(
          `New Google user or Firestore doc missing for ${user.uid}. Setting termsAccepted: false.`
        );
        await setDoc(
          userDocRef,
          {
            termsAccepted: false, // 新規ユーザーは未同意
            createdAt: serverTimestamp(),
            email: user.email, // 任意: Auth情報をFirestoreにも保存
            displayName: user.displayName, // 任意
          },
          { merge: true }
        ); // merge:true で既存フィールドを保持しつつ上書き/作成
        termsAccepted = false;
      } else if (typeof (userDocSnap.data() as UserFirestoreData)?.termsAccepted !== 'boolean') {
        // FirestoreにドキュメントはあるがtermsAcceptedがない/型が違う場合、更新
        console.log(
          `Firestore doc for ${user.uid} missing/invalid termsAccepted. Setting to false.`
        );
        await updateDoc(userDocRef, { termsAccepted: false });
        termsAccepted = false;
      }

      // RTDBからProfileとSettingsを取得 & 新規ユーザーなら作成
      const profileRef = dbRef(database, `user-data/${user.uid}/profile`);
      const settingsRef = dbRef(database, `user-data/${user.uid}/settings`);

      const [profileSnapshot, settingsSnapshot] = await Promise.all([
        get(profileRef),
        get(settingsRef),
      ]);

      let profileData = profileSnapshot.exists() ? profileSnapshot.val() : {};
      const settingsData = settingsSnapshot.exists() ? settingsSnapshot.val() : {};

      // 新規Googleユーザーの場合、RTDB Profile も作成
      if (isNewUser || !profileSnapshot.exists()) {
        console.log(
          `New Google user or RTDB profile missing for ${user.uid}. Creating RTDB profile.`
        );
        profileData = {
          // profileDataオブジェクトを更新
          role: '', // デフォルトロール
          avatarUrl: user.photoURL ?? defaultAvatarUrl, // Googleの画像を初期値に
          backgroundImageUrl: defaultBackgroundImageUrl,
        };
        await setRTDB(profileRef, profileData);
      }
      // 新規Googleユーザーの場合、RTDB Settings も空で作成 (任意、APIキー保存時に作成されるのを待っても良い)
      if (isNewUser || !settingsSnapshot.exists()) {
        console.log(
          `New Google user or RTDB settings missing for ${user.uid}. Creating empty RTDB settings.`
        );
        await setRTDB(settingsRef, {}); // 空のオブジェクトで作成
      }

      // AppUserオブジェクトを作成して返す
      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL, // GoogleログインなのでAuthのPhotoURLを使う
        role: profileData.role ?? '',
        avatarUrl: profileData.avatarUrl ?? user.photoURL ?? defaultAvatarUrl, // RTDB -> Auth -> Default の順でフォールバック
        backgroundImageUrl: profileData.backgroundImageUrl ?? defaultBackgroundImageUrl,
        chatGptApiKey: settingsData.chatGptApiKey ?? '',
        geminiApiKey: settingsData.geminiApiKey ?? '',
        anthropicApiKey: settingsData.anthropicApiKey ?? '',
        rakutenAppId: settingsData.rakutenAppId ?? '',
        amazonAccessKey: settingsData.amazonAccessKey ?? '',
        amazonSecretKey: settingsData.amazonSecretKey ?? '',
        dmmAffiliateId: settingsData.dmmAffiliateId ?? '',
        dmmApiId: settingsData.dmmApiId ?? '',
        googleSheetUrl: settingsData.googleSheetUrl ?? '',
        termsAccepted: termsAccepted, // Firestoreから取得/設定した値
        isNewUser: isNewUser, // 新規ユーザーかどうかのフラグ
      };

      console.log(
        `Google Sign in successful for ${user.uid}, Terms Accepted: ${termsAccepted}, New User: ${isNewUser}`
      );
      return appUser;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      const errorMessage = translateFirebaseAuthError(error);
      return thunkApi.rejectWithValue(errorMessage);
    }
  }
);

// acceptTerms - Firestoreの規約同意状態を更新
export const acceptTerms = createAsyncThunk<
  { termsAccepted: boolean }, // 成功時に返す型
  void, // 引数の型
  { state: RootState; rejectValue: string } // thunkApiの型
>('auth/acceptTerms', async (_, thunkApi) => {
  const uid = thunkApi.getState().auth.user?.uid;
  if (!uid) {
    console.error('Accept terms failed: User not authenticated.');
    return thunkApi.rejectWithValue('User not authenticated.');
  }
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      termsAccepted: true,
    });
    console.log(`Terms accepted for user ${uid}.`);
    return { termsAccepted: true };
  } catch (error: any) {
    console.error('Error accepting terms:', error);
    return thunkApi.rejectWithValue(error.message || 'Failed to accept terms.');
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
      await setRTDB(settingsRef, userSettings);
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

// --- Auth State Listener Thunk ---
export const listenAuthState =
  () =>
  (dispatch: AppDispatch): Unsubscribe => {
    console.log('Starting auth state listener...');
    dispatch(setLoading(true)); // 初期読み込み開始

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed. User:', user?.uid ?? 'null');
      if (user) {
        try {
          // 認証ユーザーがいる場合、FirestoreとRTDBからデータを並列取得
          const userDocRef = doc(db, 'users', user.uid);
          const profileRef = dbRef(database, `user-data/${user.uid}/profile`);
          const settingsRef = dbRef(database, `user-data/${user.uid}/settings`);

          const [userDocSnap, profileSnapshot, settingsSnapshot] = await Promise.all([
            getDoc(userDocRef),
            get(profileRef),
            get(settingsRef),
          ]);

          let userData: UserFirestoreData | null = null;
          let termsAccepted: boolean | null = null;

          if (userDocSnap.exists()) {
            userData = userDocSnap.data() as UserFirestoreData;
            termsAccepted =
              typeof userData.termsAccepted === 'boolean' ? userData.termsAccepted : null;

            // termsAcceptedがnullの場合、Firestoreにfalseで保存
            if (termsAccepted === null) {
              console.warn(
                `User ${user.uid} Firestore data lacks a valid termsAccepted field. Setting to false.`
              );
              await updateDoc(userDocRef, { termsAccepted: false });
              termsAccepted = false;
            }
          } else {
            // Firestoreにドキュメントがない場合、作成
            console.warn(
              `User ${user.uid} Firestore document not found. Creating with termsAccepted: false`
            );
            await setDoc(
              userDocRef,
              { termsAccepted: false, createdAt: serverTimestamp() },
              { merge: true }
            );
            termsAccepted = false;
            userData = { termsAccepted: false }; // 初期値を設定
          }

          const profileData = profileSnapshot.exists() ? profileSnapshot.val() : null;
          const settingsData = settingsSnapshot.exists() ? settingsSnapshot.val() : null;

          // storeにユーザーデータを保存
          dispatch(
            setUser({
              user,
              userData: { ...userData, termsAccepted },
              profileData,
              settingsData,
            })
          );
        } catch (error: any) {
          console.error('Error fetching user data during auth state change:', error);
          // エラーが発生しても基本的なAuth情報はセットする (ユーザーは認証されているため)
          dispatch(setUser({ user, userData: null, profileData: null, settingsData: null }));
          dispatch(setError('Failed to load user data.')); // エラー状態をセット
        } finally {
          dispatch(setLoading(false)); // データ取得試行完了
        }
      } else {
        // 認証ユーザーがいない場合、初期状態に戻す
        dispatch(setUser({ user: null }));
        dispatch(setLoading(false)); // 認証状態の変更を通知
      }
    });

    // リスナーのクリーンアップ関数を返す
    return unsubscribe;
  };

// setUserアクション用のペイロード型定義
interface SetUserPayload {
  user: User | null; // Firebase Auth User
  userData?: UserFirestoreData | null; // Firestore データ
  profileData?: any | null; // RTDB Profile データ
  settingsData?: any | null; // RTDB Settings データ
}

// --- Slie Difinition ---
const authSlice = createSlice({
  name: 'auth',
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
    // onAuthStateChangedやログイン成功時にユーザー上布夫を設定
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
            profileData?.avatarUrl ?? user.photoURL ?? state.user.avatarUrl ?? defaultAvatarUrl,
          backgroundImageUrl:
            profileData?.backgroundImageUrl ??
            state.user.backgroundImageUrl ??
            defaultBackgroundImageUrl,
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
      // setUser が呼ばれたら、基本的に loading は false にする (listenAuthState内で制御)
      // state.loading = false; // listenAuthState内で別途制御するため、ここでは不要かも
    },
  },
  extraReducers: (builder) => {
    // common pending
    const handlePending = (state: AppAuth) => {
      state.loading = true;
      state.error = null;
      state.task = state.task ? `${state.task}_pending` : 'pending';
    };
    // common error
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
      const user = action.payload;
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

    //
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

    builder.addCase(sendResetPasswordEmail.pending, (state) => {
      handlePending(state);
      state.task = 'send_reset_password';
    });
    builder.addCase(sendResetPasswordEmail.fulfilled, (state) => {
      state.loading = false;
      state.task = 'send_reset_password_success';
    });
    builder.addCase(sendResetPasswordEmail.rejected, handleRejected);

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

// sendResetPasswordEmail
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

// helper function to upload image
const uploadImage = async (file: File, uid: string, useCase: 'avatar' | 'background') => {
  const ext = getFileExtension(file);
  if (ext === '') {
    throw new Error('Invalid file extension');
  }
  const fileName = `${useCase}.${ext}`;
  const fileRef = storageRef(storage, `user-data/${uid}/images/${fileName}.${ext}`);
  console.log(`Uploading image to ${fileRef.fullPath}`);
  await uploadBytes(fileRef, file);
  const downloadUrl = await getDownloadURL(fileRef);
  console.log(`Image uploaded successfully. Download URL: ${downloadUrl}`);
  return downloadUrl;
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
  const avatarFileRef = storageRef(storage, `user-data/${uid}/images/avatar.jpg`);
  const backgroundImageFileRef = storageRef(storage, `user-data/${uid}/images/background.jpg`);
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

// setProfile
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
  const appUser = thunkApi.getState().auth.user;
  const currentUser = auth.currentUser;

  if (!appUser?.uid || !currentUser) {
    console.log('Set profile failed: User not authenticated.');
    return thunkApi.rejectWithValue('User is not authenticated');
  }
  const { uid } = appUser;

  try {
    let avatarUrl = appUser.avatarUrl ?? defaultAvatarUrl;
    let backgroundImageUrl = appUser.backgroundImageUrl ?? defaultBackgroundImageUrl;
    let updatedAuthProfileData: { displayName?: string; photoURL?: string } = {};

    // uploada avatar
    if (args.avatar) {
      console.log(`Uploading new avatar for user ${uid}`);
      avatarUrl = await uploadImage(args.avatar, uid, 'avatar');
      updatedAuthProfileData.photoURL = avatarUrl;
    }

    // upload background image
    if (args.backgroundImage) {
      console.log(`Uploading new background image for user ${uid}`);
      backgroundImageUrl = await uploadImage(args.backgroundImage, uid, 'background');
    }

    // update displayName
    if (args.displayName !== appUser.displayName) {
      console.log(`Updating display name for user ${uid} to "${args.displayName}"`);
      updatedAuthProfileData.displayName = args.displayName;
    }

    // RTDB profilt update
    const userRefRTDB = dbRef(database, `user-data/${uid}/profile`);
    const profileUpdateRTDB = {
      role: args.role,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
    console.log(`Updating RTDB profile for user ${uid}`, profileUpdateRTDB);
    await setRTDB(userRefRTDB, profileUpdateRTDB);

    return {
      displayName: args.displayName,
      role: args.role,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
    };
  } catch (error: any) {
    console.log('Error updating profile:', error);
    return thunkApi.rejectWithValue(error.message || 'Failed to update profile');
  }
});

// updateUserPassword
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

// signOut
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

// saveApiKeys
export const saveApiKeys = createAsyncThunk<
  { chatGptApiKey: string; geminiApiKey: string; anthropicApiKey: string; googleSheetUrl: string },
  { chatGptApiKey: string; geminiApiKey: string; anthropicApiKey: string; googleSheetUrl: string },
  { state: RootState }
>('auth/saveApiKeys', async (args, thunkApi) => {
  try {
    const appUser = thunkApi.getState().auth.user;
    if (appUser !== null && appUser.uid !== null) {
      const settingsRef = dbRef(database, `user-data/${appUser.uid}/settings`);
      await setRTDB(settingsRef, {
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
