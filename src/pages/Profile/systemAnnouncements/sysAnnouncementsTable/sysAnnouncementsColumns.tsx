import { MRT_ColumnDef } from 'mantine-react-table';
import { SystemAnnouncement } from '@/store/reducers/systemAnnouncementSlice';

const sysAnnouncementColumns: Array<MRT_ColumnDef<SystemAnnouncement>> = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableHiding: true,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: '状況',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableSorting: true,
  },
  {
    id: 'title',
    accessorKey: 'title',
    header: 'タイトル',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableSorting: true,
    minSize: 450,
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: '内容',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableSorting: true,
  },
  {
    id: 'date',
    accessorKey: 'date',
    header: '更新日時',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableSorting: true,
  },
];

export default sysAnnouncementColumns;
