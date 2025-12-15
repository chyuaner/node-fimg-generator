// ---------- 輔助函式：正規化段落 ----------
function normalizePart(p: string): string | null {
  const clean = p.trim().toLowerCase();
  if (clean === '' || clean === 'null' || clean === 'undefined') {
    return null;
  }
  return p;                         // 保留原始字串（已去除副檔名的版本會在後面處理）
}

/**
 * 網址參數拆分器
 *
 * 若網址帶入 http://localhost:8787/350x200/bg/8/4/ff0000,128/4/ph/ff0000,128/000,255/?text=Hello+World&font=noto
 *
 * 將會回傳
 * ```
 * {
 *   "canvas": "350x200",
 *   "bg": {
 *     "parts": [
 *       "8",
 *       "4",
 *       "ff0000,128",
 *       "4"
 *     ],
 *     "padding": "8",
 *     "shadow": "4",
 *     "bgcolor": "ff0000,128",
 *     "radius": "4"
 *   },
 *   "content": {
 *     "type": "ph",
 *     "parts": [
 *       "ff0000,128",
 *       "000,255"
 *     ],
 *     "bgcolor": "ff0000,128",
 *     "fgcolor": "000,255"
 *   },
 *   "query": {
 *     "text": "Hello+World",
 *     "font": "noto"
 *   }
 * }
 * ```
 *
 *
 * 兼容兩種語法
 *   1. 完整寫法：/bg/.../ph/...   (原本支援的)
 *   2. 簡寫：/<canvas>/<phContent>/<phContent>... (fakeimg.pl 常見簡寫)
 *      例如：/200x100/ff0000,128/000,255/ -> canvas=200x100, ph=[ff0000,128, 000,255]
 *
 * 任何段落皆可省略，回傳值保留以下欄位：
 *   - canvas: string | null          // 無則為 null (前端可自行視為 "auto")
 *   - bg:    { parts: string[] }      // 可能為 []、[color]、[color,alpha]、[color,bgColor]…
 *   - content:{ type:string|null, parts:string[] }
 *   - query:  Record<string,string>
 */
