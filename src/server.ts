import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { handleRequest } from './core/app.js';
import { NodeAssetLoader } from './core/assetLoader.js';

const port = 3000;
const publicDir = path.join(process.cwd(), 'public');

// Simple MIME type lookup
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveStaticFile(filePath: string): Promise<Response | null> {
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    return new Response(data, {
      headers: { 'Content-Type': mimeType },
    });
  } catch (e) {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    // Construct full URL
    const protocol = 'http';
    const host = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url || '/', `${protocol}://${host}`);

    // Try to serve static files first
    let staticResponse: Response | null = null;
    
    if (url.pathname === '/') {
      staticResponse = await serveStaticFile(path.join(publicDir, 'index.html'));
    } else {
      staticResponse = await serveStaticFile(path.join(publicDir, url.pathname));
    }

    if (staticResponse) {
      res.statusCode = staticResponse.status;
      staticResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      
      const body = await staticResponse.arrayBuffer();
      res.end(Buffer.from(body));
      return;
    }

    // If no static file, handle as dynamic image generation
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as HeadersInit,
    });

    const loader = new NodeAssetLoader();
    const response = await handleRequest(request, loader);

    // Convert Web API Response to Node.js response
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = await response.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
