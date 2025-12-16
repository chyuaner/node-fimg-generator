import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';   // ES‑module 方式載入

export default defineConfig({
  outDir: './public',
  publicDir: './static',
  srcDir: './src/frontend',
  server: {
    port: 4321,
    host: true
  },
  vite: {
    plugins: [
      tailwindcss({
        config: path.resolve('./tailwind.config.js'),
      })
    ],
    server: {
      proxy: {
        '/': {
          target: 'http://localhost:8787',
          changeOrigin: true,
          /**
           * bypass:
           *   - 先排除所有 Vite / Astro 虛擬路徑（如 @vite、@fs、__astro、@id 等）
           *   - 再排除 src、node_modules、static 內的真實檔案
           *   - 其餘找不到的檔案才走代理
           */
          bypass: (req) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathname = decodeURIComponent(url.pathname);

            // -------------------------------------------------
            // 1️⃣ 排除 Vite / Astro 內建的虛擬路徑
            // -------------------------------------------------
            const excludedPrefixes = [
              '/@vite',          // Vite client / HMR
              '/@fs',            // Vite file system import
              '/__astro',        // Astro dev toolbar、internal modules
              '/@id',            // Astro internal IDs
              '/node_modules/.vite', // Vite 虛擬檔案
            ];
            if (excludedPrefixes.some(p => pathname.startsWith(p))) {
              return req.url;   // 直接讓 Vite 處理
            }

            // -------------------------------------------------
            // 2️⃣ 排除專案內的 src 與 node_modules（Vite 會自行提供）
            // -------------------------------------------------
            const srcPrefix = '/src/';            // 你的 src/frontend/... 都會以此開頭
            const nodeModulesPrefix = '/node_modules/';

            if (pathname.startsWith(srcPrefix) || pathname.startsWith(nodeModulesPrefix)) {
              return req.url;   // 直接回傳，避免走代理
            }

            // -------------------------------------------------
            // 3️⃣ 檢查本機 static (publicDir) 與 src/frontend (srcDir) 是否真的存在檔案
            // -------------------------------------------------
            const staticPath = path.resolve('static', `.${pathname}`);
            const srcPath = path.resolve('src', 'frontend', `.${pathname}`);

            if (fs.existsSync(staticPath) || fs.existsSync(srcPath)) {
              // 有實體檔案 → 不走代理
              return req.url;
            }

            // -------------------------------------------------
            // 4️⃣ 其餘全部交給代理
            // -------------------------------------------------
            return null; // 交給 http://localhost:8787
          },
        },
      },
    },
  },
});
