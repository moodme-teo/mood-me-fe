import {
  ArrowRight,
  Check,
  Heart,
  Plus,
  Share2,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "mood·me · Design System",
  description: "mood-me 디자인 시스템 토큰과 UI 컴포넌트 쇼케이스",
};

// ── 데이터 ──────────────────────────────────────────────────────────────────
type Tone = "ink" | "pink" | "violet" | "cyan" | "green" | "mustard";
const ACCENT_TONES = ["pink", "violet", "cyan", "green", "mustard"] as const;
const BUTTON_TONES: Tone[] = ["ink", "violet", "pink", "cyan", "green", "mustard"];

const NEUTRALS = [
  { name: "gray-050", cls: "bg-gray-050", hex: "#f6f7fa" },
  { name: "gray-100", cls: "bg-gray-100", hex: "#edeef2" },
  { name: "gray-300", cls: "bg-gray-300", hex: "#d2d2d8" },
  { name: "gray-500", cls: "bg-gray-500", hex: "#7b7b84" },
  { name: "gray-700", cls: "bg-gray-700", hex: "#43434a" },
  { name: "gray-900", cls: "bg-gray-900", hex: "#16161a" },
];

const PALETTE = [
  { hue: "pink", steps: [["700", "#c21e74"], ["500", "#ff4fa3"], ["300", "#ffb3d9"]] },
  { hue: "violet", steps: [["700", "#5b21b6"], ["500", "#8b5cf6"], ["300", "#cabdfb"]] },
  { hue: "cyan", steps: [["700", "#0e7fa3"], ["500", "#22d3ee"], ["300", "#a6ecf9"]] },
  { hue: "green", steps: [["700", "#4f9e12"], ["500", "#8cff3d"], ["300", "#cdffa8"]] },
  { hue: "mustard", steps: [["700", "#b8790a"], ["500", "#ffc933"], ["300", "#ffe49e"]] },
] as const;

const GRADIENTS = ["ink", "pink", "violet", "cyan", "green", "mustard"] as const;

const RADII = [
  { name: "sm", cls: "rounded-sm", px: "8px" },
  { name: "md", cls: "rounded-md", px: "14px" },
  { name: "lg", cls: "rounded-lg", px: "20px" },
  { name: "xl", cls: "rounded-xl", px: "28px" },
  { name: "pill", cls: "rounded-full", px: "999px" },
];

const SHADOWS = [
  { name: "card", cls: "shadow-card" },
  { name: "ink", cls: "shadow-ink" },
  { name: "pink", cls: "shadow-pink" },
  { name: "violet", cls: "shadow-violet" },
  { name: "cyan", cls: "shadow-cyan" },
  { name: "green", cls: "shadow-green" },
  { name: "mustard", cls: "shadow-mustard" },
];

const TYPE_SAMPLES = [
  { cls: "text-display-md", label: "display-md · 700/44", sample: "채워지는 꿈" },
  { cls: "text-display-sm", label: "display-sm · 700/32", sample: "오늘의 추구미" },
  { cls: "text-heading-lg", label: "heading-lg · 700/28", sample: "무드보드 결과" },
  { cls: "text-heading-md", label: "heading-md · 600/22", sample: "질문 3 / 8" },
  { cls: "text-body-lg", label: "body-lg · 500/18", sample: "짧은 테스트로 취향을 무드보드로." },
  { cls: "text-body-md", label: "body-md · 400/16", sample: "감각은 높이되, 사용은 쉽게." },
  { cls: "text-body-sm", label: "body-sm · 400/14", sample: "생성에는 약 30초가 걸립니다." },
  { cls: "text-label", label: "label · 600/13", sample: "저장됨" },
  { cls: "text-caption", label: "caption · 400/12", sample: "2026.07.08 업데이트" },
];

