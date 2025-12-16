import React from "react";
import { parseTextToElements } from "./elementUtils";

interface PhElementProps {
  bgUrl?: string;
  bgColor?: string;
  fgColor: string;
  fontName: string;
  fontSize: number;
  text?: string;
}

const PhElement = ({
  bgColor,
  bgUrl,
  fgColor,
  fontName,
  fontSize,
  style = {},
  children,
}: React.PropsWithChildren<PhElementProps & { style?: React.CSSProperties }>) => {
  console.log(bgUrl);
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        ...(bgColor ? { backgroundColor: bgColor } : {}),
        ...(bgUrl ? { background: `url(${bgUrl})` } : {}),
        backgroundSize: "100% 100%",
        color: fgColor,
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${fontSize}px`,
        fontFamily: fontName,
        ...style,
      }}
    >
      {typeof children === "string" || typeof children === "number"
        ? parseTextToElements(String(children), fontSize)
        : children}
    </div>
  );
};

export default PhElement;
