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
      if (!row.original.media) {
        return 'No Images';
      }

      try {
        const mediaStr = row.original.media;
        if (typeof mediaStr !== 'string' || mediaStr === '') {
          return 'No Images';
        }

        const images = JSON.parse(mediaStr);
        if (!Array.isArray(images) || images.length === 0) {
          return 'No Images';
        }

        return (
          <div style={{ display: 'flex', gap: '4px' }}>
            {images.map((image, index) => (
              <span key={index} title={image.fileName || `画像 ${index + 1}`}>
                🌟
              </span>
            ))}
          </div>
        );
      } catch (error) {
        console.error('Media parse error:', error);
        return '不正なメディア形式';
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
        let formattedTime = '';
        try {
          formattedTime = dayjs(row.original.postSchedule).format('YYYY/MM/DD HH:mm');
          return formattedTime;
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Invalid Date';
        }
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
    Cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      if (createdAt && createdAt.length > 0) {
        let formattedTime = '';
        try {
          formattedTime = dayjs(row.original.createdAt).format('YYYY/MM/DD HH:mm');
          return formattedTime;
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Invalid Date';
        }
      } else {
        return 'なし';
      }
    },
  },
];
