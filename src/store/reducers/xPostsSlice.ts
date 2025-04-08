import { RootState } from '..';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { XPostDataType, XPostListFetchStatus } from '@/types/xAccounts';

// XPostsスライスの初期状態
const initialState: XPostListFetchStatus = {
  xAccountId: '',
  xPostList: [],
  xPostListByXAccountId: [],
  xPost: {
    id: '',
    contents: '',
    media: '',
    postSchedule: '',
    postTo: '',
    inReplyToInternal: '',
  },
  process: 'idle',
  isLoading: false,
  isError: false,
  errorMessage: '',
};

const PROXY_ENDPOINT = import.meta.env.VITE_PROXY_URL || '/api/gas-proxy';
// Xポストリスト取得の非同期アクション
export const fetchXPosts = createAsyncThunk(
  'xPosts/fetchXPosts',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const restUrl = state.auth.user?.googleSheetUrl;

      if (!restUrl) {
        return rejectWithValue('GoogleSheet URL が設定されていません');
      }

      const response = await axios.get(`${restUrl}?action=fetch&target=postData`);

      if (response.data.status === 'error') {
        return rejectWithValue(response.data.message || 'Xポスト一覧の取得に失敗しました');
      }

      return { posts: response.data.data || [] };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          'Xポスト一覧の取得中にエラーが発生しました'
      );
    }
  }
);

// Xポスト作成の非同期アクション
export const createXPost = createAsyncThunk(
  'xPosts/createXPost',
  async (
    { xAccountId, xPost }: { xAccountId: string; xPost: XPostDataType },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const restUrl = state.auth.user?.googleSheetUrl;

      if (!restUrl) {
        return rejectWithValue('GoogleSheet URL が設定されていません');
      }

      console.log('xPost', xPost);
      // APIリクエスト用のデータを作成
      const requestData = {
        ...xPost,
      };

      const response = await axios.post(PROXY_ENDPOINT, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Target-Gas-Url': restUrl,
        },
        params: {
          action: 'create',
          target: 'postData',
        },
      });

      if (response.data.status === 'error') {
        return rejectWithValue(response.data.message || 'Xポストの作成に失敗しました');
      }

      return { xAccountId, post: response.data.data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Xポストの作成中にエラーが発生しました'
      );
    }
  }
);

// Xポスト更新の非同期アクション
export const updateXPost = createAsyncThunk(
  'xPosts/updateXPost',
  async (
    { xAccountId, xPost }: { xAccountId: string; xPost: XPostDataType },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const restUrl = state.auth.user?.googleSheetUrl;

      if (!restUrl) {
        return rejectWithValue('GoogleSheet URL が設定されていません');
      }

      // APIリクエスト用のデータを作成
      const requestData = {
        ...xPost,
        xAccountId,
      };

      const response = await axios.post(PROXY_ENDPOINT, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Target-Gas-Url': restUrl,
        },
        params: {
          action: 'update',
          target: 'postData',
        },
      });

      if (response.data.status === 'error') {
        return rejectWithValue(response.data.message || 'Xポストの更新に失敗しました');
      }

      return { xAccountId, post: response.data.data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Xポストの更新中にエラーが発生しました'
      );
    }
  }
);

// Xポスト削除の非同期アクション
export const deleteXPost = createAsyncThunk(
  'xPosts/deleteXPost',
  async (
    { xAccountId, postId }: { xAccountId: string; postId: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const restUrl = state.auth.user?.googleSheetUrl;

      if (!restUrl) {
        return rejectWithValue('GoogleSheet URL が設定されていません');
      }

      const requestData = {
        id: postId,
        xAccountId,
      };

      const response = await axios.post(PROXY_ENDPOINT, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Target-Gas-Url': restUrl,
        },
        params: {
          action: 'delete',
          target: 'postData',
        },
      });

      if (response.data.status === 'error') {
        return rejectWithValue(response.data.message || 'Xポストの削除に失敗しました');
      }

      return { xAccountId, postId };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Xポストの削除中にエラーが発生しました'
      );
    }
  }
);

// XPostsスライス
const xPostsSlice = createSlice({
  name: 'xPosts',
  initialState,
  reducers: {
    getXPostsByXAccountId: (state, action: PayloadAction<string>) => {
      const xAccountId = action.payload;
      const xPostListByXAccountId = state.xPostList.filter((post) => post.postTo === xAccountId);
      state.xPostListByXAccountId = xPostListByXAccountId;
    },
    setCurrentXAccountId: (state, action: PayloadAction<string>) => {
      state.xAccountId = action.payload;
    },
    clearXPostsErrors: (state) => {
      state.isError = false;
      state.errorMessage = '';
      state.process = 'idle';
    },
    resetXPost: (state) => {
      state.xPost = initialState.xPost;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchXPosts
      .addCase(fetchXPosts.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.process = 'fetch';
      })
      .addCase(fetchXPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.xPostList = action.payload.posts;
        state.process = 'idle';
      })
      .addCase(fetchXPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
        state.process = 'idle';
      })
      // createXPost
      .addCase(createXPost.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.process = 'addNew';
      })
      .addCase(createXPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        state.xPostList.push(action.payload.post);
        state.xPostListByXAccountId = state.xPostList.filter(
          (post) => post.postTo === action.payload.xAccountId
        );
      })
      .addCase(createXPost.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      })
      // updateXPost
      .addCase(updateXPost.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.process = 'update';
      })
      .addCase(updateXPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        const index = state.xPostList.findIndex((post) => post.id === action.payload.post.id);
        if (index !== -1) {
          state.xPostList[index] = action.payload.post;
        }
        state.xPostListByXAccountId = state.xPostList.filter(
          (post) => post.postTo === action.payload.xAccountId
        );
      })
      .addCase(updateXPost.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      })
      // deleteXPost
      .addCase(deleteXPost.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.process = 'delete';
      })
      .addCase(deleteXPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        if (action.payload.postId === 'all') {
          state.xPostList = state.xPostList.filter(
            (post) => post.postTo !== action.payload.xAccountId
          );
        } else {
          state.xPostList = state.xPostList.filter((post) => post.id !== action.payload.postId);
        }
        state.xPostListByXAccountId = state.xPostList.filter(
          (post) => post.postTo === action.payload.xAccountId
        );
      })
      .addCase(deleteXPost.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      });
  },
});

export const { setCurrentXAccountId, clearXPostsErrors, resetXPost, getXPostsByXAccountId } =
  xPostsSlice.actions;

// セレクター
export const selectXPosts = (state: RootState) => state.xPosts.xPostList;
export const selectXPostsStatus = (state: RootState) => ({
  isLoading: state.xPosts.isLoading,
  isError: state.xPosts.isError,
  errorMessage: state.xPosts.errorMessage,
  process: state.xPosts.process,
});
export const selectXAccountId = (state: RootState) => state.xPosts.xAccountId;

export default xPostsSlice.reducer;
