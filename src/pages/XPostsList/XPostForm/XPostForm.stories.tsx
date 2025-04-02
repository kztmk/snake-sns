import { configureStore } from '@reduxjs/toolkit';
import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { XPostDataType } from '@/types/xAccounts';
import XPostForm, { xPostFormDefaultValue } from './index';

// モックストアの設定
const createMockStore = () => {
  return configureStore({
    reducer: {
      xAccounts: (
        state = {
          xAccountList: [
            {
              id: 'mock-account-1',
              displayName: 'モックアカウント',
              screenName: 'mock_user',
              profileImageUrl: 'https://via.placeholder.com/150',
            },
          ],
          loading: false,
          error: null,
        }
      ) => state,
      xPosts: (
        state = {
          process: 'idle',
          isLoading: false,
          isError: false,
          errorMessage: '',
        }
      ) => state,
      apiController: (
        state = {
          status: 'idle',
          error: null,
          uploadedMedia: null,
          triggerStatus: null,
          archivedSheet: null,
        }
      ) => state,
    },
  });
};

// モックテーブルの設定
const mockTable = {
  setCreatingRow: () => {},
  setEditingRow: () => {},
} as any;

// モックデータ
const mockNewPost: XPostDataType = {
  ...xPostFormDefaultValue,
};

const mockExistingPost: XPostDataType = {
  id: 'existing-post-1',
  contents: 'これは既存の投稿です #テスト',
  media: JSON.stringify([
    {
      filename: 'image1.jpg',
      fileId: 'file-id-1',
      webViewLink: '/path/to/image1.jpg',
      webContentLink: '/path/to/image1.jpg',
    },
  ]),
  postSchedule: null,
  postTo: '',
  inReplyToInternal: '',
};

const meta = {
  title: 'Pages/XPosts/XPostForm',
  component: XPostForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Provider store={createMockStore()}>
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '0 16px' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
} satisfies Meta<typeof XPostForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// 新規投稿作成のストーリー
export const CreateNew: Story = {
  args: {
    xAccountId: 'mock-account-1',
    table: mockTable,
    row: {} as any,
    xPostData: mockNewPost,
    feedBack: ({ operation, text }) => console.log(`${operation}: ${text}`),
  },
};

// 既存投稿編集のストーリー
export const EditExisting: Story = {
  args: {
    xAccountId: 'mock-account-1',
    table: mockTable,
    row: {} as any,
    xPostData: mockExistingPost,
    feedBack: ({ operation, text }) => console.log(`${operation}: ${text}`),
  },
};

// モバイルビューのストーリー
export const MobileView: Story = {
  args: {
    xAccountId: 'mock-account-1',
    table: mockTable,
    row: {} as any,
    xPostData: mockNewPost,
    feedBack: ({ operation, text }) => console.log(`${operation}: ${text}`),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

// 複数画像付きのストーリー
export const WithMultipleImages: Story = {
  args: {
    xAccountId: 'mock-account-1',
    table: mockTable,
    row: {} as any,
    xPostData: {
      ...mockExistingPost,
      media: JSON.stringify([
        {
          filename: 'image1.jpg',
          fileId: 'file-id-1',
          webViewLink: '/path/to/image1.jpg',
          webContentLink: '/path/to/image1.jpg',
        },
        {
          filename: 'image2.jpg',
          fileId: 'file-id-2',
          webViewLink: '/path/to/image2.jpg',
          webContentLink: '/path/to/image2.jpg',
        },
        {
          filename: 'image3.jpg',
          fileId: 'file-id-3',
          webViewLink: '/path/to/image3.jpg',
          webContentLink: '/path/to/image3.jpg',
        },
      ]),
    },
    feedBack: ({ operation, text }) => console.log(`${operation}: ${text}`),
  },
};
