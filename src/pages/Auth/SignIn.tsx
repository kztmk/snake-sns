import { useEffect, useState } from 'react';
import { IconExclamationCircle } from '@tabler/icons-react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
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
import { APP_DEFAULT_PATH } from '@/config';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import {
  resetTask,
  selectAuthError,
  selectAuthLoading,
  selectAuthTask,
  selectTermsAccepted,
  selectUser,
  signIn,
  signInWithGoogle,
} from '@/store/reducers/authSlice';
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
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoading = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);
  const task = useAppSelector(selectAuthTask);
  const user = useAppSelector(selectUser);
  const termsAccepted = useAppSelector(selectTermsAccepted);

  const [checked, setChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    dispatch(resetTask());
    console.log('Attempting Google sign-in...');
    dispatch(signInWithGoogle());
  };

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
  // ログイン成功/失敗時の処理 (useEffectでtaskを監視)
  useEffect(() => {
    // task 状態に基づいてエラー表示や画面遷移を行う
    if (task === 'signin_error' || task === 'google_signin_error') {
      setLocalError(authError); // Sliceからのエラーメッセージを表示
      notifications.show({
        title: 'サインインエラー',
        message: authError,
        color: 'red',
        position: 'top-center',
        autoClose: 5000,
        withCloseButton: true,
        icon: <IconExclamationCircle size={16} />,
      });
    } else {
      setLocalError(null); // エラーがなければクリア
    }

    // ログイン成功時の遷移ロジック
    if (task === 'signin_success' || task === 'google_signin_success') {
      console.log(
        `Login successful (Task: ${task}). Checking terms... Terms accepted: ${termsAccepted}`
      );
      if (user.uid) {
        // ユーザーが存在することを確認
        // isNewUser フラグは signInWithGoogle の fulfilled payload に一時的に含まれるが、
        // Redux state には直接保存しない方針。
        // そのため、遷移は termsAccepted 状態のみで判断する。
        // loader があれば loader がリダイレクトを担うが、念のためここでもチェック。
        const destination =
          termsAccepted === false ? '/terms' : location.state?.from || APP_DEFAULT_PATH;
        console.log(`Navigating to: ${destination}`);
        navigate(destination, { replace: true });
        // 遷移後に task をリセット (任意)
        // dispatch(resetTask());
      } else {
        // ログイン成功したはずなのにユーザー情報がない場合 (予期せぬケース)
        console.error('Login reported success, but user data is missing in Redux state.');
        setLocalError('ログイン処理中に問題が発生しました。もう一度お試しください。');
      }
    }

    // このページに来た時点で不要になったタスク状態をリセット（任意）
    // return () => {
    //   if (task === 'signin_success' || task === 'google_signin_success' || task === 'signin_error' || task === 'google_signin_error') {
    //     dispatch(resetTask());
    //   }
    // };
  }, [task, authError, user, termsAccepted, navigate, location, dispatch]);

  // Form submission handler
  const handleSubmit = async (values: FormValues) => {
    setLocalError(null); // フォーム送信時にエラーをクリア
    dispatch(resetTask()); // タスク状態もリセット
    try {
      console.log('Attempting email/password sign in...');
      // signIn Thunk をディスパッチ
      await dispatch(signIn({ email: values.email, password: values.password })).unwrap();
      // 成功した場合の遷移は上記の useEffect で処理される
      // setStatus({ success: true }); // 成功時の処理はuseEffectに集約
    } catch (err: any) {
      // Thunkがrejectした場合 (rejectValueがerrに入る)
      console.error('Email/password sign in failed:', err);
      // unwrap() を使うと rejectValue が throw されるので catch で捕捉
      const errorMessage = typeof err === 'string' ? err : 'ログインに失敗しました。';
      setLocalError(errorMessage); // ページ上部のAlertにも表示
    }
  };

  // ページ読み込み時に前のエラーが残っていればクリア（任意）
  useEffect(() => {
    dispatch(resetTask());
    setLocalError(null);
  }, [dispatch]);

  return (
    <div className={classes.wrapper}>
      <Paper className={classes.form} radius={0} p={30}>
        <LoadingOverlay
          visible={isLoading}
          zIndex={1000}
          overlayProps={{ radius: 'sm', blur: 2 }}
        />
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
          <Text
            component="a"
            className={classes.linkText}
            onClick={() => navigate('/forgot-password')}
          >
            パスワードをリセット
          </Text>
        </Text>
      </Paper>
    </div>
  );
}
