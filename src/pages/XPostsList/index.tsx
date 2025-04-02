import dayjs, { Dayjs } from 'dayjs';
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
import { ActionIcon, Box, Button, Group, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { deleteXPost } from '@/store/reducers/xPostsSlice';
import { XPostDataType } from '@/types/xAccounts';
import XPostForm, { xPostFormDefaultValue } from './XPostForm';
//import XPostScheduleForm, { ScheduleData } from './xPostScheduleForm/ScheduleForm';
import { columns } from './XPostsColumns';

type XPostTableProps = {
  xAccountId: string;
};

const combineDateTime = (date: Dayjs, time: Dayjs): Dayjs => {
  const combinedDateTime = dayjs(date)
    .year(date.year())
    .month(date.month())
    .date(date.date())
    .hour(time.hour())
    .minute(time.minute())
    .second(time.second());

  return combinedDateTime;
};

// const setTimeOnly = (time) => dayjs().hour(time.hour()).minute(time.minute()).second(time.second());

// const isOverStopTime = (scheduleDateTime: Dayjs, stopTime: Dayjs): boolean => {
//   const timeOfScheduleDateTime = setTimeOnly(scheduleDateTime);
//   const timeOfStopTime = setTimeOnly(stopTime);

//   return timeOfScheduleDateTime.isAfter(timeOfStopTime);
// };

const XPostTable = () => {
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
    psotSchdule: true,
    createdAt: true,
  });
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openLogsDialog, setOpenLogsDialog] = useState(false);
  // xPosts.xPostListは全アカウントのPOSTデータを持っているので、xAccountIdでフィルタリングして表示する
  const xPostList = useAppSelector((state) => state.xPosts.xPostList).filter(
    (list) => list.postTo === xAccountId
  );
  const dispatch = useAppDispatch();

  // モーダル制御用のフック
  const [isDeleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [currentPostToDelete, setCurrentPostToDelete] = useState<XPostDataType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { xAccountList } = useAppSelector((state) => state.xAccounts);
  const xAccount = xAccountList.find((account) => account.id === xAccountId);

  // モーダル操作後のフィードバック処理
  const handleFeedback = ({ operation, text }: { operation: string; text: string }) => {
    if (operation === 'created') {
      notifications.show({
        title: 'ポスト作成完了',
        message: `ポスト:"${text}"が正常に作成されました`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } else if (operation === 'updated') {
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

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  // 一時的なハンドラー関数（コンソールログのみ）
  const handlePostStep1 = () => {
    console.log('clicked: handlePostStep1');
  };

  const handleOpenScheduleDialog = () => {
    console.log('clicked: handleOpenScheduleDialog');
  };

  const handleClearSchedule = () => {
    console.log('clicked: handleClearSchedule');
  };

  const handleDeleteSelected = () => {
    console.log('clicked: handleDeleteSelected');
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
          <Tooltip label="Xへ予約投稿">
            <Box>
              <ActionIcon
                onClick={handlePostStep1}
                disabled={
                  !table.getIsSomeRowsSelected() &&
                  !table.getIsAllPageRowsSelected() &&
                  !table.getIsAllRowsSelected()
                }
              >
                <IconBrandX />
              </ActionIcon>
            </Box>
          </Tooltip>
          <Tooltip label="予約時刻をセット">
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
          <Tooltip label="予約時刻を解除">
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
    <>
      <MantineReactTable table={table} />
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
    </>
  );
};

export default XPostTable;
