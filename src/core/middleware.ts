
export type Next = () => Promise<Response>;

export type Middleware = (
  request: Request,
  next: Next
) => Promise<Response>;

/**
 * Runner to execute a stack of middlewares in order.
 */
export async function runMiddlewares(
  request: Request,
  middlewares: Middleware[],
  handler: () => Promise<Response>
): Promise<Response> {
  const runner = async (index: number): Promise<Response> => {
    if (index >= middlewares.length) {
      return handler();
    }
    const middleware = middlewares[index];
    return middleware(request, () => runner(index + 1));
  };
  return runner(0);
}

/**
 * Middleware factory that adds fixed headers:
 *   - `date`  : 當前 UTC 時間
 *   - `platform` : 依據傳入的 environmentInfo 取得平台名稱
 *
 * 使用方式:
 *   const addHeaders = addHeadersMiddleware(environmentInfo);
 *   runMiddlewares(request, [corsMiddleware, addHeaders, ...], handler);
 */
export const addHeadersMiddleware = (environmentInfo: { platform?: string }) => {
  const middleware: Middleware = async (request, next) => {
    const response = await next();

    // 加上當前時間 (UTC 字串)
    response.headers.set('Generate-Date', new Date().toUTCString());

    // 若有提供 platform，寫入平台資訊
    if (environmentInfo?.platform) {
      response.headers.set('Platform', environmentInfo.platform);
    }

    return response;
  };
  return middleware;
};

/**
 * Middleware to handle Cross-Origin Resource Sharing (CORS).
 * Handles preflight OPTIONS requests and adds CORS headers to responses.
 */
export const corsMiddleware: Middleware = async (request, next) => {
  // Handle Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = await next();

  // Clone response to ensure headers are mutable (sometimes required depending on Response origin)
  // But usually we can just set headers. If it fails, we might need to recreate the response.
  // For standard Fetch Response, headers are mutable.
  response.headers.set('Access-Control-Allow-Origin', '*');

  return response;
};

/**
 * Middleware to set Cache-Control headers.
 * Sets 'public, max-age=3600' for successful (200) responses.
 */
export const cacheControlMiddleware: Middleware = async (request, next) => {
  // 本常數是最後修改時間，若本專案有會影響舊有圖片的改動，請更新這個字串
  // 取得現在時間 node -e 'console.log(new Date().toUTCString())'
  const UPDATE_TIME = 'Fri, 19 Dec 2025 06:50:03 GMT';

  const response = await next();

  if (response.status === 200) {
    // Force set for now to ensure it works, or change logic to overwrite if needed
    // The previous check `!response.headers.has('Cache-Control')` might be failing if ImageResponse sets a default.
    response.headers.set('Cache-Control', 'public, max-age=31536000');
    response.headers.set('Last-Modified', UPDATE_TIME);
  }

  return response;
};
