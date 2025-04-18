import { RootState } from '..';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { ref as dbRef, get, runTransaction } from 'firebase/database';
import { database } from '@/firebase';
import {
  DeleteResult,
  UpdateInReplyToResult,
  UpdateResult,
  XPostDataType,
  XPostListFetchStatus,
} from '@/types/xAccounts';

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

const appMode = import.meta.env.VITE_APP_MODE;
const isPreview = appMode === 'preview' || appMode === 'development'; // プレビュー版かどうか

const PROXY_ENDPOINT = import.meta.env.VITE_PROXY_URL || '/api/gas-proxy';
const SCHEDULE_LIMIT = 50; // スケジュール設定回数の上限

// --- RTDB Helper Functions ---
/**
 * 指定されたユーザーのスケジュール設定回数を取得する
 * @param uid ユーザーID
 * @returns 現在の設定回数 (未設定の場合は0)
 */
const getScheduleLimitCount = async (uid: string): Promise<number> => {
  const limitRef = dbRef(database, `user-data/${uid}/settings/limit/postScheduleCount`);
  const snapshot = await get(limitRef);
  return snapshot.exists() ? snapshot.val() : 0;
};

/**
 * 指定されたユーザーのスケジュール設定回数をアトミックにインクリメントする
 * @param uid ユーザーID
 * @param incrementBy 増やす数
 */
