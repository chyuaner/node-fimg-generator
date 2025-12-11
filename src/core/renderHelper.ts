import { JSX } from "astro/jsx-runtime";

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
      elements.push({
        type: 'span',
        props: { children: safeText.substring(lastIndex, matchIndex) }
      });
    }

    // specific discord emote element
    elements.push({
        type: 'img',
        props: {
            src: `https://cdn.discordapp.com/emojis/${emoteId}.png`,
            width: fontSizeVal,
            height: fontSizeVal,
            style: {
                margin: '0 2px',
                verticalAlign: 'middle',
                objectFit: 'contain'
            }
        }
    });

    lastIndex = matchIndex + matchString.length;
  }

  // Process failing text after the last match
  if (lastIndex < safeText.length) {
    elements.push({
      type: 'span',
      props: { children: safeText.substring(lastIndex) }
    });
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
}): JSX.Element {
  const { bgColor, fgColor, fontName, fontSize, text } = opts;
  const children = text ? parseTextToElements(text, fontSize) : [];

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        color: fgColor,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${fontSize}px`,
        fontFamily: fontName,
      },
      children,
    },
  };
}


/**
 * 在已有 element 外層包一層 wrapper（可用於邊框、背景等）。
 * wrapperStyle 讓呼叫端自行決定 CSS，包含邊緣背景等需求。
 */
export function genBgElement(
  inner: JSX.Element,
  opts: {
    bgColor?: string;
    bgUrl?: string;
    padding?: number | string;
    shadow?: number | string;
    radius?: number | string;
    wrapperStyle?: Record<string, string | number>;
  } = {}
): JSX.Element {
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
  const containerStyle = {
    position: 'relative' as const,
    display: 'flex',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...(bgColor ? { backgroundColor: bgColor } : {}),
    ...(bgUrl ? { background: `url(${bgUrl})` } : {}),
    ...(padding !== undefined
      ? { padding: typeof padding === 'number' ? `${padding}px` : padding }
      : {}),
    ...wrapperStyle,
  };

  let children: JSX.Element[] = [];

  /* -------------------------------------------------
   * 🔹 底層陰影元素（與原元素大小位置完全相同）
   * ------------------------------------------------- */
  if (shadow && !['0', 0, '0px'].includes(String(shadow))) {
    const shadowStyle = {
      ...inner.props?.style,
      position: 'absolute' as const,
      ...(radius !== undefined
          ? { borderRadius: typeof radius === 'number' ? `${radius}px` : radius }
          : {}),
      inset: 0,
      filter: shadow
        ? `drop-shadow(0 0 ${typeof shadow === 'number' ? `${shadow}px` : shadow} #000)`
        : undefined,
      pointerEvents: 'none' as const, // 防止陰影層擋住點擊
      zIndex: 0,
    };

    const shadowElement: JSX.Element = {
      ...inner,
      props: {
        ...inner.props,
        style: shadowStyle,
        children: inner.props?.children,
      },
    };

    children.push(shadowElement);
  }

  /* -------------------------------------------------
   * 🔹 上層原內容（不加陰影，正常顯示）
   * ------------------------------------------------- */
  const contentElement: JSX.Element = {
    ...inner,
    props: {
      ...inner.props,
      style: {
        ...inner.props?.style,
        position: 'relative' as const,
        ...(radius !== undefined
          ? { borderRadius: typeof radius === 'number' ? `${radius}px` : radius }
          : {}),
        zIndex: 1,
      },
    },
  };

  children.push(contentElement);

  return {
    type: 'div',
    props: {
      style: containerStyle,
      children,
    },
  };
}
