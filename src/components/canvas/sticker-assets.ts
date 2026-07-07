"use client";

import type { StickerAssetId } from "@/components/canvas/types";

export type StickerAsset = {
  id: StickerAssetId;
  label: string;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  text?: string;
};

export const STICKER_ASSETS: StickerAsset[] = [
  {
    id: "silver-star",
    label: "은빛 별",
    width: 72,
    height: 72,
    fill: "#f7f2ff",
    stroke: "#5b5bd6",
  },
  {
    id: "dream-label",
    label: "dream",
    width: 112,
    height: 44,
    fill: "#fff8d8",
    stroke: "#242424",
    text: "dream",
  },
  {
    id: "soft-orbit",
    label: "오비트",
    width: 88,
    height: 88,
    fill: "#d9f6ff",
    stroke: "#19728a",
  },
  {
    id: "lucky-ribbon",
    label: "lucky",
    width: 118,
    height: 42,
    fill: "#ffe1e9",
    stroke: "#9a3154",
    text: "lucky",
  },
  {
    id: "quiet-spark",
    label: "작은 빛",
    width: 64,
    height: 64,
    fill: "#e8ffdf",
    stroke: "#2b7433",
  },
];

export function getStickerAsset(assetId: StickerAssetId) {
  return (
    STICKER_ASSETS.find((asset) => asset.id === assetId) ?? STICKER_ASSETS[0]
  );
}
