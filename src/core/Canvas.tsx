import React from "react";
import PhElement from "./components/PhElement";
import BdElement from "./components/BdElement";
import BgElement from "./components/BgElement";
import { parseTextToElements } from "./components/elementUtils";
import { AssetLoader } from "./loaders/AssetLoader";
import { FontLoader } from "./loaders/loadFonts";
import WmElement from "./components/WmElement";
import { SplitUrlProps } from "./utils/splitUrl";
import DebugElement from "./components/DebugElement";
import D404Element from "./components/D404Element";


export type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontStyle = 'normal' | 'italic';

export type Font = {
  name: string;
  data: ArrayBuffer;
  weight: Weight;
  style: FontStyle;
}

export class Canvas {
  private width?: number;
  private height?: number;
  private scale: number = 1;
  private phElement: React.ReactElement | null = null;
  private bgElement: React.ReactElement | null = null;
  private watermarkElement: React.ReactElement | null = null;
  private debugElement: React.ReactElement | null = null;

  private assetLoader: AssetLoader;
  private fontLoader: FontLoader;

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
    this.fontLoader = new FontLoader(assetLoader);
  }

  setCanvasScale(scale: number) {
    this.scale = scale;
    return this;
  }

  private scalePx(value: string | number | undefined): string | number | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value * this.scale;
    if (typeof value === 'string') {
       return value.replace(/(\d+(\.\d+)?)px/g, (_match, p1) => {
          return `${parseFloat(p1) * this.scale}px`;
       });
    }
    return value;
  }

  setCanvasSize(width?: number, height?: number) {
    this.width = width ? width * this.scale : undefined;
    this.height = height ? height * this.scale : undefined;
    return this;
  }

  addPh(opts: {
    bgColor?: string;
    bgUrl?: string;
    fgColor: string;
    fontName: string;
    fontSize: number;
    text?: string;
  }) {
    const { bgColor, bgUrl, fgColor, fontName, fontSize, text } = opts;
    // Scale fontSize (always number)
    const scaledFontSize = fontSize * this.scale;

    this.fontLoader.add(fontName);

    // 1. Create content (PhElement)
    const ph = (
      <PhElement
        fgColor={fgColor}
        fontName={fontName}
        fontSize={scaledFontSize}
      >
        {text}
      </PhElement>
    );

    // 2. Wrap in Border/Background (BdElement)
    this.phElement = (
      <BdElement
        bgColor={bgColor}
        bgUrl={bgUrl}
      >
        {ph}
      </BdElement>
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

    // Apply scaling to padding, shadow, radius if they involve px or are numbers
    // The user specified: "padding、shadow、radius 因為已經有比例模式了，所以當比例單位計算時不要處理加乘，但如果是以px為單位就需要套用加乘"
    // My scalePx helper handles number -> multiply, string with px -> multiply px values.
    // If string has %, it is left alone by scalePx (unless it also has px mixed in?? unlikely for these properties usually).
    // Note: padding usually "10px 20px" or "5%".

    this.bgElement = (
      <BgElement
        bgColor={bgColor}
        bgUrl={bgUrl}
        padding={this.scalePx(padding)}
        shadow={this.scalePx(shadow)}
        radius={this.scalePx(radius)}
        wrapperStyle={wrapperStyle}
      >
        <></>
      </BgElement>
    );

    return this;
  }

  addWm(
    text: string | React.ReactNode,
    opts: {
      bgColor?: string;
      fgColor: string;
      fontName: string;
      fontSize: number;
      margin?: string | number;
    }
  ) {
    const { bgColor, fgColor, fontName, fontSize, margin = '10px' } = opts;

    const scaledFontSize = fontSize * this.scale;
    // Margin default '10px' should scale.
    const scaledMargin = this.scalePx(margin) as string | number;

    this.fontLoader.add(fontName);

    this.watermarkElement = (
      <WmElement
        bgColor={bgColor}
        fgColor={fgColor}
        fontName={fontName}
        fontSize={scaledFontSize}
        margin={scaledMargin}
      >
        {text}
      </WmElement>
    );
    return this;
  }

  addDebug(
    splitUrl: SplitUrlProps,
    otherInfo?: object,
    opts?: {
      fgColor?: string;
    }
  ) {
    this.fontLoader.add('noto');

    this.debugElement = (
      <DebugElement
        splitUrl={splitUrl}
        otherInfo={{
          width: this.width,
          height: this.height,
          ...otherInfo,
        }}
        fgColor={opts?.fgColor}
      />
    );
    return this;
  }

  loadFonts(): Promise<Font[]> {
    return this.fontLoader.loadFonts();
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
          position: "relative", // Needed for absolute positioning of watermark
          // Ensure mainElement takes full space if needed or centers
          // Usually children handle their own size, but we provide the stage.
        }}
      >
        {mainElement}
        {this.watermarkElement}
        {this.debugElement}
      </div>
    );
  }

  gen404(opts: {
  }) {
    const fontSize = 18;
    const fgColor = "#000"
    const fontName = "noto"
    // Scale fontSize (always number)
    const scaledFontSize = fontSize * this.scale;

    this.fontLoader.add(fontName);

    // 1. Create content (PhElement)
    const content = (
      <D404Element
        fgColor={fgColor}
        fontName={fontName}
        fontSize={scaledFontSize}
      />
    );

    // 2. Wrap in Border/Background (BdElement)
    const main = (
      <BdElement
        bgColor='#FFF'
      >
        {content}
      </BdElement>
    );

    this.phElement = main;

    this.addBg({
      bgColor: '#d7e4ef',
      shadow: '4px',
      radius: '30px',
      padding: '10%',
    });

    let mainElement = this.bgElement ? React.cloneElement(this.bgElement, undefined, this.phElement) : this.phElement;

    return (
      <div
        style={{
          display: "flex",
          width: this.width || "100%",
          height: this.height || "100%",
          position: "relative", // Needed for absolute positioning of watermark
          // Ensure mainElement takes full space if needed or centers
          // Usually children handle their own size, but we provide the stage.
        }}
      >
        {mainElement}
        {this.watermarkElement}
        {this.debugElement}
      </div>
    );
  }
}
