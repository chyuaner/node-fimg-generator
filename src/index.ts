import { handleRequest } from "./core/app";
import { CloudflareAssetLoader } from "./core/loaders/CloudflareAssetLoader";
import { ImageResponse } from "@cf-wasm/og";
import { splitUrl } from "./core/utils/splitUrl";
import { fileType, parseColorOrPath, parseSingleSize, parseSize } from "./core/utils/parseUrl";
import { envStringToBoolean } from "./helpers";

/* -------------------------------------------------
   1️⃣ Helper: 讀取 Edge Cache（只在 Workers 環境有效）
   ------------------------------------------------- */
async function getFromEdgeCache(request: Request): Promise<Response | null> {
  // `caches` 僅在 Cloudflare Workers 中存在
  if (typeof caches !== "undefined" && (caches as any).default) {
    // 完整 URL（含 query）作為快取鍵
    const cached = await (caches as any).default.match(request);
    // caches.default.match 可能回傳 undefined → 用 null 統一回傳型別
    return cached ?? null;
  }
  // 非 Workers（例如本機測試）直接視為「沒快取」
  return null;
}

/* -------------------------------------------------
   2️⃣ Helper: 把成功且「public」的 Response 寫入 Edge Cache
   ------------------------------------------------- */
async function maybeCacheResponse(
  request: Request,
  response: Response
): Promise<Response> {
  // 只在 Workers 中執行
  if (typeof caches === "undefined" || !(caches as any).default) return response;

  // 只快取 200 OK，且必須是「public」才允許 cache
  if (response.status !== 200) return response;
  const cc = response.headers.get("Cache-Control");
  if (!cc || !/public/.test(cc)) return response; // 沒 public → 不寫入

  try {
    // Body 只能讀一次 → clone 再取出 binary
    const body = await response.clone().arrayBuffer();

    // 建立快取用的 Response（保留所有 Header）
    const cacheResp = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // 把完整的 request（含 query）寫入 Edge Cache
    await (caches as any).default.put(request, cacheResp);

    // 回傳給瀏覽器的 Response（同樣的 body）
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (e) {
    console.warn("[CF‑Cache] write failed:", e);
    return response; // 若寫入失敗，直接回傳原始結果
  }
}


export default {
  async fetch(request, env, ctx): Promise<Response> {
    const enableRedirect = envStringToBoolean(env?.ENABLE_CF_REDIRECT, undefined);
    const url = new URL(request.url);
    const pathname = url.pathname;

    // -------------------------------------------------
    // A. 先嘗試從 Edge Cache 取得（包含 query string）
    // -------------------------------------------------
    // 1️⃣ 依環境變數（在 Cloudflare Dashboard → Workers → Settings → Variables）：// string | undefined
    const envEnableCache = envStringToBoolean(env?.ENABLE_CF_EDGE_CACHE, undefined);
    // 2️⃣ 依 URL query（即時繞過）：
    const bypassQuery = url.searchParams.has("nocache");

    // 若任一條件指示「不使用 Edge Cache」：
    const shouldUseEdgeCache = !(bypassQuery || envEnableCache === false);
    // -------------------------------------------------
    // B. 先嘗試從 Edge Cache 取得（包含 query string）
    // -------------------------------------------------
    if (shouldUseEdgeCache) {
      const cached = await getFromEdgeCache(request);
      if (cached) {
        // 已命中 → 完全不跑 Workers
        return cached;
      }
    }
    // -------------------------------------------------
    // C. 一般靜態資源 (Astro) - 直接走 ASSETS
    // -------------------------------------------------
    // Serve static assets (HTML, CSS, JS) from the ASSETS binding
    // These are built by Astro and deployed with the worker
    if (pathname === '/' || pathname.startsWith('/assets/') || pathname.endsWith('.html') || pathname.endsWith('.css') || pathname.endsWith('.js')) {
      if (env.ASSETS) {
        try {
          const response = await env.ASSETS.fetch(request);
          if (response.status !== 404) {
            return response;
          }
        } catch (e) {
          console.error('Error serving static asset:', e);
        }
      }
    }

    // -------------------------------------------------
    // C. 判斷是不是要導流到 Vercel（負載過重）
    // -------------------------------------------------
    let format = fileType(url, request);

    // 若有啟用多後端分流，而且輸出檔案格式要是png這種負荷較重的才需要分流
    if (enableRedirect && format == 'png') {
      // 處理結尾斜線
      const normalizedPath = pathname.endsWith('/') && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
      const fullPath = normalizedPath + url.search;
      const { canvas, bg, content, query } = splitUrl(fullPath);
      const shadowValue = bg.shadow ? parseSingleSize(bg.shadow) : 0;
      const radiusValue = bg.radius ? parseSingleSize(bg.radius) : 0;
      // 一旦有用到陰影，直接導流到下游主機商
      if (shadowValue>0) {
        return fetch(url.toString(), request);
      }

      // 計算畫布大小
      const { width: origWidth, height: origHeight } = canvas ? parseSize(canvas) : { width: undefined, height: undefined };
      const { width: innerWidth, height: innerHeight } = content.size ? parseSize(content.size) : { width: undefined, height: undefined };
      const width = !!origWidth ? origWidth : (!!innerWidth ? innerWidth : undefined);
      const height = !!origHeight ? origHeight : (!!innerHeight ? innerHeight : undefined);

      // 一旦有用到檔案
      const bgBackground = bg.bgcolor ? parseColorOrPath(bg.bgcolor) : {type: ''};
      // 而且總大小超過1600*900，直接導流到下游主機商
      if (!!bgBackground && bgBackground.type == 'tpl' && !!width && !! height && (width*height > 1000000)) {
        return fetch(url.toString(), request);
      }
      // 一旦有用到檔案
      const phBg = content.bgcolor ? parseColorOrPath(content.bgcolor) : {type: ''};
      // 而且總大小超過1600*900，直接導流到下游主機商
      if (!!phBg && phBg.type == 'tpl' && !!width && !! height && (width*height > 1000000)) {
        return fetch(url.toString(), request);
      }
    }

    // -------------------------------------------------
    // D. 正常走 Workers 產圖
    // -------------------------------------------------
    const environmentInfo = {
      platform: 'Cloudflare Workers'
    };
    // Handle dynamic image generation
    const loader = new CloudflareAssetLoader(env.ASSETS);

    const rawResp = await handleRequest(
      request,
      { assetLoader: loader, ImageResponseClass: ImageResponse },
      env,
      environmentInfo
    );

    // -------------------------------------------------
    // E. 把成功且可快取的回應寫入 Edge Cache
    // -------------------------------------------------
    if (shouldUseEdgeCache) {
      // 只在「允許快取」的情況下寫入
      return await maybeCacheResponse(request, rawResp);
    }

    // 若明確關閉快取，直接回傳原始結果
    return rawResp;
  },
} satisfies ExportedHandler<CloudflareBindings>;

