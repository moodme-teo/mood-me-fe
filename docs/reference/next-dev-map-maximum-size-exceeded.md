# `next dev` 장시간 실행 시 `RangeError: Map maximum size exceeded` 크래시

- 날짜: 2026-07-10
- 증상: `next dev`(Turbopack)를 오래 켜두면 아래 스택으로 dev 서버가 죽는다.

```
RangeError: Map maximum size exceeded
    at Map.set (<anonymous>)
    at AsyncHook.init (node_modules/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js:53:270406)
    at emitInitNative (node:internal/async_hooks:202:43)
    at emitInitScript (node:internal/async_hooks:505:3)
    at promiseInitHook (node:internal/async_hooks:324:3)
    at promiseInitHookWithDestroyTracking (node:internal/async_hooks:328:3)
    at createIterator (node_modules/next/dist/build/swc/index.js:512:31)
    at createIterator.next (<anonymous>)
    at node_modules/next/dist/server/dev/hot-reloader-turbopack.js:127:30
```

## 원인

`node_modules/next/dist/build/swc/index.js`의 `subscribe()` / `createIterator()`는 Turbopack의 Rust↔JS 브릿지로, HMR·파일 감시 이벤트를 스트리밍하기 위해 dev 서버가 켜져 있는 동안 계속 살아있는 async generator다. 유휴 상태일 때마다 `yield new Promise(...)`로 **매번 새 Promise를 생성**한다.

스택의 `promiseInitHookWithDestroyTracking`은 `destroy` 콜백까지 등록된 async_hooks가 활성화돼 있다는 뜻이다. Node의 async_hooks는 Promise의 `destroy` 콜백이 모든 리소스에 대해 보장되지 않는 오래된 결함이 있어([nodejs/node#25989](https://github.com/nodejs/node/issues/25989), [#14446](https://github.com/nodejs/node/issues/14446)), 내부적으로 프로미스 리소스를 추적하는 Map의 항목이 정리되지 않고 계속 쌓인다. `createIterator`가 dev 서버 수명 내내 돌면서 매 유휴 틱마다 Promise를 만들어내니, 오래 켜둘수록(수 시간~하루 이상) 이 Map이 V8의 하드 리밋(2^24 ≈ 1,677만 엔트리)에 도달해 `Map.set`에서 `RangeError`가 터지며 dev 서버가 죽는다.

## 왜 이 프로젝트에서 잘 나는지

- 이슈 확인 시점 `next` 버전은 `16.2.10`(package.json). Vercel이 [16.3에서 "development memory eviction"](https://nextjs.org/blog/next-16-3-turbopack)을 추가해 장시간 dev 세션 메모리 누적을 실측 기준 최대 90%까지 줄였다(vercel.com 대시보드: 21.5GB → 2GB). 16.2.x대에는 이 완화 기능이 없다.
- Node.js는 `24.2.0` 사용 중. [2026-01-13 async_hooks 안정화 패치](https://nodejs.org/en/blog/vulnerability/january-2026-dos-mitigation-async-hooks)는 `24.13.0+`부터 포함된다.
- VS Code의 Node 자동 디버거 attach(`--inspect-port=0 --experimental-network-inspection`)가 dev 서버 프로세스에 붙어 있으면 async_hooks 활성화 조건이 되기 쉽다.

## 조치

1. `next` → `16.3`(프리뷰/스테이블)으로 업그레이드 — `turbopackFileSystemCache` / `turbopackMemoryEviction`이 기본 활성화되어 장시간 세션 메모리 누적이 크게 줄어든다.
2. Node.js → `24.13.0+`(또는 `22.22.0+` / `20.20.0+`)로 업그레이드.
3. 당장 업그레이드가 어렵다면 dev 서버를 몇 시간 단위로 재시작하는 게 가장 확실한 임시 우회책(근본 수정은 아님).
4. 디버깅 중이 아니라면 VS Code의 Node 자동 attach를 꺼서 async_hooks 활성화 자체를 줄인다.

## 참고

- [nodejs/node#14446 — async_hooks promise destroy not called](https://github.com/nodejs/node/issues/14446)
- [nodejs/node#25989 — destroy lifecycle event not called for all resources](https://github.com/nodejs/node/issues/25989)
- [Node.js: Mitigating DoS from async_hooks (Jan 2026)](https://nodejs.org/en/blog/vulnerability/january-2026-dos-mitigation-async-hooks)
- [vercel/next.js#73921 — Turbopack crashing after prolonged usage](https://github.com/vercel/next.js/issues/73921)
- [Turbopack: What's New in Next.js 16.3 — dev memory eviction](https://nextjs.org/blog/next-16-3-turbopack)
