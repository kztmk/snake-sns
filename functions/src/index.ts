// functions/src/index.ts
import cors from 'cors'; // ★ cors パッケージをインポート
import { logger } from 'firebase-functions'; // loggerもv2推奨
import { onRequest } from 'firebase-functions/v2/https'; // v2からインポート
import fetch from 'node-fetch'; // v2を使う (または axios など)

// --- 設定 ---

// React アプリケーションのオリジン (環境に応じて追加・変更してください)
const allowedOrigins: string[] = [
  // ★ 型定義を追加
  'http://localhost:5173', // ローカル開発環境 (Vite デフォルト)
  'https://torai.try-try.com', // 本番カスタムドメイン
  `https://${process.env.GCLOUD_PROJECT}.web.app`, // Firebase Hosting デフォルトドメイン
  // 他にも Firebase Hosting のプレビューURLなどを許可する場合は追加
];

// CORS ミドルウェアの設定 ★★★ この定義が必要です ★★★
const corsHandler = cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    logger.info('CORS check. Origin:', origin); // ★ ログに出力
    // ★ 型定義を追加
    // origin が undefined (サーバー間通信や同一オリジンなど) の場合も許可
    // または allowedOrigins に含まれる場合も許可
    if (!origin || allowedOrigins.includes(origin)) {
      logger.info('Origin allowed:', origin); // ★ ログに出力
      callback(null, true);
    } else {
      logger.error('CORS Error: Origin not allowed:', origin);
      callback(new Error(`Origin ${origin} not allowed by CORS policy.`)); // ★ エラーオブジェクトを渡す
    }
  },
  methods: ['POST', 'OPTIONS'], // POST リクエストとプリフライト (OPTIONS) を許可
  allowedHeaders: [
    'Content-Type',
    'Authorization', // 必要であれば認証ヘッダーも許可
    'X-Target-Gas-Url', // GAS URL を渡すためのカスタムヘッダー
  ],
  credentials: true, // 必要に応じて Cookie 等を許可する場合
});

// --- Cloud Functions 本体 ---

export const proxyToGas = onRequest(
  {
    region: 'asia-northeast1', // 日本リージョン (必要に応じて変更)
    memory: '1GiB', // 処理量が多いためメモリ割り当てを1GBに増加
    // timeoutSeconds: 60,     // タイムアウト秒数 (デフォルトは60秒)
    // concurrency: 80,       // 同時実行数 (デフォルトは80)
    // secrets: []            // Secret Manager を使う場合
  },
  (request, response) => {
    // ★ リクエストハンドラ
    // ★ corsHandler を最初に適用 ★
    corsHandler(request, response, async (err?: any) => {
      if (err) {
        logger.error('CORS handler error:', err.message);
        return;
      }
      // // OPTIONS (プリフライト) リクエストの処理
      // // corsHandlerが適用された後なので、method が OPTIONS ならここで終了してOK
      // if (request.method === 'OPTIONS') {
      //   response.status(204).send(''); // No Content
      //   return;
      // }

      // POST メソッド以外の拒否
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST, OPTIONS');
        response.status(405).send('Method Not Allowed');
        return;
      }

      logger.info('Processing POST request:');

      // ターゲット GAS URL の取得と検証
      const targetGasUrlHeader = request.headers['x-target-gas-url'] as string;
      if (
        !targetGasUrlHeader ||
        !targetGasUrlHeader.startsWith('https://script.google.com/macros/s/')
      ) {
        logger.error('Invalid or missing X-Target-Gas-Url header:', targetGasUrlHeader);
        response.status(400).json({
          status: 'error',
          message: 'X-Target-Gas-Url header is missing or invalid.',
        });
        return;
      }

      // クエリパラメータ処理
      let finalTargetUrl = targetGasUrlHeader;
      try {
        const requestUrl = new URL(
          request.url || '/',
          `http://${request.headers.host || 'localhost'}`
        );
        const queryString = requestUrl.search;
        if (queryString) {
          const separator = targetGasUrlHeader.includes('?') ? '&' : '?';
          finalTargetUrl = targetGasUrlHeader + separator + queryString.substring(1);
          logger.info(`Query parameters detected. Forwarding to: ${finalTargetUrl}`);
        } else {
          logger.info(`No query parameters detected. Forwarding to: ${finalTargetUrl}`);
        }
      } catch (urlError) {
        logger.error('Error parsing request URL or query string:', urlError, {
          requestUrl: request.url,
        });
        response.status(400).json({ status: 'error', message: 'Invalid request URL format.' });
        return;
      }

      try {
        // GAS への転送処理
        logger.info(`Proxying POST request to: ${finalTargetUrl}`);
        const gasResponse = await fetch(finalTargetUrl, {
          method: 'POST',
          headers: {
            // クライアントから受け取った Content-Type を使用
            'Content-Type': request.get('Content-Type') || 'application/json',
            // 他に必要なヘッダーがあればここに追加 (例: Authorization)
          },
          body: JSON.stringify(request.body), // request.body を JSON 文字列化して送信
          // redirect: 'follow', // GAS がリダイレクトする場合に必要
        });

        logger.info(`Received response from GAS. Status: ${gasResponse.status}`);

        const responseText = await gasResponse.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          logger.error(`Failed to parse GAS response as JSON from ${finalTargetUrl}.`, {
            status: gasResponse.status,
            responsePreview: responseText.substring(0, 500), // ログ出力を増やす
          });
          // GAS からのレスポンスが JSON でない場合のエラーハンドリング改善
          response
            .status(502) // Bad Gateway
            .json({
              status: 'error',
              message: 'Invalid or non-JSON response from target GAS service.',
              gasStatus: gasResponse.status,
              gasResponse: responseText.substring(0, 500), // クライアントにも一部返す (デバッグ用)
            });
          return;
        }

        // GAS のステータスコードをそのままクライアントに返す
        response.status(gasResponse.status).json(responseData);
      } catch (error: any) {
        // エラー型を any または unknown に
        logger.error(`Error proxying request to ${finalTargetUrl}:`, error);
        // エラーオブジェクトからメッセージを取得
        const errorMessage = error instanceof Error ? error.message : 'Unknown proxy error.';
        // スタックトレースもログに出力
        if (error instanceof Error) {
          logger.error('Stack trace:', error.stack);
        }
        response.status(502).json({
          // Bad Gateway
          status: 'error',
          message: `Failed to proxy request: ${errorMessage}`,
        });
      }
    }); // corsHandler の呼び出しを閉じる
  }
);
