import React, { lazy } from 'react';
import path from 'path';
import { onAuthStateChanged, User } from 'firebase/auth';
import { child } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { Outlet, redirect } from 'react-router';
// --- Firebase & Helper Function for Loader ---
// SignInRoutes と同じヘルパー関数を使うか、必要なら保護ルート用に調整
import { auth, db } from '@/firebase';
import { MainLayout } from '@/layouts/MainLayout';
import { UserFirestoreData } from '@/types/auth';

const Activity = lazy(() => import('@/pages/Activity'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const XAccountsList = lazy(() => import('@/pages/XAccountsList'));
const XPostsList = lazy(() => import('@/pages/XPostsList'));
const TermsPage = lazy(() => import('@/pages/Terms/TermsPage'));

// 保護ルート用の認証・規約チェックヘルパー
const checkAuthStatusForProtected = async (): Promise<{
  isAuthenticated: boolean;
  termsAccepted: boolean | null; // null: 未取得/エラー
  user: User | null; // ユーザー情報も返す
}> => {
  // SignInRoutes.tsx の checkAuthStatusForGuest とほぼ同じロジック
  // user情報も返すように変更
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as UserFirestoreData;
            const accepted =
              typeof userData.termsAccepted === 'boolean' ? userData.termsAccepted : false;
            // 未設定の場合に false を書き込む処理は listenAuthState に任せる方が一貫性があるかも
            // if (typeof userData.termsAccepted !== 'boolean') {
            //     console.warn(`Firestore document for user ${user.uid} missing termsAccepted field in protected loader. Assuming false.`);
            // }
            resolve({ isAuthenticated: true, termsAccepted: accepted, user });
          } else {
            console.warn(`Firestore document not found for user ${user.uid} in protected loader.`);
            // Firestoreにデータがない場合、未同意扱い
            resolve({ isAuthenticated: true, termsAccepted: false, user });
          }
        } catch (error) {
          console.error('Error fetching Firestore data in protected loader:', error);
          resolve({ isAuthenticated: true, termsAccepted: null, user }); // エラー時は規約不明
        }
      } else {
        resolve({ isAuthenticated: false, termsAccepted: null, user: null }); // 未認証
      }
    });
  });
};

// --- Loader Function for Protected Routes ---
export const protectedLoader = async ({ request }: { request: Request }) => {
  console.log('Running protectedLoader...');
  const { isAuthenticated, termsAccepted, user } = await checkAuthStatusForProtected();
  console.log(
    `protectedLoader - isAuthenticated: ${isAuthenticated}, termsAccepted: ${termsAccepted}`
  );

  if (!isAuthenticated) {
    // 未認証ならログインページへリダイレクト (元のパスをクエリパラメータで渡す)
    const params = new URLSearchParams();
    const currentPath = new URL(request.url).pathname;
    // ログインページやAPIエンドポイントなど、無限ループしそうなパスはfromに含めない方が良いかも
    if (currentPath !== '/signin') {
      params.set('from', currentPath);
    }
    console.log('protectedLoader: Not authenticated. Redirecting to /signin');
    return redirect(`/signin?${params.toString()}`);
  }

  if (termsAccepted === false) {
    // 認証済みだが規約未同意の場合、規約ページへリダイレクト
    // 現在地が規約ページでないことを確認 (無限ループ防止)
    if (new URL(request.url).pathname !== '/terms') {
      console.log('protectedLoader: Authenticated but terms not accepted. Redirecting to /terms');
      return redirect('/terms');
    }
    // 既に /terms にいる場合は loader は null を返し、TermsPage の表示を許可
    console.log('protectedLoader: Already on /terms page.');
    return null;
  }

  if (termsAccepted === null) {
    // 規約同意状態が不明 (エラーなど) の場合
    console.error(
      'protectedLoader: Terms acceptance status is null. Redirecting to /signin as a fallback.'
    );
    // 安全のためログインページに戻すか、エラーページを表示
    return redirect('/signin'); // フォールバック
  }

  // 認証済み & 規約同意済みの場合
  console.log('protectedLoader: Access granted.');
  // ページコンポーネントに必要なデータを返す (任意)
  // この例では user オブジェクトを返すが、Reduxから取得できるなら不要な場合も多い
  return { user }; // useLoaderData() で受け取れる
};

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      path: '/dashboard',
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
      path: 'profile',
      element: <ProfilePage />,
    },
    {
      // 重要: 規約ページへのルートも保護ルート内に定義する
      // (protectedLoaderが未同意時にリダイレクトするため)
      // ただし、loader は protectedLoader をそのまま使う
      path: '/terms', // /terms
      element: <TermsPage />,
      // loader: protectedLoader // 親から継承される or 個別に設定しても良い
      // protectedLoader は /terms へのアクセスを許可するロジックを含む
    },
  ],
};
export default MainRoutes;
