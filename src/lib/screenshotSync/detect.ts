import type { DetectedIcon, IconMode, WorldBounds } from "./types";


function isCompletedIconPixel(r: number, g: number, b: number): boolean {
  if (g > r + 25) return false;
  if (b > r + 10 && b > g) return false;
  const warm = r > 155 && g > 75 && g < 195 && b < 115;
  const orangeBias = r - b > 70 && r >= g - 5;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  
  if (r > 170 && g > 145 && b > 80 && r - g < 40) return false;
  return warm && orangeBias && saturation > 65;
}


function isSheikahIconPixel(r: number, g: number, b: number): boolean {
  if (Math.max(r, g, b) < 140) return false;
  if (b < 140 || g < 100) return false;
  if (b < r + 25) return false;
  if (g < r + 10 && b < r + 40) return false;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  if (sat < 40) return false;
  
  if (r > 180 && g > 200 && b > 220) return false;
  return true;
}

function isIconPixel(mode: IconMode, r: number, g: number, b: number): boolean {
  return mode === "completed"
    ? isCompletedIconPixel(r, g, b)
    : isSheikahIconPixel(r, g, b);
}

interface Blob {
  sumX: number;
  sumY: number;
  count: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function floodBlob(
  mask: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Uint8Array,
): Blob | null {
  const stack = [startY * width + startX];
  visited[startY * width + startX] = 1;
  const blob: Blob = {
    sumX: 0,
    sumY: 0,
    count: 0,
    minX: startX,
    maxX: startX,
    minY: startY,
    maxY: startY,
  };

  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % width;
    const y = (idx / width) | 0;
    blob.sumX += x;
    blob.sumY += y;
    blob.count += 1;
    blob.minX = Math.min(blob.minX, x);
    blob.maxX = Math.max(blob.maxX, x);
    blob.minY = Math.min(blob.minY, y);
    blob.maxY = Math.max(blob.maxY, y);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nidx = ny * width + nx;
        if (visited[nidx] || !mask[nidx]) continue;
        visited[nidx] = 1;
        stack.push(nidx);
      }
    }
  }

  return blob.count > 0 ? blob : null;
}

export function pixelToWorld(
  px: number,
  py: number,
  imageWidth: number,
  imageHeight: number,
  inset: number,
  bounds: WorldBounds,
): { x: number; z: number } {
  const left = imageWidth * inset;
  const top = imageHeight * inset;
  const usableW = imageWidth * (1 - 2 * inset);
  const usableH = imageHeight * (1 - 2 * inset);
  const u = (px - left) / usableW;
  const v = (py - top) / usableH;
  return {
    x: bounds.minX + u * (bounds.maxX - bounds.minX),
    z: bounds.minZ + v * (bounds.maxZ - bounds.minZ),
  };
}

export function detectMapIcons(
  imageData: ImageData,
  inset: number,
  bounds: WorldBounds,
  mode: IconMode,
): DetectedIcon[] {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);

  const left = Math.floor(width * inset);
  const right = Math.ceil(width * (1 - inset));
  const top = Math.floor(height * inset);
  const bottom = Math.ceil(height * (1 - inset));

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * width + x) * 4;
      if (isIconPixel(mode, data[i], data[i + 1], data[i + 2])) {
        mask[y * width + x] = 1;
      }
    }
  }

  const visited = new Uint8Array(width * height);
  const detections: DetectedIcon[] = [];
  const minDim = Math.min(width, height);
  const minPixels = Math.max(8, Math.round((width * height) / 220_000));
  const maxPixels = Math.round((width * height) / 500);
  const maxExtent = minDim * 0.08;

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const idx = y * width + x;
      if (!mask[idx] || visited[idx]) continue;
      const blob = floodBlob(mask, width, height, x, y, visited);
      if (!blob) continue;
      if (blob.count < minPixels || blob.count > maxPixels) continue;

      const bw = blob.maxX - blob.minX + 1;
      const bh = blob.maxY - blob.minY + 1;
      const aspect = bw / Math.max(bh, 1);
      
      if (aspect < 0.35 || aspect > 1.75) continue;

      const fill = blob.count / (bw * bh);
      if (fill < 0.25) continue;
      if (Math.max(bw, bh) > maxExtent) continue;

      const px = blob.sumX / blob.count;
      const py = blob.sumY / blob.count;
      const { x: wx, z: wz } = pixelToWorld(px, py, width, height, inset, bounds);
      const radius = Math.max(bw, bh) / 2;
      const score =
        Math.min(1, fill * 1.5) *
        Math.min(1, blob.count / Math.max(minPixels * 3, 1));

      detections.push({
        id: `det-${detections.length}`,
        px,
        py,
        x: wx,
        z: wz,
        radius,
        pixelCount: blob.count,
        score,
        kind: mode,
      });
    }
  }

  return detections;
}

export const detectCompletedIcons = (
  imageData: ImageData,
  inset: number,
  bounds: WorldBounds,
): DetectedIcon[] => detectMapIcons(imageData, inset, bounds, "completed");

export function paintPreview(
  source: HTMLCanvasElement,
  detections: DetectedIcon[],
  matchedIds: Set<string>,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(source, 0, 0);

  for (const d of detections) {
    const hit = matchedIds.has(d.id);
    ctx.beginPath();
    ctx.arc(d.px, d.py, Math.max(7, d.radius + 3), 0, Math.PI * 2);
    ctx.strokeStyle = hit ? "#6ec8c0" : "#d4b85a";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = hit ? "rgba(110,200,192,0.22)" : "rgba(212,184,90,0.18)";
    ctx.fill();
  }

  return canvas.toDataURL("image/jpeg", 0.85);
}
