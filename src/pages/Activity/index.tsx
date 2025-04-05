import { useEffect, useState } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { Alert, Container, Paper, Tabs, Title } from '@mantine/core';
import { useAppSelector } from '@/hooks/rtkhooks';
import SheetData from './SheetData';
import Trigger from './Trigger';

/**
 * Activityコンポーネント
 * サインイン後に表示される画面。Google SheetのURLが設定されているかチェックし、
 * 設定されている場合はTriggerとSheetDataコンポーネントを表示する。
 */
const Activity = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<string | null>('trigger');

  // Google Sheet URLが設定されているかチェック
  if (!user.googleSheetUrl) {
    return (
      <Container size="lg" py="xl">
        <Paper p="md" withBorder>
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="設定エラー"
            color="red"
            variant="filled"
          >
            Google SheetのURLが設定されていません。プロフィールページでGoogle Sheet
            URLを設定してください。
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">
        アクティビティ
      </Title>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="trigger">トリガー管理</Tabs.Tab>
          <Tabs.Tab value="data">データ管理</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="trigger" pt="md">
          <Trigger />
        </Tabs.Panel>

        <Tabs.Panel value="data" pt="md">
          <SheetData />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default Activity;
