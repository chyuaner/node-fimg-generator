// -----------------------------------------------------------------------------
// Params Paser functions
// -----------------------------------------------------------------------------

export const parseSize = (sizeStr: string) => {
  if (sizeStr.includes('x')) {
    const [w, h] = sizeStr.split('x').map(Number);
    return { width: w, height: h };
  }
  const s = Number(sizeStr);
  return { width: s, height: s };
};

export const parseColor = (colorStr: string) => {
  // Support "ff0000" -> "#ff0000", "000" -> "#000"
  // Also support "ff0000,128" -> "#ff000080"

  const [hexPart, alphaPart] = colorStr.split(',');
  let color = hexPart.startsWith('#') ? hexPart : '#' + hexPart;

  if (alphaPart) {
      // Normalize to 6 digits if 3 digits
      if (color.length === 4) { // #RGB
          const r = color[1];
          const g = color[2];
          const b = color[3];
          color = `#${r}${r}${g}${g}${b}${b}`;
      }

      const a = Math.max(0, Math.min(255, Number(alphaPart)));
      const alphaHex = Math.round(a).toString(16).padStart(2, '0');
      color += alphaHex;
  }

  return color;
};

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------
// 決定回傳格式 (SVG / PNG)
//   1. ?filetype=xxx   -> 最高優先權
//   2. .xxx 結尾      -> 次高優先權
//   3. Accept Header -> 最低優先權
// 預設: SVG
export function fileType(url: URL, request: Request) {
  const pathname = url.pathname;
  let format: 'svg' | 'png' | 'html' = 'svg';

  // 1️⃣ query param
  const filetypeParam = url.searchParams.get('filetype')?.toLowerCase();
  if (filetypeParam === 'png' || filetypeParam === 'svg' || filetypeParam === 'html') {
    format = filetypeParam as typeof format;
  } else {
    // 2️⃣ 檔名副檔名
    if (pathname.endsWith('.png')) {
      format = 'png';
    } else if (pathname.endsWith('.svg')) {
      format = 'svg';
    } else if (pathname.endsWith('.html')) {
      format = 'html';
    } else {
      // 3️⃣ Accept header
      const acceptHeader = request.headers.get('Accept')?.toLowerCase() ?? '';
      if (acceptHeader.includes('image/png')) {
        format = 'png';
      } else if (acceptHeader.includes('image/svg+xml')) {
        format = 'svg';
      } else if (acceptHeader.includes('text/html')) {
        format = 'html';
      }
    }
  }

  return format;
}