const incrementScheduleLimitCount = async (uid: string, incrementBy: number): Promise<void> => {
  if (incrementBy <= 0) return;
  const limitRef = dbRef(database, `user-data/${uid}/settings/limit/postScheduleCount`);
  try {
    await runTransaction(limitRef, (currentCount) => {
      return (currentCount || 0) + incrementBy;
    });
    console.log(`Incremented schedule limit for ${uid} by ${incrementBy}`);
  } catch (error) {
    console.error(`Failed to increment schedule limit for ${uid}:`, error);
    // ここでのエラーはスローせず、ログに残すだけにする（Thunkの成否には影響させない）
  }
};

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
    const state = getState() as RootState;
    const uid = state.auth.user?.uid;
    const restUrl = state.auth.user?.googleSheetUrl;

    if (!uid) {
      return rejectWithValue('ユーザー認証が必要です。');
    }

    if (!restUrl) {
      return rejectWithValue('GoogleSheet URL が設定されていません');
    }

    try {
      // プレビュー版でスケジュール設定がある場合、上限チェック
      if (isPreview && xPost.postSchedule && xPost.postSchedule.trim() !== '') {
        const currentCount = await getScheduleLimitCount(uid);
        if (currentCount >= SCHEDULE_LIMIT) {
          return rejectWithValue(
            `[プレビュー制限] スケジュール設定回数の上限(${SCHEDULE_LIMIT}回)に達しました。`
          );
        }
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

      // 成功した場合、プレビュー版でスケジュール設定があればカウントを増やす
      if (isPreview && xPost.postSchedule && xPost.postSchedule.trim() !== '') {
        await incrementScheduleLimitCount(uid, 1);
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
    const state = getState() as RootState;
    const uid = state.auth.user?.uid;
    const restUrl = state.auth.user?.googleSheetUrl;

    if (!uid) {
      return rejectWithValue('ユーザー認証が必要です。');
    }
    if (!restUrl) {
      return rejectWithValue('GoogleSheet URL が設定されていません');
    }
    try {
      // 現在のポストデータを取得して比較
      const currentPost = state.xPosts.xPostList.find((p) => p.id === xPost.id);
      const oldSchedule = currentPost?.postSchedule?.trim() ?? '';
      const newSchedule = xPost.postSchedule?.trim() ?? '';
      const isScheduleBeingSetOrChanged = newSchedule !== '' && oldSchedule !== newSchedule;

      // プレビュー版でスケジュールが新規設定または変更される場合、上限チェック
      if (isPreview && isScheduleBeingSetOrChanged) {
        const currentCount = await getScheduleLimitCount(uid);
        if (currentCount >= SCHEDULE_LIMIT) {
          return rejectWithValue(
            `[プレビュー制限] スケジュール設定回数の上限(${SCHEDULE_LIMIT}回)に達しました。`
          );
        }
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
      // 成功した場合、プレビュー版でスケジュールが設定/変更されていればカウントを増やす
      if (isPreview && isScheduleBeingSetOrChanged) {
        await incrementScheduleLimitCount(uid, 1);
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

// 一括スケジュール更新の非同期アクション
export const updateSchedules = createAsyncThunk<
  { xAccountId: string; results: UpdateResult[] },
  { xAccountId: string; scheduleUpdates: { id: string; postSchedule: string }[] },
  { rejectValue: string }
>('xPosts/updateSchedules', async (args, { getState, rejectWithValue }) => {
  try {
    const state = getState() as RootState;
    const uid = state.auth.user?.uid;
    const restUrl = state.auth.user?.googleSheetUrl;

    if (!uid) {
      return rejectWithValue('ユーザー認証が必要です。');
    }
    if (!restUrl) {
      return rejectWithValue('GoogleSheet URL が設定されていません');
    }
    const { xAccountId, scheduleUpdates } = args;
    const numberOfUpdates = scheduleUpdates.length;

    // プレビュー版で更新件数 > 0 の場合、上限チェック
    if (isPreview && numberOfUpdates > 0) {
      const currentCount = await getScheduleLimitCount(uid);
      if (currentCount >= SCHEDULE_LIMIT) {
        return rejectWithValue(
          `[プレビュー制限] スケジュール設定回数の上限(${SCHEDULE_LIMIT}回)に達しました。一括更新はできません。`
        );
      }
      if (currentCount + numberOfUpdates > SCHEDULE_LIMIT) {
        const remainingSlots = SCHEDULE_LIMIT - currentCount;
        return rejectWithValue(
          `[プレビュー制限] スケジュール設定回数の上限(${SCHEDULE_LIMIT}回)を超えます。あと${remainingSlots}件まで設定可能です。`
        );
      }
    } else if (numberOfUpdates === 0) {
      // 更新対象が0件の場合は何もしない
      return { xAccountId, results: [] };
    }

    console.log('scheduleUpdates', scheduleUpdates);
    const requestData = {
      scheduleUpdates,
    };

    const response = await axios.post(PROXY_ENDPOINT, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Gas-Url': restUrl,
      },
      params: {
        action: 'updateSchedules',
        target: 'postData',
      },
    });

    if (response.data.status === 'error') {
      return rejectWithValue(response.data.message || 'スケジュールの一括更新に失敗しました');
    }

    // 成功した場合、プレビュー版で実際に更新された件数分カウントを増やす
    const successfulUpdates =
      response.data.data?.filter((item: UpdateResult) => item.status === 'updated').length ?? 0;
    if (isPreview && successfulUpdates > 0) {
      await incrementScheduleLimitCount(uid, successfulUpdates);
    }

    return { xAccountId, results: response.data.data || [] };
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message ||
        error.message ||
        'スケジュールの一括更新中にエラーが発生しました'
    );
  }
});

export const deleteMultiple = createAsyncThunk<
  { xAccountId: string; results: DeleteResult[] },
  { xAccountId: string; idsToDelete: { id: string }[] },
  { rejectValue: string }
>('xPosts/deleteMultiple', async (args, { getState, rejectWithValue }) => {
  try {
    const state = getState() as RootState;
    const restUrl = state.auth.user?.googleSheetUrl;

    if (!restUrl) {
      return rejectWithValue('GoogleSheet URL が設定されていません');
    }

    const { xAccountId, idsToDelete } = args;
    const requestData = {
      idsToDelete,
    };

    const response = await axios.post(PROXY_ENDPOINT, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Gas-Url': restUrl,
      },
      params: {
        action: 'deleteMultiple',
        target: 'postData',
      },
    });

    if (response.data.status === 'error') {
      return rejectWithValue(response.data.message || 'Xポストの一括削除に失敗しました');
    }

    return { xAccountId, results: response.data.data };
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || error.message || 'Xポストの一括削除中にエラーが発生しました'
    );
  }
});

// 複数投稿の一括作成の非同期アクション
export const createMultiplePost = createAsyncThunk<
  { xAccountId: string; posts: XPostDataType[] },
  { xAccountId: string; posts: XPostDataType[] },
  { rejectValue: string }
