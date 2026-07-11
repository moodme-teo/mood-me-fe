"use client";

// 이미지 기반 추천 팔레트 (mood-edit PRD §3.5 Dynamic Colors).
// 캔버스 pixel sampling으로 dominant color를 뽑아 배경색 후보로 제공한다.
// crossOrigin="anonymous"로 로드된 이미지여야 getImageData가 tainted 되지 않는다.

const SAMPLE_SIZE = 48;
const MIN_COLORS = 5;
const MAX_COLORS = 8;
// 비슷한 색은 하나로 묶는다 — RGB 유클리드 거리 임계값.
const MERGE_DISTANCE = 48;

function toHex(value: number) {
  return value.toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function distance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  );
}

export function extractPalette(image: HTMLImageElement): string[] {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    // cross-origin으로 tainted되면 sampling 불가 — 후보 없이 반환.
    return [];
  }

  // 채널을 16단계 버킷으로 양자화해 빈도를 센다.
  const buckets = new Map<
    string,
    { count: number; sum: [number, number, number] }
  >();
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 125) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.sum[0] += r;
      bucket.sum[1] += g;
      bucket.sum[2] += b;
    } else {
      buckets.set(key, { count: 1, sum: [r, g, b] });
    }
  }

  const ranked = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map(
      (bucket) =>
        [
          Math.round(bucket.sum[0] / bucket.count),
          Math.round(bucket.sum[1] / bucket.count),
          Math.round(bucket.sum[2] / bucket.count),
        ] as [number, number, number],
    );

  // 비슷한 색을 합쳐 다양성을 확보한다.
  const picked: [number, number, number][] = [];
  for (const color of ranked) {
    if (picked.length >= MAX_COLORS) break;
    if (
      picked.every((existing) => distance(existing, color) > MERGE_DISTANCE)
    ) {
      picked.push(color);
    }
  }

  // 임계값 때문에 후보가 너무 적으면 빈도 상위에서 그대로 채운다.
  if (picked.length < MIN_COLORS) {
    for (const color of ranked) {
      if (picked.length >= MIN_COLORS) break;
      if (!picked.some((existing) => distance(existing, color) === 0)) {
        picked.push(color);
      }
    }
  }

  return picked.map(([r, g, b]) => rgbToHex(r, g, b));
}
