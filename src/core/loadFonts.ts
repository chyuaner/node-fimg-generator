import { AssetLoader } from "./loaders/AssetLoader";

// --- 字型簡稱 到 檔案名 的對應表 ---
const fontFileMap = {
  noto: 'NotoSansTC-Medium.ttf',
  lobster: 'Lobster-Regular.ttf',
  // 可以持續擴充
} as const;

/**
 * 根據字型簡稱列表（如 ['noto', 'lobster']），載入對應 .ttf 並返回 ImageResponse 所需格式
 */
export async function loadFonts(
  assetLoader: AssetLoader,
  fontNames: (keyof typeof fontFileMap)[]
): Promise<Array<{ name: string; data: ArrayBuffer; weight: 400; style: 'normal' }>> {
  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 400; style: 'normal' }> = [];

  for (const name of fontNames) {
    const fontFile = fontFileMap[name];
    try {
      const data = await assetLoader.loadFont(fontFile);
      if (data) {
        fonts.push({
          name, // ← 使用簡稱作為 name（如 'noto'）
          data,
          weight: 400,
          style: 'normal',
        });
      } else {
        console.error(`Loaded font data is null: ${fontFile}`);
      }
    } catch (e) {
      console.error(`Font load error (${fontFile}):`, e);
    }
  }

  return fonts;
}
