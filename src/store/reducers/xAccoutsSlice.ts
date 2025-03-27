/**
 * firebase Realtime databaseに対してCRUDを行うためのslice
 * Xアカウント（旧Twitter API用アカウント）の管理機能
 */
import { get, getDatabase, push, ref, set } from 'firebase/database';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../index';

import type { XAccount, XAccountListFetchStatus } from '../../types/xAccounts';

/**
 * Xアカウントリストの初期値
 */
const initialXAccountList:XAccount[] = [];

/**
 * 単一Xアカウントの初期値
 */
const initialXAccount: XAccount = {
  id: '',
  name: '',
  apiKey: '',
  apiSecret: '',
  accessToken: '',
  accessTokenSecret: '',
  note: '',
};

/**
 * XAccountのステート初期値
 * process: 処理状態を表す文字列
 * isLoading: データ取得中かどうか
 * isError: エラーが発生したかどうか
 * errorMessage: エラーメッセージ
 */
const initialState: XAccountListFetchStatus = {
  xAccountList: initialXAccountList,
  xAccount: initialXAccount,
  process: 'idle',
  isLoading: false,
  isError: false,
  errorMessage: '',
};

/**
 * XAccountsのReduxスライス
 * Firebase Realtime DatabaseとのCRUD操作を管理
 */
const xAccountsSlice = createSlice({
  name: 'xAccounts',
  initialState,
  reducers: {
    // プロセス状態をリセットする同期アクション
    resetProcess: (state) => {
      state.process = 'idle';
    },
  },
  extraReducers: (builder) => {
    // データ取得処理のライフサイクル
    builder.addCase(fetchXAccounts.pending, (state) => {
      state.process = 'idle';
      state.isLoading = true;
      state.isError = false;
      state.errorMessage = '';
    });
    builder.addCase(fetchXAccounts.fulfilled, (state, action) => {
      state.xAccountList = action.payload;
      state.isLoading = false;
      state.process = 'fetch';
    });
    builder.addCase(fetchXAccounts.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.process = 'fetch';
      state.errorMessage =
        action.payload == undefined ? 'Failed to fetch xAccounts' : action.payload.message;
    });
    // create data
    builder.addCase(createXAccount.pending, (state) => {
      state.isLoading = true;
      state.isError = false;
      state.process = 'idle';
      state.errorMessage = '';
    });
    builder.addCase(createXAccount.fulfilled, (state, action) => {
      state.xAccount = action.payload;
      state.xAccountList.push(action.payload);
      state.isLoading = false;
      state.process = 'addNew';
    });
    builder.addCase(createXAccount.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.process = 'addNew';
      state.errorMessage =
        action.payload == undefined ? 'Failed to create xAccount' : action.payload.message;
    });
    // update data
    builder.addCase(updateXAccount.pending, (state) => {
      state.isLoading = true;
      state.isError = false;
      state.process = 'idle';
      state.errorMessage = '';
    });
    builder.addCase(updateXAccount.fulfilled, (state, action) => {
      state.xAccount = action.payload;
      const index = state.xAccountList.findIndex((xAccount) => xAccount.id === action.payload.id);
      state.xAccountList[index] = action.payload;
      state.isLoading = false;
      state.process = 'update';
    });
    builder.addCase(updateXAccount.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.process = 'update';
      state.errorMessage =
        action.payload == undefined ? 'Failed to update xAccount' : action.payload.message;
    });
    // delete data
    builder.addCase(deleteXAccount.pending, (state) => {
      state.isLoading = true;
      state.isError = false;
      state.errorMessage = '';
      state.process = 'idle';
    });
    builder.addCase(deleteXAccount.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.xAccountList.findIndex((xAccount) => xAccount.id === action.payload);
      state.xAccountList.splice(index, 1);
      state.process = 'delete';
    });
    builder.addCase(deleteXAccount.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.process = 'delete';
      state.errorMessage =
        action.payload == undefined ? 'Failed to delete xAccount' : action.payload.message;
    });
    // import data
    // builder.addCase(importXAccounts.pending, (state) => {
    //   state.isLoading = true;
    //   state.isError = false;
    //   state.errorMessage = '';
    //   state.process = 'idle';
    // });
    // builder.addCase(importXAccounts.fulfilled, (state, action) => {
    //   state.xAccountList = action.payload;
    //   state.isLoading = false;
    //   state.process = 'import';
    // });
    // builder.addCase(importXAccounts.rejected, (state, action) => {
    //   state.isLoading = false;
    //   state.isError = true;
    //   state.process = 'import';
    //   state.errorMessage =
    //     action.payload == undefined ? 'Failed to import xAccounts' : action.payload.message;
    // });
    // builder.addCase(updateAllXAccounts.pending, (state) => {
    //   state.isLoading = true;
    //   state.isError = false;
    //   state.errorMessage = '';
    //   state.process = 'idle';
    // });
    // builder.addCase(updateAllXAccounts.fulfilled, (state, action) => {
    //   state.xAccountList = action.payload;
    //   state.isLoading = false;
    //   state.process = 'updateAll';
    // });
    // builder.addCase(updateAllXAccounts.rejected, (state, action) => {
    //   state.isLoading = false;
    //   state.isError = true;
    //   state.process = 'updateAll';
    //   state.errorMessage =
    //     action.payload == undefined ? 'Failed to update all xAccounts' : action.payload.message;
    // });
  },
});

