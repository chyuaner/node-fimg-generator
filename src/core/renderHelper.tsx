import React from "react";
import PhElement from "./components/PhElement";

// -----------------------------------------------------------------------------
// Emoji / Emote Parsers
// -----------------------------------------------------------------------------

// Regex for Discord emotes: <:name:id>
const DISCORD_EMOTE_REGEX = /<:(\w+):(\d+)>/g;

export const parseTextToElements = (
  /** 可能為 undefined，若無則視為空字串 */ text: string | undefined,
  /** fontSize 也允許 undefined，若無則使用 100 作為 fallback */ fontSizeVal: number | undefined
) => {

  const safeText = typeof text === 'string' ? text : '';
  const safeFontSize = typeof fontSizeVal === 'number' && !isNaN(fontSizeVal)
    ? fontSizeVal
    : 100; // 預設 100px

  const elements: any[] = [];
  let lastIndex = 0;

  const matches = Array.from(safeText.matchAll(DISCORD_EMOTE_REGEX));

  for (const match of matches) {
    const matchIndex = match.index!;
    const matchString = match[0];
    const emoteId = match[2]; // Capturing group 2 is ID

    // Text before match
    if (matchIndex > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`}>
          {safeText.substring(lastIndex, matchIndex)}
        </span>
      );
    }

    // specific discord emote element
    elements.push(
        <img
            key={`emote-${matchIndex}`}
            src={`https://cdn.discordapp.com/emojis/${emoteId}.png`}
            width={fontSizeVal}
            height={fontSizeVal}
            style={{
                margin: '0 2px',
                verticalAlign: 'middle',
                objectFit: 'contain'
            }}
        />
    );

    lastIndex = matchIndex + matchString.length;
  }

  // Process failing text after the last match
  if (lastIndex < safeText.length) {
    elements.push(
      <span key={`text-${lastIndex}`}>
        {safeText.substring(lastIndex)}
      </span>
    );
  }

  return elements;
};


// -----------------------------------------------------------------------------
// Generator Element
// -----------------------------------------------------------------------------
/**
 * 建構PlaceHolder的圖形 element（單一 div）。
 * 參數會保留原本在 app.ts 中的「bg、fg、fontName、fontSize、text」等資訊。
 */
export function genPhElement(opts: {
  bgColor: string;
  fgColor: string;
  fontName: string;
  fontSize: number;
  text?: string;
}): React.ReactElement {
  const { bgColor, fgColor, fontName, fontSize, text } = opts;

  return (
    <PhElement
      bgColor={bgColor}
      fgColor={fgColor}
      fontName={fontName}
      fontSize={fontSize}
      text={text}
    />
  );
}


/**
 * 在已有 element 外層包一層 wrapper（可用於邊框、背景等）。
 * wrapperStyle 讓呼叫端自行決定 CSS，包含邊緣背景等需求。
 */
export function genBgElement(
  inner: React.ReactElement<any>,
  opts: {
    bgColor?: string;
    bgUrl?: string;
    padding?: number | string;
    shadow?: number | string;
    radius?: number | string;
    wrapperStyle?: Record<string, string | number>;
  } = {}
): React.ReactElement {
  const {
    bgColor,
    bgUrl,
    padding,
    shadow,
    radius,
    wrapperStyle = {},
  } = opts;

  /* -------------------------------------------------
   * 🔹 建立絕對定位的容器（相對定位）
   * ------------------------------------------------- */
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...(bgColor ? { backgroundColor: bgColor } : {}),
    ...(bgUrl ? { background: `url(${bgUrl})` } : {}),
    backgroundSize: '100% 100%',
    ...(padding !== undefined
      ? { padding: typeof padding === 'number' ? `${padding}px` : padding }
      : {}),
    ...wrapperStyle,
  };

  let children: React.ReactElement[] = [];

  /* -------------------------------------------------
   * 🔹 底層陰影元素（與原元素大小位置完全相同）
   * ------------------------------------------------- */
  if (shadow && !['0', 0, '0px'].includes(String(shadow))) {
    const shadowStyle: React.CSSProperties = {
      ...inner.props?.style,
      position: 'absolute',
      ...(radius !== undefined
          ? { borderRadius: typeof radius === 'number' ? `${radius}px` : radius }
          : {}),
      inset: 0,
      filter: shadow
        ? `drop-shadow(0 0 ${typeof shadow === 'number' ? `${shadow}px` : shadow} #000)`
        : undefined,
      pointerEvents: 'none', // 防止陰影層擋住點擊
      zIndex: 0,
    };

    const shadowElement = React.cloneElement(inner, {
      style: shadowStyle,
      key: 'shadow',
    });

    children.push(shadowElement);
  }

  /* -------------------------------------------------
   * 🔹 上層原內容（不加陰影，正常顯示）
   * ------------------------------------------------- */
  const contentStyle: React.CSSProperties = {
    ...inner.props?.style,
    position: 'relative',
    ...(radius !== undefined
      ? { borderRadius: typeof radius === 'number' ? `${radius}px` : radius }
      : {}),
    zIndex: 1,
  };

  const contentElement = React.cloneElement(inner, {
    style: contentStyle,
    key: 'content',
  });

  children.push(contentElement);

  return (
    <div style={containerStyle}>
      {children}
    </div>
  );
}
