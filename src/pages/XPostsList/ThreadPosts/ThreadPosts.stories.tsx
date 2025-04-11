import type { Meta, StoryObj } from '@storybook/react';
import { XPostDataType } from '@/types/xAccounts';
import ThreadPosts from './';

const meta: Meta<typeof ThreadPosts> = {
  title: 'Pages/XPostsList/ThreadPosts',
  component: ThreadPosts,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ThreadPosts>;

// モックデータの作成
const mockPosts: XPostDataType[] = [
  {
    id: 'post-1',
    contents: '最初のスレッドポスト。これはシリーズの始まりです。#開始',
    postTo: 'account-1',
    media: '',
    postSchedule: '2025-01-15T10:00:00+09:00',
    createdAt: '2025-01-10T15:30:00+09:00',
  },
  {
    id: 'post-2',
    contents: 'スレッドの2番目の投稿です。前回の続きについて説明します。#続き',
    postTo: 'account-1',
    inReplyToInternal: 'post-1',
    media: '',
    postSchedule: '2025-01-16T10:30:00+09:00',
    createdAt: '2025-01-10T15:31:00+09:00',
  },
  {
    id: 'post-3',
    contents: 'スレッドの最後の投稿です。まとめと今後の展開について。#まとめ',
    postTo: 'account-1',
    inReplyToInternal: 'post-2',
    media: '',
    postSchedule: '2025-01-17T11:00:00+09:00',
    createdAt: '2025-01-10T15:32:00+09:00',
  },
];

// デフォルトのストーリー
export const Default: Story = {
  args: {
    posts: mockPosts,
  },
};

// 投稿がない場合のストーリー
export const EmptyThreads: Story = {
  args: {
    posts: [],
  },
};

// 多数の投稿がある場合のストーリー
export const ManyPosts: Story = {
  args: {
    posts: [
      ...mockPosts,
      {
        id: 'post-4',
        contents: '追加の投稿1: さらなる議論のポイントについて。#追加',
        postTo: 'account-1',
        inReplyToInternal: 'post-3',
        media: '',
        postSchedule: '2025-01-18T10:00:00+09:00',
        createdAt: '2025-01-10T15:33:00+09:00',
      },
      {
        id: 'post-5',
        contents: '追加の投稿2: 読者からの質問に回答します。#質問回答',
        postTo: 'account-1',
        inReplyToInternal: 'post-4',
        media:
          '[{"file":{},"fileId":"1qpnpRb4ImQoZWG_0GV652KeOlHl2ECfT","fileName":"834705393654471799.png","mimeType":"image/png","imgUrl":"https://drive.google.com/uc?export=view&id=1qpnpRb4ImQoZWG_0GV652KeOlHl2ECfT"}]',
        postSchedule: '2025-01-19T10:30:00+09:00',
        createdAt: '2025-01-10T15:34:00+09:00',
      },
    ],
  },
};

// メディア付きの投稿を含むストーリー
export const WithMedia: Story = {
  args: {
    posts: [
      {
        id: 'media-post-1',
        contents: 'これは画像付きの投稿です。#ビジュアル',
        postTo: 'account-1',
        media: JSON.stringify([
          {
            fileId: 'mock-file-id-1',
            fileName: 'sample-image.jpg',
            mimeType: 'image/jpeg',
          },
        ]),
        postSchedule: '2025-01-20T10:00:00+09:00',
        createdAt: '2025-01-15T12:00:00+09:00',
      },
      {
        id: 'media-post-2',
        contents: 'こちらは動画付きの投稿です。#動画コンテンツ',
        postTo: 'account-1',
        inReplyToInternal: 'media-post-1',
        media: JSON.stringify([
          {
            fileId: 'mock-file-id-2',
            fileName: 'sample-video.mp4',
            mimeType: 'video/mp4',
          },
        ]),
        postSchedule: '2025-01-21T10:30:00+09:00',
        createdAt: '2025-01-15T12:01:00+09:00',
      },
    ],
  },
};
