import React, { lazy } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { redirect } from 'react-router';
// --- Firebase & Helper Function for Loader ---
// SignInRoutes と同じヘルパー関数を使うか、必要なら保護ルート用に調整
import { auth, db } from '@/firebase';
import { UserFirestoreData } from '@/types/auth';

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
  const currentPath = new URL(request.url).pathname; // ★ アクセス先のパスを取得
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
    // ★ アクセスしようとしているパスが '/terms' でなければ、'/terms' へリダイレクト
    if (currentPath !== '/terms') {
      console.log('protectedLoader: Authenticated but terms not accepted. Redirecting to /terms');
      return redirect('/terms');
    }
    // ★ アクセスしようとしているパスが '/terms' の場合は、リダイレクトせずに表示を許可
    console.log(
      'protectedLoader: Accessing /terms while terms not accepted. Allowing access to TermsPage.'
    );
    // return null または { user } を返して TermsPage を表示させる
    // TermsPageでユーザー情報が必要な場合があるので { user } を返すのが良い
    return { user };
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
