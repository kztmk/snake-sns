import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import React from 'react';
import * as z from 'zod';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DateInput, DatePicker, TimeInput } from '@mantine/dates';
import { useForm, zodResolver } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';

dayjs.extend(isSameOrAfter);

type XPostScheduleFormPropsType = {
  setSchedule: (data: ScheduleData | null) => void;
  dialogOpen: boolean;
  onClose: () => void;
};

// dayjs オブジェクトを検証するカスタムバリデーション
const dayjsSchema = z.custom<dayjs.Dayjs>((value) => dayjs.isDayjs(value), {
  message: 'Expected a Dayjs object',
});

const isTimeOverStart = (startDate: dayjs.Dayjs, startTime: dayjs.Dayjs): boolean => {
  const combineDateTime = dayjs(startDate)
    .year(startDate.year())
    .month(startDate.month())
    .date(startDate.date())
    .hour(startTime.hour())
    .minute(startTime.minute());
  return dayjs().isBefore(combineDateTime);
};

const schema = z
  .object({
    startDate: dayjsSchema,
    endDate: dayjsSchema,
    startTime: dayjsSchema,
    endTime: dayjsSchema,
    duration: z.number().gt(0, { message: '投稿間隔はゼロ以上にしてください。' }),
    unit: z.boolean(),
  })
  .refine((data) => data.startDate && data.endDate && data.endDate.isSameOrAfter(data.startDate), {
    message: '終了日は開始日以降です。',
    path: ['endDate'],
  })
  .refine((data) => data.endDate && data.endDate.isBefore(dayjs().add(18, 'month')), {
    message: '終了日は現在より18ヶ月以内です。',
    path: ['endDate'],
  })
  .refine((data) => data.startDate && isTimeOverStart(data.startDate, data.startTime), {
    message: '開始日は現在より先を指定してください。',
    path: ['startTime'],
  });

export type ScheduleData = z.infer<typeof schema>;

const defaultValues: ScheduleData = {
  startDate: dayjs(),
  endDate: dayjs(),
  startTime: dayjs(),
  endTime: dayjs(),
  duration: 0,
  unit: false,
};

const XPostScheduleForm: React.FC<XPostScheduleFormPropsType> = (props) => {
  const { setSchedule, dialogOpen, onClose } = props;

  const form = useForm<ScheduleData>({
    initialValues: defaultValues,
    validate: zodResolver(schema),
  });

  const onSubmit = (data: ScheduleData) => {
    setSchedule(data);
    onClose();
  };

  const handleCancel = () => {
    setSchedule(null);
    onClose();
  };

  const handleReset = () => {
    form.setValues(defaultValues);
  };

  return (
    <Modal opened={dialogOpen} onClose={onClose} title="投稿予約作成">
      <Paper component="form" id="schedule-form" onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <DateInput label="開始日" required {...form.getInputProps('startDate')} />
          <DateInput label="終了日" required {...form.getInputProps('endDate')} />
          <TimeInput label="開始時刻" required {...form.getInputProps('startTime')} />
          <TimeInput label="終了時刻" required {...form.getInputProps('endTime')} />
          <NumberInput label="投稿間隔" required {...form.getInputProps('duration')} />
          <Group>
            <Text>分</Text>
            <Switch label="時" {...form.getInputProps('unit', { type: 'checkbox' })} />
          </Group>
          <Group mt="md">
            <Button variant="outline" color="red" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button variant="outline" color="gray" onClick={handleReset}>
              リセット
            </Button>
            <Button type="submit">作成</Button>
          </Group>
        </Stack>
      </Paper>
    </Modal>
  );
};

export default XPostScheduleForm;
