'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  data: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ data, size = 200, className }: QRCodeProps) {
  if (!data) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <p className="text-gray-500 text-sm">No data to display</p>
      </div>
    );
  }

  return (
    <QRCodeSVG
      value={data}
      size={size}
      className={className}
      level="M"
      includeMargin={true}
    />
  );
}