export function splitUrl(
  urlStr: string,
  contentKeys: string[] = ['ph', 'code', 'img']
) {
  // ---------- 文字分割 ----------
  // 先把 path 與 query 分開（不使用 URL 物件）
  const [rawPath, rawQuery = ''] = urlStr.split('?', 2);
  // 確保有前導 '/'（外部只會傳入 "/300x200/…" 之類的字串）
  const pathnameRaw = rawPath.startsWith('/') ? rawPath : '/' + rawPath;

  // ------------------------------------------------------------
  // ① 正規化：把 "ph.png"、"code.jpg"、"img.svg" 這類寫法
  //    轉成 "ph/.png"、"code/.jpg"、"img/.svg"
  // ------------------------------------------------------------
  const EXT_REG = /\.(png|svg|jpg|jpeg|gif|html)$/i;   // 已在檔案底部宣告，保留
  const normalizedPath = pathnameRaw.replace(
    new RegExp(`/(ph|code|img)(${EXT_REG.source})$`, 'i'),
    (_, key, ext) => `/${key}/${ext}`   // 變成 "/ph/.png" 之類
  );

  // 後面的流程全部改用 normalizedPath
  const rawSegs = normalizedPath.split('/');
  const segs = rawSegs.slice(1); // 例如 "/a//b" => ["a", "", "b"]

  // ---------- 解析 query ----------
  const query = Object.fromEntries(
    rawQuery
      .split('&')
      .filter(Boolean)
      .map(pair => {
        const [k, v = ''] = pair.split('=', 2);
        return [decodeURIComponent(k), decodeURIComponent(v)];
      })
  );

  // ---------- 先找 canvas ----------
  const first = segs[0];
  const isCanvas = !!first && !(first === '' || first === 'bg' || contentKeys.includes(first));
  const canvas = isCanvas ? first.replace(EXT_REG, '') : null;

  // ---------- 預設空區塊 ----------
  const blockKeys = ['bg', ...contentKeys];          // 必須先列出 bg
  const blocks: Record<string, { parts: (string | null)[] }> = {};
  blockKeys.forEach(k => (blocks[k] = { parts: [] }));

  // 記錄實際在路徑中出現過的區塊（即使沒有 parts）
  const foundKeys = new Set<string>();

  // ---------- 先用 "/bg/"、"/ph/"… 的正式寫法切割 ----------
  const path = normalizedPath; // 保留前導 '/'

  for (const key of blockKeys) {
    // 1. 先找 "/key/" 形式（後面還可能有更多段落）
    let idx = path.indexOf(`/${key}/`);
    let start: number;
    if (idx !== -1) {
      // 有完整的 "/key/" 標記
      start = idx + key.length + 2; // 跳過 "/key/"
      foundKeys.add(key);
    } else {
      // 2. 再找以 "/key" 結尾的情形（例如 "/ph"、"/code"）
      const endIdx = path.lastIndexOf(`/${key}`);
      if (endIdx !== -1 && endIdx + key.length + 1 === path.length) {
        start = endIdx + key.length + 1; // 指向字串結束位置
        foundKeys.add(key);
        idx = endIdx; // 為後續計算 nextIdx 使用
      } else {
        continue; // 此 key 完全不存在於路徑中
      }
    }

    // 從 start 之後找下一個區塊的起始位置
    const nextIdx = blockKeys
      .map(k2 => {
        const p = path.indexOf(`/${k2}/`, start);
        return p !== -1 ? p : -1;
      })
      .filter(i => i !== -1)
      .sort((a, b) => a - b)[0] ?? path.length;

    const raw = path.slice(start, nextIdx);
    // 先 split 成段落，然後把每段可能的副檔名移除
    const rawParts = raw
      ? raw
          .split('/')
          .map(p => {
            // 空字串直接回傳 null
            if (p === '') return null;
            // 去除副檔名
            const withoutExt = p.replace(EXT_REG, '');
            // 排除「bg」或 content key 本身（代表下一段的開始）
            if (withoutExt === 'bg' || contentKeys.includes(withoutExt)) return null;
            return normalizePart(withoutExt);
          })
      : [];

    // 直接保留 (string | null)[]，不過濾 null，以維持索引位置
    blocks[key] = { parts: rawParts };
  }

  // ---------- 若「主內容」仍是空，嘗試用「簡寫」方式取得 ----------
  // 簡寫格式：/200x100/ff0000,128/000,255/ -> canvas=200x100, ph=[ff0000,128, 000,255]
  // 只在以下情況下才嘗試：沒有 /ph/ 等明確 contentKey，且 canvas 已確定
  const hasExplicitContent = contentKeys.some(key => foundKeys.has(key));
  if (!hasExplicitContent && canvas !== null) {
    // 先用 (string | undefined)[] 暫存所有正規化後的結果
    const contentParts: (string | null)[] = [];
    for (let i = 1; i < segs.length; i++) {
      let seg = segs[i].replace(EXT_REG, '');
      if (seg === 'bg' || contentKeys.includes(seg)) break;
      contentParts.push(normalizePart(seg));
    }
    if (contentParts.length > 0) {
      blocks.ph.parts = contentParts.filter(p => p !== undefined);
      foundKeys.add('ph');
    }
  }

  // ---------- 主內容 ----------
  // 只要在路徑裡出現過，就算是有效的 content，即使 parts 為空
  const contentKey = contentKeys.find(k => foundKeys.has(k)) || null;
  const contentParts = contentKey ? blocks[contentKey].parts : [];

  // 處理 named keys for content (ph)
  let contentObj: any = { type: contentKey, parts: contentParts };
  if (contentKey === 'ph') {
    if (!isCanvas) {
      contentObj = {
        ...contentObj,
        size: contentParts[0],
        bgcolor: contentParts[1],
        fgcolor: contentParts[2],
      };
    } else {
      contentObj = {
        ...contentObj,
        bgcolor: contentParts[0],
        fgcolor: contentParts[1],
      };
    }
  }

  // 處理 named keys for bg
  // [bg-padding]/[bg-shadow]/[bg-bgcolor]/[bg-radius]
  const bgParts = blocks.bg.parts;
  const bgObj = {
      parts: bgParts,
      padding: bgParts[0],
      shadow: bgParts[1],
      radius: bgParts[2],
      bgcolor: bgParts[3],
  };

  return { canvas, bg: bgObj, content: contentObj, query };
}
