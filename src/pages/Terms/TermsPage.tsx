// src/pages/TermsPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Alert, Box, Button, Container, Paper, Text } from '@mantine/core';
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import {
  acceptTerms,
  selectAuthError,
  selectAuthLoading,
  selectAuthTask,
  selectUser,
  signOut,
} from '@/store/reducers/authSlice';

const TermsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation(); // リダイレクト元の情報を取得する場合
  const isLoading = useAppSelector(selectAuthLoading); // 全体のローディング状態
  const acceptTermsLoading = useAppSelector((state) => state.auth.task === 'accept_terms_pending'); // 同意処理中のローディング
  const signOutLoading = useAppSelector((state) => state.auth.task === 'signout_pending'); // ログアウト処理中のローディング
  const task = useAppSelector(selectAuthTask);
  const error = useAppSelector(selectAuthError);
  const user = useAppSelector(selectUser);

  // 同意後のリダイレクト先 (loaderから渡された情報やデフォルトパスを使う)
  // loaderを使わない場合は location.state から取得することも可能
  // const from = location.state?.from || '/dashboard'; // デフォルトはダッシュボードへ
  const from = '/dashboard'; // loaderを使う場合はシンプルに固定でも良い

  const [localError, setLocalError] = useState<string | null>(null);

  // 同意処理
  const handleAcceptTerms = () => {
    setLocalError(null); // エラー表示をクリア
    console.log(`User ${user.uid} accepting terms...`);
    dispatch(acceptTerms());
  };

  // 同意しない (ログアウト) 処理
  const handleDeclineTerms = () => {
    setLocalError(null);
    console.log(`User ${user.uid} declining terms and signing out...`);
    dispatch(signOut());
  };

  // タスク完了/エラー状態の監視
  useEffect(() => {
    // 同意成功 -> ダッシュボードへ遷移
    if (task === 'accept_terms_success') {
      console.log('Terms accepted successfully, navigating to dashboard...');
      navigate(from, { replace: true });
    }
    // ログアウト成功 -> ログインページへ遷移
    if (task === 'signout_success') {
      console.log('Sign out successful, navigating to signin...');
      navigate('/signin', { replace: true }); // ログインページのパスに修正
    }
    // エラーがあれば表示 (acceptTerms or signOut)
    if (task === 'accept_terms_error' || task === 'signout_error') {
      setLocalError(error || 'An unexpected error occurred.');
    }

    // task 完了後に task state をリセットしたい場合は別途 dispatch する
    // dispatch(resetTask()); // 例: エラー表示後など
  }, [task, error, navigate, from, dispatch]); // dispatch も依存配列に追加

  return (
    <Container component="main" maw="sm" style={{ mt: 8 }}>
      <Paper style={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Text component="h1" variant="h5" style={{ mb: 2 }}>
          利用規約
        </Text>
        <Text variant="body1" style={{ mb: 1 }}>
          {user.displayName || user.email}様、ようこそ！
        </Text>
        <Text variant="body2" style={{ mb: 3 }}>
          サービスのご利用を開始する前に、以下の利用規約をご確認いただき、同意していただく必要があります。
        </Text>

        {/* エラー表示 */}
        {localError && (
          <Alert color="red" style={{ width: '100%', mb: 2 }}>
            {localError}
          </Alert>
        )}

        {/* 規約本文表示エリア */}
        <Box
          style={{
            height: '300px', // 高さを固定
            overflowY: 'scroll', // スクロール可能に
            border: '1px solid',
            borderColor: 'divider',
            p: 2,
            mb: 3,
            width: '100%',
            textAlign: 'left',
          }}
        >
          <Text variant="h6">第1条 (規約の適用)</Text>
          <Text variant="body2">
            この利用規約（以下「本規約」といいます。）は、[あなたのサービス名]（以下「本サービス」といいます。）の利用に関する条件を定めるものです。本サービスを利用するすべてのユーザー（以下「ユーザー」といいます。）は、本規約に同意の上、本サービスを利用するものとします。
          </Text>
          <Text variant="h6">第2条 (アカウント登録)</Text>
          <Text variant="body2">
            ユーザーは、本サービスの利用にあたり、当社所定の方法によりアカウント登録を行うものとします。ユーザーは、登録情報が常に真実、正確、最新かつ完全であるように維持するものとします。
          </Text>
          {/* --- 以下、規約の条文を続ける --- */}
          <Text variant="body2">(ここに規約の残りを記述) ...</Text>
          <Text variant="body2">(ここに規約の残りを記述) ...</Text>
          <Text variant="body2">(ここに規約の残りを記述) ...</Text>
          <Text variant="body2">(ここに規約の残りを記述) ...</Text>
          {/* --- 規約の最後まで --- */}
        </Box>

        {/* 同意/拒否ボタン */}
        <Box style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
          {/* LoadingButton があれば使う */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleAcceptTerms}
            loading={acceptTermsLoading} // 同意処理中のみローディング
            disabled={isLoading} // 他の処理中でも無効化
            style={{ flexGrow: 1, mx: 1 }}
          >
            同意して利用を開始する
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={handleDeclineTerms}
            disabled={isLoading || signOutLoading} // 他の処理中やログアウト中は無効化
            style={{ flexGrow: 1, mx: 1 }}
          >
            同意しない (ログアウト)
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsPage;
