import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import app from './app.js';
import { AssetLoader, NodeAssetLoader } from './assetLoader.js';

const wrapper = new Hono<{ Variables: { assetLoader: AssetLoader } }>();

// Inject NodeAssetLoader
wrapper.use('*', async (c, next) => {
  if (!c.get('assetLoader')) {
    c.set('assetLoader', new NodeAssetLoader());
  }
  await next();
});

// Mount the main app
wrapper.route('/', app);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: wrapper.fetch,
  port
});
