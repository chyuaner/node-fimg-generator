---
layout: ../layouts/MdLayout.astro
title: 關於本站
---


## 本站簡介
以在CDN原生直接運行的條件下，重新復刻 Fake images please? 的原有功能。在設計網站時，在已知尺寸的情況下，可快速插入預留圖可以幫助您排版。

並在原有的網址結構基礎下，加入分組式的網址結構，預留未來加入其他內容類型的彈性。

同時也新增邊緣背景設計的功能，方便用於製作螢幕截圖示意圖、簡報圖美化用途。


## 本站特色
網址結構精心設計，盡可能簡化以外同時預留功能擴充性

### 預留佔位圖 
基本上是復刻Fake images please?主要的功能

* 一般預留圖 <範例>
* 自訂文案預留圖
* 訂背景色與文字顏色的預留圖
* 支援繁體中文、日文、韓文
* 支援Emoji
* scale 直接放大 （但也支援retina=1用法）
* 支援Discord

### 邊緣背景設計
基本上是參考Gnome應用程式Gradia的邊緣背景設計
* 帶有帶有陰影的透明邊緣的預留圖
* 帶有帶有圓角陰影的圖案邊緣的預留圖

### 背景圖片
使用tpl()

### 浮水印



### 決定檔案格式輸出

本專案提供輸出SVG與PNG格式，並提供三種方式控制你想拿的檔案格式：

若網址參數帶入 `?filetype=png` ，或是 Header帶入 `Accept: image/png`，或是網址結尾以 .png 字串的話，就控制由png輸出。 

優先順序： `?filetype=png` > `.png` > `Accept: image/png`  然後SVG也比照。


#### 控制參數的優先順序
主要考量是以操作直覺性為主！

##### 1. ?filetype=png （由URL Query參數決定）
考量這個為最優先，是考量到使用者可能會用Postman Params界面，會希望能在界面上方便用句選取消的方式來控制

##### 2. .png （由副檔名決定）
對人類使用者與一般客戶端程式來說，最直覺也最習慣的指定方式

##### 3. Accept: image/png （由HTTP Header決定）
主流瀏覽器與比較成熟的客戶端，在發送HTTP Request時，就會直接順便宣告要接受什麼格式

##### 4. 都沒指定
目前直接以SVG為主。下述以SVG為主的理由：

### 預設格式的理由
雖然Fake images please?原本是以png為主，不過在本次專案中，將改以SVG為預設。

SVG：主流瀏覽器都支援，而且可直接拿來以`<img src="img.svg">`的方式直接使用，而且對於後端來說也只需要整理好輸出文字結構即可，不須處理畫面渲染，對後端來說幾乎0負擔，對使用者來說該圖片可自由放大都不會模糊失真。

PNG: 主流的圖片格式，絕大部分軟體都支援，可用於PPT簡報，或是其他用途使用。



### 尚未實做的未來功能
https://fimg.yuaner.tw/bg/5

### 
https://fimg.yuaner.tw/[canvas-size]/bg/[bg-padding]/[bg-shadow]/[bg-radius]/[bg-bgcolor]/ph/[bgcolor]/[fgcolor]/?text=[text]&filetype=[svg|png]


## 本站簡介
本站是採用雙層混合伺服器的方式來建置

公網 -> Cloudflare CDN -> Cloudflare Workers -> Vercel

Cloudflare CDN
將已生成圖片直接在CDN層

Cloudflare Workers


Vercel

## 可架設在

本後端是以Serverless Edge無伺服器為前提重新開發的，目前支援架設在Cloudflare Workers、Vercel空間

也可以