// `@/*` → `src/*` 해석 훅. Node 는 tsconfig paths 를 모른다 — 스크립트가 앱 코드를
// 컨벤션대로(절대경로 `@/*`) import 할 수 있게 해석만 얹는다. 앱 런타임과는 무관하다.

const SRC = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    return next(new URL(`${specifier.slice(2)}.ts`, SRC).href, context);
  }
  return next(specifier, context);
}
