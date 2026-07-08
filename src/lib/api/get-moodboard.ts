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

export const moodboardElementSchema = z.discriminatedUnion("type", [
  stickerElementSchema,
  textElementSchema,
  penElementSchema,
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
  moodProfile: moodProfileSchema,
  isGuest: z.boolean(),
  updatedAt: z.string().min(1),
});

export type GetMoodboardResponse = z.infer<typeof moodboardSchema>;

export function getMoodboard(moodboardId: string) {
  return apiClient.get<GetMoodboardResponse>(`/api/moodboards/${moodboardId}`);
}
