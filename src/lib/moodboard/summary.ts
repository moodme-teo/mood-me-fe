import { z } from "zod";

export const moodboardSummarySchema = z.object({
  id: z.string().min(1),
  thumbnailUrl: z.string().min(1),
  typeName: z.string().min(1),
  title: z.string().min(1),
  updatedAt: z.string().min(1),
  isGuest: z.boolean(),
});

export const moodboardSummariesSchema = z.array(moodboardSummarySchema);

export type MoodboardSummary = z.infer<typeof moodboardSummarySchema>;
