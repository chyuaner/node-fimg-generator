import { AssetLoader } from "./AssetLoader";

// --- 內建字型簡稱 對應表 ---
export const fontFileMap = {
  huninn: 'jf-openhuninn-2.1.ttf',
  noto: 'NotoSansTC-Medium.ttf',
  TaipeiSans: 'TaipeiSansTCBeta-Regular.ttf',
  TaipeiSansB: 'TaipeiSansTCBeta-Bold.ttf',
  JasonHandwriting1: 'JasonHandwriting1.ttf',
  JasonHandwriting2: 'JasonHandwriting2.ttf',
  JasonHandwriting3: 'JasonHandwriting3.ttf',
  JasonHandwriting3p: 'JasonHandwriting3p.ttf',
  JasonHandwriting4: 'JasonHandwriting4.ttf',
  JasonHandwriting5: 'JasonHandwriting5.ttf',
  JasonHandwriting5p: 'JasonHandwriting5p.ttf',
  JasonHandwriting6: 'JasonHandwriting6.ttf',
  JasonHandwriting6p: 'JasonHandwriting6p.ttf',
} as const;

/**
 * 類別：支援鏈式 add 方法，並提供 loadFonts() 來載入字型
 *
 * 根據字型名稱列表（如 ['noto', 'lobster', 'CustomFont.ttf']），
 * 若名稱在 fontFileMap 中，使用對應檔名；
 * 否則將該名稱直接視為 .ttf 檔名載入。
 * 回傳 ImageResponse 所需的 fonts 格式。
 *
 * 使用方法：
 *
 *     // 建立物件
 *     const fontLoader = new FontLoader(assetLoader);
 *
 *     // 串連 add 方法
 *     fontLoader
 *       .add('noto')
 *       .add(['lobster', 'MyCustomFont.ttf']);
 *
 *     // 最後呼叫 loadFonts 合併載入
 *     const fonts = await fontLoader.loadFonts();
 *
 */
export class FontLoader {
  private assetLoader: AssetLoader;
  private fontNames: Record<string, true> = {};

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
  }

  /**
   * 支援單一字型或多個字型的 add，例如：
   * add('noto')
   * add(['noto', 'lobster'])
   */
  add(fonts: string | string[]): this {
    for (const name of Array.isArray(fonts) ? fonts : [fonts]) {
      if (!this.fontNames[name]) {
        this.fontNames[name] = true;
      }
    }
    return this; // 鏈式呼叫
  }

  /**
   * 載入所有已 add 的字型，回傳 ImageResponse 所需格式
   */
  async loadFonts(): Promise<Array<{ name: string; data: ArrayBuffer; weight: 400; style: 'normal' }>> {
    const fontsResult: Array<{ name: string; data: ArrayBuffer; weight: 400; style: 'normal' }> = [];

    for (const fontName of Object.keys(this.fontNames)) {
      const fontFile =
        fontName in fontFileMap
          ? fontFileMap[fontName as keyof typeof fontFileMap]
          : fontName;

      try {
        const data = await this.assetLoader.loadFont(fontFile);
        if (data) {
          fontsResult.push({
            name: fontName, // ← name 保留為簡稱（如 'noto'）
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

    return fontsResult;
  }
}

/**
 * ✅ 保留原始函式介面（向後相容）
 * 用法：const fonts = await loadFonts(assetLoader, [fontnames]);
 */
export async function loadFonts(
  assetLoader: AssetLoader,
  fontNames: string[]
): Promise<Array<{ name: string; data: ArrayBuffer; weight: 400; style: 'normal' }>> {
  // 使用 FontLoader 直接處理
  return new FontLoader(assetLoader).add(fontNames).loadFonts();
}
