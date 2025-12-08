import { Context, Hono } from 'hono';
import { ImageResponse } from '@cf-wasm/og';
import { parseSize, parseColor, parseTextToElements } from './routerTools';

// -----------------------------------------------------------------------------
// Helper functions (Hono相關的)
// -----------------------------------------------------------------------------
function detectType(c: Context) {
    const fullPath = c.req.path;                     // 取得原始 URL 路徑
    let forcePng = false, forceSvg = false;
    let cleanPath = fullPath;

    if (fullPath.endsWith('.png')) {
        forcePng = true;
        cleanPath = fullPath.slice(0, -4); // 移除 ".png"
    }
    else if (fullPath.endsWith('.svg')) {
        forceSvg = true;
        cleanPath = fullPath.slice(0, -4); // 移除 ".png"
    }

    return {forcePng, forceSvg, cleanPath};
}

// -----------------------------------------------------------------------------
// Router 設定（接受已建立好的 app，回傳同一個 app）
// -----------------------------------------------------------------------------
export const applyRoutes = (app: Hono<any>) => {

  // ---------- 動態圖片 ----------
  app.get('/:size/:bgColor?/:fgColor?', async (c) => {
    // Check for .png extension in the *last* provided parameter to override type
    let {forcePng, cleanPath} = detectType(c);

    // 把去除副檔名後的路徑切割成參數陣列 (去除開頭的斜線)
    const parts = cleanPath.replace(/^\/+/, '').split('/');

    // Hono 仍會把路由參數自動對應至以下變數，為保險起見重新取得
    const sizeParam = parts[0] ?? null;        // "300"、"300x200"
    const bgParam   = parts[1] ?? null;        // "ff0000"
    const fgParam   = parts[2] ?? null;        // "00ff00"

    let rawSize = sizeParam;
    let rawBg = bgParam;
    let rawFg = fgParam

    const { width, height } = parseSize(rawSize);

    // Defaults
    const bgColor = rawBg ? parseColor(rawBg) : '#cccccc'; // Default grey

    const fgColor = rawFg ? parseColor(rawFg) : '#969696'; // Default darker grey

    const query = c.req.query();
    const text = query.text || `${width}x${height}`;
    const fontName = query.font || 'noto'; // Default to noto
    const retina = query.retina === '1';

    // Load font
    const loader = c.get('assetLoader');
    let fontData: ArrayBuffer | null = null;
    try {
        // Map short names to files
        const fontFile = fontName === 'lobster' ? 'Lobster-Regular.ttf' : 'NotoSansTC-Medium.ttf';
        fontData = await loader.loadFont(fontFile);
    } catch (e) {
        console.error("Font load error:", e);
        // Fallback or error?
        // For now, let's try to load a default fallback if the specific one failed, or just fail.
        // If Noto fails, we might be in trouble if we don't have it.
    }

    if (!fontData) {
        return c.text("Font not found", 500);
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
    const format = forcePng ? 'png' : 'svg'; // User wants SVG default

    const imageResponse = new ImageResponse(
        element as any,
        {
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
            format: format as any, // Cast if type definitions are incomplete
        }
    );


    // If SVG, headers might need adjustment? ImageResponse handles Content-Type.
    return imageResponse;
    });

  return app;
};
