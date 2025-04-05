/**
 * 投稿予定データの型定義
 */
export interface PostData {
  id: string;
  contents: string;
  media?: string;
  postSchedule?: string | null;
  postTo: string;
  inReplyToInternal?: string;
  createdAt?: string;
  xAccountName?: string;
}

/**
 * 投稿済みデータの型定義
 */
export interface PostedData {
  id: string;
  contents: string;
  media?: string;
  postTo: string;
  postedAt: string;
  inReplyToStatus?: string;
  postResult?: string;
  tweetId?: string;
  xAccountName?: string;
}

/**
 * エラーデータの型定義
 */
export interface ErrorData {
  id: string;
  timestamp: string;
  postId?: string;
  accountId?: string;
  errorMessage: string;
  errorStack?: string;
  context?: string;
  action?: string;
}
