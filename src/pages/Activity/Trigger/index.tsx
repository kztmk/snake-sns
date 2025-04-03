import { useEffect, useState } from 'react';
import { IconCheck, IconClock, IconHourglass, IconRefresh, IconX } from '@tabler/icons-react';
import axios from 'axios';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
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
      <Title order={3} mb="md">
        トリガー管理
      </Title>

      <Card withBorder mb="md">
        <Group style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <Text fw={500} mb="xs">
              自動投稿:
            </Text>
            <Text size="sm" c="dimmed">
              予約投稿を自動的に実行するためのトリガーを管理します。
            </Text>
            {triggerStatus && (
              <Group mt="xs">
                <Badge
                  color={triggerStatus.isTriggerConfigured ? 'green' : 'gray'}
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
          </div>

          <Group>
            <Switch
              checked={triggerStatus.isTriggerConfigured || false}
              onChange={(event) => handleTriggerToggle(event.currentTarget.checked)}
              size="lg"
              label={triggerStatus.isTriggerConfigured ? '動作中' : '起動'}
              disabled={status === 'loading'}
            />
            <NumberInput
              label="間隔 (分)"
              value={1}
              onChange={(value) => setInterval(Number(value))}
            />
          </Group>
        </Group>
      </Card>

      <Text size="sm" c="dimmed" mt="lg">
        トリガーを有効にすると、設定された時刻に従って予約投稿が自動的に実行されます。
        トリガーを無効にすると、新たな自動投稿は行われなくなります。
      </Text>
    </Paper>
  );
};

export default Trigger;
