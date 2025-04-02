import { ImagePath } from '../components/ImageListHorizontalScrolable/ImageUploader';
import { GOOGLE_DRIVE_API } from '../config';

// Google Drive API（AppsScript WebアプリケーションのAPI）のレスポンス型
interface GoogleDriveApiResponse {
  status: 'success' | 'error';
  message: string;
  fileUrl?: string;
  error?: string;
}

// Google DriveにアップロードするデータをAPIの期待する形式に変換
interface XMediaFileData {
  filename: string;
  filedata: string;
  mimeType: string;
}

interface XMediaFileUploadRequest {
  xMediaFileData: XMediaFileData[];
}

// Xポストデータの書き込み用インターフェース
interface XPostData {
  text: string;
  imageUrls: string[];
  scheduledPostTime: string | null;
  [key: string]: any; // その他のフィールド
}

interface XPostDataWriteRequest {
  xPostData: XPostData;
}

/**
 * 画像をGoogle Driveにアップロードする
 * @param imagePath アップロードする画像情報（Base64エンコードされたデータとメタ情報）
 * @returns Google DriveのURLを含むレスポンス
 */
export const uploadImageToGoogleDrive = async (
  imagePath: ImagePath,
  apiEndpoint: string
): Promise<string> => {
  if (!imagePath.fileBase64 || !imagePath.mimeType) {
    throw new Error('Base64データとMIMEタイプは必須です');
  }

  const mediaData: XMediaFileData = {
    filename: imagePath.name,
    filedata: imagePath.fileBase64,
    mimeType: imagePath.mimeType,
  };

  const requestBody: XMediaFileUploadRequest = {
    xMediaFileData: [mediaData],
  };

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`APIリクエストが失敗しました: ${response.status} ${response.statusText}`);
    }

    const data: GoogleDriveApiResponse = await response.json();

    if (data.status === 'error') {
      throw new Error(`Google Driveへのアップロードに失敗しました: ${data.message || data.error}`);
    }

    return data.fileUrl || '';
  } catch (error) {
    console.error('Google Driveアップロードエラー:', error);
    throw error;
  }
};

/**
 * 複数の画像をGoogle Driveにアップロードする
 * @param imagePaths アップロードする画像情報の配列
 * @returns アップロード後のURL付き画像情報の配列
 */
export const uploadImagesToGoogleDrive = async (
  imagePaths: ImagePath[],
  apiEndpoint: string
): Promise<ImagePath[]> => {
  const uploadPromises = imagePaths
    .filter((img) => img.fileBase64 && !img.fileUrl) // Base64データがあり、まだアップロードされていないもののみ
    .map(async (img) => {
      try {
        const fileUrl = await uploadImageToGoogleDrive(img, apiEndpoint);
        return {
          ...img,
          fileUrl,
        };
      } catch (error) {
        console.error(`画像 "${img.name}" のアップロードに失敗しました:`, error);
        return img; // エラー時は元の画像情報を返す
      }
    });

  const uploadedImages = await Promise.all(uploadPromises);

  // 元の配列内の画像を、アップロード後の情報に置き換える
  return imagePaths.map((img) => {
    const uploadedImg = uploadedImages.find(
      (uploaded) => uploaded.name === img.name && uploaded.url === img.url
    );
    return uploadedImg || img;
  });
};

/**
 * Xポストデータを保存する
 * @param postData Xポストのデータ
 * @param apiEndpoint WebアプリのAPIエンドポイント
 * @returns レスポンス
 */
export const writePostData = async (
  postData: XPostData,
  apiEndpoint: string
): Promise<GoogleDriveApiResponse> => {
  const requestBody: XPostDataWriteRequest = {
    xPostData: postData,
  };

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`APIリクエストが失敗しました: ${response.status} ${response.statusText}`);
    }

    const data: GoogleDriveApiResponse = await response.json();

    if (data.status === 'error') {
      throw new Error(`ポストデータの保存に失敗しました: ${data.message || data.error}`);
    }

    return data;
  } catch (error) {
    console.error('ポストデータ保存エラー:', error);
    throw error;
  }
};
