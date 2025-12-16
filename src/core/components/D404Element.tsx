// Remove BdElement import
import React from "react";
import { parseTextToElements } from "./elementUtils";

const D404Element = ({
  fgColor,
  fontName,
  fontSize,
  style = {},
} : {
  fgColor: string;
  fontName: string;
  fontSize: number;
  style?: React.CSSProperties
}) => {

  const main = <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "3em",
        color: fgColor,
        alignItems: "flex-start",
        justifyContent: "center",
        fontSize: `${fontSize}px`,
        fontFamily: fontName,
        ...style,
      }}
    >
      <div style={{display: 'flex', width: '100%', borderBottom: '1px solid black', alignItems: "center", justifyContent: "center", paddingBottom: '15px', gap: '20'}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-file-unknown"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M12 17v.01" /><path d="M12 14a1.5 1.5 0 1 0 -1.14 -2.474" /></svg>
        <h1>404 Error</h1>
      </div>
      <div style={{display: 'flex', padding: '1em'}}>
        <p>沒有這個頁面喔～</p>
      </div>
    </div>;

  return main;
};

export default D404Element;
