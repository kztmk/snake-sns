import dayjs, { Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore
import twitter from '@ambassify/twitter-text';
import { IconAlertCircle, IconBrandGoogleDrive, IconCheck, IconX } from '@tabler/icons-react';
import { EmojiClickData } from 'emoji-picker-react';
import emojiRegex from 'emoji-regex';
import { getAuth } from 'firebase/auth';
import { set } from 'firebase/database';
import { MRT_Row, MRT_TableInstance } from 'mantine-react-table';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  LoadingOverlay,
  MultiSelect,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import Mp4Image from '@/assets/images/mp4image.jpg';
import CircularWithLabel from '@/components/CircularWithLabel';
import EmojiPicker, { EmojiPickerRef } from '@/components/EmojiPicker';
import ImageListHorizontalScrolable from '@/components/ImageListHorizontalScrolable';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { RootState } from '@/store';
import { selectApiError, selectApiStatus } from '@/store/reducers/apiControllerSlice';
import { linkAndGetGoogleToken } from '@/store/reducers/googleAccessTokenSlice';
import {
  clearXPostsErrors,
  createXPost,
  selectXPostsStatus,
  updateXPost,
} from '@/store/reducers/xPostsSlice';
import { MediaDataType, XPostDataType } from '@/types/xAccounts';
import { deleteBlobFromCache, getBlobFromCache, saveBlobToCache } from '@/utils/db';
import { performUploadWorkflow } from '@/utils/googleDrive/uploadManager';
// 既存のimport文
import { BlobUrlManager, fetchAndCacheBlob, loadImage } from '@/utils/mediaCache';
import FileInput from './FileInput';

// (MediaDataType, XPostFormProps, xPostFormDefaultValue は前回の修正と同様)
interface CachedMediaDataType extends MediaDataType {
  isLoading?: boolean;
  error?: string | null;
  // isCached?: boolean; // (任意)
}

interface XPostFormProps {
  xAccountId: string;
  table: MRT_TableInstance<XPostDataType>;
  row: MRT_Row<XPostDataType>;
  xPostData: XPostDataType;
  feedBack: ({ operation, text }: { operation: string; text: string }) => void;
}

// Google API の型定義 (必要に応じて)
declare global {
  interface Window {
    gapi: any;
    google: any;
    googlePickerLoaded?: boolean;
  }
}

export const xPostFormDefaultValue: XPostDataType = {
  id: '',
  contents: '',
  postTo: '',
  inReplyToInternal: '',
  media: '',
  postSchedule: '',
};

const XPostForm: React.FC<XPostFormProps> = (props) => {
  // dayjs プラグインの初期化
  dayjs.extend(utc);
  dayjs.extend(timezone);

  const { xAccountId, table, xPostData, feedBack } = props;

  const [text, setText] = useState('');
  const [contentError, setContentError] = useState(false);
  const [pics, setPics] = useState<CachedMediaDataType[]>([]);
  const [scheduledPostTime, setScheduledPostTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReauthButton, setShowReauthButton] = useState(false);
  const [cancelUpload, setCancelUpload] = useState(false);
  const [weightedLength, setWeightedLength] = useState(0);
  const [selectedHashTags, setSelectedHashTags] = useState<string[]>([]);

  // for google drive picker
  const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(window.googlePickerLoaded || false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID; // .env から取得
  const googleDeveloperKey = import.meta.env.VITE_GOOGLE_API_KEY; // .env から取得

  // fileIdをキーとするRecordに
  const blobUrlsRef = useRef<Record<string, string>>({});
  const emojiPickerRef = useRef<EmojiPickerRef | null>(null);
  const isMounted = useRef(true);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const dispatch = useAppDispatch();
  const apiStatus = useAppSelector(selectApiStatus);
  const apiError = useAppSelector(selectApiError);
  const {
    isLoading: isPostLoading,
    isError: isPostError,
    errorMessage: postErrorMessage,
    process,
  } = useAppSelector(selectXPostsStatus);
  const { isAuthLoading: isTokenLoading, googleAccessToken } = useAppSelector(
    (state: RootState) => state.googleAccessTokenState
  );
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    return null; // ユーザーがサインインしていない場合は何も表示しない
  }

  // BlobURLマネージャーのインスタンスを作成
  const blobUrlManager = useMemo(() => new BlobUrlManager(), []);
  // コンポーネントのアンマウント時にBlobURLを解放
  useEffect(() => {
    return () => {
      blobUrlManager.releaseAll();
    };
  }, [blobUrlManager]);

  // ★ Blob URL 解放処理 ★
  // revokeAllBlobUrlsを置き換え
  const revokeAllBlobUrls = useCallback(() => {
    blobUrlManager.releaseAll();
    // pics state の imgUrl もクリア (表示を更新するため)
    setPics((prevPics) => prevPics.map((p) => ({ ...p, imgUrl: '' })));
  }, [blobUrlManager]);

  const countEmoji = useCallback((text: string): number => {
    const regex = emojiRegex();
    const emojis = text.match(regex) || [];
    return emojis.length;
  }, []);

  // Picker API のロード状態を監視
  useEffect(() => {
    const handlePickerLoad = () => {
      setIsPickerApiLoaded(true);
    };
    if (window.googlePickerLoaded) {
      setIsPickerApiLoaded(true);
    } else {
      // イベントリスナーでロード完了を待つ
      window.addEventListener('google-picker-loaded', handlePickerLoad);
    }
    return () => {
      window.removeEventListener('google-picker-loaded', handlePickerLoad);
    };
  }, []);

  // Xポストのステータスが変化したときの処理
  useEffect(() => {
    if (isPostError) {
      setIsSubmitting(false);
      setErrorMessage(postErrorMessage);
      notifications.show({
        title: 'エラー',
        message: postErrorMessage,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } else if (!isPostLoading && (process === 'addNew' || process === 'update') && isSubmitting) {
      setIsSubmitting(false);
      setCancelUpload(false);
      console.log('投稿処理完了:', process);
      // フィードバックと画面遷移を処理
      feedBack({ operation: process, text: text.substring(0, 30) + '...' });

      // 投稿の作成または更新が成功した場合、テーブルの表示状態をリセット
      if (xPostData.id === '') {
        table.setCreatingRow(null);
      } else {
        table.setEditingRow(null);
      }

      // メモリリークを防ぐためにリソースをクリーンアップ
      pics.forEach((pic) => {
        if (pic.imgUrl && pic.imgUrl.startsWith('blob:')) {
          URL.revokeObjectURL(pic.imgUrl);
        }
      });
    }
  }, [
    isPostLoading,
    isPostError,
    process,
    isSubmitting,
    feedBack,
    table,
    xPostData.id,
    postErrorMessage,
    revokeAllBlobUrls,
  ]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      pics.forEach((pic) => {
        if (pic.imgUrl && pic.imgUrl.startsWith('blob:')) {
          URL.revokeObjectURL(pic.imgUrl);
        }
      });
    };
  }, []);

  const handleLoadImage = useCallback(
    async (picData: CachedMediaDataType, currentToken: string | null) => {
      const { fileId, mimeType } = picData;

      return loadImage(fileId, currentToken, mimeType, {
        onLoadingStart: (fileId) => {
          setPics((prevPics) =>
            prevPics.map((p) => (p.fileId === fileId ? { ...p, isLoading: true, error: null } : p))
          );
        },
        onSuccess: (fileId, objectUrl) => {
          if (isMounted.current) {
            if (objectUrl !== Mp4Image) {
              blobUrlManager.addUrl(fileId, objectUrl);
            }
            setPics((prevPics) =>
              prevPics.map((p) =>
                p.fileId === fileId ? { ...p, imgUrl: objectUrl, isLoading: false, error: null } : p
              )
            );
          } else if (objectUrl !== Mp4Image) {
            URL.revokeObjectURL(objectUrl);
          }
        },
        onError: (fileId, error) => {
          if (isMounted.current) {
            setPics((prevPics) =>
              prevPics.map((p) =>
                p.fileId === fileId ? { ...p, isLoading: false, error: String(error) } : p
              )
            );
          }
        },
      });
    },
    []
  );

  // 初期データ読み込みと画像ロードトリガー
  useEffect(() => {
    setText(xPostData.contents || '');
    if (xPostData.postSchedule) {
      setScheduledPostTime(new Date(xPostData.postSchedule));
    } else {
      setScheduledPostTime(null);
    }

    setPics([]);
    revokeAllBlobUrls();

    let currentToken = googleAccessToken; // 現在のトークン

    const loadInitialPics = async (token: string | null) => {
      let initialPics: CachedMediaDataType[] = [];
      if (xPostData.media) {
        try {
          const mediaItems = JSON.parse(xPostData.media as string);
          if (Array.isArray(mediaItems) && mediaItems.length > 0) {
            initialPics = mediaItems.map(
              (item): CachedMediaDataType => ({
                file: null,
                fileName: item.fileName || item.filename || '',
                fileId: item.fileId || '',
                mimeType: item.mimeType || '',
                imgUrl: '', // 初期は空
                isLoading: !!item.fileId, // fileId があればロード開始フラグ
                error: null,
              })
            );
          }
        } catch (error) {
          console.error('Error parsing media items:', error);
        }
      }

      if (isMounted.current) {
        setPics(initialPics); // まずメタデータで state を更新
        // 各画像のロードを開始
        initialPics.forEach((pic) => {
          if (pic.fileId) {
            handleLoadImage(pic, token); // 修正: handleLoadImage を使用
          }
        });
      }
    };

    // トークンがあればすぐにロード開始、なければ取得を待つ（取得後に再度この Effect が動く）
    loadInitialPics(currentToken);

    if (xPostData.contents) {
      /* ... テキスト長計算 ... */
      setWeightedLength(twitter.parseTweet(xPostData.contents).weightedLength);
    }
  }, [xPostData, countEmoji, handleLoadImage, googleAccessToken, revokeAllBlobUrls]); // ★ loadImage, googleAccessToken を依存配列に追加

  const insertAtPos = useCallback(
    (emojiData: EmojiClickData) => {
      const taRef = textAreaRef.current;
      if (taRef) {
        const startPos = taRef.selectionStart;
        const endPos = taRef.selectionEnd;
        const newText =
          taRef.value.substring(0, startPos) +
          emojiData.emoji +
          taRef.value.substring(endPos, taRef.value.length);
        setText(newText);
        const response = twitter.parseTweet(newText);
        const emojiCount = countEmoji(newText);
        setWeightedLength(response.weightedLength + emojiCount);
      }
      emojiPickerRef.current?.setShowEmoji(false);
    },
    [countEmoji]
  );

  const insertAtEnd = useCallback(
    (selectedOptions: string[]) => {
      const taRef = textAreaRef.current;
      if (taRef) {
        let text = taRef.value;
        for (let i = 0; i < selectedHashTags.length; i++) {
          text = text.replace(selectedHashTags[i], '');
          text = text.replace('  ', ' ');
        }
        setSelectedHashTags(selectedOptions);
        const newPost = text + ' ' + selectedOptions.join(' ');
        setText(newPost);
        const response = twitter.parseTweet(newPost);
        const emojiCount = countEmoji(newPost);
        setWeightedLength(response.weightedLength + emojiCount);
      }
    },
    [selectedHashTags, countEmoji]
  );

  // addImage: ローカルファイル追加時の処理 (Blob URL 生成、IndexedDB には保存しない)
  // addImage: 動画ファイルの場合の処理を追加
  const addImage = useCallback((newPicData: MediaDataType) => {
    const file = newPicData.file;
    if (file) {
      let imgUrl = '';
      let isVideo = file.type.startsWith('video/');
      const mimeType = file.type;
      let tempKey: string | null = null; // Blob URL 解放用のキー

      if (isVideo) {
        imgUrl = Mp4Image; // 動画ならデフォルト画像
      } else if (file.type.startsWith('image/')) {
        imgUrl = URL.createObjectURL(file); // 画像なら Blob URL
        tempKey = `local_${newPicData.fileName}_${Date.now()}`;
        blobUrlsRef.current[tempKey] = imgUrl; // Ref に保存
      } else {
        notifications.show({
          message: '画像または動画ファイルを選択してください。',
          color: 'orange',
        });
        return; // 対応外ファイルなら追加しない
      }

      const newPic: CachedMediaDataType = {
        ...newPicData,
        fileId: '', // ローカルファイルなので fileId は空
        imgUrl: imgUrl,
        mimeType: mimeType, // ★ mimeType をセット ★
        isLoading: false,
        error: null,
      };
      setPics((oldPics) => [...oldPics, newPic]);
    }
  }, []);

  // removeImage: Blob URL 解放処理
  const removeImage = useCallback((targetFileName: string) => {
    setPics((oldPics) => {
      const picToRemove = oldPics.find((pic) => pic.fileName === targetFileName);
      // 対応する Blob URL を Ref から見つけて解放
      let keyToRemove: string | null = null;
      if (picToRemove?.imgUrl) {
        const entry = Object.entries(blobUrlsRef.current).find(
          ([key, url]) => url === picToRemove.imgUrl
        );
        if (entry) {
          keyToRemove = entry[0];
          URL.revokeObjectURL(picToRemove.imgUrl);
          delete blobUrlsRef.current[keyToRemove]; // Ref からも削除
        }
      }
      // (任意) IndexedDB からも削除する場合
      if (picToRemove?.fileId) {
        deleteBlobFromCache(picToRemove.fileId);
      }
      return oldPics.filter((pic) => pic.fileName !== targetFileName);
    });
  }, []);

  const textParse = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setText(e.currentTarget.value);
      if (e.currentTarget.value.length > 0) {
        setContentError(false);
      }
      const response = twitter.parseTweet(e.currentTarget.value);
      const emojiCount = countEmoji(e.currentTarget.value);
      setWeightedLength(response.weightedLength + emojiCount);
    },
    [countEmoji]
  );

  const handleSubmit = async () => {
    if (text === '') {
      setContentError(true);
      setErrorMessage('投稿内容を入力してください');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setShowReauthButton(false);
    let finalMediaData: CachedMediaDataType[] = [];
    try {
      // 画像がある場合、アップロード
      if (pics.length > 0) {
        // すでにアップロード済みの画像（fileIdがある）とそうでないものを分ける
        const uploadTargets = pics.filter((pic) => !pic.fileId && pic.file);
        const existingMedia = pics.filter((pic) => pic.fileId);
        const postMedia: CachedMediaDataType[] = [];

        finalMediaData = [...existingMedia]; // まずは既存のメディアをセット
        if (uploadTargets.length > 0) {
          let currentToken = googleAccessToken;
          // 1. 実行前にトークンを確認・取得
          if (!currentToken) {
            console.log('No initial token, attempting to get one...');
            const resultAction = await dispatch(linkAndGetGoogleToken());
            if (linkAndGetGoogleToken.fulfilled.match(resultAction)) {
              currentToken = resultAction.payload.accessToken;
            } else {
              setErrorMessage(resultAction.payload?.message ?? 'Google連携/認証が必要です。');
              setShowReauthButton(true); // 失敗したら再認証ボタン表示
              setIsSubmitting(false); // ローディング解除
              return; // 中断
            }
          }

          if (!currentToken) {
            // 再度チェック
            setErrorMessage('Googleアクセストークンを取得できませんでした。');
            setShowReauthButton(true);
            setIsSubmitting(false);
            return;
          }
          let successfulUploads: MediaDataType[] = [];
          let needsReauth = false;
          // 2. メディアをアップロード
          for (const pic of uploadTargets) {
            if (pic.file) {
              const notificationId = notifications.show({
                title: `${pic.fileName}をアップロード中`,
                message: 'しばらくお待ちください',
                loading: true,
                autoClose: false,
              });
              const result = await performUploadWorkflow({
                selectedFile: pic.file,
                user: user,
                googleAccessToken: currentToken,
                dispatch,
              });
              if (result.success && result.uploadData) {
                notifications.update({
                  id: notificationId,
                  title: 'アップロード完了',
                  message: result.message,
                  color: 'green',
                  icon: <IconCheck />,
                  autoClose: 5000,
                });
                // アップロード成功
                successfulUploads.push({
                  file: pic.file,
                  fileId: result.uploadData.fileId,
                  fileName: result.uploadData.fileName,
                  mimeType: result.uploadData.mimeType,
                  imgUrl: result.uploadData.imageUrl ?? '',
                });
                // ★★★ アップロード成功後、すぐにキャッシュ ★★★
                if (pic.file) {
                  // 元のファイル Blob を使う
                  await saveBlobToCache(result.uploadData.fileId, pic.file);
                } else {
                  // もし pic.file がない場合 (理論上ここには来ないはずだが)
                  fetchAndCacheBlob(result.uploadData.fileId, currentToken); // Driveから再取得してキャッシュ
                }
                // ★★★★★★★★★★★★★★★★★★★★★★★★
              } else {
                notifications.update({
                  id: notificationId,
                  title: 'アップロード失敗',
                  message: result.message,
                  color: 'red',
                  icon: <IconAlertCircle />,
                });
                setErrorMessage(result.message);
                if (result.needsReauth) {
                  // 再認証が必要な場合
                  needsReauth = true;
                  break;
                }
              }
            }
          }

          if (needsReauth) {
            setShowReauthButton(true);
            setIsSubmitting(false);
            // 処理中断
            return;
          }
          // 3. アップロード成功したメディアを追加
          finalMediaData = [...existingMedia, ...successfulUploads];
        }
      }

      // 新しいポストデータを作成
      const newPost: XPostDataType = {
        id: xPostData.id || '',
        contents: text,
        media: finalMediaData.length > 0 ? JSON.stringify(finalMediaData) : '',
        // ローカルタイムゾーン情報を保持した形式で保存
        postSchedule: scheduledPostTime
          ? dayjs(scheduledPostTime).format('YYYY-MM-DDTHH:mm:ssZ')
          : null,
        postTo: xAccountId || '',
        inReplyToInternal: xPostData.inReplyToInternal || '',
      };

      // 新規作成または更新
      if (!xPostData.id) {
        await dispatch(createXPost({ xAccountId, xPost: newPost }));
      } else {
        await dispatch(updateXPost({ xAccountId, xPost: newPost }));
      }
    } catch (error) {
      console.error('投稿処理エラー:', error);
      setIsSubmitting(false);
      setErrorMessage('投稿処理中にエラーが発生しました');
    }
  };

  const handleCancel = useCallback(() => {
    if (isPostError) {
      dispatch(clearXPostsErrors());
    }
    pics.forEach((pic) => {
      if (pic.imgUrl && pic.imgUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pic.imgUrl);
      }
    });
    if (xPostData.id === '') {
      table.setCreatingRow(null);
    } else {
      table.setEditingRow(null);
    }
  }, [isPostError, pics, xPostData.id, dispatch, table]);

  const clearErrors = useCallback(() => {
    setErrorMessage(null);
    dispatch(clearXPostsErrors());
  }, [dispatch]);

  const handleReset = useCallback(() => {
    setText('');
    setContentError(false);
    pics.forEach((pic) => {
      if (pic.imgUrl && pic.imgUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pic.imgUrl);
      }
    });
    setPics([]);
    setScheduledPostTime(null);
    setSelectedHashTags([]);
    setWeightedLength(0);
    clearErrors();
  }, [pics, clearErrors]);

  const handleReAuthClick = useCallback(async () => {
    const resultAction = await dispatch(linkAndGetGoogleToken());
    if (linkAndGetGoogleToken.rejected.match(resultAction)) {
      setErrorMessage(`Google連携/認証に失敗しました: ${resultAction.payload}`);
    } else {
      notifications.show({
        title: '成功',
        message: 'Google Driveへのアクセス許可を更新しました。再度アップロードをお試しください。',
        color: 'green',
        icon: <IconCheck />,
      });
    }
  }, [dispatch]);

  const handleCancelUpload = useCallback(() => {
    setCancelUpload(true);
  }, []);

  // Google Picker を開く処理
  const handleOpenPicker = useCallback(async () => {
    if (!isPickerApiLoaded) {
      notifications.show({
        title: '準備中',
        message: 'Google Picker API のロード待機中です。',
        color: 'blue',
      });
      return;
    }

    let currentToken = googleAccessToken;

    // トークンがなければ取得試行
    if (!currentToken) {
      const resultAction = await dispatch(linkAndGetGoogleToken());
      if (linkAndGetGoogleToken.fulfilled.match(resultAction)) {
        currentToken = resultAction.payload.accessToken;
      } else {
        notifications.show({
          title: '認証エラー',
          message: resultAction.payload?.message ?? 'Googleアカウントとの連携が必要です。',
          color: 'red',
        });
        // 必要なら再認証ボタン表示などの処理
        setShowReauthButton(true);
        return;
      }
    }

    if (!currentToken) {
      notifications.show({
        title: 'エラー',
        message: 'Googleアクセストークンを取得できませんでした。',
        color: 'red',
      });
      setShowReauthButton(true);
      return;
    }

    // Picker の設定と表示
    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    // 画像と動画のみ表示・選択可能にする
    view.setMimeTypes('image/png,image/jpeg,image/jpg,image/gif,video/mp4,video/quicktime'); // 必要に応じてMIMEタイプを追加

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN) // ナビゲーションを隠す (任意)
      .setAppId(googleClientId) // App ID (Client ID) を設定
      .setOAuthToken(currentToken) // OAuth トークンを設定
      .addView(view)
      // .addView(new window.google.picker.DocsUploadView()) // アップロードビューも追加する場合
      .setDeveloperKey(googleDeveloperKey) // API キーを設定
      .setCallback(pickerCallback) // コールバック関数を設定
      .build();
    picker.setVisible(true);
  }, [isPickerApiLoaded, googleAccessToken, dispatch, googleClientId, googleDeveloperKey]);

  // Picker でファイルが選択されたときのコールバック
  const pickerCallback = useCallback(
    (data: any) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const docs = data.docs;
        if (docs && docs.length > 0) {
          const newPics: CachedMediaDataType[] = [];
          docs.forEach((doc: any) => {
            console.log('Selected Google Drive file:', doc);
            const fileId = doc.id;
            const fileName = doc.name;
            const mimeType = doc.mimeType;
            // サムネイルURLがあれば使う (なければ handleLoadImage で取得)
            const thumbnailUrl =
              doc.thumbnails && doc.thumbnails.length > 0 ? doc.thumbnails[0].url : '';

            const newPicData: CachedMediaDataType = {
              file: null, // Drive から選択したので File オブジェクトは null
              fileId: fileId,
              fileName: fileName,
              mimeType: mimeType,
              imgUrl: thumbnailUrl, // 初期はサムネイル or 空
              isLoading: true, // これからロードする
              error: null,
            };
            newPics.push(newPicData);

            // サムネイル表示のために画像をロード (既存の handleLoadImage を利用)
            // 注意: handleLoadImage が Google Drive のサムネイル取得に対応しているか確認
            // 必要であれば handleLoadImage を修正するか、ここで直接 Blob を取得して表示
            handleLoadImage(newPicData, googleAccessToken); // トークンを渡す
          });

          // 既存の画像と合わせて4枚以下かチェック
          if (pics.length + newPics.length > 4) {
            notifications.show({
              title: '制限超過',
              message: '画像/動画は合計4つまで選択できます。',
              color: 'orange',
            });
            // 4枚を超える分は追加しない (最初の数枚だけ追加するなどの調整も可能)
            const remainingSlots = 4 - pics.length;
            setPics((oldPics) => [...oldPics, ...newPics.slice(0, remainingSlots)]);
          } else {
            setPics((oldPics) => [...oldPics, ...newPics]);
          }
        }
      } else if (data.action === window.google.picker.Action.CANCEL) {
        console.log('Google Picker was cancelled.');
      }
    },
    [pics.length, handleLoadImage, googleAccessToken, setPics, notifications]
  );

  return (
    <Grid>
      <Grid.Col span={12}>
        <Card withBorder>
          <LoadingOverlay visible={isSubmitting} />
          {errorMessage && (
            <Alert
              color="red"
              title="エラー"
              withCloseButton={!showReauthButton}
              onClose={clearErrors}
              mb="md"
            >
              {errorMessage}
              {showReauthButton && (
                <Button
                  mt="sm"
                  variant="outline"
                  color="red"
                  onClick={handleReAuthClick}
                  loading={isTokenLoading}
                >
                  {isTokenLoading ? '認証中...' : 'Google 再認証'}
                </Button>
              )}
            </Alert>
          )}
          <Card.Section p="12px 24px 12px 24px">
            <Stack>
              <Textarea
                error={contentError ? '投稿内容を入力してください' : null}
                id="x-post-form-textarea"
                placeholder="いまどうしてる？"
                autosize
                minRows={5}
                ref={textAreaRef}
                value={text}
                onChange={textParse}
              />
              {pics.length > 0 && (
                <ImageListHorizontalScrolable pics={pics} removeImage={removeImage} />
              )}
              <Group gap="md">
                <FileInput onChange={addImage} disabled={pics.length > 3} />
                {/* Google Drive ボタン */}
                <Tooltip label="Google Drive から画像を選択">
                  <ActionIcon
                    size={36}
                    variant="filled"
                    onClick={handleOpenPicker}
                    disabled={!isPickerApiLoaded || pics.length >= 4} // APIロード前や上限到達時は無効化
                    loading={!isPickerApiLoaded && !window.googlePickerLoaded} // ロード中はローディング表示
                  >
                    <IconBrandGoogleDrive size={48} />
                  </ActionIcon>
                </Tooltip>
                <EmojiPicker onSelectedEmoji={insertAtPos} ref={emojiPickerRef} />
                <CircularWithLabel value={weightedLength} size={48} />
                <Text c="dimmed" mx="md">
                  {weightedLength}/280文字
                </Text>
              </Group>
              <Box>
                <Stack align="center">
                  <DateTimePicker
                    label="予約設定"
                    value={scheduledPostTime}
                    onChange={setScheduledPostTime}
                    minDate={dayjs().add(1, 'hour').toDate()}
                    clearable
                    w="100%"
                  />
                </Stack>
              </Box>
            </Stack>
          </Card.Section>
          <Divider />
          <Card.Section>
            <Group justify="end" gap="xs" px="md" py="xs">
              <Button variant="outline" color="yellow" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button variant="outline" color="gray" onClick={handleReset}>
                リセット
              </Button>
              <Button
                variant="outline"
                color="blue"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={text.trim() === '' || weightedLength > 280}
              >
                保存
              </Button>
            </Group>
          </Card.Section>
        </Card>
      </Grid.Col>
    </Grid>
  );
};

export default React.memo(XPostForm);
