import React from "react";
import PhElement from "./components/PhElement";
import BgElement from "./components/BgElement";

export class Canvas {
  private width?: number;
  private height?: number;
  private phElement: React.ReactElement | null = null;
  private bgElement: React.ReactElement | null = null;

  setCanvasSize(width?: number, height?: number) {
    this.width = width;
    this.height = height;
    return this;
  }

  addPh(opts: {
    bgColor: string;
    fgColor: string;
    fontName: string;
    fontSize: number;
    text?: string;
  }) {
    const { bgColor, fgColor, fontName, fontSize, text } = opts;
    this.phElement = (
      <PhElement
        bgColor={bgColor}
        fgColor={fgColor}
        fontName={fontName}
        fontSize={fontSize}
      >
        {text}
      </PhElement>
    );
    return this;
  }

  addBg(opts: {
    bgColor?: string;
    bgUrl?: string;
    padding?: number | string;
    shadow?: number | string;
    radius?: number | string;
    wrapperStyle?: Record<string, string | number>;
  }) {
    const {
      bgColor,
      bgUrl,
      padding,
      shadow,
      radius,
      wrapperStyle = {},
    } = opts;

    this.bgElement = (
      <BgElement
        bgColor={bgColor}
        bgUrl={bgUrl}
        padding={padding}
        shadow={shadow}
        radius={radius}
        wrapperStyle={wrapperStyle}
      >
        <></>
      </BgElement>
    );

    return this;
  }

  gen(): React.ReactElement {
    let mainElement: React.ReactElement = <></>;

    if (this.bgElement && this.phElement) {
       // Inject phElement into bgElement
       mainElement = React.cloneElement(this.bgElement, undefined, this.phElement);
    } else if (this.bgElement) {
        // Only bg
        mainElement = this.bgElement;
    } else if (this.phElement) {
        // Only ph
        mainElement = this.phElement;
    }

    // Wrap in canvasElement (root container)
    // This allows adding overlays (watermarks, debug info) later
    return (
      <div
        style={{
          display: "flex",
          width: this.width || "100%",
          height: this.height || "100%",
          // Ensure mainElement takes full space if needed or centers
          // Usually children handle their own size, but we provide the stage.
        }}
      >
        {mainElement}
      </div>
    );
  }
}
