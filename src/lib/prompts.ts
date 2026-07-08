// AI 프롬프트 모음. system(역할·출력 형식)/user(데이터) 파트를 분리한 템플릿 함수로
// 작성한다 (docs/convention/ai.md). 출력 스키마는 프롬프트 옆에 콜로케이션 — 프롬프트가
// 바뀌면 스키마도 같이 바뀐다.
//
// v1 — docs/work/todo/mood-test-questions.md 부록(AI 분석 프롬프트 전문) 이식.
// 모델: GPT-5(Elice AX 프록시, docs/adr/004-ai-elice-gpt5-gemini.md).
// 문서와 코드가 어긋나면 코드 기준으로 문서를 갱신할 것.

import { z } from "zod";

import type { MoodAnalysisPayload } from "@/lib/mood-test/build-analysis-payload";
import { AESTHETIC_CORES, LIFE_THEMES } from "@/lib/mood-test/personas";

export const moodVectorSchema = z.object({
  calm_energy: z.number().min(0).max(1),
  warm_cool: z.number().min(0).max(1),
  minimal_maximal: z.number().min(0).max(1),
  vintage_modern: z.number().min(0).max(1),
  real_dreamy: z.number().min(0).max(1),
});

export const moodAnalysisSchema = z.object({
  title: z.string().min(1),
  type_name: z.string().min(1),
  reading: z.object({
    conviction: z.string().min(1),
    desire: z.string().min(1),
    showdown: z.string().min(1),
  }),
  mood_vector: moodVectorSchema,
  keywords: z.array(z.string().min(1)).length(9),
  sticker_phrases: z.array(z.string().min(1)).length(3),
  image_prompt: z.string().min(1),
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
6. persona_scores는 참고용 후보입니다. core_scores(미학 코어 후보)와 theme_scores(인생 테마 후보)로 나뉩니다. 여정 해석과 어긋나면 여정을 우선합니다.

[type_name 규칙 — 반드시 준수]
- type_name = "<미학 코어 1개> × <인생 테마 1개>" 형식. 왼쪽은 아래 미학 코어 14종에서만, 오른쪽은 아래 인생 테마 6종에서만 고릅니다. 목록에 없는 이름을 새로 만들지 마세요.
- 미학 코어(14): ${AESTHETIC_CORES.join(" · ")}
- 인생 테마(6): ${LIFE_THEMES.join(" · ")}
- 코어는 convictions(확신 카드)의 결과 core_scores에서, 테마는 transitions(열망)과 theme_scores에서 도출합니다. 테마 자리에 코어 이름을 넣지 마세요.

[작성 규칙]
- 한국어, 부드러운 존댓말. 가볍고 놀이 같은 톤 — 사색적이거나 무거운 문체 금지.
- 단정하되 근거는 항상 여정에서: "~를 마지막까지 붙들었으니까요"처럼 선택 행동을 근거로 씁니다.
- 페르소나 이름은 type_name에만 사용하고 reading 문장에는 노출하지 않습니다.
- sticker_phrases는 매니페스테이션 확언 톤의 한국어, 각 12자 이내. (예시 톤: "작은 기적은 매일 온다")
- image_prompt는 영문 한 문단 — kept_desires와 convictions의 태그를 조합한 무드보드용 감성 컷 묘사.
  사진 스타일(감성 디테일 컷), 색감, 조명을 명시하고 인물 얼굴·텍스트·로고는 넣지 않습니다.

[출력]
아래 JSON만 출력합니다. 설명 문장·마크다운 금지.
mood_vector의 다섯 축은 반드시 0.0~1.0 사이의 값입니다. 음수를 쓰지 마세요 (0.0이 왼쪽 극, 1.0이 오른쪽 극, 0.5가 중립).
{
  "title": "리포트 타이틀 한 줄 (20자 이내)",
  "type_name": "미학 코어 × 인생 테마 (예: 다크 아카데미아 × 커리어 보스)",
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
  "sticker_phrases": ["확언 톤 문구 3개"],
  "image_prompt": "english prompt for image generation"
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
