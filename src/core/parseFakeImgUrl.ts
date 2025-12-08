/**
 * 兼容兩種語法
 *   1. 完整寫法：/bg/.../ph/...   (原本支援的)
 *   2. 簡寫：/<canvas>/<bgColor>/<bgAlpha?> (fakeimg.pl 常見簡寫)
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

  // ---------- 若「bg」仍是空，嘗試用「簡寫」方式取得 ----------
  // 只在以下情況下才嘗試：沒有 /bg/，且 canvas 已確定，且第二段不是 contentKey
  if (blocks.bg.parts.length === 0 && canvas !== null) {
    // 第二段（index 1）如果存在且不是 contentKey，就視為 bg 資訊
    const second = segs[1];
    if (second && !contentKeys.includes(second) && second !== 'bg') {
      // 可能是 "ff0000"、"ff0000,128"、"ff0000/000" 等，直接保留原字串
      blocks.bg.parts = [second];
      // 若還有第三段且仍不是 contentKey，繼續塞進 bg（如 "ff0000/000"、"ff0000,128/000,255"）
      if (segs[2] && !contentKeys.includes(segs[2]) && segs[2] !== '') {
        blocks.bg.parts.push(segs[2]);
      }
    }
  }

  // ---------- 主內容 ----------
  const contentKey = contentKeys.find(k => blocks[k].parts.length > 0) || null;
  const content = contentKey
    ? { type: contentKey, parts: blocks[contentKey].parts }
    : { type: null, parts: [] };

  return { canvas, bg: blocks.bg, content, query };
}
