import { handleRequest } from '../../core/app';
import { VercelAssetLoader } from '../../core/loaders/VercelAssetLoader';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const loader = new VercelAssetLoader(origin);
  const env = { ENABLE_DEBUG: process.env.ENABLE_DEBUG };

  return handleRequest(request, {assetLoader: loader, ImageResponseClass: ImageResponse}, env);
}
