import dayjs from 'dayjs';
import { MRT_ColumnDef } from 'mantine-react-table';
import { XPostDataType } from '@/types/xAccounts';

export const columns: MRT_ColumnDef<XPostDataType>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
  },
  {
    accessorKey: 'postTo',
    header: '投稿先',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableHiding: true,
  },
  {
    accessorKey: 'inReplyToInternal',
    header: 'リプライ先',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableHiding: true,
  },
  {
    accessorKey: 'contents',
    header: 'ポスト',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableHiding: true,
  },
  {
    accessorKey: 'media',
    header: '画像',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableHiding: true,
    Cell: ({ row }) => {
      if (row.original.media && JSON.parse(row.original.media).length > 0) {
        const images = JSON.parse(row.original.media);
        return (
          <>
            {images.map((_: void, index: number) => (
              <span key={index}>🌟</span>
            ))}
          </>
        );
      } else {
        return 'No Images';
      }
    },
  },
  {
    accessorKey: 'postSchedule',
    header: '予約時刻',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableHiding: true,

    Cell: ({ row }) => {
      const postTime = row.original.postSchedule;
      if (postTime && postTime.length > 0) {
        return dayjs(row.original.postSchedule).format('YYYY/MM/DD HH:mm');
      } else {
        return '予約無し';
      }
    },
  },
  {
    accessorKey: 'createdAt',
    header: '作成日',
    mantineTableHeadCellProps: {
      align: 'center',
    },
    mantineTableBodyCellProps: {
      align: 'left',
    },
    enableHiding: true,
  },
];
