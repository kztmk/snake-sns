// src/features/upload/uploadToGDriveFirebase.ts (例)

// --- 型定義 ---
// UploadSuccessResult と UploadErrorResult は uploadManager.ts と共有するか、
// 共通の型定義ファイルに置くのが良いでしょう。ここでは再掲します。

export interface UploadSuccessResult {
  error?: false;
  fileId: string;
  imageUrl: string | null;
  fileName: string;
  mimeType: string;
}

export interface UploadErrorResult {
  error: true;
  message: string;
  status?: number;
  details?: any;
}

type UploadFunctionResult = UploadSuccessResult | UploadErrorResult;

/**
 * 指定されたファイルをユーザーのGoogle Driveにアップロードし、
 * File IDや画像表示URL（画像の場合）を含む結果を返します。
 *
 * @param file アップロードする File オブジェクト
 * @param accessToken Google API呼び出しに使用するアクセストークン (nullでないこと)
 * @returns アップロード結果 (UploadSuccessResult) またはエラー情報 (UploadErrorResult) を解決する Promise
 */
export async function uploadFileToGoogleDrive(
  file: File,
  accessToken: string // この関数が呼ばれる時点でトークンは有効なはずなので null を許容しない
): Promise<UploadFunctionResult> {
  // 引数チェック (file は呼び出し元でチェック済みと仮定)
  if (!accessToken) {
    // 基本的に uploadManager から呼ばれる際にはチェック済みのはず
    console.error('uploadFileToGoogleDrive called without accessToken');
    return { error: true, message: 'アクセストークンが必要です。' };
  }

  const isImage = file.type.startsWith('image/');
  // isVideo はここでは直接使わないが、ログ等で役立つかも
  // const isVideo = file.type.startsWith('video/');

  try {
    // 1. Google Drive にファイルをアップロード
    console.log(`(uploadFileToGoogleDrive) Uploading "${file.name}"...`);
    const metadata = {
      name: file.name,
      mimeType: file.type,
      // parents: ['YOUR_FOLDER_ID'] // 特定のフォルダに入れたい場合
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    // ★ レスポンスボディを先に取得しておく (エラー時も必要) ★
    const uploadResponseBody = await uploadResponse.json().catch(() => ({}));

    if (!uploadResponse.ok) {
      const errorMessage =
        uploadResponseBody?.error?.message ||
        uploadResponse.statusText ||
        '不明なアップロードエラー';
      console.error(
        '(uploadFileToGoogleDrive) Upload failed:',
        uploadResponse.status,
        uploadResponseBody
      );
      return {
        error: true,
        message: `ファイルアップロード失敗: ${errorMessage}`,
        status: uploadResponse.status, // ★ ステータスコードを返す
        details: uploadResponseBody,
      };
    }

    const uploadedFileData = uploadResponseBody;
    const newFileId = uploadedFileData.id as string;
    if (!newFileId) {
      console.error(
        '(uploadFileToGoogleDrive) Upload succeeded but no File ID returned:',
        uploadedFileData
      );
      return {
        error: true,
        message: 'アップロード成功しましたが、File IDを取得できませんでした。',
        details: uploadedFileData,
      };
    }
    console.log(`(uploadFileToGoogleDrive) File uploaded, ID: ${newFileId}`);

    let imageUrl: string | null = null;

    // 2. 画像の場合のみ、共有設定を変更し、表示用URLを生成
    if (isImage) {
      console.log(`(uploadFileToGoogleDrive) Setting permissions for image (ID: ${newFileId})...`);
      try {
        const permissionResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${newFileId}/permissions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'anyone',
            }),
          }
        );

        const permissionResponseBody = await permissionResponse.json().catch(() => ({}));

        if (!permissionResponse.ok) {
          const errorMessage =
            permissionResponseBody?.error?.message ||
            permissionResponse.statusText ||
            '不明な権限エラー';
          // 権限設定エラーは警告に留め、imageUrl を null のままにする
          console.warn(
            `(uploadFileToGoogleDrive) Failed to set public permission (continuing): ${errorMessage}`,
            permissionResponseBody
          );
        } else {
          console.log('(uploadFileToGoogleDrive) File permissions set to public readable.');
          imageUrl = `https://drive.google.com/uc?export=view&id=${newFileId}`;
        }
      } catch (permError) {
        console.warn(
          `(uploadFileToGoogleDrive) Error occurred while setting permissions: ${permError}`
        );
        // imageUrl は null のまま
      }
    }

    // 3. 成功結果を返す
    console.log(`(uploadFileToGoogleDrive) Returning success for File ID: ${newFileId}`);
    return {
      // error: false, // 省略可能
      fileId: newFileId,
      imageUrl: imageUrl,
      fileName: file.name,
      mimeType: file.type,
    };
  } catch (err) {
    // fetch 自体の失敗など
    console.error('(uploadFileToGoogleDrive) Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました。';
    return {
      error: true,
      message: `アップロード処理中に予期せぬエラーが発生しました: ${errorMessage}`,
      details: err,
    };
  }
}
