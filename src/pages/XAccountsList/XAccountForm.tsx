import React, { useEffect } from 'react';
import { IconCheck, IconDeviceFloppy, IconEdit, IconPlus, IconX } from '@tabler/icons-react';
import { MRT_Row, MRT_TableInstance } from 'mantine-react-table';
import { z } from 'zod';
import { Box, Button, Card, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { notifications, showNotification } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { createXAccount, resetProcess, updateXAccount } from '@/store/reducers/xAccountsSlice';
import { XAccount } from '@/types/xAccounts';

// XAccountフォームのバリデーションスキーマ
const schema = z.object({
  name: z
    .string()
    .min(1, 'アカウント名は必須です')
    .regex(/^@/, 'アカウント名は@から始めてください'),
  apiKey: z.string().min(1, 'API Keyは必須です'),
  apiSecret: z.string().min(1, 'API Secretは必須です'),
  accessToken: z.string().min(1, 'Access Tokenは必須です'),
  accessTokenSecret: z.string().min(1, 'Access Token Secretは必須です'),
  note: z.string().optional(),
});

/**
 * XAccoutのDataを登録・編集するためのForm
 *
 */
interface XAccountFormProps {
  row: MRT_Row<XAccount>;
  table: MRT_TableInstance<XAccount>;
  accountData: XAccount;
  feedBack: ({ operation, accountName }: { operation: string; accountName: string }) => void;
}

// 空のフォーム初期値
const emptyInitialValues = {
  id: '',
  name: '',
  apiKey: '',
  apiSecret: '',
  accessToken: '',
  accessTokenSecret: '',
  note: '',
};

const XAccountForm: React.FC<XAccountFormProps> = (props) => {
  const { row, table, accountData, feedBack } = props;
  const dispatch = useAppDispatch();
  const { process, isLoading, isError, errorMessage } = useAppSelector((state) => state.xAccounts);

  // フォームの初期化
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: structuredClone(accountData) || emptyInitialValues,
    validate: zodResolver(schema),
  });

  // dipatchの結果を受け取る
  useEffect(() => {
    if (!isLoading && isError) {
      // error
      notifications.show({
        title: 'エラー',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={16} />,
        position: 'top-center',
        withCloseButton: true,
      });
    }
    if (!isLoading && !isError && process === 'addNew') {
      // success
      dispatch(resetProcess());
      feedBack({ operation: 'created', accountName: form.getValues().name });
      table.setCreatingRow(null);
    }
    if (!isLoading && !isError && process === 'update') {
      // update success
      // show dialog
      dispatch(resetProcess());
      feedBack({ operation: 'updated', accountName: form.getValues().name });
      table.setEditingRow(null);
    }
  }, [isLoading, isError, errorMessage, process, dispatch]);

  const handleSubmit = async (values: XAccount) => {
    if (row) {
      // 更新処理
      const updatedValues = {
        ...values,
        id: row.original.id,
      };
      await dispatch(updateXAccount(updatedValues));
    } else {
      // 登録処理
      await dispatch(createXAccount(values));
    }
  };

  const handleCancel = () => {
    // フォームをクリアしてモーダルを閉じる
    if (row) {
      form.reset();
      table.setEditingRow(null);
    } else {
      form.reset();
      table.setCreatingRow(null);
    }
  };

  // フォームアクション用のアイコンを選択
  const actionIcon = row ? <IconEdit size={18} /> : <IconPlus size={18} />;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Box mx="auto" w="100%">
        <form onSubmit={form.onSubmit(handleSubmit)} style={{ width: '100%' }}>
          <TextInput
            label="アカウント名"
            placeholder="API用アカウント名"
            withAsterisk
            {...form.getInputProps('name')}
            key={form.key('name')}
            mb="md"
            w="100%"
          />

          <TextInput
            label="API Key"
            placeholder="TwitterのAPI Key"
            withAsterisk
            {...form.getInputProps('apiKey')}
            key={form.key('apiKey')}
            mb="md"
            w="100%"
          />

          <TextInput
            label="API Secret"
            placeholder="TwitterのAPI Secret"
            withAsterisk
            {...form.getInputProps('apiSecret')}
            key={form.key('apiSecret')}
            mb="md"
            w="100%"
          />

          <TextInput
            label="Access Token"
            placeholder="TwitterのAccess Token"
            withAsterisk
            {...form.getInputProps('accessToken')}
            key={form.key('accessToken')}
            mb="md"
            w="100%"
          />

          <TextInput
            label="Access Token Secret"
            placeholder="TwitterのAccess Token Secret"
            withAsterisk
            {...form.getInputProps('accessTokenSecret')}
            key={form.key('accessTokenSecret')}
            mb="md"
            w="100%"
          />

          <Textarea
            label="メモ"
            placeholder="このアカウントに関するメモ"
            {...form.getInputProps('note')}
            key={form.key('note')}
            mb="md"
            minRows={3}
            w="100%"
          />

          <Group justify="center" mt="xl" w="100%" gap="md">
            <Button
              variant="outline"
              color="gray"
              onClick={handleCancel}
              size="md"
              w={150}
              leftSection={<IconX size={18} />}
              type="button"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              size="md"
              w={150}
              leftSection={!isLoading && actionIcon}
            >
              {row ? '更新' : '作成'}
            </Button>
          </Group>
        </form>
      </Box>
    </Card>
  );
};

export default XAccountForm;
