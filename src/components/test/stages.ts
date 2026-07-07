export type StageId =
  | "gather"
  | "trim1"
  | "trim2"
  | "shadow"
  | "transition"
  | "final";

export type Stage = {
  id: StageId;
  step: string;
  title: string;
  hint: string;
};

export const STAGES: Stage[] = [
  {
    id: "gather",
    step: "step1",
    title: "끌리는 카드 12장을 담아주세요",
    hint: "생각은 넣어두고, 손이 먼저 가는 걸로요",
  },
  {
    id: "trim1",
    step: "step2",
    title: "이 중 4장을 내려놓아 주세요",
    hint: "아깝죠? 괜찮아요, 남는 게 더 선명해져요",
  },
  {
    id: "trim2",
    step: "step3",
    title: "3장만 더 내려놓을게요",
    hint: "지금 남은 5장이 당신의 확신이에요",
  },
  {
    id: "shadow",
    step: "step4",
    title: "요즘 나를 무겁게 하는 것 3개를 골라주세요",
    hint: "솔직할수록 보드가 정확해져요",
  },
  {
    id: "transition",
    step: "step5",
    title: "'그림자'를 넘어서기 위해, 지금 당신에게 필요한 힘은?",
    hint: "그림자 텍스트는 실제 선택값으로 동적 삽입됩니다 (#35)",
  },
  {
    id: "final",
    step: "step6",
    title: "마지막이에요 — 당신의 무드보드에 남길 5장을 골라주세요",
    hint: "지켜온 것과 바라는 것, 무엇이 남을까요",
  },
];
