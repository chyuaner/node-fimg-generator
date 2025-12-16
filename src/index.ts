import { handleRequest } from "./core/app";
import { CloudflareAssetLoader } from "./core/loaders/CloudflareAssetLoader";
import { ImageResponse } from '@cf-wasm/og';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Serve static assets (HTML, CSS, JS) from the ASSETS binding
    // These are built by Astro and deployed with the worker
    if (pathname === '/' || pathname.startsWith('/assets/') || pathname.endsWith('.html') || pathname.endsWith('.css') || pathname.endsWith('.js')) {
      if (env.ASSETS) {
        try {
          const response = await env.ASSETS.fetch(request);
          if (response.status !== 404) {
            return response;
          }
        } catch (e) {
          console.error('Error serving static asset:', e);
        }
      }
    }

    // Handle dynamic image generation
    const loader = new CloudflareAssetLoader(env.ASSETS);

    const environmentInfo = {
      platform: 'Cloudflare Workers'
    };
    return handleRequest(request, {assetLoader: loader, ImageResponseClass: ImageResponse}, env, environmentInfo);
  },
} satisfies ExportedHandler<CloudflareBindings>;
