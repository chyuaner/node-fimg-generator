import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs'; // ES‑module 方式

export default defineConfig({
  // ---------- 基本目錄 ----------
  outDir: './public',          // 產出目錄（build 時使用）
  publicDir: './static',      // 靜態資源目錄
  srcDir: './src/frontend',   // 前端原始檔案目錄

  // ---------- 開發伺服器 ----------
  server: {
    port: 4321,
    host: true,
  },

  // -------------------------------------------------
  // Vite 設定 – 用一個通用的 proxy，並在 bypass 裡自行判斷
  // -------------------------------------------------
  vite: {
    plugins: [
      tailwindcss({
        config: path.resolve('./tailwind.config.js'),
      })
    ],
    server: {
      proxy: {
        // ★ 只要請求符合「要走 API」的條件，就交給 http://localhost:8787
        '/': {
          target: 'http://localhost:8787',
          changeOrigin: true,

          /**
           * bypass:
           *   - 只檢查 URL 的 pathname（不含 query、hash）
           *   - 符合任一條件 → 回傳 null → 交給代理
           *   - 不符合 → 回傳原始 URL → 交給 Astro / Vite 本身
           */
          bypass: (req) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathname = decodeURIComponent(url.pathname);   // 只拿路徑部份

            // 1️⃣ 數字或「數字x數字」 + 可有斜線子路徑或副檔名
            //    例：/300   /300.png   /800x600   /800x600.webp   /400x200?…
            const isNumberPattern = /^\/\d+(x\d+)?(?:\/.*|\.[^/]+)?$/;

            // 2️⃣ /bg/...  或  /ph/...
            const isBgPhPattern = /^\/(bg|ph)\/.*$/;

            // 3️⃣ 正好是 /404
            const is404 = pathname === '/404';

            if (isNumberPattern.test(pathname) || isBgPhPattern.test(pathname) || is404) {
              // 符合任一條件 → 直接走代理
              return null;          // 交給 http://localhost:8787
            }

            // 其餘保持原樣 → 交給 Astro / Vite 處理（不會走代理）
            return req.url;
          },
        },
      },
    },
  },
});