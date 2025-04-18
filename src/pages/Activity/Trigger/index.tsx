import { useEffect, useState } from 'react';
import { IconCheck, IconClock, IconHourglass, IconRefresh, IconX } from '@tabler/icons-react';
import axios from 'axios';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import {
  createTrigger,
  deleteTrigger,
  getTriggerStatus,
} from '@/store/reducers/apiControllerSlice';

/**
 * トリガー管理コンポーネント
 * トリガーの状態表示とトリガーのON/OFF切り替え機能を提供
 */
const Trigger = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { status, error, triggerStatus } = useAppSelector((state) => state.apiController);

  const [interval, setInterval] = useState<number>(5);
  const dispatch = useAppDispatch();

  // 許可される間隔の選択肢
  const intervalOptions = [
    { value: '1', label: '1分' },
    { value: '5', label: '5分' },
    { value: '10', label: '10分' },
    { value: '15', label: '15分' },
    { value: '30', label: '30分' },
  ];

  // トリガー状態の切り替えハンドラ
  const handleTriggerToggle = async (checked: boolean) => {
    if (checked) {
      dispatch(createTrigger({ functionName: 'autoPostToX', intervalMinutes: interval }));
    } else {
      dispatch(deleteTrigger());
    }
  };

  // トリガー状態の取得
  useEffect(() => {
    dispatch(getTriggerStatus({ functionName: 'autoPostToX' }));
  }, []);

  return (
    <Paper p="md" withBorder>
      <LoadingOverlay visible={status === 'loading'} />
      <Group gap="lg" mb="md">
        <Title order={3}>トリガー管理</Title>
        <Button
          leftSection={<IconRefresh size={18} />}
          onClick={() => dispatch(getTriggerStatus({ functionName: 'autoPostToX' }))}
          disabled={status === 'loading'}
          variant="light"
        >
          データ更新
        </Button>
      </Group>
      <Card withBorder mb="md">
        <Grid justify="center" align="center" gutter={20}>
          <Grid.Col span={{ base: 12, xs: 12, sm: 6 }}>
            <Box style={{ height: '100%' }}>
              <Group align="center" style={{ display: 'flex' }}>
                <Text fw={500}>自動投稿:</Text>

                {triggerStatus && (
                  <Group>
                    <Badge
                      color={triggerStatus.isTriggerConfigured ? 'green' : 'red'}
                      variant="light"
                      leftSection={
                        triggerStatus.isTriggerConfigured ? (
                          <IconClock size={14} />
                        ) : (
                          <IconX size={14} />
                        )
                      }
                    >
                      {triggerStatus.isTriggerConfigured ? 'アクティブ' : '停止中'}
                    </Badge>

                    {triggerStatus.isTriggerConfigured && triggerStatus.interval && (
                      <Badge color="blue" variant="light">
                        {triggerStatus.interval}分間隔
                      </Badge>
                    )}
                  </Group>
                )}
              </Group>
              <Text size="sm" c="dimmed">
                予約投稿を自動的に実行するためのトリガーを管理します。
              </Text>
            </Box>
          </Grid.Col>
          <Grid.Col span={{ base: 12, xs: 12, sm: 6 }}>
            <Box style={{ height: '100%' }}>
              <Group align="center" gap="lg">
                <Switch
                  checked={triggerStatus?.isTriggerConfigured || false}
                  onChange={(event) => handleTriggerToggle(event.currentTarget.checked)}
                  size="lg"
                  label={triggerStatus?.isTriggerConfigured ? '動作中' : '起動'}
                  disabled={status === 'loading'}
                  labelPosition="left"
                  style={{ marginTop: '24px' }}
                />
                <Select
                  label="間隔"
                  value={String(interval)} // Select の value は string
                  onChange={(value) => {
                    if (value) {
                      setInterval(Number(value)); // state には number で保存
                    }
                  }}
                  data={intervalOptions}
                  disabled={triggerStatus?.isTriggerConfigured || status === 'loading'} // トリガー動作中は変更不可にする
                  style={{ width: '120px' }}
                  allowDeselect={false} // 選択解除を不許可
                />
              </Group>
            </Box>
          </Grid.Col>
        </Grid>
      </Card>

      <Text size="sm" c="dimmed" mt="lg">
        トリガーを有効にすると、設定された時刻に従って予約投稿が自動的に実行されます。
        トリガーを無効にすると、新たな自動投稿は行われなくなります。
      </Text>
    </Paper>
  );
};

export default Trigger;
