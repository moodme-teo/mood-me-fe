// 여정 → gpt-image-2 보드 프롬프트. 규칙 기반 조립이다 — AI는 이 문자열을 짓는 데 관여하지
//않는다(GPT-5는 페르소나 판정·프롬프트 조립의 주체가 아니다, moodboard-creation.md §개요).
// 알고리즘·템플릿 정본: docs/work/todo/moodboard/moodboard-creation.md §3,
// docs/work/todo/moodboard/moodboard-image-prompt.md

import type { Journey } from "@/lib/mood-test/journey";
import {
  type AestheticCore,
  computePersonaResult,
  type LifeTheme,
  type PersonaRank,
} from "@/lib/mood-test/persona";
import { pickLayoutStyle } from "@/lib/moodboard/layout-styles";
import { PERSONA_KEYWORDS } from "@/lib/moodboard/persona-keywords";

// §1 사전과 동일한 예산 — 페르소나 한 개가 100%를 먹어도 상한에 걸리지 않도록 사전 크기와 맞췄다.
const CORE_KEYWORD_BUDGET = 20;
const THEME_KEYWORD_BUDGET = 10;

function getPersonaEntry(name: string) {
  const entry = PERSONA_KEYWORDS[name as AestheticCore | LifeTheme];
  if (!entry) {
    throw new Error(`persona-keywords.ts에 없는 페르소나 이름입니다: ${name}`);
  }
  return entry;
}

// 배열에서 균등 간격으로 개수만큼 뽑는다(moodboard-creation.md §3 "②선택").
// n ≤ 2는 앞에서부터, n ≥ 3은 균등 간격 — 지배 페르소나는 소품부터 큰 장면까지 고루 받고
// 꼬리는 앞쪽 소품만 받는다.
function selectKeywords(keywords: readonly string[], count: number): string[] {
  if (count <= 2) return keywords.slice(0, count);
  const lastIndex = keywords.length - 1;
  return Array.from({ length: count }, (_, i) => {
    const index = Math.round((i * lastIndex) / (count - 1));
    return keywords[index];
  });
}

