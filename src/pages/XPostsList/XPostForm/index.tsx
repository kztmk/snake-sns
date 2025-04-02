import dayjs, { Dayjs } from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import twitter from '@ambassify/twitter-text';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { EmojiClickData } from 'emoji-picker-react';
import emojiRegex from 'emoji-regex';
import { MRT_Row, MRT_TableInstance } from 'mantine-react-table';
import {
  Alert,
  Box,
  Button,
  Card,
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
import {
  selectApiError,
  selectApiStatus,
  selectUploadedMedia,
  uploadMultipleMedia,
} from '@/store/reducers/apiControllerSlice';
import { createXPost, updateXPost } from '@/store/reducers/xPostsSlice';
import { MediaDataType, XPostDataType, XPostImageDataType } from '@/types/xAccounts';
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

  const [weightedLength, setWeightedLength] = useState(0);
  const [selectedHashTags, setSelectedHashTags] = useState<string[]>([]);
  const emojiPickerRef = useRef<EmojiPickerRef | null>(null);

  const { xAccountId, table, xPostData, feedBack } = props;

  const dispatch = useAppDispatch();
  const apiStatus = useAppSelector(selectApiStatus);
  const apiError = useAppSelector(selectApiError);
  const uploadedMedia = useAppSelector(selectUploadedMedia);
  const xPostsStatus = useAppSelector((state: RootState) => state.xPosts);

  // Xポストのステータスが変化したときの処理
  useEffect(() => {
    if (xPostsStatus.isError) {
      setIsSubmitting(false);
      setErrorMessage(xPostsStatus.errorMessage);
      notifications.show({
        title: 'エラー',
        message: xPostsStatus.errorMessage,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } else if (!xPostsStatus.isLoading && xPostsStatus.process === 'idle' && isSubmitting) {
      setIsSubmitting(false);
      notifications.show({
        title: '成功',
        message: 'Xポストが正常に保存されました',
        color: 'green',
        icon: <IconCheck />,
      });
      feedBack({ operation: 'success', text: 'Xポストが正常に保存されました' });

      // 投稿の作成または更新が成功した場合、テーブルの表示状態をリセット
      if (xPostData.id === '') {
        table.setCreatingRow(null);
      } else {
        table.setEditingRow(null);
      }
    }
  }, [xPostsStatus, isSubmitting, feedBack, table, xPostData.id]);

  useEffect(() => {
    const fetchImageData = async () => {
      if (xPostData.media) {
        try {
          // メディアデータをJSONとしてパース
          const mediaItems = JSON.parse(xPostData.media as string);

          if (Array.isArray(mediaItems) && mediaItems.length > 0) {
            const loadedPics: MediaDataType[] = mediaItems.map((item) => ({
              file: new File([], item.filename || ''),
              fileName: item.filename || '',
              fileId: item.fileId || '',
              webViewLink: item.webViewLink || '',
              webContentLink: item.webContentLink || '',
            }));

            setPics(loadedPics);
          }
        } catch (error) {
          console.error('メディアデータのパースエラー:', error);
        }
      }
    };

    setText(xPostData.contents || '');

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
  }, [xPostData]);

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
      URL.revokeObjectURL(removedPic.webContentLink);
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

    try {
      let mediaJsonString = '';

      // 画像がある場合、一括アップロード
      if (pics.length > 0) {
        // すでにアップロード済みの画像（fileIdがある）とそうでないものを分ける
        const uploadTargets = pics.filter((pic) => !pic.fileId && pic.file);
        const existingMedia = pics.filter((pic) => pic.fileId);

        if (uploadTargets.length > 0) {
          // メディアをアップロード
          const mediaFiles = uploadTargets.map((pic) => ({
            file: pic.file,
            filename: pic.fileName,
            mimeType: pic.file.type,
          }));

          const resultAction = await dispatch(uploadMultipleMedia({ files: mediaFiles }));

          if (uploadMultipleMedia.fulfilled.match(resultAction)) {
            // アップロード済みのメディア情報と新しくアップロードしたメディア情報を結合
            const combinedMedia = [...existingMedia, ...resultAction.payload];
            mediaJsonString = JSON.stringify(combinedMedia);
          } else {
            // エラーハンドリング
            setIsSubmitting(false);
            setErrorMessage('メディアのアップロードに失敗しました');
            return;
          }
        } else if (existingMedia.length > 0) {
          // すでにアップロード済みの画像のみの場合
          mediaJsonString = JSON.stringify(existingMedia);
        }
      }

      // 新しいポストデータを作成
      const newPost: XPostDataType = {
        id: xPostData.id || '',
        contents: text,
        media: mediaJsonString,
        postSchedule: scheduledPostTime ? scheduledPostTime.toISOString() : null,
        postTo: xPostData.postTo || '',
        inReplyToInternal: xPostData.inReplyToInternal || '',
      };

      // 新規作成または更新
      if (!xPostData.id) {
        newPost.id = `${Date.now()}`;
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
    if (xPostData.id === '') {
      table.setCreatingRow(null);
    } else {
      table.setEditingRow(null);
    }
  };

  const handleReset = () => {
    setText('');
    setContentError(false);
    setPics([]);
    setScheduledPostTime(null);
    setSelectedHashTags([]);
    setWeightedLength(0);
    setErrorMessage(null);
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

  return (
    <Grid>
      <Grid.Col span={12} m="8px">
        <Card title="Xポスト">
          <LoadingOverlay visible={isSubmitting} />
          {errorMessage && (
            <Alert
              color="red"
              title="エラー"
              withCloseButton
              onClose={() => setErrorMessage(null)}
              mb="md"
            >
              {errorMessage}
            </Alert>
          )}
          <Card.Section p="0 24px 12px 24px">
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