/**
 * XアカウントのリストをFirebase Realtime Databaseから取得する非同期アクション
 * 認証済みユーザーのXアカウント情報を取得し、配列として返す
 *
 * @returns {Promise<XAccount[]>} 取得したXアカウントの配列
 */
export const fetchXAccounts = createAsyncThunk<
  XAccount[],
  void,
  {
    rejectValue: { message: string };
    state: RootState;
  }
>('xAccounts/fetchXAccounts', async (_, thunkApi) => {
  try {
    const { user } = thunkApi.getState().auth;
    const db = getDatabase();
    const dbRef = ref(db, `user-data/${user?.uid}/xAccounts`);
    const snapshot = await get(dbRef);
    const data = snapshot.val();
    const xAccountList: XAccount[] = [];
    
    if (data) {
      Object.keys(data).forEach((key) => {
        xAccountList.push({ ...data[key], id: key });
      });
    }
    
    // データがない場合でも空配列を返す（型エラー回避）
    return xAccountList;
  } catch (error: any) {
    return thunkApi.rejectWithValue({ message: error.message });
  }
});

/**
 * 新しいXアカウントをFirebase Realtime Databaseに作成する非同期アクション
 * 
 * @param {XAccount} xAccount - 作成するXアカウント情報
 * @returns {Promise<XAccount>} 作成されたXアカウント情報（IDを含む）
 */
export const createXAccount = createAsyncThunk<
  XAccount,
  XAccount,
  {
    rejectValue: { message: string };
    state: RootState;
  }
>('xAccounts/createXAccount', async (xAccount, thunkAPI) => {
  try {
    const { uid } = thunkAPI.getState().auth.user;
    const db = getDatabase();
    const dbRef = ref(db, `user-data/${uid}/xAccounts`);
    
    // Firebase pushで新しいキーを生成
    const newRef = await push(dbRef);
    const newXAccountId = newRef.key;
    
    // キー生成失敗時のエラーハンドリング
    if (!newXAccountId) {
      return thunkAPI.rejectWithValue({ message: 'Failed to create xAccount' });
    }
    
    // 新しいIDを含めたアカウント情報を作成
    const newXAccount = { ...xAccount, id: newXAccountId };
    
    // データベースに保存
    await set(newRef, newXAccount);
    return newXAccount;
  } catch (error: any) {
    return thunkAPI.rejectWithValue({ message: error.message });
  }
});

/**
 * 既存のXアカウント情報を更新する非同期アクション
 * 
 * @param {XAccount} xAccount - 更新するXアカウント情報（IDを含む）
 * @returns {Promise<XAccount>} 更新されたXアカウント情報
 */
export const updateXAccount = createAsyncThunk<
  XAccount,
  XAccount,
  {
    rejectValue: { message: string };
    state: RootState;
  }
>('xAccounts/updateXAccount', async (xAccount, thunkAPI) => {
  try {
    const { uid } = thunkAPI.getState().auth.user;
    const db = getDatabase();
    // 更新するアカウントのリファレンスを取得（IDを利用）
    const dbRef = ref(db, `user-data/${uid}/xAccounts/${xAccount.id}`);
    // データを上書き
    await set(dbRef, xAccount);
    console.log('updated xAccount', xAccount);
    return xAccount;
  } catch (error: any) {
    return thunkAPI.rejectWithValue({ message: error.message });
  }
});

/**
 * Xアカウントを削除する非同期アクション
 * 
 * @param {string} xAccountId - 削除するXアカウントのID
 * @returns {Promise<string>} 削除したXアカウントのID
 */
export const deleteXAccount = createAsyncThunk<
  string,
  string,
  {
    rejectValue: { message: string };
    state: RootState;
  }
>('xAccounts/deleteXAccount', async (xAccountId, thunkAPI) => {
  try {
    const { uid } = thunkAPI.getState().auth.user;
    const db = getDatabase();
    // 削除するアカウントのリファレンスを取得
    const dbRef = ref(db, `user-data/${uid}/xAccounts/${xAccountId}`);
    // Firebase Realtime Databaseでは、nullを設定することでデータを削除する
    await set(dbRef, null);
    return xAccountId;
  } catch (error: any) {
    return thunkAPI.rejectWithValue({ message: error.message });
  }
});

export const selectXAccounts = (state: RootState) => state.xAccounts;

export const { resetProcess } = xAccountsSlice.actions;

export default xAccountsSlice.reducer;