import { handleRequest } from '../core/app';
import { ImageResponse } from 'next/og';
import type { AssetLoader } from '../core/assetLoader';

// Change this to 'edge' or 'nodejs' to switch runtimes
export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Manual proxy for root path to serve static index.html
  try {
    const url = new URL(request.url);
    if (url.pathname === '/') {
       const indexUrl = new URL('/index.html', request.url);
       const indexResponse = await fetch(indexUrl);
       if (indexResponse.ok) {
           return indexResponse;
       }
    }
  } catch (e) {
    // Fallback
  }

  // Fallback -> generate image
  const url = new URL(request.url);
  const origin = url.origin;
  
  let loader: AssetLoader;

  if (runtime === 'nodejs') {
      const { VercelNodeAssetLoader } = await import('../core/loaders/VercelNodeAssetLoader');
      loader = new VercelNodeAssetLoader(origin);
  } else {
      const { VercelAssetLoader } = await import('../core/loaders/VercelAssetLoader');
      loader = new VercelAssetLoader(origin);
  }

  const env = { ENABLE_DEBUG: process.env.ENABLE_DEBUG };
  
  return handleRequest(request, loader, env, ImageResponse);
}
