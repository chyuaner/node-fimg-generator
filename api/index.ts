import { handleRequest } from '../src/core/app';
import { VercelAssetLoader } from '../src/core/loaders/VercelAssetLoader';
import { ImageResponse } from '@vercel/og';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Remove 'edge' runtime config to default to Node.js (Serverless Function)
export const config = {
  // runtime: 'edge', 
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // -------------------------------------------------------------------------
    // Adapter: Convert Vercel/Node Request (IncomingMessage) to Web Standard Request
    // -------------------------------------------------------------------------
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const fullUrl = `${protocol}://${host}${req.url}`;

    const request = new Request(fullUrl, {
      method: req.method,
      headers: req.headers as HeadersInit,
      // Body handling can be added here if needed, but for GET requests it's not needed
    });

    // -------------------------------------------------------------------------
    // Logic: Initialize Loader & Handle Request
    // -------------------------------------------------------------------------
    const url = new URL(request.url);
    const loader = new VercelAssetLoader(url.origin);

    const response = await handleRequest(request, loader, {
      ENABLE_DEBUG: process.env.ENABLE_DEBUG,
    }, ImageResponse);

    // -------------------------------------------------------------------------
    // Adapter: Convert Web Standard Response back to Vercel/Node Response
    // -------------------------------------------------------------------------
    res.status(response.status);
    
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.send(buffer);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).send('Internal Server Error');
  }
}
