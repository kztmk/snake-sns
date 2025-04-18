// src/routes/index.tsx
import React, { lazy, Suspense, useEffect } from 'react';
// useRoutes の代わりに createBrowserRouter と RouterProvider を使う
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import LoadingSpinner from '@/components/Loader/'; // ローディングスピナー

// --- Page Components (Lazy Loading) ---
import Loadable from '@/components/Loader/Loaderble'; // Loadable コンポーネント

// Auth Listener と Redux
import { useAppDispatch, useAppSelector } from '@/hooks/rtkhooks';
import BlankPage from '@/layouts/BlankPage/';
// --- Layouts ---
import GuestPageLayout from '@/layouts/Guest';
import { MainLayout } from '@/layouts/MainLayout'; // MainLayout (名前付きエクスポートの場合)

import { listenAuthState, selectAuthLoading } from '@/store/reducers/auth';
import { protectedLoader } from './MainRoutes'; // MainRoutes から protectedLoader をエクスポートしておく必要あり

// --- Guards/Loaders & Auth ---
// Guards は削除
// import AuthGuard from '@/utils/route-guard/AuthGuard';
// import GuestGuard from '@/utils/route-guard/GuestGuard';
// loader関数をインポート (またはここで定義)
import { guestLoader } from './SignInRoutes'; // SignInRoutes から guestLoader をエクスポートしておく必要あり

const PagesLanding = Loadable(lazy(() => import('@/pages/HomePage'))); // Loadableでラップ
const NotFound404 = Loadable(lazy(() => import('@/pages/NotFound404')));
const AuthSignin = Loadable(lazy(() => import('@/pages/Auth/SignIn')));
const AuthForgotPassword = Loadable(lazy(() => import('@/pages/Auth/ForgotPassword')));
const AuthResetPassword = Loadable(lazy(() => import('@/pages/Auth/ResetPassword')));
const Activity = Loadable(lazy(() => import('@/pages/Activity')));
const Dashboard = Loadable(lazy(() => import('@/pages/Dashboard')));
const ProfilePage = Loadable(lazy(() => import('@/pages/Profile')));
const XAccountsList = Loadable(lazy(() => import('@/pages/XAccountsList')));
const XPostsList = Loadable(lazy(() => import('@/pages/XPostsList')));
const TermsPage = Loadable(lazy(() => import('@/pages/Terms/TermsPage')));

// --- Auth Initializer Component ---
// アプリ全体で認証状態を監視し、初期ロード中にスピナーを表示する
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  // selectAuthLoading を使って Redux state のローディング状態を取得
  const isLoading = useAppSelector(selectAuthLoading);

  useEffect(() => {
    console.log('AuthInitializer: Dispatching listenAuthState');
    // listenAuthState を実行し、認証状態の監視を開始
    // listenAuthState は unsubscribe 関数を返す想定
    const unsubscribe = dispatch(listenAuthState()) as unknown as () => void; // 型アサーション

    // コンポーネントのアンマウント時にリスナーを解除
    return () => {
      console.log('AuthInitializer: Unsubscribing from auth state changes');
      unsubscribe();
    };
  }, [dispatch]); // dispatch は通常変わらないが、念のため含める

  // Redux state の loading が true の間はローディング表示
  if (isLoading) {
    console.log('AuthInitializer: Auth state is loading, showing spinner...');
    return <LoadingSpinner />;
  }

  console.log('AuthInitializer: Auth state loaded, rendering children.');
  // ローディング完了後に子要素（Router）を描画
  return <>{children}</>;
};

// --- アプリケーション全体のルーター定義 (createBrowserRouterを使用) ---
const router = createBrowserRouter([
  {
    // ルートパス "/"
    // ここで基本的なレイアウトや認証初期化を行う
    // ErrorBoundary を設定することも推奨
    // errorElement: <GlobalErrorBoundary />,
    element: (
      // AuthInitializer で囲み、認証状態の監視と初期ロードを行う
      <AuthInitializer>
        {/* Outlet は子ルートを描画するためのプレースホルダー */}
        <Outlet />
      </AuthInitializer>
    ),
    children: [
      // --- Public Routes (Guest Layout) ---
      {
        // element に GuestPageLayout を指定し、その中で Outlet を使う
        element: <GuestPageLayout />,
        children: [
          {
            index: true, // path: '/' にマッチ
            element: <PagesLanding />,
            // loader は不要 (公開ページのため)
          },
          // 他の公開ページがあればここに追加
          // { path: 'about', element: <AboutPage /> }
        ],
      },

      // --- Guest Only Routes (Blank Layout, Sign In etc.) ---
      {
        // BlankPage レイアウトを適用し、guestLoaderで保護
        element: <BlankPage />,
        loader: guestLoader, // ★ 認証済みならリダイレクト
        children: [
          {
            path: 'signin',
            element: <AuthSignin />,
          },
          {
            path: 'forgot-password',
            element: <AuthForgotPassword />,
          },
          {
            path: 'reset-password',
            element: <AuthResetPassword />,
          },
          // 他のゲスト専用ルート (例: register)
        ],
      },

      // --- Protected Routes (Main Layout) ---
      {
        // MainLayout を適用し、protectedLoaderで保護
        element: <MainLayout />,
        loader: protectedLoader, // ★ 未認証 or 未同意ならリダイレクト
        children: [
          // MainRoutes.tsx で定義されていた子ルートをここに移動・展開
          {
            path: '/dashboard', // path はルートから記述
            element: <Dashboard />,
            children: [
              {
                index: true,
                element: <Activity />,
              },
              {
                path: 'x-accounts',
                element: <XAccountsList />,
              },
              {
                path: 'x-accounts/:xAccountId',
                element: <XPostsList />,
              },
            ],
          },
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            // 規約ページもこの loader で保護される
            path: '/terms',
            element: <TermsPage />,
          },
          // 他の保護ルート
        ],
      },

      // --- Not Found Route ---
      // どのルートにもマッチしなかった場合に表示
      // 注意: loaderのあるルートよりも後に定義する必要がある場合がある
      {
        path: '*',
        element: <BlankPage />,
        children: [
          {
            path: '*',
            element: <NotFound404 />,
          },
        ],
        // または専用の NotFoundLayout を作成しても良い
        // element: <NotFoundLayout><NotFound404 /></NotFoundLayout>
      },
    ],
  },
]);

// --- アプリケーションエントリーポイント ---
const ThemeRoutes = () => {
  // createBrowserRouter を RouterProvider に渡す
  // fallbackElement は Suspense の fallback としても機能するが、
  // loader 実行中の表示にも使われる
  return (
    // Suspense は lazy loading のために必要
    <Suspense fallback={<LoadingSpinner />}>
      <RouterProvider router={router} />
    </Suspense>
  );
};

export default ThemeRoutes;
