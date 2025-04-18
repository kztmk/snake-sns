import { configureStore } from '@reduxjs/toolkit';
import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import authReducer from '@/store/reducers/auth';
import ProfilePage from './index';

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
  title: 'Pages/Profile/ProfilePage',
  component: ProfilePage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      // Storyごとに異なるstateを使用できるように
      // @ts-ignore
      const store = createMockStore(context.args?.initialReduxState || {});
      return (
        <Provider store={store}>
          <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
} satisfies Meta<typeof ProfilePage>;

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
          photoURL:
            'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=250&q=80',
          chatGptApiKey: '',
          geminiApiKey: '',
          anthropicApiKey: '',
        },
      },
    },
  },
};

// 初期状態 (APIキー設定済み) - こちらのほうがUXとして様々な情報を確認できる
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
          photoURL:
            'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=250&q=80',
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
          photoURL:
            'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=250&q=80',
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
          photoURL:
            'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=250&q=80',
          chatGptApiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
          geminiApiKey: 'AIzaSyDEF456789abcdefghijklmnopqrstuvwxyz',
          anthropicApiKey: '',
        },
      },
    },
  },
};
