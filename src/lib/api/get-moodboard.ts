import { z } from "zod";

import { apiClient } from "@/lib/api-client";

const baseElementSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
  z_index: z.number(),
});

const stickerElementSchema = baseElementSchema.extend({
  type: z.literal("sticker"),
  properties: z.object({
    assetId: z.enum([
      "silver-star",
      "dream-label",
      "soft-orbit",
      "lucky-ribbon",
      "quiet-spark",
    ]),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

const textElementSchema = baseElementSchema.extend({
  type: z.literal("text"),
  properties: z.object({
    content: z.string(),
    fontFamily: z.string().min(1),
    fontSize: z.number().positive(),
    color: z.string().min(1),
    align: z.enum(["left", "center", "right"]),
    width: z.number().positive(),
  }),
});

const penElementSchema = baseElementSchema.extend({
  type: z.literal("pen"),
  properties: z.object({
    points: z.array(z.number()).min(4),
    stroke: z.string().min(1),
    strokeWidth: z.number().positive(),
  }),
});

const imageElementSchema = baseElementSchema.extend({
  type: z.literal("image"),
  properties: z.object({
    src: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

export const moodboardElementSchema = z.discriminatedUnion("type", [
  stickerElementSchema,
  textElementSchema,
  penElementSchema,
  imageElementSchema,
]);

export const moodVectorSchema = z.object({
  calm_energy: z.number().min(0).max(1),
  warm_cool: z.number().min(0).max(1),
  minimal_maximal: z.number().min(0).max(1),
  vintage_modern: z.number().min(0).max(1),
  real_dreamy: z.number().min(0).max(1),
});

export const moodProfileSchema = z.object({
  title: z.string().min(1),
  type_name: z.string().min(1),
  reading: z.object({
    conviction: z.string().min(1),
    desire: z.string().min(1),
    showdown: z.string().min(1),
  }),
  mood_vector: moodVectorSchema,
  keywords: z.array(z.string()).default([]),
  sticker_phrases: z.array(z.string()).default([]),
});

export const moodboardSchema = z.object({
  id: z.string().min(1),
  baseImageUrl: z.string().min(1),
  elements: z.array(moodboardElementSchema),
  // 크롭 에디터(#99)가 저장한 평면 결과 이미지 URL/데이터. 레거시 무드보드에는 없다.
  exportedImageUrl: z.string().nullable().optional(),
  moodProfile: moodProfileSchema,
  isGuest: z.boolean(),
  // 서버가 쿠키의 신원과 보드 소유자를 대조한 결과. 소유자 식별값 자체는 담지 않는다 —
  // 공유 링크는 공개라, 실으면 링크를 연 누구나 소유자로 위장할 수 있다 (#126).
  isOwner: z.boolean(),
  updatedAt: z.string().min(1),
});

export type GetMoodboardResponse = z.infer<typeof moodboardSchema>;

export function getMoodboard(moodboardId: string) {
  return apiClient.get<GetMoodboardResponse>(`/api/moodboards/${moodboardId}`);
}
