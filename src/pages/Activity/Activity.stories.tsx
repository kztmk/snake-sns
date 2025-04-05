import { configureStore } from '@reduxjs/toolkit';
import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import Activity from './index';
import { ErrorData, PostData, PostedData } from './SheetData/types';

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
    contents: 'シートデータから取得した投稿です。長めの文章でテスト。',
    postSchedule: new Date(Date.now() + 1000 * 60 * 120).toISOString(), // 2時間後
    postTo: 'account2',
    xAccountName: '@testuser2',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1時間前
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
    contents: 'こちらも投稿済みの内容です。',
    postTo: 'account2',
    xAccountName: '@testuser2',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2日前
    postResult: 'success',
    tweetId: '1234567890123456790',
  },
];

const generateMockErrorData = (): ErrorData[] => [
  {
    id: '1660123456789',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分前
    postId: '1670123456791',
    accountId: '@testuser1',
    errorMessage: 'ツイート投稿APIでエラーが発生しました',
    action: 'post_tweet',
  },
  {
    id: '1660123456790',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2時間前
    accountId: '@testuser2',
    errorMessage: '認証エラー: トークンが無効です',
    action: 'auth_check',
  },
];

// トリガーステータスのモックデータ
const mockTriggerStatusActive = {
  status: 'success',
  data: {
    exists: true,
    nextRun: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5分後
    created: new Date().toISOString(),
    frequency: 5,
  },
};

const mockTriggerStatusInactive = {
  status: 'success',
  data: {
    exists: false,
  },
};

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
  title: 'Pages/Activity',
  component: Activity,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Provider store={createMockStore()}>
        <div style={{ maxWidth: '1200px', margin: '20px auto' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
} satisfies Meta<typeof Activity>;

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルトのストーリー
export const Default: Story = {
  parameters: {
    mockData: [
      {
        url: 'https://example.com/api?action=status&target=trigger',
        method: 'GET',
        status: 200,
        response: mockTriggerStatusActive,
      },
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

// トリガー停止状態
export const TriggerInactive: Story = {
  parameters: {
    mockData: [
      {
        url: 'https://example.com/api?action=status&target=trigger',
        method: 'GET',
        status: 200,
        response: mockTriggerStatusInactive,
      },
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

// データなし状態
export const NoData: Story = {
  parameters: {
    mockData: [
      {
        url: 'https://example.com/api?action=status&target=trigger',
        method: 'GET',
        status: 200,
        response: mockTriggerStatusActive,
      },
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

// GoogleSheet URL未設定状態
export const NoGoogleSheetUrl: Story = {
  decorators: [
    (Story) => (
      <Provider store={createMockStore(null)}>
        <div style={{ maxWidth: '1200px', margin: '20px auto' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};

// モバイル表示
export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    mockData: [
      {
        url: 'https://example.com/api?action=status&target=trigger',
        method: 'GET',
        status: 200,
        response: mockTriggerStatusActive,
      },
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
