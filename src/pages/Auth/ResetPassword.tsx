import { Link } from 'react-router';
import { Button, Center, Container, Paper, Stack, Text, Title } from '@mantine/core';

export default function PasswordResetSuccessPage() {
  return (
    <Container size="xs" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Title order={1} ta="center">
            Sent password reset mail successfully
          </Title>

          <Text size="md" ta="center">
            Sent password reset mail. Please check your mailbox.
          </Text>

          <Center>
            <Button component={Link} to="/signin" variant="subtle" color="blue">
              Back to Sign in
            </Button>
          </Center>
        </Stack>
      </Paper>
    </Container>
  );
}
