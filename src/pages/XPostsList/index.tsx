import dayjs, { Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useEffect, useState } from 'react';
import { createDecipheriv } from 'crypto';
import {
  IconBrandX,
  IconCheck,
  IconClockPlus,
  IconClockX,
  IconDownload,
  IconPencil,
  IconTrash,
  IconTrashX,
} from '@tabler/icons-react';
import { download, generateCsv, mkConfig } from 'export-to-csv';
import { set } from 'firebase/database';
import { list } from 'firebase/storage';
import {
  MantineReactTable,
  MRT_Row,
  MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleGlobalFilterButton,
  MRT_Updater,
  MRT_VisibilityState,
  useMantineReactTable,
} from 'mantine-react-table';
import { MRT_Localization_JA } from 'mantine-react-table/locales/ja/index.cjs';
import { useParams } from 'react-router';
import { ActionIcon, Box, Button, Group, Modal, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import {
  deleteMultiple,
  deleteXPost,
  getXPostsByXAccountId,
  updateSchedules,
} from '@/store/reducers/xPostsSlice';
import { PostDeletion, PostScheduleUpdate, XPostDataType } from '@/types/xAccounts';
import DeletionConfirmationAlert, { DeletionConfirmationAlertProps } from './Alert';
import XPostForm, { xPostFormDefaultValue } from './XPostForm';
import XPostScheduleForm, { ScheduleData } from './XPostScheduleForm';
import { columns } from './XPostsColumns';

type XPostTableProps = {
  xAccountId: string;
};

const combineDateTime = (date: Dayjs, time: Dayjs): Dayjs => {
  // ローカルタイムゾーンの情報を保持して日時を組み合わせる
  const combinedDateTime = dayjs(date)
    .year(date.year())
    .month(date.month())
    .date(date.date())
    .hour(time.hour())
    .minute(time.minute())
    .second(time.second());

  return combinedDateTime;
};

const setTimeOnly = (time: Dayjs) =>
  dayjs().hour(time.hour()).minute(time.minute()).second(time.second());

const isOverStopTime = (scheduleDateTime: Dayjs, stopTime: Dayjs): boolean => {
  const timeOfScheduleDateTime = setTimeOnly(scheduleDateTime);
  const timeOfStopTime = setTimeOnly(stopTime);

  return timeOfScheduleDateTime.isAfter(timeOfStopTime);
};

const XPostTable = () => {
  // dayjsプラグインの初期化
  dayjs.extend(utc);
  dayjs.extend(timezone);

  const { xAccountId } = useParams<{ xAccountId: string }>();
  // xAccountIdが存在しない場合は早期リターン
  if (!xAccountId) {
    return <div>エラー: アカウントIDが見つかりません</div>;
  }
  const [columnVisibility, setColumnVisibility] = useState({
    id: false,
    postTo: false,
    inReplyToInternal: true,
    contents: true,
    media: true,
    postSchedule: true,
    createdAt: true,
  });
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [alertProps, setAlertProps] = useState<DeletionConfirmationAlertProps>({
    open: false,
    onClose: () => setAlertProps({ ...alertProps, open: false }),
    title: 'Xポスト削除確認',
    message: '',
    onConfirm: () => {},
    confirmButtonText: '削除',
    cancelButtonText: 'キャンセル',
  });
  // xPosts.xPostListは全アカウントのPOSTデータを持っているので、xAccountIdでフィルタリングして表示する
  const xPostList = useAppSelector((state) => state.xPosts.xPostListByXAccountId);

  const dispatch = useAppDispatch();
  const { isLoading, isError, errorMessage, process } = useAppSelector((state) => state.xPosts);

  useEffect(() => {
    dispatch(getXPostsByXAccountId(xAccountId));
  }, [xAccountId]);

  // 非同期アクションの状態に応じた通知を表示
  useEffect(() => {
    // ローディング通知
    if (isLoading) {
      const loadingMessages: Record<string, string> = {
        updateSchedules: '投稿スケジュールを更新中...',
        deleteMultiple: '選択したポストを削除中...',
        createMultiple: '複数のポストを作成中...',
        deleteXPost: 'ポストを削除中...',
      };

      if (process && loadingMessages[process]) {
        notifications.show({
          id: `loading-${process}`,
          title: '処理中',
          message: loadingMessages[process],
          color: 'blue',
          loading: true,
          autoClose: false,
        });
      }
    } else {
      // 完了通知
      if (process) {
        notifications.hide(`loading-${process}`);

        if (isError) {
          notifications.show({
            title: 'エラー',
            message: errorMessage || '処理中にエラーが発生しました',
            color: 'red',
          });
        } else {
          const successMessages: Record<string, string> = {
            updateSchedules: '投稿スケジュールが正常に更新されました',
            deleteMultiple: '選択したポストが正常に削除されました',
            createMultiple: 'ポストが正常に作成されました',
            deleteXPost: 'ポストが正常に削除されました',
          };

          if (successMessages[process]) {
            notifications.show({
              title: '完了',
              message: successMessages[process],
              color: 'green',
              icon: <IconCheck size={16} />,
            });
          }
          setRowSelection({}); // 選択状態をクリア
        }
      }
    }
  }, [isLoading, isError, process, errorMessage]);

  // モーダル制御用のフック
  const [isDeleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [currentPostToDelete, setCurrentPostToDelete] = useState<XPostDataType | null>(null);
  const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);

  const { xAccountList } = useAppSelector((state) => state.xAccounts);
  const xAccount = xAccountList.find((account) => account.id === xAccountId);

  // モーダル操作後のフィードバック処理
  const handleFeedback = ({ operation, text }: { operation: string; text: string }) => {
    if (operation === 'addNew') {
      notifications.show({
        title: 'ポスト作成完了',
        message: `ポスト:"${text}"が正常に作成されました`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } else if (operation === 'update') {
      notifications.show({
        title: 'ポスト更新成功',
        message: `ポスト"${text}"が正常に更新されました`,
        color: 'green',
        icon: <IconCheck size={16} />,
        position: 'top-center',
      });
    }
  };

  const openDeleteConfirmModal = (row: MRT_Row<XPostDataType>) => {
    console.log('Clicked delete for row:', row.original);
    setCurrentPostToDelete(row.original);
    openDeleteModal();
  };

  const handleDeletePost = async () => {
    if (!currentPostToDelete) return;

    try {
      if (!xAccountId) {
        throw new Error('Xアカウントが見つかりません');
      }
      await dispatch(deleteXPost({ xAccountId, postId: currentPostToDelete.id ?? '' }));
      closeDeleteModal();
      notifications.show({
        title: '削除完了',
        message: 'ポストの削除が完了しました。',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('Delete error:', error);
      notifications.show({
        title: 'エラー',
        message: '削除中にエラーが発生しました。',
        color: 'red',
      });
    }
  };

  // csv config for import and export
  const csvConfig = mkConfig({
    fieldSeparator: ',',
    decimalSeparator: '.',
    useKeysAsHeaders: true,
  });

  const handleExportData = (rows: MRT_Row<XPostDataType>[]) => {
    console.log('Exporting data for rows:', rows.length);
    const rowData = rows.map((row) => ({
      ...row.original,
    }));
    const csv = generateCsv(csvConfig)(rowData);
    download(csvConfig)(csv);
  };

  // 投稿スケジュール一括設定フォーム開く
  const handleOpenScheduleDialog = () => {
    setOpenScheduleDialog(true);
  };

  // 投稿スケジュール一括設定
  const handleSetSchedules = async (data: ScheduleData | null) => {
    setOpenScheduleDialog(false);
    if (data !== null) {
      console.log('handleSetSchedules', data);
      const updatedXPosts: PostScheduleUpdate[] = [];
      let durationCount = 0;
      let postDate = data.startDate;
      for (let i = 0; i < table.getSelectedRowModel().flatRows.length; i++) {
        let updatedPost: PostScheduleUpdate;
        let row = table.getSelectedRowModel().flatRows[i];
        // culculate post time
        const caliculatedDurationMin = data.unit
          ? data.duration * durationCount * 60
          : data.duration * durationCount;
        const scheduleDateTime = combineDateTime(dayjs(postDate), dayjs(data.startTime)).add(
          caliculatedDurationMin,
          'minute'
        );
        // compare culculated post time and end time
        if (isOverStopTime(scheduleDateTime, dayjs(data.endTime))) {
          // over end time then set next day
          durationCount = 0;
          postDate = postDate.add(1, 'day');
          // check end date
          if (postDate.isAfter(data.endDate)) {
            break;
          }
          // set next day post time
          const newScheduleDateTime = combineDateTime(dayjs(postDate), dayjs(data.startTime));
          console.log('newScheduleDateTime', newScheduleDateTime);
          // ローカルタイムゾーン情報を保持したまま保存する形式に変換
          updatedPost = {
            id: row.original.id || '',
            postSchedule: newScheduleDateTime.format('YYYY-MM-DDTHH:mm:ssZ'),
          };
        } else {
          // set post time same day
          console.log('scheduleDateTime else', scheduleDateTime);
          // ローカルタイムゾーン情報を保持したまま保存する形式に変換
          updatedPost = {
            id: row.original.id || '',
            postSchedule: scheduleDateTime.format('YYYY-MM-DDTHH:mm:ssZ'),
          };
        }
        updatedXPosts.push(updatedPost);
        durationCount++;
      }
      table.setRowSelection({});
      dispatch(updateSchedules({ xAccountId, scheduleUpdates: updatedXPosts }));
    }
  };

  const handleClearSchedule = () => {
    // alert
    setAlertProps({
      open: true,
      onClose: () => setAlertProps({ ...alertProps, open: false }),
      title: '投稿スケジュール削除確認',
      message:
        '選択したポストの予約時刻を解除しますか？\n削除すると再度設定するまで投稿されません。',
      onConfirm: () => {
        const selectedRows = table.getSelectedRowModel().flatRows;
        const updatedXPosts: PostScheduleUpdate[] = selectedRows.map((row) => ({
          id: row.original.id || '',
          postSchedule: '',
        }));
        dispatch(updateSchedules({ xAccountId, scheduleUpdates: updatedXPosts }));
        setAlertProps({ ...alertProps, open: false });
      },
      confirmButtonText: '削除',
      cancelButtonText: 'キャンセル',
    });
  };

  const handleDeleteSelected = () => {
    console.log('handleDeleteSelected');
    setAlertProps({
      open: true,
      onClose: () => setAlertProps({ ...alertProps, open: false }),
      title: 'Xポスト削除確認',
      message: '選択したポストを削除しますか？\n削除したポストは復元できません。',
      onConfirm: () => {
        const selectedRows = table.getSelectedRowModel().flatRows;
        const deleteXPosts: PostDeletion[] = selectedRows.map((row) => ({
          id: row.original.id || '',
        }));
        dispatch(deleteMultiple({ xAccountId, idsToDelete: deleteXPosts }));
        setAlertProps({ ...alertProps, open: false });
      },
      confirmButtonText: '削除',
      cancelButtonText: 'キャンセル',
    });
  };

  const table = useMantineReactTable({
    columns,
    data: xPostList,
    // editing feature
    editDisplayMode: 'modal',
    enableEditing: true,
    // create row
    createDisplayMode: 'modal',
    enableFullScreenToggle: false,
    enableRowActions: true,
    enableRowNumbers: true,
    enableRowSelection: true,
    positionToolbarAlertBanner: 'bottom',
    onRowSelectionChange: setRowSelection,
    state: {
      columnVisibility,
      rowSelection,
    },
    localization: MRT_Localization_JA,
    onColumnVisibilityChange: (
      updaterOrValue: MRT_Updater<MRT_VisibilityState> | MRT_VisibilityState
    ) => {
      if (typeof updaterOrValue === 'function') {
        // @ts-ignore
        setColumnVisibility((prevState) => updaterOrValue(prevState));
      } else {
        // @ts-ignore
        setColumnVisibility(updaterOrValue);
      }
    },
    renderCreateRowModalContent: ({ table, row }) => (
      <>
        <XPostForm
          xAccountId={xAccountId}
          row={row}
          xPostData={xPostFormDefaultValue as XPostDataType}
          table={table}
          feedBack={handleFeedback}
        />
      </>
    ),
    renderEditRowModalContent: ({ table, row }) => (
      <>
        <XPostForm
          xAccountId={xAccountId}
          row={row}
          xPostData={row.original}
          table={table}
          feedBack={handleFeedback}
        />
      </>
    ),
    renderRowActions: ({ row, table }) => (
      <Box style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
        <Tooltip label="編集">
          <ActionIcon onClick={() => table.setEditingRow(row)}>
            <IconPencil />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="削除">
          <ActionIcon color="red" onClick={() => openDeleteConfirmModal(row)}>
            <IconTrash />
          </ActionIcon>
        </Tooltip>
      </Box>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
      <Box style={{ gap: '16px', padding: '8px' }}>
        <Group>
          <Button variant="outline" onClick={() => table.setCreatingRow(true)}>
            新規ポスト作成
          </Button>
          <Tooltip label="一括で予約時刻をセット">
            <Box>
              <ActionIcon
                onClick={handleOpenScheduleDialog}
                disabled={
                  !table.getIsSomeRowsSelected() &&
                  !table.getIsAllPageRowsSelected() &&
                  !table.getIsAllRowsSelected()
                }
              >
                <IconClockPlus />
              </ActionIcon>
            </Box>
          </Tooltip>
          <Tooltip label="一括で予約時刻を解除">
            <Box>
              <ActionIcon
                onClick={handleClearSchedule}
                disabled={
                  !table.getIsSomeRowsSelected() &&
                  !table.getIsAllPageRowsSelected() &&
                  !table.getIsAllRowsSelected()
                }
              >
                <IconClockX />
              </ActionIcon>
            </Box>
          </Tooltip>
          <Tooltip label="選択したポストを削除">
            <Box>
              <ActionIcon
                onClick={handleDeleteSelected}
                disabled={
                  !table.getIsSomeRowsSelected() &&
                  !table.getIsAllPageRowsSelected() &&
                  !table.getIsAllRowsSelected()
                }
              >
                <IconTrashX />
              </ActionIcon>
            </Box>
          </Tooltip>
        </Group>
      </Box>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Box style={{ display: 'flex', flexDirection: 'row' }}>
        <MRT_ToggleGlobalFilterButton table={table} />
        <Tooltip label="CSVファイルでエクスポート">
          <Box style={{ p: 0, m: 0 }}>
            <ActionIcon
              variant="transparent"
              disabled={table.getPrePaginationRowModel().rows.length === 0}
              onClick={() => handleExportData(table.getPrePaginationRowModel().rows)}
            >
              <IconDownload />
            </ActionIcon>
          </Box>
        </Tooltip>
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Box>
    ),
  });

  return (
    <Paper p="md" style={{ width: '100%', height: '100%' }}>
      <Text mb="md">アカウント名:{` @${xAccountId}`}</Text>
      <MantineReactTable table={table} />
      <XPostScheduleForm
        dialogOpen={openScheduleDialog}
        setSchedule={handleSetSchedules}
        onClose={() => setOpenScheduleDialog(false)}
      />
      <DeletionConfirmationAlert
        open={alertProps.open}
        onClose={alertProps.onClose}
        title={alertProps.title}
        message={alertProps.message}
        onConfirm={alertProps.onConfirm}
        confirmButtonText={alertProps.confirmButtonText}
        cancelButtonText={alertProps.cancelButtonText}
      />
      <Modal
        opened={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Xポスト削除確認"
        size="md"
        styles={{
          content: {
            borderLeft: '4px solid red',
          },
        }}
      >
        <Text>
          ポスト「{currentPostToDelete?.contents?.slice(0, 30)}...」を削除してもよろしいですか？
        </Text>
        <Group justify="end" mt="md">
          <Button variant="outline" onClick={closeDeleteModal}>
            キャンセル
          </Button>
          <Button color="red" onClick={handleDeletePost} loading={isLoading}>
            削除
          </Button>
        </Group>
      </Modal>
    </Paper>
  );
};

export default XPostTable;
