import { ImageResponse } from '@cf-wasm/og';
import { AssetLoader } from './assetLoader';
import { splitUrl } from './splitUrl';
import { parseSize, parseColor, fileType } from './parseUrl';
import { parseTextToElements } from './renderHelper';

// -----------------------------------------------------------------------------
// Main Request Handler
// -----------------------------------------------------------------------------
export async function handleRequest(request: Request, assetLoader: AssetLoader, env?: Record<string, any>): Promise<Response> {
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


  // canvas (sizeParam)
  // 若未提供則不設定 width / height，交由 ImageResponse 依內容自動決定畫布大小
  const sizeParam = canvas ?? null;
  // 只有在提供 sizeParam 時才解析尺寸
  const hasSize = !!sizeParam;
  const { width, height } = hasSize ? parseSize(sizeParam) : { width: undefined, height: undefined };

  // content (ph)
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

  const element = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        color: fgColor,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fontSizeVal + 'px',
        fontFamily: fontName,
      },
      children: parsedChildren,
    },
  };

  const imageResponse = new ImageResponse(element as any, {
    // 若未提供 sizeParam，寬高會是 undefined，ImageResponse 會自行根據內容決定畫布大小
    ...(hasSize && {
      width: retina ? width! * 2 : width!,
      height: retina ? height! * 2 : height!,
    }),
    fonts: [
      {
        name: fontName,
        data: fontData,
        weight: 400,
        style: 'normal',
      },
    ],
    format: format as any,
  });

  return imageResponse;
}
