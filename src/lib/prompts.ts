// AI 프롬프트 모음. system(역할·출력 형식)/user(데이터) 파트를 분리한 템플릿 함수로
// 작성한다 (docs/convention/ai.md). 출력 스키마는 프롬프트 옆에 콜로케이션 — 프롬프트가
// 바뀌면 스키마도 같이 바뀐다.
//
// v1 — docs/work/todo/mood-test-questions.md 부록(AI 분석 프롬프트 전문) 이식.
// 모델: GPT-5(Elice AX 프록시, docs/adr/004-ai-elice-gpt5-gemini.md).
// 문서와 코드가 어긋나면 코드 기준으로 문서를 갱신할 것.

import { z } from "zod";

import type { MoodAnalysisPayload } from "@/lib/mood-test/build-analysis-payload";

export const moodVectorSchema = z.object({
  calm_energy: z.number().min(0).max(1),
  warm_cool: z.number().min(0).max(1),
  minimal_maximal: z.number().min(0).max(1),
  vintage_modern: z.number().min(0).max(1),
  real_dreamy: z.number().min(0).max(1),
});

// type_name과 image_prompt는 GPT-5가 만들지 않는다. type_name은
// computePersonaResult(persona.ts, 결정론적)가 이미 확정해 payload에 실어 보내고,
// image_prompt는 보드 이미지 생성이 build-board-prompt.ts의 규칙 기반 프롬프트로
// 대체돼(#92) 더 이상 쓰이지 않는다. GPT-5는 이 확정된 유형명을 바탕으로 글만 쓴다
// (ADR 004 §개정 — "GPT-5는 페르소나 판정 주체가 아니다"). 리포트와 보드 이미지가
// 서로 다른 유형을 가리키는 모순을 막는다.
export const moodAnalysisSchema = z.object({
  title: z.string().min(1),
  reading: z.object({
    conviction: z.string().min(1),
    desire: z.string().min(1),
    showdown: z.string().min(1),
  }),
  mood_vector: moodVectorSchema,
  keywords: z.array(z.string().min(1)).length(9),
  sticker_phrases: z.array(z.string().min(1)).length(3),
});

export type MoodAnalysis = z.infer<typeof moodAnalysisSchema>;

export function buildMoodAnalysisSystemPrompt(): string {
  return `당신은 '무드미'의 무드 분석가입니다. 사용자가 추구미 테스트에서 남긴 선택 여정 전체를 읽고,
그 사람의 확신과 열망을 해석해 무드보드 재료를 만듭니다.

[해석 규칙]
1. convictions = 두 번의 덜어내기에서 살아남은 카드. 이미 그 사람 안에 있는 확신으로 해석합니다.
2. transitions = 그림자(요즘 무겁게 하는 것)를 넘어서기 위해 고른 힘. 지금 갈망하는 방향입니다.
   - was_obvious_antonym이 false면 뻔한 반대말 대신 자기만의 해석을 고른 것 — not_picked와 대비해 그 비틀림을 읽어냅니다.
   - was_obvious_antonym이 true면 정면 돌파형 — 솔직하고 직관적인 성향의 신호로 해석합니다.
3. final_showdown = 확신과 열망의 최종 대결.
   - kept_desires(확신을 밀어낸 열망)가 있다면 그것이 지금 가장 강한 갈망입니다.
   - dropped_convictions(밀려난 확신)는 흘려보낼 준비가 된 것으로 해석합니다.
4. journey.late_drops는 마지막까지 붙들다 놓은 카드 — 미련으로, early_drops보다 무겁게 다룹니다.
5. hesitation 값이 큰 카드는 망설임이 담긴 카드입니다. 해석의 참고로만 쓰고 문장에 직접 인용하지 않습니다. (활용 강도 미정)
6. persona.type_name은 이미 확정된 값입니다 — 페르소나 판정 도구(computePersonaResult)가 여정 전체를 정량적으로 분석해 결정했습니다. 같은 사람의 무드보드 이미지도 이 유형을 기준으로 생성됩니다. 당신은 이 유형을 재판정하지 않고, 이 유형에 맞는 문체·키워드·확언 문구를 쓰는 데만 씁니다. type_name과 다른 유형을 암시하는 문장을 쓰지 마세요.
7. persona.core/persona.theme는 비율 분포(참고용)입니다 — 1위뿐 아니라 2위·3위 페르소나의 존재감(예: 2위가 30% 이상이면 그 결도 은은하게 반영)까지 문장·키워드에 뉘앙스로 담되, 이 분포를 근거로 type_name과 다른 유형을 새로 판정하지 않습니다.

[작성 규칙]
- 한국어, 부드러운 존댓말. 가볍고 놀이 같은 톤 — 사색적이거나 무거운 문체 금지.
- 단정하되 근거는 항상 여정에서: "~를 마지막까지 붙들었으니까요"처럼 선택 행동을 근거로 씁니다.
- 페르소나 이름(type_name)을 reading 문장에 그대로 노출하지 않습니다 — 느낌으로만 드러냅니다.
- sticker_phrases는 매니페스테이션 확언 톤의 한국어, 각 12자 이내. (예시 톤: "작은 기적은 매일 온다")

[출력]
아래 JSON만 출력합니다. 설명 문장·마크다운 금지.
mood_vector의 다섯 축은 반드시 0.0~1.0 사이의 값입니다. 음수를 쓰지 마세요 (0.0이 왼쪽 극, 1.0이 오른쪽 극, 0.5가 중립).
{
  "title": "리포트 타이틀 한 줄 (20자 이내)",
  "reading": {
    "conviction": "확신 해석 2~3문장",
    "desire": "열망 해석 2~3문장",
    "showdown": "최종 대결 해석 1~2문장 — 무엇이 무엇을 밀어냈는지"
  },
  "mood_vector": {
    "calm_energy": 0.5,
    "warm_cool": 0.5,
    "minimal_maximal": 0.5,
    "vintage_modern": 0.5,
    "real_dreamy": 0.5
  },
  "keywords": ["9개의 무드 키워드"],
  "sticker_phrases": ["확언 톤 문구 3개"]
}`;
}

export function buildMoodAnalysisUserMessage(
  payload: MoodAnalysisPayload,
): string {
  return `다음 사용자의 추구미 테스트 여정을 분석해 무드 프로파일을 만들어 주세요.

${JSON.stringify(payload, null, 2)}`;
}

export function buildMoodAnalysisRetryMessage(
  payload: MoodAnalysisPayload,
  parseError: string,
): string {
  return `${buildMoodAnalysisUserMessage(payload)}

[이전 응답이 다음 이유로 형식에 맞지 않았습니다 — 위 [출력] 섹션의 JSON 형식에 맞춰 다시 출력하세요. 설명 문장이나 마크다운 코드펜스 없이 JSON 객체만 출력합니다.]
${parseError}`;
}
