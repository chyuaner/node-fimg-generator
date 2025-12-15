import React from "react";

/**
 * Props 定義
 *
 * - `children`：要被「包裹」的原始 element（例如 <PhElement …/>）
 * - `bgColor` / `bgUrl` / `padding` / `shadow` / `radius` / `wrapperStyle`：
 *   與舊版 `genBgElement` 的 opt 參數保持相同語意，只是用 React 的型別描述。
 */
export interface BgElementProps {
  /** 背景純色 */
  bgColor?: string;
  /** 背景圖片（已經是 data‑url 或外部 URL） */
  bgUrl?: string;
  /** 內部 padding（可傳 number → px 或完整 CSS 字串） */
  padding?: number | string;
  /** 陰影大小（0、"0px" 會被忽略） */
  shadow?: number | string;
  /** 圓角半徑 */
  radius?: number | string;
  /** 使用者自訂的 wrapper style（會跟 containerStyle 合併） */
  wrapperStyle?: Record<string, string | number>;
  /** 被包住的 element，通常是 <PhElement …/> */
  children: React.ReactElement<any>;
}

/**
 * **BgElement**
 *
 * 功能等同於舊版 `genBgElement`：
 * 1. 建立一個「相對定位」的容器 (`containerStyle`)。
 * 2. 若有 `shadow`，在容器底層產生一個「絕對定位」的陰影 element。
 * 3. 再把原始 element（`children`）以 `position:relative` 包入最上層。
 *
 * 這裡全部用 **JSX** + **React.cloneElement** 來為子元素套上
 * 需要的 style，避免直接操作 `props.style`。
 */
export const BgElement: React.FC<BgElementProps> = ({
  bgColor,
  bgUrl,
  padding,
  shadow,
  radius,
  wrapperStyle = {},
  children,
}) => {
  /* -------------------------------------------------
   * 1️⃣ 建立容器 (wrapper) style
   * ------------------------------------------------- */
  const containerStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    ...(bgColor ? { backgroundColor: bgColor } : {}),
    ...(bgUrl ? { background: `url(${bgUrl})` } : {}),
    backgroundSize: "100% 100%",
    ...(padding !== undefined
      ? { padding: typeof padding === "number" ? `${padding}px` : padding }
      : {}),
    ...wrapperStyle,
  };

  /* -------------------------------------------------
   * 2️⃣ 陰影層 (若 shadow > 0)
   * ------------------------------------------------- */
  const shadowElements: React.ReactElement[] = [];
  if (shadow && !["0", 0, "0px"].includes(String(shadow))) {
    const shadowStyle: React.CSSProperties = {
      ...children.props?.style,
      position: "absolute",
      inset: 0,
      filter:
        typeof shadow === "number"
          ? `drop-shadow(0 0 ${shadow}px #000)`
          : `drop-shadow(0 0 ${shadow} #000)`,
      pointerEvents: "none", // 防止遮住滑鼠事件
      zIndex: 0,
      ...(radius !== undefined
        ? {
            borderRadius:
              typeof radius === "number" ? `${radius}px` : radius,
          }
        : {}),
    };

    const shadowEl = React.cloneElement(children, {
      style: shadowStyle,
      key: "shadow",
    });
    shadowElements.push(shadowEl);
  }

  /* -------------------------------------------------
   * 3️⃣ 正文層 (不加陰影、保留原始 style)
   * ------------------------------------------------- */
  const contentStyle: React.CSSProperties = {
    ...children.props?.style,
    position: "relative",
    zIndex: 1,
    ...(radius !== undefined
      ? {
          borderRadius:
            typeof radius === "number" ? `${radius}px` : radius,
        }
      : {}),
  };

  const contentEl = React.cloneElement(children, {
    style: contentStyle,
    key: "content",
  });

  /* -------------------------------------------------
   * 4️⃣ 合併：陰影層（可無） + 正文層
   * ------------------------------------------------- */
  const finalChildren = [...shadowElements, contentEl];

  return <div style={containerStyle}>{finalChildren}</div>;
};

export default BgElement;
