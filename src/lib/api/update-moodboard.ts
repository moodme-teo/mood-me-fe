import { z } from "zod";

import {
  analysisStatusSchema,
  editStateSchema,
  moodProfileSchema,
} from "@/lib/api/get-moodboard";
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

export const updateMoodboardRequestSchema = z.object({
  // mock 폴백(getMockMoodboard)이 상대 경로(/test-image/...)를 쓰기도 해 .url()은
  // 강제하지 않는다 — 방어적으로 길이만 제한해 base64 dataURL류 폭주를 400으로 걸러낸다
  // (#163 후속 — baseImageUrl도 exportedImageUrl과 같은 413 위험이 있었다).
  baseImageUrl: z.string().min(1).max(2048),
  elements: z.array(moodboardElementSchema),
  // Storage에 업로드한 결과 URL — base64 dataURL이 아니다. 방어적으로 길이도 제한한다
  // (#163, docs/convention/canvas.md — dataURL을 DB에 직접 저장하지 않는다).
  exportedImageUrl: z.url().max(2048).optional(),
  // 재편집 구도 복원용 (#116) — "완료" 시 현재 도형·배경·확대·위치를 함께 커밋한다.
  editState: editStateSchema.optional(),
  // 리포트(GPT-5)는 이미지 생성과 독립적으로 돈다 — "완성하고 공유하기" 시점에 아직
  // 안 끝났으면 없을 수 있다(generate-mood-analysis.ts의 runReportAnalysis 참고).
  moodProfile: moodProfileSchema.optional(),
  // 분석 갈래 상태(#122) — moodProfile과 함께 보낸다. "분석 다시 시도"가 필요한지
  // 판단하는 데 쓴다.
  analysisStatus: analysisStatusSchema.optional(),
  // 최초 저장 시점에만 의미가 있다 — 원본 테스트 세션 id. "분석 다시 시도"가 journey를
  // 다시 찾아갈 유일한 연결고리라 최초 저장 이후로는 절대 덮어쓰지 않는다(#122).
  sessionId: z.uuid().optional(),
  // 소유자(회원·게스트)는 서버가 쿠키로만 확인한다 — 본문으로 받지 않는다 (#126).
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
