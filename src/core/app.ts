import React from "react";
import { AssetLoader } from './loaders/AssetLoader';
import { loadFonts } from "./loaders/loadFonts";
import { splitUrl } from './urlUtils/splitUrl';
import { parseSize, parseColor, fileType, parseSingleSize, parseColorOrPathLoad } from './urlUtils/parseUrl';
import { Canvas } from './Canvas';
import { renderfullHtmlFromElement } from './renderHtml';
import { corsMiddleware, cacheControlMiddleware, runMiddlewares } from './middleware';

// Define a type that matches the ImageResponse class signature we use
export type ImageResponseConstructor = new (
  element: any,
  options: {
    width?: number;
    height?: number;
    fonts?: {
      name: string;
      data: ArrayBuffer;
      weight: 400; // specific usage
      style: 'normal'; // specific usage
    }[];
    format?: 'svg' | 'png'; // specific usage
    [key: string]: any;
  }
) => Response;

// -----------------------------------------------------------------------------
// Main Request Handler
// -----------------------------------------------------------------------------
export async function handleRequest(
  request: Request,
  assetLoader: AssetLoader,
  env?: Record<string, any>,
  ImageResponseClass?: ImageResponseConstructor
): Promise<Response> {
  return runMiddlewares(
    request,
    // [corsMiddleware, cacheControlMiddleware],
    [corsMiddleware],
    () => coreHandler(request, assetLoader, env, ImageResponseClass)
  );
}

