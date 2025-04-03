import { useEffect, useState } from 'react';
import { IconAlertCircle, IconCheck, IconRefresh } from '@tabler/icons-react';
import axios from 'axios';
import { Alert, Button, Group, LoadingOverlay, Paper, Tabs, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAppSelector } from '@/hooks/rtkhooks';
import { PostError, XPostDataType, XPostedDataType } from '@/types/xAccounts';
import ErrorTable from './ErrorTable';
import PostedTable from './PostedTable';
import PostsTable from './PostsTable';

/**
 * シートデータ表示コンポーネント
 * 投稿予定データ、投稿済みデータ、エラーデータをタブで切り替えて表示する
 */
const SheetData = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<string | null>('posts');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // データ状態
  const [postsData, setPostsData] = useState<XPostDataType[]>([]);
  const [postedData, setPostedData] = useState<XPostedDataType[]>([]);
  const [errorData, setErrorData] = useState<PostError[]>([]);

  // 通知ID管理用
  const [loadingNotificationId, setLoadingNotificationId] = useState<string | null>(null);

  // 全データをフェッチ
  const fetchAllData = async () => {
    if (!user.googleSheetUrl) return;

    setIsLoading(true);
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
        const postsResponse = await axios.get(
          `${user.googleSheetUrl}?action=fetch&target=postData`
        );

        // 通知を更新
        notifications.update({
          id: notificationId,
          loading: true,
          title: 'データ取得中',
          message: '投稿済みデータを取得しています...',
        });

        if (postsResponse.data.status === 'success') {
          setPostsData(postsResponse.data.data || []);
        } else {
          console.error('未投稿データ取得エラー:', postsResponse.data.message);
          notifications.show({
            title: '未投稿データ取得エラー',
            message: postsResponse.data.message || '未投稿データの取得に失敗しました',
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
        const postedResponse = await axios.get(
          `${user.googleSheetUrl}?action=fetch&target=postedData`
        );

        // 通知を更新
        notifications.update({
          id: notificationId,
          loading: true,
          title: 'データ取得中',
          message: 'エラーデータを取得しています...',
        });

        if (postedResponse.data.status === 'success') {
          setPostedData(postedResponse.data.data || []);
        } else {
          console.error('投稿済みデータ取得エラー:', postedResponse.data.message);
          notifications.show({
            title: '投稿済みデータ取得エラー',
            message: postedResponse.data.message || '投稿済みデータの取得に失敗しました',
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
        const errorResponse = await axios.get(
          `${user.googleSheetUrl}?action=fetch&target=errorData`
        );

        if (errorResponse.data.status === 'success') {
          setErrorData(errorResponse.data.data || []);
        } else {
          console.error('エラーデータ取得エラー:', errorResponse.data.message);
          notifications.show({
            title: 'エラーデータ取得エラー',
            message: errorResponse.data.message || 'エラーデータの取得に失敗しました',
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

      // 全てのデータ取得が完了したら成功通知
      notifications.update({
        id: notificationId,
        loading: false,
        title: 'データ取得完了',
        message: `未投稿: ${postsData.length}件, 投稿済み: ${postedData.length}件, エラー: ${errorData.length}件`,
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
    } finally {
      setIsLoading(false);
    }
  };

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchAllData();

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
          <Tabs.Tab value="posts">投稿予定 ({postsData.length})</Tabs.Tab>
          <Tabs.Tab value="posted">投稿済み ({postedData.length})</Tabs.Tab>
          <Tabs.Tab value="errors">エラー ({errorData.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="posts" pt="md">
          <PostsTable data={postsData} isLoading={isLoading} />
        </Tabs.Panel>

        <Tabs.Panel value="posted" pt="md">
          <PostedTable data={postedData} isLoading={isLoading} />
        </Tabs.Panel>

        <Tabs.Panel value="errors" pt="md">
          <ErrorTable data={errorData} isLoading={isLoading} />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};

export default SheetData;
