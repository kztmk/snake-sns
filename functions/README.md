# Setting up

## 方法 2: Google Cloud Console で設定する

Google Cloud Console にアクセスします。

プロジェクトを選択します。

ナビゲーションメニューから「Cloud Functions」を選択します。

リストから関数 proxyToGas を見つけてクリックします。

関数の詳細ページで、「トリガー」タブを選択します。

HTTPS トリガーの URL の横にある編集アイコン（鉛筆マークなど）をクリックするか、トリガーに関する設定項目を探します。（UI は変更される可能性があります）

「認証」または「セキュリティ」に関連する設定項目で、「未認証の呼び出しを許可」または「Allow unauthenticated invocations」のようなオプションを選択します。

もし Cloud Functions の画面に直接なければ、基盤となる Cloud Run サービスへのリンクがあるかもしれません。その場合は Cloud Run サービスの認証設定を変更します。

設定を保存します。

Google Cloud Console にアクセスします。

正しいプロジェクトが選択されていることを確認します。

ナビゲーションメニュー（左上のハンバーガーメニュー）を開き、「コンピューティング」セクションの中にある 「Cloud Run」 を選択します。

Cloud Run のサービス一覧が表示されます。関数名 proxyToGas に対応するサービス名（通常は関数名と同じか、似た名前）を見つけてクリックします。

もしサービス名が不明な場合は、Cloud Functions のコンソールで proxyToGas 関数の詳細ページを開くと、どこかに「基盤となる Cloud Run サービス」や「Service」といったリンクや情報が表示されている可能性があります。

Cloud Run サービスのダッシュボードが表示されたら、上部にある 「セキュリティ」 タブ（またはそれに類する名前のタブ、"Networking" や "Security" など）をクリックします。

「認証」セクションを探します。

「未認証の呼び出しを許可」または「Allow unauthenticated invocations」というオプションを選択（チェックを入れるか、ラジオボタンを選択）します。

ページ下部（または上部）にある 「保存」 または 「デプロイ」 ボタンをクリックして変更を適用します。新しいリビジョンがデプロイされる場合があります。

変更が完了するまで少し待ちます。
