import { handleRequest } from '../../core/app';
import { VercelAssetLoader } from '../../core/loaders/VercelAssetLoader';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Prevent recursion: if something tries to fetch a public asset by URL and it tails through to here,
  // return 404 to stop the loop.
  if (pathname.startsWith('/font/') || pathname.startsWith('/images/')) {
    return new Response('Asset not found', { status: 404 });
  }

  const origin = url.origin;
  
  const loader = new VercelAssetLoader(origin);
  const env = { ENABLE_DEBUG: process.env.ENABLE_DEBUG };

  return handleRequest(request, loader, env, ImageResponse);
}
