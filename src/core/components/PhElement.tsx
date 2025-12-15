import React from "react";
import { parseTextToElements } from "./elementUtils";

interface PhElementProps {
  bgColor: string;
  fgColor: string;
  fontName: string;
  fontSize: number;
  text?: string;
}

const PhElement = ({
  bgColor,
  fgColor,
  fontName,
  fontSize,
  style = {},
  children,
}: React.PropsWithChildren<PhElementProps & { style?: React.CSSProperties }>) => {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: bgColor,
        color: fgColor,
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${fontSize}px`,
        fontFamily: fontName,
        ...style,
      }}
    >
      {children ? parseTextToElements(children, fontSize) : null}
    </div>
  );
};

export default PhElement;
