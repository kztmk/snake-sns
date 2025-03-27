import { FirebaseError } from 'firebase/app'; // FirebaseErrorの型をインポートするとより安全です

/**
 * Firebase Authenticationのエラーコードに基づいて、
 * ユーザーフレンドリーな日本語のエラーメッセージを返します。
 *
 * @param error - Firebase Authenticationからスローされたエラーオブジェクト
 * @returns 日本語のエラーメッセージ文字列
 */
const translateFirebaseAuthError = (error: unknown): string => {
  // FirebaseErrorインスタンスかどうかをチェック
  if (error instanceof FirebaseError) {
    const errorCode = error.code;
    console.error("Firebase Auth Error Code:", errorCode, "Message:", error.message); // デバッグ用に元のエラー情報をログ出力

    switch (errorCode) {
      // signInWithEmailAndPassword でよく発生するエラー
      case 'auth/invalid-email':
        return 'メールアドレスの形式が正しくありません。';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': // v9以降、user-not-foundやwrong-passwordの代わりにこれが返ることが多い
        return 'メールアドレスまたはパスワードが間違っています。';
      case 'auth/user-disabled':
        return 'このアカウントは無効化されています。管理者にお問い合わせください。';
      case 'auth/too-many-requests':
        return 'ログイン試行の回数が多すぎます。しばらくしてからもう一度お試しください。';
      case 'auth/network-request-failed':
        return '通信エラーが発生しました。ネットワーク接続を確認してください。';

      // createUserWithEmailAndPassword でよく発生するエラー (参考)
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています。';
      case 'auth/weak-password':
        return 'パスワードは6文字以上で入力してください。';

      // その他の一般的なエラー
      case 'auth/requires-recent-login':
        return 'セキュリティのため、再ログインが必要です。';
      case 'auth/operation-not-allowed':
        return 'メールアドレスとパスワードによるログインは現在許可されていません。'; // Firebaseコンソールで設定が無効の場合

      // 他にハンドリングしたいエラーコードがあればここに追加

      default:
        // どのコードにも一致しない場合
        return 'ログイン中に予期せぬエラーが発生しました。もう一度お試しいただくか、サポートにお問い合わせください。';
        // デバッグ中は errorCode を含めると原因究明に役立ちます
        // return `不明なエラーが発生しました。(コード: ${errorCode})`;
    }
  } else {
    // FirebaseError以外の予期せぬエラーの場合
    console.error("An unexpected error occurred:", error);
    return '予期せぬエラーが発生しました。';
  }
};

export {translateFirebaseAuthError};

// --- 関数の使用例 ---
/*
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './your-firebase-config-file'; // あなたのFirebase設定ファイルをインポート
import translateFirebaseAuthError from './translateFirebaseAuthError';
import { notifications } from '@mantine/notifications'; // MantineのNotificationsを使用する場合

const handleLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('ログイン成功:', userCredential.user);
    // ログイン成功後の処理（例: ダッシュボードへリダイレクト）
    notifications.show({
        title: 'ログイン成功',
        message: 'ようこそ！',
        color: 'green',
    });

  } catch (error) {
    // translateFirebaseAuthError 関数を使ってエラーメッセージを日本語化
    const friendlyErrorMessage = translateFirebaseAuthError(error);

    console.error('ログインエラー:', friendlyErrorMessage);

    // 日本語化されたメッセージをユーザーに表示 (Mantineの例)
    notifications.show({
      title: 'ログインエラー',
      message: friendlyErrorMessage,
      color: 'red',
    });
  }
};

// ログインフォームの送信時などに handleLogin を呼び出す
// handleLogin('test@example.com', 'wrongpassword');
*/