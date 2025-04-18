import dayjs from 'dayjs';
import React, { useEffect } from 'react';
import { MRT_Row, MRT_TableInstance } from 'mantine-react-table';
import { z } from 'zod';
import {
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useForm, zodResolver } from '@mantine/form';
import { useAppDispatch } from '@/hooks/rtkhooks';
import {
  addSystemAnnouncement,
  SystemAnnouncement,
  updateSystemAnnouncement,
} from '@/store/reducers/systemAnnouncementSlice';

// バリデーションスキーマ
const schema = z.object({
  id: z.string(),
  date: z.string(),
  status: z.enum(['info', 'bugs', 'fixed', 'update', 'important', 'feature']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
});

type FormData = z.infer<typeof schema>;

type SystemAnnouncementFormProps = {
  row: MRT_Row<SystemAnnouncement>;
  table: MRT_TableInstance<SystemAnnouncement>;
  mode: 'add' | 'edit';
};

const SystemAnnouncementForm: React.FC<SystemAnnouncementFormProps> = ({ row, table, mode }) => {
  const dispatch = useAppDispatch();

  const form = useForm<FormData>({
    validate: zodResolver(schema),
    initialValues: {
      id: '',
      date: dayjs().format('YYYY-MM-DD'),
      status: 'info',
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (mode === 'edit') {
      form.setValues({
        id: row.original.id,
        date: row.original.date,
        status: row.original.status,
        title: row.original.title,
        description: row.original.description,
      });
    }
  }, [mode, row, form]);

  const handleCancel = () => {
    if (mode === 'edit') {
      table.setEditingRow(null);
    } else {
      table.setCreatingRow(null);
    }
  };

  const handleSubmit = (values: FormData) => {
    console.log('onSubmit', values);
    if (mode === 'add') {
      dispatch(addSystemAnnouncement(values));
      table.setCreatingRow(null);
    } else {
      dispatch(updateSystemAnnouncement(values));
      table.setEditingRow(null);
    }
  };

  return (
    <Grid>
      <Grid.Col span={12}>
        <Card shadow="sm" padding="lg">
          <form
            onSubmit={form.onSubmit(handleSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <DatePicker
              value={dayjs(form.values.date).toDate()}
              onChange={(date) =>
                form.setFieldValue('date', date ? dayjs(date).format('YYYY-MM-DD') : '')
              }
            />
            <Select
              label="Status"
              data={[
                { value: 'info', label: 'Info' },
                { value: 'bugs', label: 'Bugs' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'update', label: 'Update' },
                { value: 'important', label: 'Important' },
                { value: 'feature', label: 'Feature' },
              ]}
              {...form.getInputProps('status')}
            />
            <TextInput
              label="Title"
              placeholder="Enter title"
              error={form.errors.title}
              {...form.getInputProps('title')}
            />
            <Textarea
              label="Description"
              placeholder="Enter description"
              minRows={4}
              error={form.errors.description}
              {...form.getInputProps('description')}
            />
            <Divider />
            <Stack gap="sm">
              <Button variant="outline" color="blue" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" color="blue">
                Submit
              </Button>
            </Stack>
          </form>
        </Card>
      </Grid.Col>
    </Grid>
  );
};

export default SystemAnnouncementForm;
