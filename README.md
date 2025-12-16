# Cloudflare Image Gen (FakeImg Clone)
本專案以Fake images please?為基礎，重新以能在Cloudflare Worker、Vercel原生運行為前提重新撰寫。並在不破壞Fake images please原有網址結構設計的情況下，加入分組式的網址結構，大幅加入功能擴充的彈性。

A high-performance image generation service running on Cloudflare Workers using @cf-wasm/og.


## 專案特色
* 本專案兼容Cloudflare Worker、Vercel (Serverless Edge)原生運行設計，
    - [x] 不使用 nodejs_compat compatibility_flags 相容模式，以取得最佳效能與穩定性
    - [ ] 亦提供Docker獨立執行方式，可在自有主機架設
    - [x] 亦提供NodeJS獨立執行方式，可在自有主機架設
- [x] 繼承Fake images please?舊有功能
    - [x] There are options too, you can pass a text, or change some colors.
    - [x] Colors must be hexadecimal, the first one is the background color.
    - [x] You can add the alpha value of the color with a comma, (hex,a).
    - [x] The support for japanese, korean and chinese text is available with the use of the Noto font (font=noto)  （僅繁體中文測試過）
    - [x] You can now use emojis as well and Discord emotes. The format for Discord emotes is like that: `<:rooThink:596576798351949847>`
        * 雖然有實裝此功能，但是會額外產生外連到Discord伺服器的流量，若你在意效能就不建議使用
- [x] 結合Gnome應用程式Gradia的邊緣背景設計
* 重新設計分組式的語意結構化網址
    * 可相容Fake images please?舊有功能
    * 網址結構分為三大組：
    * 若沒有需求，可直接省略
- [ ] 前端界面優化

## 📦 目錄結構
### 程式啟動點
* Cloudflare Workers專用： /src/index.ts
* Vercel專用(Next.JS模式)
    * /src/app/route.tsx
    * /src/app/\[...slug\]/route.tsx
* 傳統Node.JS (express)專用： /src/server.ts

```text
├── src/
│   ├── app/ # Vercel專用
│   │   ├── route.tsx
│   │   └── [...slug]/
│   │       └── route.tsx
│   ├── index.ts # Cloudflare Workers專用
│   └── server.ts # 傳統node.js server專用
├── vercel.json
├── worker-configuration.d.ts
└── wrangler.jsonc
```


### 核心功能相關

```text
├── package.json
├── public/ 執行 npm run build 後產出靜態包
├── src/
│   └── core/
│       ├── app.ts # 主Router，
│       ├── Canvas.tsx # 定義元素內容的邏輯
│       ├── components/ # 純定義該元素的外觀排版
│       ├── loaders/
│       │   ├── AssetLoader.ts
│       │   ├── assets.ts # 資源檔案載入器
│       │   ├── CloudflareAssetLoader.ts
│       │   ├── loadFonts.ts # 字體管理模組
│       │   ├── NodeAssetLoader.ts
│       │   └── VercelAssetLoader.ts
│       ├── middleware.ts #處理Response Header相關，如:CDN快取設定、CORS
│       ├── renderHtml.ts #直接輸出HTML，僅Debug用
│       └── urlUtils/
│           ├── parseUrl.ts # 將拆解後的文字再進一步解析成內部統一格式
│           └── splitUrl.ts # 處理網址結構拆解
└── static/
    ├── background/
    └── font/
```

### 前端頁面相關
```text
├── public/ #執行 npm run build 後產出靜態包
├── src/
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── Footer.astro
│   │   │   └── Navbar.astro
│   │   ├── layouts/
│   │   │   └── Layout.astro
│   │   ├── pages/
│   │   │   ├── examples.astro
│   │   │   ├── index.astro
│   │   │   └── intro.astro
│   │   └── styles/
│   │       ├── eurl.css
│   │       └── global.css
└── static/ # 在 npm run build時會直接複製到 /public 裡
│   ├── background/
│   └── font/
└── astro.config.mjs
```


## 基本用法

```
https://fimg.yuaner.tw/[canvas-size]/bg/[bg-padding]/[bg-shadow]/[bg-radius]/[bg-bgcolor]/ph/[bgcolor]/[fgcolor]/?text=Hello+World
```

網址參數（目前已實裝的功能）
- [x] size = 350x200
- [x] padding = 3
- [x] padding = 4x1
- [x] shadow = 3
- [x] radius = 5
- [x] bgcolor = ff0000,128
- [x] bgcolor = tpl(aaa)
- [ ] bgcolor = url("https://example.com/a.png")
- [x] fgcolor = 000,255

### 相容 Fake images please? 用法
* https://fimg.yuaner.tw/300/
* https://fimg.yuaner.tw/250x100/
* https://fimg.yuaner.tw/250x100/ff0000/
* https://fimg.yuaner.tw/350x200/ff0000/000
* https://fimg.yuaner.tw/350x200/ff0000,128/000,255
* https://fimg.yuaner.tw/350x200/?text=Hello
* https://fimg.yuaner.tw/200x100/?retina=1&text=こんにちは&font=noto
* https://fimg.yuaner.tw/350x200/?text=World&font=lobster
* https://fimg.yuaner.tw/440x230/ff0000,128/000,255/?retina=1&text=Problem?%20%3C%3Apepw%3A989410572514758676%3E

### 草稿階段
* https://fimg.yuaner.tw/[最大畫布 000x000]/bg/[padding]/[shadow]/[radius]/[bgcolor]/code/[theme]/[language]/
* https://fimg.yuaner.tw/[最大畫布 000x000]/bg/[padding]/[shadow]/[radius]/[bgcolor]/code/[code-bgcolor]/[code-fgcolor]/[language]/text
* https://fimg.yuaner.tw/[最大畫布 000x000]/bg/[padding]/[shadow]/[radius]/[bgcolor]/code/[code-bgcolor]/[code-fgtheme]/[language]/content
* https://fimg.yuaner.tw/[最大畫布 000x000]/bg/[padding]/[shadow]/[radius]/[bgcolor]/code/[code-bgcolor]/[code-fgtheme]/[language]/content


## 控制檔案
本專案提供SVG與PNG

提供三種方式控制你想拿的檔案格式

若網址參數帶入 ?filetype=png ，或是 Header帶入 Accept: image/png，或是網址結尾以 .png 字串的話，就控制由png輸出。  優先順序： ?filetype=png > .png > Accept: image/png  然後SVG也比照。


### 控制參數的優先順序與理由
主要考量是以操作直覺性為主！

#### 1. ?filetype=png
考量這個為最優先，是考量到使用者可能會用Postman Params界面，會希望能在界面上方便用句選取消的方式來控制

#### 2. .png
對人類使用者與一般客戶端程式來說，最直覺說要取得什麼樣的檔案格式

#### 3. Accept: image/png
主流瀏覽器與比較成熟的客戶端，在發送HTTP Request時，就會直接順便宣告要接受什麼格式

#### 4. 都沒指定
目前直接以SVG為主。下述以SVG為主的理由：

### 預設格式的理由
雖然Fake images please?原本是以png為主，不過在本次專案中，將改以SVG為預設，以下說明主要考量：

SVG：主流瀏覽器都支援，後端不須，
PNG: 主流

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
