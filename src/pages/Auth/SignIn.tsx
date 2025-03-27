import { useEffect } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import {
  Button,
  Checkbox,
  LoadingOverlay,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconExclamationCircle } from '@tabler/icons-react';

import { signIn } from '@/store/reducers/authSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks'
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
  const { loading, error, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const navigate = useNavigate();
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

  // watch for error
  useEffect(() => {
    if (error) {
      console.log('error', error);
      notifications.show({
        title: 'サインインエラー',
        message: error,
        color: 'red',
        position: 'top-center',
        autoClose: 5000,
        withCloseButton: true,
        icon: <IconExclamationCircle size={16} />,
      });
    }
  }, [error]);

  // Form submission handler
  const handleSubmit = (values: FormValues) => {
    // Sign in the user
    dispatch(signIn(values));
    if (values.rememberMe) {
      localStorage.setItem('signinInfo', JSON.stringify(values));
    } else {
      localStorage.removeItem('signinInfo');
    }
  };

  return (
    <div className={classes.wrapper}>
      <Paper className={classes.form} radius={0} p={30}>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur:2}} />
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
          <Text component="a" className={classes.linkText} onClick={() => navigate('/forgot-password')}>
            パスワードをリセット
          </Text>
        </Text>
      </Paper>
    </div>
  );
}
