import { IconArrowLeft } from '@tabler/icons-react';
import {
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Group,
  Paper,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { useNavigate } from 'react-router';
import classes from './ForgotPassword.module.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => {
        if (!value) {
          return 'メールアドレスを入力してください';
        }
        return isNotEmpty('メールアドレスを入力してください。')(value) || isEmail('不正なメールアドレスです')(value);
      },
    },
  });

  const handleSubmit = (values: { email: string }) => {
    console.log('Reset password for:', values.email);
    // Add password reset logic here
  };

  return (
    <Container size={460} my={30}>
      <Title className={classes.title} ta="center">
        パスワードを忘れましたか？
      </Title>
      <Text c="dimmed" fz="sm" ta="center">
        登録したメールアドレスを入力してください。パスワードリセットの手順をお送りします
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md" mt="xl">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="登録メールアドレス"
            placeholder="rest@imakita3gyo.com"
            {...form.getInputProps('email')}
            error={form.errors.email}
          />
          <Group justify="space-between" mt="lg" className={classes.controls}>
            <Text size="sm" className={`${classes.control} ${classes.linkText}`} onClick={() => navigate('/signin')}>
              <Center inline>
          <IconArrowLeft size={12} stroke={1.5} />
          <Box ml={5}>サインインページに戻る</Box>
              </Center>
            </Text>
            <Button type="submit" className={classes.control} onClick={() => navigate('/reset-password')}>
              パスワードのリセット
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}
