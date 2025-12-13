import { AssetLoader } from './loaders/AssetLoader';
import { splitUrl } from './splitUrl';
import { parseSize, parseColor, fileType, parseSingleSize, parseColorOrPath } from './parseUrl';
import { genBgElement, genPhElement, parseTextToElements } from './renderHelper';
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
    [corsMiddleware, cacheControlMiddleware],
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
  // Debug route - 測試網址結構解析用
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

  // ---------------------------------------------------------------------------
  // 網址參數處理
  // ---------------------------------------------------------------------------
  // Parse the URL for image generation parameters
  // Include query string to ensure consistent parsing with debug route
  const fullPath = normalizedPath + url.search;
  const { canvas, bg, content } = splitUrl(fullPath);

  // Load font
  const fontName = url.searchParams.get('font') || 'noto'; // Default to noto
  let fontData: ArrayBuffer | null = null;
  try {
    // Map short names to files
    const fontFile = fontName === 'lobster' ? 'Lobster-Regular.ttf' : 'NotoSansTC-Medium.ttf';
    fontData = await assetLoader.loadFont(fontFile);
  } catch (e) {
    console.error('Font load error:', e);
    return new Response('Font not found', { status: 500 });
  }

  if (!fontData) {
    return new Response('Font not found', { status: 500 });
  }


  // canvas (sizeParam) ----------------
  // 若未提供則不設定 width / height，交由 ImageResponse 依內容自動決定畫布大小
  const sizeParam = canvas ?? null;
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
  const parsedChildren = parseTextToElements(text, fontSizeVal);

  const element = genPhElement({
    bgColor,
    fgColor,
    fontName,
    fontSize: fontSizeVal,
    text,
  });

  // bg --------------------------------
  // 若 /bg/ 區塊提供了任意參數，使用 genBgElement 包裹
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

    const bgBackground = bg.bgcolor ? parseColorOrPath(bg.bgcolor) : undefined;
    let bgBackgroundParm;
    if (bgBackground !== undefined) {
      switch (bgBackground.type) {
        case 'tpl':
          let bgPath = bgBackground.value;
          const mimeType = getMimeType(bgPath);
          const bgImgData = await assetLoader.loadImage(bgPath);
          if (bgImgData === null || bgImgData === undefined) {
            throw new Error('bgImgData is null or undefined');
          }

          // Prevent Maximum call stack size exceeded by avoiding spread operator on large arrays
          let base64String;
          if (typeof Buffer !== 'undefined') {
             base64String = Buffer.from(bgImgData).toString('base64');
          } else {
             // Fallback for environments without Buffer (unlikely in Node/CF, but safe)
             const bytes = new Uint8Array(bgImgData);
             let binary = '';
             const len = bytes.byteLength;
             // Process in chunks to avoid freezing UI (if strictly necessary) or just loop
             // Simple loop is safer than spread
             for (let i = 0; i < len; i++) {
               binary += String.fromCharCode(bytes[i]);
             }
             base64String = btoa(binary);
          }

          const base64Url = `data:${mimeType};base64,${base64String}`;

          function getMimeType(path: string): string {
            const extension = path.split('.').pop();
            switch (extension) {
              case 'jpg':
              case 'jpeg':
                return 'image/jpeg';
              case 'png':
                return 'image/png';
              case 'gif':
                return 'image/gif';
              case 'svg':
                return 'image/svg+xml';
              // ...
              default:
                return 'application/octet-stream';
            }
          }

          bgBackgroundParm = {
            bgUrl: base64Url,
          }
          break;
        default:
        case 'color':
          bgBackgroundParm = {
            bgColor: bgBackground.value,
          }
          break;
      }
    }

    finalElement = genBgElement(element, {
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
  } else {
    finalElement = element;
  }


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
      fonts: [
        {
          name: fontName,
          data: fontData!, // fontData is checked above
          weight: 400,
          style: 'normal',
        },
      ],
      format: format as any,
    });

    return imageResponse;
  }
}
