import { useEffect, useState } from 'react';
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleGlobalFilterButton,
  MRT_Updater,
  MRT_VisibilityState,
  useMantineReactTable,
} from 'mantine-react-table';
// 修正: v2.0 ベータ版での正しいロケールのインポート
import { MRT_Localization_JA } from 'mantine-react-table/locales/ja/index.cjs';

import 'mantine-react-table/styles.css';

import { IconCheck, IconEdit, IconFileArrowRight, IconPlus, IconTrash } from '@tabler/icons-react';
import { download, generateCsv, mkConfig } from 'export-to-csv';
import { type MRT_Row, type MRT_TableInstance } from 'mantine-react-table';
import { ActionIcon, Box, Button, Group, Modal, Paper, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import {
  createXAccount,
  deleteXAccount,
  fetchXAccounts,
  updateXAccount,
} from '@/store/reducers/xAccountsSlice';
import type { XAccount } from '@/types/xAccounts';
import { columns } from './XAccountColumn';
import XAccountForm from './XAccountForm';

const XAccountsListTable = () => {
  const dispatch = useAppDispatch();
  const { isLoading, isError, process, xAccountList } = useAppSelector((state) => state.xAccounts);
  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({
    id: false,
    name: true,
    apiKey: true,
    apiSecret: true,
    accessToken: true,
    accessTokenSecret: true,
    note: true,
  });

  // モーダル制御用のフック
  const [isDeleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  // 現在操作中の行と編集・削除対象のアカウント
  const [currentRow, setCurrentRow] = useState<MRT_Row<XAccount> | null>(null);
  const [currentAccount, setCurrentAccount] = useState<XAccount | null>(null);

  // ページ読み込み時にXアカウントデータを取得
  useEffect(() => {
    dispatch(fetchXAccounts());
  }, [dispatch]);

  const csvConfig = mkConfig({
    fieldSeparator: ',',
    decimalSeparator: '.',
    useKeysAsHeaders: true,
  });

  const handleExportData = (rows: MRT_Row<XAccount>[]) => {
    const rowData = rows.map((row) => {
      const { original } = row;
      return {
        id: original.id,
        name: original.name,
        apiKey: original.apiKey,
        apiSecret: original.apiSecret,
        accessToken: original.accessToken,
        accessTokenSecret: original.accessTokenSecret,
        note: original.note,
      };
    });
    const csv = generateCsv(csvConfig)(rowData);
    download(csvConfig)(csv);
  };

  // モーダル操作後のフィードバック処理
  const handleFeedback = ({
    operation,
    accountName,
  }: {
    operation: string;
    accountName: string;
  }) => {
    if (operation === 'created') {
      notifications.show({
        title: 'アカウント作成成功',
        message: `アカウント"${accountName}"が正常に作成されました`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } else if (operation === 'updated') {
      console.log('アカウント更新成功');
      notifications.show({
        title: 'アカウント更新成功',
        message: `アカウント"${accountName}"が正常に更新されました`,
        color: 'green',
        icon: <IconCheck size={16} />,
        position: 'top-center',
      });
    }
  };

  // アカウント削除処理
  const handleDeleteAccount = () => {
    if (currentAccount) {
      dispatch(deleteXAccount(currentAccount.id))
        .then(() => {
          closeDeleteModal();
          notifications.show({
            title: 'アカウント削除成功',
            message: `アカウント"${currentAccount.name}"が正常に削除されました`,
            color: 'green',
          });
        })
        .catch((error) => {
          notifications.show({
            title: 'エラー',
            message: '削除に失敗しました: ' + error.message,
            color: 'red',
          });
        });
    }
  };

  // 行アクション（編集・削除ボタン）の定義
  const renderRowActions = ({
    row,
    table,
  }: {
    row: MRT_Row<XAccount>;
    table: MRT_TableInstance<XAccount>;
  }) => {
    return (
      <Box style={{ display: 'flex', gap: '8px' }}>
        <Tooltip label="編集">
          <ActionIcon
            onClick={() => {
              setCurrentRow(row);
              setCurrentAccount(row.original);
              table.setEditingRow(row);
            }}
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="削除">
          <ActionIcon
            color="red"
            onClick={() => {
              setCurrentAccount(row.original);
              openDeleteModal();
            }}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="詳細">
          <ActionIcon
            onClick={() => {
              notifications.show({
                title: 'アカウント詳細',
                message: `アカウント名: ${row.original.name}`,
                color: 'gray',
                position: 'top-center',
                icon: <IconCheck size={16} />,
              });
            }}
          >
            <IconCheck size={18} />
          </ActionIcon>
        </Tooltip>
      </Box>
    );
  };

  // テーブル設定
  const table = useMantineReactTable({
    columns,
    data: xAccountList,
    state: {
      columnVisibility,
      isLoading,
    },
    enableRowActions: true,
    renderRowActions,
    positionActionsColumn: 'first',
    displayColumnDefOptions: {
      'mrt-row-actions': {
        size: 120,
        minSize: 100,
      },
    },
    enableEditing: true,
    enableRowSelection: true,
    enableColumnResizing: true,
    enableColumnActions: false,
    enableSorting: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableFullScreenToggle: false,
    localization: MRT_Localization_JA,
    onColumnVisibilityChange: (
      updaterOrValue: MRT_Updater<MRT_VisibilityState> | MRT_VisibilityState
    ) => {
      if (typeof updaterOrValue === 'function') {
        setColumnVisibility((prev) => updaterOrValue(prev));
      } else {
        setColumnVisibility(updaterOrValue);
      }
    },
    renderTopToolbarCustomActions: ({ table }) => (
      <Button
        leftSection={<IconPlus size={18} />}
        onClick={() => {
          table.setCreatingRow(true);
        }}
      >
        新規アカウント追加
      </Button>
    ),
    renderCreateRowModalContent: ({ table, row }) => (
      <Paper shadow="xs">
        <XAccountForm
          row={null as any}
          table={table}
          accountData={emptyAccount}
          feedBack={handleFeedback}
        />
      </Paper>
    ),
    renderEditRowModalContent: ({ table, row }) => (
      <Paper shadow="xs">
        <XAccountForm
          row={row}
          table={table}
          accountData={currentAccount as XAccount}
          feedBack={handleFeedback}
        />
      </Paper>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Box style={{ display: 'flex', gap: '8px' }}>
        <MRT_ToggleGlobalFilterButton table={table} />
        <Tooltip label="CSVファイルでエクスポート">
          <Box style={{ p: 0, m: 0 }}>
            <ActionIcon
              disabled={table.getPrePaginationRowModel().rows.length === 0}
              onClick={() => handleExportData(table.getPrePaginationRowModel().rows)}
            >
              <IconFileArrowRight />
            </ActionIcon>
          </Box>
        </Tooltip>
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Box>
    ),
  });

  // 新規アカウント用の空のデータ
  const emptyAccount: XAccount = {
    id: '',
    name: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessTokenSecret: '',
    note: '',
  };

  return (
    <>
      <MantineReactTable table={table} />
      {/* 削除確認モーダル */}
      <Modal
        opened={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Xアカウント削除確認"
        size="md"
        styles={{
          content: {
            borderLeft: '4px solid red',
          },
        }}
      >
        <Text>アカウント「{currentAccount?.name}」を削除してもよろしいですか？</Text>
        <Group justify="end" mt="md">
          <Button variant="outline" onClick={closeDeleteModal}>
            キャンセル
          </Button>
          <Button color="red" onClick={handleDeleteAccount} loading={isLoading}>
            削除
          </Button>
        </Group>
      </Modal>
    </>
  );
};

export default XAccountsListTable;
