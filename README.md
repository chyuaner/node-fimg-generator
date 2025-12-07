# Cloudflare Image Gen (FakeImg Clone)

A high-performance image generation service running on Cloudflare Workers using Hono and @cf-wasm/og.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. **Add Fonts**:
   You MUST place a font file at `public/font/NotoSans-Regular.ttf` (or rename yours to match the expected default `noto`).
   
   If you want to use other fonts, add them to `public/font/` and update `src/app.ts` mapping.

## Development

### Cloudflare Workers
```bash
npm run dev
```

### Node.js
```bash
npm run dev:node
```

## Deployment
```bash
npm run deploy
```

## API
See `walkthrough.md` for full API details.
