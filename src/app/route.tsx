import { handleRequest } from '../core/app';
import { VercelAssetLoader } from '../core/loaders/VercelAssetLoader';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  // Manual proxy for root path to serve static index.html
  try {
    const indexUrl = new URL('/index.html', request.url);
    const indexResponse = await fetch(indexUrl);
    if (indexResponse.ok) {
        return indexResponse;
    }
  } catch (e) {
    // Fallback if fetch fails (unlikely)
  }

  // Fallback -> generate image (e.g. if index.html is missing for some reason)
  const url = new URL(request.url);
  const origin = url.origin;
  const loader = new VercelAssetLoader(origin);
  const env = { ENABLE_DEBUG: process.env.ENABLE_DEBUG };
  const environmentInfo = {
    platform: 'Vercel'
  };
  return handleRequest(request, {assetLoader: loader, ImageResponseClass: ImageResponse}, env, environmentInfo);
}
