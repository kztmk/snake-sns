import { configureStore } from '@reduxjs/toolkit';
import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import SheetData from './index';
import { ErrorData, PostData, PostedData } from './types';

// モックデータの生成
const generateMockPostsData = (): PostData[] => [
  {
    id: '1680123456789',
    contents: 'これは予約投稿のテスト投稿です。#テスト #自動化',
    postSchedule: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1時間後
    postTo: 'account1',
    xAccountName: '@testuser1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '1680123456790',
    contents:
      'シートデータから取得した投稿です。長めの文章を書くことでテーブル表示の様子をテストします。これは長文のテストです。これは長文のテストです。',
    postSchedule: new Date(Date.now() + 1000 * 60 * 120).toISOString(), // 2時間後
    postTo: 'account2',
    xAccountName: '@testuser2',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1時間前
    inReplyToInternal: '1680123456789',
  },
  {
    id: '1680123456791',
    contents: '画像付き投稿のテスト',
    media: JSON.stringify([
      {
        filename: 'test.jpg',
        fileId: 'test-file-id',
        webViewLink: 'https://example.com/image.jpg',
        webContentLink: 'https://example.com/image.jpg',
      },
    ]),
    postTo: 'account1',
    xAccountName: '@testuser1',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2時間前
  },
];

const generateMockPostedData = (): PostedData[] => [
  {
    id: '1670123456789',
    contents: '既に投稿済みのツイートです。#完了',
    postTo: 'account1',
    xAccountName: '@testuser1',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1日前
    postResult: 'success',
    tweetId: '1234567890123456789',
  },
  {
    id: '1670123456790',
    contents: 'こちらも投稿済みの内容です。リプライテスト。',
    postTo: 'account2',
    xAccountName: '@testuser2',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2日前
    postResult: 'success',
    tweetId: '1234567890123456790',
    inReplyToStatus: '1234567890123456789',
  },
  {
    id: '1670123456791',
    contents: '投稿に失敗したツイートの例です。',
    postTo: 'account1',
    xAccountName: '@testuser1',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12時間前
    postResult: 'failed',
  },
];

const generateMockErrorData = (): ErrorData[] => [
  {
    id: '1660123456789',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分前
    postId: '1670123456791',
    accountId: '@testuser1',
    errorMessage: 'ツイート投稿APIでエラーが発生しました',
    errorStack: `Error: ツイート投稿APIでエラーが発生しました
    at postTweet (/functions/src/twitter.js:123:7)
    at processPost (/functions/src/index.js:45:12)
    at handleScheduledFunction (/functions/src/index.js:22:10)`,
    context: '{"postId":"1670123456791","accountId":"@testuser1","attempt":1}',
    action: 'post_tweet',
  },
  {
    id: '1660123456790',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2時間前
    accountId: '@testuser2',
    errorMessage: '認証エラー: トークンが無効です',
    errorStack: `Error: 認証エラー: トークンが無効です
    at authenticate (/functions/src/auth.js:45:11)
    at verifyCredentials (/functions/src/twitter.js:22:9)
    at Object.checkAuth (/functions/src/middleware.js:15:5)`,
    action: 'auth_check',
  },
  {
    id: '1660123456791',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5時間前
    postId: '1670123456792',
    accountId: '@testuser1',
    errorMessage: 'メディアのアップロードに失敗しました: ファイルサイズ制限超過',
    action: 'upload_media',
  },
];

// モックのRedux Store作成
const createMockStore = (googleSheetUrl: string | null = 'https://example.com/api') => {
  return configureStore({
    reducer: {
      auth: (
        state = {
          user: {
            uid: 'mock-user-id',
            email: 'test@example.com',
            displayName: 'テストユーザー',
            role: 'user',
            photoURL: null,
            avatarUrl: null,
            backgroundImageUrl: null,
            googleSheetUrl,
          },
          loading: false,
          error: null,
          task: null,
        }
      ) => state,
    },
  });
};

// メタデータ設定
const meta = {
  title: 'Pages/Activity/SheetData',
  component: SheetData,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Provider store={createMockStore()}>
        <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 16px' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
} satisfies Meta<typeof SheetData>;

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルトのストーリー
export const Default: Story = {
  parameters: {
    mockData: [
      {
        url: 'https://example.com/api?action=fetch&target=postData',
        method: 'GET',
        status: 200,
        response: {
          status: 'success',
          data: generateMockPostsData(),
        },
      },
      {
        url: 'https://example.com/api?action=fetch&target=postedData',
        method: 'GET',
        status: 200,
        response: {
          status: 'success',
          data: generateMockPostedData(),
        },
      },
      {
        url: 'https://example.com/api?action=fetch&target=errorData',
        method: 'GET',
        status: 200,
        response: {
          status: 'success',
          data: generateMockErrorData(),
        },
      },
    ],
  },
};

// データがない状態
export const NoData: Story = {
  parameters: {
    mockData: [
      {
        url: 'https://example.com/api?action=fetch&target=postData',
        method: 'GET',
        status: 200,
        response: {
          status: 'success',
          data: [],
        },
      },
      {
        url: 'https://example.com/api?action=fetch&target=postedData',
        method: 'GET',
        status: 200,
        response: {
          status: 'success',
          data: [],
        },
      },
      {
        url: 'https://example.com/api?action=fetch&target=errorData',
        method: 'GET',
        status: 200,
        response: {
          status: 'success',
          data: [],
        },
      },
    ],
  },
};

// ローディング状態
export const Loading: Story = {
  parameters: {
    mockData: [
      {
        url: 'https://example.com/api?action=fetch&target=postData',
        method: 'GET',
        delay: 5000, // 5秒の遅延でローディング状態を表示
        response: {
          status: 'success',
          data: generateMockPostsData(),
        },
      },
      {
        url: 'https://example.com/api?action=fetch&target=postedData',
        method: 'GET',
        delay: 5000,
        response: {
          status: 'success',
          data: generateMockPostedData(),
        },
      },
      {
        url: 'https://example.com/api?action=fetch&target=errorData',
        method: 'GET',
        delay: 5000,
        response: {
          status: 'success',
          data: generateMockErrorData(),
        },
      },
    ],
  },
};

// エラー状態
export const Error: Story = {
  parameters: {
    mockData: [
      {
        url: 'https://example.com/api?action=fetch&target=postData',
        method: 'GET',
        status: 200,
        response: {
          status: 'error',
          message: '未投稿データの取得に失敗しました',
        },
      },
      {
        url: 'https://example.com/api?action=fetch&target=postedData',
        method: 'GET',
        status: 200,
        response: {
          status: 'error',
          message: '投稿済みデータの取得に失敗しました',
        },
      },
      {
        url: 'https://example.com/api?action=fetch&target=errorData',
        method: 'GET',
        status: 200,
        response: {
          status: 'error',
          message: 'エラーデータの取得に失敗しました',
        },
      },
    ],
  },
};

// GoogleSheet URL未設定状態
export const NoGoogleSheetUrl: Story = {
  decorators: [
    (Story) => (
      <Provider store={createMockStore(null)}>
        <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 16px' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};
