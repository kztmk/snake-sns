import { RootState } from '..'; // あなたのRootStateをインポート
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  OAuthCredential,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth';

// Stateの型を修正: accessTokenを文字列で保持
export interface GoogleAccessTokenState {
  googleAccessToken: string | null;
  isAuthLoading: boolean;
  error: string | null;
}

const initialState: GoogleAccessTokenState = {
  googleAccessToken: null,
  isAuthLoading: false,
  error: null,
};

// 成功時の型定義 (必要に応じて調整)
interface LinkTokenResult {
  accessToken: string;
}

// エラー時の型定義 (より詳細にする場合)
interface LinkTokenError {
  message: string;
  code?: string; // エラーコードを含めると便利
}

export const linkAndGetGoogleToken = createAsyncThunk<
  LinkTokenResult,
  void,
  { rejectValue: LinkTokenError; state: RootState } // rejectValue の型を更新
>(
  'googleAccessToken/linkAndGetToken', // アクション名を変更
  async (_, { getState, rejectWithValue }) => {
    // thunkApi を展開
    const state = getState();
    // state.auth.user からではなく、直接 auth.currentUser を使うのが確実
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      // この Thunk が呼ばれる時点で currentUser が null なのは通常考えにくいが、ガードは残す
      return rejectWithValue({ message: 'ユーザーがログインしていません。' });
    }

    const provider = new GoogleAuthProvider();
    // ★★★ Drive スコープは必須 ★★★
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive.readonly');
    // 必要に応じて他のスコープも追加できます
    // provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    // provider.addScope('https://www.googleapis.com/auth/userinfo.email');

    try {
      // 1. ユーザーが既に Google とリンク済みか確認
      const isLinked = currentUser.providerData.some(
        (pd) => pd.providerId === GoogleAuthProvider.PROVIDER_ID
      );

      let credentialResult: UserCredential | null = null;

      if (isLinked) {
        console.log(
          'Google is already linked. Re-authenticating via signInWithPopup to get fresh token...'
        );
        // 2a. ★ リンク済みの場合: signInWithPopup で再認証し、新しいトークンを取得 ★
        // 注意: signInWithPopup は auth オブジェクトに対して呼び出す
        credentialResult = await signInWithPopup(auth, provider);
        // signInWithPopup は既存のユーザーを再認証するだけで、リンク済みの状態は変わらない
      } else {
        console.log('Google is not linked. Linking via linkWithPopup...');
        // 2b. ★ 未リンクの場合: linkWithPopup で現在のユーザーにリンク ★
        // 注意: linkWithPopup は currentUser オブジェクトに対して呼び出す
        credentialResult = await linkWithPopup(currentUser, provider);
      }

      // 3. 成功した場合、アクセストークンを取得
      if (credentialResult) {
        // credentialFromResult はどちらのメソッドの結果にも使える
        const credential = GoogleAuthProvider.credentialFromResult(credentialResult);
        if (credential?.accessToken) {
          const accessToken = credential.accessToken;
          console.log('Successfully obtained/refreshed Google Access Token.');
          return { accessToken }; // 成功: トークンを返す
        }
      }

      // ここに来る場合は、認証は成功したがトークンが取得できなかったケース (通常は稀)
      console.error('Authentication successful, but failed to get access token from credential.');
      return rejectWithValue({ message: 'アクセストークンを取得できませんでした。' });
    } catch (error: any) {
      console.error('Google Link/Auth Error in Thunk:', error);

      // 4. エラーハンドリング
      let errorMessage = `Google連携/認証エラー: ${error.message || error.code || '不明なエラー'}`;
      if (error.code === 'auth/credential-already-in-use') {
        // isLinked=false の場合にこのエラーが出たら、本当に他のアカウントに紐づいている
        // isLinked=true の場合に signInWithPopup でこのエラーが出たら少し異常だが、
        // メッセージは「選択したGoogleアカウントが別のFirebaseアカウントに紐づいている」ことを示す
        errorMessage = 'この Google アカウントは別のアカウントで使用されています。';
      } else if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        errorMessage = 'Google 認証ポップアップが閉じられました。';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        // 1メール1アカウント設定が有効で、Googleのメアドが既存の別プロバイダのメアドと一致した場合など
        errorMessage = '同じメールアドレスを持つアカウントが別の方法で既に存在します。';
      }
      // 他にも Firebase Authentication のエラーコードに応じて詳細化可能

      return rejectWithValue({ message: errorMessage, code: error.code });
    }
  }
);

// --- Slice の修正 ---
const googleAccessTokenSlice = createSlice({
  name: 'googleAccessToken', // Slice名を修正
  initialState,
  reducers: {
    // ★ 明示的にトークンをクリアするReducerを追加 (任意) ★
    clearGoogleAccessToken: (state) => {
      state.googleAccessToken = null;
      // state.googleAccessTokenExpiry = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(linkAndGetGoogleToken.pending, (state) => {
        state.isAuthLoading = true;
        state.error = null; // 開始時にエラーをクリア
      })
      .addCase(linkAndGetGoogleToken.fulfilled, (state, action: PayloadAction<LinkTokenResult>) => {
        state.isAuthLoading = false;
        state.googleAccessToken = action.payload.accessToken; // ★ accessToken を保存
        state.error = null;
        // オプション: 有効期限を設定 (固定値で設定する例 - 実際はより正確な値が必要)
        // const buffer = 60 * 1000;
        // state.googleAccessTokenExpiry = Date.now() + (3600 * 1000) - buffer; // 約1時間後 - バッファ
      })
      .addCase(linkAndGetGoogleToken.rejected, (state, action) => {
        state.isAuthLoading = false;
        state.googleAccessToken = null; // ★ エラー時はクリア
        // state.googleAccessTokenExpiry = null;
        state.error = action.payload?.message ?? '不明なエラーが発生しました';
      });
  },
});

// --- エクスポート ---
// 他のスライスと区別するため、アクション名を変更推奨
export const { clearGoogleAccessToken } = googleAccessTokenSlice.actions; // clear アクションを追加

// Async Thunk をそのままエクスポート
// (別ファイルで定義している場合はそちらからインポート)
// export { linkAndGetGoogleToken };

export default googleAccessTokenSlice.reducer;
