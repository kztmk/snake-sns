import { configureStore } from '@reduxjs/toolkit';
import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import authReducer from '@/store/reducers/authSlice';
import PasswordChange from './PasswordChange';

// カスタムのStoryコンテキスト型を定義
interface CustomStoryContext {
  initialReduxState?: {
    auth: {
      loading: boolean;
      error: string | null;
      task: string | null;
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
  title: 'Pages/Profile/PasswordChange',
  component: PasswordChange,
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
} satisfies Meta<typeof PasswordChange>;

export default meta;
type Story = StoryObj<typeof meta> & { args: CustomStoryContext };

// 初期状態
export const Default: Story = {
  args: {
    initialReduxState: {
      auth: {
        loading: false,
        error: null,
        task: null,
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
        task: 'update_password',
      },
    },
  },
};

// エラー状態
export const WithError: Story = {
  args: {
    initialReduxState: {
      auth: {
        loading: false,
        error: 'パスワード更新に失敗しました',
        task: 'error_password',
      },
    },
  },
};

// 成功状態
export const Success: Story = {
  args: {
    initialReduxState: {
      auth: {
        loading: false,
        error: null,
        task: 'update_password',
      },
    },
  },
};
