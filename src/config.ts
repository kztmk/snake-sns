export const APP_DEFAULT_PATH = '/home';

// Google Sheets Webアプリのエンドポイントパス
// 実際のURLはユーザーの認証情報から取得
export const APPS_SCRIPT_API = {
  // 画像アップロード用エンドポイント（デフォルトはユーザー認証情報から取得）
  UPLOAD_MEDIA_ENDPOINT: '/uploadMediaFile',

  // ポストデータ書き込み用エンドポイント
  WRITE_POST_DATA_ENDPOINT: '/writePostData',
};
