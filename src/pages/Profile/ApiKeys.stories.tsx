import { configureStore } from '@reduxjs/toolkit';
import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import authReducer from '@/store/reducers/authSlice';
import ApiKeySettings from './ApiKeys';

// カスタムのStoryコンテキスト型を定義
interface CustomStoryContext {
  initialReduxState?: {
    auth: {
      loading: boolean;
      error: string | null;
      task: string | null;
      user: {
        uid?: string;
        email?: string;
        displayName?: string;
        photoURL?: string;
        chatGptApiKey?: string;
        geminiApiKey?: string;
        anthropicApiKey?: string;
      };
    };
  };
}

// Redux Storeモックの設定
const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState,
  });
};

const meta = {
  title: 'Pages/Profile/APIキー設定',
  component: ApiKeySettings,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story, context) => {
      // Storyごとに異なるstateを使用できるように
      // @ts-ignore
      const store = createMockStore(context.args?.initialReduxState || {});
      return (
        <Provider store={store}>
          <div style={{ width: '800px', padding: '24px' }}>
            <Story />
          </div>
        </Provider>
      );
    },
  ],
  tags: ['autodocs'],
  // argsTypesでプロパティを定義
  argTypes: {
    initialReduxState: {
      control: 'object',
      description: 'Reduxストアの初期状態',
    },
  },
} satisfies Meta<typeof ApiKeySettings>;

export default meta;
type Story = StoryObj<typeof meta> & { args: CustomStoryContext };

// 初期状態 (APIキーなし)
export const Default: Story = {
  args: {
    initialReduxState: {
      auth: {
        loading: false,
        error: null,
        task: null,
        user: {
          uid: 'user123',
          email: 'test@example.com',
          displayName: 'テストユーザー',
          photoURL: 'https://example.com/photo.jpg',
          chatGptApiKey: '',
          geminiApiKey: '',
          anthropicApiKey: '',
        },
      },
    },
  },
};

// APIキー設定済み状態
export const WithApiKeys: Story = {
  args: {
    initialReduxState: {
      auth: {
        loading: false,
        error: null,
        task: null,
        user: {
          uid: 'user123',
          email: 'test@example.com',
          displayName: 'テストユーザー',
          photoURL: 'https://example.com/photo.jpg',
          chatGptApiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
          geminiApiKey: 'AIzaSyDEF456789abcdefghijklmnopqrstuvwxyz',
          anthropicApiKey: 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz',
        },
      },
    },
  },
};

// 読み込み中の状態
export const Loading: Story = {
  args: {
    initialReduxState: {
      auth: {
        loading: true,
        error: null,
        task: 'save_api_key',
        user: {
          uid: 'user123',
          email: 'test@example.com',
          displayName: 'テストユーザー',
          photoURL: 'https://example.com/photo.jpg',
          chatGptApiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
          geminiApiKey: 'AIzaSyDEF456789abcdefghijklmnopqrstuvwxyz',
          anthropicApiKey: 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz',
        },
      },
    },
  },
};

// エラー状態
export const Error: Story = {
  args: {
    initialReduxState: {
      auth: {
        loading: false,
        error: 'APIキーの保存に失敗しました',
        task: 'error_api_key',
        user: {
          uid: 'user123',
          email: 'test@example.com',
          displayName: 'テストユーザー',
          photoURL: 'https://example.com/photo.jpg',
          chatGptApiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
          geminiApiKey: 'AIzaSyDEF456789abcdefghijklmnopqrstuvwxyz',
          anthropicApiKey: '',
        },
      },
    },
  },
};

// 保存成功状態
export const SaveSuccess: Story = {
  args: {
    initialReduxState: {
      auth: {
        loading: false,
        error: null,
        task: 'save_api_key',
        user: {
          uid: 'user123',
          email: 'test@example.com',
          displayName: 'テストユーザー',
          photoURL: 'https://example.com/photo.jpg',
          chatGptApiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
          geminiApiKey: 'AIzaSyDEF456789abcdefghijklmnopqrstuvwxyz',
          anthropicApiKey: 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz',
        },
      },
    },
  },
};
