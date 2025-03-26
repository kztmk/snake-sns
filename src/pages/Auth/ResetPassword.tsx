import { Link } from 'react-router';
import { Button, Center, Container, Paper, Stack, Text, Title } from '@mantine/core';

export default function PasswordResetSuccessPage() {
  return (
    <Container size="xs" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Title order={1} ta="center">
            パスワードリセットメールを送信しました。
          </Title>

          <Text size="md" ta="center">
            メールボックスを確認し、パスワードリセットの手順に従ってください。迷惑メールフォルダもご確認ください。
          </Text>

          <Center>
            <Button component={Link} to="/signin" variant="subtle" color="blue">
              サインインページに戻る
            </Button>
          </Center>
        </Stack>
      </Paper>
    </Container>
  );
}
