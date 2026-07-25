import React from 'react';

interface GpoLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export default function GpoLogo({ className = "h-8", width, height }: GpoLogoProps) {
  return (
    <svg
      viewBox="0 0 240 100"
      className={className}
      style={{ width: width, height: height }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pill Background */}
      <rect x="0" y="0" width="240" height="100" rx="50" fill="#00B092" />
      
      {/* Bold White GPO Text */}
      <text
        x="120"
        y="68"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="68"
        fill="#FFFFFF"
        textAnchor="middle"
        letterSpacing="2"
      >
        GPO
      </text>
    </svg>
  );
}
