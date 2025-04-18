// src/store/reducers/auth/authThunks.ts
import test from 'node:test';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAdditionalUserInfo,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  Unsubscribe,
  updatePassword,
} from 'firebase/auth';
import { ref as dbRef, get, getDatabase } from 'firebase/database';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router';
import { auth, database, db } from '@/firebase';
import { UserFirestoreData } from '@/types/auth';
import { translateFirebaseAuthError } from '@/utils/firebaseUtils';
import type { AppDispatch, RootState } from '../../index';
import { setUser } from './authSlice';
import { DEFAULT_AVATAR_URL, DEFAULT_BACKGROUND_IMAGE_URL, SLICE_NAME } from './constants';
import { AppUser, SetUserPayload } from './types';

/**
 * メールとパスワードでサインイン
 */
export const signIn = createAsyncThunk<
  AppUser,
  { email: string; password: string },
  { rejectValue: string }
>(`${SLICE_NAME}/signIn`, async (args, thunkApi) => {
  const appMode = import.meta.env.VITE_APP_MODE;
  const isPreview = appMode === 'preview';
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
      await setDoc(
        userDocRef,
        {
          termsAccepted: false,
          createdAt: serverTimestamp(),
          email: user.email,
          displayName: user.displayName,
          applyMailchimpTag: isPreview ? ['torai-preview-pending'] : ['trai-pending'],
        },
        { merge: true }
      );
      termsAccepted = false;
    }

    // RTDBからProfile,Settingsを取得
    const profileRef = dbRef(database, `user-data/${user.uid}/profile`);
    const settingsRef = dbRef(database, `user-data/${user.uid}/settings`);

    const [profileSnapshot, settingsSnapshot] = await Promise.all([
      get(profileRef),
      get(settingsRef),
    ]);

    const profileData = profileSnapshot.exists() ? profileSnapshot.val() : {};
    const settingsData = settingsSnapshot.exists() ? settingsSnapshot.val() : {};

    // RTDB profileがなければデフォルト値を設定
    if (!profileSnapshot.exists()) {
      console.log(`RTDB profile for user ${user.uid} not found. Creating with default values`);
      // プロファイルのデフォルト値は別のファンクションで設定する予定
    }

    const appUser: AppUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL, // Authの情報を優先
      role: profileData.role ?? '',
      avatarUrl: profileData.avatarUrl ?? DEFAULT_AVATAR_URL,
      backgroundImageUrl: profileData.backgroundImageUrl ?? DEFAULT_BACKGROUND_IMAGE_URL,
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
  } catch (error: any) {
    console.log('Sign in error:', error);
    const errorMessage = translateFirebaseAuthError(error);
    return thunkApi.rejectWithValue(errorMessage);
  }
});

/**
 * Googleでサインイン
 */
