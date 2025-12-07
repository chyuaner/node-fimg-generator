import { Hono } from 'hono';
import { ImageResponse } from '@cf-wasm/og';
import { AssetLoader } from './loader';

type Env = {
  Bindings: CloudflareBindings;
  Variables: {
    assetLoader: AssetLoader;
  }
};

const app = new Hono<Env>();

// Middleware to ensure assetLoader is available
app.use('*', async (c, next) => {
  if (!c.get('assetLoader')) {
    // In CF worker, index.ts should set this. 
    // In Node adapter, node-server.ts should set this.
    return c.text('Internal Server Error: AssetLoader not configured', 500);
  }
  await next();
});

// Root handler to serve index.html
app.get('/', async (c) => {
  const loader = c.get('assetLoader');
  try {
    const html = await loader.loadText('index.html');
    return c.html(html);
  } catch (e) {
    return c.text('Not Found', 404);
  }
});

// Helper to parse size
const parseSize = (sizeStr: string) => {
  if (sizeStr.includes('x')) {
    const [w, h] = sizeStr.split('x').map(Number);
    return { width: w, height: h };
  }
  const s = Number(sizeStr);
  return { width: s, height: s };
};

// Helper to parse color (simple hex support)
const parseColor = (colorStr: string) => {
  // Support "ff0000" -> "#ff0000", "000" -> "#000"
  // Also support "ff0000,128" -> rgba? users ex: "ff0000,128". 
  // Let's assume user means hex + alpha(0-255).
  // The user example: "ff0000", "000", "ff0000,128"
  
  const [hex, alpha] = colorStr.split(',');
  let color = hex.startsWith('#') ? hex : '#' + hex;
  
  // Basic validation/sanitization could be added here
  return { color, alpha };
};

app.get('/:size/:bgColor?/:fgColor?', async (c) => {
  const sizeParam = c.req.param('size'); // "300", "300.png", "300x200", "300x200.png"
  const bgParam = c.req.param('bgColor');
  const fgParam = c.req.param('fgColor');
  
  // Check for .png extension in the *last* provided parameter to override type
  let forcePng = false;
  let rawSize = sizeParam;
  let rawBg = bgParam;
  let rawFg = fgParam;

  // Logic to detect .png at the end of the URL path
  // Since specific params might be undefined, we check the path or the last defined param.
  // Actually, Hono's routing might handle extensions if we are careful, but let's parse manualy.
  
  // If sizeParam has .png, and others are undefined
  if (rawSize && rawSize.endsWith('.png')) {
    forcePng = true;
    rawSize = rawSize.replace('.png', '');
  } else if (rawBg && rawBg.endsWith('.png') && !rawFg) {
    forcePng = true;
    rawBg = rawBg.replace('.png', '');
  } else if (rawFg && rawFg.endsWith('.png')) {
    forcePng = true;
    rawFg = rawFg.replace('.png', '');
  }

  const { width, height } = parseSize(rawSize);
  
  // Defaults
  const bgColor = rawBg ? parseColor(rawBg).color : '#cccccc'; // Default grey
  // const bgAlpha = rawBg ? parseColor(rawBg).alpha : undefined; // TODO: Handle alpha if needed in style
  
  const fgColor = rawFg ? parseColor(rawFg).color : '#969696'; // Default darker grey
  // const fgAlpha = ...

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
  // Using React-like element structure (JSX via generic object or h function if we import it, 
  // but standard object structure works for Satori/OG)
  
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
            fontSize: Math.min(width, height) / 5 + 'px', // Simple scaling
            fontFamily: fontName, 
        },
        children: text,
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

export default app;
