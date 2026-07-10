"use client";

// JPG는 알파를 지원하지 않으므로 투명 영역을 흰색으로 합성한다 (mood-edit PRD §7 저장).
// PNG data URL만 입력으로 받는 순수 2D 캔버스 함수 — Konva stage에 의존하지 않아
// 결과 페이지(크롭 에디터 밖)에서도 재사용할 수 있다 (#118).
export async function compositeOnWhite(pngDataUrl: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = pngDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return pngDataUrl;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}
