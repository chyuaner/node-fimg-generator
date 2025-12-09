# Cloudflare Image Gen (FakeImg Clone)
本專案以Fake images please?為基礎，重新以能在Cloudflare Worker原生運行的程式語言重新撰寫。並在不破壞Fake images please原有網址結構設計的情況下，加入分組式的網址結構，大幅加入功能擴充的彈性。

A high-performance image generation service running on Cloudflare Workers using @cf-wasm/og.


## 專案特色
* 完全針對Cloudflare Workers (Serverless Edge)設計，以高效能、能完全於CDN環節 為主要賣點。
    - [x] 不使用 nodejs_compat compatibility_flags 相容模式，以取得最佳效能與穩定性
    - [ ] 亦提供Docker獨立執行方式，可在自有主機架設
    - [x] 亦提供NodeJS獨立執行方式，可在自有主機架設
- [ ] 繼承Fake images please?舊有功能
    - [x] There are options too, you can pass a text, or change some colors.
    - [x] Colors must be hexadecimal, the first one is the background color.
    - [x] You can add the alpha value of the color with a comma, (hex,a).
    - [ ] The support for japanese, korean and chinese text is available with the use of the Noto font (font=noto)  （僅繁體中文測試過）
    - [x] You can now use emojis as well and Discord emotes. The format for Discord emotes is like that: `<:rooThink:596576798351949847>`
        * 雖然有實裝此功能，但是會額外產生外連到Discord伺服器的流量，若你在意效能就不建議使用
- [ ] 結合Gnome應用程式Gradia的邊緣背景設計
* 重新設計分組式的語意結構化網址
    * 可相容Fake images please?舊有功能
    * 網址結構分為三大組：
    * 若沒有需求，可直接省略
- [ ] 前端界面優化

## 基本用法

```
https://fimg.yuaner.tw/[canvas-size]/bg/[bg-padding]/[bg-shadow]/[bg-bgcolor]/[bg-radius]/ph/[bgcolor]/[fgcolor]/?text=Hello+World
```

網址參數（目前已實裝的功能）
- [x] size = 350x200
- [ ] padding = 3
- [ ] padding = 4x1
- [ ] shadow = 3
- [ ] radius = 5
- [x] bgcolor = ff0000,128
- [ ] bgcolor = tmp(aaa)
- [ ] bgcolor = url("https://example.com/a.png")
- [x] fgcolor = 000,255

### 相容 Fake images please? 用法
* http://fimg.yuaner.tw/300/
* http://fimg.yuaner.tw/250x100/
* http://fimg.yuaner.tw/250x100/ff0000/
* http://fimg.yuaner.tw/350x200/ff0000/000
* http://fimg.yuaner.tw/350x200/ff0000,128/000,255
* http://fimg.yuaner.tw/350x200/?text=Hello
* http://fimg.yuaner.tw/200x100/?retina=1&text=こんにちは&font=noto
* http://fimg.yuaner.tw/350x200/?text=World&font=lobster
* http://fimg.yuaner.tw/440x230/ff0000,128/000,255/?retina=1&text=Problem?%20%3C%3Apepw%3A989410572514758676%3E


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
