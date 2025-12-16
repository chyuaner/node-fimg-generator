import React from "react";
import { parseTextToElements } from "./elementUtils";

interface WmElementProps {
  content: string | React.ReactNode;
  bgColor?: string;
  fgColor: string;
  fontName: string;
  fontSize: number;
  margin: string | number;
}

const WmElement = ({
  content,
  bgColor,
  fgColor,
  fontName,
  fontSize,
  margin,
}: WmElementProps) => {

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
      {typeof content === "string"
        ? parseTextToElements(content, fontSize)
        : content}
    </div>
  );
};

export default WmElement;
