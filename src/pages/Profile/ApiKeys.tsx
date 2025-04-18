import { useEffect, useState } from 'react';
import { Button, LoadingOverlay, Paper, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { saveApiKeys } from '@/store/reducers/auth';

interface FormValues {
  chatGptApiKey: string;
  geminiApiKey: string;
  anthropicApiKey: string;
  googleSheetUrl: string;
}

function ApiKeySettings() {
  const { loading, error, user, task } = useAppSelector((state) => state.auth);
  const { chatGptApiKey, geminiApiKey, anthropicApiKey, googleSheetUrl } = user;
  const dispatch = useAppDispatch();

  const form = useForm<FormValues>({
    initialValues: {
      chatGptApiKey: chatGptApiKey || '',
      geminiApiKey: geminiApiKey || '',
      anthropicApiKey: anthropicApiKey || '',
      googleSheetUrl: googleSheetUrl || '',
    },
  });

  useEffect(() => {
    if (task === 'error_api_keys') {
      notifications.show({
        title: 'エラー',
        message: 'APIキーの保存に失敗しました。',
        color: 'red',
      });
    }
    if (task === 'save_api_keys') {
      notifications.show({
        title: '保存完了',
        message: 'APIキーを保存しました。',
        color: 'green',
      });
    }
  }, [loading, error, task, dispatch]);

  const handleSubmit = (values: FormValues) => {
    dispatch(
      saveApiKeys({
        chatGptApiKey: values.chatGptApiKey,
        geminiApiKey: values.geminiApiKey,
        anthropicApiKey: values.anthropicApiKey,
        googleSheetUrl: values.googleSheetUrl,
      })
    );
  };

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder>
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
      <Stack>
        <Title order={4}>APIキー</Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Google Sheets URL"
            placeholder="Google SheetsのURLを入力してください"
            {...form.getInputProps('googleSheetUrl')}
            w="100%"
          />
          <TextInput
            label="OpenAI API Key"
            placeholder="OpenAI API Keyを入力してください"
            {...form.getInputProps('chatGptApiKey')}
            w="100%"
          />

          <TextInput
            label="Gemini API Key"
            placeholder="Gemini API Keyを入力してください"
            {...form.getInputProps('geminiApiKey')}
            w="100%"
          />

          <TextInput
            label="Anthropic API Key"
            placeholder="Anthropic API Keyを入力してください"
            {...form.getInputProps('anthropicApiKey')}
            w="100%"
          />

          <Button type="submit" mt="xl">
            保存
          </Button>
        </form>
      </Stack>
    </Paper>
  );
}

export default ApiKeySettings;
