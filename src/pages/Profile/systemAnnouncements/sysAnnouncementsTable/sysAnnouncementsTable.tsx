import { useEffect, useState } from 'react';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import {
  MantineReactTable,
  MRT_Row,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleGlobalFilterButton,
  useMantineReactTable,
} from 'mantine-react-table';
import { MRT_Localization_JA } from 'mantine-react-table/locales/ja/index.cjs';
import { ActionIcon, Box, Button, Group, Modal, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import {
  deleteSystemAnnouncement,
  fetchSystemAnnouncement,
  SystemAnnouncement,
  SystemAnnouncements,
} from '@/store/reducers/systemAnnouncementSlice';
import SystemAnnouncementForm from './sysAnnouncementForm';
import systemAnnouncementColumns from './sysAnnouncementsColumns';

const SystemAnnouncementTable = () => {
  const dispatch = useAppDispatch();
  // モーダル制御用のフック
  const [isDeleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [currentRow, setCurrentRow] = useState<MRT_Row<SystemAnnouncement> | null>(null);
  const { isLoading, error, sysAnnouncements } = useAppSelector(
    (state) => state.systemAnnouncements
  );

  useEffect(() => {
    console.log('fetching system announcements');
    dispatch(fetchSystemAnnouncement());
  }, []);

  const handleDeleteAccount = () => {
    if (currentRow) {
      dispatch(deleteSystemAnnouncement(currentRow.original.id));
      closeDeleteModal();
    }
  };

  const table = useMantineReactTable({
    columns: systemAnnouncementColumns,
    data: sysAnnouncements,
    // editing feature
    editDisplayMode: 'modal',
    // create row
    createDisplayMode: 'modal',
    enableFullScreenToggle: false,
    enableRowActions: true,
    enableRowNumbers: true,
    enableColumnResizing: true,
    state: {
      columnVisibility: {
        id: false,
        date: true,
        status: true,
        title: true,
        description: true,
      },
    },
    defaultDisplayColumn: {
      enableResizing: true,
    },
    displayColumnDefOptions: {
      'mrt-row-actions': {
        size: 140,

        visibleInShowHideMenu: false,
        mantineTableBodyCellProps: {
          style: {
            paddingLeft: '32px',
          },
        },
      },
      'mrt-row-numbers': {
        size: 48,
        visibleInShowHideMenu: false,
        mantineTableBodyCellProps: {
          align: 'center',
        },
      },
    },
    mantineTableProps: {
      style: {
        borderCollapse: 'separate',
      },
    },
    mantineTableBodyProps: {
      style: () => ({
        td: {
          paddingLeft: '0px',
        },
        tr: {
          paddingLeft: '8px',
        },
        '& td:first-of-type': {
          paddingLeft: '0px',
          paddingRight: '0px',
        },
      }),
    },
    mantineTableBodyCellProps: {
      style: {
        borderBottom: '#e0e0e0',
        backgroundColor: '#ffffff',
      },
    },
    mantineTableHeadCellProps: {
      style: {
        borderRadius: '5px 5px 0 0',
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
      },
    },
    localization: MRT_Localization_JA,
    renderCreateRowModalContent: ({ table, row }) => (
      <>
        <Modal
          opened={true}
          closeOnClickOutside={false}
          withCloseButton={false}
          onClose={() => table.setCreatingRow(null)}
        >
          <SystemAnnouncementForm table={table} row={row} mode="add" />
        </Modal>
      </>
    ),
    renderEditRowModalContent: ({ table, row }) => (
      <>
        <Modal
          opened={true}
          closeOnClickOutside={false}
          withCloseButton={false}
          onClose={() => table.setEditingRow(null)}
        >
          <SystemAnnouncementForm table={table} row={row} mode="edit" />
        </Modal>
      </>
    ),
    renderRowActions: ({ row, table }) => (
      <Box style={{ display: 'flex', gap: '0.2rem' }}>
        <Tooltip label="編集">
          <ActionIcon onClick={() => table.setEditingRow(row)}>
            <IconEdit />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="削除">
          <ActionIcon
            color="error"
            onClick={() => {
              setCurrentRow(row);
              openDeleteModal();
            }}
          >
            <IconTrash />
          </ActionIcon>
        </Tooltip>
      </Box>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
      <Box style={{ display: 'flex', gap: '16px', padding: '8px' }}>
        <Button variant="contained" onClick={() => table.setCreatingRow(true)}>
          新規お知らせ追加
        </Button>
      </Box>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Group>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Group>
    ),
  });

  return (
    <>
      <Box>
        <MantineReactTable table={table} />
      </Box>
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
        <Text>アカウント「{currentRow?.original.title}」を削除してもよろしいですか？</Text>
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

export default SystemAnnouncementTable;
