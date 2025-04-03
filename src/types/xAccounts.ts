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
  file: File;
  fileName: string;
  fileId: string;
  webViewLink: string;
  webContentLink: string;
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
  xPost: XPostDataType;
  process: 'idle' | 'addNew' | 'update' | 'delete' | 'fetch';
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
