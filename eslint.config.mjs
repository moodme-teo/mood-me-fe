import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 레거시 정적 프로토타입 — 컨벤션 적용 대상 아님
    "prototype/**",
  ]),
  {
    // /////////////////////////////////////////////////////////////////////////
    // `import/recommended`
    // @see https://github.com/import-js/eslint-plugin-import
    // /////////////////////////////////////////////////////////////////////////
    settings: {
      // `@/*` 경로 별칭을 internal 그룹으로 분류
      "import/internal-regex": "^@/",
      // `@/*` 별칭을 실제 파일로 해석 (no-restricted-paths zones에 필요)
      "import/resolver": {
        typescript: {},
      },
    },
    rules: {
      // import : 빈 블럭으로 가져오기 금지
      "import/no-empty-named-blocks": "error",
      // export : var, let 금지
      "import/no-mutable-exports": "error",
      // import : 가져온 모듈을 선택자로 사용 금지
      "import/no-named-as-default-member": "error",
      // import : require, define 사용 금지
      "import/no-amd": "error",
      // export : default export 선호 끄기
      "import/prefer-default-export": "off",
      // 로컬 파일시스템의 모듈로 확인될 수 있는지 확인 끔
      "import/no-unresolved": "off",
      // import 확장자 사용 (ts/tsx 등 코드 파일은 확장자 없이)
      "import/extensions": [
        "error",
        "ignorePackages",
        { ts: "never", tsx: "never", js: "never", jsx: "never", mjs: "never" },
      ],
      // 폴더 경계 — 단방향 의존 + canvas 격리 (docs/convention/folder-structure.md)
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // lib/types는 상위 레이어(app/components/hooks)를 모름
            {
              target: ["./src/lib", "./src/types"],
              from: ["./src/app", "./src/components", "./src/hooks"],
            },
            // hooks는 app/components를 모름
            {
              target: "./src/hooks",
              from: ["./src/app", "./src/components"],
            },
            // components는 app을 모름
            {
              target: "./src/components",
              from: "./src/app",
            },
            // canvas 격리: 외부는 배럴(index.ts)로만 접근
            {
              target: [
                "./src/app",
                "./src/hooks",
                "./src/lib",
                "./src/types",
                "./src/components/!(canvas)/**",
              ],
              from: "./src/components/canvas",
              except: ["./index.ts"],
            },
            // canvas는 다른 컴포넌트(ui/도메인)를 역참조하지 않음
            {
              target: "./src/components/canvas",
              from: "./src/components",
              except: ["./canvas"],
            },
          ],
        },
      ],
      // import 상대경로 금지 — 항상 `@/*` 절대경로 (docs/convention/component.md)
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [".*"],
              message: "상대경로 대신 @/* 절대경로를 사용하세요.",
            },
          ],
        },
      ],
      // import 순서
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          // 오름차순 정렬, 대소문자 구분 하지 않음
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          "newlines-between": "always",
        },
      ],
      // import 정렬
      "sort-imports": [
        "error",
        {
          // 대문자 무시
          ignoreCase: true,
          // 변수나 함수의 순서가 import 정렬에 영향을 미치지 않음
          ignoreDeclarationSort: true,
          // 멤버 정렬 무시
          ignoreMemberSort: false,
          // 그룹화
          allowSeparatedGroups: true,
        },
      ],
    },
  },
  // Prettier와 충돌하는 포맷 규칙 비활성화 — 항상 마지막에
  eslintConfigPrettier,
]);

export default eslintConfig;
