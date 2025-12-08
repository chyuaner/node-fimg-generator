import { ImageResponse } from '@cf-wasm/og';
import { AssetLoader } from './assetLoader';
import { parseSize, parseColor, parseTextToElements } from './routerTools';
import { parseFakeImgUrl as parseFakeImgUrlDetailed } from './parseFakeImgUrl';

// -----------------------------------------------------------------------------
// URL Parsing Helper
// -----------------------------------------------------------------------------
function parseFakeImgUrl(pathname: string) {
  let forcePng = false, forceSvg = false;
  let cleanPath = pathname;

  if (pathname.endsWith('.png')) {
    forcePng = true;
    cleanPath = pathname.slice(0, -4);
  } else if (pathname.endsWith('.svg')) {
    forceSvg = true;
    cleanPath = pathname.slice(0, -4);
  }

  // Remove leading slashes and split
  const parts = cleanPath.replace(/^\/+/, '').split('/');

  const sizeParam = parts[0] ?? null;
  const bgParam = parts[1] ?? null;
  const fgParam = parts[2] ?? null;

  return {
    forcePng,
    forceSvg,
    sizeParam,
    bgParam,
    fgParam,
  };
}

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
  const { forcePng, forceSvg, sizeParam, bgParam, fgParam } = parseFakeImgUrl(normalizedPath);

  if (!sizeParam) {
    return new Response('Bad Request: Size parameter required', { status: 400 });
  }

  // Parse size
  const { width, height } = parseSize(sizeParam);

  // Parse colors with defaults
  const bgColor = bgParam ? parseColor(bgParam) : '#cccccc'; // Default grey
  const fgColor = fgParam ? parseColor(fgParam) : '#969696'; // Default darker grey

  // Parse query parameters
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

  // Determine format
  const format = forcePng ? 'png' : 'svg'; // SVG by default

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
