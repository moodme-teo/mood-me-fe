// new Image()만 만들고 아무 데도 저장하지 않으면 그 객체를 아무도 참조하지 않아 GC
// 대상이 된다 — 오래된 WebKit 계열(모바일 사파리 포함)은 그 시점에 진행 중이던 네트워크
// 요청도 함께 끊은 이력이 있다. onload/onerror가 끝날 때까지 모듈 스코프에 살아있는
// Set에 담아둬, 엔진 구현에 기대지 않고 명시적으로 참조를 유지한다.
const pending = new Set<HTMLImageElement>();

// 다음 화면이 곧 같은 URL로 이미지를 다시 요청할 것을 미리 알 때, 화면 전환·네트워크
// 요청이 끝나길 기다리는 동안 미리 받아 브라우저 캐시를 데워둔다. crossOrigin은 나중에
// 실제로 로드할 때와 정확히 같은 값을 넘겨야 브라우저가 같은 캐시 엔트리로 본다 —
// 다르면(예: 한쪽만 anonymous) 별도 요청으로 취급돼 캐시가 안 맞을 수 있다.
export function preloadImage(src: string, crossOrigin?: "anonymous") {
  const img = new window.Image();
  if (crossOrigin) img.crossOrigin = crossOrigin;
  pending.add(img);
  const settle = () => pending.delete(img);
  img.onload = settle;
  img.onerror = settle;
  img.src = src;
}
