import React from "react";
import PhElement from "./components/PhElement";
import BgElement from "./components/BgElement";

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

  const wrapped = (
    <BgElement
      bgColor={bgColor}
      bgUrl={bgUrl}
      padding={padding}
      shadow={shadow}
      radius={radius}
      wrapperStyle={wrapperStyle}
    >
      {inner}
    </BgElement>
  );

  return wrapped;
}
