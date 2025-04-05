import { useEffect, useState } from 'react';
import { IconAlertCircle, IconCheck, IconRefresh } from '@tabler/icons-react';
import { Alert, Button, Group, LoadingOverlay, Paper, Tabs, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { setInitialized } from '@/store/reducers/apiControllerSlice';
import { fetchXErrors } from '@/store/reducers/xErrorsSlice';
import { fetchXPosted } from '@/store/reducers/xPostedSlice';
import { fetchXPosts } from '@/store/reducers/xPostsSlice';
import { PostError, XPostDataType, XPostedDataType } from '@/types/xAccounts';
import ErrorTable from './ErrorTable';
import PostedTable from './PostedTable';
import PostsTable from './PostsTable';

/**
 * シートデータ表示コンポーネント
 * 投稿予定データ、投稿済みデータ、エラーデータをタブで切り替えて表示する
 */
const SheetData = () => {
  const dispatch = useAppDispatch();
  const { initialized } = useAppSelector((state) => state.apiController);
  const { user } = useAppSelector((state) => state.auth);
  const {
    xPostList,
    isLoading: isPostsLoading,
    isError: isPostsError,
    errorMessage: postsErrorMessage,
  } = useAppSelector((state) => state.xPosts);
  const {
    xPostedList,
    isLoading: isPostedLoading,
    isError: isPostedError,
    errorMessage: postedErrorMessage,
  } = useAppSelector((state) => state.xPosted);
  const {
    xErrorsList,
    isLoading: isErrorsLoading,
    isError: isErrorsError,
    errorMessage: errorsErrorMessage,
  } = useAppSelector((state) => state.xErrors);

  const [activeTab, setActiveTab] = useState<string | null>('posts');
  const [error, setError] = useState<string | null>(null);

  // 通知ID管理用
  const [loadingNotificationId, setLoadingNotificationId] = useState<string | null>(null);

  // 全体のローディング状態
  const isLoading = isPostsLoading || isPostedLoading || isErrorsLoading;

  // 全データをフェッチ
  const fetchAllData = async () => {
    if (!user.googleSheetUrl) return;

    setError(null);

    // 進行中の通知があれば閉じる
    if (loadingNotificationId) {
      notifications.hide(loadingNotificationId);
    }

    // 読み込み開始の通知
    const notificationId = notifications.show({
      loading: true,
      title: 'データ取得中',
      message: '未投稿データを取得しています...',
      autoClose: false,
      withCloseButton: false,
    });

    setLoadingNotificationId(notificationId);

    try {
      // 未投稿データを取得
      try {
        const postsAction = await dispatch(fetchXPosts());

        // 通知を更新
        notifications.update({
          id: notificationId,
          loading: true,
          title: 'データ取得中',
          message: '投稿済みデータを取得しています...',
        });

        if (fetchXPosts.rejected.match(postsAction)) {
          console.error('未投稿データ取得エラー:', postsAction.payload);
          notifications.show({
            title: '未投稿データ取得エラー',
            message:
              typeof postsAction.payload === 'string'
                ? postsAction.payload
                : '未投稿データの取得に失敗しました',
            color: 'red',
            icon: <IconAlertCircle size={16} />,
          });
        }
      } catch (error) {
        console.error('未投稿データ取得エラー:', error);
        notifications.show({
          title: '未投稿データ取得エラー',
          message: '未投稿データの取得中にエラーが発生しました',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }

      // 投稿済みデータを取得
      try {
        const postedAction = await dispatch(fetchXPosted());

        // 通知を更新
        notifications.update({
          id: notificationId,
          loading: true,
          title: 'データ取得中',
          message: 'エラーデータを取得しています...',
        });

        if (fetchXPosted.rejected.match(postedAction)) {
          console.error('投稿済みデータ取得エラー:', postedAction.payload);
          notifications.show({
            title: '投稿済みデータ取得エラー',
            message:
              typeof postedAction.payload === 'string'
                ? postedAction.payload
                : '投稿済みデータの取得に失敗しました',
            color: 'red',
            icon: <IconAlertCircle size={16} />,
          });
        }
      } catch (error) {
        console.error('投稿済みデータ取得エラー:', error);
        notifications.show({
          title: '投稿済みデータ取得エラー',
          message: '投稿済みデータの取得中にエラーが発生しました',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }

      // エラーデータを取得
      try {
        const errorAction = await dispatch(fetchXErrors());

        if (fetchXErrors.rejected.match(errorAction)) {
          console.error('エラーデータ取得エラー:', errorAction.payload);
          notifications.show({
            title: 'エラーデータ取得エラー',
            message:
              typeof errorAction.payload === 'string'
                ? errorAction.payload
                : 'エラーデータの取得に失敗しました',
            color: 'red',
            icon: <IconAlertCircle size={16} />,
          });
        }
      } catch (error) {
        console.error('エラーデータ取得エラー:', error);
        notifications.show({
          title: 'エラーデータ取得エラー',
          message: 'エラーデータの取得中にエラーが発生しました',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
      dispatch(setInitialized());
      // 全てのデータ取得が完了したら成功通知
      notifications.update({
        id: notificationId,
        loading: false,
        title: 'データ取得完了',
        message: `未投稿: ${xPostList.length}件, 投稿済み: ${xPostedList.length}件, エラー: ${xErrorsList.length}件`,
        icon: <IconCheck size={16} />,
        color: 'green',
        autoClose: 3000,
      });

      setLoadingNotificationId(null);
    } catch (error) {
      console.error('データ取得エラー:', error);
      setError('データの取得中にエラーが発生しました');

      // エラー通知
      notifications.update({
        id: notificationId,
        loading: false,
        title: 'データ取得エラー',
        message: 'データの取得中にエラーが発生しました',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
        autoClose: 3000,
      });

      setLoadingNotificationId(null);
    }
  };

  // コンポーネントマウント時にデータを取得、但し毎回ではなく、URLが変更されたときのみ
  useEffect(() => {
    if (user.googleSheetUrl) {
      if (!initialized) {
        fetchAllData();
      }
    }

    // コンポーネントのアンマウント時に進行中の通知をクリーンアップ
    return () => {
      if (loadingNotificationId) {
        notifications.hide(loadingNotificationId);
      }
    };
  }, [user.googleSheetUrl]);

  return (
    <Paper p="md" withBorder pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Group mb="md">
        <Title order={3}>シートデータ管理</Title>
        <Button
          leftSection={<IconRefresh size={18} />}
          onClick={fetchAllData}
          disabled={isLoading}
          variant="light"
        >
          データ更新
        </Button>
      </Group>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="エラー"
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="posts">投稿予定 ({xPostList.length})</Tabs.Tab>
          <Tabs.Tab value="posted">投稿済み ({xPostedList.length})</Tabs.Tab>
          <Tabs.Tab value="errors">エラー ({xErrorsList.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="posts" pt="md">
          <PostsTable data={xPostList} isLoading={isPostsLoading} />
        </Tabs.Panel>

        <Tabs.Panel value="posted" pt="md">
          <PostedTable data={xPostedList} isLoading={isPostedLoading} />
        </Tabs.Panel>

        <Tabs.Panel value="errors" pt="md">
          <ErrorTable data={xErrorsList} isLoading={isErrorsLoading} />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};

export default SheetData;
