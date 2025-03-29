import { useEffect, useState } from 'react';
import { IconCheck, IconX } from '@tabler/icons-react';
import { z } from 'zod';
import {
  Box,
  Button,
  List,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Stack,
  TextInput,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { updateUserPassword } from '@/store/reducers/authSlice';
import {
  isLowercaseChar,
  isNumber,
  isSpecialChar,
  isUppercaseChar,
  minLength,
} from '@/utils/password-validation';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'パスワードは最低8文字以上')
      .regex(/[A-Z]/, 'パスワードは最低1つの大文字を含む必要があります')
      .regex(/[a-z]/, 'パスワードは最低1つの小文字を含む必要があります')
      .regex(/[0-9]/, 'パスワードは最低1つの数字を含む必要があります')
      .regex(/[~!@#$%^&*+\-?]/, 'パスワードは最低1つの記号(~!@#$%&*+)を含む必要があります'),
    confirmNewPassword: z.string().min(8, 'パスワードは最低8文字以上必要です。'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmNewPassword'], // path of error
  });

type FormData = z.infer<typeof schema>;

export default function PasswordChange() {
  const { loading, error, task } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const form = useForm<FormData>({
    initialValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
    validate: zodResolver(schema),
    validateInputOnBlur: true, // フォーカスが外れたときにバリデーションを実行
    validateInputOnChange: true, // 入力が変更されたときにバリデーションを実行
  });

  useEffect(() => {
    if (error) {
      if (task === 'error_password') {
        notifications.show({
          title: 'エラー',
          message: 'パスワードの変更に失敗しました。',
          color: 'red',
        });
      }
    }
    if (task === 'update_password') {
      notifications.show({
        title: '更新完了',
        message: 'パスワードを変更しました。',
        color: 'green',
      });
    }
  }, [loading, error, task, dispatch]);

  const onSubmit = async (values: FormData) => {
    dispatch(
      updateUserPassword({
        newPassword: values.newPassword,
      })
    );
  };

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder style={{ height: '100%' }}>
      <SimpleGrid
        cols={{ base: 1, md: 2 }}
        spacing={{ base: 'md', md: 'lg' }}
        verticalSpacing={{ base: 'md', md: 'lg' }}
        h="100%"
      >
        <Box style={{ width: '100%', padding: '16px' }}>
          <LoadingOverlay
            visible={loading}
            zIndex={1000}
            overlayProps={{ radius: 'sm', blur: 2 }}
          />
          <form onSubmit={form.onSubmit((values) => onSubmit(values))}>
            <Stack gap="md">
              <TextInput
                label="新しいパスワード"
                placeholder="新しいパスワードを入力してください"
                withAsterisk
                {...form.getInputProps('newPassword')}
              />
              <TextInput
                label="パスワードの確認"
                placeholder="パスワードを再度入力してください"
                withAsterisk
                {...form.getInputProps('confirmNewPassword')}
              />
              <Button
                type="submit"
                loading={loading}
                disabled={!form.isValid() || loading || Object.keys(form.errors).length > 0}
              >
                パスワードを変更
              </Button>
            </Stack>
          </form>
        </Box>
        <Box style={{ width: '100%', padding: '16px' }}>
          <List spacing="xs" size="sm" center>
            <List.Item
              icon={
                minLength(form.values.newPassword) ? (
                  <IconCheck size={16} color="green" />
                ) : (
                  <IconX size={16} color="red" />
                )
              }
            >
              パスワードは最低8文字以上
            </List.Item>
            <List.Item
              icon={
                isUppercaseChar(form.values.newPassword) ? (
                  <IconCheck size={16} color="green" />
                ) : (
                  <IconX size={16} color="red" />
                )
              }
            >
              パスワードは最低1つの大文字を含む必要があります(A~Z)
            </List.Item>
            <List.Item
              icon={
                isLowercaseChar(form.values.newPassword) ? (
                  <IconCheck size={16} color="green" />
                ) : (
                  <IconX size={16} color="red" />
                )
              }
            >
              パスワードは最低1つの小文字を含む必要があります(a~z)
            </List.Item>
            <List.Item
              icon={
                isNumber(form.values.newPassword) ? (
                  <IconCheck size={16} color="green" />
                ) : (
                  <IconX size={16} color="red" />
                )
              }
            >
              パスワードは最低1つの数字を含む必要があります(0~9)
            </List.Item>
            <List.Item
              icon={
                isSpecialChar(form.values.newPassword) ? (
                  <IconCheck size={16} color="green" />
                ) : (
                  <IconX size={16} color="red" />
                )
              }
            >
              パスワードは最低1つの記号(~!@#$%&*+)を含む必要があります
            </List.Item>
          </List>
        </Box>
      </SimpleGrid>
    </Paper>
  );
}
