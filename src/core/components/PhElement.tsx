// Remove BdElement import
import React from "react";
import { parseTextToElements } from "./elementUtils";

interface PhElementProps {
  fgColor: string;
  fontName: string;
  fontSize: number;
  text?: string;
  title?: string;
  // bgUrl, bgColor are removed from here
}

const PhElement = ({
  fgColor,
  fontName,
  fontSize,
  style = {},
  children,
  title,
}: React.PropsWithChildren<PhElementProps & { style?: React.CSSProperties }>) => {

  const main = <div
      style={{
        display: "flex",
        flexDirection: 'column',
        width: "100%",
        height: "100%",
        color: fgColor,
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${fontSize}px`,
        fontFamily: fontName,
        ...style,
      }}
    >
      <p style={{
        marginTop: '-10',
        marginBottom: '10',
        fontSize: `${fontSize+8}px`,
        }}>{typeof title === "string" || typeof title === "number"
        ? parseTextToElements(title, fontSize)
        : title}</p>

      <div style={{display: "flex"}}>
        {typeof children === "string" || typeof children === "number"
          ? parseTextToElements(String(children), fontSize)
          : children}
      </div>
    </div>;

  return main;
};

export default PhElement;
