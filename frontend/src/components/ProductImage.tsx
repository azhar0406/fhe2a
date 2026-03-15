"use client";

import { useState, useRef, useCallback } from "react";
import { Tag } from "lucide-react";

const CATEGORY_GRADIENTS: Record<string, string> = {
  Game: "from-purple-200 via-purple-100 to-purple-50",
  Software: "from-blue-200 via-blue-100 to-blue-50",
  Subscription: "from-emerald-200 via-emerald-100 to-emerald-50",
  "Gift Card": "from-amber-200 via-amber-100 to-amber-50",
  Other: "from-gray-200 via-gray-100 to-gray-50",
};

// Sample average brightness of an image using a small canvas
function getAverageBrightness(img: HTMLImageElement): number {
  try {
    const canvas = document.createElement("canvas");
    const size = 50; // sample at 50x50 for speed
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 128;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let total = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      // Skip fully transparent pixels
      if (data[i + 3] < 10) continue;
      // Perceived brightness formula
      total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      count++;
    }
    return count > 0 ? total / count : 128;
  } catch {
    // CORS or other error — assume medium brightness
    return 128;
  }
}

interface ProductImageProps {
  src?: string;
  alt: string;
  category?: string;
  className?: string;
}

export function ProductImage({ src, alt, category = "Other", className = "" }: ProductImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [isDark, setIsDark] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const gradient = CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.Other;

  const handleLoad = useCallback(() => {
    setStatus("loaded");
    if (imgRef.current) {
      const brightness = getAverageBrightness(imgRef.current);
      setIsDark(brightness < 80);
    }
  }, []);

  if (!src || status === "error") {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
          <div className="flex flex-col items-center gap-2 text-ink-300">
            <Tag className="h-10 w-10" />
            <span className="text-xs font-medium">{category}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Shimmer placeholder — visible until image loads */}
      {status === "loading" && (
        <div className={`absolute inset-0 z-20 bg-gradient-to-br ${gradient}`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      )}

      {/* Dynamic background: white for dark images, dark for light images */}
      <div className={`absolute inset-0 z-0 ${isDark ? "bg-white" : "bg-surface-800"}`} />

      {/* Main image — centered, contained */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        crossOrigin="anonymous"
        onLoad={handleLoad}
        onError={() => setStatus("error")}
        className="relative z-10 h-full w-full object-contain p-4 drop-shadow-md"
      />
    </div>
  );
}
