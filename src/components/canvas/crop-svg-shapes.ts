"use client";

// 크롭용 SVG 도형 데이터 (docs/assets/크롭svg에서 추출, 120×120 viewBox 기준).
// 각 도형은 path d 문자열 또는 ellipse/rect 프리미티브의 배열이다. 렌더는 crop-shapes.ts가
// 프레임 크기에 맞춰 스케일해 Konva 컨텍스트에 경로만 그린다(clip은 Konva가 처리).
// 이 파일은 스크립트 산출물 — 손으로 편집하지 말고 자산 SVG를 바꾼 뒤 재생성한다.

export type SvgPrimitive =
  | { t: "path"; d: string }
  | { t: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { t: "rect"; x: number; y: number; w: number; h: number; rx: number };

// SVG 도형 id — CropShapeId(types.ts)의 부분집합.
export type SvgCropShapeId =
  | "irregular-heart"
  | "number-3"
  | "number-8"
  | "cloud"
  | "vertical-oval"
  | "spiky-starburst"
  | "number-7"
  | "tilted-rect"
  | "semicircle"
  | "blob"
  | "teardrop"
  | "svg-rounded-square"
  | "torn-paper"
  | "puffy-star"
  | "puffy-star-rounded"
  | "ribbon"
  | "crescent"
  | "flower"
  | "wavy-rect"
  | "horizontal-oval"
  | "lightning"
  | "spiral"
  | "pebble"
  | "svg-capsule"
  | "clover"
  | "rounded-triangle"
  | "cherries"
  | "sparkle"
  | "arch"
  | "wobbly-circle";

export type SvgShapeDef = {
  id: SvgCropShapeId;
  label: string;
  view: number;
  shapes: SvgPrimitive[];
};

export const SVG_CROP_SHAPES: SvgShapeDef[] = [
  {
    id: "irregular-heart",
    label: "말랑 하트",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 101 C45 86 20 68 15 45 C10 23 24 10 42 15 C51 17 57 25 60 33 C64 24 71 16 81 14 C99 10 112 24 106 46 C100 69 75 86 60 101Z",
      },
    ],
  },
  {
    id: "number-3",
    label: "숫자 3",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M34 18 C49 8 82 11 91 31 C97 45 88 56 76 60 C92 63 101 76 96 91 C89 111 53 117 31 102 C25 98 25 88 31 83 C35 80 39 80 44 83 C56 91 75 90 78 82 C82 72 64 69 52 70 C45 70 40 66 40 60 C40 54 45 50 52 50 C65 51 78 47 75 38 C72 28 54 28 43 35 C38 39 32 38 28 33 C24 28 27 22 34 18Z",
      },
    ],
  },
  {
    id: "number-8",
    label: "숫자 8",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 9 C82 9 96 22 96 40 C96 50 90 57 82 61 C94 66 101 76 101 89 C101 108 83 118 60 118 C37 118 19 108 19 89 C19 76 26 66 38 61 C30 57 24 50 24 40 C24 22 38 9 60 9ZM60 28 C50 28 43 34 43 42 C43 50 50 55 60 55 C70 55 77 50 77 42 C77 34 70 28 60 28ZM60 73 C47 73 39 79 39 89 C39 99 47 105 60 105 C73 105 81 99 81 89 C81 79 73 73 60 73Z",
      },
    ],
  },
  {
    id: "cloud",
    label: "구름",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M31 88 C18 88 10 79 10 67 C10 55 20 47 33 48 C38 34 50 25 65 25 C78 25 89 34 92 48 C103 49 111 58 111 70 C111 82 101 90 87 90 L32 90 C32 90 31 90 31 88Z",
      },
    ],
  },
  {
    id: "vertical-oval",
    label: "세로 타원",
    view: 120,
    shapes: [{ t: "ellipse", cx: 60, cy: 60, rx: 28, ry: 51 }],
  },
  {
    id: "spiky-starburst",
    label: "뾰족별",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 7 L70 33 L95 18 L85 46 L115 52 L88 65 L108 88 L78 82 L72 113 L59 86 L39 110 L40 79 L10 87 L32 65 L6 51 L36 45 L25 17 L50 33Z",
      },
    ],
  },
  {
    id: "number-7",
    label: "숫자 7",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M27 16 H91 C99 16 104 25 99 32 L58 103 C54 111 44 113 38 108 C32 104 31 97 35 90 L67 36 H27 C20 36 15 31 15 24 C15 19 20 16 27 16Z",
      },
    ],
  },
  {
    id: "tilted-rect",
    label: "기울인 사각",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M35 18 L88 26 C99 28 106 37 104 49 L98 86 C96 99 86 106 73 104 L31 98 C19 96 12 86 14 74 L20 36 C22 24 25 17 35 18Z",
      },
    ],
  },
  {
    id: "semicircle",
    label: "반원",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M18 95 V62 C18 39 37 20 60 20 C83 20 102 39 102 62 V95 Z",
      },
    ],
  },
  {
    id: "blob",
    label: "블롭",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 9 C78 8 91 19 99 35 C109 55 111 78 96 94 C82 109 57 113 39 104 C20 95 9 76 15 56 C19 40 30 35 39 22 C44 15 51 10 60 9Z",
      },
    ],
  },
  {
    id: "teardrop",
    label: "물방울",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 8 C60 8 29 45 29 73 C29 96 42 111 60 111 C78 111 91 96 91 73 C91 45 60 8 60 8Z",
      },
    ],
  },
  {
    id: "svg-rounded-square",
    label: "라운드 사각",
    view: 120,
    shapes: [{ t: "rect", x: 18, y: 18, w: 84, h: 84, rx: 24 }],
  },
  {
    id: "torn-paper",
    label: "찢은 종이",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M18 20 L36 15 L49 22 L66 13 L82 21 L101 18 L96 36 L105 52 L97 66 L103 83 L87 91 L82 106 L63 100 L47 108 L35 96 L18 99 L23 78 L14 63 L22 47 Z",
      },
    ],
  },
  {
    id: "puffy-star",
    label: "통통별",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 11 C65 25 70 37 78 40 C88 43 104 39 108 45 C112 51 99 61 91 68 C87 72 91 88 95 100 C97 108 89 113 82 108 C72 101 64 92 58 92 C52 92 42 103 32 109 C25 113 18 107 21 99 C26 86 31 74 27 68 C22 62 8 53 12 45 C15 38 31 42 42 40 C49 38 54 25 60 11Z",
      },
    ],
  },
  {
    id: "puffy-star-rounded",
    label: "둥근 통통별",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 14 C66 29 72 40 82 43 C96 47 107 47 110 55 C113 63 103 70 91 77 C83 82 89 95 92 104 C94 112 87 117 79 112 C70 106 64 96 58 96 C51 96 42 107 33 113 C25 118 18 111 21 102 C25 92 31 82 26 76 C18 69 8 63 11 55 C14 47 27 47 39 44 C49 41 54 29 60 14Z",
      },
    ],
  },
  {
    id: "ribbon",
    label: "리본",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M48 39 C52 29 68 29 72 39 C85 29 103 25 109 32 C114 39 105 55 91 63 C104 71 113 88 107 95 C101 102 84 97 72 84 C68 94 52 94 48 84 C36 97 19 102 13 95 C7 88 16 71 29 63 C15 55 6 39 12 32 C18 25 35 29 48 39Z",
      },
    ],
  },
  {
    id: "crescent",
    label: "초승달",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M83 14 C65 23 53 40 53 61 C53 82 66 99 84 106 C78 110 70 112 62 112 C34 112 12 89 12 61 C12 33 34 10 62 10 C70 10 77 12 83 14Z",
      },
    ],
  },
  {
    id: "flower",
    label: "꽃",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 42 C53 25 60 11 73 12 C87 13 90 30 79 47 C96 43 110 53 106 67 C102 81 84 80 73 67 C73 86 60 98 48 91 C36 84 42 67 56 61 C39 58 28 45 36 33 C44 21 58 28 60 42Z",
      },
    ],
  },
  {
    id: "wavy-rect",
    label: "물결 사각",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M22 27 C36 20 47 31 60 25 C73 19 85 19 98 27 C104 41 94 50 100 62 C107 76 103 89 95 99 C80 105 72 96 60 101 C46 107 35 103 23 96 C16 82 26 73 20 60 C14 46 15 36 22 27Z",
      },
    ],
  },
  {
    id: "horizontal-oval",
    label: "가로 타원",
    view: 120,
    shapes: [{ t: "ellipse", cx: 60, cy: 60, rx: 52, ry: 27 }],
  },
  {
    id: "lightning",
    label: "번개",
    view: 120,
    shapes: [{ t: "path", d: "M68 8 L24 65 H54 L43 113 L96 49 H65 Z" }],
  },
  {
    id: "spiral",
    label: "소용돌이",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M62 11 C88 12 108 31 109 57 C110 85 88 107 59 107 C35 107 16 91 14 68 C12 47 26 30 47 28 C65 26 80 38 82 55 C84 70 73 84 58 84 C45 84 35 75 35 63 C35 52 42 45 52 44 C62 43 69 48 71 57 C72 64 67 70 60 71 C55 72 50 69 49 64 C47 58 52 54 57 54 C61 54 65 56 67 58 C67 52 60 46 51 47 C40 48 33 56 34 67 C35 80 46 89 61 89 C80 89 94 75 94 56 C94 34 79 20 59 20 C54 20 53 12 62 11Z",
      },
    ],
  },
  {
    id: "pebble",
    label: "조약돌",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M65 15 C83 17 100 28 105 48 C111 71 97 95 75 104 C51 114 25 103 16 81 C7 60 18 36 38 24 C47 18 56 14 65 15Z",
      },
    ],
  },
  {
    id: "svg-capsule",
    label: "캡슐",
    view: 120,
    shapes: [{ t: "rect", x: 10, y: 39, w: 100, h: 42, rx: 21 }],
  },
  {
    id: "clover",
    label: "네잎클로버",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 51 C50 32 27 24 20 38 C13 52 28 67 51 60 C32 70 24 93 38 100 C52 107 67 92 60 69 C70 88 93 96 100 82 C107 68 92 53 69 60 C88 50 96 27 82 20 C68 13 53 28 60 51Z",
      },
    ],
  },
  {
    id: "rounded-triangle",
    label: "둥근 삼각",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M58 13 C66 9 76 13 82 24 L109 78 C116 92 105 106 88 105 L34 108 C17 109 7 96 15 80 L43 27 C47 20 51 15 58 13Z",
      },
    ],
  },
  {
    id: "cherries",
    label: "체리",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M62 21 C66 20 68 23 67 27 C64 42 58 53 51 65 C57 71 60 79 58 89 C56 103 43 112 29 110 C15 108 6 95 9 81 C12 67 25 58 39 60 C44 48 51 35 58 25 C59 23 60 22 62 21Z",
      },
      {
        t: "path",
        d: "M66 26 C72 34 76 47 79 62 C93 59 106 69 110 83 C114 97 105 111 91 114 C77 117 63 108 60 94 C58 83 62 73 70 67 C67 52 63 42 58 34 C55 29 61 22 66 26Z",
      },
    ],
  },
  {
    id: "sparkle",
    label: "반짝임",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 7 L72 45 L113 58 L73 73 L60 113 L45 73 L7 60 L45 45Z",
      },
    ],
  },
  {
    id: "arch",
    label: "아치",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M20 105 V58 C20 35 38 17 60 17 C82 17 100 35 100 58 V105 H72 V59 C72 52 67 47 60 47 C53 47 48 52 48 59 V105Z",
      },
    ],
  },
  {
    id: "wobbly-circle",
    label: "물렁 원",
    view: 120,
    shapes: [
      {
        t: "path",
        d: "M60 11 C79 10 96 22 104 40 C113 61 105 84 88 98 C72 112 49 112 32 100 C14 87 7 64 14 44 C21 24 40 12 60 11Z",
      },
    ],
  },
];
