// src/core/util/encodeIco.ts
/**
 * 把單一 PNG Uint8Array 包裝成符合 ICO 規範的檔案。
 * 只支援「單一圖層」的 ICO（最常見的用途：favicon）。
 *
 * @param pngData  已經是 PNG 格式的 Uint8Array
 * @param width    圖片寬度（像素），若 >255 請傳 0（代表 256，ICO 仕様）
 * @param height   圖片高度（像素），同上
 * @returns        完整的 ICO Uint8Array
 */
export function encodeIco(
  pngData: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  // ---------------------------------------------------------------
  // 1️⃣ ICON Header (6 bytes)
  // ---------------------------------------------------------------
  const header = new Uint8Array(6);
  const hView = new DataView(header.buffer);
  hView.setUint16(0, 0, true); // Reserved = 0
  hView.setUint16(2, 1, true); // Type = 1 (icon)
  hView.setUint16(4, 1, true); // Count = 1 (單一影像)

  // ---------------------------------------------------------------
  // 2️⃣ Directory Entry (16 bytes) – 描述 PNG 位置與屬性
  // ---------------------------------------------------------------
  const dir = new Uint8Array(16);
  const dView = new DataView(dir.buffer);

  // width / height 超過 255 時寫 0，代表 256（ICO 規格）。
  const wByte = width >= 256 ? 0 : width;
  const hByte = height >= 256 ? 0 : height;
  dView.setUint8(0, wByte); // Width
  dView.setUint8(1, hByte); // Height
  dView.setUint8(2, 0); // Color count (0 = no palette)
  dView.setUint8(3, 0); // Reserved

  dView.setUint16(4, 1, true); // Color planes (常寫 1)
  dView.setUint16(6, 32, true); // Bits per pixel (PNG 內部已含 alpha)

  dView.setUint32(8, pngData.length, true); // Image data size (bytes)
  dView.setUint32(12, header.length + dir.length, true); // Offset from file start

  // ---------------------------------------------------------------
  // 3️⃣ 合併成完整 ICO
  // ---------------------------------------------------------------
  const ico = new Uint8Array(header.length + dir.length + pngData.length);
  ico.set(header, 0);
  ico.set(dir, header.length);
  ico.set(pngData, header.length + dir.length);
  return ico;
}