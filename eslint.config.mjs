import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
  ]),
  {
    // /////////////////////////////////////////////////////////////////////////
    // `import/recommended`
    // @see https://github.com/import-js/eslint-plugin-import
    // /////////////////////////////////////////////////////////////////////////
    settings: {
      // `@/*` 경로 별칭을 internal 그룹으로 분류
      "import/internal-regex": "^@/",
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
]);

export default eslintConfig;
