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
  