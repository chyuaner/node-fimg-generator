import { ImageResponse } from '@cf-wasm/og';
import { AssetLoader } from './assetLoader';
import { parseSize, parseColor, parseTextToElements } from './routerTools';
import { parseFakeImgUrl as parseFakeImgUrlDetailed } from './parseFakeImgUrl';

// -----------------------------------------------------------------------------
// Main Request Handler
// -----------------------------------------------------------------------------
export async function handleRequest(
  request: Request,
  assetLoader: AssetLoader
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Remove trailing slash
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  // Root path - this should be handled by static assets in production
  // For dynamic routes, we only handle image generation paths
  if (normalizedPath === '' || normalizedPath === '/') {
    return new Response('Not Found', { status: 404 });
  }

  // Debug route - returns parsed URL structure as JSON
  // Note: Use original pathname (not normalizedPath) to preserve trailing slashes
  if (pathname.startsWith('/debug/')) {
    const debugPath = pathname.slice(7); // Remove '/debug/' prefix
    const fullDebugPath = debugPath + url.search; // Include query string
    const parsed = parseFakeImgUrlDetailed(fullDebugPath);
    return new Response(JSON.stringify(parsed, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Parse the URL for image generation parameters
  // Include query string to ensure consistent parsing with debug route
  const fullPath = normalizedPath + url.search;
  const { canvas, bg, content } = parseFakeImgUrlDetailed(fullPath);

  // canvas (必定存在於簡寫語法) → sizeParam
  const sizeParam = canvas;
  if (!sizeParam) {
    return new Response('Bad Request: Size parameter required', { status: 400 });
  }

  // 目前尚未實作邊緣背景 (bg block) ，故直接使用 content.parts 作顏色來源
  // content.parts[0] → 主內容背景顏色 (原本的 bgColor)
  // content.parts[1] → 主內容文字顏色 (原本的 fgColor)
  const bgPart = content.parts[0] ?? null;
  const fgPart = content.parts[1] ?? null;

  // 若沒有提供顏色，使用預設值
  const bgColor = bgPart ? parseColor(bgPart) : '#cccccc';   // 預設灰
  const fgColor = fgPart ? parseColor(fgPart) : '#969696';   // 預設較深的灰

  // Parse query parameters
  const { width, height } = parseSize(sizeParam);
  const text = url.searchParams.get('text') || `${width}x${height}`;
  const fontName = url.searchParams.get('font') || 'noto'; // Default to noto
  const retina = url.searchParams.get('retina') === '1';

  // Load font
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

  // Generate Image
  const fontSizeVal = Math.floor(Math.min(width, height) / 5);
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

  // 預設輸出 SVG
  const format = 'svg';

  const imageResponse = new ImageResponse(element as any, {
    width: retina ? width * 2 : width,
    height: retina ? height * 2 : height,
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
