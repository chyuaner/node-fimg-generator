import { handleRequest } from "./core/app";
import { CloudflareAssetLoader } from "./core/loaders/CloudflareAssetLoader";
import { ImageResponse } from '@cf-wasm/og';
import { splitUrl } from "./core/urlUtils/splitUrl";
import { fileType, parseColorOrPath, parseSingleSize, parseSize } from "./core/urlUtils/parseUrl";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const enableRedirect = !['false', '0', 0, null, undefined].includes(env?.ENABLE_CF_REDIRECT);

    const url = new URL(request.url);
    const pathname = url.pathname;

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

    // 使用Cloudflare Workers運算產圖
    const environmentInfo = {
      platform: 'Cloudflare Workers'
    };
    // Handle dynamic image generation
    const loader = new CloudflareAssetLoader(env.ASSETS);
    return handleRequest(request, {assetLoader: loader, ImageResponseClass: ImageResponse}, env, environmentInfo);
  },
} satisfies ExportedHandler<CloudflareBindings>;