// ── 레이아웃 헬퍼 ─────────────────────────────────────────────────────────────
function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-heading-lg">{title}</h2>
        {desc ? <p className="text-body-sm text-muted-foreground">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-label tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────
export default function UiTestPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">
      <div className="mx-auto w-full max-w-5xl space-y-14 px-5 py-12">
        {/* 헤더 */}
        <header className="space-y-3 border-b border-gray-100 pb-8">
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] font-extrabold">mood</span>
            <span className="text-[28px] font-extrabold text-violet-500">me</span>
          </div>
          <h1 className="text-display-sm">Design System</h1>
          <p className="max-w-[52ch] text-body-md text-muted-foreground">
            토큰·타이포·컴포넌트를 한눈에 보는 레퍼런스. 값의 단일 소스는{" "}
            <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-body-sm">
              src/app/globals.css
            </code>
            , 규칙은 <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-body-sm">DESIGN.md</code>.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {ACCENT_TONES.map((t) => (
              <Badge key={t} tone={t}>
                {t}
              </Badge>
            ))}
          </div>
        </header>

        {/* Colors — Neutral */}
        <Section
          title="Colors"
          desc="화이트 캔버스 + cool gray 텍스트 스케일. 악센트는 항상 글로우 그라디언트로, flat 단색은 텍스트·아이콘·그림자에만."
        >
          <div className="space-y-3">
            <Eyebrow>Neutral scale</Eyebrow>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {NEUTRALS.map((n) => (
                <div key={n.name} className="space-y-1.5">
                  <div
                    className={`h-16 rounded-md border border-gray-100 ${n.cls}`}
                  />
                  <p className="text-caption">{n.name}</p>
                  <p className="text-caption text-muted-foreground">{n.hex}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bright palette */}
          <div className="space-y-3">
            <Eyebrow>Bright palette (700 / 500 / 300)</Eyebrow>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
              {PALETTE.map((p) => (
                <div key={p.hue} className="space-y-1.5">
                  <div className="overflow-hidden rounded-md shadow-card">
                    {p.steps.map(([step, hex]) => (
                      <div
                        key={step}
                        className="flex items-center justify-between px-3 py-2.5 text-caption"
                        style={{
                          background: hex,
                          color: step === "300" ? "#16161a" : "#ffffff",
                        }}
                      >
                        <span>
                          {p.hue}-{step}
                        </span>
                        <span className="opacity-80">{hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Glow gradients */}
          <div className="space-y-3">
            <Eyebrow>Glow gradients</Eyebrow>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {GRADIENTS.map((g) => (
                <div key={g} className="space-y-1.5">
                  <div
                    className="h-24 rounded-lg shadow-card"
                    style={{ background: `var(--gradient-${g})` }}
                  />
                  <p className="text-caption">--gradient-{g}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Soft gradients */}
          <div className="space-y-3">
            <Eyebrow>Soft gradients (badge/chip)</Eyebrow>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {GRADIENTS.map((g) => (
                <div key={g} className="space-y-1.5">
                  <div
                    className="h-14 rounded-lg"
                    style={{ background: `var(--gradient-${g}-soft)` }}
                  />
                  <p className="text-caption">{g}-soft</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Typography */}
        <Section
          title="Typography"
          desc="한글·UI = SUIT Variable. 영문 display 악센트만 Instrument Serif — 세리프는 한글에 쓰지 않는다."
        >
          <div className="space-y-4 rounded-lg bg-surface-sunken p-6">
            {TYPE_SAMPLES.map((t) => (
              <div
                key={t.cls}
                className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className={`${t.cls} min-w-0`}>{t.sample}</span>
                <span className="shrink-0 text-caption text-muted-foreground">
                  {t.label}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Eyebrow>English display accent · Instrument Serif</Eyebrow>
            <div className="space-y-2 rounded-lg bg-surface-sunken p-6">
              <p className="font-display-en text-[48px] leading-none italic">
                Vision
              </p>
              <p className="text-heading-md">추구미 무드보드</p>
              <p className="font-display-en text-[48px] leading-none italic">
                Vibe
              </p>
            </div>
          </div>
        </Section>

        {/* Radius */}
        <Section title="Radius" desc="카드는 부드럽게, CTA는 완전 캡슐(pill).">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {RADII.map((r) => (
              <div key={r.name} className="space-y-2">
                <div
                  className={`h-20 bg-[image:var(--gradient-violet-soft)] ${r.cls}`}
                />
                <p className="text-caption">
                  {r.name} · {r.px}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Elevation */}
        <Section
          title="Elevation"
          desc="깊이는 전부 색조 그림자 — 순수 검정/opacity 없음. hover 시 떠오르고 press 시 눌린다."
        >
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-7">
            {SHADOWS.map((s) => (
              <div key={s.name} className="space-y-2">
                <div
                  className={`flex h-20 items-center justify-center rounded-lg bg-card ${s.cls}`}
                >
                  <span className="text-caption text-muted-foreground">
                    {s.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section
          title="Button"
          desc="시스템의 유일한 기본 형태 = pill. tone × variant × size. hover/press에 스프링 lift·눌림."
        >
          <div className="space-y-3">
            <Eyebrow>Primary · tones</Eyebrow>
            <div className="flex flex-wrap items-center gap-3">
              {BUTTON_TONES.map((tone) => (
                <Button key={tone} tone={tone} size="md">
                  {tone}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Eyebrow>Variants</Eyebrow>
            <div className="flex flex-wrap items-center gap-3">
              <Button tone="violet" variant="primary" size="md">
                Primary
              </Button>
              <Button variant="secondary" size="md">
                Secondary
              </Button>
              <Button variant="ghost" size="md">
                Ghost
              </Button>
              <Button tone="violet" size="md" disabled>
                Disabled
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Eyebrow>Sizes · with icons</Eyebrow>
            <div className="flex flex-wrap items-center gap-3">
              <Button tone="ink" size="lg">
                시작하기 <ArrowRight />
              </Button>
              <Button tone="violet" size="md">
                <Sparkles /> 생성
              </Button>
              <Button tone="pink" size="sm">
                <Heart /> 좋아요
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Eyebrow>Icon-only</Eyebrow>
            <div className="flex flex-wrap items-center gap-3">
              <Button tone="violet" size="icon-lg" aria-label="추가">
                <Plus />
              </Button>
              <Button tone="cyan" size="icon-md" aria-label="공유">
                <Share2 />
              </Button>
              <Button tone="green" size="icon-sm" aria-label="확인">
                <Check />
              </Button>
            </div>
          </div>
        </Section>

        {/* Badge */}
        <Section title="Badge" desc="soft 그라디언트 pill 라벨.">
          <div className="flex flex-wrap gap-3">
            {(["ink", ...ACCENT_TONES] as Tone[]).map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
        </Section>

        {/* Card */}
        <Section
          title="Card"
          desc="흰 카드 + 색조 그림자(테두리 없음). tone으로 그림자 색을 준다."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>부드러운 활기</CardTitle>
                <CardDescription>중립 그림자 (tone=none)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-24 rounded-md bg-[image:var(--gradient-green-soft)]" />
              </CardContent>
              <CardFooter>
                <Button tone="green" size="sm">
                  열어보기 <ArrowRight />
                </Button>
              </CardFooter>
            </Card>

            <Card tone="violet">
              <CardHeader>
                <CardTitle>나만의 속도</CardTitle>
                <CardDescription>바이올렛 색조 그림자</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-24 rounded-md bg-[image:var(--gradient-violet)]" />
              </CardContent>
            </Card>

            <Card tone="pink">
              <CardHeader>
                <CardTitle>작은 확신</CardTitle>
                <CardDescription>핑크 색조 그림자</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-24 rounded-md bg-[image:var(--gradient-pink)]" />
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Input */}
        <Section
          title="Input"
          desc="테두리 없는 sunken fill. focus 시 아웃라인 대신 색조 그림자로 떠오른다."
        >
          <div className="grid max-w-xl grid-cols-1 gap-4">
            <Input inputSize="lg" tone="violet" placeholder="Large · 이름을 입력하세요" />
            <Input inputSize="md" tone="cyan" placeholder="Medium · 키워드 검색" />
            <Input inputSize="sm" tone="pink" placeholder="Small · 메모" />
            <Input inputSize="md" placeholder="Disabled" disabled />
          </div>
        </Section>

        {/* Progress */}
        <Section title="Progress" desc="채워지는 트랙 + 색조 글로우.">
          <div className="max-w-xl space-y-5">
            {[
              { tone: "violet", value: 30 },
              { tone: "cyan", value: 60 },
              { tone: "pink", value: 90 },
            ].map((p) => (
              <div key={p.tone} className="flex items-center gap-3">
                <Progress
                  tone={p.tone as Tone}
                  value={p.value}
                  className="flex-1"
                />
                <span className="w-10 shrink-0 text-caption text-muted-foreground">
                  {p.value}%
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Avatar */}
        <Section title="Avatar" desc="원형 + 색조 링 그림자.">
          <div className="flex flex-wrap items-center gap-4">
            {(["none", ...ACCENT_TONES] as const).map((tone) => (
              <div key={tone} className="space-y-2 text-center">
                <Avatar tone={tone} className="size-14">
                  <AvatarImage src="/test-image/board/b21.jpg" alt="" />
                  <AvatarFallback>MM</AvatarFallback>
                </Avatar>
                <p className="text-caption text-muted-foreground">{tone}</p>
              </div>
            ))}
          </div>
        </Section>

        <footer className="border-t border-gray-100 pt-6 text-caption text-muted-foreground">
          mood·me design system — 이 페이지는 개발용 레퍼런스입니다 (/ui-test).
        </footer>
      </div>
    </div>
  );
}