>('xPosts/createMultiplePost', async (args, { getState, rejectWithValue }) => {
  try {
    const state = getState() as RootState;
    const restUrl = state.auth.user?.googleSheetUrl;

    if (!restUrl) {
      return rejectWithValue('GoogleSheet URL が設定されていません');
    }

    const { xAccountId, posts } = args;

    const requestData = {
      posts,
    };

    const response = await axios.post(PROXY_ENDPOINT, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Gas-Url': restUrl,
      },
      params: {
        action: 'createMultiple',
        target: 'postData',
      },
    });

    if (response.data.status === 'error') {
      return rejectWithValue(response.data.message || 'Xポストの一括作成に失敗しました');
    }

    return { xAccountId, posts: response.data.data || [] };
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || error.message || 'Xポストの一括作成中にエラーが発生しました'
    );
  }
});

export const createThreadPosts = createAsyncThunk<
  { xAccountId: string; results: UpdateInReplyToResult[] },
  { xAccountId: string; threads: { id: string; inReplyToInternal: string }[] },
  { rejectValue: string }
>('xPosts/createThreadPosts', async (args, { getState, rejectWithValue }) => {
  try {
    const state = getState() as RootState;
    const restUrl = state.auth.user?.googleSheetUrl;
    if (!restUrl) {
      return rejectWithValue('GoogleSheet URL が設定されていません');
    }
    const { xAccountId, threads } = args;
    const requestData = { threads };

    const response = await axios.post(PROXY_ENDPOINT, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Gas-Url': restUrl,
      },
      params: {
        action: 'updateInReplyTo',
        target: 'postData',
      },
    });

    if (response.data.status === 'error') {
      return rejectWithValue(response.data.message || 'スレッド投稿の作成に失敗しました');
    }

    return { xAccountId, results: response.data.data || [] };
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || error.message || 'スレッド投稿の作成中にエラーが発生しました'
    );
  }
});

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
      })
      // updateSchedules
      .addCase(updateSchedules.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.process = 'updateSchedules';
      })
      .addCase(updateSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        // 成功した更新を反映
        if (action.payload && action.payload.results) {
          const updatedItems = action.payload.results.filter((item) => item.status === 'updated');
          updatedItems.forEach((item) => {
            const index = state.xPostList.findIndex((post) => post.id === item.id);
            if (index !== -1 && 'postSchedule' in item) {
              state.xPostList[index].postSchedule = item.postSchedule as string;
            }
          });
        }
        state.xPostListByXAccountId = state.xPostList.filter(
          (post) => post.postTo === action.payload.xAccountId
        );
      })
      .addCase(updateSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      })
      // deleteMultiple
      .addCase(deleteMultiple.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.process = 'deleteMultiple';
      })
      .addCase(deleteMultiple.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        // 成功した削除を反映

        if (action.payload && action.payload.results) {
          const deletedIds = action.payload.results
            .filter((item) => item.status === 'deleted')
            .map((item) => item.id);

          state.xPostList = state.xPostList.filter((post) => !deletedIds.includes(post.id || ''));
          state.xPostListByXAccountId = state.xPostListByXAccountId.filter(
            (post) => !deletedIds.includes(post.id || '')
          );
        }
      })
      .addCase(deleteMultiple.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      })
      // createMultiplePost
      .addCase(createMultiplePost.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.process = 'createMultiple';
      })
      .addCase(createMultiplePost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        // 作成された投稿を追加
        state.xPostList = [...state.xPostList, ...action.payload.posts];
        // 現在表示中のアカウントに関連する投稿を更新
        if (state.xAccountId) {
          state.xPostListByXAccountId = state.xPostList.filter(
            (post) => post.postTo === state.xAccountId
          );
        }
      })
      .addCase(createMultiplePost.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.errorMessage = action.payload as string;
      })
      // createThreadPosts
      .addCase(createThreadPosts.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.errorMessage = '';
        state.process = 'createThreadPosts';
      })
      .addCase(createThreadPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isError = false;
        // スレッド投稿の結果を反映
        if (action.payload && action.payload.results) {
          action.payload.results.forEach((item) => {
            const index = state.xPostList.findIndex((post) => post.id === item.id);
            if (index !== -1 && 'inReplyToInternal' in item) {
              state.xPostList[index].inReplyToInternal = item.inReplyToInternal as string;
            }
          });
        }
        // 現在表示中のアカウントに関連する投稿を更新

        state.xPostListByXAccountId = state.xPostList.filter(
          (post) => post.postTo === action.payload.xAccountId
        );
      })
      .addCase(createThreadPosts.rejected, (state, action) => {
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
