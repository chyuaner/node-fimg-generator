
export function renderElementToHtml(elem: any): string {
  // 這是一個 **極簡** 的遞迴序列化，只支援 div / span / pre 等常見標籤。
  // 若有更複雜的需求，請自行擴充或改用第三方 library（例如 html-escapes）。
  const { type, props } = elem;
  const { style, children, ...rest } = props ?? {};

  // 1️⃣ 產生 style 字串
  const styleStr = style
    ? ' style="' +
        Object.entries(style)
          // 把 camelCase key 轉為 kebab‑case
          .map(([key, value]) => `${camelToKebab(key)}:${value}`)
          .join(';') +
        '"'
    : '';

  // 2️⃣ 處理屬性（僅保留純文字屬性）
  const attrStr = Object.entries(rest)
    .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join('');

  // 3️⃣ 處理子元素（遞迴）
  const childStr = (Array.isArray(children) ? children : [children])
    .filter(Boolean)
    .map((c) => (typeof c === 'object' ? renderElementToHtml(c) : String(c)))
    .join('');

  return `<${type}${styleStr}${attrStr}>${childStr}</${type}>`;
}

/**
 * 把 camelCase (backgroundColor) 轉成 kebab-case (background-color)。
 * 簡易實作：在每個大寫字母前加上 `-`，再全部轉小寫。
 * 若要支援特殊前綴（Webkit、Moz）亦會自動轉為 `-webkit-…`。
 */
function camelToKebab(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')   // aB → a-b
    .replace(/^Webkit/, '-webkit')           // WebkitTransform → -webkit-transform
    .replace(/^Moz/, '-moz')                 // MozTransition → -moz-transition
    .replace(/^Ms/, '-ms')                   // MsFlexAlign → -ms-flex-align
    .toLowerCase();
}

export function renderfullHtmlFromElement(elem: any): string {
  const html = `
      <!DOCTYPE html>
      <html lang="zh-Hant">
      <head><meta charset="UTF-8"><title>Debug HTML</title></head>
      <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;">
        ${renderElementToHtml(elem)}   <!-- 下面會示範此 helper -->
      </body>
      </html>`.trim();
  return html;
}
