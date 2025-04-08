import { useEffect, useState } from 'react';
import { IconAlertCircle, IconCheck, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { getTriggerStatus, setInitialized } from '@/store/reducers/apiControllerSlice';
import { fetchXAccounts } from '@/store/reducers/xAccountsSlice';
import { fetchXErrors } from '@/store/reducers/xErrorsSlice';
import { fetchXPosted } from '@/store/reducers/xPostedSlice';
import { fetchXPosts } from '@/store/reducers/xPostsSlice';

/**
 * データ同期コンポーネント
 * サインイン後にGoogle SheetデータとXAccountListを含めて同期させる
 * 条件：
 * 1. ユーザーがサインイン済み
 * 2. Google Sheet URLが設定されている
 * 3. まだ初期化されていない（apiController.initialized === false）
 */
const DataSynchronizer = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { initialized } = useAppSelector((state) => state.apiController);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const syncData = async () => {
      // 条件チェック
      if (!user.uid || !user.googleSheetUrl || initialized || isSyncing) {
        return;
      }

      setIsSyncing(true);
      setSyncError(null);

      // 同期開始の通知
      const notificationId = notifications.show({
        id: 'data-sync',
        loading: true,
        title: 'データ同期中',
        message: 'Google Sheetからデータを同期しています...',
        autoClose: false,
        withCloseButton: false,
      });

      try {
        // XAccountListのデータを取得
        const accountsAction = await dispatch(fetchXAccounts());
        if (fetchXAccounts.rejected.match(accountsAction)) {
          console.error('アカウントデータ同期エラー:', accountsAction.payload);
          throw new Error(
            typeof accountsAction.payload === 'string'
              ? accountsAction.payload
              : 'アカウントデータの同期に失敗しました'
          );
        }

        // 投稿予定データを取得
        const postsAction = await dispatch(fetchXPosts());
        if (fetchXPosts.rejected.match(postsAction)) {
          console.error('投稿データ同期エラー:', postsAction.payload);
          throw new Error(
            typeof postsAction.payload === 'string'
              ? postsAction.payload
              : '投稿データの同期に失敗しました'
          );
        }

        // 投稿済みデータを取得
        const postedAction = await dispatch(fetchXPosted());
        if (fetchXPosted.rejected.match(postedAction)) {
          console.error('投稿済みデータ同期エラー:', postedAction.payload);
          throw new Error(
            typeof postedAction.payload === 'string'
              ? postedAction.payload
              : '投稿済みデータの同期に失敗しました'
          );
        }

        // エラーデータを取得
        const errorsAction = await dispatch(fetchXErrors());
        if (fetchXErrors.rejected.match(errorsAction)) {
          console.error('エラーデータ同期エラー:', errorsAction.payload);
          throw new Error(
            typeof errorsAction.payload === 'string'
              ? errorsAction.payload
              : 'エラーデータの同期に失敗しました'
          );
        }

        // トリガーの状態を取得（自動投稿のトリガー）
        const triggerAction = await dispatch(getTriggerStatus({ functionName: 'autoPostToX' }));
        if (getTriggerStatus.rejected.match(triggerAction)) {
          console.error('トリガーステータス取得エラー:', triggerAction.payload);
          // トリガー取得は失敗しても同期処理は続行（重要度を下げる）
          notifications.show({
            title: 'トリガー情報取得エラー',
            message:
              typeof triggerAction.payload === 'string'
                ? triggerAction.payload
                : 'トリガー情報の取得に失敗しました',
            color: 'yellow',
            icon: <IconAlertCircle size={16} />,
            autoClose: 5000,
          });
        }

        // 同期完了をマーク
        dispatch(setInitialized());

        // 成功通知
        notifications.update({
          id: notificationId,
          color: 'green',
          title: 'データ同期完了',
          message: 'すべてのデータが同期されました',
          icon: <IconCheck size={16} />,
          loading: false,
          autoClose: 3000,
        });
      } catch (error: any) {
        console.error('データ同期エラー:', error);
        setSyncError(error.message || 'データの同期中にエラーが発生しました');

        // エラー通知
        notifications.update({
          id: notificationId,
          color: 'red',
          title: 'データ同期エラー',
          message: error.message || 'データの同期中にエラーが発生しました',
          icon: <IconAlertCircle size={16} />,
          loading: false,
          autoClose: 5000,
        });
      } finally {
        setIsSyncing(false);
      }
    };

    syncData();
  }, [user.uid, user.googleSheetUrl, initialized, isSyncing, dispatch]);

  // このコンポーネントは何もレンダリングしない
  return null;
};

export default DataSynchronizer;
