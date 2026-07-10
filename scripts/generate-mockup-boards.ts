// 첫진입 화면(BoardCardStack)의 예시 보드 이미지 5장을 뽑는 일회성 스크립트.
//
// 런타임 보드는 여정 → 페르소나 비율 → 레이아웃이 자동으로 정해지지만, 예시 보드는
// "서로 다른 다섯 벌"이 보이도록 비율·레이아웃을 손으로 고정한다. 비율의 확정 근거는
// 이슈 #133 §페르소나 비율 5벌, 조립 규칙은 docs/work/todo/moodboard/ 정본을 따른다.
//
// 실행 (프로젝트 루트에서, .env.local 필요):
//   pnpm mockup:boards -- --out tmp/boards --variants 3
//   pnpm mockup:boards -- --dry            # 프롬프트만 출력, 이미지 생성 안 함
//
// 뽑은 후보를 눈으로 골라 public/assets/first-entry/<slug>.png 로 옮긴다.
//
// `--conditions=react-server` 로 실행하는 이유: lib/elice-ai.ts 와 generate-board-image.ts 는
// `import "server-only"` 라 Next 런타임 밖에서는 모듈 로드 시점에 throw 한다. 이 조건에서만
// server-only 가 빈 모듈로 해석돼, 서버 코드를 복제하지 않고 그대로 재사용할 수 있다.

import { mkdir, writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";

import type { PersonaRank } from "@/lib/mood-test/persona";
import { buildBoardPromptFromRanks } from "@/lib/moodboard/build-board-prompt";
import { generateBoardImage } from "@/lib/moodboard/generate-board-image";
import { MOODBOARD_LAYOUT_STYLES } from "@/lib/moodboard/layout-styles";

// 페르소나 이름은 persona-keywords.ts 의 키와 정확히 같아야 한다.
type Ratios = ReadonlyArray<readonly [persona: string, ratio: number]>;

type MockupSpec = {
  slug: string;
  note: string;
  layoutId: string;
  core: Ratios;
  theme: Ratios;
};

const SPECS: readonly MockupSpec[] = [
  {
    slug: "dreamy-violet",
    note: "히어로 · 몽환 · 브랜드 앵커 (바이올렛·라벤더·이리데슨트)",
    layoutId: "center_title_shaped_cutout",
    core: [
      ["페어리코어", 0.52],
      ["네오 로맨틱", 0.22],
      ["코스탈", 0.14],
      ["클린 걸", 0.08],
      ["코케트", 0.04],
    ],
    theme: [
      ["스피리추얼", 0.7],
      ["코지 홈바디", 0.3],
    ],
  },
  {
    slug: "kitsch-chrome",
    note: "키치 · 재미 (핫핑크·크롬·글리터)",
    layoutId: "colored_background_scrapbook",
    core: [
      ["Y2K 키치", 0.55],
      ["코케트", 0.2],
      ["맥시멀 글램", 0.15],
      ["클린 걸", 0.1],
    ],
    theme: [
      ["러키걸", 0.75],
      ["커리어 보스", 0.25],
    ],
  },
  {
    slug: "dark-ink",
    note: "다크 대비 (짙은 잉크·촛불)",
    layoutId: "taped_paper_pileup",
    core: [
      ["다크 아카데미아", 0.5],
      ["네오 로맨틱", 0.25],
      ["올드 머니", 0.15],
      ["소프트 그런지", 0.1],
    ],
    theme: [
      ["커리어 보스", 0.65],
      ["스피리추얼", 0.35],
    ],
  },
  {
    slug: "coastal-cyan",
    note: "시원함 (시안·물빛)",
    layoutId: "large_image_patchwork",
    core: [
      ["코스탈", 0.48],
      ["클린 걸", 0.24],
      ["라이트 아카데미아", 0.16],
      ["코티지코어", 0.12],
    ],
    theme: [
      ["트래블러", 0.6],
      ["웰니스 러너", 0.4],
    ],
  },
  {
    slug: "warm-cream",
    note: "따뜻함 (웜 크림·햇살)",
    layoutId: "sparse_scrapbook",
    core: [
      ["코티지코어", 0.46],
      ["클린 걸", 0.22],
      ["라이트 아카데미아", 0.18],
      ["코케트", 0.08],
      ["코스탈", 0.06],
    ],
    theme: [
      ["코지 홈바디", 0.72],
      ["웰니스 러너", 0.28],
    ],
  },
] as const;

// score 는 프롬프트 비율 표의 표시값일 뿐 조립 로직에 쓰이지 않는다 — 합이 10이 되도록
// 비율을 10배해 채운다(런타임의 fate 배수 합과 자릿수를 맞추려는 것이지 의미는 없다).
function toRanks(ratios: Ratios): PersonaRank[] {
  return ratios.map(([persona, ratio]) => ({
    persona,
    ratio,
    score: ratio * 10,
  }));
}

function findLayout(id: string) {
  const layout = MOODBOARD_LAYOUT_STYLES.find((style) => style.id === id);
  if (!layout) throw new Error(`레이아웃 스타일이 없습니다: ${id}`);
  return layout;
}

function readOption(name: string, fallback: string): string {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? (argv[index + 1] ?? fallback) : fallback;
}

async function saveDataUrl(dataUrl: string, filePath: string): Promise<void> {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  await writeFile(filePath, Buffer.from(base64, "base64"));
}

const dry = argv.includes("--dry");
const outDir = readOption("out", "tmp/boards");
const variants = Number(readOption("variants", "1"));
const only = readOption("only", "");
const targets = only
  ? SPECS.filter((spec) => only.split(",").includes(spec.slug))
  : SPECS;

if (targets.length === 0) {
  console.error(`--only 로 고른 slug 가 없습니다: ${only}`);
  exit(1);
}

if (!dry) await mkdir(outDir, { recursive: true });

for (const spec of targets) {
  const prompt = buildBoardPromptFromRanks(
    toRanks(spec.core),
    toRanks(spec.theme),
    findLayout(spec.layoutId),
  );

  if (dry) {
    console.log(
      `\n${"=".repeat(72)}\n${spec.slug} — ${spec.note}\n${"=".repeat(72)}\n${prompt}`,
    );
    continue;
  }

  for (let variant = 1; variant <= variants; variant++) {
    const filePath = `${outDir}/${spec.slug}-${variant}.png`;
    console.log(`생성 중: ${filePath} …`);
    try {
      await saveDataUrl(await generateBoardImage(prompt), filePath);
      console.log(`  ✅ ${filePath}`);
    } catch (error) {
      console.error(`  ❌ ${filePath} — ${(error as Error).message}`);
    }
  }
}
