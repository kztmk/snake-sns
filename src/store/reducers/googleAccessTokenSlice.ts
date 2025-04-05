import { RootState } from '..'; // あなたのRootStateをインポート
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAuth, GoogleAuthProvider, linkWithPopup, OAuthCredential } from 'firebase/auth';

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

interface LinkTokenResult {
  accessToken: string;
}

export const linkAndGetGoogleToken = createAsyncThunk<
  LinkTokenResult, // ★ 成功時の型を変更 (accessTokenを含むオブジェクト)
  void,
  { rejectValue: string; state: RootState }
>(
  'googleAccessToken/linkAndGetGoogleToken', // アクション名の修正を推奨
  async (_, { getState, rejectWithValue }) => {
    // ★ thunkApiを展開
    const state = getState();
    const user = state.auth.user; // Firebase Authのユーザー情報を取得

    if (!user) {
      return rejectWithValue('ユーザーが認証されていません。');
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        // 通常は state.auth.user があれば currentUser も存在するはずだが念のため
        return rejectWithValue('Firebase Authentication の currentUser が見つかりません。');
      }
      console.log('Attempting to link/re-authenticate with Google...');
      const result = await linkWithPopup(auth.currentUser, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        // ★ accessToken の存在をチェック
        console.error('Credential or Access Token not found after linkWithPopup.');
        return rejectWithValue('Google アクセストークンが取得できませんでした。');
      }

      console.log('Google Access Token obtained successfully.');
      // ★ accessToken を含むオブジェクトを返す ★
      return {
        accessToken: credential.accessToken,
        // 有効期限は credential から直接取得できないため、ここでは返さない
        // (もし必要なら、IDトークンをデコードするか、別途APIで確認する必要がある)
      };
    } catch (error: any) {
      console.error('Google Link/Auth Error:', error);
      // 特定のエラーコードに基づいてメッセージを調整することも可能
      // if (error.code === 'auth/credential-already-in-use') { ... }
      return rejectWithValue(`Googleアカウント連携/認証エラー: ${error.message || '不明なエラー'}`);
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
        state.error = action.payload ?? '不明なエラーが発生しました';
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
