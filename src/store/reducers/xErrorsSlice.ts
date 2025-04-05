import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { PostError } from '@/types/xAccounts';
import type { RootState } from '../index';

interface XErrorsState {
  xErrorsList: PostError[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
}

const initialState: XErrorsState = {
  xErrorsList: [],
  isLoading: false,
  isError: false,
  errorMessage: '',
};

/**
 * エラーデータを取得する
 */
export const fetchXErrors = createAsyncThunk<
  PostError[],
  void,
  { state: RootState; rejectValue: string }
>('xErrors/fetch', async (_, thunkApi) => {
  try {
    const state = thunkApi.getState();
    const apiUrl = state.auth.user.googleSheetUrl;

    if (!apiUrl) {
      return thunkApi.rejectWithValue('GoogleシートURLが設定されていません。');
    }

    const response = await axios.get(`${apiUrl}?action=fetch&target=errorData`);

    // APIからのレスポンス構造に基づいて適切にデータを処理
    if (response.data.status === 'success') {
      return response.data.data;
    }

    return thunkApi.rejectWithValue(response.data.message || 'エラーデータの取得に失敗しました。');
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      'エラーデータの取得中に問題が発生しました。';
    return thunkApi.rejectWithValue(errorMsg);
  }
});

const xErrorsSlice = createSlice({
  name: 'xErrors',
  initialState,
  reducers: {
    resetXErrorsState: (state) => {
      state.xErrorsList = [];
      state.isLoading = false;
      state.isError = false;
      state.errorMessage = '';
    },
    resetXErrorsError: (state) => {
      state.isError = false;
      state.errorMessage = '';
    },
  },
  extraReducers: (builder) => {
    // Fetch Errors Data
    builder.addCase(fetchXErrors.pending, (state) => {
      state.isLoading = true;
      state.isError = false;
      state.errorMessage = '';
    });
    builder.addCase(fetchXErrors.fulfilled, (state, action) => {
      state.isLoading = false;
      state.xErrorsList = action.payload;
    });
    builder.addCase(fetchXErrors.rejected, (state, action) => {
      state.isLoading = false;
      state.isError = true;
      state.errorMessage = action.payload || 'エラーデータの取得に失敗しました';
    });
  },
});

export const { resetXErrorsState, resetXErrorsError } = xErrorsSlice.actions;
export const selectXErrors = (state: RootState) => state.xErrors;
export default xErrorsSlice.reducer;
