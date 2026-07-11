import { readFile } from "node:fs/promises";

import { type Download, expect, type Page } from "@playwright/test";

/**
 * 픽셀 단언 유틸.
 *
 * mood-edit.md §11 은 "미리보기와 저장 결과물이 달라지면 신뢰가 깨진다" 를 이 제품의 계약으로
 * 못박는다. 그 계약과 "PNG 는 투명 유지 · JPG 는 흰 배경" (§7) 은 DOM 단언으로는 확인할 수
 * 없다 — 결과가 캔버스 픽셀이라서다. 그래서 여기서만 픽셀을 직접 읽는다.
 *
 * 이미지 디코딩은 Node 가 아니라 **브라우저**에서 한다. pngjs 같은 디코더 의존성을 추가하지
 * 않고, 사용자가 실제로 보는 것과 같은 디코더(Chromium)를 쓰기 위해서다.
 *
 * 좌표는 항상 0~1 비율이다. 미리보기 캔버스(디스플레이 크기 × devicePixelRatio)와 내보낸
 * 이미지(CROP_SIZE × EXPORT_PIXEL_RATIO = 720px)의 해상도가 다르기 때문이다.
 */

export type PixelPoint = { x: number; y: number };
export type Rgba = { r: number; g: number; b: number; a: number };

/**
 * 표본 상자의 한 변 — 캔버스 한 변에 대한 비율.
 *
 * 해상도가 다른 두 이미지를 비교하면 리샘플링 때문에 픽셀 하나하나는 어긋난다. 작은 상자를
 * 평균 내면 그 노이즈는 지워지고 "배경이 빠졌다 · 도형이 안 먹었다 · 이미지가 밀렸다" 같은
 * 진짜 회귀는 그대로 남는다.
 */
const AVERAGED = 0.1;

/** 정확히 한 픽셀만 읽는다. 색이 사분면으로 딱 갈리는 고정 이미지에 쓴다. */
const EXACT = 0;

const PREVIEW_SELECTOR = '[data-testid="crop-canvas"]';

type Source = { kind: "image"; dataUrl: string } | { kind: "preview" };

async function samplePixels(
  page: Page,
  source: Source,
  points: readonly PixelPoint[],
  boxRatio: number,
): Promise<Rgba[]> {
  return page.evaluate(
    async ({ source, points, boxRatio, previewSelector }) => {
      const toCanvas = async (): Promise<HTMLCanvasElement> => {
        if (source.kind === "image") {
          const image = new Image();
          image.src = source.dataUrl;
          await image.decode();

          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("2d 컨텍스트를 만들지 못했습니다.");
          context.drawImage(image, 0, 0);
          return canvas;
        }

        // Konva 는 Layer 마다 <canvas> 를 하나씩 그린다. 사용자가 보는 화면은 그것들을
        // 순서대로 겹친 결과다. 투명 배경의 체크보드는 DOM div 라 여기 섞이지 않는다
        // (그래서 미리보기↔결과물 비교는 반드시 단색 배경으로 해야 한다).
        const host = document.querySelector(previewSelector);
        if (!host) throw new Error(`미리보기가 없습니다: ${previewSelector}`);

        const layers = Array.from(host.querySelectorAll("canvas"));
        if (layers.length === 0) throw new Error("Konva 레이어가 없습니다.");

        const canvas = document.createElement("canvas");
        canvas.width = layers[0].width;
        canvas.height = layers[0].height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("2d 컨텍스트를 만들지 못했습니다.");
        for (const layer of layers) context.drawImage(layer, 0, 0);
        return canvas;
      };

      const canvas = await toCanvas();
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2d 컨텍스트를 만들지 못했습니다.");

      const box = Math.max(
        1,
        Math.round(Math.min(canvas.width, canvas.height) * boxRatio),
      );

      return points.map((point) => {
        const clamp = (center: number, size: number) =>
          Math.min(Math.max(0, Math.round(center - box / 2)), size - box);
        const x = clamp(point.x * canvas.width, canvas.width);
        const y = clamp(point.y * canvas.height, canvas.height);

        const { data } = context.getImageData(x, y, box, box);
        const total = { r: 0, g: 0, b: 0, a: 0 };
        for (let i = 0; i < data.length; i += 4) {
          total.r += data[i];
          total.g += data[i + 1];
          total.b += data[i + 2];
          total.a += data[i + 3];
        }
        const count = data.length / 4;
        return {
          r: Math.round(total.r / count),
          g: Math.round(total.g / count),
          b: Math.round(total.b / count),
          a: Math.round(total.a / count),
        };
      });
    },
    {
      source,
      points: [...points],
      boxRatio,
      previewSelector: PREVIEW_SELECTOR,
    },
  );
}

/** 내려받은 파일을 data URL 로 읽어 브라우저에 되먹인다. */
export async function downloadToDataUrl(download: Download): Promise<string> {
  const path = await download.path();
  const bytes = await readFile(path);
  const mimeType = download.suggestedFilename().endsWith(".png")
    ? "image/png"
    : "image/jpeg";
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

/** 내려받은(또는 저장된) 이미지에서 각 좌표의 색을 정확히 한 픽셀씩 읽는다. */
export async function readImagePixels(
  page: Page,
  dataUrl: string,
  points: readonly PixelPoint[],
): Promise<Rgba[]> {
  return samplePixels(page, { kind: "image", dataUrl }, points, EXACT);
}

/** 해상도가 다른 이미지끼리 비교할 때 — 좌표 주변을 평균 낸 색을 읽는다. */
export async function readImageAverages(
  page: Page,
  dataUrl: string,
  points: readonly PixelPoint[],
): Promise<Rgba[]> {
  return samplePixels(page, { kind: "image", dataUrl }, points, AVERAGED);
}

/** 크롭 에디터가 화면에 그리고 있는 것 — Konva 레이어를 겹쳐 평균 낸 색을 읽는다. */
export async function readPreviewAverages(
  page: Page,
  points: readonly PixelPoint[],
): Promise<Rgba[]> {
  return samplePixels(page, { kind: "preview" }, points, AVERAGED);
}

/** 채널마다 tolerance 안에 있으면 같은 색으로 본다 (JPEG 손실·리샘플링 허용치). */
export function expectColorNear(
  actual: Rgba,
  expected: Rgba,
  tolerance: number,
) {
  const channels = ["r", "g", "b", "a"] as const;
  for (const channel of channels) {
    expect(
      Math.abs(actual[channel] - expected[channel]),
      `${channel}: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`,
    ).toBeLessThanOrEqual(tolerance);
  }
}
