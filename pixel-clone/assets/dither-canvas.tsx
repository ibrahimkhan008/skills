"use client";

import { useEffect, useRef } from "react";

/**
 * DitherCanvas — the animated dither mechanic observed on the original:
 * a pixelated raster (`<img>`, [image-rendering:pixelated]) paired with an
 * `opacity-0` `<canvas>` that the client repaints with a drifting Bayer-8×8
 * dither (2px dots, ink #3C3C3C at ~37% coverage, gamma 1.4), then fades in
 * over ~700ms. `prefers-reduced-motion` renders a static dither.
 *
 * Pair it with a dither-kit.mjs-generated raster (never the target's PNGs).
 * The parent supplies masks/backgrounds (hero radial, watermark band, etc.).
 */
export function DitherCanvas({
  src,
  alt = "",
  className,
  width = 480,
  height = 320,
  frameMs = 90,
}: {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  frameMs?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const bayer8 = [
      [0, 32, 8, 40, 2, 34, 10, 42],
      [48, 16, 56, 24, 50, 18, 58, 26],
      [12, 44, 4, 36, 14, 46, 6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22],
      [3, 35, 11, 43, 1, 33, 9, 41],
      [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47, 7, 39, 13, 45, 5, 37],
      [63, 31, 55, 23, 61, 29, 53, 21],
    ];

    const INK = [60, 60, 60]; // #3C3C3C
    const COVERAGE = 0.37;
    const GAMMA = 1.4;
    const DOT = 2;

    const draw = (phase: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, phase % 4, 0, w, h);
      const frame = ctx.getImageData(0, 0, w, h);
      const data = frame.data;
      const out = ctx.createImageData(w, h);
      const outData = out.data;
      for (let y = 0; y < h; y += DOT) {
        for (let x = 0; x < w; x += DOT) {
          const px = (y * w + x) * 4;
          const lum =
            (0.2126 * data[px] + 0.7152 * data[px + 1] + 0.0722 * data[px + 2]) / 255;
          const threshold =
            bayer8[Math.floor(y / DOT) % 8][Math.floor(x / DOT) % 8] / 64 +
            (phase % 8) * 0.02;
          const inked = Math.pow(lum, GAMMA) < threshold * 0.5 + 0.25;
          const alpha = inked ? Math.round(255 * COVERAGE) : 0;
          for (let dy = 0; dy < DOT && y + dy < h; dy++) {
            for (let dx = 0; dx < DOT && x + dx < w; dx++) {
              const o = ((y + dy) * w + (x + dx)) * 4;
              outData[o] = INK[0];
              outData[o + 1] = INK[1];
              outData[o + 2] = INK[2];
              outData[o + 3] = alpha;
            }
          }
        }
      }
      ctx.putImageData(out, 0, 0);
    };

    let cleanup: (() => void) | undefined;

    const start = () => {
      draw(0);
      if (reduceMotion) return;
      let raf = 0;
      let phase = 0;
      let last = 0;
      const loop = (t: number) => {
        if (t - last > frameMs) {
          phase = (phase + 1) % 8;
          draw(phase);
          last = t;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      cleanup = () => cancelAnimationFrame(raf);
    };

    if (img.complete && img.naturalWidth > 0) {
      start();
    } else {
      img.onload = start;
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [frameMs, src]);

  return (
    <div className={`relative ${className ?? ""}`} style={{ width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="absolute inset-0 [image-rendering:pixelated]"
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 opacity-0 transition-opacity duration-700"
      />
    </div>
  );
}
