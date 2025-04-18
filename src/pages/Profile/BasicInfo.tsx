import { useEffect, useState } from 'react';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import {
  Avatar,
  Box,
  Button,
  Center,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  rem,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import type { FileWithPath } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import AvatarDropzone from '@/components/DropZone/AvatarDropzone';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import { setProfile } from '@/store/reducers/auth';
import sysAnnouncementColumns from './systemAnnouncements/sysAnnouncementsTable/sysAnnouncementsColumns';
import SystemAnnouncementTable from './systemAnnouncements/sysAnnouncementsTable/sysAnnouncementsTable';

function BasicInfo() {
  const [avatarFile, setAvatarFile] = useState<FileWithPath | null>(null);
  const [openSysAnnouncement, setSysAnnouncement] = useState(false);
  const { loading, user, error, task } = useAppSelector((state) => state.auth);
  const { displayName, role, avatarUrl } = user || {};

  const form = useForm({
    initialValues: {
      displayName: displayName || '',
      role: role || '',
    },
  });
  const dispatch = useAppDispatch();

  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (error) {
      if (task === 'error_profile') {
        notifications.show({
          title: 'エラー',
          message: 'プロフィールの更新に失敗しました。',
          color: 'red',
          icon: <IconX size="1rem" />,
        });
      }
    }
    if (task === 'update_profile') {
      notifications.show({
        title: '更新完了',
        message: 'プロフィールを更新しました。',
        color: 'green',
        icon: <IconUpload size="1rem" />,
      });
    }
  }, [loading, error, task, dispatch]);

  const onSubmit = async (values: { displayName: string; role: string }) => {
    dispatch(
      setProfile({
        displayName: values.displayName,
        role: values.role,
        avatar: avatarFile,
        backgroundImage: null,
      })
    );
  };

  const handleCloseSysAnnouncement = () => {
    setSysAnnouncement(false);
  };

  return (
    <>
      <Paper shadow="sm" p="lg" radius="md" withBorder>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Stack>
          <Title order={4}>基本情報</Title>

          <Center>
            <Stack align="center">
              <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack align="center">
                  <Title order={5} mt="md">
                    アバター
                  </Title>
                  <AvatarDropzone
                    onFilesSelected={(files: File[]) => setAvatarFile(files[0])}
                    {...(avatarUrl ? { defaultUrl: avatarUrl } : {})}
                  />
                </Stack>
                <Group mt="xs">
                  <Box style={{ textAlign: 'left' }}>
                    <TextInput
                      label="肩書き"
                      placeholder="肩書き"
                      withAsterisk
                      {...form.getInputProps('role')}
                      key={form.key('role')}
                      mb="md"
                      w="100%"
                    />
                  </Box>
                  <Box style={{ textAlign: 'left' }}>
                    <TextInput
                      label="表示名"
                      placeholder="表示名"
                      withAsterisk
                      {...form.getInputProps('displayName')}
                      key={form.key('displayName')}
                      mb="md"
                      w="100%"
                    />
                  </Box>
                </Group>
                {/* System Announcements Button - added as per image, though functionality isn't specified */}
                <Button type="submit" mt="sm">
                  保存
                </Button>
                {role === 'admin1114inazuma' && (
                  <Button
                    variant="outline"
                    color="blue"
                    mt="sm"
                    onClick={() => setSysAnnouncement(true)}
                  >
                    システムアナウンスメント
                  </Button>
                )}
              </form>
            </Stack>
          </Center>
        </Stack>
      </Paper>
      <Modal
        opened={openSysAnnouncement}
        onClose={handleCloseSysAnnouncement}
        title="System Announcements"
      >
        <SystemAnnouncementTable />
      </Modal>
    </>
  );
}

export default BasicInfo;