export const signInWithGoogle = createAsyncThunk<AppUser, void, { rejectValue: string }>(
  `${SLICE_NAME}/signInWithGoogle`,
  async (_, thunkApi) => {
    const appMode = import.meta.env.VITE_APP_MODE;
    const isPreview = appMode === 'preview';
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
        console.log('signInWithGoogle: isPreview', isPreview);
        const testArray = ['pending'];
        await setDoc(
          userDocRef,
          {
            termsAccepted: false, // 新規ユーザーは未同意
            createdAt: serverTimestamp(),
            email: user.email, // 任意: Auth情報をFirestoreにも保存
            displayName: user.displayName, // 任意
            applyMailchimpTag: isPreview ? ['torai-preview-pending'] : ['trai-pending'], // 任意: Mailchimpタグ
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
          avatarUrl: user.photoURL ?? DEFAULT_AVATAR_URL, // Googleの画像を初期値に
          backgroundImageUrl: DEFAULT_BACKGROUND_IMAGE_URL,
        };
        // プロファイルの設定は別のファンクションで実行する予定
      }

      // AppUserオブジェクトを作成して返す
      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL, // GoogleログインなのでAuthのPhotoURLを使う
        role: profileData.role ?? '',
        avatarUrl: profileData.avatarUrl ?? user.photoURL ?? DEFAULT_AVATAR_URL, // RTDB -> Auth -> Default の順でフォールバック
        backgroundImageUrl: profileData.backgroundImageUrl ?? DEFAULT_BACKGROUND_IMAGE_URL,
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

/**
 * パスワードリセットメールの送信
 */
export const sendResetPasswordEmail = createAsyncThunk<
  void,
  { email: string },
  { rejectValue: string }
>(`${SLICE_NAME}/sendResetPasswordEmail`, async (args, thunkApi) => {
  try {
    await sendPasswordResetEmail(auth, args.email);
  } catch (error: any) {
    return thunkApi.rejectWithValue(error.message);
  }
});

/**
 * ユーザーパスワードの更新
 */
export const updateUserPassword = createAsyncThunk<
  void,
  { newPassword: string },
  { state: RootState }
>(`${SLICE_NAME}/updatePassword`, async (args, thunkApi) => {
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

/**
 * サインアウト
 */
export const signOut = createAsyncThunk<void, void, { state: RootState }>(
  `${SLICE_NAME}/signOut`,
  async (_, thunkApi) => {
    try {
      await auth.signOut();
    } catch (error: any) {
      return thunkApi.rejectWithValue(error.message);
    }
  }
);

/**
 * 認証状態の監視
 * Redux環境外からも使えるよう、関数を返すパターンに変更
 */
export const listenAuthState = () => {
  return (dispatch: AppDispatch): Unsubscribe => {
    console.log('Starting auth state listener...');
    dispatch({ type: `${SLICE_NAME}/setLoading`, payload: true }); // 初期読み込み開始

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
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
          let termsAccepted: boolean = false; // デフォルトを false に

          if (userDocSnap.exists()) {
            userData = userDocSnap.data() as UserFirestoreData;
            // termsAccepted が boolean 型ならその値、そうでなければ false
            termsAccepted =
              typeof userData.termsAccepted === 'boolean' ? userData.termsAccepted : false;

            // termsAccepted が boolean でなかった場合のみ Firestore を更新
            if (typeof userData.termsAccepted !== 'boolean') {
              console.warn(
                `[listenAuthState] User ${user.uid} Firestore data lacks a valid termsAccepted field. Updating to false.`
              );
              // updateDoc を使用して termsAccepted のみ更新
              await updateDoc(userDocRef, { termsAccepted: false });
              // userData オブジェクトも更新しておく (任意)
              if (userData) {
                userData.termsAccepted = false;
              }
            }
          } else {
            // ★ ドキュメントが存在しない場合、listenAuthState では作成しない
            // ドキュメント作成は signInWithGoogle や他の登録処理に任せる
            console.warn(
              `[listenAuthState] User ${user.uid} Firestore document not found. Assuming termsAccepted: false. Document should be created on sign-in/sign-up.`
            );
            // userData は null のまま or 必要なら初期オブジェクトを設定
            userData = null; // または { termsAccepted: false, /* 他のデフォルト */ }
            termsAccepted = false; // Redux には false として伝える
          }

          const profileData = profileSnapshot.exists() ? profileSnapshot.val() : null;
          const settingsData = settingsSnapshot.exists() ? settingsSnapshot.val() : null;

          // storeにユーザーデータを保存
          const payload: SetUserPayload = {
            user,
            // userData が null の可能性を考慮するか、初期オブジェクトを使う
            userData: userData ? { ...userData, termsAccepted } : { termsAccepted },
            profileData,
            settingsData,
          };
          dispatch(setUser(payload));
        } catch (error: any) {
          console.error('[listenAuthState] Error fetching user data:', error);
          // エラーが発生しても基本的なAuth情報はセットする (ユーザーは認証されているため)
          dispatch(setUser({ user, userData: null, profileData: null, settingsData: null }));
          dispatch({ type: `${SLICE_NAME}/setError`, payload: 'Failed to load user data.' }); // エラー状態をセット
        } finally {
          dispatch({ type: `${SLICE_NAME}/setLoading`, payload: false }); // データ取得試行完了
        }
      } else {
        // 認証ユーザーがいない場合、初期状態に戻す
        dispatch(setUser({ user: null }));
        dispatch({ type: `${SLICE_NAME}/setLoading`, payload: false }); // 認証状態の変更を通知
      }
    });

    // リスナーのクリーンアップ関数を返す
    return unsubscribe;
  };
};
