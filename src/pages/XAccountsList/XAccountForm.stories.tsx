import { configureStore } from '@reduxjs/toolkit';
import type { Meta, StoryObj } from '@storybook/react';
import { MRT_Row, MRT_TableInstance } from 'mantine-react-table';
import { Provider } from 'react-redux';
import xAccountsReducer from '@/store/reducers/xAccountsSlice';
import { XAccount } from '@/types/xAccounts';
import XAccountForm from './XAccountForm';

// Mockデータ
const mockXAccount: XAccount = {
  id: 'mock-id-1',
  name: '@example_account',
  apiKey: 'api_key_example',
  apiSecret: 'api_secret_example',
  accessToken: 'access_token_example',
  accessTokenSecret: 'access_token_secret_example',
  note: 'テスト用アカウント',
};

// モック関数
const mockFeedback = ({ operation, accountName }: { operation: string; accountName: string }) => {
  console.log(`Operation: ${operation}, Account: ${accountName}`);
};

// モックのテーブルインスタンス
const mockTable = {
  setEditingRow: () => {},
  setCreatingRow: () => {},
} as unknown as MRT_TableInstance<XAccount>;

// モックのrow
const mockRow = {
  original: mockXAccount,
} as unknown as MRT_Row<XAccount>;

// モックのストア
const createMockStore = () => {
  return configureStore({
    reducer: {
      xAccounts: xAccountsReducer,
    },
    preloadedState: {
      xAccounts: {
        xAccountList: [], // accountsからxAccountListに修正
        xAccount: {
          // xAccountプロパティを追加
          id: '',
          name: '',
          apiKey: '',
          apiSecret: '',
          accessToken: '',
          accessTokenSecret: '',
          note: '',
        },
        process: 'idle', // nullから'idle'に修正
        isLoading: false,
        isError: false,
        errorMessage: '',
      },
    },
  });
};

// Metaオブジェクト
const meta = {
  title: 'Pages/XAccoutsList/XAccountForm',
  component: XAccountForm,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Provider store={createMockStore()}>
        <div style={{ width: '600px', padding: '20px' }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof XAccountForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// 登録モード (新規アカウント作成)
export const CreateMode: Story = {
  args: {
    row: undefined,
    table: mockTable,
    accountData: {
      id: '',
      name: '',
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      accessTokenSecret: '',
      note: '',
    },
    feedBack: mockFeedback,
  },
};

// 編集モード (既存アカウント編集)
export const EditMode: Story = {
  args: {
    row: mockRow,
    table: mockTable,
    accountData: mockXAccount,
    feedBack: mockFeedback,
  },
};
