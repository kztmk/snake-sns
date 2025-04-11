export interface XAccount {
  id: string;
  name: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  note: string;
}

export type XAccountListFetchStatus = {
  xAccountList: XAccount[];
  xAccount: XAccount;
  process: 'idle' | 'addNew' | 'update' | 'delete' | 'fetch' | 'import' | 'updateAll';
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
};

export type XPostImageDataType = {
  path: string;
  imageData: string;
};

export type MediaDataType = {
  file: File | null;
  fileName: string;
  fileId: string;
  imgUrl: string;
  mimeType: string;
};

export type XPostDataType = {
  id?: string;
  createdAt?: string;
  postSchedule?: string | null;
  postTo?: string;
  contents?: string;
  media?: string; // JSON.stringify(UploadedMediaType[])
  inReplyToInternal?: string;
};

export type XPostedDataType = {
  id?: string;
  createdAt?: string;
  postSchedule?: string | null;
  postTo?: string;
  contents?: string;
  media?: string;
  inReplyToInternal?: string;
  postedId?: string;
  inReplyToOnX?: string;
  postedAt: string;
};

export type XPostListFetchStatus = {
  xAccountId: string;
  xPostList: XPostDataType[];
  xPostListByXAccountId: XPostDataType[];
  xPost: XPostDataType;
  process:
    | 'idle'
    | 'addNew'
    | 'update'
    | 'delete'
    | 'fetch'
    | 'updateSchedules'
    | 'createMultiple'
    | 'deleteMultiple'
    | 'createThreadPosts';
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
};

export interface PostError {
  timestamp: string;
  context: string;
  message: string;
  stack: string;
}

export interface PostScheduleUpdate {
  id: string;
  postSchedule: string; // ISO 8601 形式の文字列などを期待
}

export interface UpdateResult {
  id: string;
  status: 'updated' | 'not_found' | 'error';
  postSchedule: string;
  message?: string;
}

export interface PostDeletion {
  id: string;
}

export interface DeleteResult {
  id: string;
  status: 'deleted' | 'not_found' | 'error';
  message?: string;
}

export interface XPostDataInput {
  postTo: string;
  contents: string;
  media?: string;
  postSchedule?: string; // 文字列形式を期待 (ISO 8601など)
  inReplytoInternal?: string;
  postId?: string;
  inReplyToOnX?: string;
}

export interface UpdateInReplyToResult {
  id: string;
  status: 'updated' | 'not_found' | 'error';
  inReplyToInternal: string;
  message?: string;
}
