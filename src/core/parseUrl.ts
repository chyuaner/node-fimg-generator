// -----------------------------------------------------------------------------
// Params Paser functions
// -----------------------------------------------------------------------------

/**
 * 解析尺寸字串（支援單一值與「x」分隔的雙值）
 *
 * @param sizeStr   例: "30x30", "30", "30p"
 * @param canvasSize { width?: number; height?: number } | null
 *                  - 若提供，對應維度的百分比會以此基準計算
 *                  - 若該維度為 undefined，或 canvasSize 為 null，
 *                    該維度直接視為 pixel（即使字串是百分比）
 *
 * @returns { width:number; height:number }
 */
export const parseSize = (
  sizeStr: string,
  canvasSize: Partial<{ width: number; height: number }> | null = null,
  opt: { mode?: 'independent' | 'max' | 'min' | 'average' } = {}
): { width: number; height: number } => {
  const { mode = 'independent' } = opt; // 預設獨立運算
  // --------------------------------------------------------------
  // 1️⃣ 先去除前後空白，並檢查是否為單一值
  // --------------------------------------------------------------
  const trimmed = sizeStr.trim();

  // 判斷是否含有 "x"（雙值）或僅單一值
  const isDual = trimmed.includes('x');

  // --------------------------------------------------------------
  // 2️⃣ 雙值 (a x b) —— 永遠走「獨立」模式
  // --------------------------------------------------------------
  if (isDual) {
    const [rawW, rawH] = trimmed.split('x');

    const wIsPixel = rawW.endsWith('p');
    const hIsPixel = rawH.endsWith('p');

    const wNum = Number(wIsPixel ? rawW.slice(0, -1) : rawW);
    const hNum = Number(hIsPixel ? rawH.slice(0, -1) : rawH);

    const width = wIsPixel || !canvasSize?.width
      ? wNum
      : Math.round((canvasSize.width as number) * wNum / 100);

    const height = hIsPixel || !canvasSize?.height
      ? hNum
      : Math.round((canvasSize.height as number) * hNum / 100);

    return { width, height };
  }

  // --------------------------------------------------------------
  // 3️⃣ 單一值的處理（可能有 p 後綴）
  // --------------------------------------------------------------
  const isPixel = trimmed.endsWith('p');
  const pureNum = Number(isPixel ? trimmed.slice(0, -1) : trimmed);

  // p 後綴 → 直接視為 pixel
  if (isPixel) {
    return { width: pureNum, height: pureNum };
  }

  // 沒有 canvasSize 可用 → 直接視為 pixel（保持容錯）
  if (!canvasSize?.width || !canvasSize?.height) {
    return { width: pureNum, height: pureNum };
  }

  // --------------------------------------------------------------
  // 4️⃣ 依 mode 決定「共用基準」的邊長
  // --------------------------------------------------------------
  let baseSide: number;

  switch (mode) {
    case 'max':
      baseSide = Math.max(canvasSize.width as number, canvasSize.height as number);
      break;
    case 'min':
      baseSide = Math.min(canvasSize.width as number, canvasSize.height as number);
      break;
    case 'average':
      baseSide = Math.round(
        ((canvasSize.width as number) + (canvasSize.height as number)) / 2
      );
      break;
    case 'independent':
    default:
      // 獨立計算：寬度用 width 做基準，高度用 height 做基準
      const width = Math.round((canvasSize.width as number) * pureNum / 100);
      const height = Math.round((canvasSize.height as number) * pureNum / 100);
      return { width, height };
  }

  // 以共用基準 (max / min / average) 計算寬高，兩者結果相同
  const shared = Math.round((baseSide * pureNum) / 100);
  return { width: shared, height: shared };
};

/**
 * 依畫布最小邊計算比例或直接回傳 pixel。
 *
 * @param sizeStr       例如 "30", "30p"
 * @param canvasSize  { width: number; height: number } | null
 * @returns           計算後的單一像素值 (number)
 *
 * 使用方式：
 *   const shadow = parseSingleSize(blocks.bg.parts[1] ?? '0', canvasSize);
 *   const radius = parseSingleSize(blocks.bg.parts[2] ?? '0', canvasSize);
 */
export const parseSingleSize = (
  sizeStr: string,
  canvasSize: Partial<{ width: number; height: number }> | null = null
): number => {
  // 去掉前後空白
  const trimmed = sizeStr.trim();

  // 1️⃣ 有 p 後綴 → 直接視為 pixel
  if (trimmed.endsWith('p')) {
    const num = Number(trimmed.slice(0, -1));
    return Number.isNaN(num) ? 0 : num;
  }

  // 2️⃣ 只是一個純數字（比例） → 以 canvas 最小邊計算
  const ratio = Number(trimmed);
  if (Number.isNaN(ratio) || ratio <= 0) return 0;

  // 若 canvasSize 為 null 或缺少其中一個維度，直接回傳比例本身
  if (!canvasSize?.width || !canvasSize?.height) return ratio;

  const minSide = Math.min(canvasSize.width as number, canvasSize.height as number);
  // 以「比例 %」的概念計算（例如 30 表示 30%）
  return Math.round((minSide * ratio) / 100);
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

