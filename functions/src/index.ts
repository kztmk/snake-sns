// functions/src/index.ts

import cors from 'cors'; // ★ cors パッケージをインポート

// @ts-ignore
import { logger } from 'firebase-functions'; // loggerもv2推奨

// @ts-ignore
import { onRequest } from 'firebase-functions/v2/https'; // v2からインポート

import fetch from 'node-fetch'; // v2を使う (または axios など)

// --- 設定 ---

// React アプリケーションのオリジン (環境に応じて追加・変更してください)
const allowedOrigins: string[] = [
  // ★ 型定義を追加
  'http://localhost:5173', // ローカル開発環境 (Vite デフォルト)
  'https://trai.imakita3gyo.com', // 本番カスタムドメイン
  `https://${process.env.GCLOUD_PROJECT}.web.app`, // Firebase Hosting デフォルトドメイン
  // 他にも Firebase Hosting のプレビューURLなどを許可する場合は追加
];

// CORS ミドルウェアの設定 ★★★ この定義が必要です ★★★
const corsHandler = cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // ★ 型定義を追加
    // origin が undefined (サーバー間通信や同一オリジンなど) の場合も許可
    // または allowedOrigins に含まれる場合も許可
    if (!origin || allowedOrigins.includes(origin)) {
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
    memory: '128MiB', // メモリ割り当て (最小限で十分な場合が多い)
    // timeoutSeconds: 60,     // タイムアウト秒数 (デフォルトは60秒)
    // concurrency: 80,       // 同時実行数 (デフォルトは80)
    // secrets: []            // Secret Manager を使う場合
  },
  (request, response) => {
    // ★ リクエストハンドラ
    // ★ corsHandler を最初に適用 ★
    corsHandler(request, response, async () => {
      // OPTIONS (プリフライト) リクエストの処理
      // corsHandlerが適用された後なので、method が OPTIONS ならここで終了してOK
      if (request.method === 'OPTIONS') {
        response.status(204).send(''); // No Content
        return;
      }

      // POST メソッド以外の拒否
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST, OPTIONS');
        response.status(405).send('Method Not Allowed');
        return;
      }

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

      // --- ★ クエリパラメータ処理を追加 ★ ---
      let finalTargetUrl = targetGasUrlHeader;
      try {
        // request.url にはパスとクエリ文字列が含まれる (例: '/api/gas-proxy?action=create&target=trigger')
        // ホスト名は適当なもので良いので、URLオブジェクトでパースする
        const requestUrl = new URL(
          request.url || '/',
          `http://${request.headers.host || 'localhost'}`
        );
        const queryString = requestUrl.search; // クエリ文字列部分 (例: '?action=create&target=trigger') を取得

        if (queryString) {
          // GAS URL に既に '?' があるか確認 (通常はないはず)
          const separator = targetGasUrlHeader.includes('?') ? '&' : '?';
          finalTargetUrl = targetGasUrlHeader + separator + queryString.substring(1); // 先頭の '?' を除いて結合
          logger.info(`Query parameters detected. Forwarding to: ${finalTargetUrl}`);
        } else {
          logger.info(`No query parameters detected. Forwarding to: ${finalTargetUrl}`);
        }
      } catch (urlError) {
        logger.error('Error parsing request URL or query string:', urlError, {
          requestUrl: request.url,
        });
        // クエリパラメータがおかしい場合でも、ベースURLへの転送を試みるか、エラーにするか選択
        // ここではエラーにする
        response.status(400).json({ status: 'error', message: 'Invalid request URL format.' });
        return;
      }
      // --- ★ クエリパラメータ処理ここまで ★ ---
      try {
        // GAS への転送処理
        const gasResponse = await fetch(finalTargetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': request.get('Content-Type') || 'application/json',
          },
          body: JSON.stringify(request.body),
          // redirect: 'follow',
          // timeout: 30000, // 必要ならタイムアウト設定
        });

        // GAS からのレスポンスボディ取得・パース
        const responseText = await gasResponse.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          logger.error(`Failed to parse GAS response as JSON from ${finalTargetUrl}.`, {
            status: gasResponse.status,
            responsePreview: responseText.substring(0, 200),
          });
          response
            .status(502)
            .json({ status: 'error', message: 'Invalid response from target GAS service.' });
          return;
        }

        // 正常レスポンスをクライアントへ返す
        response.status(gasResponse.status).json(responseData);
      } catch (error) {
        logger.error(`Error proxying request to ${finalTargetUrl}:`, error);
        response.status(502).json({
          // Bad Gateway
          status: 'error',
          message: `Failed to proxy request: ${error instanceof Error ? error.message : 'Unknown proxy error.'}`,
        });
      }
    }); // ★ corsHandler の呼び出しを閉じる
  }
);
