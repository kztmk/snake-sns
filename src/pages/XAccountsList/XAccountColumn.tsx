import { useMemo } from 'react';
import { type MRT_ColumnDef } from 'mantine-react-table';
import { Link } from 'react-router';
import { type XAccount } from '@/types/xAccounts';

export const columns: MRT_ColumnDef<XAccount>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 100,
    enableEditing: false,
    visibleInShowHideMenu: false,
    enableHiding: true,
  },
  {
    accessorKey: 'name',
    header: 'アカウント名',
    size: 150,
    Cell: ({ row }) => (
      <Link to={`/dashboard/x-accounts/${row.original.id}`}>{row.original.name}</Link>
    ),
  },
  {
    accessorKey: 'apiKey',
    header: 'API Key',
    size: 150,
    enableSorting: false,
  },
  {
    accessorKey: 'apiSecret',
    header: 'API Secret',
    size: 150,
    enableSorting: false,
  },
  {
    accessorKey: 'accessToken',
    header: 'Access Token',
    size: 150,
    enableSorting: false,
  },
  {
    accessorKey: 'accessTokenSecret',
    header: 'Access Token Secret',
    size: 150,
    enableSorting: false,
  },
  {
    accessorKey: 'note',
    header: '備考',
    size: 200,
    enableSorting: false,
  },
];
