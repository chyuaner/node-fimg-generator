/**
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
export function parseFakeImgUrl(
  urlStr: string,
  contentKeys: string[] = ['ph', 'code', 'img']
) {
    // ---------- 文字分割 ----------
    // 先把 path 與 query 分開（不使用 URL 物件）
    const [rawPath, rawQuery = ''] = urlStr.split('?', 2);
    // 確保有前導 '/'（外部只會傳入 "/300x200/…" 之類的字串）
    const pathname = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
    const segs = pathname.split('/').filter(Boolean);

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
  const isCanvas = !(first === '' || first === 'bg' || contentKeys.includes(first));
  const canvas = isCanvas ? first : null;

  // ---------- 預設空區塊 ----------
  const blockKeys = ['bg', ...contentKeys];          // 必須先列出 bg
  const blocks: Record<string, { parts: string[] }> = {};
  blockKeys.forEach(k => (blocks[k] = { parts: [] }));

  // ---------- 先用 "/bg/"、"/ph/"… 的正式寫法切割 ----------
  const path = pathname;                        // 保留前導 '/'
  for (const key of blockKeys) {
    const idx = path.indexOf(`/${key}/`);
    if (idx === -1) continue;                      // 沒有此區塊
    const start = idx + key.length + 2;
    const nextIdx = blockKeys
      .map(k2 => path.indexOf(`/${k2}/`, start))
      .filter(i => i !== -1)
      .sort((a, b) => a - b)[0] ?? path.lastIndexOf('/');
    const raw = path.slice(start, nextIdx);
    const parts = raw ? raw.split('/').filter(Boolean) : [];
    blocks[key] = { parts };
  }

  // ---------- 若「主內容」仍是空，嘗試用「簡寫」方式取得 ----------
  // 簡寫格式：/200x100/ff0000,128/000,255/ -> canvas=200x100, ph=[ff0000,128, 000,255]
  // 只在以下情況下才嘗試：沒有 /ph/ 等明確 contentKey，且 canvas 已確定
  const hasExplicitContent = contentKeys.some(key => blocks[key].parts.length > 0);
  if (!hasExplicitContent && canvas !== null) {
    // 從第二段開始，所有不是 'bg' 關鍵字的段落都視為 ph 內容
    const contentParts: string[] = [];
    for (let i = 1; i < segs.length; i++) {
      const seg = segs[i];
      // 如果遇到明確的關鍵字（bg, ph, code, img），停止
      if (seg === 'bg' || contentKeys.includes(seg)) {
        break;
      }
      contentParts.push(seg);
    }
    // 如果有收集到內容，設置為 ph
    if (contentParts.length > 0) {
      blocks.ph.parts = contentParts;
    }
  }

  // ---------- 主內容 ----------
  const contentKey = contentKeys.find(k => blocks[k].parts.length > 0) || null;
  const content = contentKey
    ? { type: contentKey, parts: blocks[contentKey].parts }
    : { type: null, parts: [] };

  return { canvas, bg: blocks.bg, content, query };
}
