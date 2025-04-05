import dayjs, { Dayjs } from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import twitter from '@ambassify/twitter-text';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { EmojiClickData } from 'emoji-picker-react';
import emojiRegex from 'emoji-regex';
import { set } from 'firebase/database';
import { MRT_Row, MRT_TableInstance } from 'mantine-react-table';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  Divider,
  Grid,
  Group,
  LoadingOverlay,
  MultiSelect,
  NumberInput,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import CircularWithLabel from '@/components/CircularWithLabel';
import EmojiPicker, { EmojiPickerRef } from '@/components/EmojiPicker';
import ImageListHorizontalScrolable from '@/components/ImageListHorizontalScrolable';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { RootState } from '@/store';
import { linkAndGetGoogleToken } from '@/store/reducers/googleAccessTokenSlice';
import {
  clearXPostsErrors,
  createXPost,
  selectXPosts,
  selectXPostsStatus,
  updateXPost,
} from '@/store/reducers/xPostsSlice';
import { MediaDataType, XPostDataType, XPostImageDataType } from '@/types/xAccounts';
import { performUploadWorkflow } from '@/utils/googleDrive/uploadManager';
import FileInput from './FileInput';

interface XPostFormProps {
  xAccountId: string;
  table: MRT_TableInstance<XPostDataType>;
  row: MRT_Row<XPostDataType>;
  xPostData: XPostDataType;
  feedBack: ({ operation, text }: { operation: string; text: string }) => void;
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
  const [text, setText] = useState('');
  const [contentError, setContentError] = useState(false);
  const [pics, setPics] = useState<MediaDataType[]>([]);
  const [scheduledPostTime, setScheduledPostTime] = useState<Date | null>(null);
  const [timeStamp, setTimeStamp] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReauthButton, setShowReauthButton] = useState(false);
  const [cancelUpload, setCancelUpload] = useState(false);

  const [weightedLength, setWeightedLength] = useState(0);
  const [selectedHashTags, setSelectedHashTags] = useState<string[]>([]);
  const emojiPickerRef = useRef<EmojiPickerRef | null>(null);

  const { xAccountId, table, xPostData, feedBack } = props;

  const dispatch = useAppDispatch();

  const {
    isLoading,
    isError,
    errorMessage: postErrorMessage,
    process,
  } = useAppSelector(selectXPostsStatus);
  const {
    isAuthLoading: isTokenLoading,
    error,
    googleAccessToken,
  } = useAppSelector((state: RootState) => state.googleAccessTokenState);

  // Xポストのステータスが変化したときの処理
  useEffect(() => {
    if (isError) {
      setIsSubmitting(false);
      setErrorMessage(postErrorMessage);
      notifications.show({
        title: 'エラー',
        message: postErrorMessage,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } else if (!isLoading && (process === 'addNew' || process === 'update') && isSubmitting) {
      setIsSubmitting(false);
      setCancelUpload(false);

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
  }, [isLoading, isError, process]);

  useEffect(() => {
    const fetchImageData = async () => {
      if (xPostData.media) {
        try {
          // メディアデータをJSONとしてパース
          const mediaItems = JSON.parse(xPostData.media as string);

          if (Array.isArray(mediaItems) && mediaItems.length > 0) {
            const loadedPics: MediaDataType[] = mediaItems.map((item) => ({
              file: item.fileId ? null : item.file,
              fileName: item.filename || '',
              fileId: item.fileId || '',
              mimeType: item.mimeType || '',
              imgUrl: item.imgUrl,
            }));

            setPics(loadedPics);
          }
        } catch (error) {
          console.error('メディアデータのパースエラー:', error);
        }
      }
    };

    setText(xPostData.contents || xPostData.id || 'null');

    if (xPostData.postSchedule) {
      setScheduledPostTime(dayjs(xPostData.postSchedule).toDate());
    }

    if (xPostData.media) {
      fetchImageData();
    } else {
      setPics([]);
    }

    // テキスト長さの計算
    if (xPostData.contents) {
      const response = twitter.parseTweet(xPostData.contents);
      const emojiCount = countEmoji(xPostData.contents);
      setWeightedLength(response.weightedLength + emojiCount);
    }
  }, []);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtPos = (emojiData: EmojiClickData) => {
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
  };

  const insertAtEnd = (selectedOptions: string[]) => {
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
  };

  const addImage = (newPic: MediaDataType) => {
    setPics((oldPics) => [...oldPics, newPic]);
  };

  const removeImage = (path: string) => {
    const removedPic = pics.find((pic) => pic.fileName === path);
    if (removedPic) {
      URL.revokeObjectURL(removedPic.imgUrl);
    }
    setPics((oldPics) => oldPics.filter((pic) => pic.fileName !== path));
  };

  const dayjsConvertToString = (date: Dayjs | null | undefined): string | null => {
    if (!date) {
      return null;
    } else {
      return dayjs(date).format('YYYY-MM-DDTHH:mm:ss');
    }
  };

  const handleSubmit = async () => {
    if (text === '') {
      setContentError(true);
      setErrorMessage('投稿内容を入力してください');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setShowReauthButton(false);
    let finalMediaData: MediaDataType[] = [];
    try {
      // 画像がある場合、アップロード
      if (pics.length > 0) {
        // すでにアップロード済みの画像（fileIdがある）とそうでないものを分ける
        const uploadTargets = pics.filter((pic) => !pic.fileId && pic.file);
        const existingMedia = pics.filter((pic) => pic.fileId);
        const postMedia: MediaDataType[] = [];

        if (uploadTargets.length > 0) {
          let currentToken = googleAccessToken;
          // 1. 実行前にトークンを確認・取得
          if (!currentToken) {
            console.log('No initial token, attempting to get one...');
            const resultAction = await dispatch(linkAndGetGoogleToken());
            if (linkAndGetGoogleToken.fulfilled.match(resultAction)) {
              currentToken = resultAction.payload.accessToken;
            } else {
              setErrorMessage(resultAction.payload ?? 'Google連携/認証が必要です。');
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
        postSchedule: scheduledPostTime ? scheduledPostTime.toISOString() : null,
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

  const handleCancel = () => {
    if (isError) {
      dispatch(clearXPostsErrors());
    }
    if (xPostData.id === '') {
      table.setCreatingRow(null);
    } else {
      table.setEditingRow(null);
    }
  };

  const clearErrors = () => {
    setErrorMessage(null);
    dispatch(clearXPostsErrors());
  };

  const handleReset = () => {
    setText('');
    setContentError(false);
    setPics([]);
    setScheduledPostTime(null);
    setSelectedHashTags([]);
    setWeightedLength(0);
    clearErrors();
  };

  const countEmoji = (text: string): number => {
    const regex = emojiRegex();
    const emojis = text.match(regex) || [];
    return emojis.length;
  };

  const textParse = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setText(e.currentTarget.value);
    if (e.currentTarget.value.length > 0) {
      setContentError(false);
    }
    const response = twitter.parseTweet(e.currentTarget.value);
    const emojiCount = countEmoji(e.currentTarget.value);
    setWeightedLength(response.weightedLength + emojiCount);
  };

  const handleCancelUpload = () => {
    setCancelUpload(true);
  };
  // 再認証ボタンクリック
  const handleReAuthClick = async () => {
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
  };

  return (
    <Grid>
      <Grid.Col span={12}>
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Group justify="space-between">
              <Text fw={500} size="lg">
                {xPostData.id === '' ? '新規Xポスト作成' : 'Xポスト編集'}
                {`:@${xAccountId}`}
              </Text>
              <ActionIcon onClick={handleCancel} variant="transparent">
                <IconX />
              </ActionIcon>
            </Group>
          </Card.Section>
          <LoadingOverlay visible={isSubmitting} />
          {errorMessage && (
            <Alert
              color="red"
              title="エラー"
              withCloseButton={!showReauthButton}
              onClose={() => clearErrors()}
              mb="md"
            >
              {errorMessage}
              {/* 再認証が必要なエラーメッセージの場合にボタン表示 */}
              {showReauthButton && (
                <Button
                  mt="sm"
                  variant="outline"
                  color="red"
                  onClick={handleReAuthClick}
                  loading={isTokenLoading} // isAuthLoading は Thunk 実行中フラグ
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
                onChange={(e) => textParse(e)}
              />
              {pics.length > 0 && (
                <ImageListHorizontalScrolable pics={pics} removeImage={removeImage} />
              )}
              <Group gap="md">
                <FileInput
                  onChange={(newPic: MediaDataType) => addImage(newPic)}
                  disabled={pics.length > 3}
                />
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

export default XPostForm;
