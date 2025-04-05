import { useMemo, useRef, useState } from 'react';
import { IconAlertTriangle, IconClipboard, IconId, IconUser } from '@tabler/icons-react';
import { MantineReactTable, MRT_ColumnDef } from 'mantine-react-table';
import { MRT_Localization_JA } from 'mantine-react-table/locales/ja/index.cjs';
import {
  ActionIcon,
  Badge,
  Box,
  Code,
  Group,
  Modal,
  Text,
  Tooltip,
  TypographyStylesProvider,
  UnstyledButton,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { PostError } from '@/types/xAccounts';

interface ErrorTableProps {
  data: PostError[];
  isLoading: boolean;
}

/**
 * エラーデータテーブルコンポーネント
 */
const ErrorTable = ({ data, isLoading }: ErrorTableProps) => {
  const [selectedError, setSelectedError] = useState<PostError | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const clipboard = useClipboard();
  const errorStackRef = useRef<HTMLDivElement>(null);

  const copyErrorToClipboard = () => {
    if (selectedError) {
      const errorText = `
Timestamp: ${selectedError.timestamp}
Message: ${selectedError.message}
Stack: ${selectedError.stack || 'N/A'}
Context: ${selectedError.context || 'N/A'}
      `.trim();

      clipboard.copy(errorText);
      notifications.show({
        title: 'コピー完了',
        message: 'エラー情報をクリップボードにコピーしました',
        color: 'blue',
      });
    }
  };

  // テーブルのカラム定義
  const columns = useMemo<MRT_ColumnDef<PostError>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: '発生時刻',
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
        accessorKey: 'message',
        header: 'エラーメッセージ',
        size: 300,
        enableSorting: true,
        Cell: ({ cell, row }) => (
          <UnstyledButton
            style={{
              maxWidth: '300px',
              overflowWrap: 'break-word',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#FA5252',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '4px',
            }}
            onClick={() => {
              setSelectedError(row.original);
              setModalOpened(true);
            }}
          >
            <IconAlertTriangle size={16} style={{ marginTop: '3px', flexShrink: 0 }} />
            <Text fw={500}>
              {cell.getValue<string>().length > 100
                ? `${cell.getValue<string>().substring(0, 100)}...`
                : cell.getValue<string>()}
            </Text>
          </UnstyledButton>
        ),
      },
      {
        accessorKey: 'context',
        header: 'コンテキスト',
        size: 180,
        enableSorting: true,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          try {
            // コンテキストがJSON形式であれば解析して表示
            if (value && value.startsWith('{') && value.endsWith('}')) {
              const contextObj = JSON.parse(value);

              // ここで特定のプロパティがあればバッジとして表示
              return (
                <Group gap="xs">
                  {contextObj.accountId && (
                    <Badge leftSection={<IconUser size={14} />} color="blue" variant="light">
                      {contextObj.accountId}
                    </Badge>
                  )}
                  {contextObj.postId && (
                    <Badge color="violet" variant="dot">
                      ID: {contextObj.postId.substring(0, 8)}...
                    </Badge>
                  )}
                  {contextObj.action && (
                    <Badge color="yellow" variant="light">
                      {contextObj.action}
                    </Badge>
                  )}
                </Group>
              );
            }
          } catch (e) {
            // JSON解析に失敗した場合
          }

          // それ以外の場合はシンプルに表示
          return value ? (
            <Text size="sm" color="dimmed" lineClamp={1}>
              {value.length > 30 ? `${value.substring(0, 30)}...` : value}
            </Text>
          ) : (
            '-'
          );
        },
      },
      {
        accessorKey: 'stack',
        header: 'スタックトレース',
        size: 120,
        enableSorting: false,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return value ? (
            <Badge color="gray" variant="outline">
              あり
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
    <>
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
          sorting: [{ id: 'timestamp', desc: true }],
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

      {/* エラー詳細モーダル */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="エラー詳細"
        size="lg"
        styles={{
          title: {
            color: '#FA5252',
            fontWeight: 'bold',
          },
        }}
      >
        {selectedError && (
          <>
            <Group mb="xs">
              <Text fw={500}>発生時刻</Text>
              <ActionIcon
                title="クリップボードにコピー"
                onClick={copyErrorToClipboard}
                variant="light"
                color="blue"
              >
                <IconClipboard size={16} />
              </ActionIcon>
            </Group>
            <Text mb="md">{new Date(selectedError.timestamp).toLocaleString()}</Text>

            <Text fw={500} mb="xs">
              関連情報
            </Text>

            <Text fw={500} mb="xs" color="red">
              エラーメッセージ
            </Text>
            <Code block mb="md">
              {selectedError.message}
            </Code>

            {selectedError.stack && (
              <>
                <Text fw={500} mb="xs">
                  スタックトレース
                </Text>
                <div ref={errorStackRef} style={{ maxHeight: '200px', overflow: 'auto' }}>
                  <Code block style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedError.stack}
                  </Code>
                </div>
              </>
            )}

            {selectedError.context && (
              <>
                <Text fw={500} mt="md" mb="xs">
                  コンテキスト
                </Text>
                <TypographyStylesProvider>
                  <Box
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '4px',
                      maxHeight: '100px',
                      overflow: 'auto',
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedError.context}</pre>
                  </Box>
                </TypographyStylesProvider>
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default ErrorTable;
