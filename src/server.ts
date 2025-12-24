import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { handleRequest } from './core/app.js';
import { NodeAssetLoader } from './core/loaders/NodeAssetLoader.js';

import { ImageResponse } from '@cf-wasm/og';

const app = express();
const port = 3000;
const publicDir = path.join(process.cwd(), 'public');

// --------------------------------------------------
// 靜態檔案服務（自動處理 MIME、404 等）
// --------------------------------------------------
app.use(express.static(publicDir));

// --------------------------------------------------
// SPA Fallback for /generator/*
// --------------------------------------------------
app.get('/generator/*', (req, res, next) => {
  // Check if it's a file request (has extension); if so, pass to next() (static handler or error)
  if (path.extname(req.path)) {
    return next();
  }
  // Otherwise serve the generator HTML
  res.sendFile(path.join(publicDir, 'generator/index.html'), (err) => {
    if (err) next(err);
  });
});

// --------------------------------------------------
// 動態圖片產生（未命中 static 時的 fallback）
// --------------------------------------------------
app.use(async (req, res, next) => {
  try {
    // 將 Express 的 Request 轉成 Web API Request
    const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers as HeadersInit,
    });

    const loader = new NodeAssetLoader();

    // 從 process.env 讀取環境變數
    const env = {
      ENABLE_DEBUG: process.env.ENABLE_DEBUG,
    };
    const environmentInfo = {
      platform: 'Node.JS'
    };

    const response = await handleRequest(request, {assetLoader: loader, ImageResponseClass: ImageResponse}, env, environmentInfo);

    // 直接把 Web API Response 轉回 Express 回應
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = await response.arrayBuffer();
    res.send(Buffer.from(body));
  } catch (err) {
    next(err); // 交給下面的錯誤處理中介軟體
  }
});

// --------------------------------------------------
// 全域錯誤處理
// --------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).type('text/plain').send('Internal Server Error');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
