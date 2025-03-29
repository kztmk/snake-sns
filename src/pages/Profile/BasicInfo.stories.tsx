import { configureStore } from '@reduxjs/toolkit';
import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { MantineProvider } from '@mantine/core';
import BasicInfo from './BasicInfo';

// モックのReduxストアを作成
const mockStore = configureStore({
  reducer: {
    auth: (
      state = {
        user: {
          displayName: 'テストユーザー',
          role: '開発者',
          avatarUrl: 'https://i.pravatar.cc/150?img=59', // ダミーのアバター画像URL
        },
      }
    ) => state,
  },
});

const meta = {
  title: 'Pages/Profile/BasicInfo',
  component: BasicInfo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Provider store={mockStore}>
        <MantineProvider>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Story />
          </div>
        </MantineProvider>
      </Provider>
    ),
  ],
} satisfies Meta<typeof BasicInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <Provider store={mockStore}>
        <MantineProvider defaultColorScheme="dark">
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Story />
          </div>
        </MantineProvider>
      </Provider>
    ),
  ],
};
