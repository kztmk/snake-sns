import type { Meta, StoryObj } from '@storybook/react';
import SignIn from './SignIn';

const meta: Meta<typeof SignIn> = {
  title: 'Pages/Auth/SignIn',
  component: SignIn,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// You can add more variations if needed
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
