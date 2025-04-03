import { useMemo } from 'react';
import { IconBrandX, IconCheck, IconExternalLink, IconId, IconUser } from '@tabler/icons-react';
import { MantineReactTable, MRT_ColumnDef } from 'mantine-react-table';
import { MRT_Localization_JA } from 'mantine-react-table/locales/ja/index.cjs';
import { Badge, Box, Group, Text, Tooltip } from '@mantine/core';
import { XPostedDataType } from '@/types/xAccounts';

interface PostedTableProps {
  data: XPostedDataType[];
  isLoading: boolean;
}

/**
 * 投稿済みデータテーブルコンポーネント
 */
const PostedTable = ({ data, isLoading }: PostedTableProps) => {
  // テーブルのカラム定義
  const columns = useMemo<MRT_ColumnDef<XPostedDataType>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 100,
        enableSorting: true,
        enableColumnFilter: false,
        Cell: ({ cell }) => (
          <Tooltip label={`ID: ${cell.getValue<string>()}`}>
            <Badge leftSection={<IconId size={14} />} color="gray" variant="outline">
              {cell.getValue<string>()?.substring(0, 8)}...
            </Badge>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'postTo',
        header: 'アカウント',
        size: 150,
        enableSorting: true,
        Cell: ({ cell }) => (
          <Badge leftSection={<IconUser size={14} />} color="blue" variant="light">
            {cell.getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: 'contents',
        header: '投稿内容',
        size: 300,
        enableSorting: true,
        Cell: ({ cell }) => (
          <Box style={{ maxWidth: '300px', overflowWrap: 'break-word' }}>
            {cell.getValue<string>()}
          </Box>
        ),
      },
      {
        accessorKey: 'postedAt',
        header: '投稿日時',
        size: 180,
        enableSorting: true,
        sortingFn: 'datetime',
        Cell: ({ cell }) => (
          <Text>
            {cell.getValue<string>() ? new Date(cell.getValue<string>()).toLocaleString() : '-'}
          </Text>
        ),
      },
      {
        accessorKey: 'postedId',
        header: '投稿結果',
        size: 120,
        enableSorting: true,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return value ? (
            <Badge color="green" leftSection={<IconCheck size={14} />}>
              成功
            </Badge>
          ) : (
            <Badge color="red">失敗</Badge>
          );
        },
      },
      {
        accessorKey: 'postedId',
        header: 'ポストID',
        size: 150,
        enableSorting: false,
        Cell: ({ cell, row }) => {
          const postId = cell.getValue<string>();
          return postId ? (
            <Group gap="xs">
              <Badge
                color="blue"
                leftSection={<IconBrandX size={14} />}
                rightSection={
                  <IconExternalLink
                    size={14}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      window.open(
                        `https://x.com/${row.original.postTo?.replace('@', '')}/status/${postId}`,
                        '_blank'
                      )
                    }
                  />
                }
              >
                {postId.substring(0, 8)}...
              </Badge>
            </Group>
          ) : (
            '-'
          );
        },
      },
      {
        accessorKey: 'inReplyToOnX',
        header: 'リプライ先',
        size: 150,
        enableSorting: false,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return value ? (
            <Badge color="blue" variant="dot">
              {value.substring(0, 8)}...
            </Badge>
          ) : (
            '-'
          );
        },
      },
    ],
    []
  );

  return (
    <MantineReactTable
      columns={columns}
      data={data}
      enableColumnFilterModes
      enableColumnOrdering
      enableGlobalFilter
      enablePagination
      enableSorting
      enableBottomToolbar
      enableTopToolbar
      localization={MRT_Localization_JA}
      initialState={{
        density: 'xs',
        showColumnFilters: false,
        sorting: [{ id: 'postedAt', desc: true }],
        pagination: { pageSize: 10, pageIndex: 0 },
        columnVisibility: { id: false },
      }}
      mantineTableProps={{
        withTableBorder: true,
        withColumnBorders: true,
        highlightOnHover: true,
        striped: true,
      }}
      state={{
        isLoading,
      }}
    />
  );
};

export default PostedTable;
