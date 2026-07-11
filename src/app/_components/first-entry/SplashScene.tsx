"use client";

import { AnimatePresence, motion } from "framer-motion";

import {
  BowMark,
  SparkleMark,
} from "@/app/_components/first-entry/decorations";

// 스플래시 오버레이 — 흩뿌려진 세리프 워드마크(Vision·Mode·Vibe·Chugumi)와 보우/스파클,
// 서브카피가 스플래시에서 나타났다가 entry 로 넘어가며 사라진다. "Board" 만 상수처럼 남아
// 첫진입 화면의 앵커가 된다. 영문 display 단어는 Instrument Serif(--font-display-en),
// 서브카피는 Pretendard 본문 계층 — DESIGN.md 언어별 폰트 규칙.

type Phase = "splash" | "entry";

type Props = {
  phase: Phase;
};

// 흩뿌려진 소형 워드(스플래시에서만 보이고 entry 로 사라짐). top/left 는 앱 프레임 대비 %.
const SCATTER_WORDS = [
  { text: "Vision", italic: true, top: "25%", left: "11%", size: "13.5vw" },
  { text: "Mode", italic: false, top: "33%", left: "34%", size: "13vw" },
  { text: "Vibe", italic: true, top: "41%", left: "20%", size: "12.5vw" },
  { text: "Chugumi", italic: false, top: "48%", left: "12%", size: "13vw" },
] as const;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export default function SplashScene({ phase }: Props) {
  const isSplash = phase === "splash";
  const boardTop = isSplash ? "55%" : "48%";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* 몽환적 소프트 글로우 — 스플래시에서만, entry 로 사라짐 */}
      <motion.div
        aria-hidden="true"
        className="absolute -z-10 rounded-full blur-3xl"
        style={{
          top: "24%",
          left: "18%",
          width: "min(78%, 340px)",
          height: "min(52%, 380px)",
          background:
            "radial-gradient(circle at 40% 40%, rgba(255,143,196,0.22), rgba(139,92,246,0.1) 55%, transparent 72%)",
        }}
        animate={{ opacity: isSplash ? 1 : 0, scale: isSplash ? 1 : 1.15 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      />

      <h1 lang="en" className="font-display-en text-foreground">
        {/* 접근성용 전체 문구(시각적으로는 흩뿌려진 워드로 표현) */}
        <span className="sr-only">Vision Mode Vibe Chugumi Board</span>

        <AnimatePresence>
          {isSplash &&
            SCATTER_WORDS.map((word, index) => (
              <motion.span
                key={word.text}
                aria-hidden="true"
                className="absolute leading-none whitespace-nowrap"
                style={{
                  top: word.top,
                  left: word.left,
                  fontSize: `clamp(2.25rem, ${word.size}, 3.1rem)`,
                  fontStyle: word.italic ? "italic" : "normal",
                }}
                initial={{ opacity: 0, y: -28, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -18, filter: "blur(4px)" }}
                transition={{
                  duration: 0.55,
                  ease: EASE_OUT,
                  delay: index * 0.14,
                }}
              >
                {word.text}
              </motion.span>
            ))}
        </AnimatePresence>

        {/* 보우 — Vision 위에 얹힘(스플래시 전용) */}
        <AnimatePresence>
          {isSplash && (
            <motion.span
              key="bow"
              aria-hidden="true"
              className="absolute"
              style={{ top: "30%", left: "5%", width: "21%" }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.2,
              }}
            >
              <BowMark className="block w-full" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* 스파클 — Chugumi 오른쪽(스플래시 전용) */}
        <AnimatePresence>
          {isSplash && (
            <motion.span
              key="sparkle"
              aria-hidden="true"
              className="absolute"
              style={{ top: "40%", left: "60%", width: "20%" }}
              initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.5,
              }}
            >
              <SparkleMark className="block w-full" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Board — 두 페이즈에 걸쳐 남는 앵커. entry 에서 살짝 위로 자리 이동 + 축소.
            top 을 style 에도 적는 이유: framer 의 animate 값은 서버 HTML 에 찍히지 않는다.
            style 이 없으면 하이드레이션 전 첫 페인트에서 top:auto(=0) 가 되어 워드마크가
            화면 맨 위에 박혔다가 아래로 튄다. initial={false} 로 마운트 시엔 애니메이션 없이
            같은 자리에서 시작하고, 페이즈가 바뀔 때만 움직인다. */}
        <motion.span
          className="absolute right-[5%] block leading-[0.9] whitespace-nowrap"
          style={{
            top: boardTop,
            fontSize: "clamp(4rem, 20vw, 5.4rem)",
            // 흰 헤일로 + 잉크 드롭 — 스플래시(흰 배경)에선 안 보이고, 첫진입에선
            // 뒤 카드 콜라주 위에서도 또렷하게 읽히도록 텍스트를 들어올린다.
            textShadow:
              "0 0 20px rgba(255,255,255,0.9), 0 0 7px rgba(255,255,255,0.95), 0 10px 26px rgba(40, 30, 70, 0.24)",
          }}
          initial={false}
          animate={{
            top: boardTop,
            scale: isSplash ? 1 : 0.98,
          }}
          transition={{
            duration: 0.75,
            ease: EASE_OUT,
            delay: isSplash ? 0 : 0.15,
          }}
        >
          Board
        </motion.span>
      </h1>

      {/* 서브카피 — 스플래시 전용 가치 제안(Pretendard). 가독성 위해 gray-700(≥4.5:1). */}
      <AnimatePresence>
        {isSplash && (
          <motion.p
            className="absolute bottom-[8%] left-[12%] max-w-[74%] font-body font-medium text-pretty text-gray-700 text-caption"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.7 }}
          >
            무드보드 만들고 싶은데, 핀터레스트에서만 세 시간째 이미지 찾고
            배치하다가 지치는 게 현실. 질문 몇 개에 답하면 AI가 나의 추구미를 한
            장으로 완성해줘요.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