// 비율 × 예산을 개수로 환산한다. 하한 1개 보장 — 상한은 필요 없다(예산 = 사전 크기).
function countForRatio(ratio: number, budget: number): number {
  return Math.max(1, Math.round(ratio * budget));
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function buildPersonaDetailBlock(
  ranks: PersonaRank[],
  budget: number,
  totalLabel: string,
): string {
  const total = ranks.reduce((sum, rank) => sum + rank.score, 0);
  const rows = ranks.map((rank, i) => {
    const entry = getPersonaEntry(rank.persona);
    const count = countForRatio(rank.ratio, budget);
    const keywords = selectKeywords(entry.keywords, count);
    const trophy = i === 0 ? " 🏆" : "";
    return `| ${rank.persona}${trophy} | ${rank.score.toFixed(1)} | ${formatPercent(rank.ratio)} | ${entry.feeling} | ${keywords.join(", ")} |`;
  });

  return [
    `${totalLabel}, 총 ${total.toFixed(1)}점)`,
    "| 페르소나 | 점수 | 비율 | 핵심 느낌 | 이미지 키워드 |",
    ...rows,
  ].join("\n");
}

const BOARD_PROMPT_TEMPLATE = `레퍼런스 수준의 세로형 Pinterest 스타일 비전보드 무드보드 콜라주 이미지를 생성해줘.
이미지 비율은 2:3 세로형이며, 생성 크기는 1024×1536을 기준으로 한다.

콜라주 레이아웃 스타일:
{LAYOUT_STYLE_BLOCK}

위 레이아웃 스타일은 이 프롬프트의 다른 모든 지시보다 우선한다.
아래 지시가 레이아웃 스타일과 어긋나면, 아래 지시를 버리고 레이아웃 스타일을 따른다.
레이아웃 스타일이 "넣지 마라"고 한 요소는 아래에서 요구하더라도 넣지 않는다.

이 무드보드는 두 개의 독립된 페르소나 축을 바탕으로 생성된다.
미학 코어는 전체 비주얼 스타일, 컬러 팔레트, 패션 무드, 방/공간 무드, 오브젝트 스타일링,
조명, 질감, 분위기를 결정한다.
인생 테마는 라이프스타일 장면, 일상의 습관, 목표, 루틴, 감정적 방향성, 되고 싶은 삶의 순간을 결정한다.

두 축을 하나의 순위로 합치지 마라.
미학 코어는 "보드가 어떻게 보이는지"에 사용하고,
인생 테마는 "보드 안에 어떤 삶의 장면이 등장하는지"에 사용한다.

미학 코어 상세 비율:
{CORE_PERSONA_DETAIL_BLOCK}

인생 테마 상세 비율:
{THEME_PERSONA_DETAIL_BLOCK}

중요:
위에 적힌 페르소나 이름, 비율, 핵심 느낌, 이미지 키워드를 실제 이미지에 직접 반영한다.
비율 블록에 등장한 페르소나만 사용한다.
관련 없는 페르소나나 미학을 새로 추가하지 마라.

팔레트 결정권:
미학 코어 1위(표의 맨 윗줄)가 전체 컬러 팔레트와 시각적 중심을 정한다.
이는 비율과 무관하다 — 1위가 40% 미만이어도 그 페르소나가 보드의 룩을 지배한다.
단, 미학 코어 1위와 2위의 비율이 같으면(동점) 두 페르소나를 균등하게 융합해 하나의 팔레트를 만든다.
어느 한쪽으로 기울이지 말고, 두 페르소나의 색·조명·질감이 같은 무게로 섞인 팔레트를 쓴다.

비율 반영 규칙:
각 비율은 이미지 면적, 반복 빈도, 시각적 우선순위, 컬러 영향력으로 반영한다.

40% 이상: 지배적인 메인 무드 / 가장 큰 이미지 영역 / 메인 컬러 팔레트 /
          반복되는 주요 모티프 / 시각적으로 중심이 되는 배치
20~39%:   강한 보조 무드 / 여러 개의 분명한 보조 이미지나 오브젝트
10~19%:   세컨더리 무드 / 작은 보조 사진, 소품, 질감, 스티커
5~9%:     은은한 디테일 / 배경 질감, 작은 소품, 작은 상징물, 작은 메모
1~4%:     숨은 마이크로 디테일로만 반영 / 메인 장면으로 만들지 마라 /
          작은 꽃, 리본, 손글씨 단어, 컬러 포인트, 스티커 정도로만 사용


텍스트 요구사항:
텍스트 조각의 개수와 형태는 레이아웃 스타일이 정한다. 레이아웃이 글자를 넣지 말라고 하면 하나도 넣지 마라.
레이아웃이 따로 정하지 않았다면 짧은 텍스트를 3~6개 넣고, 포스트잇·찢어진 종이 메모·인쇄 라벨·손글씨처럼 보이게 한다.
레이아웃이 따로 정하지 않았다면 각 텍스트 조각은 평균 20자 내외로 쓰고 최대 50자를 넘지 않는다.
긴 문단을 늘어놓지 마라.
목록, 불릿, 체크리스트, 번호 매긴 항목을 만들지 마라.
페르소나 이름을 글자로 적지 마라.
위 비율 표에 적힌 페르소나 이름과 그 영문 표기(예: "러키걸", "Lucky Girl", "코스탈", "Coastal",
"Y2K", "Dark Academia")를 메모·라벨·타이틀 어디에도 쓰지 마라.
페르소나는 사진, 오브젝트, 색, 질감으로만 드러내고 이름은 숨긴다.
한글과 영문을 섞어 쓸 수 있다.
아래는 톤과 길이의 예시일 뿐이다 — 페르소나 비율에 맞는 문구를 직접 골라 넣어라.
"인생은 직진" / "럭키한 하루" / "장수, 사랑, 건강, 행복" / "FIND A JOB" /
"New ta hoo?" / "A NEW ERA OF ME" / "INSPIRING PEOPLE" / "WORK ON YOU, FOR YOU" /
"I speak fluent English" / "Start work out at home" / "너의 상상으로 만든 불안에 지지마" /
"1년을 잘 쓰면 내 인생이 달라진다" / "된다! 된다! 잘 된다!! 더 잘 된다!!" /
"It's not hard, it's just new" / "Dream bigger, Bigger, Bigger, BIGGER" /
"불안이 아니라 설렘이라 말해요. 스스로를 믿어보세요." /
"미래의 나에게 미루지 마라. 그새끼도 하기 싫어 한다" /
"남의 기대가 부담스러울 땐 과감히 실망시키고 내 갈 길 가자" /
"자존감은 일상의 성실함으로부터 온다 견디자 존나해내자 할 수 있다" /
"피곤해도 그냥 한다. 재미없어도 그냥 한다. 하기 싫어도 그냥 한다." /
"Today I'm choosing to be calm, happy, and positive"
깨진 글자나 알아보기 어려운 텍스트 블록은 피한다.

품질 기준:
최종 이미지는 인기 있는 Pinterest 비전보드 레퍼런스처럼 풍성하고 완성도 높아야 한다.
개인적이고, 스타일리시하고, 열망이 느껴지며, 감정적으로 일관되고, 정성스럽게 큐레이션된 느낌이어야 한다.
실제 사람이 원하는 삶을 표현하기 위해 아름다운 라이프스타일 사진, 메모, 스티커,
종이 질감을 모아 만든 것처럼 보여야 한다.

만들지 말아야 할 것 (레이아웃 스타일이 허용한 것은 예외):
단순한 사진 그리드, 깔끔한 기업 발표자료, 평면적인 디지털 템플릿,
일반적인 스톡사진 콜라주, 무작위로 관련 없는 이미지,
왜곡된 얼굴, 지저분하고 읽기 어려운 텍스트 중심 디자인,
폴라로이드 프레임, 사진 액자, 사진을 둘러싼 흰 테두리.

출력:
1024×1536 세로형 이미지. 2:3 비율. 고해상도.
현실적인 믹스드미디어 콜라주. Pinterest 레퍼런스 수준의 퀄리티.`;

export function buildBoardPrompt(journey: Journey): string {
  const persona = computePersonaResult(journey);
  const layout = pickLayoutStyle(journey);

  const coreBlock = buildPersonaDetailBlock(
    persona.core,
    CORE_KEYWORD_BUDGET,
    "미학 코어 (카드 · fate 배수 적용",
  );
  const themeBlock = buildPersonaDetailBlock(
    persona.theme,
    THEME_KEYWORD_BUDGET,
    "인생 테마 (카드 + 전환",
  );

  return BOARD_PROMPT_TEMPLATE.replace("{LAYOUT_STYLE_BLOCK}", layout.prompt)
    .replace("{CORE_PERSONA_DETAIL_BLOCK}", coreBlock)
    .replace("{THEME_PERSONA_DETAIL_BLOCK}", themeBlock);
}