// -----------------------------------------------------------------------------
// Core Business Logic
// -----------------------------------------------------------------------------
async function coreHandler(
  request: Request,
  assetLoader: AssetLoader,
  env?: Record<string, any>,
  ImageResponseClass?: ImageResponseConstructor
): Promise<Response> {
  // ---------------------------------------------------------------------------
  // 設置環境參數
  // ---------------------------------------------------------------------------
  const enableDebug = env?.ENABLE_DEBUG === 'true';

  // ---------------------------------------------------------------------------
  // 主流程
  // ---------------------------------------------------------------------------
  const url = new URL(request.url);
  const pathname = url.pathname;

  let format = fileType(url, request);

  // 處理結尾斜線
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  // ---------------------------------------------------------------------------
  // /debug 路由
  // ---------------------------------------------------------------------------
  // Note: Use original pathname (not normalizedPath) to preserve trailing slashes
  if (enableDebug && pathname.startsWith('/debug/')) {
    const debugPath = pathname.slice(7); // Remove '/debug/' prefix
    const fullDebugPath = debugPath + url.search; // Include query string
    const parsed = splitUrl(fullDebugPath);
    return new Response(JSON.stringify(parsed, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ===========================================================================
  // 以下都是產圖邏輯
  // ===========================================================================
  if (!ImageResponseClass) {
      throw new Error('ImageResponseClass is required for non-html output');
  }

  // ---------------------------------------------------------------------------
  // /favicon.png 路由
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/favicon.png')) {
    const text = 'fimg';
    const fontName = 'noto';
    const canvas = new Canvas();
    canvas.setCanvasSize(128, 128);
    canvas.addPh({
      bgColor: '#282828',
      fgColor: '#eae0d0',
      fontName,
      fontSize: 45,
      text,
    });
    // canvas.addWm("Hello World", {
    //     bgColor: '#282828',
    //     fgColor: '#eae0d0',
    //     fontName,
    //     fontSize: 12,
    //     margin: '10px',
    // });
    const finalElement = canvas.gen();

    const fonts = await loadFonts(assetLoader, [fontName]);
    const imageResponse = new ImageResponseClass(finalElement as any, {
      width: 128,
      height: 128,
      fonts,
      format: format as any,
    });

    return imageResponse;
  }

  // ---------------------------------------------------------------------------
  // 主路由
  // ---------------------------------------------------------------------------
  // Parse the URL for image generation parameters
  // Include query string to ensure consistent parsing with debug route
  const fullPath = normalizedPath + url.search;
  const { canvas: rawCanvasParam, bg, content } = splitUrl(fullPath);

  // Load font
  const fontName = url.searchParams.get('font') || 'noto'; // Default to noto
  const fonts = await loadFonts(assetLoader, [fontName]);


  // canvas (sizeParam) ----------------
  // 若未提供則不設定 width / height，交由 ImageResponse 依內容自動決定畫布大小
  const sizeParam = rawCanvasParam ?? null;
  // 只有在提供 sizeParam 時才解析尺寸
  const hasSize = !!sizeParam;
  const { width, height } = hasSize ? parseSize(sizeParam) : { width: undefined, height: undefined };

  // content (ph)  ---------------------
  // content.parts[0] → 主內容背景顏色 (原本的 bgColor)
  // content.parts[1] → 主內容文字顏色 (原本的 fgColor)
  const bgPart = content.parts[0] ?? null;
  const fgPart = content.parts[1] ?? null;

  // 若沒有提供顏色，使用預設值
  const bgColor = bgPart ? parseColor(bgPart) : '#cccccc';   // 預設灰
  const fgColor = fgPart ? parseColor(fgPart) : '#969696';   // 預設較深的灰

  // Parse query parameters
  const text = url.searchParams.get('text') || (hasSize ? `${width}x${height}` : undefined);
  const retina = url.searchParams.get('retina') === '1';

  // Generate Image
  const fontSizeVal = Math.floor(Math.min(width ?? 100, height ?? 100) / 5);

  const canvas = new Canvas();
  canvas.setCanvasSize(width, height);
  canvas.addPh({
    bgColor,
    fgColor,
    fontName,
    fontSize: fontSizeVal,
    text,
  });

  // bg --------------------------------
  // 若 /bg/ 區塊提供了任意參數，使用 addBg 加入
  const hasBgConfig =
    bg.padding !== undefined ||
    bg.shadow !== undefined ||
    bg.radius !== undefined ||
    bg.bgcolor !== undefined;

  let finalElement;
  if (hasBgConfig) {
    const paddingInfo = bg.padding ? parseSize(bg.padding, { width, height }, { mode: 'average' }) : undefined;
    const paddingX = paddingInfo?.width;   // 左/右
    const paddingY = paddingInfo?.height;  // 上/下

    // ----- shadow / radius 改用 calcFromCanvas -----
    const shadowValue = bg.shadow ? parseSingleSize(bg.shadow, { width, height }) : undefined;
    const radiusValue = bg.radius ? parseSingleSize(bg.radius, { width, height }) : undefined;

    const bgBackground = bg.bgcolor ? await parseColorOrPathLoad(bg.bgcolor, assetLoader) : undefined;
    let bgBackgroundParm;
    if (bgBackground !== undefined) {
      if (bgBackground.type == 'tpl' && bgBackground.base64Url) {
        bgBackgroundParm = {
          bgUrl: bgBackground.base64Url,
        }
      } else {
        bgBackgroundParm = {
          bgColor: bgBackground.value,
        }
      }
    }

    canvas.addBg({
        ...bgBackgroundParm,
        // 轉成數值（若是 undefined 則會被忽略）
        ...(paddingX !== undefined || paddingY !== undefined
        ? { padding: `${paddingY ?? paddingX ?? 0}px ${paddingX ?? paddingY ?? 0}px` }
        : {}),
        // 直接使用已經計算好的單一數值
        ...(shadowValue !== undefined ? { shadow: `${shadowValue}px` } : {}),
        ...(radiusValue !== undefined ? { radius: `${radiusValue}px` } : {}),
        // 若還想自行加入其他 style，可在此追加 wrapperStyle
      });
  }

  finalElement = canvas.gen();


  if (format === 'html') {
    const html = renderfullHtmlFromElement(finalElement, {
      ...(hasSize && {
        width: retina ? width! * 2 : width!,
        height: retina ? height! * 2 : height!,
      })
    });

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } else {
    if (!ImageResponseClass) {
        throw new Error('ImageResponseClass is required for non-html output');
    }

    const imageResponse = new ImageResponseClass(finalElement as any, {
      // 若未提供 sizeParam，寬高會是 undefined，ImageResponse 會自行根據內容決定畫布大小
      ...(hasSize && {
        width: retina ? width! * 2 : width!,
        height: retina ? height! * 2 : height!,
      }),
      fonts,
      format: format as any,
    });

    return imageResponse;
  }
}
