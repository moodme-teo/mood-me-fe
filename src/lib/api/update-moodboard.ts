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

export const updateMoodboardRequestSchema = z.object({
  baseImageUrl: z.string().min(1),
  elements: z.array(moodboardElementSchema),
  exportedImageDataUrl: z.string().optional(),
});

export type UpdateMoodboardRequest = z.infer<
  typeof updateMoodboardRequestSchema
>;

export type UpdateMoodboardResponse = {
  id: string;
  elements: UpdateMoodboardRequest["elements"];
  baseImageUrl: string;
  persisted: boolean;
};

export function updateMoodboard(
  moodboardId: string,
  input: UpdateMoodboardRequest,
) {
  return apiClient.patch<UpdateMoodboardResponse>(
    `/api/moodboards/${moodboardId}`,
    input,
  );
}
