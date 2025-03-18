import { useEffect } from 'react';
import { z } from 'zod';
import {
  Anchor,
  Button,
  Checkbox,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import classes from './SignInImage.module.css';

// Define zod schema for validation
const schema = z.object({
  email: z.string().email({ message: '有効なメールアドレスを入力してください' }),
  password: z.string().min(6, { message: 'パスワードは6文字以上である必要があります' }),
  rememberMe: z.boolean().optional(),
});

// Type for our form values
type FormValues = z.infer<typeof schema>;

export default function SignIn() {
  // Initialize form with zod resolver
  const form = useForm<FormValues>({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validate: zodResolver(schema),
  });

  // first render in case of sign information remains
  useEffect(() => {
    const signinInfo = localStorage.getItem('signinInfo');
    if (signinInfo) {
      const { email, password, rememberMe } = JSON.parse(signinInfo);
      if (rememberMe) {
        form.setValues({ email, password, rememberMe });
      }
    }
  }, []);

  // Form submission handler
  const handleSubmit = (values: FormValues) => {
    console.log(values);
    // Save sign information to local storage
    if (values.rememberMe) {
      localStorage.setItem('signinInfo', JSON.stringify(values));
    } else {
      localStorage.removeItem('signinInfo');
    }
  };

  return (
    <div className={classes.wrapper}>
      <Paper className={classes.form} radius={0} p={30}>
        <Title order={2} className={classes.title} ta="center" mt="md" mb={50}>
          SnS-Snakeへサインイン
        </Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="メールアドレス"
            placeholder="hello@gmail.com"
            size="md"
            withAsterisk
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="パスワード"
            placeholder="Your password"
            mt="md"
            size="md"
            withAsterisk
            {...form.getInputProps('password')}
          />
          <Checkbox
            label="サインイン情報を保存"
            mt="xl"
            size="md"
            {...form.getInputProps('rememberMe', { type: 'checkbox' })}
          />
          <Button type="submit" fullWidth mt="xl" size="md">
            サインイン
          </Button>
        </form>

        <Text ta="center" mt="md">
          パスワードを忘れた場合{' '}
          <Anchor<'a'> href="#" fw={700} onClick={(event) => event.preventDefault()}>
            Register
          </Anchor>
        </Text>
      </Paper>
    </div>
  );
}
