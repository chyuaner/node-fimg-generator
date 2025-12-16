import React from "react";
import { parseTextToElements } from "./elementUtils";

interface WmElementProps {
  bgColor?: string;
  fgColor: string;
  fontName: string;
  fontSize: number;
  margin: string | number;
}

const WmElement = ({
  bgColor,
  fgColor,
  fontName,
  fontSize,
  margin,
  children,
}: React.PropsWithChildren<WmElementProps>) => {

  return (
    <div
      style={{
        position: "absolute",
        bottom: margin,
        right: margin,
        backgroundColor: bgColor || "transparent",
        color: fgColor,
        fontFamily: fontName,
        fontSize: fontSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {typeof children === "string"
        ? parseTextToElements(children, fontSize)
        : children}
    </div>
  );
};

export default WmElement;
