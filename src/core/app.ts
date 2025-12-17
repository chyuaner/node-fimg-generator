import React from "react";
import { AssetLoader } from './loaders/AssetLoader';
import { splitUrl } from './utils/splitUrl';
import { parseSize, parseColor, fileType, parseSingleSize, parseColorOrPathLoad, bgBackgroundToParm } from './utils/parseUrl';
import { Canvas, Weight, FontStyle } from './Canvas';
import { renderfullHtmlFromElement } from './renderHtml';
import { addHeadersMiddleware, corsMiddleware, cacheControlMiddleware, runMiddlewares } from './middleware';
import { encodeIco } from './utils/encodeIco';

// Define a type that matches the ImageResponse class signature we use
export type ImageResponseConstructor = new (
  element: any,
  options: {
    width?: number;
    height?: number;
    fonts?: {
      name: string;
      data: ArrayBuffer;
      weight: Weight;
      style: FontStyle;
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
  loaders: {
    assetLoader: AssetLoader,
    ImageResponseClass?: ImageResponseConstructor
  },
  env?: Record<string, any>,
  environmentInfo?: object
): Promise<Response> {
  // 建立帶有 platform 資訊的 middleware
  const platformHeaders = addHeadersMiddleware(environmentInfo as any);

  return runMiddlewares(
    request,
    [platformHeaders, corsMiddleware, cacheControlMiddleware],
    () => coreHandler(request, { assetLoader: loaders.assetLoader, ImageResponseClass: loaders.ImageResponseClass! }, env, environmentInfo)
  );
}

// -----------------------------------------------------------------------------
// Core Business Logic
// -----------------------------------------------------------------------------
async function coreHandler(
  request: Request,
  loaders: {
    assetLoader: AssetLoader,
    ImageResponseClass?: ImageResponseConstructor
  },
  env?: Record<string, any>,
  environmentInfo?: object

): Promise<Response> {
  // ---------------------------------------------------------------------------
  // 設置環境參數
  // ---------------------------------------------------------------------------
  const assetLoader = loaders.assetLoader;
  const ImageResponseClass = loaders.ImageResponseClass;
  const enableDebug = !['false', '0', 0, null, undefined].includes(env?.ENABLE_DEBUG);

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
  if (pathname.startsWith('/favicon.png') || pathname.startsWith('/favicon.ico')) {
    const text = 'fimg';
    const fontName = 'noto';
    const width = 128;
    const height = 128;
    const canvas = new Canvas(assetLoader);
    canvas.setCanvasSize(width, height);
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
    const fonts = await canvas.loadFonts();

    // 先產出png圖片
    const pngResp = new ImageResponseClass(finalElement as any, {
      width: width,
      height: height,
      fonts,
      format: 'png' as any,
    });

    if (format == 'ico') {
      const pngArrayBuffer = await new Response(pngResp.body).arrayBuffer();
      const pngUint8 = new Uint8Array(pngArrayBuffer);
      const icoUint8 = encodeIco(pngUint8, width ?? 0, height ?? 0);
      return new Response(icoUint8, {
        status: 200,
        headers: {
          'Content-Type': 'image/x-icon'
        },
      });
      
    } else {
      return pngResp;
    }
  }

  if (pathname.startsWith('/favicon.ico')) {
    return new Response(null, {
      status: 301,
      headers: {
        'Location': '/favicon.png',
      },
    });
  }

  if (pathname.startsWith('/404')) {
    const canvas = new Canvas(assetLoader);
    const width=800, height=400;
    canvas.setCanvasSize(width, height);

    const finalElement = canvas.gen404({});

    const fonts = await canvas.loadFonts();
    const imageResponse = new ImageResponseClass(finalElement as any, {
      width,
      height,
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
  const { canvas: rawCanvasParam, bg, content, query } = splitUrl(fullPath);

  // Load font
  const fontName = query.font ?? 'noto';

  // canvas (sizeParam) ----------------
  // 若未提供則不設定 width / height，交由 ImageResponse 依內容自動決定畫布大小
  const sizeParam = rawCanvasParam ?? null;
  // 只有在提供 sizeParam 時才解析尺寸
  const hasSize = !!sizeParam;
  const { width: origWidth, height: origHeight } = hasSize ? parseSize(sizeParam) : { width: undefined, height: undefined };
  const innerSizeParam = content.size ?? null;
  const hasInnerSize = !!innerSizeParam;
  const { width: innerWidth, height: innerHeight } = hasInnerSize ? parseSize(innerSizeParam) : { width: undefined, height: undefined };
  let width, height;
  if (hasInnerSize) {
    width = innerWidth;
    height = innerHeight;
  } else {
    width = origWidth;
    height = origHeight;
  }

  // content (ph)  ---------------------
  // content.parts[0] → 主內容背景顏色 (原本的 bgColor)
  // content.parts[1] → 主內容文字顏色 (原本的 fgColor)
  const bgPart = content.bgcolor ?? null;
  const fgPart = content.fgcolor ?? null;

  // 若沒有提供顏色，使用預設值
  const bgColor = bgPart ? parseColor(bgPart) : '#cccccc';   // 預設灰
  const bgPreParm = bgPart ? await parseColorOrPathLoad(bgPart, assetLoader) : {type: 'color' as const, value: '#cccccc'};
  const bgParm = bgBackgroundToParm(bgPreParm);
  const fgColor = fgPart ? parseColor(fgPart) : '#969696';   // 預設較深的灰

  // Parse query parameters
  const text = query.text ?? (hasSize ? `${width}x${height}` : undefined);
  const retina = Object.prototype.hasOwnProperty.call(query, 'retina');
  const scaleParam = query.scale;

  let scale = 1;
  if (scaleParam) {
    scale = parseFloat(scaleParam);
    if (isNaN(scale)) scale = 1;
  } else if (retina) {
    scale = 2;
  }

  // Generate Image
  const fontSizeVal = Math.floor(Math.min(width ?? 100, height ?? 100) / 5);

  const canvas = new Canvas(assetLoader);
  if (scale !== 1) {
    canvas.setCanvasScale(scale);
  }
  canvas.setCanvasSize(width, height);
  canvas.addPh({
    ...bgParm!,
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
    let bgBackgroundParm = bgBackgroundToParm(bgBackground);

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


    if (hasInnerSize) {
      width = (innerWidth ?? 0) + (paddingX ?? 0) * 2;
      height = (innerHeight ?? 0) + (paddingY ?? 0) * 2;
      canvas.setCanvasSize(width, height);
    }

  }

  const envInfo = environmentInfo as any; // 轉型為 any 以使用 platform
  if (enableDebug && !!query.debug && envInfo?.platform) {
    canvas.addDebug(splitUrl(fullPath), { platform: envInfo.platform });
  }

  finalElement = canvas.gen();

  if (format === 'html') 
  {
    const html = renderfullHtmlFromElement(finalElement, {
      ...((hasSize||hasInnerSize) && {
        width: width! * scale,
        height: height! * scale,
      })
    });

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } 
  else if (format === 'ico') 
  {
    // 這裡先產生 PNG Buffer（ImageResponse 會回傳 Response，我們只要拿到原始 Uint8Array）
    const pngResponse = new ImageResponseClass(finalElement as any, {
      width: width! * scale,
      height: height! * scale,
      fonts: await canvas.loadFonts(),
      format: 'png' as any,               // 只取 PNG
    }) as any;

    // pngResponse.body 可能是 ReadableStream，先轉成 Uint8Array
    const pngArrayBuffer = await new Response(pngResponse.body).arrayBuffer();
    const pngUint8 = new Uint8Array(pngArrayBuffer);

    // === 2️⃣ 使用自製 encodeIco 包裝成 ICO ==========================
    // 注意：width/height 這裡是 **最終要顯示的尺寸**（不含 scale）
    //       若你在前面有調整 `canvas.setCanvasScale(scale)`，就以
    //       原始 width/height（未乘以 scale）為基礎。
    const icoUint8 = encodeIco(pngUint8, width ?? 0, height ?? 0);

    // 3️⃣ 回傳 ICO
    return new Response(icoUint8, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon'
      },
    });
  }
  else
  {
    if (!ImageResponseClass) {
        throw new Error('ImageResponseClass is required for non-html output');
    }

    const fonts = await canvas.loadFonts();
    const imageResponse = new ImageResponseClass(finalElement as any, {
      // 若未提供 sizeParam，寬高會是 undefined，ImageResponse 會自行根據內容決定畫布大小
      ...((hasSize||hasInnerSize) && {
        width: width! * scale,
        height: height! * scale,
      }),
      fonts,
      format: format as any,
    });

    return imageResponse;
  }
}
