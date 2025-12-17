// 從 env 讀取，並把字串「true/false/0/1」統一轉成布林
export function envStringToBoolean(
  raw: string | undefined,
  defaultValue?: boolean
): boolean | undefined {
  if (raw === undefined) return defaultValue;               // 未設定則回傳預設值（可為 undefined）
  const lowered = raw.trim().toLowerCase();
  if (["false", "0", "no", "disable", "disabled"].includes(lowered))
    return false;
  if (["true", "1", "yes", "enable", "enabled"].includes(lowered))
    return true;
  // 其他字串視為 undefined（讓上層自行決定）
  return undefined;
}