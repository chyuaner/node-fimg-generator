import React from 'react';

interface PhElementProps {
  bgColor: string;
  fgColor: string;
  fontName: string;
  fontSize: number;
  text?: string;
  style?: React.CSSProperties;
}

const PhElement: React.FC<PhElementProps> = ({
  bgColor,
  fgColor,
  fontName,
  fontSize,
  text,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        color: fgColor,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${fontSize}px`,
        fontFamily: fontName,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

export default PhElement;
