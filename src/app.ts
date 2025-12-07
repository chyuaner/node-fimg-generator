import { Hono } from 'hono';
import { AssetLoader } from './assetLoader';
import { applyRoutes } from './router';

type Env = {
  Bindings: CloudflareBindings;
  Variables: {
    assetLoader: AssetLoader;
  }
};

const app = new Hono<Env>();

// -----------------------------------------------------------------------------
// 處理靜態資源路由
// -----------------------------------------------------------------------------
// Middleware to ensure assetLoader is available
app.use('*', async (c, next) => {
  if (!c.get('assetLoader')) {
    // In CF worker, index.ts should set this.
    // In Node adapter, server.ts should set this.
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

// -----------------------------------------------------------------------------
// 處理圖片生成 動態路由
// -----------------------------------------------------------------------------

applyRoutes(app);


export default app;
